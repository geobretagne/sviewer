// CACHE_NAME is patched at build time by `npm run stamp` (commit hash suffix)
const SVIEWER_COMMIT = 'a6b4cec';
const CACHE_NAME = 'sviewer-' + SVIEWER_COMMIT;
const ASSETS_REQUIRED = [
  './',
  './index.html',
  './manifest.json',
  './static/js/embed.min.js',
  './static/js/sviewer.min.js',
  './static/css/sviewer.min.css',
  './static/js/i18n.js',
  './static/lib/ol/ol.js',
  './static/lib/ol/ol.css'
];

// Cached best-effort: missing = offline degrades gracefully, install still succeeds
const ASSETS_OPTIONAL = [
  './ext/field/manifest.json',
  './ext/field/extension.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_REQUIRED).then(() => {
        return Promise.all(
          ASSETS_OPTIONAL.map(url => cache.add(url).catch(() => {}))
        );
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only cache GET requests for sViewer resources
  if (request.method !== 'GET' || !url.pathname.includes('/sviewer/')) {
    return;
  }

  // Network-first: always try fresh, fall back to cache when offline.
  // Avoids serving stale JS/CSS after a deploy.
  event.respondWith(
    fetch(request).then(response => {
      if (response && response.status === 200) {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseToCache);
        });
      }
      return response;
    }).catch(() => caches.match(request).then(cached => {
      // Network failed AND not in cache → must still return a Response.
      // Returning undefined here throws "Failed to convert value to 'Response'".
      return cached || Response.error();
    }))
  );
});
