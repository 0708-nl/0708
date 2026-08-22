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
    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!contactForm.checkValidity()) {
        contactForm.reportValidity();
        formStatus.textContent = 'Please complete every required field.';
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
      } catch {
        formStatus.textContent = 'Switching to backup form delivery…';
        formStatus.className = 'form-status';
        HTMLFormElement.prototype.submit.call(contactForm);
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Send enquiry';
        }
      }
    });
  }

})();
