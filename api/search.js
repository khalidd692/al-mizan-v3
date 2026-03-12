const cheerio = require("cheerio");
const Anthropic = require("@anthropic-ai/sdk");

// Lexique de Fer — System Prompt Salaf As-Salih (Analyse complète)
const SYSTEM_PROMPT =
  "Tu es un expert en sciences du hadith suivant la methodologie des Salaf As-Salih. " +
  "LEXIQUE DE FER INTOUCHABLE : istawa = S est etabli, Yad Allah = La Main d Allah, " +
  "Nuzul = Descente, Wajh Allah = Le Visage d Allah. " +
  "Ces termes ne peuvent JAMAIS etre traduits autrement, sous aucun pretexte. " +
  "Sources exclusives : An-Nihayah d Ibn al-Athir (lexique), Al-Kashif d Al-Dhahabi (biographies). " +
  "Pour chaque hadith fourni, tu dois produire une analyse scientifique structuree comportant : " +
  "1. french_text : traduction FR litterale Salaf, respectant le Lexique de Fer. " +
  "2. sanad_conditions : objet JSON evaluant les 5 conditions du sanad : " +
  '   {"ittisal": "evaluation de la continuite de la chaine","adala": "evaluation de la probite des rapporteurs",' +
  '    "dabt": "evaluation de la precision memorielle","shudhudh": "evaluation de labsence de shudhdh",' +
  '    "illa": "evaluation de labsence dilla cachee"}. ' +
  "3. jarh_tadil : objet JSON avec les jugements des imams sur le rawi principal : " +
  '   {"ibn_hajar": "jugement Ibn Hajar (Taqrib at-Tahdhib)","dhahabi": "jugement Al-Dhahabi (Al-Kashif + Mizan al-Itidal)",' +
  '    "albani": "jugement Al-Albani si disponible"}. ' +
  "4. avis_savants : chaine listant les avis consolides des specialistes (hadith accepte/rejete/mitige avec references). " +
  "5. grade_explique : explication detaillee du grade (Sahih/Hasan/Da'if/Mawdu') avec reference savante citee. " +
  "Si une information est inconnue ou indisponible, indique 'Non documente' — ne jamais inventer. " +
  "REPONSE : UNIQUEMENT un tableau JSON valide, sans aucun texte hors du JSON : " +
  '[{"i":0,"french_text":"...","sanad_conditions":{"ittisal":"...","adala":"...","dabt":"...","shudhudh":"...","illa":"..."},' +
  '"jarh_tadil":{"ibn_hajar":"...","dhahabi":"...","albani":"..."},"avis_savants":"...","grade_explique":"..."}]';

