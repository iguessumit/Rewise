/* sw.js - cleanup only. An earlier version installed an offline helper on your phone.
   This file removes it and its saved copies, then reloads the page. The app no longer uses a service worker. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    var keys = await caches.keys();
    await Promise.all(keys.map(function (k) { return caches.delete(k); }));
    await self.registration.unregister();
    var wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    wins.forEach(function (c) { try { c.navigate(c.url); } catch (err) {} });
  })());
});
