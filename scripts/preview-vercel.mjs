import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.PORT || 4173);

try {
  const envFile = await readFile(join(root, 'server', '.env'), 'utf8');
  envFile.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([^#][^=]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  });
} catch {
  // Vercel injects environment variables; the local file is optional.
}

const { GET: latestTracks } = await import('../api/latest-tracks.mjs');
const { POST: submitContact } = await import('../api/contact.mjs');

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

async function sendWebResponse(response, res) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}

async function toWebRequest(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  return new Request(`http://localhost:${port}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body
  });
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${port}`);

    if (url.pathname === '/api/latest-tracks' && req.method === 'GET') {
      await sendWebResponse(await latestTracks(), res);
      return;
    }

    if (url.pathname === '/api/contact' && req.method === 'POST') {
      await sendWebResponse(await submitContact(await toWebRequest(req)), res);
      return;
    }

    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/server/') || url.pathname.includes('/.')) {
      res.writeHead(404).end('Not found');
      return;
    }

    const requestedPath = decodeURIComponent(url.pathname);
    const relativePath = requestedPath.endsWith('/')
      ? `${requestedPath}index.html`
      : requestedPath;
    const safePath = normalize(relativePath).replace(/^([.][.][/\\])+/, '');
    const filePath = resolve(root, `.${safePath}`);

    if (!filePath.startsWith(root)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    const data = await readFile(filePath);
    res.setHeader('Content-Type', mimeTypes[extname(filePath)] || 'application/octet-stream');
    res.end(data);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Vercel-style preview running at http://127.0.0.1:${port}`);
});
