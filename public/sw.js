const CACHE_NAME = 'baadre-cave-pwa-v5';
const ASSETS_TO_CACHE = [
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

// Install event - Cache core static icons
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

// Fetch event - Network-first for JS/CSS/HTML to prevent stale bundle mismatch, cache-first for static images/fonts
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

  // STRICT BYPASS: Never intercept or cache Google, Firebase, reCAPTCHA, or external CDN requests
  if (
    url.hostname.includes('google.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('recaptcha.net') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('unpkg.com') ||
    url.pathname.includes('/recaptcha/')
  ) {
    return;
  }

  // Network-first for JS and CSS bundles so new deployments never mix stale chunks
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type !== 'opaque'
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache).catch(() => {});
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Same-origin static images, icons, or fonts
  if (
    url.origin === self.location.origin &&
    (url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.webp') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.woff') ||
      url.pathname.endsWith('.woff2') ||
      url.pathname.endsWith('.ttf'))
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const networkFetch = fetch(event.request)
          .then((networkResponse) => {
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              networkResponse.type !== 'opaque'
            ) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache).catch(() => {});
              });
            }
            return networkResponse;
          })
          .catch((fetchErr) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return Promise.reject(fetchErr);
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

// Background FCM Push & Notification Click Support for Admin & Super Admin Accounts
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const data = payload.data || payload || {};
  const notification = payload.notification || {};
  const reportId = String(data.reportId || '').trim();
  const trackingCode = String(data.trackingCode || reportId || '').trim();
  const sectorLabel = String(data.sectorLabelAr || data.sector || 'خدمات عامة').trim();
  const reportTitle = String(data.title || notification.title || 'بلاغ ميداني جديد').trim();
  const createdAt = String(data.createdAt || '').slice(0, 16).replace('T', ' ');
  const clickUrl = data.clickUrl || (reportId ? `/?reportId=${encodeURIComponent(reportId)}` : '/');

  const notifTitle =
    notification.title ||
    (trackingCode
      ? `بلاغ جديد (${sectorLabel}) - #${trackingCode}`
      : `بلاغ جديد (${sectorLabel})`);
  const notifBody =
    notification.body ||
    (createdAt ? `${reportTitle} • التاريخ: ${createdAt}` : reportTitle);

  event.waitUntil(
    self.registration.showNotification(notifTitle, {
      body: notifBody,
      icon: '/assets/aistudio/file_0000000029c881f5afb4aa954e9b4fb8_c75b5b84.png',
      badge: '/assets/aistudio/file_0000000029c881f5afb4aa954e9b4fb8_c75b5b84.png',
      dir: 'rtl',
      lang: 'ar',
      tag: reportId ? `baadre-report-${reportId}` : 'baadre-admin-report',
      data: {
        reportId,
        trackingCode,
        clickUrl,
        clickAction: 'OPEN_ADMIN_REPORT_DETAILS',
      },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const reportId = String(notifData.reportId || '').trim();
  const trackingCode = String(notifData.trackingCode || '').trim();
  const targetUrl =
    notifData.clickUrl ||
    (reportId ? `/?reportId=${encodeURIComponent(reportId)}` : '/');

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.postMessage({
              type: 'OPEN_ADMIN_REPORT_DETAILS',
              reportId,
              trackingCode,
            });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return null;
      })
  );
});

