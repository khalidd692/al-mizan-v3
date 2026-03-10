export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const q = (req.query.q || '').trim();
  if (!q) { res.status(400).json({ error: 'q manquant' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'ANTHROPIC_API_KEY manquante' }); return; }

  try {
    // ÉTAPE 1 — FR → mots-clés arabes via IA
    const isArabic = /[\u0600-\u06FF]/.test(q);
    let arKeywords = q;

    if (!isArabic) {
      const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 20,
          system: 'Tu es un expert en terminologie islamique. Reçois une phrase française et renvoie UNIQUEMENT 1 à 2 mots-clés arabes classiques pour Dorar.net. Aucune ponctuation, aucune explication. Exemples: "je suis triste"→الصبر | "parents"→بر الوالدين | "mariage"→الزواج | "paradis"→الجنة | "mort"→الموت | "colère"→الغضب | "mensonge"→الكذب',
          messages: [{ role: 'user', content: q }]
        })
      });
      const aiData = await aiResp.json();
      const kw = (aiData?.content?.[0]?.text || '').trim();
      if (kw && /[\u0600-\u06FF]/.test(kw)) arKeywords = kw;
    }

    // ÉTAPE 2 — Appeler Dorar
    const dorarResp = await fetch(
      `https://dorar.net/dorar_api.json?skey=${encodeURIComponent(arKeywords)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/json',
          'Referer': 'https://dorar.net/'
        }
      }
    );
    const dorarJson = await dorarResp.json();

    // rawHTML est dans dorarJson.ahadith — s'assurer que c'est une string
    const rawHTML = typeof dorarJson?.ahadith === 'string' ? dorarJson.ahadith : '';

    if (!rawHTML) {
      return res.status(200).json([]);
    }

    // ÉTAPE 3 — Parser le HTML avec RegEx
    const results = [];
    const blockRegex = /<div[^>]*class="hadith[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="hadith|$)/gi;
    let blockMatch;

    while ((blockMatch = blockRegex.exec(rawHTML)) !== null) {
      const block = blockMatch[1];
      if (!block || block.length < 30) continue;

      // Texte arabe
      let arabic_text = '';
      const arSpan = block.match(/class="[^"]*search-keys[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
      if (arSpan) {
        arabic_text = arSpan[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
      }
      if (!arabic_text) {
        const arTexts = block.match(/[\u0600-\u06FF][^\u0000-\u0040\u007B-\u00BF]{20,}/g) || [];
        if (arTexts.length) arabic_text = arTexts.reduce((a, b) => a.length > b.length ? a : b, '');
      }
      if (!arabic_text) continue;

      // المحدث
      let savant = '—';
      const savantM = block.match(/المحدث:<\/span>\s*(?:<span[^>]*>)?([^<\n]{2,60})/i);
      if (savantM) savant = savantM[1].replace(/<[^>]+>/g, '').trim();

      // المصدر
      let source = '—';
      const sourceM = block.match(/المصدر:<\/span>\s*(?:<span[^>]*>)?([^<\n]{2,80})/i);
      if (sourceM) source = sourceM[1].replace(/<[^>]+>/g, '').trim();

      // خلاصة حكم المحدث
      let grade = '—';
      const gradeM = block.match(/خلاصة حكم المحدث:<\/span>\s*(?:<span[^>]*>)?([^<\n]{2,60})/i);
      if (gradeM) {
        grade = gradeM[1].replace(/<[^>]+>/g, '').trim();
      } else {
        if (/صحيح/.test(block))      grade = 'صحيح';
        else if (/حسن/.test(block))  grade = 'حسن';
        else if (/ضعيف/.test(block)) grade = 'ضعيف';
        else if (/موضوع/.test(block)) grade = 'موضوع';
      }

      results.push({ arabic_text, savant, grade, source });
    }

    // ÉTAPE 4 — Retourner tableau JSON
    res.status(200).json(results);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
