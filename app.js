/* ═══════════════════════════════════════════════════════════════════
   MÎZÂN v18.4 — app.js
   Rôle    : Navigation + Zone 2 (19 Plaques Silsilah al-Isnad)
   Données : EXTERNALISÉES dans data.js (window.SCHOLARS_DB, window.VERDICTS_DB)
   ─────────────────────────────────────────────────────────────────
   Bouclier de Portée  : window.goTo déclaré EN PREMIER — ABSOLU
   Bouclier de Syntaxe : createElement / textContent EXCLUSIVEMENT
   Bouclier de Science : Zone 2 min-height:40px + titre doré z-index:10
   Mouchard de Vérité  : console.log vert #00ff00 au démarrage
═══════════════════════════════════════════════════════════════════ */

console.log("%c ✅ Mîzân v18.4 : Prêt pour Production", "color: #00ff00; font-weight: bold;");

/* ══════════════════════════════════════════════════════════════
   BOUCLIER DE PORTÉE — window.goTo — POSITION ABSOLUE N°1
══════════════════════════════════════════════════════════════ */
window.goTo = function(view) {
  document.querySelectorAll('.view').forEach(function(v) {
    v.classList.remove('active');
  });
  var el = document.getElementById('view-' + view);
  if (el) { el.classList.add('active'); el.scrollTop = 0; }
};

/* ══════════════════════════════════════════════════════════════
   window.parseSiecle v18.4
   Retourne : { num, era, couche(1-5), numRaw }
   5 couches : Sahaba · Tabi'în · Fondateurs · Huffadh · Contemp.
══════════════════════════════════════════════════════════════ */
window.parseSiecle = function(s) {
  if (!s || typeof s !== 'string') return null;
  var m = s.match(/(\d+)/);
  if (!m) return null;
  var num = m[1], n = parseInt(num), era = '', couche = 3;
  if      (/sahab|compagnon|\u0635\u062d\u0627\u0628/i.test(s))        { era = 'Ère Prophétique'; couche = 1; }
  else if (/tabi|\u062a\u0627\u0628\u0639/i.test(s))                   { era = "Tabi'în";         couche = 2; }
  else if (/contemp|\u0645\u0639\u0627\u0635\u0631/i.test(s))          { era = 'Contemporain';    couche = 5; }
  else if (/huffadh|\u062d\u0641\u0627\u0638/i.test(s))                { era = 'Huffadh';         couche = 4; }
  else if (/fondateur|\u0645\u0624\u0633\u0633/i.test(s))              { era = 'Fondateurs';      couche = 3; }
  else if (/mecqu|\u0645\u0643\u064a/i.test(s))                        { era = 'Mecquois';        couche = 1; }
  else if (/medin|\u0645\u062f\u0646\u064a/i.test(s))                  { era = 'Médinois';        couche = 1; }
  else if (n <= 2)  { era = 'Sahaba';       couche = 1; }
  else if (n <= 4)  { era = "Tabi'în";      couche = 2; }
  else if (n <= 7)  { era = 'Fondateurs';   couche = 3; }
  else if (n <= 10) { era = 'Huffadh';      couche = 4; }
  else              { era = 'Contemporain'; couche = 5; }
  return { num: num + 'e', era: era, couche: couche, numRaw: n };
};

