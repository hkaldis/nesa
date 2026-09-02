/* Offline shell, so the inventory works in a garage with no signal.

   Navigations are network-first and everything else is cache-first: the build
   gives assets content-hashed names, so those can never go stale, while the
   HTML that points at them must stay fresh or an installed copy would never
   see an update. The cache name carries the build hash, so activating a new
   worker drops the previous build's files. */
const CACHE = 'nesa-v1';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './assets/styles.css', './assets/icon.svg',
  './src/util.js', './src/taxonomy.js', './src/store.js', './src/model.js',
  './src/compat.js', './src/jobs.js', './src/gaps.js', './src/photos.js', './src/ui.js',
  './src/views/inventory.js', './src/views/tool-form.js', './src/views/tool-detail.js',
  './src/views/jobs.js', './src/views/compat.js', './src/views/gaps.js', './src/views/settings.js',
  './src/app.js', './data/my-tools.json'
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
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // Navigations go to the network first. The page names a content-hashed
  // bundle, so serving a stale index.html would pin an installed copy to an old
  // version forever; the cached shell is the offline fallback, not the default.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(function (response) {
        const copy = response.clone();
        caches.open(CACHE).then(function (cache) { cache.put('./index.html', copy); });
        return response;
      }).catch(function () {
        return caches.match('./index.html').then(function (hit) {
          return hit || caches.match('./');
        });
      })
    );
    return;
  }

  // Everything else is either content-hashed or static, so cache-first is safe
  // and keeps the app instant offline.
  event.respondWith(
    caches.match(request).then(function (hit) {
      return hit || fetch(request).then(function (response) {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      });
    })
  );
});
