/* ═══════════════════════════════════════════════════════════════════
   MÎZÂN v21.0 — rawi-modal.js
   MODULE AUTONOME : 'ILM AR-RIJAL — Tarjama Interactive
   Rôle    : Modale biographique des rapporteurs (Rāwī)
   Usage   : Appeler window._openRawiModal('Nom du Rawi')
   Bouclier: Triple Secured — String concat | window.* | Mouchard
   Science : Jarh wa Ta'dil — Voie des Salaf as-Salih
             Statut par défaut des Imams de la Sunnah : THIQAH IMAM
═══════════════════════════════════════════════════════════════════ */

console.log('%c ✅ Mîzân v21.0 — Module \'Ilm ar-Rijal chargé', 'color:#d4af37;font-weight:bold;background:#0a0600;padding:3px 8px;');

/* ════════════════════════════════════════════════════════════════
   1. INJECTION CSS — UNE SEULE FOIS
════════════════════════════════════════════════════════════════ */
(function _mzInjectRawiCSS() {
  if (document.getElementById('mz-rawi-css')) return;

  var style = document.createElement('style');
  style.id = 'mz-rawi-css';
  style.textContent = [

    /* ── Animations ── */
    '@keyframes mzRwFadeIn   { from { opacity:0 }                                        to { opacity:1 } }',
    '@keyframes mzRwSlideUp  { from { opacity:0; transform:translateY(28px) scale(.96) } to { opacity:1; transform:translateY(0) scale(1) } }',
    '@keyframes mzRwGlow     { 0%,100%{ box-shadow:0 0 20px rgba(212,175,55,.35) }      50%{ box-shadow:0 0 40px rgba(212,175,55,.6) } }',
    '@keyframes mzRwPulse    { 0%,100%{ opacity:.6 }                                     50%{ opacity:1 } }',
    '@keyframes mzRwBarFill  { from { width:0 }                                          to  { width:var(--mz-bar-w,80%) } }',
    '@keyframes mzRwTagIn    { from { opacity:0; transform:translateY(6px) }             to  { opacity:1; transform:translateY(0) } }',

    /* ── Overlay ── */
    '#mz-rawi-overlay {',
    '  position:fixed; inset:0; z-index:99999;',
    '  background:rgba(0,0,0,.88);',
    '  display:flex; align-items:center; justify-content:center; padding:16px;',
    '  animation:mzRwFadeIn .28s ease;',
    '  backdrop-filter:blur(4px);',
    '  -webkit-backdrop-filter:blur(4px);',
    '}',

    /* ── Panneau principal ── */
    '.mzRw-panel {',
    '  position:relative;',
    '  background:linear-gradient(160deg,#0e0900 0%,#0a0600 55%,#111827 100%);',
    '  border:1.5px solid rgba(212,175,55,.42);',
    '  border-radius:18px;',
    '  width:100%; max-width:520px; max-height:88vh;',
    '  overflow:hidden;',
    '  display:flex; flex-direction:column;',
    '  animation:mzRwSlideUp .35s cubic-bezier(.4,0,.2,1);',
    '  box-shadow:0 0 0 1px rgba(212,175,55,.08), 0 24px 80px rgba(0,0,0,.95), 0 0 60px rgba(212,175,55,.06);',
    '}',

    /* Bande lumineuse haut */
    '.mzRw-panel::before {',
    '  content:""; position:absolute; top:0; left:50%; transform:translateX(-50%);',
    '  width:60%; height:1px;',
    '  background:linear-gradient(90deg,transparent,rgba(212,175,55,.8),transparent);',
    '  pointer-events:none;',
    '}',

    /* Arabesque de fond */
    '.mzRw-panel::after {',
    '  content:""; position:absolute; inset:0; pointer-events:none; opacity:.025;',
    '  background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'60\' height=\'60\'%3E%3Cpath d=\'M30 5L35 22 52 22 38 32 43 49 30 39 17 49 22 32 8 22 25 22Z\' fill=\'none\' stroke=\'%23d4af37\' stroke-width=\'1\'/%3E%3C/svg%3E");',
    '  background-size:60px;',
    '}',

    /* ── EN-TÊTE ── */
    '.mzRw-header {',
    '  position:relative; z-index:2; padding:22px 22px 16px;',
    '  border-bottom:1px solid rgba(212,175,55,.12);',
    '  background:linear-gradient(180deg,rgba(212,175,55,.04) 0%,transparent 100%);',
    '  flex-shrink:0;',
    '}',

    '.mzRw-eyebrow {',
    '  font-family:Cinzel,serif; font-size:5.5px; letter-spacing:.45em;',
    '  color:rgba(212,175,55,.32); margin-bottom:8px; display:block;',
    '}',

    '.mzRw-name {',
    '  font-family:Cinzel,serif; font-size:20px; font-weight:900;',
    '  color:#fde68a; line-height:1.25; margin-bottom:2px;',
    '  text-shadow:0 0 24px rgba(212,175,55,.4);',
    '}',

    '.mzRw-name-ar {',
    '  font-family:"Scheherazade New",serif; font-size:22px; font-weight:700;',
    '  color:rgba(212,175,55,.65); direction:rtl; margin-bottom:10px; display:block;',
    '}',

    '.mzRw-meta-row {',
    '  display:flex; flex-wrap:wrap; gap:7px; align-items:center;',
    '}',

    '.mzRw-pill {',
    '  font-family:Cinzel,serif; font-size:6.5px; font-weight:700;',
    '  letter-spacing:.14em; padding:4px 11px; border-radius:5px;',
    '  display:inline-flex; align-items:center; gap:5px;',
    '  animation:mzRwTagIn .4s ease both;',
    '}',

    '.mzRw-pill-gold  { background:rgba(212,175,55,.1);  border:1px solid rgba(212,175,55,.35); color:#d4af37; }',
    '.mzRw-pill-green { background:rgba(34,197,94,.08);  border:1px solid rgba(34,197,94,.3);  color:#4ade80; }',
    '.mzRw-pill-red   { background:rgba(239,68,68,.08);  border:1px solid rgba(239,68,68,.28); color:#f87171; }',
    '.mzRw-pill-blue  { background:rgba(96,165,250,.08); border:1px solid rgba(96,165,250,.25);color:#93c5fd; }',

    /* ── SCROLL BODY ── */
    '.mzRw-body {',
    '  position:relative; z-index:2;',
    '  overflow-y:auto; flex:1;',
    '  padding:0 22px 22px;',
    '  scrollbar-width:thin;',
    '  scrollbar-color:rgba(212,175,55,.25) transparent;',
    '}',
    '.mzRw-body::-webkit-scrollbar { width:4px; }',
    '.mzRw-body::-webkit-scrollbar-thumb { background:rgba(212,175,55,.25); border-radius:2px; }',

    /* ── SECTIONS ── */
    '.mzRw-section {',
    '  padding:16px 0 12px;',
    '  border-bottom:1px solid rgba(212,175,55,.07);',
    '}',
    '.mzRw-section:last-child { border-bottom:none; }',

    '.mzRw-section-title {',
    '  font-family:Cinzel,serif; font-size:6.5px; font-weight:700;',
    '  letter-spacing:.32em; color:rgba(212,175,55,.4); margin-bottom:13px;',
    '  display:flex; align-items:center; gap:8px;',
    '}',
    '.mzRw-section-title::after {',
    '  content:""; flex:1; height:1px;',
    '  background:linear-gradient(to right,rgba(212,175,55,.18),transparent);',
    '}',

    /* ── JUGEMENTS ── */
    '.mzRw-judge-grid {',
    '  display:flex; flex-direction:column; gap:8px;',
    '}',

    '.mzRw-judge-row {',
    '  display:flex; align-items:flex-start; gap:12px;',
    '  padding:10px 12px;',
    '  border-radius:10px;',
    '  animation:mzRwTagIn .45s ease both;',
    '}',
    '.mzRw-judge-row.thiqah  { background:rgba(34,197,94,.05);  border:1px solid rgba(34,197,94,.15); }',
    '.mzRw-judge-row.sadouq  { background:rgba(74,222,128,.04); border:1px solid rgba(74,222,128,.12); }',
    '.mzRw-judge-row.daif    { background:rgba(245,158,11,.05); border:1px solid rgba(245,158,11,.18); }',
    '.mzRw-judge-row.munkar  { background:rgba(239,68,68,.05);  border:1px solid rgba(239,68,68,.2); }',

    '.mzRw-judge-badge {',
    '  font-family:Cinzel,serif; font-size:6px; font-weight:900;',
    '  letter-spacing:.14em; padding:3px 9px; border-radius:4px;',
    '  white-space:nowrap; flex-shrink:0; margin-top:1px;',
    '}',
    '.mzRw-judge-row.thiqah .mzRw-judge-badge { background:#22c55e; color:#000; }',
    '.mzRw-judge-row.sadouq .mzRw-judge-badge { background:#4ade80; color:#000; }',
    '.mzRw-judge-row.daif   .mzRw-judge-badge { background:#f59e0b; color:#000; }',
    '.mzRw-judge-row.munkar .mzRw-judge-badge { background:#ef4444; color:#fff; }',

    '.mzRw-judge-body {}',
    '.mzRw-judge-scholar {',
    '  font-family:Cinzel,serif; font-size:8px; font-weight:700;',
    '  letter-spacing:.08em; color:rgba(220,200,140,.9); margin-bottom:3px;',
    '}',
    '.mzRw-judge-text {',
    '  font-family:"Cormorant Garamond",serif; font-size:13px;',
    '  color:rgba(200,180,130,.7); line-height:1.65; font-style:italic;',
    '}',
    '.mzRw-judge-text-ar {',
    '  font-family:"Scheherazade New",serif; font-size:15px;',
    '  color:rgba(212,175,55,.65); direction:rtl; text-align:right;',
    '  line-height:1.7; margin-bottom:4px; display:block;',
    '}',
    '.mzRw-judge-source {',
    '  font-family:Cinzel,serif; font-size:5.5px; letter-spacing:.15em;',
    '  color:rgba(140,110,50,.45); margin-top:4px;',
    '}',

    /* ── BARRES ÉVALUATION ── */
    '.mzRw-bars { display:flex; flex-direction:column; gap:9px; }',

    '.mzRw-bar-row { display:flex; align-items:center; gap:10px; }',
    '.mzRw-bar-label {',
    '  font-family:Cinzel,serif; font-size:7px; font-weight:700; letter-spacing:.12em;',
    '  color:rgba(200,170,100,.75); width:80px; flex-shrink:0;',
    '}',
    '.mzRw-bar-track {',
    '  flex:1; height:5px; background:rgba(255,255,255,.06); border-radius:3px; overflow:hidden;',
    '}',
    '.mzRw-bar-fill {',
    '  height:100%; border-radius:3px;',
    '  animation:mzRwBarFill .8s cubic-bezier(.4,0,.2,1) both;',
    '  animation-delay:.3s;',
    '}',
    '.mzRw-bar-pct {',
    '  font-family:Cinzel,serif; font-size:7.5px; font-weight:900;',
    '  width:32px; text-align:right; flex-shrink:0;',
    '}',

    /* ── MASHAYIKH / TALAMIDH ── */
    '.mzRw-names-grid {',
    '  display:flex; flex-wrap:wrap; gap:6px;',
    '}',
    '.mzRw-name-tag {',
    '  font-family:"Cormorant Garamond",serif; font-size:12.5px;',
    '  padding:4px 12px; border-radius:6px;',
    '  background:rgba(212,175,55,.05); border:1px solid rgba(212,175,55,.15);',
    '  color:rgba(220,200,140,.75);',
    '  animation:mzRwTagIn .4s ease both;',
    '  cursor:default;',
    '  transition:background .2s, border-color .2s;',
    '}',
    '.mzRw-name-tag:hover { background:rgba(212,175,55,.1); border-color:rgba(212,175,55,.3); color:#fde68a; }',

    /* ── RIHLA ── */
    '.mzRw-rihla-text {',
    '  font-family:"Cormorant Garamond",serif; font-size:14.5px;',
    '  color:rgba(220,200,150,.82); line-height:1.85;',
    '}',
    '.mzRw-rihla-quote {',
    '  margin:14px 0 0;',
    '  padding:12px 16px;',
    '  background:rgba(212,175,55,.04);',
    '  border-left:3px solid rgba(212,175,55,.4);',
    '  border-radius:0 8px 8px 0;',
    '}',
    '.mzRw-rihla-quote-ar {',
    '  font-family:"Scheherazade New",serif; font-size:16px;',
    '  color:rgba(212,175,55,.7); direction:rtl; text-align:right;',
    '  line-height:1.75; display:block; margin-bottom:6px;',
    '}',
    '.mzRw-rihla-quote-fr {',
    '  font-family:"Cormorant Garamond",serif; font-style:italic; font-size:13px;',
    '  color:rgba(200,180,130,.6); line-height:1.6;',
    '}',
    '.mzRw-rihla-quote-src {',
    '  font-family:Cinzel,serif; font-size:5.5px; letter-spacing:.15em;',
    '  color:rgba(140,110,50,.4); margin-top:6px; display:block;',
    '}',

    /* ── BOUTON FERMER ── */
    '.mzRw-close {',
    '  position:absolute; top:14px; right:16px;',
    '  background:none; border:none;',
    '  color:rgba(212,175,55,.4); font-size:22px; line-height:1;',
    '  cursor:pointer; z-index:10; transition:color .2s, transform .2s;',
    '  font-family:serif;',
    '}',
    '.mzRw-close:hover { color:rgba(212,175,55,.9); transform:scale(1.1); }',

    /* ── PIED ── */
    '.mzRw-footer {',
    '  position:relative; z-index:2; flex-shrink:0;',
    '  padding:12px 22px; border-top:1px solid rgba(212,175,55,.08);',
    '  display:flex; align-items:center; justify-content:space-between;',
    '  background:rgba(0,0,0,.3);',
    '}',
    '.mzRw-footer-text {',
    '  font-family:Cinzel,serif; font-size:5.5px; letter-spacing:.2em;',
    '  color:rgba(212,175,55,.22);',
    '}',
    '.mzRw-footer-seal {',
    '  font-size:18px; opacity:.2; animation:mzRwPulse 3s ease infinite;',
    '}',

    /* ── DONNÉES NON TROUVÉES ── */
    '.mzRw-not-found {',
    '  text-align:center; padding:28px 20px;',
    '}',
    '.mzRw-not-found-icon { font-size:36px; margin-bottom:10px; opacity:.3; }',
    '.mzRw-not-found-title {',
    '  font-family:Cinzel,serif; font-size:8.5px; letter-spacing:.28em;',
    '  color:rgba(212,175,55,.45); margin-bottom:8px;',
    '}',
    '.mzRw-not-found-text {',
    '  font-family:"Cormorant Garamond",serif; font-size:13px;',
    '  color:rgba(200,180,130,.45); line-height:1.7; font-style:italic;',
    '}',

  ].join('\n');

  document.head.appendChild(style);
})();


