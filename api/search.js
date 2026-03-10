// AL MIZAN — api/search.js — FINAL
// Scraping Dorar uniquement. Pas de Claude ici. Reponse < 8s garantie.

const cheerio = require("cheerio");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Requete vide" });

  try {
    const dorarUrl = "https://www.dorar.net/hadith/search?q=" + encodeURIComponent(q) + "&page=1";
    const scraperUrl = "https://api.scrape.do?token=" + process.env.SCRAPER_TOKEN + "&url=" + encodeURIComponent(dorarUrl);

    const response = await fetch(scraperUrl, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return res.status(502).json({ error: "Dorar inaccessible", results: [] });

    const html = await response.text();
    const $ = cheerio.load(html);
    const results = [];

    $("div").each(function(i, el) {
      if (results.length >= 5) return false;

      var fullText = $(el).contents().map(function() {
        return this.type === "text" ? $(this).text() : " ";
      }).get().join(" ").replace(/\s+/g, " ").trim();

      if (fullText.indexOf("\u062e\u0644\u0627\u0635\u0629 \u062d\u0643\u0645 \u0627\u0644\u0645\u062d\u062f\u062b") === -1) return;
      if (fullText.indexOf("\u0635\u0644\u0649 \u0627\u0644\u0644\u0647 \u0639\u0644\u064a\u0647 \u0648\u0633\u0644\u0645") === -1 && fullText.indexOf("\uFDFA") === -1) return;

      var gradeMatch = fullText.match(/\u062e\u0644\u0627\u0635\u0629 \u062d\u0643\u0645 \u0627\u0644\u0645\u062d\u062f\u062b\s*:\s*([^\u0627\u0644\u0645\u062d\u062f\u062b\u0627\u0644\u0645\u0635\u062f\u0631]{3,60})/);
      var savantMatch = fullText.match(/\u0627\u0644\u0645\u062d\u062f\u062b\s*:\s*([\u0600-\u06FF\s]{3,50})(?=\s*\u0627\u0644\u0645\u0635\u062f\u0631)/);
      var sourceMatch = fullText.match(/\u0627\u0644\u0645\u0635\u062f\u0631\s*:\s*([\u0600-\u06FF\s]{3,80})(?=\s*\u062e\u0644\u0627\u0635\u0629)/);

      var parts = fullText.split(/\u0627\u0644\u0631\u0627\u0648\u064a\s*:/);
      var arabic_text = (parts[1] || parts[0] || "")
        .replace(/^\d+\s*-\s*/, "")
        .replace(/\u0627\u0644\u0645\u062d\u062f\u062b.*$/i, "")
        .trim();

      if (arabic_text.length < 40) return;

      results.push({
        arabic_text: arabic_text,
        grade:  gradeMatch  ? gradeMatch[1].trim()  : "",
        savant: savantMatch ? savantMatch[1].trim() : "",
        source: sourceMatch ? sourceMatch[1].trim() : ""
      });
    });

    return res.status(200).json({
      found: results.length > 0,
      query: q,
      results: results
    });

  } catch (err) {
    return res.status(500).json({ error: err.message, results: [] });
  }
};
