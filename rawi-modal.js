/* ═══════════════════════════════════════════════════════════════════
   MÎZÂN v22.0 — rawi-modal.js — API-DRIVEN
   MODULE : 'ILM AR-RIJAL — Tarjama via /api/rawi
   Design : Modale centrée — parchemin noir/doré — loader doré
   Usage  : window._openRawiModal('Nom du Rawi')
   Bouclier : String concat | window.* | Zéro DB locale | Zéro XSS
═══════════════════════════════════════════════════════════════════ */

console.log('%c \u2705 M\u00eezan v22.0 : API-Driven — Pr\u00eat', 'color:#00ff00;font-weight:bold;');
console.log('%c \ud83d\udcda rawi-modal.js \u2014 Modale Royale + /api/rawi', 'color:#d4af37;font-weight:bold;background:#0a0600;padding:3px 8px;');

/* ════════════════════════════════════════════════════════════════
   1. CSS — injection unique
════════════════════════════════════════════════════════════════ */
(function _mzInjectCSS() {
  var old = document.getElementById('mz-rawi-css');
  if (old) old.remove();
  var s = document.createElement('style');
  s.id = 'mz-rawi-css';
  s.textContent = [
    '@keyframes mzRwIn    {from{opacity:0;transform:translateY(28px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}',
    '@keyframes mzRwBgIn  {from{opacity:0}to{opacity:1}}',
    '@keyframes mzRwOut   {from{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(18px) scale(.96)}}',
    '@keyframes mzRwBgOut {from{opacity:1}to{opacity:0}}',
    '@keyframes mzRwBarFill{from{width:0}to{width:var(--w,0%)}}',
    '@keyframes mzRwFadeRow{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}',
    '@keyframes mzRwTagIn  {from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}',
    '@keyframes mzRwGlow   {0%,100%{text-shadow:0 0 18px rgba(212,175,55,.4)}50%{text-shadow:0 0 38px rgba(212,175,55,.85),0 0 65px rgba(212,175,55,.22)}}',
    '@keyframes mzRwSpin   {to{transform:rotate(360deg)}}',
    '@keyframes mzRwPulse  {0%,100%{opacity:.55}50%{opacity:1}}',

    /* Overlay */
    '#mz-rawi-overlay{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.84);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;animation:mzRwBgIn .3s ease;}',
    '#mz-rawi-overlay.mz-closing{animation:mzRwBgOut .22s ease forwards;}',

    /* Wrapper */
    '.mzRw-wrap{position:relative;width:100%;max-width:700px;max-height:92vh;display:flex;flex-direction:column;animation:mzRwIn .38s cubic-bezier(.16,1,.3,1);}',
    '.mzRw-wrap.mz-closing{animation:mzRwOut .22s cubic-bezier(.4,0,.2,1) forwards;}',

    /* Panneau */
    '.mzRw-panel{position:relative;background:linear-gradient(170deg,#0d0900 0%,#0a0600 40%,#0c0c12 100%);border:1px solid rgba(212,175,55,.38);border-radius:4px;overflow:hidden;display:flex;flex-direction:column;max-height:92vh;box-shadow:0 0 0 1px rgba(212,175,55,.07),0 0 60px rgba(212,175,55,.1),0 32px 100px rgba(0,0,0,.98),inset 0 1px 0 rgba(212,175,55,.1);}',
    '.mzRw-panel::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(212,175,55,.55) 20%,#d4af37 50%,rgba(212,175,55,.55) 80%,transparent);z-index:20;pointer-events:none;}',
    '.mzRw-panel::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:0;opacity:.018;background-size:80px;}',

    /* Coins */
    '.mzRw-corner{position:absolute;width:22px;height:22px;z-index:15;pointer-events:none;}',
    '.mzRw-corner svg{display:block;}',
    '.mzRw-corner-tl{top:7px;left:7px;}',
    '.mzRw-corner-tr{top:7px;right:7px;transform:scaleX(-1);}',
    '.mzRw-corner-bl{bottom:7px;left:7px;transform:scaleY(-1);}',
    '.mzRw-corner-br{bottom:7px;right:7px;transform:scale(-1);}',

    /* Fermer */
    '.mzRw-close{position:absolute;top:12px;right:14px;z-index:30;width:28px;height:28px;background:rgba(0,0,0,.55);border:1px solid rgba(212,175,55,.22);border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(212,175,55,.45);font-size:15px;line-height:1;transition:all .2s;font-family:serif;}',
    '.mzRw-close:hover{background:rgba(212,175,55,.14);border-color:rgba(212,175,55,.55);color:#d4af37;transform:scale(1.08);}',

    /* Loader */
    '.mzRw-loader{position:relative;z-index:5;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:56px 28px;gap:20px;}',
    '.mzRw-loader-ring{width:48px;height:48px;border:2px solid rgba(212,175,55,.12);border-top-color:#d4af37;border-radius:50%;animation:mzRwSpin .9s linear infinite;}',
    '.mzRw-loader-txt{font-family:Cinzel,serif;font-size:6px;letter-spacing:.38em;color:rgba(212,175,55,.38);animation:mzRwPulse 1.6s ease-in-out infinite;}',

    /* En-tête */
    '.mzRw-header{position:relative;z-index:5;flex-shrink:0;padding:28px 40px 20px;text-align:center;border-bottom:1px solid rgba(212,175,55,.12);background:linear-gradient(180deg,rgba(212,175,55,.04) 0%,transparent 100%);}',
    '.mzRw-seal{width:52px;height:52px;margin:0 auto 12px;border-radius:50%;background:radial-gradient(circle,rgba(212,175,55,.1) 0%,transparent 70%);border:1.5px solid rgba(212,175,55,.38);display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 0 18px rgba(212,175,55,.18),inset 0 0 12px rgba(212,175,55,.04);}',
    '.mzRw-eyebrow{font-family:Cinzel,serif;font-size:5.5px;letter-spacing:.48em;color:rgba(212,175,55,.32);display:block;margin-bottom:9px;}',
    '.mzRw-name-main{font-family:Cinzel,serif;font-size:22px;font-weight:900;color:#fde68a;line-height:1.25;margin-bottom:4px;animation:mzRwGlow 4s ease-in-out infinite;}',
    '.mzRw-name-ar{font-family:"Scheherazade New",serif;font-size:19px;font-weight:700;color:rgba(212,175,55,.52);display:block;margin-bottom:11px;direction:rtl;}',
    '.mzRw-divider{display:flex;align-items:center;justify-content:center;gap:10px;margin:0 auto 12px;max-width:320px;}',
    '.mzRw-divider-line{flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(212,175,55,.4),transparent);}',
    '.mzRw-divider-gem{font-size:9px;color:rgba(212,175,55,.5);flex-shrink:0;}',

    /* Pills */
    '.mzRw-meta-pills{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;}',
    '.mzRw-pill{font-family:Cinzel,serif;font-size:6px;font-weight:700;letter-spacing:.14em;padding:4px 11px;border-radius:2px;animation:mzRwTagIn .4s ease both;}',
    '.mzRw-pill-gold  {background:rgba(212,175,55,.1);border:1px solid rgba(212,175,55,.32);color:#d4af37;}',
    '.mzRw-pill-green {background:rgba(34,197,94,.07);border:1px solid rgba(34,197,94,.28);color:#4ade80;}',
    '.mzRw-pill-red   {background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.24);color:#f87171;}',
    '.mzRw-pill-blue  {background:rgba(96,165,250,.07);border:1px solid rgba(96,165,250,.22);color:#93c5fd;}',
    '.mzRw-pill-silver{background:rgba(200,200,200,.04);border:1px solid rgba(200,200,200,.14);color:rgba(200,200,200,.58);}',

    /* Corps */
    '.mzRw-body{position:relative;z-index:5;overflow-y:auto;flex:1;scrollbar-width:thin;scrollbar-color:rgba(212,175,55,.18) transparent;}',
    '.mzRw-body::-webkit-scrollbar{width:3px;}',
    '.mzRw-body::-webkit-scrollbar-thumb{background:rgba(212,175,55,.2);border-radius:2px;}',

    /* Grille */
    '.mzRw-sections-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:rgba(212,175,55,.07);}',
    '.mzRw-sections-grid .mzRw-section{background:#0a0700;}',
    '.mzRw-section-full{grid-column:1 / -1 !important;background:#0a0700;}',
    '.mzRw-section{padding:18px 22px 16px;position:relative;}',

    /* Labels section */
    '.mzRw-section-label{font-family:Cinzel,serif;font-size:5.5px;font-weight:700;letter-spacing:.42em;color:rgba(212,175,55,.3);margin-bottom:13px;display:flex;align-items:center;gap:8px;}',
    '.mzRw-section-label-ar{font-family:"Scheherazade New",serif;font-size:13px;color:rgba(212,175,55,.18);letter-spacing:0;font-weight:400;}',
    '.mzRw-section-label::after{content:"";flex:1;height:1px;background:linear-gradient(to right,rgba(212,175,55,.16),transparent);}',

    /* Verdict */
    '.mzRw-verdict-encart{display:flex;align-items:center;gap:12px;margin-bottom:13px;padding:12px 14px;border-radius:3px;}',
    '.mzRw-verdict-encart.thiqah{background:rgba(34,197,94,.04);border:1px solid rgba(34,197,94,.16);}',
    '.mzRw-verdict-encart.sadouq{background:rgba(74,222,128,.03);border:1px solid rgba(74,222,128,.18);}',
    '.mzRw-verdict-encart.daif  {background:rgba(245,158,11,.04);border:1px solid rgba(245,158,11,.22);}',
    '.mzRw-verdict-encart.munkar{background:rgba(239,68,68,.04);border:1px solid rgba(239,68,68,.22);}',
    '.mzRw-verdict-badge{font-family:Cinzel,serif;font-size:7.5px;font-weight:900;letter-spacing:.16em;padding:5px 12px;border-radius:3px;flex-shrink:0;}',
    '.mzRw-verdict-badge.thiqah{background:#22c55e;color:#000;}',
    '.mzRw-verdict-badge.sadouq{background:#4ade80;color:#000;}',
    '.mzRw-verdict-badge.daif  {background:#f59e0b;color:#000;}',
    '.mzRw-verdict-badge.munkar{background:#ef4444;color:#fff;}',
    '.mzRw-verdict-title{font-family:Cinzel,serif;font-size:9.5px;font-weight:700;letter-spacing:.06em;color:rgba(220,200,140,.9);margin-bottom:2px;}',
    '.mzRw-verdict-sub{font-family:"Cormorant Garamond",serif;font-size:12px;color:rgba(180,160,110,.6);font-style:italic;}',

    /* Barres */
    '.mzRw-bars{display:flex;flex-direction:column;gap:7px;}',
    '.mzRw-bar-row{display:flex;align-items:center;gap:10px;}',
    '.mzRw-bar-lbl{font-family:Cinzel,serif;font-size:6.5px;font-weight:700;letter-spacing:.1em;color:rgba(200,170,100,.6);width:68px;flex-shrink:0;}',
    '.mzRw-bar-track{flex:1;height:4px;background:rgba(255,255,255,.05);border-radius:2px;overflow:hidden;}',
    '.mzRw-bar-fill{height:100%;border-radius:2px;animation:mzRwBarFill .9s cubic-bezier(.4,0,.2,1) .35s both;width:var(--w,0%);}',
    '.mzRw-bar-pct{font-family:Cinzel,serif;font-size:7px;font-weight:900;width:30px;text-align:right;flex-shrink:0;}',

    /* Jugements */
    '.mzRw-judge-list{display:flex;flex-direction:column;gap:8px;}',
    '.mzRw-judge-row{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:3px;animation:mzRwFadeRow .4s ease both;}',
    '.mzRw-judge-row.thiqah{background:rgba(34,197,94,.04);border-left:2px solid rgba(34,197,94,.38);}',
    '.mzRw-judge-row.sadouq{background:rgba(74,222,128,.03);border-left:2px solid rgba(74,222,128,.3);}',
    '.mzRw-judge-row.daif  {background:rgba(245,158,11,.04);border-left:2px solid rgba(245,158,11,.32);}',
    '.mzRw-judge-row.munkar{background:rgba(239,68,68,.04);border-left:2px solid rgba(239,68,68,.38);}',
    '.mzRw-judge-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;margin-top:5px;}',
    '.mzRw-judge-row.thiqah .mzRw-judge-dot{background:#22c55e;box-shadow:0 0 6px rgba(34,197,94,.5);}',
    '.mzRw-judge-row.sadouq .mzRw-judge-dot{background:#4ade80;box-shadow:0 0 5px rgba(74,222,128,.45);}',
    '.mzRw-judge-row.daif   .mzRw-judge-dot{background:#f59e0b;box-shadow:0 0 5px rgba(245,158,11,.45);}',
    '.mzRw-judge-row.munkar .mzRw-judge-dot{background:#ef4444;box-shadow:0 0 6px rgba(239,68,68,.5);}',
    '.mzRw-judge-scholar{font-family:Cinzel,serif;font-size:7.5px;font-weight:700;letter-spacing:.08em;color:rgba(212,175,55,.78);margin-bottom:4px;}',
    '.mzRw-judge-ar{font-family:"Scheherazade New",serif;font-size:14px;color:rgba(212,175,55,.58);direction:rtl;text-align:right;line-height:1.7;display:block;margin-bottom:3px;}',
    '.mzRw-judge-fr{font-family:"Cormorant Garamond",serif;font-size:12.5px;color:rgba(200,180,130,.62);line-height:1.6;font-style:italic;}',
    '.mzRw-judge-src{font-family:Cinzel,serif;font-size:5px;letter-spacing:.12em;color:rgba(140,110,50,.38);margin-top:4px;}',

    /* Noms */
    '.mzRw-names-list{display:flex;flex-direction:column;gap:4px;}',
    '.mzRw-name-item{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(212,175,55,.04);animation:mzRwFadeRow .35s ease both;}',
    '.mzRw-name-item:last-child{border-bottom:none;}',
    '.mzRw-name-bullet{width:4px;height:4px;border-radius:50%;background:rgba(212,175,55,.4);flex-shrink:0;}',
    '.mzRw-name-text{font-family:"Cormorant Garamond",serif;font-size:13.5px;color:rgba(220,200,150,.76);flex:1;}',
    '.mzRw-name-role{font-family:Cinzel,serif;font-size:5.5px;letter-spacing:.08em;color:rgba(140,110,50,.4);flex-shrink:0;}',

    /* Rihla */
    '.mzRw-rihla-body{font-family:"Cormorant Garamond",serif;font-size:14px;color:rgba(220,200,150,.78);line-height:1.88;margin-bottom:10px;}',
    '.mzRw-rihla-quote{margin-top:14px;padding:14px 16px;background:rgba(212,175,55,.03);border:1px solid rgba(212,175,55,.11);border-radius:2px;position:relative;}',
    '.mzRw-rihla-quote::before{content:"\275D";position:absolute;top:-10px;left:12px;font-size:26px;color:rgba(212,175,55,.13);line-height:1;font-family:Georgia,serif;}',
    '.mzRw-rihla-quote-ar{font-family:"Scheherazade New",serif;font-size:16px;color:rgba(212,175,55,.62);direction:rtl;text-align:right;line-height:1.75;display:block;margin-bottom:7px;}',
    '.mzRw-rihla-quote-fr{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:13px;color:rgba(200,180,130,.55);line-height:1.6;}',
    '.mzRw-rihla-quote-src{font-family:Cinzel,serif;font-size:5px;letter-spacing:.15em;color:rgba(140,110,50,.35);margin-top:7px;display:block;}',

    /* Erreur */
    '.mzRw-error{padding:36px 28px;text-align:center;}',
    '.mzRw-error-icon{font-size:38px;opacity:.22;margin-bottom:10px;}',
    '.mzRw-error-title{font-family:Cinzel,serif;font-size:8.5px;letter-spacing:.28em;color:rgba(239,68,68,.5);margin-bottom:8px;}',
    '.mzRw-error-body{font-family:"Cormorant Garamond",serif;font-size:13.5px;color:rgba(200,180,130,.42);line-height:1.75;font-style:italic;}',
    '.mzRw-error-retry{margin-top:16px;font-family:Cinzel,serif;font-size:6px;letter-spacing:.22em;color:rgba(212,175,55,.38);cursor:pointer;border:1px solid rgba(212,175,55,.18);padding:6px 14px;border-radius:2px;background:transparent;transition:all .2s;}',
    '.mzRw-error-retry:hover{color:#d4af37;border-color:rgba(212,175,55,.45);background:rgba(212,175,55,.06);}',

    /* Non trouvé */
    '.mzRw-not-found{padding:36px 28px;text-align:center;}',
    '.mzRw-nf-icon{font-size:38px;opacity:.2;margin-bottom:10px;}',
    '.mzRw-nf-title{font-family:Cinzel,serif;font-size:8.5px;letter-spacing:.28em;color:rgba(212,175,55,.4);margin-bottom:8px;}',
    '.mzRw-nf-body{font-family:"Cormorant Garamond",serif;font-size:13.5px;color:rgba(200,180,130,.42);line-height:1.75;font-style:italic;}',

    /* Pied */
    '.mzRw-footer{position:relative;z-index:5;flex-shrink:0;padding:9px 22px;border-top:1px solid rgba(212,175,55,.09);background:rgba(0,0,0,.38);display:flex;align-items:center;justify-content:space-between;}',
    '.mzRw-footer-left{font-family:Cinzel,serif;font-size:5px;letter-spacing:.28em;color:rgba(212,175,55,.18);}',
    '.mzRw-footer-right{font-family:"Scheherazade New",serif;font-size:15px;color:rgba(212,175,55,.14);}',

    /* Responsive */
    '@media(max-width:600px){.mzRw-wrap{max-width:100%;}.mzRw-sections-grid{grid-template-columns:1fr;}.mzRw-header{padding:22px 18px 16px;}.mzRw-section{padding:14px 16px 12px;}.mzRw-name-main{font-size:18px;}}',
  ].join('\n');
  document.head.appendChild(s);
})();

