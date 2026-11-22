/**
 * sw.js — offline support.
 *
 * Strategy: network-first with a short timeout, falling back to the cache.
 * Online users always get the latest files (no stale-cache trap after a
 * deploy); offline or on a bad connection the precached copy is served.
 *
 * VERSION is stamped from a hash of the precached files by
 * `npm run stamp`; CI fails if it is stale, so it cannot be forgotten.
 */

const VERSION = '1183ff6100';
const CACHE = `namaj-${VERSION}`;

const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './privacy.html',
  './src/styles/main.css',
  './src/main.js',
  './src/state.js',
  './src/services.js',
  './src/core/prayer-times.js',
  './src/core/qibla.js',
  './src/core/hijri.js',
  './src/core/storage.js',
  './src/core/i18n.js',
  './src/core/location.js',
  './src/core/tasbih.js',
  './src/ui/dom.js',
  './src/views/home.js',
  './src/views/qibla.js',
  './src/views/salah.js',
  './src/views/duas.js',
  './src/views/tasbih.js',
  './src/views/more.js',
  './src/data/salah.json',
  './src/data/duas.json',
  './src/data/names99.json',
];

const NETWORK_TIMEOUT_MS = 3500;

self.addEventListener('install', (event) => {
  // No catch: if any precache file fails, the install must fail so the previous
  // working worker stays in charge, rather than leaving an empty cache that
  // silently breaks offline mode.
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith('namaj-') && k !== CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
  try {
    const response = await fetch(request, { signal: controller.signal });
    if (response.ok && response.type === 'basic') cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (fallbackUrl) {
      const shell = await cache.match(fallbackUrl);
      if (shell) return shell;
    }
    return Response.error();
  } finally {
    clearTimeout(timer);
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never cache third parties
  // Match anywhere in the path: on GitHub Pages the file lives under the
  // repo subpath (/namaj-shikkha/.well-known/…), not at the domain root.
  if (url.pathname.includes('/.well-known/')) return; // Digital Asset Links etc.

  // Navigations fall back to the app shell so deep links work offline.
  event.respondWith(
    networkFirst(request, request.mode === 'navigate' ? './index.html' : null)
  );
});
