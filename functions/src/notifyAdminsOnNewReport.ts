import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const SECTOR_AR_LABELS: Record<string, string> = {
  roads: 'الشوارع والطرق',
  sewage: 'الشبكات والمجاري',
  sanitation: 'الحدائق والنظافة',
  lighting: 'الإنارة والأعمدة',
  water: 'شبكات المياه',
  other: 'خدمات بلدية أخرى',
};

export interface SanitizedReportNotificationPayload {
  reportId: string;
  trackingCode: string;
  title: string;
  sector: string;
  sectorLabelAr: string;
  createdAt: string;
  clickUrl: string;
}

/**
 * Builds a strictly sanitized notification payload for a newly created report.
 * Contains ONLY:
 * - عنوان البلاغ (title)
 * - نوع البلاغ (sector / sectorLabelAr)
 * - تاريخ البلاغ (createdAt)
 * - معرف البلاغ (reportId / trackingCode)
 * Strictly excludes any sensitive citizen PII (phone, email, full name, WhatsApp).
 */
export function buildSanitizedReportNotificationPayload(
  reportId: string,
  reportData: Record<string, any>
): SanitizedReportNotificationPayload {
  const cleanId = String(reportId || reportData.id || '').trim();
  const cleanSector = String(reportData.sector || 'other').trim();
  const sectorLabelAr = SECTOR_AR_LABELS[cleanSector] || 'خدمات عامة';
  const cleanTitle = String(reportData.title || 'بلاغ ميداني جديد')
    .trim()
    .slice(0, 140);
  const trackingCode = String(reportData.trackingCode || cleanId).trim();
  const createdAt = String(reportData.createdAt || new Date().toISOString());

  return {
    reportId: cleanId,
    trackingCode,
    title: cleanTitle,
    sector: cleanSector,
    sectorLabelAr,
    createdAt,
    clickUrl: `/?reportId=${encodeURIComponent(cleanId)}`,
  };
}

/**
 * Core dispatcher that sends FCM notifications for a new report to ALL Admin and Super Admin
 * users and all their registered devices, with strict idempotency and invalid token cleanup.
 */
