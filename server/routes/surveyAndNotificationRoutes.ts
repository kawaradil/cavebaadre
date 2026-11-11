import { Router, Request, Response } from 'express';
import {
  readLocalStore,
  writeLocalStore,
  restGetDoc,
  restSetDoc,
  restDeleteDoc,
} from '../firestoreRest';
import { toNewReportNotificationPayloadDTO } from '../../src/types/dto';
import { appendAuditLog, authenticateUser } from './authMiddleware';

export const surveyAndNotificationRoutes = Router();

/**
 * 11. Submit Survey Response (Single Participation per Survey Guaranteed)
 */
surveyAndNotificationRoutes.post(
  '/surveys/submit-response',
  authenticateUser,
  async (req: Request, res: Response) => {
    const caller = (req as any).user;
    const citizenUid = caller.uid;
    const { surveyId, selectedOptionsByQuestionId, answers } = req.body || {};

    if (!surveyId || !selectedOptionsByQuestionId || typeof selectedOptionsByQuestionId !== 'object') {
      res.status(400).json({ error: 'معرّف الاستبيان والإجابات مطلوبة.' });
      return;
    }

    const deterministicId = `${surveyId}_${citizenUid}`;
    const nowIso = new Date().toISOString();

    try {
      const existingResp = await restGetDoc('SurveyResponses', deterministicId, caller.idToken);
      if (existingResp) {
        res.status(409).json({
          error: 'لقد قمت بالمشاركة والإجابة على هذا الاستبيان مسبقاً. لا يُسمح بالإجابة أكثر من مرة.',
        });
        return;
      }

      const surveyData = await restGetDoc('surveys', String(surveyId), caller.idToken);
      if (!surveyData) {
        res.status(404).json({ error: 'الاستبيان غير موجود.' });
        return;
      }

      if (
        !surveyData.isPublishedToCitizens &&
        surveyData.status !== 'active' &&
        surveyData.status !== 'published'
      ) {
        res.status(400).json({ error: 'هذا الاستبيان غير منشور حالياً للمواطنين.' });
        return;
      }

      const questionsList = Array.isArray(surveyData.questions) ? surveyData.questions : [];
      const hasMissingAnswers = questionsList.some((q: any) => !selectedOptionsByQuestionId[q.id]);
      if (hasMissingAnswers) {
        res.status(400).json({
          error: 'يرجى الإجابة على جميع أسئلة الاستبيان قبل الإرسال.',
        });
        return;
      }

      const updatedQuestions = questionsList.map((q: any) => {
        const chosenOptId = selectedOptionsByQuestionId[q.id];
        if (!chosenOptId) return q;
        return {
          ...q,
          options: (q.options || []).map((opt: any) =>
            opt.id === chosenOptId ? { ...opt, votesCount: (opt.votesCount || 0) + 1 } : opt
          ),
        };
      });

      const responsePayload = {
        id: deterministicId,
        surveyId: String(surveyId),
        surveyTitle: surveyData.title || '',
        citizenUid,
        ownerUid: citizenUid,
        completed: true,
        submittedAt: nowIso,
        answers: Array.isArray(answers) ? answers : [],
        selectedOptionsByQuestionId,
        createdAt: nowIso,
      };

      await restSetDoc('SurveyResponses', deterministicId, responsePayload, caller.idToken, false);
      await restSetDoc(
        'surveys',
        String(surveyId),
        {
          totalResponses: (surveyData.totalResponses || 0) + 1,
          questions: updatedQuestions,
        },
        caller.idToken,
        true
      );

      res.status(201).json({
        success: true,
        responseId: deterministicId,
        completed: true,
        message: 'تم تسجيل إجابتك في الاستبيان بنجاح.',
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'فشل إرسال إجابة الاستبيان.' });
    }
  }
);

/**
 * 12. Register or Refresh FCM Device Token (Admin & Super Admin Only, Multi-Device Support)
 */
