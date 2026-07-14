# 0708 website

Responsive artist website with a small Express server for static hosting, Spotify metadata, and contact-form forwarding.

## Run locally

1. Open a terminal in `server`.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and add Spotify credentials if the Spotify metadata API is needed.
4. Run `npm start`.
5. Open `http://localhost:3000`.

The Latest Sounds cards are loaded from `/api/latest-tracks`. The server reads the Spotify credentials from `server/.env`, requests the artist's newest releases, and caches the five latest tracks for 15 minutes. The browser never receives the client secret.

## Content updates

- Main page content: `index.html`
- Bio page: `bio/index.html`
- Hard-techno landing page: `hard-techno-artist/index.html`
- Contact page: `contact/index.html`
- Colors and layout: `styles.css`
- Secondary-page layout: `theme.css`
- Navigation, shows, contact form, and player behavior: `script.js`

## Contact form

The form posts to `/api/contact`, which forwards it to FormSubmit. FormSubmit may require a one-time email activation for `contact@0708.nl`. If the API is unavailable, the browser opens a pre-filled email draft instead.

Never commit the real `.env` file or Spotify client secret.

`server/.env` is already covered by `.gitignore`. The production server also blocks public requests to `/server` and denies dotfiles.
