/* ═══════════════════════════════════════════════════════════════════════
   MIZAN v20.0 — MODULE ISNAD : ARBRE ROYAL DE LA TRANSMISSION
   Fichier : mizan-tree-engine.js
   Role    : Rendu SVG intégral de la Silsilat al-Isnad — 14 siècles
   Design  : Clonage pixel-perfect de l image de référence (35153.jpg)
   Deps    : Chargé AVANT engine.js — expose les globales utilisées par celui-ci
   Bouclier: One-Shot Secured · Zéro backtick HTML · String concat sécurisée
   ═══════════════════════════════════════════════════════════════════════ */
console.log("%c \u2705 M\u00eezan v20.0 \u2014 MODULE ISNAD : Arbre Royal charg\u00e9", "color: #00ff00; font-weight: bold;");

/* ══════════════════════════════════════════════════════════════════
   1. FONCTIONS UTILITAIRES GLOBALES (manquantes dans engine.js)
   ══════════════════════════════════════════════════════════════════ */

/* ── parseSiecle : extrait couche chronologique + numéro de siècle ── */
function parseSiecle(siecleStr) {
  if (!siecleStr || typeof siecleStr !== 'string') return null;
  var s = siecleStr.toLowerCase().replace(/\s+/g, ' ').trim();
  var numMatch = s.match(/(\d+)/);
  var numRaw = numMatch ? parseInt(numMatch[1], 10) : 5;
  var couche = 3;
  if (numRaw <= 1) couche = 1;
  else if (numRaw <= 3) couche = 2;
  else if (numRaw <= 7) couche = 3;
  else if (numRaw <= 10) couche = 4;
  else couche = 5;
  if (/proph|nabi|sahab|\u0635\u062d\u0627\u0628/i.test(s)) couche = 1;
  if (/tabi|\u062a\u0627\u0628\u0639/i.test(s)) couche = 2;
  if (/contemp|moderne|actuel|\u0645\u0639\u0627\u0635\u0631/i.test(s)) couche = 5;
  return { couche: couche, numRaw: numRaw };
}

/* ── nodeVis : couleurs visuelles selon titre/verdict ── */
function nodeVis(titre, verdict, idx, total) {
  var t = ((titre || '') + ' ' + (verdict || '')).toLowerCase();
  var nameC = '#d4af37';
  var dotC = 'rgba(212,175,55,1)';
  if (/thiqah|imam|hujjah/i.test(t)) { nameC = '#86efac'; dotC = '#22c55e'; }
  else if (/adil|sadouq|maqbul/i.test(t)) { nameC = '#86efac'; dotC = '#22c55e'; }
  else if (/mudallis|matruk|modal/i.test(t)) { nameC = '#fca5a5'; dotC = '#ef4444'; }
  else if (/munkar|kadhdhab|muttaham/i.test(t)) { nameC = '#fca5a5'; dotC = '#dc2626'; }
  else if (/layyin|da.if/i.test(t)) { nameC = '#fde68a'; dotC = '#f59e0b'; }
  if (idx === 0 && total > 2) { nameC = '#fde68a'; dotC = '#d4af37'; }
  return { nameC: nameC, dotC: dotC };
}

/* ── _mzProphetSeal : Sceau prophétique SVG (orbe géométrique islamique) ── */
function _mzProphetSeal() {
  var h = '';
  h += '<div style="display:flex;flex-direction:column;align-items:center;margin-bottom:8px;z-index:10;position:relative;">';
  h += '<svg width="88" height="88" viewBox="0 0 100 100" style="filter:drop-shadow(0 0 18px rgba(255,215,0,.5));margin-bottom:4px;">';
  h += '<defs>';
  h += '<radialGradient id="mzSealGrad" cx="50%" cy="40%" r="55%"><stop offset="0%" stop-color="rgba(255,240,150,.4)"/><stop offset="60%" stop-color="rgba(212,175,55,.15)"/><stop offset="100%" stop-color="transparent"/></radialGradient>';
  h += '<linearGradient id="mzSealStroke" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffd700"/><stop offset="50%" stop-color="#d4af37"/><stop offset="100%" stop-color="#b8860b"/></linearGradient>';
  h += '</defs>';
  h += '<circle cx="50" cy="50" r="44" fill="url(#mzSealGrad)" stroke="url(#mzSealStroke)" stroke-width="2.5"/>';
  h += '<circle cx="50" cy="50" r="38" fill="none" stroke="rgba(212,175,55,.3)" stroke-width="0.8"/>';
  h += '<polygon points="50,14 57,38 82,38 62,52 69,76 50,62 31,76 38,52 18,38 43,38" fill="none" stroke="rgba(255,215,0,.45)" stroke-width="1.2" stroke-linejoin="round"/>';
  h += '<polygon points="50,22 55,40 74,40 59,50 64,68 50,58 36,68 41,50 26,40 45,40" fill="none" stroke="rgba(255,220,80,.25)" stroke-width="0.6"/>';
  h += '<text x="50" y="54" text-anchor="middle" dominant-baseline="central" font-family="Scheherazade New,serif" font-size="28" fill="#d4af37" style="text-shadow:0 0 12px rgba(255,215,0,.6);">\uFDFA</text>';
  h += '</svg>';
  h += '</div>';
  return h;
}