/* ════════════════════════════════════════════════════════════════
   2. HELPERS — XSS-safe text escaping
════════════════════════════════════════════════════════════════ */
function _mzEsc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _mzCornerSVG() {
  return '<svg width="22" height="22" viewBox="0 0 22 22" fill="none">'
    + '<path d="M2 20 L2 2 L20 2" stroke="rgba(212,175,55,.55)" stroke-width="1.5" fill="none"/>'
    + '<circle cx="2" cy="2" r="2" fill="rgba(212,175,55,.38)"/>'
    + '</svg>';
}

function _mzVerdictClass(statut) {
  var s = (statut || '').toLowerCase();
  if (/thiqah|imam|adil|thabt|hafidh/.test(s)) return 'thiqah';
  if (/sadouq|saduq|siddiq|la.ba/.test(s)) return 'sadouq';
  if (/da.?if|layyin|munkar/.test(s)) return 'daif';
  if (/mawdu|kadhdhab|kathir/.test(s)) return 'munkar';
  return 'thiqah';
}

function _mzPillCls(label) {
  var l = (label || '').toLowerCase();
  if (/thiqah|imam|adil|hafidh|thabt/.test(l)) return 'mzRw-pill-green';
  if (/da.?if|munkar|mawdu/.test(l)) return 'mzRw-pill-red';
  if (/sadouq|saduq/.test(l)) return 'mzRw-pill-gold';
  if (/\d{2,4}h/.test(l)) return 'mzRw-pill-blue';
  return 'mzRw-pill-silver';
}