function htmlToText(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Lit les champs d'un div.hadith-info nœud par nœud
function parseHadithInfo($, infoEl) {
  const fields = {};
  let currentLabel = null;
  $(infoEl).contents().each((_, node) => {
    if (node.type === "tag" && $(node).hasClass("info-subtitle")) {
      currentLabel = $(node).text().replace(/:\s*$/, "").trim();
    } else if (currentLabel) {
      const val =
        node.type === "text"
          ? node.data.trim()
          : node.type === "tag"
          ? $(node).text().trim()
          : "";
      if (val) {
        fields[currentLabel] = val;
        currentLabel = null;
      }
    }
  });
  return fields;
}

async function callClaude(client, userMessage, system, maxTokens = 1024) {
  const params = {
    model: "claude-opus-4-6",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: userMessage }],
  };
  if (system) params.system = system;

  const response = await client.messages.create(params);
  const block = response.content.find((b) => b.type === "text");
  if (!block) throw new Error("Pas de réponse texte de Claude");
  return block.text;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Requete vide" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY manquante" });

  const client = new Anthropic({ apiKey });

  try {
    // 1. Extraction du mot-clé arabe unique via Claude
    const KEYWORD_SYSTEM =
      "Tu es un extracteur de mot-clé arabe. " +
      "Règle absolue : réponds avec UN SEUL mot en arabe, le plus pertinent pour rechercher ce sujet dans une base de hadiths. " +
      "Interdit : listes, phrases, explications, translittération, ponctuation. " +
      "Réponse = UN mot arabe, rien d'autre.";
    const arabicQuery = (
      await callClaude(client, q, KEYWORD_SYSTEM)
    ).trim().split(/\s+/)[0];

    // 2. API JSON officielle Dorar : dorar_api.json?skey=
    const apiUrl =
      "https://dorar.net/dorar_api.json?skey=" +
      encodeURIComponent(arabicQuery);
    const dorarRes = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
        Referer: "https://dorar.net/",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!dorarRes.ok) throw new Error("Dorar error " + dorarRes.status);

    const json = await dorarRes.json();
    // Fragment HTML : json.ahadith.result (ancienne structure) ou json.ahadith
    const htmlResult = json?.ahadith?.result ?? json?.ahadith ?? null;
    if (!htmlResult)
      return res
        .status(200)
        .json({ found: false, query: arabicQuery, results: [] });

    // 3. Parsing — double stratégie
    const $ = cheerio.load(htmlResult);
    const rawResults = [];

    // Passe 1 : sélecteurs ciblés div.hadith + div.hadith-info
    $("div.hadith").each((_, hadithEl) => {
      if (rawResults.length >= 5) return false;
      const arabic_text = htmlToText($(hadithEl).html() || "")
        .replace(/^\d+\s*[-–]\s*/, "").trim();
      if (arabic_text.length < 20) return;

      const infoEl = $(hadithEl).next("div.hadith-info");
      if (!infoEl.length) return;

      const fields = parseHadithInfo($, infoEl[0]);
      const grade  = fields["خلاصة حكم المحدث"] || "";
      const savant = fields["المحدث"] || "";
      const source = fields["المصدر"] || "";
      const rawi   = fields["الراوي"] || "";
      if (!grade) return;

      rawResults.push({ arabic_text, grade, savant, source, rawi });
    });

    // Passe 2 : fallback regex sur texte brut si passe 1 vide
    if (rawResults.length === 0) {
      const seen = new Set();
      $("*").each((_, el) => {
        if (rawResults.length >= 5) return false;
        const text = $(el).text().trim();
        if (!text.includes("خلاصة حكم المحدث")) return;
        if (!/ﷺ|صلى الله عليه وسلم/.test(text)) return;
        if (text.length > 1500 || text.length < 50) return;
        const key = text.substring(0, 60);
        if (seen.has(key)) return;
        seen.add(key);
        const gradeMatch  = text.match(/خلاصة حكم المحدث\s*:\s*([^\n\r|]{3,40})/);
        const savantMatch = text.match(/المحدث\s*:\s*([^|\n\r]{3,30})/);
        const sourceMatch = text.match(/المصدر\s*:\s*([^|\n\r]{3,30})/);
        const arabic_text = text.split("خلاصة حكم المحدث")[0]
          .replace(/\s+/g, " ").trim().substring(0, 400);
        if (arabic_text.length < 20) return;
        rawResults.push({
          arabic_text,
          grade:  gradeMatch?.[1].trim()  || "",
          savant: savantMatch?.[1].trim() || "",
          source: sourceMatch?.[1].trim() || "",
          rawi: "",
        });
      });
    }

    if (rawResults.length === 0)
      return res
        .status(200)
        .json({ found: false, query: arabicQuery, results: [] });

    // 4. Analyse complète AR -> FR via Claude (Lexique de Fer + Takhrij)
    const haditbsForAnalysis = rawResults
      .map((r, i) =>
        "[" + i + "]\n" +
        "TEXTE ARABE : " + r.arabic_text + "\n" +
        "RAWI (rapporteur) : " + (r.rawi || "Non precise") + "\n" +
        "SAVANT (muhaddith) : " + (r.savant || "Non precise") + "\n" +
        "SOURCE : " + (r.source || "Non precise") + "\n" +
        "GRADE BRUT : " + (r.grade || "Non precise")
      )
      .join("\n\n---\n\n");
    const rawAnalysis = await callClaude(
      client,
      "Analyse ces hadiths selon les sciences du hadith :\n\n" + haditbsForAnalysis,
      SYSTEM_PROMPT,
      8192
    );

    // 5. Parse JSON enrichi avec fallback
    const analysisMap = {};
    try {
      const match = rawAnalysis.match(/\[[\s\S]*\]/);
      if (match) {
        JSON.parse(match[0]).forEach((item) => {
          if (typeof item.i === "number") {
            analysisMap[item.i] = item;
          }
        });
      }
    } catch (_) {
      // Fallback : si le JSON est malformé, on tente un parse partiel
      try {
        const cleaned = rawAnalysis
          .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ");
        const match2 = cleaned.match(/\[[\s\S]*\]/);
        if (match2) {
          JSON.parse(match2[0]).forEach((item) => {
            if (typeof item.i === "number") analysisMap[item.i] = item;
          });
        }
      } catch (_2) { /* silencieux */ }
    }

    const EMPTY_SANAD = { ittisal: "Non documente", adala: "Non documente", dabt: "Non documente", shudhudh: "Non documente", illa: "Non documente" };
    const EMPTY_JARH  = { ibn_hajar: "Non documente", dhahabi: "Non documente", albani: "Non documente" };

    const finalResponse = rawResults.map((r, i) => {
      const a = analysisMap[i] || {};
      return {
        arabic_text:    r.arabic_text,
        grade:          r.grade,
        savant:         r.savant,
        source:         r.source,
        rawi:           r.rawi,
        french_text:    (typeof a.french_text === "string" ? a.french_text : "")
                          .replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim(),
        sanad_conditions: (a.sanad_conditions && typeof a.sanad_conditions === "object")
                          ? a.sanad_conditions : EMPTY_SANAD,
        jarh_tadil:     (a.jarh_tadil && typeof a.jarh_tadil === "object")
                          ? a.jarh_tadil : EMPTY_JARH,
        avis_savants:   (typeof a.avis_savants === "string" ? a.avis_savants : "Non documente")
                          .replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim(),
        grade_explique: (typeof a.grade_explique === "string" ? a.grade_explique : "Non documente")
                          .replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim(),
      };
    });

    return res
      .status(200)
      .json({ found: true, query: arabicQuery, results: finalResponse });
  } catch (error) {
    return res.status(500).json({ error: error.message, results: [] });
  }
};
