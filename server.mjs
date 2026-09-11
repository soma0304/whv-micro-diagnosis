import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const dataFile = path.join(root, 'data', 'events.ndjson');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

async function saveEvent(event) {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  await fs.appendFile(dataFile, `${JSON.stringify({ ...event, receivedAt: new Date().toISOString() })}\n`, 'utf8');
}

async function forwardToGoogleSheets(event) {
  const webhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhook) return;
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...event, receivedAt: new Date().toISOString() }),
      signal: AbortSignal.timeout(5000)
    });
  } catch (error) {
    console.error('Google Sheets forwarding failed:', error.message);
  }
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }); return res.end(); }
    if (req.method === 'POST' && req.url === '/api/events') {
      let body = '';
      for await (const chunk of req) body += chunk;
      if (body.length > 100_000) return json(res, 413, { ok: false });
      const event = JSON.parse(body);
      if (!event.event || typeof event.event !== 'string') return json(res, 400, { ok: false, error: 'event is required' });
      const savedEvent = { event: event.event, details: event.details || {} };
      await saveEvent(savedEvent);
      await forwardToGoogleSheets(savedEvent);
      return json(res, 201, { ok: true });
    }
    if (req.method === 'GET') {
      const requested = req.url === '/' ? '/index.html' : req.url;
      const safe = path.normalize(requested).replace(/^([.][.][/\\])+/, '');
      const file = path.join(root, safe);
      if (!file.startsWith(root)) return json(res, 403, { ok: false });
      const content = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
      return res.end(content);
    }
    return json(res, 404, { ok: false });
  } catch (error) {
    if (error.code === 'ENOENT') return json(res, 404, { ok: false });
    return json(res, 400, { ok: false, error: 'invalid request' });
  }
});

server.listen(port, '0.0.0.0', () => console.log(`WHV micro diagnosis listening on ${port}`));