/* ════════════════════════════════════════════════════════════════
   3. BUILD HTML — skeleton + loader
════════════════════════════════════════════════════════════════ */
function _mzSkeletonHTML(rawName) {
  var h = '';
  h += '<div class="mzRw-wrap"><div class="mzRw-panel">';
  h += '<div class="mzRw-corner mzRw-corner-tl">' + _mzCornerSVG() + '</div>';
  h += '<div class="mzRw-corner mzRw-corner-tr">' + _mzCornerSVG() + '</div>';
  h += '<div class="mzRw-corner mzRw-corner-bl">' + _mzCornerSVG() + '</div>';
  h += '<div class="mzRw-corner mzRw-corner-br">' + _mzCornerSVG() + '</div>';
  h += '<button class="mzRw-close" id="mzRw-close-btn" aria-label="Fermer">&times;</button>';
  /* En-tête minimal pendant le chargement */
  h += '<div class="mzRw-header">';
  h += '<div class="mzRw-seal">\ufdfa</div>';
  h += '<span class="mzRw-eyebrow">\'ILM AR-RIJ\u0100L \u2014 AT-TARJAMA</span>';
  h += '<div class="mzRw-name-main">' + _mzEsc(rawName) + '</div>';
  h += '<div class="mzRw-divider"><span class="mzRw-divider-line"></span><span class="mzRw-divider-gem">\u2666</span><span class="mzRw-divider-line"></span></div>';
  h += '</div>';
  /* Zone de contenu dynamique */
  h += '<div class="mzRw-body" id="mzRw-content-zone">';
  h += '<div class="mzRw-loader"><div class="mzRw-loader-ring"></div><div class="mzRw-loader-txt">RECHERCHE EN COURS</div></div>';
  h += '</div>';
  h += '<div class="mzRw-footer"><span class="mzRw-footer-left">SILSILAT AL-ISN\u0100D \u2014 M\u00ceZ\u00c2N v22.0 \u2014 \'ILM AR-RIJ\u0100L</span><span class="mzRw-footer-right">\u2696\ufe0f</span></div>';
  h += '</div></div>';
  return h;
}