export async function dispatchNewReportNotificationToAllAdmins(
  reportId: string,
  reportData?: Record<string, any>
): Promise<{
  dispatched: boolean;
  alreadyDispatched: boolean;
  adminAccountsCount: number;
  deviceTokensCount: number;
  successCount: number;
  failureCount: number;
  invalidTokensRemoved: number;
  payload: SanitizedReportNotificationPayload | null;
}> {
  const db = admin.firestore();
  const cleanReportId = String(reportId || '').trim();
  if (!cleanReportId) {
    throw new functions.https.HttpsError('invalid-argument', 'معرّف البلاغ مطلوب.');
  }

  const reportRef = db.collection('reports').doc(cleanReportId);
  const lockRef = db.collection('notification_dispatch_locks').doc(cleanReportId);
  const nowIso = new Date().toISOString();

  // 1. Verify report exists in Firestore & enforce Idempotency via Transaction
  const transactionResult = await db.runTransaction(async (transaction) => {
    const lockSnap = await transaction.get(lockRef);
    if (lockSnap.exists && lockSnap.data()?.dispatched === true) {
      return { alreadyDispatched: true, reportDoc: null };
    }

    const reportSnap = await transaction.get(reportRef);
    const resolvedReportData = reportSnap.exists ? reportSnap.data() : reportData;
    if (!resolvedReportData) {
      throw new functions.https.HttpsError(
        'not-found',
        'البلاغ غير محفوظ في قاعدة البيانات.'
      );
    }

    transaction.set(lockRef, {
      reportId: cleanReportId,
      dispatched: true,
      dispatchedAt: nowIso,
    });

    return { alreadyDispatched: false, reportDoc: resolvedReportData };
  });

  if (transactionResult.alreadyDispatched || !transactionResult.reportDoc) {
    return {
      dispatched: false,
      alreadyDispatched: true,
      adminAccountsCount: 0,
      deviceTokensCount: 0,
      successCount: 0,
      failureCount: 0,
      invalidTokensRemoved: 0,
      payload: null,
    };
  }

  // 2. Build sanitized payload (Zero PII)
  const payload = buildSanitizedReportNotificationPayload(
    cleanReportId,
    transactionResult.reportDoc
  );

  // 3. Collect ALL Admin & Super Admin UIDs without exception
  const adminUids = new Set<string>();

  const [adminsSnap, superAdminsSnap, usersAdminSnap] = await Promise.all([
    db.collection('admins').get(),
    db.collection('super_admins').get(),
    db
      .collection('users')
      .where('role', 'in', ['admin', 'super_admin'])
      .get(),
  ]);

  adminsSnap.forEach((docSnap) => adminUids.add(docSnap.id));
  superAdminsSnap.forEach((docSnap) => adminUids.add(docSnap.id));
  usersAdminSnap.forEach((docSnap) => {
    const data = docSnap.data();
    if (!data.isBlocked) {
      adminUids.add(docSnap.id);
    }
  });

  // 4. Fetch all active FCM device tokens belonging to those Admin & Super Admin UIDs
  const tokensSnap = await db.collection('user_fcm_tokens').get();
  const targetTokenDocs: Array<{ docId: string; fcmToken: string; uid: string }> = [];
  const seenTokens = new Set<string>();

  tokensSnap.forEach((docSnap) => {
    const data = docSnap.data();
    const uid = String(data.uid || '');
    const token = String(data.fcmToken || '').trim();
    if (
      uid &&
      adminUids.has(uid) &&
      token.length > 10 &&
      data.notificationsEnabled !== false &&
      !seenTokens.has(token)
    ) {
      seenTokens.add(token);
      targetTokenDocs.push({
        docId: docSnap.id,
        fcmToken: token,
        uid,
      });
    }
  });

  let successCount = 0;
  let failureCount = 0;
  let invalidTokensRemoved = 0;

  // 5. Dispatch multicast notifications in chunks of 500 (FCM limit)
  if (targetTokenDocs.length > 0) {
    const formattedDate = payload.createdAt.slice(0, 16).replace('T', ' ');
    const notificationTitle = `بلاغ جديد (${payload.sectorLabelAr}) - #${payload.trackingCode}`;
    const notificationBody = `${payload.title} • التاريخ: ${formattedDate}`;

    for (let i = 0; i < targetTokenDocs.length; i += 500) {
      const chunk = targetTokenDocs.slice(i, i + 500);
      const tokensList = chunk.map((item) => item.fcmToken);

      const multicastMessage: admin.messaging.MulticastMessage = {
        tokens: tokensList,
        notification: {
          title: notificationTitle,
          body: notificationBody,
        },
        data: {
          reportId: payload.reportId,
          trackingCode: payload.trackingCode,
          title: payload.title,
          sector: payload.sector,
          sectorLabelAr: payload.sectorLabelAr,
          createdAt: payload.createdAt,
          clickUrl: payload.clickUrl,
          clickAction: 'OPEN_ADMIN_REPORT_DETAILS',
        },
        webpush: {
          fcmOptions: {
            link: payload.clickUrl,
          },
          notification: {
            title: notificationTitle,
            body: notificationBody,
            icon: '/assets/aistudio/file_0000000029c881f5afb4aa954e9b4fb8_c75b5b84.png',
            badge: '/assets/aistudio/file_0000000029c881f5afb4aa954e9b4fb8_c75b5b84.png',
            tag: `baadre-report-${payload.reportId}`,
            data: {
              reportId: payload.reportId,
              trackingCode: payload.trackingCode,
              clickUrl: payload.clickUrl,
            },
          },
        },
      };

      const batchResponse = await admin.messaging().sendEachForMulticast(multicastMessage);
      successCount += batchResponse.successCount;
      failureCount += batchResponse.failureCount;

      // 6. Clean up invalid or expired FCM tokens
      const invalidDocIds: string[] = [];
      batchResponse.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const code = resp.error.code;
          if (
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-argument'
          ) {
            invalidDocIds.push(chunk[idx].docId);
          }
        }
      });

      if (invalidDocIds.length > 0) {
        const cleanupBatch = db.batch();
        invalidDocIds.forEach((docId) => {
          cleanupBatch.delete(db.collection('user_fcm_tokens').doc(docId));
        });
        await cleanupBatch.commit();
        invalidTokensRemoved += invalidDocIds.length;
      }
    }
  }

  // 7. Write Audit Log
  await db.collection('audit_logs').add({
    action: 'NEW_REPORT_FCM_DISPATCHED',
    reportId: payload.reportId,
    trackingCode: payload.trackingCode,
    sector: payload.sector,
    adminAccountsCount: adminUids.size,
    deviceTokensCount: targetTokenDocs.length,
    successCount,
    failureCount,
    invalidTokensRemoved,
    timestamp: nowIso,
  });

  return {
    dispatched: true,
    alreadyDispatched: false,
    adminAccountsCount: adminUids.size,
    deviceTokensCount: targetTokenDocs.length,
    successCount,
    failureCount,
    invalidTokensRemoved,
    payload,
  };
}

/**
 * Firestore Trigger: Automatically fires whenever a new document is created in reports/{reportId}
 */
export const onNewReportCreatedNotifyAdmins = functions.firestore
  .document('reports/{reportId}')
  .onCreate(async (snapshot, context) => {
    const reportId = context.params.reportId;
    const reportData = snapshot.data();
    await dispatchNewReportNotificationToAllAdmins(reportId, reportData);
  });

/**
 * Callable Function: Trigger FCM notification for a newly saved report (Idempotent)
 */
export const notifyAdminsOnNewReport = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'يجب تسجيل الدخول أولاً.');
  }

  const { reportId } = data || {};
  if (!reportId) {
    throw new functions.https.HttpsError('invalid-argument', 'معرّف البلاغ مطلوب.');
  }

  return await dispatchNewReportNotificationToAllAdmins(String(reportId));
});