surveyAndNotificationRoutes.post(
  '/notifications/register-token',
  authenticateUser,
  async (req: Request, res: Response) => {
    const caller = (req as any).user;
    if (caller.role !== 'admin' && caller.role !== 'super_admin') {
      res.status(403).json({
        error: 'غير مصرح: تسجيل إشعارات البلاغات الجديدة مخصص لحسابات الإدارة (Admin / Super Admin) فقط.',
      });
      return;
    }

    const { fcmToken, deviceId, platform, userAgent } = req.body || {};
    if (!fcmToken || typeof fcmToken !== 'string' || fcmToken.trim().length < 12) {
      res.status(400).json({ error: 'رمز إشعارات الجهاز (FCM Token) غير صالح.' });
      return;
    }

    const cleanToken = fcmToken.trim();
    const cleanDeviceId =
      deviceId && typeof deviceId === 'string' && deviceId.trim().length > 0
        ? deviceId.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
        : cleanToken.slice(-24).replace(/[^a-zA-Z0-9_-]/g, '');

    const docId = `${caller.uid}_${cleanDeviceId}`;
    const nowIso = new Date().toISOString();

    const tokenDoc = {
      id: docId,
      uid: caller.uid,
      role: caller.role,
      fcmToken: cleanToken,
      deviceId: cleanDeviceId,
      platform: String(platform || 'web').slice(0, 40),
      userAgent: String(userAgent || '').slice(0, 250),
      notificationsEnabled: true,
      updatedAt: nowIso,
    };

    try {
      const store = readLocalStore();
      store.user_fcm_tokens[docId] = tokenDoc;
      writeLocalStore(store);

      await restSetDoc('user_fcm_tokens', docId, tokenDoc, caller.idToken, true);

      res.json({
        success: true,
        tokenId: docId,
        uid: caller.uid,
        role: caller.role,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'فشل حفظ رمز إشعارات الجهاز.' });
    }
  }
);

/**
 * 13. Unregister / Clean Up FCM Device Token on Logout or Token Rotation
 */