/* ════════════════════════════════════════════════════════════════
   4. BUILD HTML — contenu complet depuis données API
════════════════════════════════════════════════════════════════ */
function _mzBuildContent(data) {
  var h = '';
  var vClass = _mzVerdictClass(data.statut || '');

  h += '<div class="mzRw-sections-grid">';

  /* ── VERDICT + BARRES ── */
  h += '<div class="mzRw-section mzRw-section-full" style="border-bottom:1px solid rgba(212,175,55,.08);">';
  h += '<div class="mzRw-section-label">VERDICT <span class="mzRw-section-label-ar">\u0627\u0644\u062d\u064f\u0643\u0645</span></div>';

  if (data.verdict_titre) {
    h += '<div class="mzRw-verdict-encart ' + vClass + '">';
    h += '<span class="mzRw-verdict-badge ' + vClass + '">' + _mzEsc((data.statut || 'THIQAH').toUpperCase()) + '</span>';
    h += '<div><div class="mzRw-verdict-title">' + _mzEsc(data.verdict_titre) + '</div>';
    if (data.verdict_sous) h += '<div class="mzRw-verdict-sub">' + _mzEsc(data.verdict_sous) + '</div>';
    h += '</div></div>';
  }

  if (data.barres && data.barres.length) {
    h += '<div class="mzRw-bars">';
    data.barres.forEach(function (b) {
      var col = b.color || (b.pct >= 80 ? '#22c55e' : b.pct >= 50 ? '#f59e0b' : '#ef4444');
      h += '<div class="mzRw-bar-row">';
      h += '<span class="mzRw-bar-lbl">' + _mzEsc(b.label) + '</span>';
      h += '<div class="mzRw-bar-track"><div class="mzRw-bar-fill" style="background:' + col + ';--w:' + (+b.pct || 0) + '%;"></div></div>';
      h += '<span class="mzRw-bar-pct" style="color:' + col + ';">' + (+b.pct || 0) + '%</span>';
      h += '</div>';
    });
    h += '</div>';
  }
  h += '</div>';

  /* ── AL-JARH WA AT-TA'DIL ── */
  if (data.jugements && data.jugements.length) {
    h += '<div class="mzRw-section mzRw-section-full" style="border-bottom:1px solid rgba(212,175,55,.08);">';
    h += '<div class="mzRw-section-label">AL-JAR\u1e24 WA AT-TA\u02bfD\u012aL <span class="mzRw-section-label-ar">\u0623\u0642\u0648\u0627\u0644 \u0627\u0644\u0623\u0626\u0645\u0651\u0629</span></div>';
    h += '<div class="mzRw-judge-list">';
    data.jugements.forEach(function (j, i) {
      var jc = _mzVerdictClass(j.classe || j.verdict || '');
      h += '<div class="mzRw-judge-row ' + jc + '" style="animation-delay:' + (i * 0.1) + 's;">';
      h += '<div class="mzRw-judge-dot"></div>';
      h += '<div><div class="mzRw-judge-scholar">' + _mzEsc(j.scholar) + '</div>';
      if (j.ar) h += '<span class="mzRw-judge-ar">' + _mzEsc(j.ar) + '</span>';
      if (j.fr) h += '<div class="mzRw-judge-fr">\u00ab ' + _mzEsc(j.fr) + ' \u00bb</div>';
      if (j.src) h += '<div class="mzRw-judge-src">\ud83d\udcda ' + _mzEsc(j.src) + '</div>';
      h += '</div></div>';
    });
    h += '</div></div>';
  }

  /* ── MASHAYIKH + TALAMIDH ── */
  if (data.mashayikh && data.mashayikh.length) {
    h += '<div class="mzRw-section">';
    h += '<div class="mzRw-section-label">MASH\u0100YIKH <span class="mzRw-section-label-ar">\u0634\u064f\u064a\u0648\u062e\u0647</span></div>';
    h += '<div class="mzRw-names-list">';
    data.mashayikh.forEach(function (n, i) {
      var nom = (typeof n === 'object') ? n.nom : n;
      var role = (typeof n === 'object') ? n.role : '';
      h += '<div class="mzRw-name-item" style="animation-delay:' + (i * 0.05) + 's;">';
      h += '<span class="mzRw-name-bullet"></span>';
      h += '<span class="mzRw-name-text">' + _mzEsc(nom) + '</span>';
      if (role) h += '<span class="mzRw-name-role">' + _mzEsc(role) + '</span>';
      h += '</div>';
    });
    h += '</div></div>';
  }

  if (data.talamidh && data.talamidh.length) {
    h += '<div class="mzRw-section">';
    h += '<div class="mzRw-section-label">TAL\u0100MIDH <span class="mzRw-section-label-ar">\u062a\u0644\u0627\u0645\u064a\u0630\u0647</span></div>';
    h += '<div class="mzRw-names-list">';
    data.talamidh.forEach(function (n, i) {
      var nom = (typeof n === 'object') ? n.nom : n;
      var role = (typeof n === 'object') ? n.role : '';
      h += '<div class="mzRw-name-item" style="animation-delay:' + (i * 0.05) + 's;">';
      h += '<span class="mzRw-name-bullet" style="background:rgba(93,173,226,.45);"></span>';
      h += '<span class="mzRw-name-text" style="color:rgba(147,197,253,.72);">' + _mzEsc(nom) + '</span>';
      if (role) h += '<span class="mzRw-name-role">' + _mzEsc(role) + '</span>';
      h += '</div>';
    });
    h += '</div></div>';
  }

  /* ── AR-RIHLA ── */
  if (data.rihla) {
    h += '<div class="mzRw-section mzRw-section-full">';
    h += '<div class="mzRw-section-label">AR-RI\u1e24LAH <span class="mzRw-section-label-ar">\u0633\u064a\u0631\u062a\u0647 \u0648\u062d\u064a\u0627\u062a\u0647</span></div>';
    var paras = data.rihla.split('\n\n');
    paras.forEach(function (p) {
      if (p.trim()) h += '<p class="mzRw-rihla-body">' + _mzEsc(p.trim()) + '</p>';
    });
    if (data.rihla_quote_ar || data.rihla_quote_fr) {
      h += '<div class="mzRw-rihla-quote">';
      if (data.rihla_quote_ar) h += '<span class="mzRw-rihla-quote-ar">' + _mzEsc(data.rihla_quote_ar) + '</span>';
      if (data.rihla_quote_fr) h += '<span class="mzRw-rihla-quote-fr">\u00ab ' + _mzEsc(data.rihla_quote_fr) + ' \u00bb</span>';
      if (data.rihla_quote_src) h += '<span class="mzRw-rihla-quote-src">\ud83d\udcda ' + _mzEsc(data.rihla_quote_src) + '</span>';
      h += '</div>';
    }
    h += '</div>';
  }

  h += '</div>'; /* /sections-grid */
  return h;
}