/* ══════════════════════════════════════════════════════════════
   window.nodeVis v18.4
   Palette chromatique : chaque Kibâr a sa couleur signature
   Retourne : { dotC, dotGlow, dotSahaba, nameC, cenC, beamOp, vBg, vC }
══════════════════════════════════════════════════════════════ */
window.nodeVis = function(titre, verdict, idx, total) {
  var tv = ((titre || '') + ' ' + (verdict || '')).toLowerCase();
  var o = {
    dotC: '#d4af37', dotGlow: '0 0 10px rgba(212,175,55,.5)', dotSahaba: false,
    nameC: '#d4af37', cenC: 'rgba(212,175,55,.5)',
    beamOp: '.7', vBg: 'rgba(34,197,94,.08)', vC: '#22c55e'
  };
  if      (/sahab|compagnon|adul.*ijma|\u0635\u062d\u0627\u0628\u064a/i.test(tv)) {
    o.dotC = '#d4af37'; o.dotGlow = '0 0 22px #d4af37,0 0 44px rgba(212,175,55,.5)';
    o.dotSahaba = true; o.nameC = '#e8c96a';
    o.vBg = 'rgba(212,175,55,.1)'; o.vC = '#d4af37';
  } else if (/da.?if|faible|matruk|munkar|kadhdhab|majhul|layyin/i.test(tv)) {
    o.dotC = '#ef4444'; o.dotGlow = '0 0 12px rgba(239,68,68,.6)';
    o.nameC = '#fca5a5'; o.cenC = 'rgba(239,68,68,.5)'; o.beamOp = '.3';
    o.vBg = 'rgba(239,68,68,.08)'; o.vC = '#ef4444';
  } else if (/saduq|maqbul/i.test(tv)) {
    o.dotC = '#f59e0b'; o.dotGlow = '0 0 10px rgba(245,158,11,.5)';
    o.nameC = '#fbbf24'; o.vBg = 'rgba(245,158,11,.08)'; o.vC = '#f59e0b';
  } else if (/thiqah|thabt|hujjah|mutqin/i.test(tv)) {
    o.dotC = '#22c55e'; o.dotGlow = '0 0 12px rgba(34,197,94,.5)'; o.nameC = '#86efac';
  } else if (/albani|\u0623\u0644\u0628\u0627\u0646\u064a|muhaddith.*asr/i.test(tv)) {
    o.dotC = '#a78bfa'; o.dotGlow = '0 0 20px rgba(167,139,250,.7),0 0 44px rgba(167,139,250,.2)';
    o.nameC = '#c4b5fd'; o.cenC = 'rgba(167,139,250,.6)';
    o.vBg = 'rgba(167,139,250,.1)'; o.vC = '#a78bfa';
  } else if (/ibn.*baz|\u0628\u0646.*\u0628\u0627\u0632|mufti/i.test(tv)) {
    o.dotC = '#60a5fa'; o.dotGlow = '0 0 20px rgba(96,165,250,.7),0 0 44px rgba(96,165,250,.2)';
    o.nameC = '#93c5fd'; o.cenC = 'rgba(96,165,250,.6)';
    o.vBg = 'rgba(96,165,250,.1)'; o.vC = '#60a5fa';
  } else if (/uthaymin|\u0639\u062b\u064a\u0645\u064a\u0646/i.test(tv)) {
    o.dotC = '#34d399'; o.dotGlow = '0 0 20px rgba(52,211,153,.7),0 0 44px rgba(52,211,153,.2)';
    o.nameC = '#6ee7b7'; o.cenC = 'rgba(52,211,153,.6)';
    o.vBg = 'rgba(52,211,153,.1)'; o.vC = '#34d399';
  } else if (/muqbil|\u0645\u0642\u0628\u0644|wadi/i.test(tv)) {
    o.dotC = '#fbbf24'; o.dotGlow = '0 0 20px rgba(251,191,36,.7),0 0 44px rgba(251,191,36,.2)';
    o.nameC = '#fcd34d'; o.cenC = 'rgba(251,191,36,.6)';
    o.vBg = 'rgba(251,191,36,.1)'; o.vC = '#fbbf24';
  } else if (/rabi|\u0631\u0628\u064a\u0639|madkhali|\u0645\u062f\u062e\u0644\u064a/i.test(tv)) {
    o.dotC = '#f472b6'; o.dotGlow = '0 0 20px rgba(244,114,182,.7),0 0 44px rgba(244,114,182,.2)';
    o.nameC = '#f9a8d4'; o.cenC = 'rgba(244,114,182,.6)';
    o.vBg = 'rgba(244,114,182,.1)'; o.vC = '#f472b6';
  } else if (/fawzan|\u0641\u0648\u0632\u0627\u0646|imam|verificateur|compilateur/i.test(tv)) {
    o.dotC = '#a78bfa'; o.dotGlow = '0 0 14px rgba(167,139,250,.6)';
    o.nameC = '#c4b5fd'; o.cenC = 'rgba(167,139,250,.5)';
    o.vBg = 'rgba(167,139,250,.08)'; o.vC = '#a78bfa';
  }
  return o;
};