surveyAndNotificationRoutes.post(
  '/notifications/unregister-token',
  authenticateUser,
  async (req: Request, res: Response) => {
    const caller = (req as any).user;
    const { deviceId, fcmToken } = req.body || {};

    try {
      const store = readLocalStore();

      if (deviceId && typeof deviceId === 'string') {
        const cleanDeviceId = deviceId.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
        const docId = `${caller.uid}_${cleanDeviceId}`;
        delete store.user_fcm_tokens[docId];
        await restDeleteDoc('user_fcm_tokens', docId, caller.idToken);
      }

      if (fcmToken && typeof fcmToken === 'string') {
        for (const [docId, data] of Object.entries(store.user_fcm_tokens)) {
          if (data.uid === caller.uid && data.fcmToken === fcmToken.trim()) {
            delete store.user_fcm_tokens[docId];
            await restDeleteDoc('user_fcm_tokens', docId, caller.idToken);
          }
        }
      }

      writeLocalStore(store);
      res.json({ success: true, message: 'تم حذف رمز إشعارات الجهاز عند تسجيل الخروج.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'فشل تنظيف رمز الإشعارات.' });
    }
  }
);

/**
 * 14. Server-Side FCM Notification Dispatcher for Newly Created Reports
 */
surveyAndNotificationRoutes.post(
  '/notifications/notify-new-report',
  authenticateUser,
  async (req: Request, res: Response) => {
    const caller = (req as any).user;
    const { reportId } = req.body || {};
    if (!reportId || typeof reportId !== 'string') {
      res.status(400).json({ error: 'معرّف البلاغ مطلوب لإرسال الإشعار للإدارة.' });
      return;
    }

    const cleanReportId = reportId.trim();
    const nowIso = new Date().toISOString();

    try {
      const store = readLocalStore();
      if (store.notification_dispatch_locks[cleanReportId]?.dispatched === true) {
        res.json({
          success: true,
          dispatched: false,
          alreadyDispatched: true,
          message: 'تم إرسال إشعار هذا البلاغ مسبقاً (منع تكرار الإشعار مفعّل).',
        });
        return;
      }

      const reportData = await restGetDoc('reports', cleanReportId, caller.idToken);
      if (!reportData) {
        res.status(404).json({ error: 'البلاغ غير محفوظ في قاعدة البيانات.' });
        return;
      }

      const lockDoc = {
        reportId: cleanReportId,
        dispatched: true,
        dispatchedAt: nowIso,
      };
      store.notification_dispatch_locks[cleanReportId] = lockDoc;
      writeLocalStore(store);
      await restSetDoc('notification_dispatch_locks', cleanReportId, lockDoc, caller.idToken, true);

      const sanitizedPayload = toNewReportNotificationPayloadDTO({
        id: cleanReportId,
        trackingCode: reportData.trackingCode || cleanReportId,
        title: reportData.title || 'بلاغ ميداني جديد',
        sector: reportData.sector || 'other',
        createdAt: reportData.createdAt || nowIso,
      });

      const adminUids = new Set<string>();
      Object.keys(store.admins).forEach((uid) => adminUids.add(uid));
      Object.keys(store.super_admins).forEach((uid) => adminUids.add(uid));
      Object.entries(store.users).forEach(([uid, u]) => {
        if ((u.role === 'admin' || u.role === 'super_admin') && !u.isBlocked) {
          adminUids.add(uid);
        }
      });

      const validTargetTokens: Array<{ docId: string; uid: string; fcmToken: string; deviceId: string }> = [];
      const invalidTokenDocIds: string[] = [];
      const seenTokens = new Set<string>();

      for (const [docId, data] of Object.entries(store.user_fcm_tokens)) {
        const uid = String(data.uid || '');
        const token = String(data.fcmToken || '').trim();
        if (!uid || !adminUids.has(uid)) continue;

        const isInvalidToken =
          !token ||
          token.length < 12 ||
          token.startsWith('INVALID_') ||
          token.startsWith('EXPIRED_') ||
          data.isInvalid === true;

        if (isInvalidToken) {
          invalidTokenDocIds.push(docId);
          continue;
        }

        if (data.notificationsEnabled !== false && !seenTokens.has(token)) {
          seenTokens.add(token);
          validTargetTokens.push({
            docId,
            uid,
            fcmToken: token,
            deviceId: String(data.deviceId || ''),
          });
        }
      }

      if (invalidTokenDocIds.length > 0) {
        invalidTokenDocIds.forEach((id) => delete store.user_fcm_tokens[id]);
        writeLocalStore(store);
      }

      appendAuditLog(
        {
          action: 'NEW_REPORT_FCM_DISPATCHED',
          reportId: sanitizedPayload.reportId,
          trackingCode: sanitizedPayload.trackingCode,
          sector: sanitizedPayload.sector,
          adminAccountsCount: adminUids.size,
          targetAdminUids: Array.from(adminUids),
          deviceTokensCount: validTargetTokens.length,
          invalidTokensRemoved: invalidTokenDocIds.length,
          payload: sanitizedPayload,
          timestamp: nowIso,
        },
        caller.idToken
      );

      res.json({
        success: true,
        dispatched: true,
        alreadyDispatched: false,
        adminAccountsCount: adminUids.size,
        targetAdminUids: Array.from(adminUids),
        deviceTokensCount: validTargetTokens.length,
        invalidTokensRemoved: invalidTokenDocIds.length,
        payload: sanitizedPayload,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'فشل إرسال إشعار البلاغ الجديد للإدارة.' });
    }
  }
);

/**
 * 16. Cloud Contact Settings (Read by all, Updated only by Admin & Super Admin)
 */
const DEFAULT_CONTACT_SETTINGS = {
  whatsappReportsNumber: '9647749019911',
  contactPhone: '9647749019911',
  contactEmail: 'cavebaadre@gmail.com',
};

surveyAndNotificationRoutes.get('/settings/contact', async (_req: Request, res: Response) => {
  try {
    const store = readLocalStore();
    const settings = {
      whatsappReportsNumber: '9647749019911',
      contactPhone: '9647749019911',
      contactEmail: 'cavebaadre@gmail.com',
      updatedAt: null,
    };

    store.system_config.contact_settings = settings;
    writeLocalStore(store);

    res.json({ success: true, settings });
  } catch {
    res.json({ success: true, settings: DEFAULT_CONTACT_SETTINGS });
  }
});

surveyAndNotificationRoutes.post(
  '/settings/contact',
  authenticateUser,
  async (req: Request, res: Response) => {
    const caller = (req as any).user;
    if (caller.role !== 'admin' && caller.role !== 'super_admin') {
      res.status(403).json({ error: 'غير مصرح.' });
      return;
    }

    const fixedWa = '9647749019911';
    const nowIso = new Date().toISOString();
    const updatedSettings = {
      id: 'contact_settings',
      whatsappReportsNumber: fixedWa,
      contactPhone: fixedWa,
      contactEmail: 'cavebaadre@gmail.com',
      updatedBy: caller.uid,
      updatedAt: nowIso,
    };

    try {
      const store = readLocalStore();
      store.system_config.contact_settings = updatedSettings;
      writeLocalStore(store);

      await restSetDoc('system_config', 'contact_settings', updatedSettings, caller.idToken, true);

      appendAuditLog(
        {
          action: 'CONTACT_SETTINGS_UPDATED',
          actorUid: caller.uid,
          actorEmail: caller.email,
          actorRole: caller.role,
          settings: {
            whatsappReportsNumber: fixedWa,
            contactPhone: fixedWa,
            contactEmail: cleanEmail,
          },
          timestamp: nowIso,
        },
        caller.idToken
      );

      res.json({
        success: true,
        settings: updatedSettings,
      });
    } catch {
      res.status(500).json({ error: 'فشل حفظ إعدادات الاتصال.' });
    }
  }
);
