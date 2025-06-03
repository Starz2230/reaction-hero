// Minimaler Service Worker für Offline-Caching

const CACHE_NAME = 'reaction-hero-cache-v1';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// Beim Install event: alle wichtigen Dateien in den Cache legen
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Beim Activate event: alte Caches löschen, falls nötig
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Beim Fetch event: versuche zuerst aus dem Cache, sonst hole aus dem Netzwerk
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedRes => {
      if (cachedRes) {
        return cachedRes;
      }
      return fetch(event.request);
    })
  );
});
