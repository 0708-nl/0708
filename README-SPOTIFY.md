# Spotify Album Covers Integration

This project adds Spotify album covers to track listings using the Spotify Web API (Client Credentials flow).

Production (Vercel)
- Location: `api/latest-tracks.mjs`
- Add `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in Vercel Project Settings > Environment Variables.
- Redeploy after adding or changing environment variables.

Local Express server
- Location: `server/`
- Requires `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in `server/.env` (see `.env.example`).
- Install and run:

```bash
cd server
npm install
npm start
```

The backend exposes `/api/track?trackId=...` and `/api/track?artist=...&title=...` which return minimal track metadata and album images.

Frontend
- Include `spotify.js` (already added) and add elements with class `spotify-track` and either `data-track-id` or `data-artist` + `data-title`.
  Example in `bio/index.html`.

Notes
- Tokens and album URLs are cached in-memory on the backend. For production, consider a persistent cache (Redis) and stricter CORS.
- The frontend uses lazy-loading, `srcset`, and a SVG placeholder when no cover is available.