/* ════════════════════════════════════════════════════════════════
   5. MISE À JOUR EN-TÊTE après réception API
════════════════════════════════════════════════════════════════ */
function _mzUpdateHeader(overlay, data) {
  var header = overlay.querySelector('.mzRw-header');
  if (!header) return;
  var pills = '';
  (data.pills || []).forEach(function (p, i) {
    var cls = p.cls || _mzPillCls(p.label || '');
    pills += '<span class="mzRw-pill ' + cls + '" style="animation-delay:' + (i * 0.08) + 's;">' + _mzEsc(p.label) + '</span>';
  });
  /* Rebuild header content */
  var h = '';
  h += '<div class="mzRw-seal">\ufdfa</div>';
  h += '<span class="mzRw-eyebrow">\'ILM AR-RIJ\u0100L \u2014 AT-TARJAMA \u2014 ' + _mzEsc(data.tabaqa || '') + '</span>';
  h += '<div class="mzRw-name-main">' + _mzEsc(data.nom_fr || '') + '</div>';
  if (data.nom_ar) h += '<span class="mzRw-name-ar">' + _mzEsc(data.nom_ar) + '</span>';
  h += '<div class="mzRw-divider"><span class="mzRw-divider-line"></span><span class="mzRw-divider-gem">\u2666</span><span class="mzRw-divider-line"></span></div>';
  if (pills) h += '<div class="mzRw-meta-pills">' + pills + '</div>';
  header.innerHTML = h;
}

