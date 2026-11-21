#!/usr/bin/env node
/**
 * server.mjs — zero-dependency static file server.
 *
 * Binds to 0.0.0.0 so the app is reachable from the sandbox preview proxy and
 * from other devices on the network. Sends no CORS restrictions and permits
 * framing, so it works behind a preview host.
 */

import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 5173;
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(body);
}

const server = createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method Not Allowed', { 'Content-Type': 'text/plain' });
    return;
  }

  // Strip the query string and decode percent-escapes.
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    send(res, 400, 'Bad Request', { 'Content-Type': 'text/plain' });
    return;
  }

  if (pathname === '/') pathname = '/index.html';

  // Resolve inside ROOT and refuse anything that escapes it.
  const target = resolve(join(ROOT, normalize(pathname)));
  if (target !== ROOT && !target.startsWith(ROOT + sep)) {
    send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain' });
    return;
  }

  let filePath = target;
  try {
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      filePath = join(filePath, 'index.html');
      statSync(filePath);
    }
  } catch {
    // Unknown path: fall back to the app shell so hash routes still work.
    if (!extname(pathname)) {
      filePath = join(ROOT, 'index.html');
      try {
        statSync(filePath);
      } catch {
        send(res, 404, 'Not Found', { 'Content-Type': 'text/plain' });
        return;
      }
    } else {
      send(res, 404, 'Not Found', { 'Content-Type': 'text/plain' });
      return;
    }
  }

  const ext = extname(filePath).toLowerCase();
  const type = MIME[ext] ?? 'application/octet-stream';

  // The service worker must never be cached, or updates get stuck.
  const cacheControl = ext === '.js' && filePath.endsWith('sw.js')
    ? 'no-store'
    : 'no-cache';

  res.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': cacheControl,
    'Service-Worker-Allowed': '/',
    'X-Content-Type-Options': 'nosniff',
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(filePath).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`Namaj Shikkha running at http://${HOST}:${PORT}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
