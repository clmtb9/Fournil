const CACHE_NAME = 'fournil-v1';

const LOCAL_ASSETS = ['./', './index.html', './manifest.json', './icons/icon-192.svg', './icons/icon-512.svg'];
const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Mono:wght@300;400;500&family=Lora:ital,wght@0,400;0,600;1,400&display=swap';

// Install: pre-cache local assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache local assets reliably; skip external fonts on failure
      return cache.addAll(LOCAL_ASSETS)
        .then(() => cache.add(GOOGLE_FONTS_URL).catch(() => {}));
    }).then(() => self.skipWaiting())
  );
});

// Activate: remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for local assets, network-first for others
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Cache-first strategy for same-origin and Google Fonts
  const isSameOrigin = url.origin === self.location.origin;
  const isGoogleFonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  if (isSameOrigin || isGoogleFonts) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (!response || !response.ok) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
  }
});