/* ════════════════════════════════════════════════════════════════
   2. BASE DE DONNÉES MOCK — IMAMS DE LA SUNNAH
   Voie des Salaf — Statut par défaut : THIQAH IMAM
   Les imams cités sont tous THIQAH selon l'unanimité des Muhaddithin
════════════════════════════════════════════════════════════════ */
var _RAWI_MOCK_DB = {

  /* ── IMAM MALIK IBN ANAS (m. 179H) — La tarjama parfaite pour le test ── */
  'malik ibn anas': {
    nom_fr:  'Imam Malik ibn Anas',
    nom_ar:  'مالك بن أنس الأصبحي المدني',
    tabaqa:  'Tābi\u2019\u012b at-Tābi\u2019\u012bn (3ème génération)',
    naissance: 'n. 93H — Médine',
    deces:    'm. 179H — Médine',
    nisba:    'Al-Asbahi, Al-Madani, Al-Humyari',
    statut:   'THIQAH IMAM',
    statut_class: 'thiqah',
    pills: [
      { label: 'THIQAH IMAM', cls: 'mzRw-pill-green' },
      { label: 'Imām Dār al-Hijrah', cls: 'mzRw-pill-gold' },
      { label: 'Mādinah · 179H', cls: 'mzRw-pill-blue' },
    ],

    /* ── JUGEMENTS DES IMAMS ── */
    jugements: [
      {
        classe: 'thiqah',
        badge: 'THIQAH',
        scholar: 'Yahya ibn Ma\u2019\u012bn',
        text_ar: 'مالك ثقة، وهو أثبت الناس في الحديث',
        text_fr: 'Mālik est Thiqah — il est le plus solide des gens en matière de Hadith.',
        source: 'Tarikh Ibn Ma\u2019\u012bn, Riwayat ad-Dawri'
      },
      {
        classe: 'thiqah',
        badge: 'THIQAH',
        scholar: 'Al-Shāfi\u2019\u012b',
        text_ar: 'إذا جاء الحديث، فمالك النجم، والموطأ أصح كتاب بعد كتاب الله',
        text_fr: 'Lorsque vient le Hadith, Mālik est l\u2019étoile — et le Muwa\u1e6d\u1e6da\u2019 est le livre le plus authentique après le Livre d\u2019Allah.',
        source: 'Manāqib ash-Shāfi\u2019\u012b, Al-Bayhaqi'
      },
      {
        classe: 'thiqah',
        badge: 'THIQAH',
        scholar: 'Imam Ahmad ibn Hanbal',
        text_ar: 'مالك بن أنس إمام الناس في الحديث، وما أقول في رجل لم يختلف الناس فيه',
        text_fr: 'Mālik ibn Anas est l\u2019Imam des gens en matière de Hadith. Et que dire d\u2019un homme sur lequel les gens ne se sont jamais disputés ?',
        source: 'Al-Jarh wa at-Ta\u2019d\u012bl, Ibn Ab\u012b \u1e24\u0101tim'
      },
      {
        classe: 'thiqah',
        badge: 'THIQAH',
        scholar: 'Abd ar-Rahman ibn Mahdi',
        text_ar: 'أئمة الناس في الحديث أربعة: الثوري ومالك والأوزاعي وحماد بن زيد',
        text_fr: 'Les Imams des gens en matière de Hadith sont quatre : Ath-Thawri, Mālik, Al-Awzā\u2019\u012b et \u1e24ammād ibn Zayd.',
        source: 'Siyar A\u2019lām an-Nubalā\u2019, Adh-Dhahab\u012b'
      },
    ],

    /* ── BARRES D'ÉVALUATION ── */
    barres: [
      { label: '\u2018ADALAH',   pct: 100, color: '#22c55e' },
      { label: 'DABT',      pct: 97,  color: '#22c55e' },
      { label: 'ITTISAL',   pct: 99,  color: '#22c55e' },
      { label: 'AUTORITÉ',  pct: 100, color: '#d4af37' },
    ],

    /* ── MASHAYIKH (Professeurs) ── */
    mashayikh: [
      'Nāfi\u2019 mawlā Ibn \u2018Umar',
      'Ibn Shihāb az-Zuhri',
      'Sa\u2019\u012bd ibn al-Musayyib',
      '\u2018Urwah ibn az-Zubayr',
      'Ab\u016b az-Zin\u0101d',
      'Hishām ibn \u2018Urwah',
      'Ya\u1e25ya ibn Sa\u2019\u012bd al-An\u1e63āri',
      '\u2018Abdullah ibn D\u012bnār',
      'Rabī\u2019ah ibn Ab\u012b \u2018Abd ar-Ra\u1e25m\u0101n',
    ],

    /* ── TALAMIDH (Élèves) ── */
    talamidh: [
      'Imam Ash-Shāfi\u2019\u012b',
      'Abd ar-Rahman ibn Mahdi',
      'Ya\u1e25ya al-Qa\u1e6d\u1e6d\u0101n',
      'Ibn al-Mubārak',
      'Sufyān ibn \u2018Uyaynah',
      'Abd Allah ibn Wahb',
      'Abd Allah ibn Maslama al-Qa\u2019nab\u012b',
      'Ibn Bukayr al-Mi\u1e63r\u012b',
      'Ma\u2019n ibn \u2018\u012bsā',
    ],

    /* ── RIHLA (Biographie) ── */
    rihla: 'Mālik ibn Anas naquit à Médine — la Cité du Prophète ﷺ — en 93H. Il y vécut toute sa vie, refusant de la quitter par déférence envers la terre foulée par le Messager d\u2019Allah. Il étudia auprès de sept cents Tābi\u2019\u012bn avant de transmettre aux générations suivantes. Son \u1e24adan\u0101, le Muwa\u1e6d\u1e6da\u2019, fut le premier recueil de Hadith méthodiquement organisé. Le calife H\u0101r\u016bn ar-Rash\u012bd voulut imposer le Muwa\u1e6d\u1e6da\u2019 comme loi universelle de l\u2019Islam : Mālik l\u2019en dissuada, disant que les Compagnons du Prophète s\u2019étaient dispersés dans les contrées avec leur propre savoir. Il fut fouetté sous al-Man\u1e63\u016br pour avoir déclaré la répudiation sous contrainte invalide — et refusa de se rétracter.',

    rihla_quote_ar: 'المدينة حَرَمٌ آمِنٌ، وعِلمُها لا يُؤخَذُ إلا منها',
    rihla_quote_fr: 'Médine est un sanctuaire inviolable — et sa science ne se prend qu\u2019en elle.',
    rihla_quote_src: 'Al-Muwa\u1e6d\u1e6da\u2019 — Muqaddimah',
  },

  /* ── AL-BUKHARI (m. 256H) ── */
  'muhammad ibn ismail al-bukhari': {
    nom_fr:  'Imām Al-Bukh\u0101r\u012b',
    nom_ar:  'محمد بن إسماعيل البخاري',
    tabaqa:  'Atbā\u2019 al-Atbā\u2019 (5ème génération)',
    naissance: 'n. 194H — Bukhara',
    deces:    'm. 256H — Samarqand',
    nisba:    'Al-Bukh\u0101r\u012b, Al-Ju\u2019fi',
    statut:   'THIQAH IMAM',
    statut_class: 'thiqah',
    pills: [
      { label: 'THIQAH IMAM', cls: 'mzRw-pill-green' },
      { label: 'Am\u012br al-Mu\u2019min\u012bn fil \u1e24ad\u012bth', cls: 'mzRw-pill-gold' },
      { label: 'Bukhara · 256H', cls: 'mzRw-pill-blue' },
    ],
    jugements: [
      { classe:'thiqah', badge:'THIQAH', scholar:'Ahmad ibn Hanbal', text_ar:'ما أخرجت خراسان مثله', text_fr:'Le Khorassan n\u2019a jamais produit son semblable.', source:'Siyar A\u2019lām an-Nubalā\u2019' },
      { classe:'thiqah', badge:'THIQAH', scholar:'Ibn Khuza\u0100\u012bmah', text_ar:'ما رأيت تحت أديم السماء أعلم بحديث رسول الله منه', text_fr:'Je n\u2019ai pas vu sous le ciel quelqu\u2019un de plus savant en Hadith que lui.', source:'Tarikh Baghdad' },
    ],
    barres: [
      { label:'\u2018ADALAH', pct:100, color:'#22c55e' },
      { label:'DABT',    pct:100, color:'#22c55e' },
      { label:'ITTISAL', pct:99,  color:'#22c55e' },
      { label:'AUTORITÉ',pct:100, color:'#d4af37' },
    ],
    mashayikh: ['Ahmad ibn Hanbal', 'Yahya ibn Ma\u2019\u012bn', 'Is\u1e25āq ibn R\u0101hawayh', '\u2018Al\u012b ibn al-Mad\u012bn\u012b', 'Is\u1e25āq ibn Mans\u016br'],
    talamidh:  ['Muslim ibn al-\u1e24ajj\u0101j', 'At-Tirmidhī', 'An-Nasā\u2019\u012b', 'Ibn Ab\u012b \u1e24\u0101tim', 'Ibn Khuzaymah'],
    rihla: 'Muḥammad ibn Ismā\u2019\u012bl al-Bukhāri naquit à Bukhara en 194H. Guidé dès son enfance vers la science du Hadith, il avait mémorisé des milliers de traditions à l\u2019âge de seize ans. Son voyage à la Mecque marqua le début d\u2019une rihla légendaire qui le conduisit en Syrie, en Égypte, en Iraq, au Khorassan. Son \u1e62a\u1e25\u012b\u1e25 — distillé de 600 000 Hadiths en 7 275 — est unanimement reconnu comme le livre le plus authentique après le Coran.',
    rihla_quote_ar: 'ما وضعتُ في كتابي إلا ما صحَّ، وتركتُ من الصحاح حذرًا من الإطالة',
    rihla_quote_fr: 'Je n\u2019ai placé dans mon livre que ce qui est authentique — et j\u2019ai abandonné des hadiths authentiques par crainte de la longueur.',
    rihla_quote_src: 'Muqaddimah \u1e62a\u1e25\u012b\u1e25 Al-Bukh\u0101r\u012b',
  },

  /* ── AHMAD IBN HANBAL (m. 241H) ── */
  'ahmad ibn hanbal': {
    nom_fr:  'Imam A\u1e25mad ibn \u1e24anbal',
    nom_ar:  'أحمد بن حنبل الشيباني المروزي',
    tabaqa:  'Atbā\u2019 al-Atbā\u2019 (5ème génération)',
    naissance: 'n. 164H — Bagdad',
    deces:    'm. 241H — Bagdad',
    nisba:    'Ash-Shayb\u0101n\u012b, Al-Marwaz\u012b',
    statut:   'THIQAH IMAM',
    statut_class: 'thiqah',
    pills: [
      { label: 'THIQAH IMAM', cls: 'mzRw-pill-green' },
      { label: 'Im\u0101m Ahl as-Sunnah', cls: 'mzRw-pill-gold' },
      { label: 'Bagd\u0101d · 241H', cls: 'mzRw-pill-blue' },
    ],
    jugements: [
      { classe:'thiqah', badge:'THIQAH', scholar:'Ash-Shāfi\u2019\u012b', text_ar:'خرجت من بغداد وما خلفت بها أحدًا أفضل من أحمد بن حنبل', text_fr:'Je suis sorti de Bagdad sans y laisser personne de meilleur qu\u2019Ahmad ibn Hanbal.', source:'Manāqib Ahmad, Ibn al-Jawz\u012b' },
      { classe:'thiqah', badge:'THIQAH', scholar:'Ibn Ma\u2019\u012bn', text_ar:'إنه ثقة وزيادة على الثقة', text_fr:'Il est Thiqah — et au-delà même de Thiqah.', source:'Tarikh Baghdad' },
    ],
    barres: [
      { label:'\u2018ADALAH', pct:100, color:'#22c55e' },
      { label:'DABT',    pct:98,  color:'#22c55e' },
      { label:'ITTISAL', pct:100, color:'#22c55e' },
      { label:'AUTORITÉ',pct:100, color:'#d4af37' },
    ],
    mashayikh: ['Sufyan ibn \u2018Uyaynah', 'Yahya al-Qa\u1e6d\u1e6d\u0101n', 'Is\u1e25āq ibn R\u0101hawayh', '\u2018Abd ar-Razzāq', 'Shu\u2019bah ibn al-\u1e24ajj\u0101j'],
    talamidh:  ['Al-Bukh\u0101r\u012b', 'Muslim', 'Ab\u016b D\u0101w\u016bd', 'Ibn al-Mad\u012bn\u012b', 'At-Tirmidhī'],
    rihla: 'Ahmad ibn Hanbal — l\u2019Imam d\u2019Ahl as-Sunnah par excellence — refusa de dire que le Coran était créé (khulq al-Qur\u2019ān) pendant toute la Mihna (218-234H), supportant fouets et emprisonnement. Sa résistance préserva l\u2019aqida de la Sunnah contre le Mu\u2019tazilisme officiel. Son Musnad — 40 000 Hadiths — est le plus vaste recueil de la littérature hadithique.',
    rihla_quote_ar: 'إذا رأيت الرجل يحب أحمد فاعلم أنه صاحب سنة',
    rihla_quote_fr: 'Si tu vois un homme aimer Ahmad, sache qu\u2019il est un partisan de la Sunnah.',
    rihla_quote_src: 'Siyar A\u2019lām an-Nubalā\u2019',
  },

};

