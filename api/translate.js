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

    // 2. API officielle Dorar — retourne data.ahadith.result (HTML)
    const dorarResp = await fetch(
      "https://dorar.net/dorar_api.json?skey=" + encodeURIComponent(arabicQuery),
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) }
    );
    if (!dorarResp.ok) throw new Error("Dorar " + dorarResp.status);

    const dorarData = await dorarResp.json();
    const html = dorarData?.ahadith?.result || "";

    if (!html) {
      return res.status(200).json([]);
    }

    // 3. Parser le HTML avec regex (structure réelle Dorar confirmée)
    const rawResults = [];
    const blocks = html.split(/-{3,}/);

    for (const block of blocks) {
      if (rawResults.length >= 3) break;

      const hadithMatch = block.match(/class="hadith"[^>]*>\s*\d*\s*[-.]?\s*([\s\S]+?)(?:<\/div>|$)/);
      if (!hadithMatch) continue;

      const arabic_text = hadithMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (arabic_text.length < 15) continue;

      const rawiM   = block.match(/الراوي:<\/span>\s*([^\n<]+)/);
      const savantM = block.match(/المحدث:<\/span>\s*([^\n<]+)/);
      const sourceM = block.match(/المصدر:<\/span>\s*([^\n<]+)/);
      const gradeM  = block.match(/خلاصة حكم المحدث:<\/span>\s*([^\n<]+)/);

      rawResults.push({
        arabic_text,
        rawi:   rawiM   ? rawiM[1].trim()   : "",
        savant: savantM ? savantM[1].trim() : "",
        source: sourceM ? sourceM[1].trim() : "",
        grade:  gradeM  ? gradeM[1].trim()  : ""
      });
    }

    if (!rawResults.length) {
      return res.status(200).json([]);
    }

    // 4. Traduction AR → FR Lexique de Fer Salaf As-Salih
    const textes = rawResults.map((r, i) => "[" + i + "] " + r.arabic_text).join("\n\n");

    const promptFr = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      system: "Tu es traducteur Salaf As-Salih. REGLES ABSOLUES : istawa = S est etabli | Yad Allah = La Main d Allah | Nuzul = Descente | Wajh Allah = Le Visage d Allah. Traduction litterale uniquement. Zero commentaire.",
      messages: [{ role: "user", content: "Traduis en français :\n\n" + textes }]
    });

    const parts = promptFr.content[0].text.split(/\[\d+\]/).filter(t => t.trim());

    const results = rawResults.map((r, i) => ({
      arabic_text: r.arabic_text,
      grade:       r.grade,
      savant:      r.savant,
      source:      r.source,
      rawi:        r.rawi,
      french_text: parts[i] ? parts[i].trim() : ""
    }));

    return res.status(200).json(results);

  } catch (error) {
    return res.status(500).json({ error: error.message, results: [] });
  }
};
