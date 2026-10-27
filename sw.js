/* ExpertMoto - service worker (etape 5)
   Strategie : "stale-while-revalidate" pour les fichiers de l'application.
   Pour publier une nouvelle version : changer VERSION ci-dessous. */
'use strict';

var VERSION = 'v0.0.1';
var CACHE_NAME = 'expertmoto-' + VERSION;

// Fichiers indispensables : si l'un manque, l'installation echoue.
var CORE_FILES = [
  './',
  'index.html',
  'css/style.css',
  'js/app.js',
  'manifest.webmanifest'
];

// Fichiers optionnels (icones) : s'ils manquent, on continue.
var OPTIONAL_FILES = [
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-maskable-512.png',
  'assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_FILES).then(function () {
        return Promise.all(OPTIONAL_FILES.map(function (file) {
          return cache.add(file).catch(function () { /* ignore */ });
        }));
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (k) { return k.indexOf('expertmoto-') === 0 && k !== CACHE_NAME; })
              .map(function (k) { return caches.delete(k); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') { return; }

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) { return; }

  event.respondWith(staleWhileRevalidate(event));
});

function staleWhileRevalidate(event) {
  var request = event.request;
  return caches.open(CACHE_NAME).then(function (cache) {
    return cache.match(request, { ignoreSearch: true }).then(function (cached) {
      var network = fetch(request)
        .then(function (response) {
          if (response && response.status === 200) { cache.put(request, response.clone()); }
          return response;
        })
        .catch(function () { return null; });

      if (cached) {
        event.waitUntil(network);
        return cached;
      }

      return network.then(function (response) {
        if (response) { return response; }
        if (request.mode === 'navigate') {
          return cache.match('index.html').then(function (fallback) {
            return fallback || offlineResponse();
          });
        }
        return offlineResponse();
      });
    });
  });
}

function offlineResponse() {
  return new Response('Hors ligne', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}
