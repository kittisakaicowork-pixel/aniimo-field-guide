// Network-first service worker: always fresh when online, cached copy when offline.
const CACHE = 'aniimo-v54';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html', './data.js', './thumbs.js', './skills.webp', './manifest.webmanifest', './icon-192.png', './favicon.png'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  // revalidate with the server every time (cheap 304s) so a new deploy shows up on the next load
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(res => {
    const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res;
  }).catch(() => caches.match(e.request)));
});
