// Old HOME PPK service worker replacement: remove caches, unregister, send open pages to the new site.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    var ks = await caches.keys(); await Promise.all(ks.map(function (k) { return caches.delete(k); }));
    await self.registration.unregister();
    var cs = await self.clients.matchAll({ type: 'window' });
    cs.forEach(function (c) {
      var p = new URL(c.url).pathname.replace(/^\/HOME-PPK-2026\/?/i, '');
      c.navigate('https://home-ppk-2026.pages.dev/' + p);
    });
  })());
});
