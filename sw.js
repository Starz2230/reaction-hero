self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('v1').then(c => c.addAll([
      './', '/index.html', '/style.css',
      '/app.js', '/manifest.json', '/firebase-config.js',
      'https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js',
      'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js'
    ]))
  );
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
