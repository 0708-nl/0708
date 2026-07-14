(() => {
  const header = document.querySelector('.site-header');
  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.querySelector('.site-nav');

  const closeNavigation = () => {
    if (!header || !navToggle) return;
    header.classList.remove('nav-open');
    navToggle.setAttribute('aria-expanded', 'false');
  };

  if (header && navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      const willOpen = navToggle.getAttribute('aria-expanded') !== 'true';
      header.classList.toggle('nav-open', willOpen);
      navToggle.setAttribute('aria-expanded', String(willOpen));
    });

    siteNav.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeNavigation();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeNavigation();
        navToggle.focus();
      }
    });

    document.addEventListener('click', (event) => {
      if (header.classList.contains('nav-open') && !header.contains(event.target)) {
        closeNavigation();
      }
    });

    const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealItems = document.querySelectorAll('.reveal');

  if (!reducedMotion && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.animate(
            [
              { opacity: 0, transform: 'translateY(18px)' },
              { opacity: 1, transform: 'translateY(0)' }
            ],
            { duration: 620, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' }
          );
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const contactForm = document.getElementById('contactForm');
  const formStatus = document.getElementById('formStatus');
  const submitButton = contactForm?.querySelector('button[type="submit"]');

  if (contactForm && formStatus && contactForm.dataset.ajax === 'true') {
    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!contactForm.checkValidity()) {
        contactForm.reportValidity();
        formStatus.textContent = 'Please complete every required field.';
        formStatus.className = 'form-status error';
        return;
      }

      const formData = new FormData(contactForm);
      const name = String(formData.get('name') || '').trim();
      const email = String(formData.get('email') || '').trim();
      const subject = String(formData.get('subject') || '').trim();
      const message = String(formData.get('message') || '').trim();
      const payload = new URLSearchParams();

      formData.forEach((value, key) => payload.append(key, String(value)));

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Sending…';
      }

      formStatus.textContent = 'Sending your message…';
      formStatus.className = 'form-status';

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
          },
          body: payload.toString()
        });

        if (!response.ok) throw new Error(`Contact request failed with ${response.status}`);

        contactForm.reset();
        formStatus.textContent = 'Thanks — your message was sent.';
        formStatus.className = 'form-status success';
      } catch (error) {
        const mailto = `mailto:contact@0708.nl?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
          `Name: ${name}\nEmail: ${email}\n\n${message}`
        )}`;

        formStatus.textContent = 'Direct sending is unavailable. Opening your email app instead.';
        formStatus.className = 'form-status error';
        window.location.href = mailto;
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Send inquiry';
        }
      }
    });
  }

  const latestTracks = document.getElementById('latestTracks');

  const formatReleaseDate = (date, precision) => {
    if (!date) return 'Release date unavailable';
    if (precision === 'year') return date;

    const normalizedDate = precision === 'month' ? `${date}-01` : date;
    const parsedDate = new Date(`${normalizedDate}T00:00:00Z`);
    if (Number.isNaN(parsedDate.getTime())) return date;

    return parsedDate.toLocaleDateString('en-GB', {
      day: precision === 'day' ? 'numeric' : undefined,
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    });
  };

  const createTrackCard = (track) => {
    const card = document.createElement('a');
    card.className = 'track-card spotify-track-card';
    card.href = track.spotifyUrl;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.setAttribute('aria-label', `Play ${track.title} by ${track.artists.join(', ')} on Spotify`);

    if (track.artwork?.url) {
      const artwork = document.createElement('img');
      artwork.className = 'track-artwork';
      artwork.src = track.artwork.url;
      artwork.alt = `${track.album} album cover`;
      artwork.loading = 'lazy';
      artwork.decoding = 'async';
      if (track.artwork.width) artwork.width = track.artwork.width;
      if (track.artwork.height) artwork.height = track.artwork.height;
      card.appendChild(artwork);
    } else {
      const artworkFallback = document.createElement('div');
      artworkFallback.className = 'track-artwork track-artwork-fallback';
      artworkFallback.setAttribute('aria-hidden', 'true');
      artworkFallback.textContent = '0708';
      card.appendChild(artworkFallback);
    }

    const body = document.createElement('div');
    body.className = 'track-card-body';

    const title = document.createElement('h3');
    title.textContent = track.title;

    const artist = document.createElement('p');
    artist.className = 'track-artist';
    artist.textContent = track.artists.join(', ');

    const album = document.createElement('p');
    album.className = 'track-album';
    album.textContent = track.album;

    const releaseDate = document.createElement('time');
    releaseDate.className = 'track-release-date';
    releaseDate.dateTime = track.releaseDate;
    releaseDate.textContent = formatReleaseDate(track.releaseDate, track.releaseDatePrecision);

    const spotifyLabel = document.createElement('span');
    spotifyLabel.className = 'spotify-link-label';
    spotifyLabel.textContent = 'Play on Spotify ↗';

    body.append(title, artist, album, releaseDate, spotifyLabel);
    card.appendChild(body);
    return card;
  };

  const loadLatestTracks = async () => {
    if (!latestTracks) return;

    try {
      const response = await fetch('/api/latest-tracks', {
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) throw new Error(`Latest tracks request failed with ${response.status}`);

      const data = await response.json();
      if (!Array.isArray(data.tracks) || data.tracks.length === 0) {
        throw new Error('Spotify returned no recent tracks');
      }

      latestTracks.replaceChildren(...data.tracks.slice(0, 5).map(createTrackCard));
      latestTracks.setAttribute('aria-busy', 'false');
    } catch (error) {
      const message = document.createElement('p');
      const link = document.createElement('a');
      message.className = 'track-error';
      message.textContent = 'Latest releases are temporarily unavailable. ';
      link.href = 'https://open.spotify.com/artist/3ALqcftkgIiEwVx1mdzdKh';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Open 0708 on Spotify.';
      message.appendChild(link);
      latestTracks.replaceChildren(message);
      latestTracks.setAttribute('aria-busy', 'false');
    }
  };

  loadLatestTracks();
})();