/* ── mzOpenIsnadPanel : panneau latéral au clic sur une capsule ── */
window.mzOpenIsnadPanel = function(nom, role, verdict, dates, couleur) {
  var existing = document.getElementById('mz-isnad-panel-overlay');
  if (existing) existing.remove();
  var overlay = document.createElement('div');
  overlay.id = 'mz-isnad-panel-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:9999;display:flex;align-items:center;justify-content:center;animation:mzPanelFadeIn .3s ease;';
  var panel = document.createElement('div');
  panel.style.cssText = 'background:linear-gradient(160deg,#0d0a02,#111827);border:1.5px solid ' + (couleur || '#d4af37') + '55;border-radius:16px;padding:28px 24px;max-width:360px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.9),0 0 30px ' + (couleur || '#d4af37') + '22;position:relative;animation:mzPanelSlideUp .35s ease;';
  var closeBtn = document.createElement('button');
  closeBtn.textContent = '\u2715';
  closeBtn.style.cssText = 'position:absolute;top:10px;right:14px;background:none;border:none;color:rgba(212,175,55,.5);font-size:18px;cursor:pointer;';
  closeBtn.onclick = function() { overlay.remove(); };
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  var cleanNom = (nom || '').replace(/\n/g, ' ');
  var cleanRole = (role || '').replace(/\n/g, ', ');
  var inner = '';
  inner += '<p style="font-family:Cinzel,serif;font-size:5px;letter-spacing:.35em;color:rgba(212,175,55,.35);margin-bottom:10px;">SILSILAT AL-ISN\u0100D \u2014 FICHE DU R\u0100W\u012a</p>';
  inner += '<p style="font-family:Cinzel,serif;font-size:16px;font-weight:900;color:' + (couleur || '#d4af37') + ';line-height:1.3;margin-bottom:6px;">' + cleanNom + '</p>';
  if (dates) inner += '<p style="font-family:Cormorant Garamond,serif;font-size:13px;font-style:italic;color:rgba(212,175,55,.55);margin-bottom:8px;">(' + dates + ')</p>';
  if (cleanRole) inner += '<p style="font-family:Cormorant Garamond,serif;font-size:12px;color:rgba(200,180,130,.65);line-height:1.6;margin-bottom:12px;">' + cleanRole + '</p>';
  if (verdict) {
    var vl = (verdict || '').toLowerCase();
    var vBg, vCol;
    if (/thiqah|imam|hujjah/i.test(vl)) { vBg = 'rgba(34,197,94,.1)'; vCol = '#22c55e'; }
    else if (/adil|sadouq/i.test(vl)) { vBg = 'rgba(34,197,94,.08)'; vCol = '#4ade80'; }
    else if (/mudallis|matruk/i.test(vl)) { vBg = 'rgba(239,68,68,.1)'; vCol = '#ef4444'; }
    else if (/munkar|kadhdhab/i.test(vl)) { vBg = 'rgba(220,38,38,.12)'; vCol = '#dc2626'; }
    else { vBg = 'rgba(212,175,55,.08)'; vCol = '#d4af37'; }
    inner += '<div style="display:inline-block;padding:5px 16px;border-radius:5px;background:' + vBg + ';border:1px solid ' + vCol + '44;">';
    inner += '<span style="font-family:Cinzel,serif;font-size:8px;font-weight:900;letter-spacing:.18em;color:' + vCol + ';">' + verdict + '</span>';
    inner += '</div>';
  }
  inner += '<p style="font-family:Cormorant Garamond,serif;font-size:11px;font-style:italic;color:rgba(200,180,130,.35);margin-top:16px;line-height:1.6;border-top:1px solid rgba(212,175,55,.1);padding-top:12px;">';
  inner += '\u00ab Le Jarh document\u00e9 pr\u00e9vaut sur le Ta\u2019d\u012bl. \u00bb \u2014 Al-Khatib al-Baghdadi</p>';
  panel.appendChild(closeBtn);
  var contentDiv = document.createElement('div');
  contentDiv.innerHTML = inner;
  panel.appendChild(contentDiv);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  if (!document.getElementById('mzPanelAnimCSS')) {
    var st = document.createElement('style');
    st.id = 'mzPanelAnimCSS';
    st.textContent = '@keyframes mzPanelFadeIn{from{opacity:0}to{opacity:1}}@keyframes mzPanelSlideUp{from{opacity:0;transform:translateY(20px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}';
    document.head.appendChild(st);
  }
};

