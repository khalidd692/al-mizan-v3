const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT =
  "Tu es un expert en sciences du Hadith selon la methodologie des Salaf As-Salih. " +
  "Lexique de Fer INTOUCHABLE : istawa = S est etabli | Yad Allah = La Main d Allah | " +
  "Nuzul = Descente | Wajh Allah = Le Visage d Allah. " +
  "Pour chaque hadith genere un objet JSON avec 5 champs en francais : " +
  "french_text (traduction litterale du matn, Lexique de Fer strict), " +
  "grade_explique (verdict detaille + nom du savant source + reference), " +
  "jarh_tadil (analyse du rawi selon Ibn Hajar / Al-Dhahabi / Al-Albani), " +
  "sanad_conditions (5 conditions : Ittisal / Adala / Dabt / Shudhudh / Illa), " +
  "avis_savants (avis consolides des specialistes avec references). " +
  "Reponds UNIQUEMENT avec un tableau JSON valide, zero commentaire : " +
  '[{"i":0,"french_text":"...","grade_explique":"...","jarh_tadil":"...","sanad_conditions":"...","avis_savants":"..."}]';

function clean(s) {
  return (s || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const q = req.body?.q || req.query?.q;
  if (!q) return res.status(400).json({ error: "Requête vide" });

  try {
    // 1. Traduction FR → AR si nécessaire
    const isArabic = /[\u0600-\u06FF]/.test(q);
    let arabicQuery = q;

    if (!isArabic) {
      const promptAr = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 20,
        system: "Reponds UNIQUEMENT avec 1 seul mot arabe. Rien d'autre.",
        messages: [{ role: "user", content: "Traduis en 1 mot arabe : " + q }]
      });
      arabicQuery = promptAr.content[0].text.trim().split(/\s+/)[0];
    }

    // 2. API officielle Dorar
    const dorarResp = await fetch(
      "https://dorar.net/dorar_api.json?skey=" + encodeURIComponent(arabicQuery),
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) }
    );
    if (!dorarResp.ok) throw new Error("Dorar " + dorarResp.status);

    const dorarData = await dorarResp.json();
    const html = dorarData?.ahadith?.result || "";
    if (!html) return res.status(200).json([]);

    // 3. Parser le HTML
    const results = [];
    const blocks = html.split(/-{3,}/);

    for (const block of blocks) {
      if (results.length >= 3) break;

      const hadithMatch = block.match(/class="hadith"[^>]*>([\s\S]*?)<\/div>/);
      if (!hadithMatch) continue;
      const arabic_text = hadithMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (arabic_text.length < 10) continue;

      const getField = (label) => {
        const rx = new RegExp(label + '<\\/span>([^<]+)');
        const m = block.match(rx);
        return m ? m[1].trim() : "";
      };

      results.push({
        arabic_text,
        grade:  getField('خلاصة حكم المحدث:'),
        savant: getField('المحدث:'),
        source: getField('المصدر:'),
        rawi:   getField('الراوي:'),
        french_text:      "",
        grade_explique:   "",
        jarh_tadil:       "",
        sanad_conditions: "",
        avis_savants:     ""
      });
    }

    if (!results.length) return res.status(200).json([]);

    // 4. Takhrij complet AR → FR (5 champs) via Claude Sonnet
    const textes = results.map((r, i) =>
      "[" + i + "]\n" +
      "Matn : " + r.arabic_text + "\n" +
      "Grade : " + r.grade + "\n" +
      "Savant : " + r.savant + "\n" +
      "Rawi : " + r.rawi
    ).join("\n\n");

    const promptFr = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: "Genere le Takhrij complet pour ces hadiths :\n\n" + textes }]
    });

    // 5. Parse JSON avec double fallback
    const analyses = {};
    try {
      const raw = promptFr.content[0].text;
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        JSON.parse(match[0]).forEach((item) => {
          if (typeof item.i === "number") analyses[item.i] = item;
        });
      }
    } catch (_) {
      results.forEach((_, i) => {
        analyses[i] = {
          french_text: "Non documente",
          grade_explique: "Non documente",
          jarh_tadil: "Non documente",
          sanad_conditions: "Non documente",
          avis_savants: "Non documente"
        };
      });
    }

    results.forEach((r, i) => {
      const a = analyses[i] || {};
      r.french_text      = clean(a.french_text);
      r.grade_explique   = clean(a.grade_explique);
      r.jarh_tadil       = clean(a.jarh_tadil);
      r.sanad_conditions = clean(a.sanad_conditions);
      r.avis_savants     = clean(a.avis_savants);
    });

    return res.status(200).json(results);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
