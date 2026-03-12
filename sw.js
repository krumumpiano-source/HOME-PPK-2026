// HOME PPK 2026 — Service Worker v1
var CACHE_NAME = 'ppk-v20260312k';
var PRECACHE = [
  './',
  './dashboard.html',
  './login.html',
  './ppk-theme.css',
  './ppk-nav.js',
  './ppk-app.js',
  './ppk-api.js',
  './ppk-utils.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './ppk-pwa.js'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE);
    }).then(function() { self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  // Network-first for API, cache-first for assets
  if (e.request.url.includes('supabase.co') || e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function(resp) {
      if (resp && resp.status === 200) {
        var clone = resp.clone();
        caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
      }
      return resp;
    }).catch(function() {
      return caches.match(e.request);
    })
  );
});
