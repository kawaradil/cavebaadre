const CACHE_NAME = 'baadre-cave-pwa-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-icon.svg',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png',
  '/pwa-maskable-512.png',
  '/pwa-192.png',
  '/pwa-512.png',
  '/apple-touch-icon.png',
  '/favicon.png',
  '/assets/aistudio/cave_baadre_logo.png'
];

// Install event - Cache core app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('PWA Cache addAll warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate event - Clean up old caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Robust Stale-while-revalidate for static assets & CDNs
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip non-http/https protocols (e.g. chrome-extension://)
  if (!url.protocol.startsWith('http')) return;

  // STRICT BYPASS: Never intercept or cache Vite development files, HMR, or prebundled modules
  if (
    url.pathname.includes('/node_modules/') ||
    url.pathname.includes('/@vite/') ||
    url.pathname.includes('/@fs/') ||
    url.pathname.includes('/@id/') ||
    url.pathname.includes('/src/') ||
    url.searchParams.has('v') ||
    url.searchParams.has('t') ||
    url.hostname.includes('ais-dev') ||
    url.hostname.includes('localhost') ||
    url.hostname === '127.0.0.1'
  ) {
    return;
  }

  // STRICT BYPASS: Never intercept or cache Google, Firebase, or reCAPTCHA requests
  if (
    url.hostname.includes('google.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('recaptcha.net') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.pathname.includes('/recaptcha/')
  ) {
    return;
  }

  // Static assets or CDN resources (Google Fonts, Unpkg Leaflet, Web Fonts, Images)
  if (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.ttf') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('unpkg.com')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // Network fetch promise with safe handling of CORS and opaque responses
        const networkFetch = fetch(event.request)
          .then((networkResponse) => {
            // Check for valid response: status 200 or opaque (CORS no-cors third party resources)
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache).catch(() => {});
              });
            }
            return networkResponse;
          })
          .catch((fetchErr) => {
            // If network fails and we had a cached version, silently return it
            if (cachedResponse) {
              return cachedResponse;
            }
            // Otherwise propagate or return null to avoid crashing worker
            return cachedResponse || Promise.reject(fetchErr);
          });

        return cachedResponse || networkFetch;
      }).catch(async () => {
        const fallback = await caches.match(event.request);
        return fallback || fetch(event.request);
      })
    );
    return;
  }

  // Network first with offline fallback for html and navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/') || caches.match('/index.html');
      })
    );
  }
});
