/* about-me.js
   Generates a personal bio automatically based on predefined traits.
   The text uses only the provided facts and does not add extra personal details.
*/

(function () {
  const profile = {
    personality: [
      'rustig',
      'introvert',
      'houd veel voor mezelf',
      'praat niet veel',
      'laat liever mijn werk voor zich spreken',
      'denk veel na',
      'observeer meer dan ik praat',
      'waardeer rust, eerlijkheid en loyaliteit'
    ],
    background: [
      'veel moeilijke ervaringen en trauma\'s',
      'verwerkt op een respectvolle en subtiele manier',
      'mijn verleden heeft mij gevormd maar definieert mij niet'
    ],
    interests: [
      'Koken', 'Muziek', 'Gaming'
    ],
    work: [
      'op dit moment aan het studeren als zelfstandig kok niveau 2',
      'werk in de wereld van fine dining',
      'veel aandacht voor detail, kwaliteit en presentatie',
      'ex prof gamer',   ''
    ]
  };

  function sentenceJoin(arr) {
    if (!arr || !arr.length) return '';
    if (arr.length === 1) return arr[0] + '.';
    return arr.slice(0, -1).join(', ') + ' en ' + arr.slice(-1) + '.';
  }

  function generateBio(p) {
    // Return an array of paragraphs (deterministic, English, based only on provided facts).
    return [
      "I am naturally calm and introverted; I keep a lot to myself and prefer to speak sparingly. In conversations I observe, I think carefully, and I let my work often speak the loudest.",
      "Calmness, honesty and loyalty are important values to me: they shape how I interact with people and how I approach my craft.",
      "I have experienced difficult events and trauma in my life. I treat those memories with care and subtlety: they have influenced me and shaped me, but they do not define who I am at my core. That attitude shows in the way I work — thoughtful and without drama.",
      "Cooking is my greatest passion. In the world of fine dining I work with attention to detail, quality and presentation. For me, cooking is a form of creative expression: I experiment with techniques and flavors and seek clean, thoughtful solutions on the plate. Hospitality and respect for ingredients are always central.",
      "I continue to develop myself by exploring new techniques and flavors, and by applying discipline and precision to every dish. My way of working is honest and mature: restrained in words, dedicated in execution. That combination of calm, craftsmanship and curiosity is what drives me."
    ];
  }

  function injectBio() {
    const el = document.getElementById('generated-bio');
    if (!el) return;
    const paragraphs = generateBio(profile);
    // create theme badge
    const themeLabel = document.createElement('div');
    themeLabel.className = 'bio-theme';
    themeLabel.textContent = 'Theme: Learning, Gaming, Music';

    // populate paragraphs
    el.innerHTML = '';
    el.appendChild(themeLabel);
    const wrapper = document.createElement('div');
    wrapper.className = 'generated-bio-body';
    paragraphs.forEach(p => {
      const pEl = document.createElement('p');
      pEl.textContent = p;
      wrapper.appendChild(pEl);
    });
    el.appendChild(wrapper);
    // simple reveal animation trigger
    el.classList.add('fade-in-up');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectBio);
  else injectBio();

})();