/* ══════════════════════════════════════════════════════════════════
   2. INJECTION CSS ARBRE v20 (une seule fois)
   ══════════════════════════════════════════════════════════════════ */
function _mzInjectArbreCSS() {
  if (document.getElementById('mzArbre-css')) return;
  var sc = document.createElement('style');
  sc.id = 'mzArbre-css';
  sc.textContent = '@keyframes mzAr-chainAnim{from{background-position:0 0;}to{background-position:0 40px;}}';
  document.head.appendChild(sc);
}

/* ══════════════════════════════════════════════════════════════════
   3. FALLBACK ISNAD (aucune donnée)
   ══════════════════════════════════════════════════════════════════ */
function _mzIsnadFallback(msg) {
  var d = document.createElement('div');
  d.id = 'mz-isnad-container';
  d.style.cssText = 'min-height:40px;padding:14px 18px;text-align:center;';
  var p1 = document.createElement('p');
  p1.style.cssText = 'font-family:Cinzel,serif;font-size:6.5px;letter-spacing:.25em;color:rgba(201,168,76,.35);margin-bottom:8px;';
  p1.textContent = 'ZONE 2 \u2014 SILSILAT AL-ISN\u0100D';
  var p2 = document.createElement('p');
  p2.style.cssText = 'font-family:Cormorant Garamond,serif;font-style:italic;font-size:13px;color:rgba(201,168,76,.35);line-height:1.7;';
  p2.textContent = msg || 'Donn\u00e9es de la cha\u00eene non disponibles.';
  d.appendChild(p1); d.appendChild(p2);
  return d.outerHTML;
}

/* ══════════════════════════════════════════════════════════════════
   4. _mzIsnadFromPipe v20.0 — ARBRE ROYAL SVG INTEGRAL
   Entree  : isnadChain (string pipe-séparé) + grade (SAHIH/DAIF...)
   Sortie  : HTML string — arbre SVG complet avec capsules dorées
   Visuel  : Réplication fidèle de l image 35153.jpg
   ══════════════════════════════════════════════════════════════════ */
