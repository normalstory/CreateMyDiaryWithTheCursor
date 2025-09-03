const CACHE_NAME = 'internet-install-v1';
const urlsToCache = [
  '/internet/internet.html',
  '/internet/manifest.json',
  '/resources/favicon-32x32.png',
  '/resources/myIcon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
