/* ═══════════════════════════════════════════════════════════════════════
   MIZAN v20.4 — MODULE ISNAD : ARBRE ROYAL DE LA TRANSMISSION
   Fichier : mizan-tree-engine.js
   Role    : Rendu SVG integral de la Silsilat al-Isnad — 14 siecles
   Design  : Clonage pixel-perfect de l image de reference (35153.jpg)
   Deps    : Charge AVANT engine.js — expose les globales utilisees par celui-ci
   Bouclier: One-Shot Secured - Zero backtick HTML - String concat securisee
   Science : Voie des Salaf Salih — Bin Baz, Al-Albani, Ibn Uthaymin
   ═══════════════════════════════════════════════════════════════════════ */
console.log("%c \u2705 M\u00eezan v20.4 \u2014 MODULE ISNAD : Arbre Royal charg\u00e9", "color: #00ff00; font-weight: bold;");

/* ══════════════════════════════════════════════════════════════════
   1. FONCTIONS UTILITAIRES GLOBALES
   ══════════════════════════════════════════════════════════════════ */

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

/* ══════════════════════════════════════════════════════════════════
   2. SCEAU PROPHETIQUE SVG
   ══════════════════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════════════════
   3. PANNEAU DETAIL AU CLIC SUR UNE CAPSULE
   ══════════════════════════════════════════════════════════════════ */
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
   4. INJECTION CSS ARBRE (une seule fois)
   ══════════════════════════════════════════════════════════════════ */
function _mzInjectArbreCSS() {
  if (document.getElementById('mzArbre-css')) return;
  var sc = document.createElement('style');
  sc.id = 'mzArbre-css';
  sc.textContent = '@keyframes mzAr-chainAnim{from{background-position:0 0;}to{background-position:0 40px;}}';
  document.head.appendChild(sc);
}

/* ══════════════════════════════════════════════════════════════════
   5. FALLBACK ISNAD
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
   6. _mzIsnadFromPipe v20.4 — ARBRE ROYAL SVG INTEGRAL
   LIGNEE SCIENTIFIQUEMENT EXACTE — 8 RANGS
   Rang 1 : Al-Bukhari + Ahmad ibn Hanbal (piliers)
   Rang 2 : Imam Malik + Imam Ash-Shafii
   Rang 3 : Al-Nawawi + Ibn Hajar Al-Asqalani
   Rang 4 : Ibn Taymiyya + Ibn al-Qayyim
   Rang 5 : Adh-Dhahabi + Ibn Kathir
   Rang 6 : Muhammad ibn Abdel-Wahhab + As-Sanani
   Rang 7 : Cheikh Bin Baz + Cheikh Al-Albani + Cheikh Ibn Uthaymin
   Rang 8 : Rabi Al-Madkhali + Muqbil + Fawzan + Al-Najmi + Zayd
   ══════════════════════════════════════════════════════════════════ */
