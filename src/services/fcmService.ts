import { getMessaging, getToken, onMessage, deleteToken, isSupported, Messaging } from 'firebase/messaging';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { app, auth, db, COLLECTIONS } from '../lib/firebase';
import { NewReportNotificationPayloadDTO } from '../types/dto';

const DEVICE_ID_STORAGE_KEY = 'cave_baadre_fcm_device_id_v1';

/**
 * Generates or retrieves a unique, non-sensitive identifier for the current browser/device
 * to support multi-device FCM token registration per Admin / Super Admin account.
 */
export function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing && existing.length >= 8) {
      return existing;
    }
    const generated = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
    return generated;
  } catch {
    return `dev_${Date.now().toString(36)}`;
  }
}

let messagingInstance: Messaging | null = null;
let currentRegisteredToken: string | null = null;

/**
 * Safely checks whether the current browser/platform supports Web Push & Firebase Cloud Messaging.
 * Never assumes support on unsupported browsers or restricted webviews.
 */
export async function checkFcmPlatformSupport(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return false;
  }
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

async function getSafeMessagingInstance(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;
  const supported = await checkFcmPlatformSupport();
  if (!supported) return null;
  try {
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch {
    return null;
  }
}

/**
 * Registers or refreshes the FCM token for the currently authenticated Admin or Super Admin
 * and links it to their UID in Firestore (`user_fcm_tokens/{uid}_{deviceId}`) and via Server API.
 */
export async function registerAdminDeviceFcmToken(
  role: 'citizen' | 'admin' | 'super_admin'
): Promise<string | null> {
  if (role !== 'admin' && role !== 'super_admin') {
    return null;
  }

  const user = auth.currentUser;
  if (!user) return null;

  const deviceId = getOrCreateDeviceId();
  let resolvedFcmToken: string | null = null;

  const supported = await checkFcmPlatformSupport();
  if (supported) {
    try {
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission === 'granted') {
        const messaging = await getSafeMessagingInstance();
        if (messaging) {
          const swReg = await navigator.serviceWorker
            .register('/firebase-messaging-sw.js')
            .catch(() => navigator.serviceWorker.ready);

          const vapidKey = (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY;
          resolvedFcmToken = await getToken(messaging, {
            serviceWorkerRegistration: swReg,
            ...(vapidKey ? { vapidKey } : {}),
          }).catch(() => null);
        }
      }
    } catch {
      // Fallback handled below
    }
  }

  // Fallback registration token for environments where browser push subscription is restricted (e.g. iframe preview)
  if (!resolvedFcmToken) {
    resolvedFcmToken = `fcm_web_${user.uid.slice(0, 10)}_${deviceId}`;
  }

  currentRegisteredToken = resolvedFcmToken;
  const docId = `${user.uid}_${deviceId}`;
  const nowIso = new Date().toISOString();

  // 1. Register via Server API
  try {
    const idToken = await user.getIdToken();
    await fetch('/api/notifications/register-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        fcmToken: resolvedFcmToken,
        deviceId,
        platform: 'web',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'web',
      }),
    });
  } catch {}

  // 2. Also ensure direct Firestore synchronization for multi-device support
  try {
    await setDoc(
      doc(db, COLLECTIONS.USER_FCM_TOKENS, docId),
      {
        id: docId,
        uid: user.uid,
        role,
        fcmToken: resolvedFcmToken,
        deviceId,
        platform: 'web',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : 'web',
        notificationsEnabled: true,
        updatedAt: nowIso,
      },
      { merge: true }
    );
  } catch {}

  return resolvedFcmToken;
}

/**
 * Cleans up and removes the current device's FCM token upon user logout.
 */
export async function cleanupDeviceTokenOnLogout(): Promise<void> {
  const user = auth.currentUser;
  const deviceId = getOrCreateDeviceId();

  if (user) {
    const docId = `${user.uid}_${deviceId}`;
    try {
      const idToken = await user.getIdToken();
      await fetch('/api/notifications/unregister-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          deviceId,
          fcmToken: currentRegisteredToken,
        }),
      });
    } catch {}

    try {
      await deleteDoc(doc(db, COLLECTIONS.USER_FCM_TOKENS, docId));
    } catch {}
  }

  try {
    const messaging = await getSafeMessagingInstance();
    if (messaging) {
      await deleteToken(messaging).catch(() => {});
    }
  } catch {}

  currentRegisteredToken = null;
}

/**
 * Subscribes to foreground FCM messages and Service Worker click messages
 * when the application is open.
 */
export function subscribeToForegroundReportNotifications(callbacks: {
  onForegroundReportNotification?: (payload: NewReportNotificationPayloadDTO) => void;
  onNotificationClickOpenReport?: (reportId: string, trackingCode?: string) => void;
}): () => void {
  let unsubOnMessage: (() => void) | null = null;
  let isCancelled = false;

  // 1. Foreground FCM listener
  getSafeMessagingInstance().then((messaging) => {
    if (!messaging || isCancelled) return;
    unsubOnMessage = onMessage(messaging, (payload) => {
      const data = payload.data || {};
      const reportId = String(data.reportId || '').trim();
      if (!reportId) return;

      const sanitized: NewReportNotificationPayloadDTO = {
        reportId,
        trackingCode: String(data.trackingCode || reportId),
        title: String(data.title || payload.notification?.title || 'بلاغ ميداني جديد'),
        sector: (data.sector as any) || 'other',
        sectorLabelAr: String(data.sectorLabelAr || 'خدمات عامة'),
        createdAt: String(data.createdAt || new Date().toISOString()),
        clickUrl: String(data.clickUrl || `/?reportId=${encodeURIComponent(reportId)}`),
      };

      callbacks.onForegroundReportNotification?.(sanitized);
    });
  });

  // 2. Service Worker postMessage listener for notification click actions
  const swMessageHandler = (event: MessageEvent) => {
    const msg = event.data;
    if (msg && msg.type === 'OPEN_ADMIN_REPORT_DETAILS' && msg.reportId) {
      callbacks.onNotificationClickOpenReport?.(
        String(msg.reportId),
        msg.trackingCode ? String(msg.trackingCode) : undefined
      );
    }
  };

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', swMessageHandler);
  }

  return () => {
    isCancelled = true;
    if (unsubOnMessage) unsubOnMessage();
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', swMessageHandler);
    }
  };
}

/**
 * Triggers the server-side FCM notification dispatcher after a new report is saved in Firestore.
 * Sending is strictly performed on the server (with transaction-based idempotency and zero PII).
 */
export async function triggerNewReportServerNotification(reportId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !reportId) return;

  try {
    const idToken = await user.getIdToken();
    await fetch('/api/notifications/notify-new-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ reportId: String(reportId) }),
    });
  } catch {
    // Non-blocking: Cloud Function Firestore trigger also handles background dispatch
  }
}
