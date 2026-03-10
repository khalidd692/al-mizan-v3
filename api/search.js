const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Paramètre q manquant" });

  try {
    // ── ÉTAPE 1 : Traduction FR → mots-clés arabes ──────────────────────
    const transMsg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 60,
      messages: [{
        role: "user",
        content: `Traduis en 1 ou 2 mots-clés arabes pour recherche de hadiths sur Dorar.net.
Réponds UNIQUEMENT avec les mots arabes, rien d'autre.
Requête: "${q}"`
      }]
    });
    const arabicKeywords = transMsg.content[0].text.trim();

    // ── ÉTAPE 2 : API officielle Dorar (avec www !) ─────────────────────
    const apiUrl = `https://www.dorar.net/dorar_api.json.php?skey=${encodeURIComponent(arabicKeywords)}`;
    const dorarRes = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HadithSearch/1.0)",
        "Accept": "application/json, text/html, */*",
        "Accept-Language": "ar,fr;q=0.9",
        "Referer": "https://www.dorar.net/"
      }
    });

    if (!dorarRes.ok) {
      return res.status(502).json({ error: `Dorar: ${dorarRes.status}`, url: apiUrl });
    }

    // Dorar retourne du HTML (pas du JSON malgré le .json.php)
    const raw = await dorarRes.text();

    // ── ÉTAPE 3 : Parsing du HTML Dorar ─────────────────────────────────
    // Structure Dorar : chaque hadith est séparé par <div class="hadith-container">
    // ou des balises <p> contenant du texte arabe suivi du grade/source
    const results = [];

    // Découpe sur les blocs hadith (Dorar sépare par <!--more--> ou <hr>)
    const rawBlocks = raw.split(/(?=<p[^>]*>[\u0600-\u06FF])/);

    for (const block of rawBlocks.slice(0, 10)) {
      // Texte arabe principal
      const textMatch = block.match(/<p[^>]*>([\u0600-\u06FF][^<]{30,})<\/p>/);
      if (!textMatch) continue;
      const arabic_text = textMatch[1].replace(/\s+/g, " ").trim();

      // Grade
      const gradeMatch = block.match(/صحيح لغيره|حسن لغيره|صحيح|حسن|ضعيف جداً|ضعيف|موضوع|منكر/);
      const grade = gradeMatch ? gradeMatch[0] : "";

      // Savant
      const savantMatch = block.match(/الألباني|ابن باز|ابن عثيمين|الوادعي|المدخلي|شعيب الأرنؤوط|الذهبي|ابن حجر|النووي/);
      const savant = savantMatch ? savantMatch[0] : "";

      // Source
      const sourceMatch = block.match(/(?:صحيح|سنن|مسند|مصنف|موطأ|جامع|مستدرك|شعب|كنز)[^<،]{2,25}/);
      const source = sourceMatch ? sourceMatch[0].trim() : "";

      results.push({ arabic_text, savant, grade, source });
    }

    // Si parsing échoue → retourne le raw pour debug
    if (results.length === 0) {
      return res.status(200).json({
        results: [],
        debug: {
          arabic_query: arabicKeywords,
          api_url: apiUrl,
          response_length: raw.length,
          response_sample: raw.substring(0, 1500)
        }
      });
    }

    return res.status(200).json(results);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
