// Cache only a generic offline page and public installation assets.
// Account APIs, private photos, auth responses and application data never enter Cache Storage.
const CACHE = 'nlocki-public-offline-v1';
const PUBLIC_FILES = ['/offline.html', '/offline.css', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png', '/icons/apple-touch-icon.png', '/icons/favicon.png', '/manifest.webmanifest'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PUBLIC_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('nlocki-public-offline-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(async () => (await caches.match('/offline.html')) || Response.error()));
  } else if (PUBLIC_FILES.includes(url.pathname)) {
    event.respondWith(fetch(req).catch(() => caches.match(url.pathname)));
  }
});
