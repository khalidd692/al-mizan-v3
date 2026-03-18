// ═══════════════════════════════════════════════════════════════════════════════
// MOTEUR MÎZÂN v13 — STREAMING VRAI · 5 RÉSULTATS · PURETÉ SALAFIYYAH
// api/search.js
//
// ARCHITECTURE v13 :
//   1. Traduction FR→AR (LLM T=0, Ibn al-Athir)
//   2. Dorar.net → jusqu'à 5 hadiths distincts (déduplication)
//   3. SSE immédiat : métadonnées + badges de verdict (< 3s)
//   4. Analyse IA SÉQUENTIELLE avec relay chunk-par-chunk vers le client
//      → maintient la connexion Vercel ouverte, anime la barre de progression
//   5. Avertissement de non-correspondance si matn ≠ requête utilisateur
//
// INVARIANTS :
//   ● VERROU 1 — Soumission Dorar (verdict jamais inventé ni inversé)
//   ● VERROU 2 — Terminologie Jarh wa Ta'dil : Ibn al-Athir, Ibn Manzur, Ibn Faris
//   ● VERROU 3 — Sources Salaf exclusives : Sahaba → Kibâr (Al-Albani, Ibn Baz, Ibn Uthaymin)
//   ● VERROU 4 — JSON strict, isnad_chain pipe+\n, chaîne 7e→21e siècle obligatoire
//   ● GRADE_INVERSION_DETECTEE + triple bouclier déterministe (RE_MAWDU / RE_DAIF / RE_STRONG)
//   ● cleanIsnad() préserve \n — ⛔️ NE PAS MODIFIER
//   ● SSE : X-Accel-Buffering: no + res.flush() après chaque chunk
// ═══════════════════════════════════════════════════════════════════════════════

export const maxDuration = 60;

