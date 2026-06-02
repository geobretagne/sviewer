// CACHE_NAME is patched at build time by `npm run stamp` (commit hash suffix)
const SVIEWER_COMMIT = '5b9f584';
const CACHE_NAME = 'sviewer-' + SVIEWER_COMMIT;
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './static/js/embed.min.js',
  './static/js/sviewer.min.js',
  './static/css/sviewer.min.css',
  './static/js/i18n.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Ignore failures for optional assets
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
    }).catch(() => caches.match(request))
  );
});
