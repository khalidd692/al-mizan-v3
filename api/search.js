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
    const rawResults = [];

    // ÉTAPE 3 : Extraction des blocs arabes
    const seen = new Set();
    $("div, article, li").each((i, el) => {
      if (rawResults.length >= 5) return false;
      const text = $(el).clone().children("div, article, li").remove().end().text().trim();
      const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
      if (arabicChars < 50 || text.length > 2000) return;
      const key = text.replace(/[^\u0600-\u06FF]/g, "").substring(0, 80);
      if (seen.has(key)) return;
      seen.add(key);

      const gradeMatch = text.match(/صحيح لغيره|حسن لغيره|صحيح|حسن|ضعيف جداً|ضعيف|موضوع|منكر/);
      const savantMatch = text.match(/الألباني|ابن باز|ابن عثيمين|الوادعي|المدخلي|شعيب الأرنؤوط|الذهبي|ابن حجر|النووي|الدارقطني/);
      const sourceMatch = text.match(/(?:صحيح|سنن|مسند|مصنف|موطأ|الجامع|المستدرك|شعب|كنز)[^\n،,]{2,30}/);

      rawResults.push({
        arabic_text: text.replace(/\s+/g, " ").trim().substring(0, 400),
        savant: savantMatch ? savantMatch[0] : "",
        grade: gradeMatch ? gradeMatch[0] : "",
        source: sourceMatch ? sourceMatch[0].trim() : ""
      });
    });

    if (rawResults.length === 0) return res.status(200).json([]);

    // ÉTAPE 4 : Traduction FR avec Bouclier Doctrinal (Lexique de Fer)
    const arabicTexts = rawResults.map(r => r.arabic_text).join("\n---\n");

    const translateMsg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: `Tu es un traducteur orthodoxe spécialisé en sciences du Hadith, suivant la voie des Salaf As-Salih.

RÈGLES ABSOLUES DE TRADUCTION :
1. Tu traduis de manière strictement littérale, sans aucun Ta'wil (interprétation déviante).
2. Les Attributs d'Allah sont traduits littéralement selon la voie des Salafs :
   - استوى = "S'est établi" (jamais "a pris le pouvoir" ou "domine")
   - يد الله = "La Main d'Allah" (jamais "la puissance d'Allah")
   - نزول = "Descente" (jamais "manifestation de la miséricorde")
   - وجه الله = "Le Visage d'Allah" (jamais "l'agrément d'Allah")
   - ساق = "Le Tibia" (jamais interprétation métaphorique)
3. Tu ne rajoutes aucun commentaire, aucune note de bas de page.
4. Tu ne modifies pas le sens du hadith.
5. Tu traduis uniquement, sans juger ni expliquer.`,
      messages: [{
        role: "user",
        content: `Traduis ces textes de hadiths arabes en français. Chaque hadith est séparé par "---".
Réponds UNIQUEMENT avec les traductions françaises séparées par "---", dans le même ordre, sans numérotation, sans explication.

${arabicTexts}`
      }]
    });

    const frenchTexts = translateMsg.content[0].text.trim().split("---").map(t => t.trim());

    // ÉTAPE 5 : Assemblage final
    const results = rawResults.map((r, i) => ({
      ...r,
      french_text: frenchTexts[i] || ""
    }));

    return res.status(200).json(results);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
