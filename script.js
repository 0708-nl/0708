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
      if (event.key === 'Escape' && header.classList.contains('nav-open')) {
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

    revealItems.forEach((item) => {
      revealObserver.observe(item);
    });
  }

  const contactForm = document.getElementById('contactForm');
  const formStatus = document.getElementById('formStatus');
  const submitButton = contactForm?.querySelector('button[type="submit"]');
  const enquirySelect = contactForm?.querySelector('[name="enquiryType"]');
  const contactDetails = contactForm?.querySelector('[data-contact-details]');
  const enquirySections = contactForm?.querySelectorAll('[data-enquiry-section]') || [];
  const messageLabel = contactForm?.querySelector('[data-message-label]');

  const enquiryMessageLabels = {
    booking: 'Booking notes',
    collab: 'Collaboration proposal',
    press: 'Press request',
    other: 'Message'
  };

  const updateEnquiryFields = () => {
    if (!enquirySelect || !contactDetails) return;

    const selectedType = enquirySelect.value;
    const hasSelection = Boolean(selectedType);
    contactDetails.hidden = !hasSelection;

    contactDetails.querySelectorAll('input, select, textarea, button').forEach((control) => {
      control.disabled = !hasSelection;
    });

    enquirySections.forEach((section) => {
      const isActive = hasSelection && section.dataset.enquirySection === selectedType;
      section.hidden = !isActive;
      section.querySelectorAll('input, select, textarea').forEach((control) => {
        control.disabled = !isActive;
        control.required = isActive && control.hasAttribute('data-required');
      });
    });

    if (messageLabel) {
      messageLabel.textContent = enquiryMessageLabels[selectedType] || 'Message';
    }
  };

  if (enquirySelect && contactDetails) {
    enquirySelect.addEventListener('change', updateEnquiryFields);
    updateEnquiryFields();
  }

  if (contactForm && formStatus && new URLSearchParams(window.location.search).get('sent') === '1') {
    formStatus.textContent = 'Thanks — your message was sent.';
    formStatus.className = 'form-status success';
    window.history.replaceState({}, '', window.location.pathname + window.location.hash);
  }

  if (contactForm && formStatus && contactForm.dataset.ajax === 'true') {
    const verification = { ready: false };
    const widget = document.getElementById('turnstileWidget');
    const loadTurnstile = async () => {
      try {
        const configResponse = await fetch('/api/contact', { headers: { Accept: 'application/json' } });
        const config = await configResponse.json();
        if (!configResponse.ok || !config.configured || !config.siteKey || !widget) throw new Error('Verification is not configured');
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          window.turnstile.render(widget, {
            sitekey: config.siteKey,
            callback: () => { verification.ready = true; },
            'expired-callback': () => { verification.ready = false; },
            'error-callback': () => { verification.ready = false; }
          });
        };
        script.onerror = () => { formStatus.textContent = 'Human verification could not load. Please refresh and try again.'; formStatus.className = 'form-status error'; };
        document.head.appendChild(script);
      } catch {
        formStatus.textContent = 'Human verification is currently unavailable. Please try again later.';
        formStatus.className = 'form-status error';
      }
    };
    loadTurnstile();

    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!contactForm.checkValidity()) {
        contactForm.reportValidity();
        formStatus.textContent = 'Please complete every required field.';
        formStatus.className = 'form-status error';
        return;
      }

      const captchaToken = contactForm.querySelector('[name="cf-turnstile-response"]')?.value;
      if (!verification.ready || !captchaToken) {
        formStatus.textContent = 'Please complete the human verification check.';
        formStatus.className = 'form-status error';
        return;
      }

      const formData = new FormData(contactForm);
      const payload = new URLSearchParams();

      formData.forEach((value, key) => {
        payload.append(key, String(value));
      });

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Sending…';
      }

      formStatus.textContent = 'Sending your message…';
      formStatus.className = 'form-status';

      try {
        const response = await fetch(contactForm.dataset.apiEndpoint || '/api/contact', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
          },
          body: payload.toString()
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) {
          throw new Error(result.error || `Contact request failed with ${response.status}`);
        }

        contactForm.reset();
        updateEnquiryFields();
        formStatus.textContent = 'Thanks — your message was sent.';
        formStatus.className = 'form-status success';
      } catch (error) {
        formStatus.textContent = error.message || 'Unable to send this message right now. Please try again.';
        formStatus.className = 'form-status error';
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Send enquiry';
        }
      }
    });
  }

  const releaseGrid = document.getElementById('releaseGrid');
  const releaseSearch = document.getElementById('releaseSearch');
  const releaseSort = document.getElementById('releaseSort');
  const catalogueCount = document.getElementById('catalogueCount');
  const popularTracksView = document.getElementById('popularTracksView');
  const popularTracksEmbed = document.getElementById('popularTracksEmbed');

  const createReleaseListenLinks = (release) => {
    const title = release.title || 'release';
    const query = encodeURIComponent(`${(release.artists || []).join(' ')} ${title}`.trim());
    const spotifyUrl = release.spotifyUrl || `https://open.spotify.com/album/${encodeURIComponent(release.id)}`;
    const links = [
      ['Play on Spotify', spotifyUrl],
      ['Play on Apple Music', `https://music.apple.com/us/search?term=${query}`],
      ['Play on SoundCloud', `https://soundcloud.com/search?q=${query}`]
    ];
    const nav = document.createElement('nav');
    nav.className = 'release-listen-links';
    nav.setAttribute('aria-label', `Listen to ${title}`);
    links.forEach(([label, href]) => {
      const link = document.createElement('a');
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = label;
      nav.append(link);
    });
    return nav;
  };

  if (releaseGrid && releaseSearch && releaseSort && catalogueCount && popularTracksView && popularTracksEmbed) {
    let cards = Array.from(releaseGrid.querySelectorAll('.release-card'));
    let usingSavedCatalogue = false;
    const updateCatalogue = () => {
      const query = releaseSearch.value.trim().toLocaleLowerCase();
      const sort = releaseSort.value;
      if (sort === 'most-streamed') {
        releaseGrid.hidden = true;
        popularTracksView.hidden = false;
        releaseSearch.closest('.catalogue-field').hidden = true;
        if (!popularTracksEmbed.hasAttribute('src')) {
          popularTracksEmbed.src = 'https://open.spotify.com/embed/artist/3ALqcftkgIiEwVx1mdzdKh?utm_source=generator&theme=0';
        }
        catalogueCount.textContent = 'Spotify Top Tracks · order provided by Spotify';
        return;
      }

      releaseGrid.hidden = false;
      popularTracksView.hidden = true;
      releaseSearch.closest('.catalogue-field').hidden = false;
      const ordered = [...cards].sort((a, b) => {
        if (sort === 'title') {
          return a.querySelector('h3').textContent.localeCompare(b.querySelector('h3').textContent);
        }
        const direction = sort === 'oldest' ? 1 : -1;
        return direction * a.dataset.date.localeCompare(b.dataset.date);
      });

      ordered.forEach((card) => {
        const searchable = `${card.querySelector('h3').textContent} ${card.querySelector('.release-meta').textContent}`.toLocaleLowerCase();
        card.hidden = !searchable.includes(query);
        releaseGrid.append(card);
      });

      const visibleCount = ordered.filter((card) => !card.hidden).length;
      catalogueCount.textContent = visibleCount === cards.length
        ? `Showing ${visibleCount} releases`
        : `Showing ${visibleCount} of ${cards.length} releases`;
      if (usingSavedCatalogue) catalogueCount.textContent += ' · saved catalogue';
    };

    const formatReleaseDate = (date) => {
      const [year, month, day] = String(date || '').split('-');
      if (!month) return year || 'Release date unavailable';
      const monthName = new Date(Date.UTC(Number(year), Number(month) - 1, 1))
        .toLocaleString('en', { month: 'short', timeZone: 'UTC' });
      return day ? `${Number(day)} ${monthName} ${year}` : `${monthName} ${year}`;
    };

    const renderReleases = (releases) => {
      if (!Array.isArray(releases) || !releases.length) return;
      const fragment = document.createDocumentFragment();

      releases.forEach((release) => {
        const card = document.createElement('article');
        card.className = 'release-card';
        card.dataset.date = release.releaseDate || '';

        const link = document.createElement('a');
        link.href = release.spotifyUrl || `https://open.spotify.com/album/${encodeURIComponent(release.id)}`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        if (release.artwork?.url) {
          const artwork = document.createElement('img');
          artwork.src = release.artwork.url;
          artwork.alt = `${release.title} artwork`;
          artwork.width = 320;
          artwork.height = 320;
          artwork.loading = 'lazy';
          artwork.decoding = 'async';
          link.append(artwork);
        }

        const body = document.createElement('div');
        body.className = 'release-body';
        const title = document.createElement('h3');
        title.textContent = release.title || 'Untitled release';
        const meta = document.createElement('p');
        meta.className = 'release-meta';
        const releaseKind = release.releaseType === 'single'
          ? 'Single'
          : release.releaseType === 'compilation'
            ? 'Compilation'
            : release.releaseType === 'appears_on'
              ? 'Featured release'
              : 'Album';
        meta.textContent = `${(release.artists || []).join(', ')} · ${formatReleaseDate(release.releaseDate)} · ${releaseKind} · Spotify`;
        body.append(title, meta);
        link.append(body);
        card.append(link);
        card.append(createReleaseListenLinks(release));
        fragment.append(card);
      });

      releaseGrid.replaceChildren(fragment);
      cards = Array.from(releaseGrid.querySelectorAll('.release-card'));
      updateCatalogue();
    };

    releaseSearch.addEventListener('input', updateCatalogue);
    releaseSort.addEventListener('change', updateCatalogue);
    updateCatalogue();

    fetch('/api/releases', { headers: { Accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error(`Release request failed with ${response.status}`);
        return response.json();
      })
      .then((data) => {
        usingSavedCatalogue = data.stale === true;
        renderReleases(data.releases);
      })
      .catch(() => {
        usingSavedCatalogue = true;
        updateCatalogue();
      });

  }

  const homeReleaseGrid = document.querySelector('.home-release-grid');
  if (homeReleaseGrid) {
    fetch('/api/releases', { headers: { Accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error(`Release request failed with ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data.releases) || !data.releases.length) return;

        const fragment = document.createDocumentFragment();
        data.releases.slice(0, 3).forEach((release) => {
          const card = document.createElement('article');
          card.className = 'release-card';
          const link = document.createElement('a');
          link.href = release.spotifyUrl || `https://open.spotify.com/album/${encodeURIComponent(release.id)}`;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';

          if (release.artwork?.url) {
            const artwork = document.createElement('img');
            artwork.src = release.artwork.url;
            artwork.alt = `${release.title || 'Release'} artwork`;
            artwork.width = 640;
            artwork.height = 640;
            artwork.loading = 'lazy';
            artwork.decoding = 'async';
            link.append(artwork);
          }

          const body = document.createElement('div');
          body.className = 'release-body';
          const title = document.createElement('h3');
          title.textContent = release.title || 'Untitled release';
          const meta = document.createElement('p');
          meta.className = 'release-meta';
          meta.textContent = `${(release.artists || []).join(', ')} · ${String(release.releaseDate || '').slice(0, 4)} · Spotify`;
          body.append(title, meta);
          link.append(body);
          card.append(link);
          card.append(createReleaseListenLinks(release));
          fragment.append(card);
        });

        homeReleaseGrid.replaceChildren(fragment);
      })
      .catch(() => {});
  }

})();
