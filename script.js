const revealItems = document.querySelectorAll('.reveal');

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

revealItems.forEach((item) => observer.observe(item));

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (event) => {
    const targetId = anchor.getAttribute('href');

    if (!targetId || targetId === '#') {
      event.preventDefault();
      return;
    }

    const target = document.querySelector(targetId);

    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

const contactForm = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');
const submitButton = contactForm?.querySelector('button[type="submit"]');

if (contactForm && formStatus) {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = contactForm.querySelector('input[name="name"]').value.trim();
    const email = contactForm.querySelector('input[name="email"]').value.trim();
    const subject = contactForm.querySelector('input[name="subject"]').value.trim();
    const message = contactForm.querySelector('textarea[name="message"]').value.trim();

    if (!name || !email || !subject || !message) {
      formStatus.textContent = 'Fill in all fields before sending.';
      formStatus.classList.add('error');
      formStatus.classList.remove('success');
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending...';
    }

    formStatus.textContent = 'Sending your message...';
    formStatus.classList.remove('error');
    formStatus.classList.add('success');

    try {
      const response = await fetch(contactForm.action, {
        method: contactForm.method,
        headers: {
          Accept: 'application/json'
        },
        body: new FormData(contactForm)
      });

      if (response.ok) {
        contactForm.reset();
        formStatus.textContent = 'Thanks! Your message was sent.';
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      const mailto = `mailto:contact@0708.nl?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\n\n${message}`
      )}`;

      formStatus.textContent = 'Your message could not be sent directly. Opening your email app instead.';
      formStatus.classList.remove('success');
      formStatus.classList.add('error');
      window.location.href = mailto;
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Send inquiry';
      }
    }
  });
}

const showData = [];
const showList = document.getElementById('showList');
const showEmpty = document.getElementById('showEmpty');

if (showList && showEmpty) {
  if (showData.length > 0) {
    showEmpty.style.display = 'none';
    showData.forEach((show) => {
      const card = document.createElement('article');
      card.className = 'show-card';
      card.innerHTML = `
        <p class="status">${show.status || ''}</p>
        <h3>${show.venue}</h3>
        <p>${show.city}</p>
        <p>${show.date}</p>
        ${show.ticketUrl ? `<a href="${show.ticketUrl}" target="_blank" rel="noopener noreferrer">Ticket link</a>` : ''}
      `;
      showList.appendChild(card);
    });
  } else {
    showList.style.display = 'none';
  }
}

// Spotify embed lazy-load and overlay handling
(() => {
  const iframe = document.querySelector('.spotify-embed');
  const overlay = document.querySelector('.spotify-overlay');
  const loadBtn = document.getElementById('loadSpotify');
  const openBtn = document.getElementById('openSpotify');

  if (!iframe || !overlay) return;

  const loader = document.createElement('span');
  loader.className = 'spotify-loader';
  loader.innerText = 'Loading...';
  overlay.querySelector('.overlay-inner')?.appendChild(loader);

  let srcSet = false;

  function showOverlay() {
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
  }

  function setSrc() {
    if (srcSet) return;
    const data = iframe.getAttribute('data-src');
    if (!data) return;
    iframe.src = data;
    srcSet = true;

    // if load fires, hide overlay
    iframe.addEventListener('load', () => {
      hideOverlay();
    });

    // fallback: hide overlay after 3s even if load doesn't fire
    setTimeout(() => {
      hideOverlay();
      loader.innerText = 'Player loaded';
    }, 3000);
  }

  // Intersection observer to lazy-load when visible
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        setSrc();
        obs.unobserve(iframe);
      }
    });
  }, { threshold: 0.15 });

  try {
    obs.observe(iframe);
    showOverlay();
  } catch (e) {
    // if observe fails, just set src
    setSrc();
  }

  if (loadBtn) {
    loadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      setSrc();
    });
  }

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      // overlay remains but user can open Spotify directly
    });
  }
})();
