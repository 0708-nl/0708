// Frontend helper to fetch Spotify track metadata and render album covers.
(function () {
  const API_BASE = '/api/track';

  function svgPlaceholder(text, w = 600, h = 600) {
    const bg = '#111';
    const fg = '#888';
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>` +
      `<rect width='100%' height='100%' fill='${bg}'/>` +
      `<text x='50%' y='50%' dy='0.35em' fill='${fg}' font-family='sans-serif' font-size='28' text-anchor='middle'>${escapeHtml(text)}</text>` +
      `</svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c]; });
  }

  async function fetchTrack(trackId, artist, title) {
    let url;
    if (trackId) url = `${API_BASE}?trackId=${encodeURIComponent(trackId)}`;
    else url = `${API_BASE}?artist=${encodeURIComponent(artist || '')}&title=${encodeURIComponent(title || '')}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw res;
      return await res.json();
    } catch (err) {
      console.warn('Track fetch failed', err);
      return null;
    }
  }

  function buildSrcSet(images) {
    if (!Array.isArray(images) || images.length === 0) return null;
    return images.map(img => `${img.url} ${img.width}w`).join(', ');
  }

  function renderSpot(itemEl, data) {
    if (!data) {
      itemEl.innerHTML = `<div class="track-card spotify-panel spotify-fallback">No artwork</div>`;
      return;
    }

    const title = escapeHtml(data.title || 'Unknown');
    const artists = (data.artists || []).map(escapeHtml).join(', ');
    const album = escapeHtml(data.album || '');
    const release = data.release_date || '';
    const spotifyUrl = data.spotify_url || '#';

    const srcset = buildSrcSet(data.images);
    const src = data.best?.url || (data.images && data.images[0] && data.images[0].url) || svgPlaceholder('No cover');

    const img = document.createElement('img');
    img.className = 'spotify-cover';
    img.alt = `${title} — ${artists}`;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = src;
    if (srcset) {
      img.srcset = srcset;
      img.sizes = '(max-width: 600px) 40vw, 150px';
    }
    img.onerror = () => { img.src = svgPlaceholder('No cover'); };

    const link = document.createElement('a');
    link.href = spotifyUrl || '#';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'spotify-link';
    link.appendChild(img);

    const meta = document.createElement('div');
    meta.className = 'spotify-meta';
    meta.innerHTML = `<div class="track-title">${title}</div><div class="track-artist">${artists}</div><div class="track-album">${album}${release? ' • '+escapeHtml(release): ''}</div>`;

    itemEl.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'track-card';
    card.appendChild(link);
    card.appendChild(meta);
    itemEl.appendChild(card);
  }

  async function enhanceAll() {
    const els = Array.from(document.querySelectorAll('.spotify-track'));
    if (!els.length) return;

    for (const el of els) {
      const trackId = el.dataset.trackId;
      const artist = el.dataset.artist;
      const title = el.dataset.title;
      el.innerHTML = '<div class="spotify-panel">Loading…</div>';
      const data = await fetchTrack(trackId, artist, title);
      renderSpot(el, data);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceAll);
  } else enhanceAll();

})();