/* ══════════════════════════════════════════════════════════════
   window.mzCloseIsnadPanel — Fermeture offcanvas Zone 2
══════════════════════════════════════════════════════════════ */
window.mzCloseIsnadPanel = function() {
  var bd = document.getElementById('mz-isnad-panel-bd');
  var p  = document.getElementById('mz-isnad-panel');
  if (p)  p.style.transform = 'translateX(100%)';
  if (bd) bd.style.opacity  = '0';
  setTimeout(function() {
    if (bd) bd.remove();
    if (p)  p.remove();
  }, 400);
};

/* ══════════════════════════════════════════════════════════════
   window.mzOpenIsnadPanel — OFFCANVAS Zone 2
   BOUCLIER SYNTAXE : createElement / textContent EXCLUSIVEMENT
   DONNÉES : déléguées à window.SCHOLARS_DB et window.VERDICTS_DB
══════════════════════════════════════════════════════════════ */
window.mzOpenIsnadPanel = function(nom, titre, verdict, siecle, dotC) {
  /* Nettoyage des instances précédentes */
  var old = document.getElementById('mz-isnad-panel-bd');
  if (old) old.remove();
  var oldP = document.getElementById('mz-isnad-panel');
  if (oldP) oldP.remove();

  /* ── DONNÉES : lookup dans data.js — ZÉRO data ici ── */
  var bio = window.SCHOLARS_DB ? window.SCHOLARS_DB[nom.toLowerCase()] : null;
  var vc  = (verdict || '').replace(/_/g, ' ');
  var vs  = window.VERDICTS_DB ? (window.VERDICTS_DB[vc.toLowerCase()] || '') : '';

  var isJarh = /da.?if|matruk|kadhdhab|munkar|majhul/i.test(vc);
  var vClr   = isJarh ? '#ef4444' : (dotC || '#4ade80');

  /* ── BACKDROP ── */
  var bd = document.createElement('div');
  bd.id = 'mz-isnad-panel-bd';
  bd.style.cssText = [
    'position:fixed;inset:0;z-index:9998;',
    'background:rgba(0,0,0,.6);backdrop-filter:blur(4px);',
    'opacity:0;transition:opacity .35s;'
  ].join('');
  bd.addEventListener('click', function(e) {
    if (e.target === bd) window.mzCloseIsnadPanel();
  });

  /* ── PANEL PRINCIPAL ── */
  var p = document.createElement('div');
  p.id = 'mz-isnad-panel';
  p.style.cssText = [
    'position:fixed;top:0;right:0;bottom:0;width:min(380px,88vw);z-index:9999;',
    'background:linear-gradient(170deg,#0d0a02,#111827);',
    'border-left:1px solid rgba(212,175,55,.2);',
    'box-shadow:-10px 0 60px rgba(0,0,0,.8);',
    'transform:translateX(100%);transition:transform .4s cubic-bezier(.4,0,.2,1);',
    'overflow-y:auto;'
  ].join('');

  /* ── HEADER ── */
  var header = document.createElement('div');
  header.style.cssText = 'padding:20px;border-bottom:1px solid rgba(212,175,55,.1);';

  var headerRow = document.createElement('div');
  headerRow.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;';

  var headerLeft = document.createElement('div');

  var ficheLabel = document.createElement('p');
  ficheLabel.style.cssText = [
    'font-family:Cinzel,serif;font-size:5.5px;font-weight:700;',
    'letter-spacing:.35em;color:rgba(212,175,55,.4);margin-bottom:6px;'
  ].join('');
  ficheLabel.textContent = 'FICHE — SILSILAT AL-ISNĀD';

  var nomEl = document.createElement('p');
  nomEl.style.cssText = [
    'font-family:Scheherazade New,serif;font-size:24px;',
    'font-weight:700;line-height:1.2;color:' + (dotC || '#d4af37') + ';'
  ].join('');
  nomEl.textContent = nom;

  headerLeft.appendChild(ficheLabel);
  headerLeft.appendChild(nomEl);

  if (bio && bio.ar) {
    var nomAr = document.createElement('p');
    nomAr.style.cssText = 'font-family:Scheherazade New,serif;font-size:16px;color:rgba(212,175,55,.5);margin-top:2px;';
    nomAr.textContent = bio.ar;
    headerLeft.appendChild(nomAr);
  }

  /* Bouton fermer */
  var btnClose = document.createElement('button');
  btnClose.style.cssText = [
    'background:rgba(212,175,55,.07);border:1px solid rgba(212,175,55,.15);',
    'border-radius:50%;width:32px;height:32px;cursor:pointer;',
    'color:rgba(212,175,55,.5);font-size:16px;',
    'display:flex;align-items:center;justify-content:center;flex-shrink:0;'
  ].join('');
  btnClose.textContent = '×';
  btnClose.addEventListener('click', window.mzCloseIsnadPanel);

  headerRow.appendChild(headerLeft);
  headerRow.appendChild(btnClose);
  header.appendChild(headerRow);
  p.appendChild(header);

  /* ── BODY ── */
  var body = document.createElement('div');
  body.style.cssText = 'padding:20px;';

  /* Bloc verdict */
  var verdictBox = document.createElement('div');
  verdictBox.style.cssText = [
    'background:rgba(0,0,0,.3);',
    'border:1px solid ' + vClr + '22;border-left:3px solid ' + vClr + ';',
    'border-radius:8px;padding:14px 16px;margin-bottom:16px;'
  ].join('');

  var verdictLabel = document.createElement('p');
  verdictLabel.style.cssText = [
    'font-family:Cinzel,serif;font-size:6px;font-weight:700;',
    'letter-spacing:.25em;color:' + vClr + ';margin-bottom:6px;'
  ].join('');
  verdictLabel.textContent = 'VERDICT — JARḤ WA TAʿDĪL';

  var verdictVal = document.createElement('p');
  verdictVal.style.cssText = 'font-family:Cinzel,serif;font-size:11px;font-weight:700;color:' + vClr + ';margin-bottom:4px;';
  verdictVal.textContent = vc;

  verdictBox.appendChild(verdictLabel);
  verdictBox.appendChild(verdictVal);

  if (vs) {
    var verdictDesc = document.createElement('p');
    verdictDesc.style.cssText = [
      'font-family:Cormorant Garamond,serif;font-style:italic;',
      'font-size:13px;color:rgba(220,200,160,.65);line-height:1.6;'
    ].join('');
    verdictDesc.textContent = '→ ' + vs;
    verdictBox.appendChild(verdictDesc);
  }
  body.appendChild(verdictBox);

  /* Bloc bio — structure portée par data.js */
  if (bio) {
    var BIO_FIELDS = [
      { label: 'DATES',                     key: 'd' },
      { label: 'RÔLE DANS LA PRÉSERVATION', key: 'r' },
      { label: 'OUVRAGES MAJEURS',          key: 'o' }
    ];
    BIO_FIELDS.forEach(function(f) {
      if (!bio[f.key]) return;
      var lbl = document.createElement('p');
      lbl.style.cssText = [
        'font-family:Cinzel,serif;font-size:6px;font-weight:700;',
        'letter-spacing:.2em;color:rgba(212,175,55,.4);margin-bottom:6px;'
      ].join('');
      lbl.textContent = f.label;

      var val = document.createElement('p');
      val.style.cssText = [
        'font-family:Cormorant Garamond,serif;font-size:14px;',
        'color:rgba(220,200,160,.7);line-height:1.8;margin-bottom:14px;'
      ].join('');
      val.textContent = bio[f.key];

      body.appendChild(lbl);
      body.appendChild(val);
    });
  } else {
    var noData = document.createElement('p');
    noData.style.cssText = [
      'font-family:Cormorant Garamond,serif;font-style:italic;',
      'font-size:13px;color:rgba(201,168,76,.35);line-height:1.7;'
    ].join('');
    noData.textContent = 'Consultez le Taqrīb at-Tahdhīb d\'Ibn Ḥajar.';
    body.appendChild(noData);
  }

  p.appendChild(body);

  /* ── INJECTION & ANIMATION ── */
  document.body.appendChild(bd);
  document.body.appendChild(p);
  requestAnimationFrame(function() {
    bd.style.opacity  = '1';
    p.style.transform = 'translateX(0)';
  });
};

