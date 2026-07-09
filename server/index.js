const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.warn('Warning: SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET not set. See .env.example');
}

let tokenCache = {
  accessToken: null,
  expiresAt: 0
};

const albumCache = new Map(); // trackId -> { payload, expiresAt }
const ALBUM_CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

async function fetchAccessToken() {
  if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt - 5000) {
    return tokenCache.accessToken;
  }

  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  try {
    const res = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${creds}`
        }
      }
    );

    tokenCache.accessToken = res.data.access_token;
    tokenCache.expiresAt = Date.now() + res.data.expires_in * 1000;
    return tokenCache.accessToken;
  } catch (err) {
    console.error('Failed to obtain Spotify access token', err?.response?.data || err.message);
    throw err;
  }
}

async function spotifyRequest(path, opts = {}) {
  const token = await fetchAccessToken();
  try {
    return await axios.get(`https://api.spotify.com/v1${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      params: opts.params || {}
    });
  } catch (err) {
    if (err.response && err.response.status === 401) {
      // Token probably expired — refresh and retry once
      tokenCache.accessToken = null;
      const token2 = await fetchAccessToken();
      return await axios.get(`https://api.spotify.com/v1${path}`, {
        headers: { Authorization: `Bearer ${token2}` },
        params: opts.params || {}
      });
    }
    throw err;
  }
}

function pickLargestImage(images) {
  if (!Array.isArray(images) || images.length === 0) return null;
  return images.reduce((best, cur) => {
    if (!best) return cur;
    return (cur.width || 0) > (best.width || 0) ? cur : best;
  }, null);
}

app.get('/api/track', async (req, res) => {
  const { trackId, artist, title } = req.query;

  try {
    let payload;

    if (trackId) {
      const cached = albumCache.get(trackId);
      if (cached && Date.now() < cached.expiresAt) {
        return res.json(cached.payload);
      }

      const r = await spotifyRequest(`/tracks/${encodeURIComponent(trackId)}`);
      payload = r.data;
      albumCache.set(trackId, { payload, expiresAt: Date.now() + ALBUM_CACHE_TTL });
    } else if (artist && title) {
      const q = `${artist} ${title}`;
      const r = await spotifyRequest('/search', { params: { q, type: 'track', limit: 1 } });
      const item = r.data?.tracks?.items?.[0];
      if (!item) return res.status(404).json({ error: 'No matching track found' });
      payload = item;
      const id = item.id;
      albumCache.set(id, { payload: item, expiresAt: Date.now() + ALBUM_CACHE_TTL });
    } else {
      return res.status(400).json({ error: 'Provide `trackId` or `artist` and `title` query parameters' });
    }

    // Build minimal response
    const track = {
      trackId: payload.id,
      title: payload.name,
      artists: payload.artists.map(a => a.name),
      album: payload.album?.name || null,
      release_date: payload.album?.release_date || null,
      spotify_url: payload.external_urls?.spotify || null,
      images: payload.album?.images || []
    };

    // pick largest image first for quick use
    const largest = pickLargestImage(track.images);
    if (largest) track.best = largest;

    res.json(track);
  } catch (err) {
    const status = err.response?.status || 500;
    if (status === 429) {
      const retryAfter = err.response.headers['retry-after'] || 1;
      return res.status(429).json({ error: 'Rate limited by Spotify', retryAfter });
    }
    console.error('API error', err?.response?.data || err.message);
    res.status(status).json({ error: 'Spotify API error' });
  }
});

app.get('/', (req, res) => {
  res.json({ ok: true, info: 'Spotify covers backend. Use /api/track' });
});

// Proxy contact form submissions to FormSubmit (server-side forwarding avoids CORS issues)
app.post('/api/contact', async (req, res) => {
  try {
    const formData = req.body || {};

    // Build urlencoded body
    const params = new URLSearchParams();
    Object.keys(formData).forEach((k) => {
      if (formData[k] !== undefined && formData[k] !== null) params.append(k, formData[k]);
    });

    const response = await axios.post('https://formsubmit.co/contact@0708.nl', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      maxRedirects: 0,
      validateStatus: (s) => s >= 200 && s < 400
    });

    // FormSubmit often responds with a redirect — treat 200-399 as success
    res.json({ ok: true, status: response.status });
  } catch (err) {
    console.error('Contact proxy error', err?.response?.data || err.message);
    const status = err.response?.status || 500;
    res.status(status).json({ ok: false, error: 'Failed to forward contact' });
  }
});

app.listen(PORT, () => {
  console.log(`Spotify covers backend running on port ${PORT}`);
});
