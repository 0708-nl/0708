# Generate responsive profile images

Place your source photo at `bio/input.jpg`, then run the following locally to generate the responsive JPGs used by the site.

Prerequisites:
- Node.js (16+)
- Install `sharp`:

```bash
cd <project-root>
npm install sharp
```

Generate images:

```bash
node scripts/generate-profile.js
```

This will produce:
- `bio/profile.jpg`
- `bio/profile-400.jpg`
- `bio/profile-800.jpg`
- `bio/profile-1200.jpg`

If you prefer ImageMagick, see `README-PROFILE.md` for commands.
