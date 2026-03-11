module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const q = req.query.q;
  if (!q) { res.status(400).json({ error: 'Missing q' }); return; }

  try {
    const r = await fetch(
      `https://dorar.net/dorar_api.json?skey=${encodeURIComponent(q)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://dorar.net/'
        },
        signal: AbortSignal.timeout(10000)
      }
    );
    if (!r.ok) {
      res.status(502).json({ error: 'Dorar API returned ' + r.status });
      return;
    }
    const data = await r.json();
    res.status(200).json(data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
