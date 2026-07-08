/* about-me.js
   Genereert automatisch een persoonlijke bio op basis van vooraf gedefinieerde eigenschappen.
   De tekst gebruikt uitsluitend de opgegeven kenmerken en voegt geen extra persoonlijke details toe.
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
      'Koken', 'Fine dining', 'Culinaire creativiteit', 'Nieuwe technieken en smaken', 'Gastvrijheid', 'Zelfontwikkeling'
    ],
    work: [
      'grote passie voor koken',
      'werk in de wereld van fine dining',
      'veel aandacht voor detail, kwaliteit en presentatie',
      'zie koken als creatieve expressie',
      'blijf mezelf ontwikkelen met nieuwe technieken en smaken',
      'werk met discipline, precisie en respect voor het vak'
    ]
  };

  function sentenceJoin(arr) {
    if (!arr || !arr.length) return '';
    if (arr.length === 1) return arr[0] + '.';
    return arr.slice(0, -1).join(', ') + ' en ' + arr.slice(-1) + '.';
  }

  function generateBio(p) {
    // Return an array of paragraphs (deterministic, Dutch, based only on provided facts).
    return [
      "Ik ben van nature een rustig en introvert persoon; ik houd veel voor mezelf en spreek liever spaarzaam. In gesprekken observeer ik, denk ik na en laat ik mijn werk vaak het meeste zeggen.",
      "Rust, eerlijkheid en loyaliteit zijn voor mij belangrijke waarden: ze bepalen hoe ik omga met mensen en met mijn vak.",
      "In mijn leven heb ik moeilijke ervaringen en trauma's meegemaakt. Ik behandel die herinneringen met zorg en subtiliteit: ze hebben invloed gehad en mij gevormd, maar ze bepalen niet wie ik in wezen ben. Die houding zie je terug in mijn manier van werken — bedachtzaam en zonder dramatiek.",
      "Koken is mijn grote passie. In de wereld van fine dining werk ik met aandacht voor detail, kwaliteit en presentatie. Voor mij is koken een manier van creatieve expressie: ik experimenteer met technieken en smaken en zoek naar zuivere, doordachte oplossingen op het bord. Gastvrijheid en respect voor ingrediënten staan altijd centraal.",
      "Ik blijf mezelf ontwikkelen door nieuwe technieken en smaken te verkennen, en door discipline en precisie in elk gerecht te leggen. Mijn manier van werken is oprecht en volwassen: ingetogen in woorden, toegewijd in uitvoering. Die combinatie van rust, vakmanschap en nieuwsgierigheid is wat mij drijft."
    ];
  }

  function injectBio() {
    const el = document.getElementById('generated-bio');
    if (!el) return;
    const paragraphs = generateBio(profile);
    // create theme badge
    const themeLabel = document.createElement('div');
    themeLabel.className = 'bio-theme';
    themeLabel.textContent = 'Thema: Minimalistisch donker — Fine dining';

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
