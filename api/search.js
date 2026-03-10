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
    // ── ÉTAPE 1 : Traduction FR → AR via Anthropic ──────────────────────
    const transMsg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 60,
      messages: [{
        role: "user",
        content: `Traduis en 1 ou 2 mots-clés arabes pour recherche de hadiths sur Dorar.net. Réponds UNIQUEMENT avec les mots arabes, rien d'autre. Requête: "${q}"`
      }]
    });
    const arabicQuery = transMsg.content[0].text.trim();

    // ── ÉTAPE 2 : Fetch Dorar.net ────────────────────────────────────────
    const dorarUrl = `https://www.dorar.net/hadith/search?q=${encodeURIComponent(arabicQuery)}&t=1`;

    const response = await fetch(dorarUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ar,fr;q=0.9,en;q=0.8",
        "Referer": "https://www.dorar.net/"
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Dorar HTTP ${response.status}`, url: dorarUrl });
    }

    const html = await response.text();

    // ── ÉTAPE 3 : Parsing HTML avec Cheerio ─────────────────────────────
    const $ = cheerio.load(html);
    const results = [];

    // Dorar structure : chaque hadith est dans .hadith-container ou article.hadith
    // On essaie plusieurs sélecteurs pour couvrir toute évolution du site
    const selectors = [
      ".hadith-container",
      "article.hadith",
      ".result-item",
      ".hadith-info",
      "[class*='hadith']"
    ];

    let blocks = $();
    for (const sel of selectors) {
      blocks = $(sel);
      if (blocks.length > 0) break;
    }

    // Si aucun sélecteur ne trouve rien → debug
    if (blocks.length === 0) {
      return res.status(200).json({
        results: [],
        debug: {
          arabic_query: arabicQuery,
          url: dorarUrl,
          html_length: html.length,
          html_sample: html.substring(0, 2000)
        }
      });
    }

    blocks.slice(0, 8).each((i, el) => {
      const block = $(el);

      // ── Matn : texte arabe du hadith ──
      // Dorar met le texte principal dans .hadith-text, .matn, ou le premier <p> arabe
      let arabic_text = block.find(".hadith-text, .matn, .text-hadith").first().text().trim();
      if (!arabic_text) {
        // Fallback : premier paragraphe contenant du texte arabe substantiel
        block.find("p, span, div").each((j, el2) => {
          const t = $(el2).text().trim();
          if (!arabic_text && t.length > 40 && /[\u0600-\u06FF]/.test(t)) {
            arabic_text = t;
          }
        });
      }
      if (!arabic_text) return; // skip si pas de texte

      // ── Hukm : grade/verdict ──
      let grade = block.find(".hukm, .grade, .verdict, [class*='hukm'], [class*='grade']").first().text().trim();
      if (!grade) {
        const gradeMatch = block.text().match(/صحيح لغيره|حسن لغيره|صحيح|حسن|ضعيف جداً|ضعيف|موضوع|منكر/);
        grade = gradeMatch ? gradeMatch[0] : "";
      }

      // ── Muhaddith : savant ──
      let savant = block.find(".muhaddith, .scholar, .rawi, [class*='muhaddith'], [class*='scholar']").first().text().trim();
      if (!savant) {
        const savantMatch = block.text().match(/الألباني|ابن باز|ابن عثيمين|الوادعي|المدخلي|شعيب الأرنؤوط|الذهبي|ابن حجر|النووي|الدارقطني|ابن رجب/);
        savant = savantMatch ? savantMatch[0] : "";
      }

      // ── Masdar : source/livre ──
      let source = block.find(".masdar, .source, .book, [class*='masdar'], [class*='source']").first().text().trim();
      if (!source) {
        const sourceMatch = block.text().match(/(?:صحيح|سنن|مسند|مصنف|موطأ|الجامع|المستدرك|شعب|كنز)[^\n،,<]{2,30}/);
        source = sourceMatch ? sourceMatch[0].trim() : "";
      }

      results.push({
        arabic_text: arabic_text.substring(0, 500),
        savant,
        grade,
        source
      });
    });

    // Si cheerio parse la page mais trouve 0 hadith → debug HTML
    if (results.length === 0) {
      return res.status(200).json({
        results: [],
        debug: {
          arabic_query: arabicQuery,
          url: dorarUrl,
          html_length: html.length,
          html_sample: html.substring(0, 2000)
        }
      });
    }

    return res.status(200).json(results);

  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
};
