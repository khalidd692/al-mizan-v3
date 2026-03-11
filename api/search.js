const Anthropic = require("@anthropic-ai/sdk");
const cheerio = require("cheerio");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Converts HTML to text while inserting spaces between elements to prevent word merging
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

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Requete vide" });

  try {
    // 1. Traduction FR -> AR
    const promptAr = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 50,
      messages: [{ role: "user", content: "Mots-cles arabes uniquement pour : \"" + q + "\"" }]
    });
    const arabicQuery = promptAr.content[0].text.trim();

    // 2. Fetch Dorar via scrape.do
    const targetUrl = "https://www.dorar.net/hadith/search?q=" + encodeURIComponent(arabicQuery);
    const scraperUrl = "https://api.scrape.do?token=" + process.env.SCRAPER_TOKEN + "&url=" + encodeURIComponent(targetUrl) + "&geoCode=de";

    const response = await fetch(scraperUrl, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("Erreur Proxy/Dorar " + response.status);

    const html = await response.text();
    const $ = cheerio.load(html);

    // 3. Collect all candidate divs, sort by length (shortest = most specific = innermost)
    const candidates = [];
    $("div").each((_, el) => {
      const text = htmlToText($(el).html() || "");
      if (text.includes("خلاصة حكم المحدث") && /ﷺ|صلى الله عليه وسلم/.test(text)) {
        candidates.push(text);
      }
    });
    candidates.sort((a, b) => a.length - b.length);

    // 4. Deduplicate: skip any element whose text contains an already-accepted one (parent divs)
    const rawResults = [];
    for (const text of candidates) {
      if (rawResults.length >= 3) break;
      const alreadyCovered = rawResults.some(r => text.includes(r.arabic_text.substring(0, 40)));
      if (alreadyCovered) continue;

      const grade  = (text.match(/خلاصة حكم المحدث\s*:\s*([^|،\n]+)/) || [null, ""])[1].trim();
      const savant = (text.match(/المحدث\s*:\s*([^|،\n]+)/)            || [null, ""])[1].trim();
      const source = (text.match(/المصدر\s*:\s*([^|،\n]+)/)            || [null, ""])[1].trim();
      const arabic_text = text.split("الراوي")[0].replace(/^\d+\s*[-–]\s*/, "").trim();

      if (arabic_text.length > 20 && grade) {
        rawResults.push({ arabic_text, grade, savant, source });
      }
    }

    if (rawResults.length === 0) {
      return res.status(200).json({ found: false, query: arabicQuery, results: [] });
    }

    // 5. Traduction AR -> FR — demande un tableau JSON pour un parsing fiable
    const textsToTranslate = rawResults.map((r, i) => "[" + i + "] " + r.arabic_text).join("\n\n");

    const promptFr = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: "Tu es un traducteur suivant la methodologie des Salaf As-Salih. Regles absolues : istawa = S est etabli, Yad Allah = La Main d Allah, Nuzul = Descente, Wajh Allah = Le Visage d Allah. Traduction litterale uniquement, aucun commentaire. Reponds UNIQUEMENT avec un tableau JSON valide : [{\"i\":0,\"t\":\"traduction\"},{\"i\":1,\"t\":\"traduction\"}]",
      messages: [{ role: "user", content: "Traduis ces hadiths en francais :\n\n" + textsToTranslate }]
    });

    // 6. Parse la reponse JSON de l'IA avec fallback
    const translations = {};
    try {
      const raw = promptFr.content[0].text;
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        JSON.parse(match[0]).forEach(item => {
          if (typeof item.i === "number" && typeof item.t === "string") {
            translations[item.i] = item.t;
          }
        });
      }
    } catch (_) {
      // Fallback: decouper par marqueurs [0], [1], [2]
      promptFr.content[0].text.split(/(?=\[\d+\])/).forEach(chunk => {
        const m = chunk.match(/^\[(\d+)\]\s*([\s\S]+)/);
        if (m) translations[parseInt(m[1])] = m[2].trim();
      });
    }

    const finalResponse = rawResults.map((r, i) => ({
      arabic_text: r.arabic_text,
      grade:       r.grade,
      savant:      r.savant,
      source:      r.source,
      french_text: (translations[i] || "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim()
    }));

    return res.status(200).json({ found: true, query: arabicQuery, results: finalResponse });

  } catch (error) {
    return res.status(500).json({ error: error.message, results: [] });
  }
};
