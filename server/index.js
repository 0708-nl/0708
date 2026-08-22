const express = require('express');
const axios = require('axios');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fallbackTracks = require('../data/latest-tracks.json').tracks;

const app = express();
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const ARTIST_ID = process.env.SPOTIFY_ARTIST_ID || '3ALqcftkgIiEwVx1mdzdKh';
const SPOTIFY_MARKET = process.env.SPOTIFY_MARKET || 'NL';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.warn('Warning: SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET not set. See .env.example');
}

const tokenCache = {
  accessToken: null,
  expiresAt: 0
};

const albumCache = new Map(); // trackId -> { payload, expiresAt }
const ALBUM_CACHE_TTL = 24 * 60 * 60 * 1000; // 24h
let latestTracksCache = { tracks: null, expiresAt: 0, stale: false };
const LATEST_TRACKS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const ENQUIRY_TYPES = new Set(['booking', 'press', 'collab', 'other']);
const HTTP_TIMEOUT = 10_000;

function clean(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function fetchAccessToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    const error = new Error('Spotify credentials are not configured');
    error.status = 503;
    throw error;
  }

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
        },
        timeout: HTTP_TIMEOUT
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
      params: opts.params || {},
      timeout: HTTP_TIMEOUT
    });
  } catch (err) {
    if (err.response && err.response.status === 401) {
      // Token probably expired — refresh and retry once
      tokenCache.accessToken = null;
      const token2 = await fetchAccessToken();
      return await axios.get(`https://api.spotify.com/v1${path}`, {
        headers: { Authorization: `Bearer ${token2}` },
        params: opts.params || {},
        timeout: HTTP_TIMEOUT
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

app.get('/api/latest-tracks', async (_req, res) => {
  try {
    if (latestTracksCache.tracks && Date.now() < latestTracksCache.expiresAt) {
      res.setHeader(
        'Cache-Control',
        latestTracksCache.stale
          ? 'public, max-age=300, stale-while-revalidate=86400'
          : 'public, max-age=300'
      );
      if (latestTracksCache.stale) res.setHeader('X-Track-Source', 'fallback');
      return res.json({
        artistId: ARTIST_ID,
        tracks: latestTracksCache.tracks,
        ...(latestTracksCache.stale ? { stale: true } : {})
      });
    }

    const releasesResponse = await spotifyRequest(`/artists/${encodeURIComponent(ARTIST_ID)}/albums`, {
      params: {
        include_groups: 'album,single',
        market: SPOTIFY_MARKET,
        limit: 10,
        offset: 0
      }
    });

    const seenAlbumIds = new Set();
    const releases = (releasesResponse.data?.items || []).filter((album) => {
      if (!album?.id || seenAlbumIds.has(album.id)) return false;
      seenAlbumIds.add(album.id);
      return true;
    });

    const detailedReleases = await Promise.all(
      releases.map(async (release, releaseIndex) => {
        const response = await spotifyRequest(`/albums/${encodeURIComponent(release.id)}`, {
          params: { market: SPOTIFY_MARKET }
        });
        return { ...response.data, releaseIndex };
      })
    );

    const tracks = detailedReleases.flatMap((album) => {
      const artwork = album.images?.[0] || null;
      return (album.tracks?.items || [])
        .filter((track) => track.artists?.some((artist) => artist.id === ARTIST_ID))
        .map((track) => ({
          id: track.id,
          title: track.name,
          artists: track.artists.map((artist) => artist.name),
          album: album.name,
          artwork: artwork
            ? { url: artwork.url, width: artwork.width, height: artwork.height }
            : null,
          releaseDate: album.release_date,
          releaseDatePrecision: album.release_date_precision,
          spotifyUrl: track.external_urls?.spotify || album.external_urls?.spotify || null,
          trackNumber: track.track_number || 0,
          releaseIndex: album.releaseIndex
        }));
    });

    const uniqueTracks = Array.from(new Map(tracks.map((track) => [track.id, track])).values())
      .sort((a, b) => {
        const dateOrder = String(b.releaseDate || '').localeCompare(String(a.releaseDate || ''));
        if (dateOrder !== 0) return dateOrder;
        if (a.releaseIndex !== b.releaseIndex) return a.releaseIndex - b.releaseIndex;
        return a.trackNumber - b.trackNumber;
      })
      .slice(0, 5)
      .map(({ releaseIndex, trackNumber, ...track }) => track);

    latestTracksCache = {
      tracks: uniqueTracks,
      expiresAt: Date.now() + LATEST_TRACKS_CACHE_TTL,
      stale: false
    };

    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({ artistId: ARTIST_ID, tracks: uniqueTracks });
  } catch (err) {
    const status = err.status || err.response?.status || 500;
    if (status === 429) {
      const retryAfter = err.response?.headers?.['retry-after'] || 1;
      return res.status(429).json({ error: 'Rate limited by Spotify', retryAfter });
    }
    console.error('Latest tracks API error', err?.response?.data || err.message);
    latestTracksCache = {
      tracks: fallbackTracks,
      expiresAt: Date.now() + 5 * 60 * 1000,
      stale: true
    };
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400');
    res.setHeader('X-Track-Source', 'fallback');
    res.json({ artistId: ARTIST_ID, tracks: fallbackTracks, stale: true });
  }
});

// Proxy contact form submissions to FormSubmit (server-side forwarding avoids CORS issues)
app.post('/api/contact', async (req, res) => {
  try {
    const formData = req.body || {};

    // Honeypot: silently accept bot submissions
    if (String(formData.hp || '').trim()) {
      return res.json({ ok: true });
    }

    const name = clean(formData.name, 120);
    const email = clean(formData.email, 254);
    const enquiryType = clean(formData.enquiryType, 60);
    const message = clean(formData.message, 5_000);
    const organisation = clean(formData.organisation, 200);
    const eventName = clean(formData.eventName, 200);
    const eventDate = clean(formData.eventDate, 50);
    const venue = clean(formData.venue, 200);
    const cityCountry = clean(formData.cityCountry, 200);
    const capacity = clean(formData.capacity, 20);
    const projectName = clean(formData.projectName, 200);
    const projectType = clean(formData.projectType, 60);
    const subject = clean(formData.subject, 200);

    if (!name || !isEmail(email) || !ENQUIRY_TYPES.has(enquiryType) || !message) {
      return res.status(400).json({
        ok: false,
        error: 'Please complete required fields with a valid email address'
      });
    }

    const missingEnquiryDetails =
      (enquiryType === 'booking' &&
        (!organisation || !eventName || !eventDate || !venue || !cityCountry || !capacity)) ||
      (enquiryType === 'collab' && (!projectName || !projectType)) ||
      (enquiryType === 'press' && !organisation) ||
      (enquiryType === 'other' && !subject);

    if (missingEnquiryDetails) {
      return res.status(400).json({
        ok: false,
        error: 'Please complete the required enquiry details'
      });
    }

    const payload = {
      name,
      email,
      enquiryType,
      organisation,
      eventName,
      eventDate,
      venue,
      cityCountry,
      capacity,
      budget: clean(formData.budget, 200),
      projectName,
      projectType,
      deadline: clean(formData.deadline, 50),
      subject,
      message,
      _subject: `0708 website: ${enquiryType}`,
      _template: 'table',
      _captcha: 'false'
    };
    const params = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => {
      params.append(key, value);
    });

    const response = await axios.post(
      'https://formsubmit.co/ajax/contact@0708.nl',
      params.toString(),
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: HTTP_TIMEOUT,
        validateStatus: (responseStatus) => responseStatus >= 200 && responseStatus < 300
      }
    );

    // FormSubmit often responds with a redirect — treat 200-399 as success
    res.json({ ok: true, status: response.status });
  } catch (err) {
    console.error('Contact proxy error', err?.response?.data || err.message);
    const status = err.response?.status || 500;
    res.status(status).json({ ok: false, error: 'Failed to forward contact' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Serve the website and API from the same process in production.
const publicDirectory = path.resolve(__dirname, '..');
app.use(['/api', '/server', '/scripts', '/.github'], (_req, res) => {
  res.status(404).end();
});
app.get(
  ['/package.json', '/pnpm-lock.yaml', '/README*', '/about-me.js', '/spotify.js'],
  (_req, res) => res.status(404).end()
);
app.use(
  express.static(publicDirectory, {
    dotfiles: 'deny',
    extensions: ['html'],
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
    }
  })
);

app.use((error, _req, res, next) => {
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ ok: false, error: 'Request is too large' });
  }
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
  }
  next(error);
});

app.listen(PORT, () => {
  console.log(`0708 website running on http://localhost:${PORT}`);
});