/* ── Normalisation des noms pour la recherche ── */
function _mzNormRawi(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/['''\u2018\u2019\u02bc]/g, "'")
    .replace(/\u0101/g,'a').replace(/\u012b/g,'i').replace(/\u016b/g,'u')
    .replace(/[\u1e24\u1e25]/g,'h').replace(/[\u1e62\u1e63]/g,'s').replace(/[\u1e6c\u1e6d]/g,'t')
    .replace(/[\u2018\u02bc]/g, "'")
    .replace(/[^a-z0-9\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ── Recherche dans la DB ── */
function _mzFindRawi(name) {
  var key = _mzNormRawi(name);
  /* Recherche exacte */
  if (_RAWI_MOCK_DB[key]) return _RAWI_MOCK_DB[key];
  /* Recherche partielle */
  var keys = Object.keys(_RAWI_MOCK_DB);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i].indexOf(key) !== -1 || key.indexOf(keys[i]) !== -1) {
      return _RAWI_MOCK_DB[keys[i]];
    }
    /* Match sur un mot-clé significatif */
    var words = key.split(' ').filter(function(w) { return w.length > 3; });
    for (var j = 0; j < words.length; j++) {
      if (keys[i].indexOf(words[j]) !== -1) return _RAWI_MOCK_DB[keys[i]];
    }
  }
  return null;
}


/* ════════════════════════════════════════════════════════════════
   3. CONSTRUCTION HTML DE LA MODALE
════════════════════════════════════════════════════════════════ */
function _mzBuildRawiHTML(data, rawName) {
  var h = '';
  h += '<div class="mzRw-panel" role="dialog" aria-modal="true" aria-label="Tarjama de ' + (data ? data.nom_fr : rawName) + '">';

  /* ── Bouton fermer ── */
  h += '<button class="mzRw-close" onclick="window._closeRawiModal()" aria-label="Fermer">&times;</button>';

  if (!data) {
    /* ── Données non trouvées ── */
    h += '<div class="mzRw-header">';
    h += '<span class="mzRw-eyebrow">\'ILM AR-RIJ\u0100L \u2014 TARJAMA</span>';
    h += '<div class="mzRw-name">' + rawName + '</div>';
    h += '</div>';
    h += '<div class="mzRw-body">';
    h += '<div class="mzRw-not-found">';
    h += '<div class="mzRw-not-found-icon">\u2696</div>';
    h += '<div class="mzRw-not-found-title">NON DOCUMENT\u00c9</div>';
    h += '<div class="mzRw-not-found-text">';
    h += 'La biographie de <strong style="color:rgba(212,175,55,.7);">' + rawName + '</strong> ';
    h += 'ne figure pas encore dans la base de donn\u00e9es de Mîzân. ';
    h += 'Consultez Tahdhîb al-Kamāl (Al-Mizzī), Mîzān al-I\u2019tidāl (Adh-Dhahabi) ';
    h += 'ou Tahdhîb at-Tahdhîb (Ibn Hajar).</div>';
    h += '</div></div>';
    h += '<div class="mzRw-footer">';
    h += '<span class="mzRw-footer-text">SILSILAT AL-ISN\u0100D \u2014 M\u00ceZ\u00c2N v21.0</span>';
    h += '<span class="mzRw-footer-seal">\u2696</span>';
    h += '</div>';
    h += '</div>';
    return h;
  }

  /* ═══════════════════════════════════
     EN-TÊTE
  ═══════════════════════════════════ */
  h += '<div class="mzRw-header">';
  h += '<span class="mzRw-eyebrow">\'ILM AR-RIJ\u0100L \u2014 AT-TARJAMA \u2014 ' + (data.tabaqa || '') + '</span>';
  h += '<div class="mzRw-name">' + data.nom_fr + '</div>';
  if (data.nom_ar) h += '<span class="mzRw-name-ar">' + data.nom_ar + '</span>';
  h += '<div class="mzRw-meta-row">';
  (data.pills || []).forEach(function(pill, i) {
    h += '<span class="mzRw-pill ' + pill.cls + '" style="animation-delay:' + (i * 0.08) + 's;">' + pill.label + '</span>';
  });
  h += '</div>';
  h += '</div>';

  /* ═══════════════════════════════════
     CORPS SCROLLABLE
  ═══════════════════════════════════ */
  h += '<div class="mzRw-body">';

  /* ── SECTION 1 : Évaluation (barres) ── */
  if (data.barres && data.barres.length) {
    h += '<div class="mzRw-section">';
    h += '<div class="mzRw-section-title">MARATIB AL-TAWTHIQ \u2014 DEGR\u00c9S DE FIABILIT\u00c9</div>';
    h += '<div class="mzRw-bars">';
    data.barres.forEach(function(b) {
      h += '<div class="mzRw-bar-row">';
      h += '<span class="mzRw-bar-label">' + b.label + '</span>';
      h += '<div class="mzRw-bar-track"><div class="mzRw-bar-fill" style="width:' + b.pct + '%;background:' + b.color + ';--mz-bar-w:' + b.pct + '%;"></div></div>';
      h += '<span class="mzRw-bar-pct" style="color:' + b.color + ';">' + b.pct + '%</span>';
      h += '</div>';
    });
    h += '</div></div>';
  }

  /* ── SECTION 2 : Jugements (Jarh wa Ta'dil) ── */
  if (data.jugements && data.jugements.length) {
    h += '<div class="mzRw-section">';
    h += '<div class="mzRw-section-title">AL-JARH WA AT-TA\u02bfD\u012aL \u2014 JUGEMENTS DES IMAMS</div>';
    h += '<div class="mzRw-judge-grid">';
    data.jugements.forEach(function(j, i) {
      h += '<div class="mzRw-judge-row ' + j.classe + '" style="animation-delay:' + (i * 0.1) + 's;">';
      h += '<div>';
      h += '<span class="mzRw-judge-badge">' + j.badge + '</span>';
      h += '</div>';
      h += '<div class="mzRw-judge-body">';
      h += '<div class="mzRw-judge-scholar">' + j.scholar + '</div>';
      if (j.text_ar) h += '<span class="mzRw-judge-text-ar">' + j.text_ar + '</span>';
      if (j.text_fr) h += '<div class="mzRw-judge-text">\u00ab ' + j.text_fr + ' \u00bb</div>';
      if (j.source)  h += '<div class="mzRw-judge-source">\ud83d\udcda ' + j.source + '</div>';
      h += '</div></div>';
    });
    h += '</div></div>';
  }

  /* ── SECTION 3 : Mashāyikh & Talāmidh ── */
  if ((data.mashayikh && data.mashayikh.length) || (data.talamidh && data.talamidh.length)) {
    h += '<div class="mzRw-section">';
    h += '<div class="mzRw-section-title">SILSILAT AL-\u02bfILM \u2014 SES MA\u00ceTRES & \u00c9L\u00c8VES</div>';

    if (data.mashayikh && data.mashayikh.length) {
      h += '<div style="margin-bottom:12px;">';
      h += '<p style="font-family:Cinzel,serif;font-size:6.5px;letter-spacing:.2em;color:rgba(212,175,55,.35);margin-bottom:8px;">MASH\u0100YIKH \u2014 PROFESSEURS</p>';
      h += '<div class="mzRw-names-grid">';
      data.mashayikh.forEach(function(n, i) {
        h += '<span class="mzRw-name-tag" style="animation-delay:' + (i * 0.05) + 's;">' + n + '</span>';
      });
      h += '</div></div>';
    }

    if (data.talamidh && data.talamidh.length) {
      h += '<div>';
      h += '<p style="font-family:Cinzel,serif;font-size:6.5px;letter-spacing:.2em;color:rgba(93,173,226,.35);margin-bottom:8px;">TAL\u0100MIDH \u2014 \u00c9L\u00c8VES</p>';
      h += '<div class="mzRw-names-grid">';
      data.talamidh.forEach(function(n, i) {
        h += '<span class="mzRw-name-tag" style="animation-delay:' + (i * 0.05) + 's;border-color:rgba(93,173,226,.18);color:rgba(147,197,253,.75);">' + n + '</span>';
      });
      h += '</div></div>';
    }
    h += '</div>';
  }

  /* ── SECTION 4 : Rihla (Biographie) ── */
  if (data.rihla) {
    h += '<div class="mzRw-section">';
    h += '<div class="mzRw-section-title">AR-RI\u1e24LAH \u2014 PARCOURS DE VIE</div>';
    h += '<p class="mzRw-rihla-text">' + data.rihla + '</p>';
    if (data.rihla_quote_ar || data.rihla_quote_fr) {
      h += '<div class="mzRw-rihla-quote">';
      if (data.rihla_quote_ar) h += '<span class="mzRw-rihla-quote-ar">' + data.rihla_quote_ar + '</span>';
      if (data.rihla_quote_fr) h += '<span class="mzRw-rihla-quote-fr">\u00ab ' + data.rihla_quote_fr + ' \u00bb</span>';
      if (data.rihla_quote_src) h += '<span class="mzRw-rihla-quote-src">\ud83d\udcda ' + data.rihla_quote_src + '</span>';
      h += '</div>';
    }
    h += '</div>';
  }

  h += '</div>'; /* /mzRw-body */

  /* ── PIED ── */
  h += '<div class="mzRw-footer">';
  h += '<span class="mzRw-footer-text">SILSILAT AL-ISN\u0100D \u2014 M\u00ceZ\u00c2N v21.0 \u2014 \'ILM AR-RIJ\u0100L</span>';
  h += '<span class="mzRw-footer-seal">\u2696</span>';
  h += '</div>';

  h += '</div>'; /* /mzRw-panel */
  return h;
}


/* ════════════════════════════════════════════════════════════════
   4. OUVERTURE / FERMETURE DE LA MODALE
   Bouclier Portée : window.* pour accessibilité globale
════════════════════════════════════════════════════════════════ */

/**
 * _openRawiModal(rawiName)
 * Point d'entrée principal — appel depuis les nœuds de l'arbre Isnad
 *
 * @param {string} rawiName - Nom du rapporteur (FR ou AR)
 */
window._openRawiModal = function(rawiName) {
  /* Fermer la modale précédente si elle existe */
  var existing = document.getElementById('mz-rawi-overlay');
  if (existing) existing.remove();

  /* Chercher les données */
  var data = _mzFindRawi(rawiName || '');

  /* Construire le HTML */
  var overlay = document.createElement('div');
  overlay.id = 'mz-rawi-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = _mzBuildRawiHTML(data, rawiName || 'Rapporteur inconnu');

  /* Fermer au clic sur l'overlay */
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) window._closeRawiModal();
  });

  document.body.appendChild(overlay);

  /* Trap focus — Accessibilité */
  var panel = overlay.querySelector('.mzRw-panel');
  if (panel) {
    panel.setAttribute('tabindex', '-1');
    panel.focus();
  }

  /* Fermer avec Echap */
  overlay._mzEscHandler = function(e) {
    if (e.key === 'Escape') window._closeRawiModal();
  };
  document.addEventListener('keydown', overlay._mzEscHandler);
};

/**
 * _closeRawiModal()
 * Ferme la modale avec animation de sortie
 */
window._closeRawiModal = function() {
  var overlay = document.getElementById('mz-rawi-overlay');
  if (!overlay) return;
  var panel = overlay.querySelector('.mzRw-panel');
  if (panel) {
    panel.style.animation = 'mzRwSlideUp .2s cubic-bezier(.4,0,.2,1) reverse';
  }
  overlay.style.animation = 'mzRwFadeIn .2s ease reverse';
  if (overlay._mzEscHandler) {
    document.removeEventListener('keydown', overlay._mzEscHandler);
  }
  setTimeout(function() {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }, 220);
};

/**
 * _addRawiData(key, data)
 * Permet d'enrichir la base de données depuis engine.js ou d'un fichier externe
 *
 * @param {string} key  - Clé normalisée (ex: 'abu hurayra')
 * @param {object} data - Objet biographique conforme à la structure _RAWI_MOCK_DB
 */
window._addRawiData = function(key, data) {
  _RAWI_MOCK_DB[_mzNormRawi(key)] = data;
};


/* ════════════════════════════════════════════════════════════════
   5. INTÉGRATION AVEC L'ARBRE ISNAD EXISTANT
   Patch non-invasif : remplace window.mzOpenIsnadPanel
   par un appel à la nouvelle modale enrichie.
   L'ancien panneau reste disponible en fallback.
════════════════════════════════════════════════════════════════ */
(function _mzPatchIsnadPanel() {
  /* Conserver l'ancien handler en sauvegarde */
  var _legacyPanel = window.mzOpenIsnadPanel;

  window.mzOpenIsnadPanel = function(nom, role, verdict, dates, couleur) {
    /* Tenter d'ouvrir la modale enrichie */
    var data = _mzFindRawi(nom || '');
    if (data) {
      window._openRawiModal(nom);
    } else {
      /* Aucune donnée → construire une entrée minimale depuis les paramètres de l'arbre */
      var minData = {
        nom_fr:  nom || 'Rapporteur',
        nom_ar:  '',
        tabaqa:  role || '',
        naissance: dates ? '(' + dates + ')' : '',
        deces:    '',
        nisba:   '',
        statut:   verdict || 'THIQAH',
        statut_class: /thiqah|imam|adil|hujjah/i.test(verdict || '') ? 'thiqah' : /daif|munkar|matruk/i.test(verdict || '') ? 'munkar' : 'thiqah',
        pills: [
          { label: verdict || 'THIQAH', cls: /thiqah|imam|adil/i.test(verdict || '') ? 'mzRw-pill-green' : /daif|munkar/i.test(verdict || '') ? 'mzRw-pill-red' : 'mzRw-pill-gold' },
          dates ? { label: dates, cls: 'mzRw-pill-blue' } : null,
        ].filter(Boolean),
        jugements: [],
        barres: [],
        mashayikh: [],
        talamidh:  [],
        rihla: role ? 'Rôle : ' + role : '',
        rihla_quote_ar: '',
        rihla_quote_fr: '',
        rihla_quote_src: '',
      };
      /* Injecter temporairement pour afficher */
      var tmpKey = _mzNormRawi(nom || 'tmp');
      _RAWI_MOCK_DB[tmpKey] = minData;
      window._openRawiModal(nom);
      /* Nettoyer après fermeture */
      setTimeout(function() { delete _RAWI_MOCK_DB[tmpKey]; }, 5000);
    }
  };
  /* Exposer le legacy au cas où */
  window._mzLegacyIsnadPanel = _legacyPanel;
})();


/* ════════════════════════════════════════════════════════════════
   6. MOUCHARD DE VÉRITÉ — MODULE PRÊT
════════════════════════════════════════════════════════════════ */
console.log('%c ✅ Mîzân v21.0 — rawi-modal.js : Prêt', 'color: #00ff00; font-weight: bold;');
console.log('%c 📚 3 biographies chargées : Mālik · Al-Bukhāri · Ahmad ibn Hanbal', 'color:#86efac;font-weight:bold;');
console.log('%c ⚖️  window._openRawiModal() — window._closeRawiModal() — window._addRawiData()', 'color:#d4af37;');
console.log('%c 🛡️  window.mzOpenIsnadPanel patché → modale enrichie active', 'color:#93c5fd;');
