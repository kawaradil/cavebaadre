const SW_BUILD_ID = '__SW_BUILD_ID__';
const CACHE_NAME = `baadre-cave-pwa-${SW_BUILD_ID}`;
const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png',
  '/pwa-maskable-512.png',
  '/pwa-192.png',
  '/pwa-512.png',
  '/apple-touch-icon.png',
  '/favicon.png',
  '/assets/aistudio/cave_baadre_logo.png'
];

// Install event - Fetch fresh core icons bypassing HTTP cache and activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(
        ASSETS_TO_CACHE.map((assetUrl) =>
          fetch(new Request(assetUrl, { cache: 'reload' }))
            .then((res) => {
              if (res && res.status === 200) {
                return cache.put(assetUrl, res);
              }
              return undefined;
            })
            .catch(() => {})
        )
      );
    })
  );
});

// Activate event - Clean up ALL old version caches immediately & claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      )
      .then((clients) => {
        for (const client of clients) {
          client.postMessage({
            type: 'SW_ACTIVATED_NEW_VERSION',
            buildId: SW_BUILD_ID,
          });
        }
      })
  );
});

// Support explicit update/purge commands from the client
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (data.type === 'PURGE_CACHES') {
    event.waitUntil(
      caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))))
    );
  }
});

// Fetch event - Always network-fresh for HTML/JS/CSS & version checks; offline fallback when disconnected
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  // STRICT BYPASS: Never cache API routes, live version checks, Service Workers, Vite dev modules, or external APIs
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname === '/version.json' ||
    url.pathname === '/sw.js' ||
    url.pathname === '/firebase-messaging-sw.js' ||
    url.pathname === '/manifest.json' ||
    url.pathname.includes('/node_modules/') ||
    url.pathname.includes('/@vite/') ||
    url.pathname.includes('/@fs/') ||
    url.pathname.includes('/@id/') ||
    url.pathname.includes('/src/') ||
    url.searchParams.has('v') ||
    url.searchParams.has('t') ||
    url.hostname.includes('ais-dev') ||
    url.hostname.includes('localhost') ||
    url.hostname === '127.0.0.1' ||
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

  // HTML Navigation: Always fetch fresh index.html with no-store when online; fall back to cache ONLY when offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/', clone).catch(() => {});
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedRoot = await caches.match('/');
          if (cachedRoot) return cachedRoot;
          const cachedIndex = await caches.match('/index.html');
          return cachedIndex || Response.error();
        })
    );
    return;
  }

  // JS and CSS bundles: Network-first so new deployments never mix stale chunks
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

  // Same-origin static images, icons, or fonts: Network-revalidated with fast cache fallback
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
            if (cachedResponse) return cachedResponse;
            return Promise.reject(fetchErr);
          });

        return cachedResponse || networkFetch;
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
      icon: '/pwa-icon-192.png',
      badge: '/pwa-icon-192.png',
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