/* ══════════════════════════════════════════════════════════════
   ZONE 2 — INJECTION CSS CÉLESTE (unique)
   Bouclier Science : styles des 19 plaques + fil d'or
══════════════════════════════════════════════════════════════ */
window.mzInjectIsnadCSS = function() {
  if (document.getElementById('mzPipe-css')) return;
  var sc = document.createElement('style');
  sc.id = 'mzPipe-css';
  sc.textContent = [
    '@keyframes mzHaloAnim{0%,100%{box-shadow:0 0 30px rgba(212,175,55,.5),0 0 60px rgba(212,175,55,.18),0 0 100px rgba(212,175,55,.06)}50%{box-shadow:0 0 50px rgba(212,175,55,.8),0 0 100px rgba(212,175,55,.3),0 0 160px rgba(212,175,55,.1)}}',
    '@keyframes mzGlow{0%,100%{text-shadow:0 0 12px rgba(212,175,55,.4)}50%{text-shadow:0 0 28px rgba(212,175,55,.85),0 0 56px rgba(212,175,55,.3)}}',
    '@keyframes mzThreadFlow{0%{background-position:0 0}100%{background-position:0 40px}}',
    '@keyframes mzFloatIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}',
    '@keyframes mzBadgePop{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}',
    '.mzI-halo{width:90px;height:90px;border-radius:50%;background:radial-gradient(circle,rgba(212,175,55,.2),rgba(212,175,55,.04) 55%,transparent 72%);border:2px solid rgba(212,175,55,.7);display:flex;align-items:center;justify-content:center;font-size:38px;animation:mzHaloAnim 3s ease-in-out infinite;margin-bottom:4px;}',
    '.mzI-th{width:2px;background:linear-gradient(180deg,rgba(212,175,55,.6),rgba(212,175,55,.2) 50%,rgba(212,175,55,.08));background-size:100% 40px;animation:mzThreadFlow 3s linear infinite;border-radius:1px;flex-shrink:0;}',
    '.mzI-cn{display:flex;flex-direction:column;align-items:center;}',
    '.mzI-cb{font-family:Cinzel,serif;font-size:5.5px;font-weight:700;letter-spacing:.12em;color:rgba(212,175,55,.5);padding:2px 10px;border:1px solid rgba(212,175,55,.15);border-radius:12px;background:rgba(6,4,0,.92);z-index:5;animation:mzBadgePop .4s ease both;}',
    '.mzI-f{text-align:center;cursor:pointer;padding:8px 4px;animation:mzFloatIn .5s ease both;transition:transform .2s;-webkit-tap-highlight-color:transparent;}',
    '.mzI-f:hover{transform:scale(1.05);}',
    '.mzI-f:active{transform:scale(.97);}',
    '.mzI-nm{font-family:Scheherazade New,serif;font-weight:700;line-height:1.3;transition:text-shadow .3s;}',
    '.mzI-f:hover .mzI-nm{text-shadow:0 0 22px currentColor;}',
    '.mzI-tg{font-family:Cinzel,serif;font-size:6px;font-weight:700;letter-spacing:.1em;padding:2px 8px;border-radius:4px;border:1px solid;display:inline-block;margin-top:3px;}',
    '.mzI-er{font-family:Cinzel,serif;font-size:5px;letter-spacing:.15em;margin-top:2px;}'
  ].join('');
  document.head.appendChild(sc);
};

