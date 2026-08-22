import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, isAbsolute, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.PORT || 4173);

try {
  const envFile = await readFile(join(root, 'server', '.env'), 'utf8');
  envFile.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([^#][^=]*)=(.*)$/);
    if (!match) return;
    const key = match[1].trim();
    let value = match[2].trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    if (key && !process.env[key]) process.env[key] = value;
  });
} catch {
  // Vercel injects environment variables; the local file is optional.
}

const { GET: latestTracks } = await import('../api/latest-tracks.mjs');
const { POST: submitContact } = await import('../api/contact.mjs');

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

async function sendWebResponse(response, res) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
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
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    if (url.pathname === '/api/latest-tracks' && req.method === 'GET') {
      await sendWebResponse(await latestTracks(), res);
      return;
    }

    if (url.pathname === '/api/contact' && req.method === 'POST') {
      await sendWebResponse(await submitContact(await toWebRequest(req)), res);
      return;
    }

    const blockedPath = /^(?:\/api(?:\/|$)|\/server(?:\/|$)|\/scripts(?:\/|$)|\/\.github(?:\/|$)|\/package\.json$|\/README[^/]*$|\/about-me\.js$|\/spotify\.js$)/i;
    if (blockedPath.test(url.pathname) || url.pathname.includes('/.')) {
      res.writeHead(404).end('Not found');
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      res.writeHead(405).end('Method not allowed');
      return;
    }

    const requestedPath = decodeURIComponent(url.pathname);
    const relativePath = requestedPath.endsWith('/')
      ? `${requestedPath}index.html`
      : requestedPath;
    const safePath = normalize(relativePath).replace(/^([.][.][/\\])+/, '');
    const filePath = resolve(root, `.${safePath}`);
    const pathFromRoot = relative(root, filePath);

    if (!pathFromRoot || pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    const data = await readFile(filePath);
    res.setHeader('Content-Type', mimeTypes[extname(filePath)] || 'application/octet-stream');
    res.setHeader('Cache-Control', extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=3600');
    res.setHeader('Content-Length', data.length);
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Vercel-style preview running at http://127.0.0.1:${port}`);
});
