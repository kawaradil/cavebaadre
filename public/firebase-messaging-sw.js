/* eslint-disable no-restricted-globals */
/**
 * Firebase Cloud Messaging (FCM) Service Worker for ÇAVÊ BAADRÊ
 * Handles background push notifications for Admin & Super Admin accounts
 * and routes notification clicks directly to the report details modal inside the Admin dashboard.
 */

const APP_ICON = '/assets/aistudio/file_0000000029c881f5afb4aa954e9b4fb8_c75b5b84.png';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Background Push Event Handler
 * Displays sanitized notification containing ONLY:
 * - عنوان البلاغ (title)
 * - نوع البلاغ (sectorLabelAr)
 * - تاريخ البلاغ (createdAt)
 * - معرف البلاغ (reportId / trackingCode)
 */
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
  const reportTitle = String(
    data.title || notification.title || 'بلاغ ميداني جديد وارد'
  ).trim();
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

  const options = {
    body: notifBody,
    icon: APP_ICON,
    badge: APP_ICON,
    dir: 'rtl',
    lang: 'ar',
    tag: reportId ? `baadre-report-${reportId}` : 'baadre-admin-report',
    renotify: true,
    data: {
      reportId,
      trackingCode,
      sector: data.sector || '',
      createdAt: data.createdAt || '',
      clickUrl,
      clickAction: 'OPEN_ADMIN_REPORT_DETAILS',
    },
  };

  event.waitUntil(self.registration.showNotification(notifTitle, options));
});

/**
 * Notification Click Handler
 * Opens or focuses the application window and instructs it to open the report details
 * inside the organization Admin interface after verifying the user's Admin/Super Admin role.
 */
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
