/* Pattern 10 — Service Worker：離線可用（先給快取、背景更新）
 * 改了程式之後，把 VERSION 加一，使用者重新整理兩次就會換成新版。 */
const VERSION = 'p10-v3';
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/util.js', 'js/verbs.js', 'js/engine.js', 'js/rules.js', 'js/content.js', 'js/vocab.js', 'js/srs.js', 'js/session.js', 'js/store.js',
  'js/stats.js', 'js/speech.js', 'js/ui.js', 'js/runner.js', 'js/views.js', 'js/admin.js', 'js/app.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.open(VERSION).then((cache) => cache.match(req, { ignoreSearch: true }).then((hit) => {
      const net = fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }))
  );
});
