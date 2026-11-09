/* sw.js - makes the app work offline and shows "Update available" when a new version is uploaded.
   The cache name uses the version in version.js, so a new version always replaces the old files. */
importScripts('version.js');
var CACHE = 'rq-' + self.APP_VERSION;
var FILES = ['index.html', 'style.css', 'version.js', 'db.js', 'ui.js', 'settings.js', 'chapters-data.js', 'chapters.js', 'notes.js', 'lognotes.js', 'notes-screen.js', 'app.js',
  'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (cache) {
    return Promise.all(FILES.map(function (f) {
      return fetch(new Request(f, { cache: 'reload' })).then(function (r) {
        if (!r.ok) throw new Error('Could not fetch ' + f + ' (' + r.status + ')');
        return cache.put(f, r);
      });
    }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('rq-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(function (cache) {
    /* Opening the app always uses the saved index.html, so every file in one visit is from the same version. */
    var key = req.mode === 'navigate' ? 'index.html' : req;
    return cache.match(key, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).catch(function () { return Response.error(); });
    });
  }));
});