/* ════════════════════════════════════════════════════════════════
   6. FETCH VERS /api/rawi
════════════════════════════════════════════════════════════════ */
function _mzFetchRawi(name, overlay) {
  var zone = document.getElementById('mzRw-content-zone');
  if (!zone) return;

  fetch('/api/rawi?name=' + encodeURIComponent(name), {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    credentials: 'same-origin'
  })
  .then(function (res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  })
  .then(function (data) {
    /* Vérifier que la modale est encore ouverte */
    if (!document.getElementById('mz-rawi-overlay')) return;

    if (!data || data.found === false) {
      /* Rawi non trouvé dans la base */
      var nf = '';
      nf += '<div class="mzRw-not-found">';
      nf += '<div class="mzRw-nf-icon">\u2696</div>';
      nf += '<div class="mzRw-nf-title">NON DOCUMENT\u00c9</div>';
      nf += '<div class="mzRw-nf-body">La biographie de <strong style="color:rgba(212,175,55,.7);">' + _mzEsc(name) + '</strong> ne figure pas encore dans la base de M\u00eezan.</div>';
      nf += '</div>';
      zone.innerHTML = nf;
      return;
    }

    /* Mettre à jour l'en-tête avec les vraies données */
    _mzUpdateHeader(overlay, data);
    /* Injecter le contenu */
    zone.innerHTML = _mzBuildContent(data);
  })
  .catch(function (err) {
    console.error('[Mîzân] /api/rawi error:', err);
    if (!document.getElementById('mz-rawi-overlay')) return;
    var errH = '';
    errH += '<div class="mzRw-error">';
    errH += '<div class="mzRw-error-icon">\u26a0\ufe0f</div>';
    errH += '<div class="mzRw-error-title">ERREUR DE CONNEXION</div>';
    errH += '<div class="mzRw-error-body">Impossible de joindre <code>/api/rawi</code>.<br>' + _mzEsc(err.message || '') + '</div>';
    errH += '<button class="mzRw-error-retry" id="mzRw-retry-btn">RÉESSAYER</button>';
    errH += '</div>';
    zone.innerHTML = errH;
    var retryBtn = document.getElementById('mzRw-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', function () {
        zone.innerHTML = '<div class="mzRw-loader"><div class="mzRw-loader-ring"></div><div class="mzRw-loader-txt">RECHERCHE EN COURS</div></div>';
        _mzFetchRawi(name, overlay);
      });
    }
  });
}