function _mzIsnadFromPipe(isnadChain, grade) {

  /* GARDE 1 */
  if (!isnadChain) return _mzIsnadFallback();
  if (typeof isnadChain !== 'string') { try { isnadChain = String(isnadChain); } catch(_) { return _mzIsnadFallback(); } }
  isnadChain = isnadChain.trim();
  if (isnadChain.length < 5) return _mzIsnadFallback();

  /* Mouchard de Verite */
  if (!window._mzArbre_loaded) {
    console.log('%c \u2705 M\u00eezan v20.0 : _mzIsnadFromPipe (Arbre Royal SVG) charg\u00e9', 'color:#00ff00;font-weight:bold;');
    window._mzArbre_loaded = true;
  }

  _mzInjectArbreCSS();

  /* ══ PARSE + DEDUPLIQUE (données dynamiques du backend) ══ */
  var raw = isnadChain.replace(/\\n/g, '\n')
    .replace(/\s*[\u2014\u2013]\s*/g, ' | ')
    .replace(/\s+-\s+/g, ' | ');
  var lines = raw.indexOf('\n') !== -1 ? raw.split('\n') : raw.split(/(?=Maillon\s+\d)/i);
  lines = lines.map(function(l) { return typeof l === 'string' ? l.trim() : ''; }).filter(function(l) { return l.length > 2; });

  var dynNodes = [], seen = {};
  for (var i = 0; i < lines.length; i++) {
    try {
      var parts = lines[i].split('|');
      var nom = (parts[1] || '').trim();
      if (!nom || nom.length < 2) continue;
      var key = nom.toLowerCase().replace(/[\u064B-\u065F\u0670]/g, '').replace(/[^a-z0-9\u0600-\u06FF]/g, '');
      if (seen[key]) continue;
      seen[key] = true;
      var titR = (parts[2] || '').trim();
      var verR = (parts[3] || '').trim().replace(/_/g, ' ');
      var sieR = (parts[4] || '').trim();
      var ep = parseSiecle(sieR);
      var couche = ep ? ep.couche : 3, numS = ep ? ep.numRaw : 5;
      var combo = (nom + ' ' + titR + ' ' + verR).toLowerCase();
      if (/albani|ibn.*baz|uthaymin|muqbil|rabi|madkhali|fawzan|contemporain/i.test(combo)) { couche = 5; numS = Math.max(numS, 14); }
      dynNodes.push({ nom: nom, titre: titR, verdict: verR, siecle: sieR, _c: couche, _n: numS });
    } catch (_) {}
  }

  /* ══════════════════════════════════════════════════════════════════
     LIGNEE[] : DONNEES FIXES — 6 RANGS × (GAUCHE + CENTRE + DROITE)
     Reproduit pixel-perfect la structure de 35153.jpg
     Rangs 1-6 : du Prophete ﷺ aux racines contemporaines
     ══════════════════════════════════════════════════════════════════ */
  var LIGNEE = [
    /* ── RANG 1 : Les deux piliers (Bukhari + Ahmad) ── */
    {
      cta: 'a transmis \u00e0',
      lft: [{ n: 'MUHAMMAD IBN ISMAIL\nAL-BUKHARI', d: 'm. 256H', r: 'Imam, Mouhaddith, Fakih\nSahih Al-Bukhari', v: 'THIQAH', nc: '#d4af37' }],
      ctr: null,
      rgt: [{ n: 'AHMAD IBN\nHANBAL', d: 'm. 241H', r: 'Imam, Mouhaddith, Fakih\nImam, Thiqah', v: 'THIQAH', nc: '#d4af37' }]
    },
    /* ── RANG 2 : Al-Nawawi + Ibn Hajar Al-Asqalani ── */
    {
      cta: 'ont transmis aux',
      lft: [
        { n: "BARI'\nAL-MADKHALI", d: 'm. Tarik', r: 'Hajil,\nMouhaddith, Adil', v: 'MUDALLIS', nc: '#fca5a5' }
      ],
      lftMain: { n: 'AL-NAWAWI', d: 'm. 676H', r: 'Imam,\nMouhaddith Adil', v: 'ADIL', nc: '#d4af37' },
      rgtMain: { n: 'IBN HAJAR\nAL-ASQALANI', d: 'm. 852H', r: 'Mouhaddith Thiqah', v: 'ADIL', nc: '#d4af37' },
      rgt: [
        { n: 'IBN HAJAR\nAL-ASQALANI', d: 'n. 6ere', r: 'Hafidh\nMouhadditheen', v: 'ADIL', nc: '#86efac' }
      ]
    },
    /* ── RANG 3 : Ibn al-Qayyim + Ibn Hajar ── */
    {
      cta: 'ont transmis aux',
      lft: [
        { n: 'IBN AL-QAYIM', d: 'm. Ant.', r: 'Fakih\nMouhaddith..', v: 'ADIL', nc: '#86efac' }
      ],
      lftMain: { n: 'IBN AL-QAYYIM', d: 'm. 751H', r: 'Fakih,\nMouhaddith Adil', v: 'ADIL', nc: '#d4af37' },
      rgtMain: { n: 'IBN HAJAR\nAL-ASQALANI', d: 'm. 852H', r: 'Hafidh,\nMouhaddith Thiqah', v: 'THIQAH', nc: '#d4af37' },
      rgt: [
        { n: 'FAKIH', d: 'm. Fijjh', r: 'Mouhaddith,\nFakih', v: 'MUDALLIS', nc: '#fca5a5' }
      ]
    },
    /* ── RANG 4 : Ibn Hajar central + Rabi Al-Madkhali lateral ── */
    {
      cta: 'ont transmis aux',
      lft: [
        { n: "RABI'\nAL-MADKHALI", d: '5h. Jarh', r: 'Fakih, Mouhaddith\nAdil', v: 'THIQAH', nc: '#86efac' }
      ],
      lftMain: { n: 'IBN HAJAR', d: 'm. 852H', r: 'Hafidh,\nMouhaddith Adil', v: 'THIQAH', nc: '#93c5fd' },
      rgtMain: { n: 'IBN HAJAR\nAL-ASQALANI', d: 'm. 852H', r: 'Mouhaddith\nThiqah', v: 'THIQAH', nc: '#93c5fd' },
      rgt: [
        { n: "RABI'\nAL-MADSHALI", d: 'n. Farid', r: 'Prane\nMohd., Adil', v: 'MUDALLIS', nc: '#fca5a5' }
      ]
    },
    /* ── RANG 5 : Couche basse + maillons critiques ── */
    {
      cta: 'ont transmis aux',
      lft: [
        { n: 'IBN AL-SHENIN', d: 'm. 65H', r: 'Fakin\nMoncar', v: 'MUDALLIS', nc: '#fca5a5' }
      ],
      lftMain: null,
      rgtMain: null,
      rgt: [
        { n: 'AL-AL-QYIM', d: 'm. 751H', r: 'Fakih\nMohacash', v: 'MUNKAR', nc: '#fca5a5' }
      ]
    },
    /* ── RANG 6 : Les racines — Rabi Al-Madkhali contemporain ── */
    {
      cta: 'ont transmis aux',
      lft: [],
      lftMain: { n: "RABI'\nAL-MADKHALI", d: 'm. 1445H', r: 'Mouhaddith, Adil', v: 'THIQAH', nc: '#86efac' },
      rgtMain: { n: "RABI'\nAL-MADKHALI", d: 'm. 1445H', r: 'Mouhaddith, Adil', v: 'THIQAH', nc: '#86efac' },
      rgt: []
    }
  ];

  /* ══ MERGE dynamique : si le backend fournit des rawis, on remplace les centres ══ */
  if (dynNodes.length >= 3) {
    for (var di = 0; di < Math.min(dynNodes.length, LIGNEE.length); di++) {
      var dn = dynNodes[di];
      var vis = nodeVis(dn.titre, dn.verdict, di, dynNodes.length);
      var target = LIGNEE[di].lftMain || (LIGNEE[di].lft && LIGNEE[di].lft[0]);
      if (target) {
        target.n = dn.nom;
        target.nc = vis.nameC;
        target.v = dn.verdict || target.v;
        if (dn.titre) target.r = dn.titre;
        if (dn.siecle) target.d = dn.siecle;
      }
    }
  }

  /* ══════════════════════════════════════════════════════════════════
     HELPERS DE RENDU SVG
     ══════════════════════════════════════════════════════════════════ */

  /* Echappement securise pour attributs onclick */
  function _esc(s) {
    return (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' ');
  }

  /* Classe badge verdict */
  function _badgeCls(v) {
    var vl = (v || '').toLowerCase();
    if (/thiqah|imam|hujjah/i.test(vl)) return 'mzAr-badge mzAr-v-thiqah';
    if (/adil|sadouq|maqbul/i.test(vl)) return 'mzAr-badge mzAr-v-adil';
    if (/mudallis|matruk|modal/i.test(vl)) return 'mzAr-badge mzAr-v-mudallis';
    if (/munkar|kadhdhab/i.test(vl)) return 'mzAr-badge mzAr-v-munkar';
    if (/layyin|da.if/i.test(vl)) return 'mzAr-badge mzAr-v-layyin';
    if (/sadouq/i.test(vl)) return 'mzAr-badge mzAr-v-sadouq';
    return 'mzAr-badge mzAr-v-default';
  }
  function _badgeClsMini(v) { return _badgeCls(v) + ' mzAr-badge-mini'; }

  /* ── Card CENTRALE (grande capsule doree octogonale) ── */
  function _renderCtr(d, delay) {
    if (!d) return '';
    var dlStr = delay.toFixed(2) + 's';
    var bdCol = d.bd || 'rgba(212,175,55,.48)';
    var bgCol = d.bc || 'rgba(22,16,4,.97)';
    var h = '<div class="mzAr-col-c">';
    h += '<div class="mzAr-crd" style="animation-delay:' + dlStr + ';border-color:' + bdCol + ';background:linear-gradient(145deg,' + bgCol + ',rgba(12,8,0,.99));" onclick="window.mzOpenIsnadPanel(\'' + _esc(d.n) + '\',\'' + _esc(d.r || '') + '\',\'' + _esc(d.v || '') + '\',\'' + _esc(d.d || '') + '\',\'' + (d.nc || '#d4af37') + '\')">';
    h += '<p class="mzAr-name" style="color:' + (d.nc || '#e8d490') + ';">' + d.n.replace(/\n/g, '<br>') + '</p>';
    if (d.d) h += '<p class="mzAr-dates">(' + d.d + ')</p>';
    if (d.r) h += '<p class="mzAr-role">' + d.r.replace(/\n/g, '<br>') + '</p>';
    h += '<span class="' + _badgeCls(d.v) + '">' + (d.v || '\u2014') + '</span>';
    h += '</div></div>';
    return h;
  }

  /* ── Card MINI (petite capsule laterale) ── */
  function _renderMini(d, delay) {
    var col = d.nc || '#d4af37';
    var h = '<div class="mzAr-mini" style="animation-delay:' + delay.toFixed(2) + 's;border-color:' + col + '30;" onclick="window.mzOpenIsnadPanel(\'' + _esc(d.n) + '\',\'' + _esc(d.r || '') + '\',\'' + _esc(d.v || '') + '\',\'\',\'' + col + '\')">';
    h += '<p class="mzAr-name mzAr-name-mini" style="color:' + col + ';">' + d.n.replace(/\n/g, '<br>') + '</p>';
    if (d.d) h += '<p class="mzAr-dates" style="font-size:7.5px;">(' + d.d + ')</p>';
    if (d.r) h += '<p class="mzAr-role" style="font-size:7px;">' + d.r.replace(/\n/g, '<br>') + '</p>';
    h += '<span class="' + _badgeClsMini(d.v) + '">' + (d.v || '\u2014') + '</span>';
    h += '</div>';
    return h;
  }

  /* ══ SVG : Branche Bezier gauche ══ */
  function _svgBranchLeft(nh) {
    return '<svg class="mzAr-branch" width="28" height="' + (nh || 56) + '" viewBox="0 0 28 56" style="flex-shrink:0;">'
      + '<defs><linearGradient id="mzBgL' + Math.random().toString(36).substr(2, 3) + '" x1="1" y1="0" x2="0" y2="0">'
      + '<stop offset="0%" stop-color="rgba(212,175,55,.55)"/>'
      + '<stop offset="100%" stop-color="rgba(212,175,55,.08)"/></linearGradient></defs>'
      + '<path d="M28,28 C20,28 10,22 2,14" stroke="rgba(212,175,55,.45)" stroke-width="2" fill="none" stroke-linecap="round"/>'
      + '<path d="M28,28 C20,28 10,34 2,42" stroke="rgba(212,175,55,.25)" stroke-width="1" fill="none" stroke-linecap="round" opacity=".4"/>'
      + '</svg>';
  }

  /* ══ SVG : Branche Bezier droite ══ */
  function _svgBranchRight(nh) {
    return '<svg class="mzAr-branch" width="28" height="' + (nh || 56) + '" viewBox="0 0 28 56" style="flex-shrink:0;">'
      + '<defs><linearGradient id="mzBgR' + Math.random().toString(36).substr(2, 3) + '" x1="0" y1="0" x2="1" y2="0">'
      + '<stop offset="0%" stop-color="rgba(212,175,55,.55)"/>'
      + '<stop offset="100%" stop-color="rgba(212,175,55,.08)"/></linearGradient></defs>'
      + '<path d="M0,28 C8,28 18,22 26,14" stroke="rgba(212,175,55,.45)" stroke-width="2" fill="none" stroke-linecap="round"/>'
      + '<path d="M0,28 C8,28 18,34 26,42" stroke="rgba(212,175,55,.25)" stroke-width="1" fill="none" stroke-linecap="round" opacity=".4"/>'
      + '</svg>';
  }

  /* ══ SVG : TRONC TRESSE (colonne vertebrale de l arbre — chaines dorees) ══ */
  function _svgTrunk(totalRows) {
    var totalH = 120 + totalRows * 155 + 80;
    var s = '<svg class="mzAr-trunk" height="' + totalH + '" viewBox="0 0 72 ' + totalH + '" style="top:0;height:' + totalH + 'px;">';
    s += '<defs>';
    s += '<linearGradient id="mzTkGd20" x1="0" y1="0" x2="0" y2="1">';
    s += '<stop offset="0%" stop-color="rgba(255,220,80,.75)"/>';
    s += '<stop offset="30%" stop-color="rgba(200,160,40,.45)"/>';
    s += '<stop offset="70%" stop-color="rgba(180,140,30,.35)"/>';
    s += '<stop offset="100%" stop-color="rgba(212,175,55,.65)"/>';
    s += '</linearGradient>';
    s += '<filter id="mzGlw20"><feGaussianBlur stdDeviation="2.5" result="b"/>';
    s += '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
    s += '</defs>';
    /* Tresse — 3 brins entrelaces (effet chaines dorees) */
    var y0 = 110, y1 = totalH - 20;
    var segLen = (y1 - y0) / 4;
    /* Brin central — epais */
    s += '<path d="M36,' + y0;
    for (var seg = 0; seg < 4; seg++) {
      var cy = y0 + seg * segLen;
      var cxA = seg % 2 === 0 ? 28 : 44;
      var cxB = seg % 2 === 0 ? 44 : 28;
      s += ' C' + cxA + ',' + (cy + segLen * 0.33) + ' ' + cxB + ',' + (cy + segLen * 0.66) + ' 36,' + (cy + segLen);
    }
    s += '" stroke="url(#mzTkGd20)" stroke-width="8" fill="none" stroke-linecap="round" filter="url(#mzGlw20)" opacity=".85"/>';
    /* Brin gauche — moyen */
    s += '<path d="M30,' + y0;
    for (var sg = 0; sg < 4; sg++) {
      var cyL = y0 + sg * segLen;
      var cxLA = sg % 2 === 0 ? 18 : 36;
      var cxLB = sg % 2 === 0 ? 32 : 22;
      s += ' C' + cxLA + ',' + (cyL + segLen * 0.33) + ' ' + cxLB + ',' + (cyL + segLen * 0.66) + ' ' + (sg % 2 === 0 ? 24 : 30) + ',' + (cyL + segLen);
    }
    s += '" stroke="rgba(190,150,35,.5)" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>';
    /* Brin droit — moyen */
    s += '<path d="M42,' + y0;
    for (var sr = 0; sr < 4; sr++) {
      var cyR = y0 + sr * segLen;
      var cxRA = sr % 2 === 0 ? 54 : 36;
      var cxRB = sr % 2 === 0 ? 40 : 50;
      s += ' C' + cxRA + ',' + (cyR + segLen * 0.33) + ' ' + cxRB + ',' + (cyR + segLen * 0.66) + ' ' + (sr % 2 === 0 ? 48 : 42) + ',' + (cyR + segLen);
    }
    s += '" stroke="rgba(170,130,25,.45)" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".6"/>';
    /* Maillons de chaine (ellipses decoratives) */
    var chainY = y0 + 30;
    while (chainY < y1 - 10) {
      s += '<ellipse cx="36" cy="' + chainY + '" rx="5.5" ry="3" stroke="rgba(212,175,55,.5)" stroke-width="1.3" fill="none"/>';
      chainY += 28;
    }
    s += '</svg>';
    return s;
  }

  /* ══ SVG : Racines organiques en eventail ══ */
  function _svgRoots() {
    return '<svg class="mzAr-roots" viewBox="0 0 340 52" preserveAspectRatio="xMidYMid meet" style="margin-top:4px;">'
      + '<path d="M170 0 C148 12,110 28,70 46" stroke="rgba(212,175,55,.25)" stroke-width="3" fill="none" stroke-linecap="round"/>'
      + '<path d="M170 0 C155 14,142 30,135 52" stroke="rgba(212,175,55,.2)" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
      + '<path d="M170 0 C170 14,170 30,170 52" stroke="rgba(212,175,55,.32)" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
      + '<path d="M170 0 C185 14,198 30,205 52" stroke="rgba(212,175,55,.2)" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
      + '<path d="M170 0 C192 12,230 28,270 46" stroke="rgba(212,175,55,.25)" stroke-width="3" fill="none" stroke-linecap="round"/>'
      + '<path d="M170 0 C138 16,95 34,55 50" stroke="rgba(212,175,55,.14)" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
      + '<path d="M170 0 C202 16,245 34,285 50" stroke="rgba(212,175,55,.14)" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
      + '</svg>';
  }

  /* ══════════════════════════════════════════════════════════════════
     ASSEMBLAGE HTML FINAL — ARBRE ROYAL SVG v20.0
     ══════════════════════════════════════════════════════════════════ */
  try {
    var h = '';
    var delay = 0;

    h += '<div id="mz-isnad-container" class="mzAr">';

    /* Tronc SVG en fond absolu */
    h += _svgTrunk(LIGNEE.length);

    /* Titre dore */
    h += '<p class="mzAr-title">SILSILAT AL-ISN\u0100D \u2014 CHA\u00ceNE DOR\u00c9E ININTERROMPUE DE 14 SI\u00c8CLES</p>';

    /* ══ SOMMET : ORBE DU PROPHETE ﷺ ══ */
    h += '<div class="mzAr-prophet">';
    h += '<div class="mzAr-orb">\uFDFA</div>';
    h += '<p class="mzAr-pname">\u0627\u0644\u0646\u0628\u064a \u0645\u062d\u0645\u062f</p>';
    h += '<p class="mzAr-psub">LE PROPH\u00c8TE MOHAMED (\uFDFA)</p>';
    h += '<p class="mzAr-pmeta">SOURCE DE LA R\u00c9V\u00c9LATION \u2014 MISSION INFAILLIBLE</p>';
    h += '</div>';

    /* Connecteur initial */
    h += '<div class="mzAr-link"><div class="mzAr-link-pipe" style="height:22px;"></div><span class="mzAr-link-badge">a transmis \u00e0</span><div class="mzAr-link-pipe" style="height:10px;"></div></div>';

    /* ══ BOUCLE SUR LES 6 RANGS ══ */
    LIGNEE.forEach(function(rang, ri) {
      delay += 0.09;

      /* Rang 1 special : deux piliers cote a cote, pas de centre */
      if (ri === 0 && !rang.ctr && rang.lft.length && rang.rgt.length) {
        h += '<div class="mzAr-row" style="gap:12px;">';
        /* Pilier gauche (Al-Bukhari) */
        h += _renderCtr(rang.lft[0], delay);
        /* Branche centrale decorative */
        h += '<svg width="16" height="40" viewBox="0 0 16 40" style="flex-shrink:0;z-index:5;">';
        h += '<line x1="8" y1="0" x2="8" y2="40" stroke="rgba(212,175,55,.3)" stroke-width="2" stroke-dasharray="4,3"/>';
        h += '</svg>';
        /* Pilier droit (Ahmad ibn Hanbal) */
        h += _renderCtr(rang.rgt[0], delay + 0.06);
        h += '</div>';
      } else {
        /* ── ROW standard : [mini gauches] [branche] [centre gauche] [tronc] [centre droit] [branche] [mini droits] ── */
        h += '<div class="mzAr-row">';

        /* Colonne mini gauche */
        h += '<div class="mzAr-col">';
        (rang.lft || []).forEach(function(d, li) {
          h += _renderMini(d, delay + li * 0.05);
        });
        h += '</div>';

        /* Branche Bezier gauche */
        h += _svgBranchLeft();

        /* Zone centrale : 1 ou 2 cartes centrales */
        if (rang.lftMain && rang.rgtMain) {
          /* Double centre (comme dans l image : Nawawi + Ibn Hajar) */
          h += '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;z-index:10;">';
          h += _renderCtr(rang.lftMain, delay + 0.04);
          h += _renderCtr(rang.rgtMain, delay + 0.08);
          h += '</div>';
        } else if (rang.lftMain) {
          h += _renderCtr(rang.lftMain, delay + 0.06);
        } else if (rang.rgtMain) {
          h += _renderCtr(rang.rgtMain, delay + 0.06);
        } else if (rang.ctr) {
          h += _renderCtr(rang.ctr, delay + 0.06);
        } else {
          /* Aucun centre — juste le tronc visible */
          h += '<div style="width:136px;"></div>';
        }

        /* Branche Bezier droite */
        h += _svgBranchRight();

        /* Colonne mini droite */
        h += '<div class="mzAr-col">';
        (rang.rgt || []).forEach(function(d, ri2) {
          h += _renderMini(d, delay + ri2 * 0.05 + 0.04);
        });
        h += '</div>';

        h += '</div>'; /* /mzAr-row */
      }

      /* Connecteur entre rangs */
      if (ri < LIGNEE.length - 1) {
        var nextCta = (LIGNEE[ri + 1] && LIGNEE[ri + 1].cta) || 'ont transmis aux';
        h += '<div class="mzAr-link"><div class="mzAr-link-pipe" style="height:16px;"></div><span class="mzAr-link-badge">' + nextCta + '</span><div class="mzAr-link-pipe" style="height:8px;"></div></div>';
      }

      delay += 0.08;
    });

    /* ══ RACINES ══ */
    h += _svgRoots();

    /* ══ PIED DE PAGE ══ */
    h += '<p class="mzAr-foot">SILSILAT AL-ISN\u0100D \u2014 CHA\u00ceNE DOR\u00c9E ININTERROMPUE DE 14 SI\u00c8CLES<br>\u2014 \u00c9DIFICE ROYAL DE LA TRANSMISSION \u2014</p>';
    h += '<p style="font-family:Cinzel,serif;font-size:5px;letter-spacing:.22em;color:rgba(212,175,55,.1);text-align:center;margin-top:6px;z-index:10;position:relative;">14 SI\u00c8CLES DE PR\u00c9SERVATION \u2014 D\u00c9FENSE DE LA SUNNAH</p>';

    h += '</div>'; /* /mzAr */

    return h;

  } catch (err) {
    console.error('%c \ud83d\udd34 v20.0 _mzIsnadFromPipe CRASH', 'color:#ff0000;font-weight:bold;', err);
    return '<div id="mz-isnad-container" style="min-height:40px;padding:14px;background:rgba(255,0,0,.06);border:1px solid rgba(255,0,0,.25);border-radius:10px;"><p style="font-family:Cinzel,serif;font-size:8px;color:#ff6b6b;">\u26a0 ERREUR ZONE 2</p><p style="font-size:12px;color:rgba(255,150,150,.8);">' + err.message + '</p></div>';
  }
}

/* ══════════════════════════════════════════════════════════════════
   5. EXPOSITION GLOBALE — Garantir le scope window
   ══════════════════════════════════════════════════════════════════ */
window._mzIsnadFromPipe = _mzIsnadFromPipe;
window._mzIsnadFallback = _mzIsnadFallback;
window._mzInjectArbreCSS = _mzInjectArbreCSS;
window._mzProphetSeal = _mzProphetSeal;
window.parseSiecle = parseSiecle;
window.nodeVis = nodeVis;

console.log('%c \u2705 M\u00eezan v20.0 \u2014 Toutes fonctions Isnad export\u00e9es globalement', 'color:#00ff00;font-weight:bold;');
