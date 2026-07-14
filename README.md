# 0708 website

Responsive artist website with native Vercel Functions for Spotify metadata and contact-form delivery. A standalone Express server remains available for local development or non-Vercel hosting.

## Deploy on Vercel

Vercel automatically deploys the files in `api/` as `/api/latest-tracks` and `/api/contact`.

Before redeploying, add these Environment Variables in **Vercel Project > Settings > Environment Variables** for Production (and Preview if needed):

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_ARTIST_ID` (optional; defaults to 0708)
- `SPOTIFY_MARKET` (optional; defaults to `NL`)

After adding or changing environment variables, redeploy the latest deployment. The browser never receives the client secret.

## Run locally

1. Open a terminal in `server`.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and add Spotify credentials if the Spotify metadata API is needed.
4. Run `npm start`.
5. Open `http://localhost:3000`.

The Latest Sounds cards are loaded from `/api/latest-tracks`. Locally, the Express server reads Spotify credentials from `server/.env`; on Vercel, the serverless function reads them from the project Environment Variables.

## Content updates

- Main page content: `index.html`
- Bio page: `bio/index.html`
- Hard-techno landing page: `hard-techno-artist/index.html`
- Contact page: `contact/index.html`
- Colors and layout: `styles.css`
- Secondary-page layout: `theme.css`
- Navigation, contact form, and Spotify-card behavior: `script.js`

## Contact form

The form posts to `/api/contact`, which validates the message and forwards it to FormSubmit. If that API is unavailable, the browser submits directly to FormSubmit instead. FormSubmit may require a one-time email activation for `contact@0708.nl`.

Never commit the real `.env` file or Spotify client secret.

`server/.env` is already covered by `.gitignore`. The production server also blocks public requests to `/server` and denies dotfiles.