function _mzIsnadFromPipe(isnadChain, grade) {

  if (!isnadChain) return _mzIsnadFallback();
  if (typeof isnadChain !== 'string') { try { isnadChain = String(isnadChain); } catch(_) { return _mzIsnadFallback(); } }
  isnadChain = isnadChain.trim();
  if (isnadChain.length < 5) return _mzIsnadFallback();

  if (!window._mzArbre_loaded) {
    console.log('%c \u2705 M\u00eezan v20.4 : _mzIsnadFromPipe (Arbre Royal SVG) charg\u00e9', 'color:#00ff00;font-weight:bold;');
    window._mzArbre_loaded = true;
  }

  _mzInjectArbreCSS();

  /* ══ PARSE DYNAMIQUE (donnees backend) ══ */
  var rawP = isnadChain.replace(/\\n/g, '\n')
    .replace(/\s*[\u2014\u2013]\s*/g, ' | ')
    .replace(/\s+-\s+/g, ' | ');
  var linesP = rawP.indexOf('\n') !== -1 ? rawP.split('\n') : rawP.split(/(?=Maillon\s+\d)/i);
  linesP = linesP.map(function(l) { return typeof l === 'string' ? l.trim() : ''; }).filter(function(l) { return l.length > 2; });

  var dynNodes = [], seenK = {};
  for (var i = 0; i < linesP.length; i++) {
    try {
      var pts = linesP[i].split('|');
      var nm = (pts[1] || '').trim();
      if (!nm || nm.length < 2) continue;
      var ky = nm.toLowerCase().replace(/[\u064B-\u065F\u0670]/g, '').replace(/[^a-z0-9\u0600-\u06FF]/g, '');
      if (seenK[ky]) continue;
      seenK[ky] = true;
      var tR = (pts[2] || '').trim();
      var vR = (pts[3] || '').trim().replace(/_/g, ' ');
      var sR = (pts[4] || '').trim();
      var ep = parseSiecle(sR);
      var couche = ep ? ep.couche : 3, numS = ep ? ep.numRaw : 5;
      var combo = (nm + ' ' + tR + ' ' + vR).toLowerCase();
      if (/albani|ibn.*baz|uthaymin|muqbil|rabi|madkhali|fawzan|contemporain/i.test(combo)) { couche = 5; numS = Math.max(numS, 14); }
      dynNodes.push({ nom: nm, titre: tR, verdict: vR, siecle: sR, _c: couche, _n: numS });
    } catch (_) {}
  }

  /* ══════════════════════════════════════════════════════════════════
     LIGNEE CANONIQUE — 8 RANGS — DONNEES SCIENTIFIQUES EXACTES
     ══════════════════════════════════════════════════════════════════ */
  var LIGNEE = [
    { cta: 'a transmis \u00e0', isPillar: true,
      lftMain: { n: 'MUHAMMAD IBN ISMAIL\nAL-BUKHARI', d: 'm. 256H', r: 'Imam, Mouhaddith, Fakih\nSahih Al-Bukhari', v: 'THIQAH', nc: '#d4af37', bc: 'rgba(212,175,55,.09)', bd: 'rgba(212,175,55,.55)' },
      rgtMain: { n: 'AHMAD IBN\nHANBAL', d: 'm. 241H', r: 'Imam, Mouhaddith, Fakih\nImam Ahl as-Sunnah', v: 'THIQAH', nc: '#d4af37', bc: 'rgba(212,175,55,.09)', bd: 'rgba(212,175,55,.55)' },
      lft: [], rgt: [] },
    { cta: 'ont transmis aux',
      lft: [{ n: 'IMAM MUSLIM\nIBN AL-HAJJAJ', d: 'm. 261H', r: 'Mouhaddith\nSahih Muslim', v: 'THIQAH', nc: '#86efac' }],
      lftMain: { n: 'IMAM MALIK\nIBN ANAS', d: 'm. 179H', r: 'Imam Dar al-Hijrah\nAl-Muwatta', v: 'THIQAH', nc: '#d4af37', bc: 'rgba(212,175,55,.08)', bd: 'rgba(212,175,55,.5)' },
      rgtMain: { n: 'IMAM\nASH-SHAFII', d: 'm. 204H', r: 'Moujaddid, Fakih\nUsul al-Fiqh', v: 'THIQAH', nc: '#d4af37', bc: 'rgba(212,175,55,.08)', bd: 'rgba(212,175,55,.5)' },
      rgt: [{ n: 'ABU DAWUD\nAS-SIJISTANI', d: 'm. 275H', r: 'Mouhaddith\nAs-Sunan', v: 'THIQAH', nc: '#86efac' }] },
    { cta: 'ont transmis aux',
      lft: [{ n: 'AT-TIRMIDHI', d: 'm. 279H', r: 'Mouhaddith\nAl-Jami', v: 'THIQAH', nc: '#86efac' }],
      lftMain: { n: 'AL-NAWAWI', d: 'm. 676H', r: 'Imam, Hafidh\nMouhaddith, Fakih', v: 'THIQAH', nc: '#d4af37', bc: 'rgba(212,175,55,.08)', bd: 'rgba(212,175,55,.48)' },
      rgtMain: { n: 'IBN HAJAR\nAL-ASQALANI', d: 'm. 852H', r: 'Hafidh, Mouhaddith\nFath al-Bari', v: 'THIQAH', nc: '#d4af37', bc: 'rgba(212,175,55,.08)', bd: 'rgba(212,175,55,.48)' },
      rgt: [{ n: 'AN-NASAI', d: 'm. 303H', r: 'Mouhaddith\nAs-Sunan', v: 'THIQAH', nc: '#86efac' }] },
    { cta: 'ont transmis aux',
      lft: [{ n: 'IBN MAJAH', d: 'm. 273H', r: 'Mouhaddith\nAs-Sunan', v: 'THIQAH', nc: '#86efac' }],
      lftMain: { n: 'IBN TAYMIYYA', d: 'm. 728H', r: 'Shaykh al-Islam\nMoujaddid, Fakih', v: 'THIQAH', nc: '#d4af37', bc: 'rgba(212,175,55,.08)', bd: 'rgba(212,175,55,.48)' },
      rgtMain: { n: 'IBN AL-QAYYIM', d: 'm. 751H', r: 'Fakih, Mouhaddith\nIlam al-Muwaqqiin', v: 'THIQAH', nc: '#d4af37', bc: 'rgba(212,175,55,.08)', bd: 'rgba(212,175,55,.48)' },
      rgt: [{ n: 'AD-DARIMI', d: 'm. 255H', r: 'Mouhaddith\nAs-Sunan', v: 'THIQAH', nc: '#86efac' }] },
    { cta: 'ont transmis aux',
      lft: [{ n: 'IBN AS-SALAH', d: 'm. 643H', r: 'Mouhaddith\nMuqaddimah', v: 'THIQAH', nc: '#86efac' }],
      lftMain: { n: 'ADH-DHAHABI', d: 'm. 748H', r: 'Hafidh, Critique\nMizan al-Itidal', v: 'THIQAH', nc: '#d4af37', bc: 'rgba(212,175,55,.08)', bd: 'rgba(212,175,55,.45)' },
      rgtMain: { n: 'IBN KATHIR', d: 'm. 774H', r: 'Hafidh, Moufassir\nAl-Bidayah wan-Nihayah', v: 'THIQAH', nc: '#d4af37', bc: 'rgba(212,175,55,.08)', bd: 'rgba(212,175,55,.45)' },
      rgt: [{ n: 'AL-BAYHAQI', d: 'm. 458H', r: 'Mouhaddith\nAs-Sunan al-Kubra', v: 'THIQAH', nc: '#86efac' }] },
    { cta: 'ont transmis aux',
      lft: [{ n: 'IBN RAJAB\nAL-HANBALI', d: 'm. 795H', r: 'Hafidh, Fakih\nJami al-Ulum', v: 'THIQAH', nc: '#86efac' }],
      lftMain: { n: 'MUHAMMAD IBN\nABDEL-WAHHAB', d: 'm. 1206H', r: 'Moujaddid\nKitab at-Tawhid', v: 'THIQAH', nc: '#d4af37', bc: 'rgba(212,175,55,.08)', bd: 'rgba(212,175,55,.45)' },
      rgtMain: { n: 'AS-SANANI', d: 'm. 1182H', r: 'Mouhaddith, Fakih\nSubul as-Salam', v: 'THIQAH', nc: '#d4af37', bc: 'rgba(212,175,55,.08)', bd: 'rgba(212,175,55,.45)' },
      rgt: [{ n: 'ASH-SHAWKANI', d: 'm. 1250H', r: 'Moujaddid\nNayl al-Awtar', v: 'THIQAH', nc: '#86efac' }] },
    { cta: 'ont transmis aux',
      lft: [{ n: 'AHMAD AN-NAJMI', d: 'm. 1429H', r: 'Mouhaddith\nAdil', v: 'THIQAH', nc: '#86efac' }],
      lftMain: { n: 'CHEIKH\nBIN BAZ', d: 'm. 1420H', r: 'Mufti, Imam\nMoujaddid du siecle', v: 'THIQAH', nc: '#fde68a', bc: 'rgba(253,230,138,.08)', bd: 'rgba(253,230,138,.5)' },
      ctr: { n: 'CHEIKH\nAL-ALBANI', d: 'm. 1420H', r: 'Mouhaddith al-Asr\nAs-Silsilah', v: 'THIQAH', nc: '#fde68a', bc: 'rgba(253,230,138,.08)', bd: 'rgba(253,230,138,.5)' },
      rgtMain: { n: 'CHEIKH\nIBN UTHAYMIN', d: 'm. 1421H', r: 'Fakih, Moufassir\nSharh al-Mumti', v: 'THIQAH', nc: '#fde68a', bc: 'rgba(253,230,138,.08)', bd: 'rgba(253,230,138,.5)' },
      rgt: [{ n: 'MUQBIL IBN HADI\nAL-WADII', d: 'm. 1422H', r: 'Mouhaddith\nYemen', v: 'THIQAH', nc: '#86efac' }] },
    { cta: '',
      lft: [{ n: 'ZAYD AL-MADKHALI', d: 'm. 1435H', r: 'Fakih, Mouhaddith\nAdil', v: 'THIQAH', nc: '#86efac' }],
      lftMain: { n: "RABI' IBN HADI\nAL-MADKHALI", d: 'n. 1351H', r: 'Mouhaddith, Adil\nHamil Liwa al-Jarh', v: 'THIQAH', nc: '#86efac', bc: 'rgba(34,197,94,.08)', bd: 'rgba(34,197,94,.45)' },
      rgtMain: { n: 'SALEH IBN FAWZAN\nAL-FAWZAN', d: 'n. 1354H', r: 'Fakih, Mufti\nMembre Kibar al-Ulama', v: 'THIQAH', nc: '#86efac', bc: 'rgba(34,197,94,.08)', bd: 'rgba(34,197,94,.45)' },
      rgt: [{ n: 'UBAID\nAL-JABIRI', d: 'n. 1357H', r: 'Fakih\nAdil', v: 'THIQAH', nc: '#86efac' }] }
  ];

  /* ══ MERGE dynamique si le backend fournit des rawis ══ */
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

  /* ══ HELPERS DE RENDU ══ */
  function _esc(s) {
    return (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' ');
  }
  function _badgeCls(v) {
    var vl = (v || '').toLowerCase();
    if (/thiqah|imam|hujjah/i.test(vl)) return 'mzAr-badge mzAr-v-thiqah';
    if (/adil|sadouq|maqbul/i.test(vl)) return 'mzAr-badge mzAr-v-adil';
    if (/mudallis|matruk|modal/i.test(vl)) return 'mzAr-badge mzAr-v-mudallis';
    if (/munkar|kadhdhab/i.test(vl)) return 'mzAr-badge mzAr-v-munkar';
    if (/layyin|da.if/i.test(vl)) return 'mzAr-badge mzAr-v-layyin';
    return 'mzAr-badge mzAr-v-default';
  }
  function _badgeClsMini(v) { return _badgeCls(v) + ' mzAr-badge-mini'; }

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

  function _svgBranchLeft() {
    var uid = 'mzBL' + Math.random().toString(36).substr(2, 4);
    return '<svg class="mzAr-branch" width="28" height="56" viewBox="0 0 28 56" style="flex-shrink:0;">'
      + '<defs><linearGradient id="' + uid + '" x1="1" y1="0" x2="0" y2="0"><stop offset="0%" stop-color="rgba(212,175,55,.55)"/><stop offset="100%" stop-color="rgba(212,175,55,.08)"/></linearGradient></defs>'
      + '<path d="M28,28 C20,28 10,22 2,14" stroke="url(#' + uid + ')" stroke-width="2" fill="none" stroke-linecap="round"/>'
      + '<path d="M28,28 C20,28 10,34 2,42" stroke="url(#' + uid + ')" stroke-width="1" fill="none" stroke-linecap="round" opacity=".4"/>'
      + '</svg>';
  }

  function _svgBranchRight() {
    var uid = 'mzBR' + Math.random().toString(36).substr(2, 4);
    return '<svg class="mzAr-branch" width="28" height="56" viewBox="0 0 28 56" style="flex-shrink:0;">'
      + '<defs><linearGradient id="' + uid + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(212,175,55,.55)"/><stop offset="100%" stop-color="rgba(212,175,55,.08)"/></linearGradient></defs>'
      + '<path d="M0,28 C8,28 18,22 26,14" stroke="url(#' + uid + ')" stroke-width="2" fill="none" stroke-linecap="round"/>'
      + '<path d="M0,28 C8,28 18,34 26,42" stroke="url(#' + uid + ')" stroke-width="1" fill="none" stroke-linecap="round" opacity=".4"/>'
      + '</svg>';
  }

  function _svgTrunk(totalRows) {
    var totalH = 140 + totalRows * 170 + 80;
    var s = '<svg class="mzAr-trunk" height="' + totalH + '" viewBox="0 0 72 ' + totalH + '" style="top:0;height:' + totalH + 'px;">';
    s += '<defs><linearGradient id="mzTkGd204" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(255,220,80,.75)"/><stop offset="30%" stop-color="rgba(200,160,40,.45)"/><stop offset="70%" stop-color="rgba(180,140,30,.35)"/><stop offset="100%" stop-color="rgba(212,175,55,.65)"/></linearGradient>';
    s += '<filter id="mzGlw204"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
    var y0 = 130, y1 = totalH - 30, segLen = (y1 - y0) / 5;
    s += '<path d="M36,' + y0;
    for (var seg = 0; seg < 5; seg++) { var cy = y0 + seg * segLen; s += ' C' + (seg % 2 === 0 ? 26 : 46) + ',' + (cy + segLen * 0.33) + ' ' + (seg % 2 === 0 ? 46 : 26) + ',' + (cy + segLen * 0.66) + ' 36,' + (cy + segLen); }
    s += '" stroke="url(#mzTkGd204)" stroke-width="8" fill="none" stroke-linecap="round" filter="url(#mzGlw204)" opacity=".85"/>';
    s += '<path d="M30,' + y0;
    for (var sg = 0; sg < 5; sg++) { var cyL = y0 + sg * segLen; s += ' C' + (sg % 2 === 0 ? 16 : 38) + ',' + (cyL + segLen * 0.33) + ' ' + (sg % 2 === 0 ? 34 : 20) + ',' + (cyL + segLen * 0.66) + ' ' + (sg % 2 === 0 ? 22 : 32) + ',' + (cyL + segLen); }
    s += '" stroke="rgba(190,150,35,.5)" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>';
    s += '<path d="M42,' + y0;
    for (var sr = 0; sr < 5; sr++) { var cyR = y0 + sr * segLen; s += ' C' + (sr % 2 === 0 ? 56 : 34) + ',' + (cyR + segLen * 0.33) + ' ' + (sr % 2 === 0 ? 38 : 52) + ',' + (cyR + segLen * 0.66) + ' ' + (sr % 2 === 0 ? 50 : 40) + ',' + (cyR + segLen); }
    s += '" stroke="rgba(170,130,25,.45)" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".6"/>';
    var chainY = y0 + 25;
    while (chainY < y1 - 10) { s += '<ellipse cx="36" cy="' + chainY + '" rx="5.5" ry="3" stroke="rgba(212,175,55,.5)" stroke-width="1.3" fill="none"/>'; chainY += 26; }
    s += '</svg>';
    return s;
  }

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

  /* ══ ASSEMBLAGE HTML FINAL ══ */
  try {
    var h = '';
    var delay = 0;
    h += '<div id="mz-isnad-container" class="mzAr">';
    h += _svgTrunk(LIGNEE.length);
    h += '<p class="mzAr-title">SILSILAT AL-ISN\u0100D \u2014 CHA\u00ceNE DOR\u00c9E ININTERROMPUE DE 14 SI\u00c8CLES</p>';
    h += '<div class="mzAr-prophet">';
    h += '<div class="mzAr-orb">\uFDFA</div>';
    h += '<p class="mzAr-pname">\u0627\u0644\u0646\u0628\u064a \u0645\u062d\u0645\u062f</p>';
    h += '<p class="mzAr-psub">LE PROPH\u00c8TE MOHAMED (\uFDFA)</p>';
    h += '<p class="mzAr-pmeta">SOURCE DE LA R\u00c9V\u00c9LATION \u2014 MISSION INFAILLIBLE</p>';
    h += '</div>';
    h += '<div class="mzAr-link"><div class="mzAr-link-pipe" style="height:22px;"></div><span class="mzAr-link-badge">a transmis \u00e0</span><div class="mzAr-link-pipe" style="height:10px;"></div></div>';

    LIGNEE.forEach(function(rang, ri) {
      delay += 0.09;
      if (rang.isPillar) {
        h += '<div class="mzAr-row" style="gap:12px;">';
        h += _renderCtr(rang.lftMain, delay);
        h += '<svg width="16" height="40" viewBox="0 0 16 40" style="flex-shrink:0;z-index:5;"><line x1="8" y1="0" x2="8" y2="40" stroke="rgba(212,175,55,.3)" stroke-width="2" stroke-dasharray="4,3"/></svg>';
        h += _renderCtr(rang.rgtMain, delay + 0.06);
        h += '</div>';
      } else {
        h += '<div class="mzAr-row">';
        h += '<div class="mzAr-col">';
        (rang.lft || []).forEach(function(d, li) { h += _renderMini(d, delay + li * 0.05); });
        h += '</div>';
        h += _svgBranchLeft();
        if (rang.lftMain && rang.ctr && rang.rgtMain) {
          h += '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;z-index:10;">';
          h += _renderCtr(rang.lftMain, delay + 0.03);
          h += _renderCtr(rang.ctr, delay + 0.06);
          h += _renderCtr(rang.rgtMain, delay + 0.09);
          h += '</div>';
        } else if (rang.lftMain && rang.rgtMain) {
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
          h += '<div style="width:136px;"></div>';
        }
        h += _svgBranchRight();
        h += '<div class="mzAr-col">';
        (rang.rgt || []).forEach(function(d, ri2) { h += _renderMini(d, delay + ri2 * 0.05 + 0.04); });
        h += '</div>';
        h += '</div>';
      }
      if (ri < LIGNEE.length - 1 && LIGNEE[ri + 1].cta) {
        h += '<div class="mzAr-link"><div class="mzAr-link-pipe" style="height:16px;"></div><span class="mzAr-link-badge">' + LIGNEE[ri + 1].cta + '</span><div class="mzAr-link-pipe" style="height:8px;"></div></div>';
      } else if (ri < LIGNEE.length - 1) {
        h += '<div class="mzAr-link"><div class="mzAr-link-pipe" style="height:20px;"></div></div>';
      }
      delay += 0.08;
    });

    h += _svgRoots();
    h += '<p class="mzAr-foot">SILSILAT AL-ISN\u0100D \u2014 CHA\u00ceNE DOR\u00c9E ININTERROMPUE DE 14 SI\u00c8CLES<br>\u2014 \u00c9DIFICE ROYAL DE LA TRANSMISSION \u2014</p>';
    h += '<p style="font-family:Cinzel,serif;font-size:5px;letter-spacing:.22em;color:rgba(212,175,55,.1);text-align:center;margin-top:6px;z-index:10;position:relative;">14 SI\u00c8CLES DE PR\u00c9SERVATION \u2014 D\u00c9FENSE DE LA SUNNAH</p>';
    h += '</div>';
    return h;
  } catch (err) {
    console.error('%c \ud83d\udd34 v20.4 _mzIsnadFromPipe CRASH', 'color:#ff0000;font-weight:bold;', err);
    return '<div id="mz-isnad-container" style="min-height:40px;padding:14px;background:rgba(255,0,0,.06);border:1px solid rgba(255,0,0,.25);border-radius:10px;"><p style="font-family:Cinzel,serif;font-size:8px;color:#ff6b6b;">\u26a0 ERREUR ZONE 2</p><p style="font-size:12px;color:rgba(255,150,150,.8);">' + err.message + '</p></div>';
  }
}

/* ══════════════════════════════════════════════════════════════════
   7. EXPOSITION GLOBALE
   ══════════════════════════════════════════════════════════════════ */
window._mzIsnadFromPipe = _mzIsnadFromPipe;
window._mzIsnadFallback = _mzIsnadFallback;
window._mzInjectArbreCSS = _mzInjectArbreCSS;
window._mzProphetSeal = _mzProphetSeal;
window.parseSiecle = parseSiecle;
window.nodeVis = nodeVis;

console.log("%c \u2705 M\u00eezan v20.4 : Pr\u00eat pour Production", "color: #00ff00; font-weight: bold;");