/* ══════════════════════════════════════════════════════════════
   ZONE 2 — CONSTANTES COUCHES CHRONOLOGIQUES
══════════════════════════════════════════════════════════════ */
var MZ_COUCHE_LABELS = {
  1: 'COUCHE 1 — AS-SAHĀBA',
  2: "COUCHE 2 — AT-TĀBI'ĪN & IMAMS",
  3: 'COUCHE 3 — FONDATEURS',
  4: 'COUCHE 4 — HUFFADH & PILIERS',
  5: 'COUCHE 5 — CONTEMPORAINS (15e S. HÉGIRE)'
};
var MZ_COUCHE_COLORS = {
  1: '#d4af37', 2: '#22c55e', 3: '#60a5fa', 4: '#f59e0b', 5: '#a78bfa'
};

/* ══════════════════════════════════════════════════════════════
   _mzBuildNodes — Parsing + Déduplication + Tri chrono
   Entrée  : isnadChain (string pipe-séparé)
   Sortie  : nodes[] triés par couche chronologique
══════════════════════════════════════════════════════════════ */
function _mzBuildNodes(isnadChain) {
  if (!isnadChain || typeof isnadChain !== 'string') return [];
  var rawStr = isnadChain.replace(/\\n/g, '\n');
  rawStr = rawStr.replace(/\s*[\u2014\u2013]\s*/g, ' | ').replace(/\s+-\s+/g, ' | ');
  var lines = rawStr.indexOf('\n') !== -1
    ? rawStr.split('\n')
    : rawStr.split(/(?=Maillon\s+\d)/i);
  lines = lines
    .map(function(l) { return typeof l === 'string' ? l.trim() : ''; })
    .filter(function(l) { return l.length > 2; });

  var nodes = [], seen = {};
  for (var i = 0; i < lines.length; i++) {
    try {
      var parts  = lines[i].split('|');
      var nom    = (parts[1] || '').trim();
      if (!nom || nom.length < 2) continue;
      var key = nom.toLowerCase()
        .replace(/[\u064B-\u065F\u0670]/g, '')
        .replace(/[^a-z0-9\u0600-\u06FF]/g, '');
      if (seen[key]) { console.log('[v18.4] Doublon filtré : ' + nom); continue; }
      seen[key] = true;
      var titR   = (parts[2] || '').trim();
      var verR   = (parts[3] || '').trim().replace(/_/g, ' ');
      var sieR   = (parts[4] || '').trim();
      var ep     = window.parseSiecle(sieR);
      var couche = ep ? ep.couche : 3;
      var numS   = ep ? ep.numRaw : 5;
      var combo  = (nom + ' ' + titR + ' ' + verR).toLowerCase();
      if (/albani|ibn.*baz|uthaymin|muqbil|rabi|madkhali|fawzan|contemporain|verificateur/i.test(combo)) {
        couche = 5;
        numS   = Math.max(numS, 14);
      }
      nodes.push({
        num: String(nodes.length + 1),
        nom: nom, titre: titR, verdict: verR, siecle: sieR,
        _c: couche, _n: numS
      });
    } catch(_) {}
  }

  nodes.sort(function(a, b) {
    return a._c !== b._c ? a._c - b._c : a._n - b._n;
  });
  for (var r = 0; r < nodes.length; r++) nodes[r].num = String(r + 1);
  return nodes;
}