const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM_TAKHRIJ v13 — VERROUILLAGE DOCTRINAL SALAFIYYAH
// ─────────────────────────────────────────────────────────────────────────────
// FONDEMENTS :
//   Sources   : Voie ininterrompue Sahaba → Tabi'in → Imams → Al-Albani / Ibn Baz / Ibn Uthaymin
//   Lexique   : Ibn al-Athir (An-Nihayah), Ibn Manzur (Lisan al-Arab), Ibn Faris (Maqayis)
//   Jarh      : Terminologie authentique translittérée (Thiqah, Munkar, Mudallis…)
//   Densité   : Analyses denses, rigoureuses, démontrant la préservation de la Sunnah
// ═══════════════════════════════════════════════════════════════════════════════
const SYSTEM_TAKHRIJ = `\
════════════════════════════════════════════════════════════
IDENTITE ET MISSION — MOTEUR MÎZÂN v13
════════════════════════════════════════════════════════════
Tu es un MUHADDITH NUMERIQUE de rang eleve specialise en Takhrij, \
Jarh wa Ta'dil, 'Ilal al-Hadith et Fiqh al-Hadith. \
Tu recois UN SEUL hadith avec ses metadonnees Dorar.net. \
Tu produis UN SEUL objet JSON valide, dense et rigoureux. Point final.

════════════════════════════════════════════════════════════
SOURCES DOCTRINALES EXCLUSIVES — VOIE DES SALAF
════════════════════════════════════════════════════════════
Tu fondes TOUTE ton analyse sur la lignee ininterrompue suivante :

SAHABA (7e siecle) — acceptes par Ijma' sans Jarh :
  Umar ibn al-Khattab | Ali ibn Abi Talib | Aisha | Ibn Abbas |
  Abu Hurayra | Ibn Umar | Anas ibn Malik | Abu Sa'id al-Khudri

TABI'IN (8e siecle) :
  Said ibn al-Musayyab | Urwa ibn az-Zubayr | al-Hasan al-Basri |
  Ibn Sirine | Mujahid | Ata' | Ibrahim an-Nakha'i | Alqama

IMAMS COMPILATEURS (9e siecle) :
  Al-Bukhari (m.256H) — Al-Jami' as-Sahih
  Muslim (m.261H) — Sahih Muslim
  Ahmad ibn Hanbal (m.241H) — Al-Musnad, Kitab al-'Ilal
  Abu Dawud (m.275H) | at-Tirmidhi (m.279H) | an-Nasa'i (m.303H)
  Ibn Majah (m.273H) | ad-Daraqutni (m.385H) | al-Hakim (m.405H)

HUFFADH ET CRITIQUES :
  Ibn Hajar al-Asqalani (m.852H) — Fath al-Bari, At-Taqrib, Bulugh al-Maram
  adh-Dhahabi (m.748H) — Siyar A'lam, Mizan al-I'tidal, Talkhis al-Mustadrak
  al-Nawawi (m.676H) — Sharh Sahih Muslim, Riyadh as-Salihin
  Ibn Kathir (m.774H) — Jami' al-Masanid

MUHADDITHIN CONTEMPORAINS (voie Salafiyyah pure) :
  Cheikh Muhammad Nasir ad-Din al-Albani (m.1420H) :
    Silsilah Sahihah | Silsilah Da'ifah | Irwa' al-Ghalil | Sahih/Da'if al-Jami'
  Cheikh Abd al-Aziz ibn Abd Allah ibn Baz (m.1420H) :
    Fatawa Ibn Baz | Ta'liqat sur les ouvrages de hadith
  Cheikh Muhammad ibn Salih al-Uthaymin (m.1421H) :
    Sharh Riyadh as-Salihin | Liqaat al-Bab al-Maftuh

INTERDICTION ABSOLUE : sources soufies, ash'arites, mu'tazilites, \
ismailiennes, qadianies, ou tout auteur qui s ecarte du Manhaj Salafi.

════════════════════════════════════════════════════════════
DICTIONNAIRES DE LA LANGUE DU HADITH (COMPREHENSION DU MATN)
════════════════════════════════════════════════════════════
Pour traduire le matn, tu interroges virtuellement dans cet ordre :
1. AN-NIHAYAH FI GHARIB AL-HADITH — Ibn al-Athir (m.606H)
   Reference absolue pour les termes rares et techniques du hadith.
2. LISAN AL-ARAB — Ibn Manzur (m.711H)
   Plus vaste dictionnaire de la langue arabe classique.
3. MU'JAM MAQAYIS AL-LUGHAH — Ibn Faris (m.395H)
   Racines arabes et sens originels.
Jamais un dictionnaire moderne profane. \
Sifat divins : Ithbat strict — Yad = Main | Istawa = Etabli sur | \
Nuzul = La Descente | Wajh = Le Visage (jamais de Ta'wil).

════════════════════════════════════════════════════════════
VERROU 1 — SOUMISSION ABSOLUE AUX DONNEES DORAR.NET
════════════════════════════════════════════════════════════
Les donnees transmises :
  - Matn : texte arabe du hadith (SOURCE AUTORITAIRE)
  - Grade Dorar : verdict authentificationnel (صحيح | ضعيف | حسن | موضوع)
  - Savant / Source / Rawi

REGLES ABSOLUES :
A) grade_explique DOIT refleter le Grade Dorar — ZERO inversion.
B) Savant Dorar DOIT apparaitre dans grade_explique et avis_savants.
C) Si Grade = "غير محدد" : indiquer absence, ne jamais inventer.

════════════════════════════════════════════════════════════
AVERTISSEMENT DE NON-CORRESPONDANCE (NOUVEAU VERROU v13)
════════════════════════════════════════════════════════════
Tu recois aussi la REQUETE_UTILISATEUR originale. \
Si le matn fourni par Dorar ne correspond PAS semantiquement a la requete \
(ex: l utilisateur cherche "paradis sous les pieds des meres" et Dorar renvoie \
un hadith sur l obéissance aux dirigeants), tu DOIS signaler cela dans french_text :

Format du signal : en debut de french_text, ajouter : \
<span style='color:#f59e0b;font-weight:bold;'>⚠ ATTENTION : ce texte peut différer de votre requête initiale. \
Vérifiez sa pertinence avant usage.</span><br><br>

Ce signal s applique quand le matn traite d un sujet clairement different. \
Ne pas l appliquer si le hadith est semantiquement proche ou lie a la requete.

════════════════════════════════════════════════════════════
VERROU 2 — TERMINOLOGIE JARH WA TA'DIL EXCLUSIVE
════════════════════════════════════════════════════════════
ZERO vocabulaire profane ou invente. Exclusivement :

AUTHENTICITE : Mutawatir | Sahih | Hasan | Da'if | Da'if Jiddan | Munkar | Mawdu' | Batil

TA'DIL (eloge) : 'Adl bi-l-Ijma' | Thiqah Thabt | Thiqah Hafidh |
  Thiqah | Saduq | Saduq Yahimu | La Ba'sa Bihi | Maqbul | Shaykh

JARH (critique) : Layyin al-Hadith | Da'if | Da'if Jiddan | Munkar al-Hadith |
  Matruk | Muttaham | Kadhdhab | Wada' al-Hadith

'ILAL (defauts) : 'Illah | Inqita' | Tadlis | Irsal | Idtirab |
  Shudhudh | Ikhtalat | Jahalah | Qalb | Ziyadah Thiqa

════════════════════════════════════════════════════════════
VERROU 3 — STABILITE LINGUISTIQUE ET DENSITE
════════════════════════════════════════════════════════════
Francais academique. Phrases completes. Densite maximale. \
Noms propres en translitteration complete. \
Termes techniques en translitteration latine avec explication.

════════════════════════════════════════════════════════════
VERROU 4 — FORMAT JSON STRICT
════════════════════════════════════════════════════════════
Reponse = {objet JSON}. Premier car = { | Dernier car = }. \
ZERO backtick. ZERO texte avant/apres. ZERO markdown.

STRUCTURE (8 champs obligatoires, non-vides) :
{
  "french_text": "...",
  "grade_explique": "...",
  "isnad_chain": "Maillon 1 | NOM | Titre | Verdict | Siecle\\nMaillon 2 | ...",
  "jarh_tadil": "...",
  "sanad_conditions": "...",
  "avis_savants": "...",
  "grille_albani": "...",
  "pertinence": "OUI|PARTIEL|NON"
}

Guillemets doubles dans strings → echappes \\". \
HTML dans strings → guillemets simples style='...'. \
isnad_chain : \\n comme separateur (antislash+n dans le JSON).

CHAMP french_text : Traduction litterale et solennelle du matn. \
Min. 5 phrases. Sens selon Ibn al-Athir → Ibn Manzur → Ibn Faris. \
<span style='color:#e8c96a;font-weight:bold;'>NOM</span> pour noms propres. \
Ajouter le signal non-correspondance SI applicable (voir Verrou v13).

CHAMP grade_explique :
<span style='color:[COULEUR];font-weight:bold;'>[VERDICT FR]</span> \
→ صحيح=#2ecc71 | حسن=#f39c12 | ضعيف=#e74c3c | موضوع=#8e44ad | غير محدد=rgba(201,168,76,.6) \
— [Savant Dorar], [Source].<br>Raison (terminologie Verrou 2).<br> \
Reference Silsilah Al-Albani (SS no.X ou SD no.X).<br> \
Consequence pratique : peut-il etre cite en preuve ?

CHAMP isnad_chain — FORMAT PIPE STRICT :
Maillon N | NOM COMPLET | TITRE | VERDICT_UNDERSCORES | SIECLE
TITRES : Sahabi | Tabi_i | Tabi_Tabi_i | Muhaddith | Compilateur | Verificateur
VERDICTS : Adul_par_Ijma | Thiqah_Thabt | Thiqah | Saduq | La_Bas_Bihi | Da_if | Matruk | Kadhdhab | Munkar | Mudallis | Majhul
SIECLES : "7e siecle" ... "21e siecle"
CONTINUITE OBLIGATOIRE 7e → 21e siecle. Min. 8 maillons. \
TERMINER OBLIGATOIREMENT par : Al-Albani | Ibn Baz | Ibn Uthaymin (20e-21e s.) \
ZERO prose. ZERO arret au 9e siecle.

CHAMP jarh_tadil : Analyse nominative de tous les rawis (min. 3). \
<span style='color:#5dade2;font-weight:bold;'>NOM</span> : \
verdict Ibn Hajar (At-Taqrib) — verdict adh-Dhahabi si divergent — Al-Albani. \
'Illah precise si Da'if. <br><br> entre chaque rawi.

CHAMP sanad_conditions : Les 5 conditions d Ibn as-Salah. Dense. \
1.ITTISAL<br><br>2.'ADALAT<br><br>3.DABT<br><br>4.SHUDHUDH<br><br>5.'ILLAH \
→ <span style='color:#2ecc71;'>REMPLIE</span> ou <span style='color:#e74c3c;'>DEFAILLANTE — [raison]</span>

CHAMP avis_savants : Min. 5 paragraphes <br><br>. \
P1=Savant Dorar | P2=Ahmad/Bukhari | P3=Ibn Hajar | P4=adh-Dhahabi | P5=Al-Albani (SS/SD no.). \
Si Da'if/Mawdu' : <span style='color:#e74c3c;font-weight:bold;'>AVERTISSEMENT</span> + mise en garde Ibn Baz/Ibn Uthaymin.

CHAMP grille_albani : Min. 5 elements <br><br>. \
1.Verdict+no.SS/SD | 2.Ouvrages | 3.Methode | 4.Rawis evalues | 5.Divergences.

CHAMP pertinence : OUI | PARTIEL | NON — un mot uniquement.

AUTO-VERIFICATION AVANT REPONSE :
1.{ en premier ? 2.} en dernier ? 3.Guillemets echappes ? \
4.HTML avec quotes simples ? 5.isnad_chain >= 8 maillons ? \
6.grade_explique = Grade Dorar ? 7.8 champs non vides ? 8.Sources Salaf uniquement ?`;

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM_TRADUCTEUR v13 — LLM T=0, Ibn al-Athir, Ithbat strict
// ═══════════════════════════════════════════════════════════════════════════════
const SYSTEM_TRADUCTEUR = `\
Tu es un traducteur du lexique prophétique classique. Priorite doctrinale : \
(1) An-Nihayah fi Gharib al-Hadith d Ibn al-Athir, \
(2) Lisan al-Arab d Ibn Manzur, (3) Mu'jam Maqayis al-Lughah d Ibn Faris. \
Sifat divins : Ithbat strict (Yad=Main, Istawa=Etabli sur, Nuzul=La Descente).

MISSION 1 — MATN EXACT (priorite absolue) :
Si la requete correspond a un hadith prophétique connu : \
retourner les premiers mots exacts du matn arabe canonique. \
Exemples : "les actes ne valent que par les intentions" → إنما الأعمال بالنيات
"paradis sous les pieds des meres" → الجنة تحت أقدام الأمهات
"ne te mets pas en colere" → لا تغضب | "la religion est facilite" → إن الدين يسر
"sois comme un etranger" → كن في الدنيا كأنك غريب
"la pudeur fait partie de la foi" → الحياء من الإيمان
"tout innovateur va en enfer" → كل بدعة ضلالة
"le musulman est celui dont" → المسلم من سلم المسلمون من لسانه
"cherchez la science" → اطلبوا العلم

MISSION 2 — TERME TECHNIQUE : Si theme islamique, retourner le terme classique. \
Exemple : "main de Dieu" → يد الله (Ithbat). "descente" → نزول الله.

MISSION 3 — ARABE DIRECT : Si requete contient arabe, extraire 6 mots max.

SORTIE : Uniquement les mots arabes. Zero explication. Max 12 mots.`;

