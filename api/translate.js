const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

    // 3. Parser le HTML — structure réelle Dorar
    const results = [];
    const blocks = html.split(/-{3,}/);

    for (const block of blocks) {
      if (results.length >= 3) break;

      // Texte arabe : contenu du div.hadith sans balises
      const hadithMatch = block.match(/class="hadith"[^>]*>([\s\S]*?)<\/div>/);
      if (!hadithMatch) continue;
      const arabic_text = hadithMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (arabic_text.length < 10) continue;

      // Métadonnées : spans info-subtitle suivis du texte
      const getField = (label) => {
        const rx = new RegExp(label + '<\\/span>([^<]+)');
        const m = block.match(rx);
        return m ? m[1].trim() : "";
      };

      const grade_ar = getField('خلاصة حكم المحدث:');
      const savant   = getField('المحدث:');
      const source   = getField('المصدر:');
      const rawi     = getField('الراوي:');

      // Envoyer grade en arabe brut — index.html fait son propre mapping
      results.push({ arabic_text, grade: grade_ar, savant, source, rawi });
    }

    return res.status(200).json(results);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