/* ══════════════════════════════════════════════════════════════
   _mzAppendFil — Fil d'or entre deux plaques (helper)
   Bouclier Syntaxe : createElement / textContent
══════════════════════════════════════════════════════════════ */
function _mzAppendFil(parent, height, opacity, label) {
  var cn = document.createElement('div');
  cn.className = 'mzI-cn';

  var th1 = document.createElement('div');
  th1.className = 'mzI-th';
  th1.style.cssText = 'height:' + height + ';opacity:' + opacity + ';';

  var cb = document.createElement('span');
  cb.className = 'mzI-cb';
  cb.textContent = label;

  var th2 = document.createElement('div');
  th2.className = 'mzI-th';
  th2.style.cssText = 'height:6px;opacity:' + opacity + ';';

  cn.appendChild(th1);
  cn.appendChild(cb);
  cn.appendChild(th2);
  parent.appendChild(cn);
}

/* ══════════════════════════════════════════════════════════════
   _mzRenderZone2 — Construction DOM des 19 plaques
   Bouclier Syntaxe : createElement / textContent EXCLUSIVEMENT
   Bouclier Science : min-height:40px + titre doré z-index:10
══════════════════════════════════════════════════════════════ */
function _mzRenderZone2(container, nodes) {
  /* Bouclier Science — min-height:40px INEFFAÇABLE */
  container.id        = 'mz-isnad-container';
  container.className = 'mzI-r';
  container.style.cssText = [
    'display:flex;flex-direction:column;align-items:center;',
    'width:100%;min-height:40px;padding:20px 12px 24px;position:relative;'
  ].join('');

  /* Titre doré — z-index:10 — INEFFAÇABLE */
  var titrezone = document.createElement('p');
  titrezone.style.cssText = [
    'font-family:Cinzel,serif;font-size:6px;letter-spacing:.4em;',
    'color:rgba(212,175,55,.35);margin-bottom:16px;',
    'z-index:10;position:relative;'
  ].join('');
  titrezone.textContent = 'ZONE 2 — SILSILAT AL-ISNĀD — 14 SIÈCLES';
  container.appendChild(titrezone);

  /* Halo du Prophète ﷺ */
  var halo = document.createElement('div');
  halo.className = 'mzI-halo';
  halo.textContent = 'ﷺ';
  container.appendChild(halo);

  var prophetNom = document.createElement('p');
  prophetNom.style.cssText = [
    'font-family:Scheherazade New,serif;font-size:22px;font-weight:700;color:#d4af37;',
    'text-shadow:0 0 30px rgba(212,175,55,.8),0 0 60px rgba(212,175,55,.3);',
    'margin-bottom:1px;animation:mzGlow 3s ease-in-out infinite;'
  ].join('');
  prophetNom.textContent = 'النبي محمد ﷺ';
  container.appendChild(prophetNom);

  var prophetFr = document.createElement('p');
  prophetFr.style.cssText = [
    'font-family:Cinzel,serif;font-size:8px;font-weight:700;',
    'color:rgba(212,175,55,.7);letter-spacing:.12em;'
  ].join('');
  prophetFr.textContent = 'LE PROPHÈTE MOHAMED ﷺ';
  container.appendChild(prophetFr);

  var prophetSub = document.createElement('p');
  prophetSub.style.cssText = 'font-family:Cinzel,serif;font-size:5px;letter-spacing:.2em;color:rgba(212,175,55,.3);';
  prophetSub.textContent = "SOURCE INFAILLIBLE — MA'SŪUM";
  container.appendChild(prophetSub);

  /* Premier fil de transmission */
  _mzAppendFil(container, '22px', '1', 'a transmis à');

  /* ── Boucle des 19 plaques ── */
  var lastC = 0;
  nodes.forEach(function(nd, i) {
    var vis   = window.nodeVis(nd.titre, nd.verdict, i, nodes.length);
    var ep2   = window.parseSiecle(nd.siecle);
    var delay = (i * 0.08).toFixed(2) + 's';

    /* Séparateur de couche chronologique */
    if (nd._c !== lastC && MZ_COUCHE_LABELS[nd._c]) {
      var lc  = MZ_COUCHE_COLORS[nd._c] || '#d4af37';
      var sep = document.createElement('div');
      sep.style.cssText = 'width:100%;max-width:360px;display:flex;align-items:center;gap:8px;margin:14px auto 8px;';

      var lineL = document.createElement('div');
      lineL.style.cssText = 'flex:1;height:1px;background:linear-gradient(to right,transparent,' + lc + '44);';

      var badge = document.createElement('span');
      badge.style.cssText = [
        'font-family:Cinzel,serif;font-size:5.5px;font-weight:700;',
        'letter-spacing:.15em;white-space:nowrap;padding:3px 10px;',
        'border:1px solid ' + lc + '33;border-radius:5px;',
        'color:' + lc + ';background:' + lc + '08;'
      ].join('');
      badge.textContent = MZ_COUCHE_LABELS[nd._c];

      var lineR = document.createElement('div');
      lineR.style.cssText = 'flex:1;height:1px;background:linear-gradient(to left,transparent,' + lc + '44);';

      sep.appendChild(lineL);
      sep.appendChild(badge);
      sep.appendChild(lineR);
      container.appendChild(sep);
      lastC = nd._c;
    }

    /* ── Plaque cliquable — Bouclier Syntaxe absolu ── */
    var plaque = document.createElement('div');
    plaque.className = 'mzI-f';
    plaque.setAttribute('role', 'button');
    plaque.setAttribute('tabindex', '0');
    plaque.style.animationDelay = delay;

    /* Closure propre — pas d'inline onclick */
    plaque.addEventListener('click', (function(n, t, v, s, c) {
      return function() { window.mzOpenIsnadPanel(n, t, v, s, c); };
    })(nd.nom, nd.titre, nd.verdict, nd.siecle, vis.dotC));

    var nomEl2 = document.createElement('p');
    nomEl2.className = 'mzI-nm';
    nomEl2.style.cssText = [
      'font-size:' + (nd._c === 1 ? '20px' : nd._c === 5 ? '18px' : '17px') + ';',
      'color:' + vis.nameC + ';'
    ].join('');
    nomEl2.textContent = nd.nom;
    plaque.appendChild(nomEl2);

    if (nd.verdict) {
      var tag = document.createElement('span');
      tag.className = 'mzI-tg';
      tag.style.cssText = 'background:' + vis.vBg + ';color:' + vis.vC + ';border-color:' + vis.vC + '44;';
      tag.textContent = nd.verdict;
      plaque.appendChild(tag);
    }

    if (ep2) {
      var eraEl = document.createElement('p');
      eraEl.className = 'mzI-er';
      eraEl.style.color = vis.cenC;
      eraEl.textContent = ep2.num + ' siècle de l\'Hégire — ' + ep2.era;
      plaque.appendChild(eraEl);
    }

    container.appendChild(plaque);

    /* Fil de transmission entre plaques */
    if (i < nodes.length - 1) {
      var nextC = nodes[i + 1]._c;
      var cTxt  = nextC > nd._c ? 'ont transmis aux' : 'a transmis à';
      var thH   = nextC !== nd._c ? '18px' : '12px';
      _mzAppendFil(container, thH, vis.beamOp, cTxt);
    }
  });

  /* Pied de Zone 2 */
  var footer = document.createElement('p');
  footer.style.cssText = [
    'font-family:Cinzel,serif;font-size:5.5px;letter-spacing:.22em;',
    'color:rgba(212,175,55,.18);text-align:center;',
    'margin-top:18px;padding-top:12px;border-top:1px solid rgba(212,175,55,.06);'
  ].join('');
  footer.textContent = 'SILSILAT AL-ISNĀD — ' + nodes.length + ' MAILLONS — 0 DOUBLON — 14 SIÈCLES';
  container.appendChild(footer);
}

