const ARTIST_ID = process.env.SPOTIFY_ARTIST_ID || '3ALqcftkgIiEwVx1mdzdKh';
const SPOTIFY_MARKET = process.env.SPOTIFY_MARKET || 'NL';
const CACHE_TTL_MS = 15 * 60 * 1000;

let tokenCache = { accessToken: null, expiresAt: 0 };
let tracksCache = { tracks: null, expiresAt: 0 };

class SpotifyError extends Error {
  constructor(message, status = 502, retryAfter = null) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

async function getAccessToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new SpotifyError('Spotify credentials are not configured', 503);
  }

  if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt - 5_000) {
    return tokenCache.accessToken;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) {
    throw new SpotifyError('Spotify authentication failed', response.status);
  }

  const data = await response.json();
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000
  };

  return tokenCache.accessToken;
}

async function spotifyGet(path, params = {}, retry = true) {
  const token = await getAccessToken();
  const url = new URL(`https://api.spotify.com/v1${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000)
  });

  if (response.status === 401 && retry) {
    tokenCache = { accessToken: null, expiresAt: 0 };
    return spotifyGet(path, params, false);
  }

  if (!response.ok) {
    throw new SpotifyError(
      'Spotify request failed',
      response.status,
      response.headers.get('retry-after')
    );
  }

  return response.json();
}

async function fetchLatestTracks() {
  const releasesData = await spotifyGet(`/artists/${encodeURIComponent(ARTIST_ID)}/albums`, {
    include_groups: 'album,single',
    market: SPOTIFY_MARKET,
    limit: 10,
    offset: 0
  });

  const seenAlbumIds = new Set();
  const releases = (releasesData.items || []).filter((album) => {
    if (!album?.id || seenAlbumIds.has(album.id)) return false;
    seenAlbumIds.add(album.id);
    return true;
  });

  const albums = await Promise.all(
    releases.map(async (release, releaseIndex) => ({
      ...(await spotifyGet(`/albums/${encodeURIComponent(release.id)}`, {
        market: SPOTIFY_MARKET
      })),
      releaseIndex
    }))
  );

  const tracks = albums.flatMap((album) => {
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

  return Array.from(new Map(tracks.map((track) => [track.id, track])).values())
    .sort((a, b) => {
      const dateOrder = String(b.releaseDate || '').localeCompare(String(a.releaseDate || ''));
      if (dateOrder !== 0) return dateOrder;
      if (a.releaseIndex !== b.releaseIndex) return a.releaseIndex - b.releaseIndex;
      return a.trackNumber - b.trackNumber;
    })
    .slice(0, 5)
    .map(({ releaseIndex, trackNumber, ...track }) => track);
}

export async function GET() {
  try {
    if (tracksCache.tracks && Date.now() < tracksCache.expiresAt) {
      return Response.json(
        { artistId: ARTIST_ID, tracks: tracksCache.tracks },
        { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=86400' } }
      );
    }

    const tracks = await fetchLatestTracks();
    tracksCache = { tracks, expiresAt: Date.now() + CACHE_TTL_MS };

    return Response.json(
      { artistId: ARTIST_ID, tracks },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=86400' } }
    );
  } catch (error) {
    const status = Number(error.status) || 500;
    const headers = { 'Cache-Control': 'no-store' };
    if (error.retryAfter) headers['Retry-After'] = error.retryAfter;

    console.error('Latest tracks function failed:', error.message);
    return Response.json(
      {
        error:
          status === 503
            ? 'Spotify is not configured on this deployment'
            : 'Unable to load latest Spotify tracks'
      },
      { status, headers }
    );
  }
}

