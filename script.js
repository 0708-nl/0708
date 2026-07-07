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

if (contactForm && formStatus) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = contactForm.querySelector('input[name="name"]').value.trim();
    const email = contactForm.querySelector('input[name="email"]').value.trim();
    const subject = contactForm.querySelector('input[name="subject"]').value.trim();
    const message = contactForm.querySelector('textarea[name="message"]').value.trim();

    if (!name || !email || !subject || !message) {
      formStatus.textContent = 'Fill every field before sending.';
      return;
    }

    formStatus.textContent = 'Message queued. 0708 will respond soon.';
    contactForm.reset();
  });
}

// Spotify embed lazy-load and overlay handling
(() => {
  const iframe = document.querySelector('.spotify-embed');
  const overlay = document.querySelector('.spotify-overlay');
  const loadBtn = document.getElementById('loadSpotify');
  const openBtn = document.getElementById('openSpotify');

  if (!iframe || !overlay) return;

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
