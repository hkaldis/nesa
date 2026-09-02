/* Offline shell. Cache-first for app files so the inventory works in a garage
   with no signal; the cache name is bumped on release to force an update. */
const CACHE = 'nesa-v1';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './assets/styles.css', './assets/icon.svg',
  './src/util.js', './src/taxonomy.js', './src/store.js', './src/model.js',
  './src/compat.js', './src/jobs.js', './src/gaps.js', './src/photos.js', './src/ui.js',
  './src/views/inventory.js', './src/views/tool-form.js', './src/views/tool-detail.js',
  './src/views/jobs.js', './src/views/compat.js', './src/views/gaps.js', './src/views/settings.js',
  './src/app.js', './data/sample-inventory.json'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) { return key !== CACHE; })
        .map(function (key) { return caches.delete(key); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(function (hit) {
      return hit || fetch(event.request).then(function (response) {
        // Keep the cache warm for same-origin files fetched after install.
        if (response.ok && new URL(event.request.url).origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
        }
        return response;
      }).catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});
