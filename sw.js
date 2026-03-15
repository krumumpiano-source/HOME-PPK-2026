// HOME PPK 2026 — Service Worker v1
var CACHE_NAME = 'ppk-v20260313H';
var PRECACHE = [
  './',
  './dashboard.html',
  './login.html',
  './ppk-theme.css',
  './ppk-nav.js',
  './ppk-app.js',
  './ppk-api.js',
  './ppk-utils.js',
  './ppk-pwa.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './supabase/config.js',
  './supabase/supabase.min.js'
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
  // Skip non-GET and Supabase API calls
  if (e.request.url.includes('supabase.co') || e.request.method !== 'GET') return;
  // JS/CSS: network-first (ป้องกัน stale code หลัง deploy)
  var isCode = e.request.url.match(/\.(js|css)(\?|$)/);
  if (isCode) {
    e.respondWith(
      fetch(e.request).then(function(resp) {
        if (resp && resp.status === 200) {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
        }
        return resp;
      }).catch(function() { return caches.match(e.request); })
    );
    return;
  }
  // HTML/images: network-first with cache fallback
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