/* ══════════════════════════════════════════════════════════════
   window.mzRenderIsnadZone — API PUBLIQUE ZONE 2
   Point d'entrée unique appelé depuis l'enrichissement SSE
   Usage : window.mzRenderIsnadZone(targetElement, isnadChainString)
══════════════════════════════════════════════════════════════ */
window.mzRenderIsnadZone = function(targetEl, isnadChain) {
  window.mzInjectIsnadCSS();

  if (!targetEl) {
    console.warn('[v18.4] mzRenderIsnadZone : targetEl introuvable');
    return;
  }

  /* Vidage propre sans innerHTML */
  while (targetEl.firstChild) targetEl.removeChild(targetEl.firstChild);

  var nodes = _mzBuildNodes(isnadChain);

  /* Fallback — Bouclier Science : min-height:40px garanti */
  if (!nodes.length) {
    targetEl.id = 'mz-isnad-container';
    targetEl.style.cssText = 'min-height:40px;padding:14px 18px;text-align:center;';

    var fbLabel = document.createElement('p');
    fbLabel.style.cssText = [
      'font-family:Cinzel,serif;font-size:6.5px;letter-spacing:.25em;',
      'color:rgba(201,168,76,.35);margin-bottom:8px;z-index:10;position:relative;'
    ].join('');
    fbLabel.textContent = 'ZONE 2 — SILSILAT AL-ISNĀD';

    var fbMsg = document.createElement('p');
    fbMsg.style.cssText = [
      'font-family:Cormorant Garamond,serif;font-style:italic;',
      'font-size:13px;color:rgba(201,168,76,.35);line-height:1.7;'
    ].join('');
    fbMsg.textContent = 'Données de la chaîne non disponibles.';

    targetEl.appendChild(fbLabel);
    targetEl.appendChild(fbMsg);
    return;
  }

  _mzRenderZone2(targetEl, nodes);
};

/* ══════════════════════════════════════════════════════════════
   CONFIRMATION FINALE — Mouchard secondaire
══════════════════════════════════════════════════════════════ */
console.log('%c ✅ Mîzân v18.4 : window.goTo + nodeVis + parseSiecle + mzOpenIsnadPanel + mzRenderIsnadZone OK', 'color:#d4af37;font-weight:bold;');