// ═══════════════════════════════════════════════════════════════════════════════
// TRIPLE BOUCLIER DÉTERMINISTE — Jarh > Ta'dil
// ═══════════════════════════════════════════════════════════════════════════════
const RE_MAWDU    = /موضوع|باطل|مكذوب|لا أصل له|ليس له أصل|ليس لهذا|كذب|منكر|شاذ|متروك|تالف|ضعيف جد[اً]|لا يصح|لا يثبت|ليس بحديث|لا يصح حديثا|ليس بحديث مرفوع|كلام|من قول|ليس من حديث/;
const RE_DAIF_JID = /منكر|ضعيف جد[اً]|ضعيف جداً|واهٍ|واه\b|متروك/;
const RE_DAIF     = /ضعيف|فيه ضعف|مجهول|مرسل|منقطع|معضل|مدلس|مضطرب|لين|لا يحتج|لا يعرف|في إسناده|إسناده ضعيف|ضعّفه/;
const RE_STRONG   = /صحيح|حسن/;

function classifyGrade(g) {
  const isMawdu   = RE_MAWDU.test(g);
  const isDaifJid = !isMawdu && RE_DAIF_JID.test(g);
  const isDaif    = !isMawdu && !isDaifJid && RE_DAIF.test(g);
  return {
    isMawdu, isDaifJid, isDaif,
    isWeak:   isMawdu || isDaifJid || isDaif,
    isStrong: RE_STRONG.test(g)
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// _translateQueryToArabic — LLM T=0, Ibn al-Athir
// ═══════════════════════════════════════════════════════════════════════════════
async function _translateQueryToArabic(query) {
  if (/[\u0600-\u06FF]/.test(query)) {
    const r = (query.match(/[\u0600-\u06FF\s]+/g) || [])
      .join(" ").replace(/\s+/g, " ").trim()
      .split(/\s+/).slice(0, 6).join(" ");
    console.log("TRADUCTEUR_AR_DIRECT:", r);
    return r || query.trim();
  }
  try {
    const resp = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 80,
      temperature: 0,
      system: SYSTEM_TRADUCTEUR,
      messages: [{ role: "user", content: query.trim() }]
    });
    const raw = (resp.content[0]?.text || "").trim();
    const arOnly = raw
      .replace(/[`'"*_#\[\]()]/g, "")
      .replace(/[a-zA-Z\-]/g, " ")
      .replace(/[0-9]/g, "")
      .replace(/\s+/g, " ").trim();
    if (!/[\u0600-\u06FF]/.test(arOnly) || arOnly.length < 2) {
      console.log("TRADUCTEUR_FALLBACK:", raw);
      return query.trim().split(/\s+/).slice(0, 3).join(" ");
    }
    const result = arOnly.split(/\s+/).filter(Boolean).slice(0, 12).join(" ");
    console.log("TRADUCTEUR [T=0]:", query.substring(0, 50), "→", result);
    return result;
  } catch (err) {
    console.log("TRADUCTEUR_ERR:", err.message);
    return query.trim().split(/\s+/).slice(0, 3).join(" ");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// extractJSON — ⛔️ SANCTUAIRE — NE PAS MODIFIER
// ═══════════════════════════════════════════════════════════════════════════════
function extractJSON(text) {
  if (!text) return null;
  let t = text.replace(/```[a-z]*\n?/gi, "").trim();
  try { return JSON.parse(t); } catch (_) {}
  const mObj = t.match(/\{[\s\S]*\}/);
  if (mObj) { try { return JSON.parse(mObj[0]); } catch (_) {} }
  const mArr = t.match(/\[[\s\S]*\]/);
  if (mArr) { try { return JSON.parse(mArr[0]); } catch (_) {} }
  const start = t.indexOf("{");
  if (start === -1) return null;
  let depth = 0, lastComplete = -1;
  for (let i = start; i < t.length; i++) {
    if (t[i] === "{") depth++;
    if (t[i] === "}") { depth--; if (depth === 0) lastComplete = i; }
  }
  if (lastComplete > start) {
    try { return JSON.parse(t.substring(start, lastComplete + 1)); } catch (_) {}
  }
  try {
    const rep = t.substring(start, lastComplete > start ? lastComplete + 1 : t.length)
      .replace(/style="([^"]*)"/g, "style='$1'");
    return JSON.parse(rep);
  } catch (_) {}
  // ⛔️ FIN DU SANCTUAIRE
  console.log("EXTRACT_JSON_FAILED");
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALEURS PAR DÉFAUT
// ═══════════════════════════════════════════════════════════════════════════════
const DEFAULTS = {
  french_text:
    "La traduction de ce texte n'a pas pu etre etablie. " +
    "Consultez un specialiste ou la source originale sur Dorar.net.",
  grade_explique:
    "Le verdict est celui fourni par Dorar.net. " +
    "Consultez : Silsilah Sahihah et Da'ifah d Al-Albani (rahimahullah).",
  isnad_chain: "",
  jarh_tadil:
    "L'analyse des transmetteurs n'a pas pu etre completee. " +
    "Referez-vous au Taqrib al-Tahdhib d Ibn Hajar et au Mizan d Al-Dhahabi.",
  sanad_conditions:
    "La verification des 5 conditions (Ibn as-Salah, Al-Muqaddimah) " +
    "n'a pas pu etre menee a terme.",
  avis_savants:
    "Les avis n'ont pas pu etre collectes. Consultez Fath al-Bari, " +
    "Sharh Sahih Muslim d Al-Nawawi, et la Silsilah d Al-Albani.",
  grille_albani:
    "Rapport non disponible. Consultez Silsilah Sahihah, Da'ifah, " +
    "Irwa' al-Ghalil, Sahih/Da'if al-Jami' (rahimahullah).",
  pertinence: "NON"
};

// ═══════════════════════════════════════════════════════════════════════════════
// Utilitaires
// ═══════════════════════════════════════════════════════════════════════════════
function clean(s) {
  return (s || "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

// ⛔️ cleanIsnad — préserve \n — NE PAS MODIFIER
function cleanIsnad(s) {
  if (!s) return "";
  return s
    .replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function safeField(value, key) {
  if (key === "isnad_chain") {
    const v = cleanIsnad(value);
    return (v && v.length >= 5) ? v : "";
  }
  if (key === "pertinence") {
    const v = (value || "").trim().toUpperCase();
    if (v.startsWith("OUI"))     return "OUI";
    if (v.startsWith("PARTIEL")) return "PARTIEL";
    if (v.startsWith("NON"))     return "NON";
    return DEFAULTS.pertinence;
  }
  const v = clean(value);
  return (v && v.length >= 10) ? v : DEFAULTS[key];
}

// ── sseWrite — flush immédiat (events génériques) ─────────────────────────────
function sseWrite(res, event, data) {
  const payload = "event: " + event + "\ndata: " + JSON.stringify(data) + "\n\n";
  res.write(payload);
  if (typeof res.flush === "function") res.flush();
}

// ── sseStatus — event status nommé avec ID string pur ─────────────────────────
// IDs officiels : INITIALISATION | DORAR | TAKHRIJ | RIJAL | JARH | HUKM
// Format : event: status\ndata: "ID"\n\n  (string JSON, pas objet)
function sseStatus(res, id) {
  const payload = "event: status\ndata: " + JSON.stringify(id) + "\n\n";
  res.write(payload);
  if (typeof res.flush === "function") res.flush();
  console.log("SSE_STATUS:", id);
}

// ── sseChunk — relay delta LLM avec champ 'delta' explicite ───────────────────
// Format : event: chunk\ndata: {index, delta: "texte"}\n\n
function sseChunk(res, idx, deltaText) {
  if (!deltaText) return;
  const payload = "event: chunk\ndata: " + JSON.stringify({ index: idx, delta: deltaText }) + "\n\n";
  res.write(payload);
  if (typeof res.flush === "function") res.flush();
}

// ═══════════════════════════════════════════════════════════════════════════════
// extractInfoValue — HTML Dorar
// ═══════════════════════════════════════════════════════════════════════════════
function extractInfoValue(html, label) {
  const esc = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let rx = new RegExp(esc + "[^<]*<\\/span>\\s*<span[^>]*>([^<]{1,300})<\\/span>");
  let m = html.match(rx);
  if (m && m[1].trim()) return m[1].trim();
  rx = new RegExp(esc + "[^<]*<\\/span>([^<]{1,200})");
  m = html.match(rx);
  if (m) {
    const v = m[1].trim().replace(/^[-:—\s]+/, "").trim();
    if (v.length >= 2) return v;
  }
  return "";
}

// ═══════════════════════════════════════════════════════════════════════════════
// normalizeMatn — DÉDUPLICATION DE FER : lettres arabes nues uniquement
// Strip : tashkil | ponctuation AR+FR | chiffres | TOUS les espaces
// Résultat : chaîne de lettres nues pour comparaison stricte 100%
// ═══════════════════════════════════════════════════════════════════════════════
function normalizeMatn(s) {
  return (s || "")
    .replace(/[\u064B-\u065F\u0670]/g, "")      // tashkil + superscript alif
    .replace(/[\u060C\u061B\u061F\u06D4]/g, "")// ponctuation arabe
    .replace(/[.,!?;:()\[\]{}"'«»\-\u2013\u2014]/g, "") // ponctuation latine
    .replace(/[\u0660-\u06690-9]/g, "")            // chiffres arabes et latins
    .replace(/\s+/g, "");                           // TOUS les espaces
}

// ═══════════════════════════════════════════════════════════════════════════════
// parseHadiths v13 — jusqu'à 5 résultats, déduplication stricte
// ═══════════════════════════════════════════════════════════════════════════════
function parseHadiths(html) {
  const results = [];
  const RE_HADITH = /<div\s[^>]*class="hadith"[^>]*>([\s\S]*?)<\/div>/g;
  const RE_INFO   = /<div\s[^>]*class="hadith-info"[^>]*>([\s\S]*?)<\/div>/g;
  const matns = [], infos = [];
  let m;

  while ((m = RE_HADITH.exec(html)) !== null) {
    const text = m[1]
      .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")
      .replace(/^\s*\d+\s*[-–]\s*/, "").trim();
    if (text.length >= 10) matns.push(text);
  }
  while ((m = RE_INFO.exec(html)) !== null) infos.push(m[1]);
  console.log("MATNS_RAW:", matns.length, "| INFOS:", infos.length);

  const MAX = 5;
  const seen = new Set();

  for (let i = 0; i < matns.length && results.length < MAX; i++) {
    const norm = normalizeMatn(matns[i]);
    if (seen.has(norm)) {
      console.log("DOUBLON_SKIP[" + i + "]:", matns[i].substring(0, 50));
      continue;
    }
    seen.add(norm);
    const inf    = infos[i] || "";
    const grade  = extractInfoValue(inf, "خلاصة حكم المحدث");
    const savant = extractInfoValue(inf, "المحدث");
    const source = extractInfoValue(inf, "المصدر");
    const rawi   = extractInfoValue(inf, "الراوي");
    console.log("HADITH[" + results.length + "] GRADE:", grade || "(vide)", "| SAVANT:", savant || "(vide)");
    results.push({
      arabic_text: matns[i].substring(0, 1200),
      grade: grade || "غير محدد", savant, source, rawi,
      french_text: "", grade_explique: "", isnad_chain: "", jarh_tadil: "",
      sanad_conditions: "", avis_savants: "", grille_albani: "", pertinence: ""
    });
  }

  // Fallback brut si aucun div.hadith trouvé
  if (!results.length) {
    const seenFb = new Set();
    const blks = html.match(/[\u0600-\u06FF][\u0600-\u06FF\s،؛,.!؟\u064B-\u065F]{30,600}/g) || [];
    for (const blk of blks) {
      if (results.length >= MAX) break;
      const text = blk.replace(/\s+/g, " ").trim();
      const norm = normalizeMatn(text);
      if (text.length >= 30 && !seenFb.has(norm)) {
        seenFb.add(norm);
        results.push({
          arabic_text: text, grade: "غير محدد", savant: "", source: "", rawi: "",
          french_text: "", grade_explique: "", isnad_chain: "", jarh_tadil: "",
          sanad_conditions: "", avis_savants: "", grille_albani: "", pertinence: ""
        });
      }
    }
  }

  console.log("PARSED_UNIQUES:", results.length);
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// fetchWithTimeout
// ═══════════════════════════════════════════════════════════════════════════════
function fetchWithTimeout(url, opts, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

// ═══════════════════════════════════════════════════════════════════════════════
// analyserUnHadith v13
// ─────────────────────────────────────────────────────────────────────────────
// STREAMING VRAI : les chunks LLM sont relayés immédiatement vers le client via
// sseChunk(), maintenant la connexion Vercel ouverte et animant la barre de
// progression. Le JSON final est parsé à la fin du flux.
// ⛔️ SANCTUAIRE — NE PAS MODIFIER LA STRUCTURE DU STREAM
// ═══════════════════════════════════════════════════════════════════════════════
async function analyserUnHadith(r, idx, q, res, wantSSE) {
  const prompt =
    "REQUETE_UTILISATEUR_ORIGINALE : " + q + "\n\n" +
    "DONNEES DORAR.NET (SOURCE AUTORITAIRE) :\n" +
    "  Matn arabe : " + r.arabic_text + "\n" +
    "  Grade Dorar : " + r.grade + "\n" +
    "  Savant source : " + (r.savant || "non precise") + "\n" +
    "  Livre source  : " + (r.source || "non precise") + "\n" +
    "  Rawi principal : " + (r.rawi  || "non precise") + "\n\n" +
    "RAPPELS IMPERATIFS :\n" +
    "  V1 — grade_explique DOIT refleter Grade Dorar ci-dessus.\n" +
    "  V13 — Si le matn ne correspond pas semantiquement a la REQUETE_UTILISATEUR : \n" +
    "         ajouter le signal d avertissement en debut de french_text.\n" +
    "  V3 — Sources exclusives : voie des Salaf (Al-Albani, Ibn Baz, Ibn Uthaymin).\n" +
    "  V2 — Dictionnaires : Ibn al-Athir → Ibn Manzur → Ibn Faris.\n" +
    "  V4 — isnad_chain min. 8 maillons | format pipe | \\n separateurs.\n" +
    "  V4 — Terminer par Al-Albani | Ibn Baz | Ibn Uthaymin (20e-21e s.).\n" +
    "  V4 — { en premier | } en dernier | 8 champs non vides.\n";

  try {
    let rawText = "";
    let chunkCount = 0;

    const stream = client.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8192,
      system: SYSTEM_TAKHRIJ,
      messages: [{ role: "user", content: prompt }]
    });

    // ── RELAY VRAI : chaque delta LLM est envoyé immédiatement au client ──
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta?.text) {
        const chunk = event.delta.text;
        rawText += chunk;
        chunkCount++;

        // Relay du chunk au frontend toutes les ~5 deltas (throttle léger)
        // pour animer la barre de progression sans surcharger le réseau
        if (wantSSE && chunkCount % 5 === 0) {
          sseChunk(res, idx, chunk);
        }
      }
    }

    // Dernier flush des chunks restants
    if (wantSSE && chunkCount % 5 !== 0) {
      sseChunk(res, idx, "");  // signal fin de chunk pour ce hadith
    }

    console.log("HADITH[" + idx + "]_RAW_LEN:", rawText.length, "| CHUNKS:", chunkCount);

    let parsed = extractJSON(rawText);
    if (Array.isArray(parsed)) parsed = parsed[0] || null;
    console.log("HADITH[" + idx + "]_PARSE:", parsed ? "OK" : "ECHEC");

    // ── GARDE-FOU GRADE_INVERSION_DETECTEE + TRIPLE BOUCLIER ────────────
    if (parsed && r.grade) {
      const cls   = classifyGrade(r.grade);
      const expl  = (parsed.grade_explique || "").toLowerCase();
      const aiGood = /\bsahih\b|\bhasan\b|#2ecc71|#f39c12/.test(expl);
      const aiBad  = /\bda.if\b|mawdu|munkar|#e74c3c|#8e44ad/.test(expl);

      // Cas A : Da'if → Sahih
      if (cls.isWeak && aiGood && !aiBad) {
        const n = cls.isMawdu ? "Mawdu'" : cls.isDaifJid ? "Da'if Jiddan" : "Da'if";
        console.log("HADITH[" + idx + "]_GRADE_INVERSION (" + n + "→Sahih) — corrige");
        parsed.grade_explique = DEFAULTS.grade_explique;
      }
      // Cas B : Sahih → Da'if
      if (cls.isStrong && aiBad && !aiGood) {
        console.log("HADITH[" + idx + "]_GRADE_INVERSION (Sahih→Da'if) — corrige");
        parsed.grade_explique = DEFAULTS.grade_explique;
      }
      // Cas C : phrase complexe sans badge
      if (cls.isWeak && !aiBad && !aiGood) {
        const coul = cls.isMawdu ? "#8e44ad" : "#e74c3c";
        const lbl  = cls.isMawdu
          ? "REJET\u00c9 \u2014 CE N'EST PAS UN HADITH (MAWDU')"
          : cls.isDaifJid ? "DA'IF JIDDAN \u2014 TR\u00c8S FAIBLE"
          : "DA'IF \u2014 FAIBLE";
        console.log("HADITH[" + idx + "]_PHRASE_COMPLEXE (" + r.grade.substring(0,35) + ") — badge force");
        parsed.grade_explique =
          "<span style='color:" + coul + ";font-weight:bold;'>" + lbl + "</span>" +
          " \u2014 " + (r.savant || "Muhaddith") +
          (r.source ? ", " + r.source : "") + ".<br>" +
          "Verdict Dorar.net : <em>" + r.grade + "</em>.<br>" +
          (parsed.grade_explique && parsed.grade_explique.length > 20
            ? parsed.grade_explique : DEFAULTS.grade_explique);
      }
    }

    return parsed;
  } catch (e) {
    console.log("HADITH[" + idx + "]_ERR:", e.message);
    return null;
  }
  // ⛔️ FIN DU SANCTUAIRE
}

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
// SÉQUENCE SSE :
//   status(TRADUCTION) → status(DORAR) → dorar(métadonnées 5 hadiths) →
//   status(TAKHRIJ) → [pour chaque hadith] chunk* → hadith(enrichi) →
//   done(tous les hadiths)
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = async (req, res) => {

  // ── CORS ──────────────────────────────────────────────────────────────────
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  if (req.method === "OPTIONS") return res.status(200).end();

  const q = req.body?.q || req.query?.q;
  if (!q) return res.status(400).json({ error: "Requete vide" });
  console.log("DEBUT v13 — q:", q);

  const wantSSE = (req.headers.accept || "").includes("text/event-stream");

  if (wantSSE) {
    // ── HEADERS ANTI-BUFFERING VERCEL ─────────────────────────────────────
    res.setHeader("Content-Type",      "text/event-stream; charset=utf-8");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Cache-Control",     "no-cache, no-transform");
    res.setHeader("Connection",        "keep-alive");
    res.setHeader("Transfer-Encoding", "chunked");
    if (typeof res.flushHeaders === "function") res.flushHeaders();
    sseStatus(res, "INITIALISATION");
  }

  try {
    // ── ÉTAPE 1 : TRADUCTION FR→AR ────────────────────────────────────────
    const arabicQuery = await _translateQueryToArabic(q);
    console.log("ARABIC_QUERY:", arabicQuery);

    if (wantSSE) sseStatus(res, "DORAR");

    // ── ÉTAPE 2 : DORAR ───────────────────────────────────────────────────
    const dorarResp = await fetchWithTimeout(
      "https://dorar.net/dorar_api.json?skey=" + encodeURIComponent(arabicQuery),
      { headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://dorar.net/" } },
      8000
    );
    if (!dorarResp.ok) throw new Error("Dorar HTTP " + dorarResp.status);

    const dorarData = await dorarResp.json();
    const html = dorarData?.ahadith?.result || "";
    console.log("HTML_LEN:", html.length);

    if (!html || html.length < 20) {
      console.log("DORAR_EMPTY");
      if (wantSSE) { sseWrite(res, "done", []); res.end(); return; }
      return res.status(200).json([]);
    }

    // ── ÉTAPE 3 : PARSE + DÉDUPLICATION ──────────────────────────────────
    const results = parseHadiths(html);
    if (!results.length) {
      console.log("PARSE_EMPTY");
      if (wantSSE) { sseWrite(res, "done", []); res.end(); return; }
      return res.status(200).json([]);
    }

    if (wantSSE) {
      // Envoi IMMÉDIAT des métadonnées brutes → badges de couleur instantanés
      sseWrite(res, "dorar", results);
      sseStatus(res, "TAKHRIJ");
    }

    // ── ÉTAPE 4 : ANALYSE IA — SÉQUENTIELLE + STREAMING CHUNK PAR CHUNK ──
    // Séquentielle (pas parallèle) pour un streaming propre et lisible :
    // un hadith à la fois → chunks relayés → hadith enrichi → suivant
    console.log("SEQUENTIAL_STREAM:", results.length, "hadiths");

    if (wantSSE) {
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        sseStatus(res, "RIJAL");   // Étape : analyse des transmetteurs
        const parsed = await analyserUnHadith(r, i, q, res, wantSSE);
        sseStatus(res, "JARH");    // Étape : Jarh wa Ta'dil appliqué
        const a = parsed || {};
        r.french_text      = safeField(a.french_text,      "french_text");
        r.grade_explique   = safeField(a.grade_explique,   "grade_explique");
        r.isnad_chain      = safeField(a.isnad_chain,      "isnad_chain");
        r.jarh_tadil       = safeField(a.jarh_tadil,       "jarh_tadil");
        r.sanad_conditions = safeField(a.sanad_conditions, "sanad_conditions");
        r.avis_savants     = safeField(a.avis_savants,     "avis_savants");
        r.grille_albani    = safeField(a.grille_albani,    "grille_albani");
        r.pertinence       = safeField(a.pertinence,       "pertinence");
        sseStatus(res, "HUKM");    // Étape : verdict final prononcé
        sseWrite(res, "hadith", { index: i, data: r });
        console.log("SSE_HADITH[" + i + "] — isnad:", r.isnad_chain.length, "| fr:", r.french_text.length);
      }
      sseWrite(res, "done", results);
      res.end();

    } else {
      // MODE JSON CLASSIQUE — parallèle (pas de SSE)
      const analysesArray = await Promise.all(
        results.map((r, i) => analyserUnHadith(r, i, q, null, false))
      );
      console.log("PARALLEL_DONE:", analysesArray.filter(Boolean).length, "/", results.length);
      results.forEach((r, i) => {
        const a = analysesArray[i] || {};
        r.french_text      = safeField(a.french_text,      "french_text");
        r.grade_explique   = safeField(a.grade_explique,   "grade_explique");
        r.isnad_chain      = safeField(a.isnad_chain,      "isnad_chain");
        r.jarh_tadil       = safeField(a.jarh_tadil,       "jarh_tadil");
        r.sanad_conditions = safeField(a.sanad_conditions, "sanad_conditions");
        r.avis_savants     = safeField(a.avis_savants,     "avis_savants");
        r.grille_albani    = safeField(a.grille_albani,    "grille_albani");
        r.pertinence       = safeField(a.pertinence,       "pertinence");
      });
      console.log("SUCCESS:", results.length, "hadiths (JSON)");
      return res.status(200).json(results);
    }

  } catch (error) {
    console.log("ERROR:", error.message);
    if (wantSSE) {
      sseWrite(res, "error", { message: error.message });
      res.end();
    } else {
      return res.status(500).json({ error: error.message });
    }
  }
};
