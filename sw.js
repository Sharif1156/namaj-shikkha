/**
 * sw.js — offline support.
 *
 * Strategy: cache-first for the app shell so the app opens instantly with no
 * network, network-first for everything else with a cache fallback. Bump
 * VERSION to invalidate old caches on the next deploy.
 */

const VERSION = 'v1';
const CACHE = `namaj-${VERSION}`;

const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
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

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch(() => {
        /* A single missing file must not abort the install. */
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never cache third parties

  // Navigations: serve the shell so deep links work offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html').then((r) => r ?? Response.error()))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached ?? Response.error());
    })
  );
});
