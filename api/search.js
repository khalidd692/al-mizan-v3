const Anthropic = require("@anthropic-ai/sdk");
const cheerio = require("cheerio");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Paramètre q manquant" });

  try {
    // ÉTAPE 1 : Traduction FR → AR
    const transMsg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 60,
      messages: [{ role: "user", content: `Traduis en 1 ou 2 mots-clés arabes pour recherche de hadiths sur Dorar.net. Réponds UNIQUEMENT avec les mots arabes, rien d'autre. Requête: "${q}"` }]
    });
    const arabicQuery = transMsg.content[0].text.trim();

    // ÉTAPE 2 : Fetch Dorar
    const dorarUrl = `https://www.dorar.net/hadith/search?q=${encodeURIComponent(arabicQuery)}&t=1`;
    const response = await fetch(dorarUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ar,fr;q=0.9",
        "Referer": "https://www.dorar.net/"
      }
    });

    if (!response.ok) return res.status(502).json({ error: `Dorar HTTP ${response.status}` });
    const html = await response.text();
    const $ = cheerio.load(html);
    const results = [];

    // STRATÉGIE : extraire tous les divs/articles qui contiennent
    // du texte arabe substantiel (>50 chars arabes)
    const candidates = [];

    $("div, article, li, tr").each((i, el) => {
      const text = $(el).clone().children("div, article, li, tr").remove().end().text().trim();
      const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
      if (arabicChars > 50 && text.length < 2000) {
        candidates.push({ text, html: $.html(el) });
      }
    });

    // Trier par longueur décroissante de texte arabe (les vrais hadiths en premier)
    candidates.sort((a, b) => {
      const aAr = (a.text.match(/[\u0600-\u06FF]/g) || []).length;
      const bAr = (b.text.match(/[\u0600-\u06FF]/g) || []).length;
      return bAr - aAr;
    });

    // Dédupliquer : éviter les blocs imbriqués qui contiennent le même texte
    const seen = new Set();
    for (const c of candidates) {
      if (results.length >= 8) break;

      // Prendre les 80 premiers chars arabes comme clé de dédup
      const key = c.text.replace(/[^\u0600-\u06FF]/g, "").substring(0, 80);
      if (seen.has(key)) continue;
      seen.add(key);

      // Extraire les champs
      const arabic_text = c.text.replace(/\s+/g, " ").trim().substring(0, 500);

      const gradeMatch = c.text.match(/صحيح لغيره|حسن لغيره|صحيح|حسن|ضعيف جداً|ضعيف|موضوع|منكر/);
      const grade = gradeMatch ? gradeMatch[0] : "";

      const savantMatch = c.text.match(/الألباني|ابن باز|ابن عثيمين|الوادعي|المدخلي|شعيب الأرنؤوط|الذهبي|ابن حجر|النووي|الدارقطني/);
      const savant = savantMatch ? savantMatch[0] : "";

      const sourceMatch = c.text.match(/(?:صحيح|سنن|مسند|مصنف|موطأ|الجامع|المستدرك|شعب|كنز)[^\n،,]{2,30}/);
      const source = sourceMatch ? sourceMatch[0].trim() : "";

      results.push({ arabic_text, savant, grade, source });
    }

    return res.status(200).json(results);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
