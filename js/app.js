/* ExpertMoto - etape 0
   Affiche l'etat technique de l'application et enregistre le service worker. */
(function () {
  'use strict';

  var APP_VERSION = '0.0.1';
  var CACHE_PREFIX = 'expertmoto-';

  function setStatus(id, text, state) {
    var el = document.getElementById(id);
    if (!el) { return; }
    el.textContent = text;
    el.setAttribute('data-state', state);
  }

  function checkVersion() {
    setStatus('chk-version', 'v' + APP_VERSION, 'info');
    var f = document.getElementById('footer-version');
    if (f) { f.textContent = APP_VERSION; }
  }

  function checkHttps() {
    var secure = window.isSecureContext === true;
    setStatus('chk-https', secure ? 'Oui' : 'Non', secure ? 'ok' : 'ko');
  }

  function checkNetwork() {
    var online = navigator.onLine;
    setStatus('chk-network', online ? 'En ligne' : 'Hors ligne', online ? 'ok' : 'warn');
  }

  function checkDisplayMode() {
    var standalone =
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true;
    setStatus('chk-mode', standalone ? 'Application installée' : 'Navigateur', standalone ? 'ok' : 'warn');
  }

  function checkCache() {
    if (!('caches' in window)) {
      setStatus('chk-cache', 'Non pris en charge', 'ko');
      return Promise.resolve();
    }
    return caches.keys().then(function (keys) {
      var mine = keys.filter(function (k) { return k.indexOf(CACHE_PREFIX) === 0; });
      if (!mine.length) {
        setStatus('chk-cache', 'Pas encore prêts', 'warn');
        return;
      }
      return caches.open(mine[0]).then(function (cache) {
        return cache.keys().then(function (entries) {
          setStatus('chk-cache', entries.length + ' fichiers', entries.length ? 'ok' : 'warn');
        });
      });
    }).catch(function () {
      setStatus('chk-cache', 'Erreur', 'ko');
    });
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      setStatus('chk-sw', 'Non pris en charge', 'ko');
      setStatus('chk-cache', 'Indisponible', 'ko');
      return;
    }
    navigator.serviceWorker.register('sw.js')
      .then(function () { return navigator.serviceWorker.ready; })
      .then(function () {
        setStatus('chk-sw', 'Actif', 'ok');
        return checkCache();
      })
      .catch(function (err) {
        setStatus('chk-sw', 'Erreur', 'ko');
        setStatus('chk-cache', 'Indisponible', 'ko');
        if (window.console) { console.error('Service worker :', err); }
      });
  }

  function resetAppCache() {
    var msg = document.getElementById('reset-msg');
    if (msg) { msg.textContent = 'Nettoyage en cours…'; }

    var tasks = [];
    if ('serviceWorker' in navigator) {
      tasks.push(
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(regs.map(function (r) { return r.unregister(); }));
        })
      );
    }
    if ('caches' in window) {
      tasks.push(
        caches.keys().then(function (keys) {
          return Promise.all(
            keys.filter(function (k) { return k.indexOf(CACHE_PREFIX) === 0; })
                .map(function (k) { return caches.delete(k); })
          );
        })
      );
    }
    Promise.all(tasks).then(function () {
      if (msg) { msg.textContent = 'Cache vidé. Rechargement…'; }
      setTimeout(function () { window.location.reload(); }, 600);
    }).catch(function () {
      if (msg) { msg.textContent = 'Impossible de vider le cache.'; }
    });
  }

  function init() {
    checkVersion();
    checkHttps();
    checkNetwork();
    checkDisplayMode();
    registerServiceWorker();

    window.addEventListener('online', checkNetwork);
    window.addEventListener('offline', checkNetwork);

    var btn = document.getElementById('btn-reset');
    if (btn) { btn.addEventListener('click', resetAppCache); }
  }

  init();
})();
