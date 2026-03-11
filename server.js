const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;

// Empêche Node.js de crasher sur une rejection non catchée
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

function buildVercelRes(res) {
  const vRes = {
    _status: 200,
    _headers: {},
    status(code) { this._status = code; return this; },
    setHeader(k, v) { this._headers[k] = v; return this; },
    end(data) {
      if (res.headersSent) return;
      res.writeHead(this._status, this._headers);
      res.end(data || '');
    },
    json(obj) {
      this._headers['Content-Type'] = 'application/json';
      this.end(JSON.stringify(obj));
    },
  };
  return vRes;
}

const server = http.createServer(async (req, res) => {
  // Catch-all : toute erreur dans le handler renvoie 500 sans crasher le process
  try {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Health check Railway
    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
      return;
    }

    // Serve index.html
    if (pathname === '/' || pathname === '/index.html') {
      const filePath = path.join(__dirname, 'index.html');
      fs.readFile(filePath, (err, data) => {
        if (res.headersSent) return;
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
      });
      return;
    }

    // API routes
    if (pathname.startsWith('/api/')) {
      const routeName = pathname.replace('/api/', '').split('/')[0];
      const routePath = path.join(__dirname, 'api', routeName + '.js');

      if (!fs.existsSync(routePath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Route not found: ' + routeName }));
        return;
      }

      delete require.cache[require.resolve(routePath)];
      const handler = require(routePath);

      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          try { req.body = body ? JSON.parse(body) : {}; } catch { req.body = {}; }
          req.query = parsedUrl.query;
          const vRes = buildVercelRes(res);
          await handler(req, vRes);
        } catch (err) {
          console.error('Handler error:', err);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        }
      });
      return;
    }

    res.writeHead(404);
    res.end('Not found');

  } catch (err) {
    console.error('Request error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  }
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Server running on port ' + PORT);
});