/* ════════════════════════════════════════════════════════════════
   7. OUVERTURE / FERMETURE
════════════════════════════════════════════════════════════════ */
window._openRawiModal = function (rawiName) {
  /* Fermer une éventuelle modale existante sans animation */
  var existing = document.getElementById('mz-rawi-overlay');
  if (existing) existing.remove();

  var name = (rawiName || '').trim() || 'Rapporteur inconnu';

  /* Créer l'overlay avec le skeleton + loader */
  var overlay = document.createElement('div');
  overlay.id = 'mz-rawi-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', name);
  overlay.innerHTML = _mzSkeletonHTML(name);

  /* Fermeture au clic sur l'overlay */
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) window._closeRawiModal();
  });

  /* Fermeture Echap */
  overlay._mzEscHandler = function (e) {
    if (e.key === 'Escape') window._closeRawiModal();
  };
  document.addEventListener('keydown', overlay._mzEscHandler);

  /* Bouton × */
  document.body.appendChild(overlay);

  var closeBtn = document.getElementById('mzRw-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', function () { window._closeRawiModal(); });
  }

  /* Focus piégé */
  var wrap = overlay.querySelector('.mzRw-wrap');
  if (wrap) { wrap.setAttribute('tabindex', '-1'); wrap.focus(); }

  /* Lancer le fetch */
  _mzFetchRawi(name, overlay);
};

window._closeRawiModal = function () {
  var overlay = document.getElementById('mz-rawi-overlay');
  if (!overlay) return;
  var wrap = overlay.querySelector('.mzRw-wrap');
  if (wrap) wrap.classList.add('mz-closing');
  overlay.classList.add('mz-closing');
  if (overlay._mzEscHandler) document.removeEventListener('keydown', overlay._mzEscHandler);
  setTimeout(function () {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }, 230);
};

/* ════════════════════════════════════════════════════════════════
   8. PATCH NON-INVASIF window.mzOpenIsnadPanel
════════════════════════════════════════════════════════════════ */
(function _mzPatchIsnadPanel() {
  var _legacy = window.mzOpenIsnadPanel;
  window.mzOpenIsnadPanel = function (nom, role, verdict, dates, couleur) {
    if (nom && nom.length > 1) {
      window._openRawiModal(nom);
    } else if (typeof _legacy === 'function') {
      _legacy(nom, role, verdict, dates, couleur);
    }
  };
  window._mzLegacyIsnadPanel = _legacy;
})();

/* ════════════════════════════════════════════════════════════════
   MOUCHARD FINAL
════════════════════════════════════════════════════════════════ */
console.log('%c \u2705 M\u00eezan v22.0 : API-Driven — Pr\u00eat pour Production', 'color:#00ff00;font-weight:bold;');
console.log('%c \ud83d\udee1\ufe0f window._openRawiModal(name) \u2192 fetch /api/rawi?name=...', 'color:#93c5fd;');
console.log('%c \u2696\ufe0f  window._closeRawiModal() | window.mzOpenIsnadPanel() patch\u00e9', 'color:#d4af37;');
