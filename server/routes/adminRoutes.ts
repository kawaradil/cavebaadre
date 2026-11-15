import { Router, Request, Response } from 'express';
import {
  generateSecureRecoveryCode,
  encryptRecoveryCode,
  decryptRecoveryCode,
} from '../security/encryption';
import { checkRateLimit } from '../security/rateLimiter';
import {
  readLocalStore,
  writeLocalStore,
  restGetDoc,
  restListDocs,
  restSetDoc,
  restDeleteDoc,
} from '../firestoreRest';
import { AdminCitizenDTO, toAdminCitizenDTO, toReportDTO } from '../../src/types/dto';
import { UserProfileDocument, UserRole } from '../../src/types/auth';
import { OFFICIAL_PHONE_LOCAL } from '../../src/constants/officialContact';
import {
  DESIGNATED_SUPER_ADMIN_NAME,
  isDesignatedSuperAdminEmail,
  appendAuditLog,
  authenticateUser,
} from './authMiddleware';

export const adminRoutes = Router();

/**
 * 5. List Registered Users for Admin (AdminCitizenDTO)
 */
adminRoutes.get('/admin/citizens', authenticateUser, async (req: Request, res: Response) => {
  const caller = (req as any).user;
  if (caller.role !== 'admin' && caller.role !== 'super_admin') {
    res.status(403).json({ error: 'غير مصرح: هذا القسم للإدارة فقط.' });
    return;
  }

  try {
    const store = readLocalStore();

    const isTempRecord = (id: string, emailVal?: string) => {
      const cleanId = String(id || '').trim();
      const cleanEmail = String(emailVal || '').trim();
      return /^[0-9]+$/.test(cleanId) || cleanId.startsWith('visitor_') || !cleanEmail.includes('@');
    };

    let storeDirty = false;
    for (const [uid, u] of Object.entries(store.users)) {
      if (isTempRecord(uid, u.email)) {
        delete store.users[uid];
        storeDirty = true;
      }
    }
    for (const [id, c] of Object.entries(store.citizens)) {
      if (isTempRecord(id, c.email)) {
        delete store.citizens[id];
        storeDirty = true;
      }
    }
    if (storeDirty) {
      writeLocalStore(store);
    }

    const mergedUsersMap = new Map<string, Record<string, any>>();
    for (const [uid, u] of Object.entries(store.users)) {
      if (!isTempRecord(uid, u.email)) {
        mergedUsersMap.set(uid, { ...u, uid });
      }
    }

    const citizensMap = new Map<string, Record<string, any>>();
    for (const [id, c] of Object.entries(store.citizens)) {
      if (!isTempRecord(id, c.email)) {
        citizensMap.set(id, { ...c, id });
      }
    }

    const dtoMap = new Map<string, AdminCitizenDTO>();

    mergedUsersMap.forEach((uData, uid) => {
      const cExtra = citizensMap.get(uid);
      const emailStr = String(uData.email || cExtra?.email || '').trim();
      if (isTempRecord(uid, emailStr)) return;
      const isDesig = isDesignatedSuperAdminEmail(emailStr);
      const role: UserRole = isDesig ? 'super_admin' : (uData.role as UserRole) || 'citizen';

      const mergedDoc: UserProfileDocument = {
        ...(uData as UserProfileDocument),
        uid,
        fullName: isDesig
          ? DESIGNATED_SUPER_ADMIN_NAME
          : uData.fullName || cExtra?.name || 'مواطن مسجل',
        email: emailStr,
        phone: uData.phone || cExtra?.phone || '',
        birthDate: uData.birthDate || cExtra?.birthDate || '',
        neighborhood: uData.neighborhood || cExtra?.neighborhood || 'ناحية باعدرى',
        role,
        reportsSubmittedCount: Math.max(
          uData.reportsSubmittedCount || 0,
          cExtra?.reportsSubmittedCount || 0
        ),
        resolvedReportsCount: Math.max(
          uData.resolvedReportsCount || 0,
          cExtra?.resolvedReportsCount || 0
        ),
        isBlocked: Boolean(uData.isBlocked ?? cExtra?.isBlocked ?? false),
        createdAt: uData.createdAt || cExtra?.joinedAt || new Date().toISOString(),
        updatedAt: uData.updatedAt || new Date().toISOString(),
      };

      dtoMap.set(uid, toAdminCitizenDTO(mergedDoc, role === 'admin' || role === 'super_admin'));
    });

    citizensMap.forEach((c, uid) => {
      if (!dtoMap.has(uid)) {
        const emailStr = String(c.email || '').trim();
        if (isTempRecord(uid, emailStr)) return;
        const isDesig = isDesignatedSuperAdminEmail(emailStr);
        const role: UserRole = isDesig ? 'super_admin' : (c.role as UserRole) || 'citizen';
        dtoMap.set(uid, {
          uid,
          fullName: isDesig
            ? DESIGNATED_SUPER_ADMIN_NAME
            : c.name || c.fullName || 'مواطن مسجل',
          email: emailStr,
          phone: c.phone || '',
          birthDate: c.birthDate || '',
          role,
          neighborhood: c.neighborhood || 'ناحية باعدرى',
          reportsSubmittedCount: c.reportsSubmittedCount || 0,
          resolvedReportsCount: c.resolvedReportsCount || 0,
          joinedAt: c.joinedAt || c.createdAt || new Date().toISOString(),
          isBlocked: Boolean(c.isBlocked),
          hasRecoveryCodeConfigured: role === 'admin' || role === 'super_admin',
        });
      }
    });

    const dtoList = Array.from(dtoMap.values()).sort(
      (a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
    );

    res.json({ success: true, citizens: dtoList });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'فشل جلب قائمة المستخدمين.' });
  }
});

/**
 * 6. Change User Role (Admin & Super Admin)
 */
adminRoutes.post('/admin/change-role', authenticateUser, async (req: Request, res: Response) => {
  const caller = (req as any).user;
  if (caller.role !== 'admin' && caller.role !== 'super_admin') {
    res.status(403).json({
      error: 'غير مصرح: تعديل الأدوار محصور بحسابات الإدارة (Admin / Super Admin).',
    });
    return;
  }

  const { targetUid, newRole } = req.body;
  if (!targetUid || !newRole || !['citizen', 'admin', 'super_admin'].includes(newRole)) {
    res.status(400).json({ error: 'البيانات المدخلة غير صحيحة.' });
    return;
  }

  if (caller.role !== 'super_admin' && newRole === 'super_admin') {
    appendAuditLog(
      {
        action: 'ROLE_CHANGE_DENIED',
        actorUid: caller.uid,
        actorEmail: caller.email,
        actorRole: caller.role,
        targetUid,
        reason: 'Admin attempted to grant super_admin role (server constraint enforced).',
        timestamp: new Date().toISOString(),
      },
      caller.idToken
    );

    res.status(403).json({
      error: 'غير مصرح: الأدمن له حق تغيير دور المواطن إلى أدمن واسترجاعه إلى مواطن فقط، وليس لديه الحق لمنح دور سوبر أدمن.',
    });
    return;
  }

  try {
    const store = readLocalStore();
    const remoteTargetUser = await restGetDoc('users', targetUid, caller.idToken);
    const remoteTargetCitizen = !remoteTargetUser
      ? await restGetDoc('citizens', targetUid, caller.idToken)
      : null;

    const existingUser = (remoteTargetUser ||
      store.users[targetUid] ||
      (remoteTargetCitizen
        ? {
            uid: targetUid,
            fullName: remoteTargetCitizen.name || remoteTargetCitizen.fullName || 'مواطن مسجل',
            email: remoteTargetCitizen.email || '',
            phone: remoteTargetCitizen.phone || '',
            birthDate: remoteTargetCitizen.birthDate || '',
            role: remoteTargetCitizen.role || 'citizen',
            reportsSubmittedCount: remoteTargetCitizen.reportsSubmittedCount || 0,
            resolvedReportsCount: remoteTargetCitizen.resolvedReportsCount || 0,
            isBlocked: Boolean(remoteTargetCitizen.isBlocked),
            createdAt: remoteTargetCitizen.joinedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : null)) as UserProfileDocument | null;

    if (!existingUser) {
      res.status(404).json({ error: 'المستخدم المستهدف غير موجود.' });
      return;
    }

    const targetExistingRole = isDesignatedSuperAdminEmail(existingUser.email)
      ? 'super_admin'
      : existingUser.role || 'citizen';

    if (
      targetExistingRole === 'super_admin' &&
      (caller.role !== 'super_admin' || caller.uid !== targetUid)
    ) {
      appendAuditLog(
        {
          action: 'ROLE_CHANGE_DENIED',
          actorUid: caller.uid,
          actorEmail: caller.email,
          actorRole: caller.role,
          targetUid,
          targetEmail: existingUser.email,
          reason: 'Attempted to modify a Super Admin account (server constraint enforced).',
          timestamp: new Date().toISOString(),
        },
        caller.idToken
      );

      res.status(403).json({
        error: 'قيد أمني إلزامي: لا يُسمح بتعديل أو تخفيض صلاحيات حساب السوبر أدمن.',
      });
      return;
    }

    const nowIso = new Date().toISOString();
    let generatedRecoveryCode: string | null = null;

    const updatedUserDoc: UserProfileDocument = {
      ...existingUser,
      uid: targetUid,
      role: newRole,
      updatedAt: nowIso,
    };

    store.users[targetUid] = updatedUserDoc;
    store.citizens[targetUid] = {
      ...(store.citizens[targetUid] || {}),
      id: targetUid,
      name: updatedUserDoc.fullName,
      email: updatedUserDoc.email,
      phone: updatedUserDoc.phone,
      birthDate: updatedUserDoc.birthDate,
      role: newRole,
      updatedAt: nowIso,
    };

    await Promise.all([
      restSetDoc('users', targetUid, updatedUserDoc, caller.idToken, true),
      restSetDoc('citizens', targetUid, store.citizens[targetUid], caller.idToken, true),
    ]);

    if (newRole === 'admin' || newRole === 'super_admin') {
      const adminMarker = {
        uid: targetUid,
        email: updatedUserDoc.email,
        fullName: updatedUserDoc.fullName,
        role: newRole,
        assignedBy: caller.uid,
        assignedAt: nowIso,
      };
      store.admins[targetUid] = adminMarker;
      await restSetDoc('admins', targetUid, adminMarker, caller.idToken, true);

      if (newRole === 'super_admin') {
        const superMarker = {
          uid: targetUid,
          email: updatedUserDoc.email,
          fullName: updatedUserDoc.fullName,
          assignedBy: caller.uid,
          assignedAt: nowIso,
        };
        store.super_admins[targetUid] = superMarker;
        await restSetDoc('super_admins', targetUid, superMarker, caller.idToken, true);
      } else {
        delete store.super_admins[targetUid];
        await restDeleteDoc('super_admins', targetUid, caller.idToken);
      }

      if (!store.admin_recovery_vault[targetUid]) {
        generatedRecoveryCode = generateSecureRecoveryCode();
        store.admin_recovery_vault[targetUid] = encryptRecoveryCode(generatedRecoveryCode, newRole);
      }
    } else {
      delete store.admins[targetUid];
      delete store.super_admins[targetUid];
      delete store.admin_recovery_vault[targetUid];
      await Promise.all([
        restDeleteDoc('admins', targetUid, caller.idToken),
        restDeleteDoc('super_admins', targetUid, caller.idToken),
      ]);
    }

    writeLocalStore(store);

    appendAuditLog(
      {
        action: 'ROLE_CHANGED',
        actorUid: caller.uid,
        actorEmail: caller.email,
        actorRole: caller.role,
        targetUid,
        targetEmail: updatedUserDoc.email,
        oldRole: targetExistingRole,
        newRole,
        timestamp: nowIso,
      },
      caller.idToken
    );

    res.json({
      success: true,
      message: `تم تغيير دور المستخدم إلى (${newRole}) بنجاح.`,
      newRole,
      generatedRecoveryCode: caller.role === 'super_admin' ? generatedRecoveryCode : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'فشلت عملية تغيير الدور.' });
  }
});

/**
 * 7. Reveal Admin Recovery Code (Super Admin Only)
 */
adminRoutes.post(
  '/admin/reveal-recovery-code',
  authenticateUser,
  async (req: Request, res: Response) => {
    const caller = (req as any).user;
    if (caller.role !== 'super_admin') {
      res.status(403).json({ error: 'غير مصرح: كشف رموز الاسترداد محصور بالسوبر أدمن فقط.' });
      return;
    }

    const { targetAdminUid } = req.body;
    if (!targetAdminUid) {
      res.status(400).json({ error: 'معرّف المسؤول مطلوب.' });
      return;
    }

    const rateLimit = checkRateLimit(`reveal_code_${caller.uid}`, 6, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      res.status(429).json({
        error: `تم تجاوز الحد المسموح لكشف رموز الاسترداد (6 محاولات). يرجى المحاولة بعد ${rateLimit.retryAfterSeconds} ثانية.`,
      });
      return;
    }

    try {
      const store = readLocalStore();
      const remoteUser = await restGetDoc('users', targetAdminUid, caller.idToken);
      const targetUser = (remoteUser || store.users[targetAdminUid]) as
        | UserProfileDocument
        | undefined;

      if (!targetUser) {
        res.status(404).json({ error: 'المسؤول المستهدف غير موجود.' });
        return;
      }

      const targetRole = isDesignatedSuperAdminEmail(targetUser.email)
        ? 'super_admin'
        : targetUser.role;

      if (targetRole === 'super_admin' && caller.uid !== targetAdminUid) {
        appendAuditLog(
          {
            action: 'RECOVERY_CODE_REVEAL_ATTEMPT_DENIED',
            actorUid: caller.uid,
            actorEmail: caller.email,
            targetUid: targetAdminUid,
            targetEmail: targetUser.email,
            reason: 'Super Admin attempted to reveal recovery code of another Super Admin.',
            timestamp: new Date().toISOString(),
          },
          caller.idToken
        );

        res.status(403).json({
          error: 'قيد أمني مشدد: لا يمكن لأي سوبر أدمن كشف رمز استرداد سوبر أدمن آخر.',
        });
        return;
      }

      let vaultData = store.admin_recovery_vault[targetAdminUid];
      if (!vaultData) {
        const freshCode = generateSecureRecoveryCode();
        vaultData = encryptRecoveryCode(
          freshCode,
          targetRole === 'super_admin' ? 'super_admin' : 'admin'
        );
        store.admin_recovery_vault[targetAdminUid] = vaultData;
        writeLocalStore(store);
      }

      const decrypted = decryptRecoveryCode(vaultData as any);

      appendAuditLog(
        {
          action: 'RECOVERY_CODE_REVEALED',
          actorUid: caller.uid,
          actorEmail: caller.email,
          actorRole: 'super_admin',
          targetUid: targetAdminUid,
          targetEmail: targetUser.email,
          targetRole,
          timestamp: new Date().toISOString(),
        },
        caller.idToken
      );

      res.json({
        success: true,
        recoveryCode: decrypted,
        targetEmail: targetUser.email,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'فشل كشف رمز الاسترداد.' });
    }
  }
);

/**
 * 8. Bootstrap First Super Admin
 */
adminRoutes.post('/admin/bootstrap-first-super-admin', async (req: Request, res: Response) => {
  const { adminEmail, adminFullName, adminUid, adminPhone } = req.body;
  const authHeader = req.headers.authorization;
  const idToken =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.split('Bearer ')[1].trim()
      : undefined;

  if (!adminEmail || !isDesignatedSuperAdminEmail(adminEmail)) {
    res.status(403).json({ error: 'العملية مخصصة فقط لبريد السوبر أدمن المعتمد.' });
    return;
  }

  if (!adminUid) {
    res.status(400).json({ error: 'معرّف المستخدم مطلوب.' });
    return;
  }

  try {
    const store = readLocalStore();
    if (store.system_config.bootstrap?.isBootstrapped) {
      res.status(409).json({
        error:
          'تمت تهيئة النظام وتعيين أول سوبر أدمن مسبقاً. يُمنع إعادة تنفيذ هذه العملية نهائياً.',
      });
      return;
    }

    const cleanEmail = adminEmail.trim().toLowerCase();
    const cleanName = (adminFullName || 'Super Admin').trim();
    const nowIso = new Date().toISOString();

    const recoveryCode = generateSecureRecoveryCode();
    const encryptedVault = encryptRecoveryCode(recoveryCode, 'super_admin');
    store.admin_recovery_vault[adminUid] = encryptedVault;

    const superMarker = {
      uid: adminUid,
      email: cleanEmail,
      fullName: cleanName,
      createdAt: nowIso,
    };
    const adminMarker = {
      uid: adminUid,
      email: cleanEmail,
      fullName: cleanName,
      role: 'super_admin',
      createdAt: nowIso,
    };
    const userDoc: UserProfileDocument = {
      uid: adminUid,
      email: cleanEmail,
      fullName: cleanName,
      phone: adminPhone || OFFICIAL_PHONE_LOCAL,
      birthDate: '1990-01-01',
      role: 'super_admin',
      reportsSubmittedCount: 0,
      resolvedReportsCount: 0,
      isBlocked: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    store.super_admins[adminUid] = superMarker;
    store.admins[adminUid] = adminMarker;
    store.users[adminUid] = userDoc;
    store.system_config.bootstrap = {
      isBootstrapped: true,
      bootstrappedAt: nowIso,
      superAdminUid: adminUid,
      superAdminEmail: cleanEmail,
    };
    writeLocalStore(store);

    if (idToken) {
      await Promise.all([
        restSetDoc('super_admins', adminUid, superMarker, idToken, true),
        restSetDoc('admins', adminUid, adminMarker, idToken, true),
        restSetDoc('users', adminUid, userDoc, idToken, true),
      ]);
    }

    appendAuditLog(
      {
        action: 'SYSTEM_BOOTSTRAP_SUPER_ADMIN',
        actorUid: 'SYSTEM_BOOTSTRAP',
        targetUid: adminUid,
        targetEmail: cleanEmail,
        targetRole: 'super_admin',
        timestamp: nowIso,
      },
      idToken
    );

    res.json({
      success: true,
      message: 'تمت تهيئة السوبر أدمن الأول للنظام بنجاح.',
      oneTimeRecoveryCode: recoveryCode,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'فشلت عملية تهيئة النظام.' });
  }
});

/**
 * 9. Get Audit Logs (Super Admin & Admin)
 */
adminRoutes.get('/admin/audit-logs', authenticateUser, async (req: Request, res: Response) => {
  const caller = (req as any).user;
  if (caller.role !== 'admin' && caller.role !== 'super_admin') {
    res.status(403).json({ error: 'غير مصرح: سجلات التدقيق محصورة بالإدارة.' });
    return;
  }

  try {
    const store = readLocalStore();
    const remoteLogs = await restListDocs('audit_logs', caller.idToken, 50);
    const mergedMap = new Map<string, Record<string, any>>();

    for (const log of store.audit_logs || []) {
      if (log.id) mergedMap.set(log.id, log);
    }
    for (const { id, data } of remoteLogs) {
      mergedMap.set(id, { id, ...data });
    }

    const logs = Array.from(mergedMap.values())
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
      .slice(0, 50);

    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'فشل جلب سجلات التدقيق.' });
  }
});

/**
 * 10. Admin Manage Report Status (Admin & Super Admin Only)
 */
adminRoutes.post(
  '/admin/update-report-status',
  authenticateUser,
  async (req: Request, res: Response) => {
    const caller = (req as any).user;
    if (caller.role !== 'admin' && caller.role !== 'super_admin') {
      res.status(403).json({
        error:
          'غير مصرح: إدارة البلاغات وتغيير حالتها محصورة بحسابات الإدارة (Admin / Super Admin).',
      });
      return;
    }

    const { reportId, status, assignedTeam, officialNote, urgency, resolvedImages } =
      req.body || {};
    if (!reportId || !status) {
      res.status(400).json({ error: 'معرّف البلاغ والحالة الجديدة مطلوبان.' });
      return;
    }

    const allowedStatuses = [
      'pending',
      'new',
      'in_progress',
      'sent',
      'resolved',
      'completed',
      'rejected',
    ];
    if (!allowedStatuses.includes(status)) {
      res.status(400).json({ error: 'حالة البلاغ غير صالحة.' });
      return;
    }

    const normalizedStatus =
      status === 'new'
        ? 'pending'
        : status === 'sent'
        ? 'in_progress'
        : status === 'completed'
        ? 'resolved'
        : status;

    const nowIso = new Date().toISOString();
    const cleanId = String(reportId);

    try {
      const current = await restGetDoc('reports', cleanId, caller.idToken);
      if (!current) {
        res.status(404).json({ error: 'البلاغ غير موجود.' });
        return;
      }

      const nextTimestamps = {
        ...(current.statusTimestamps || {}),
        [normalizedStatus]: nowIso,
      };
      const nextNotes = {
        ...(current.statusNotes || {}),
        ...(officialNote !== undefined ? { [normalizedStatus]: String(officialNote).trim() } : {}),
      };

      const updated: Record<string, any> = {
        ...current,
        id: cleanId,
        status: normalizedStatus,
        updatedAt: nowIso,
        isOpened: true,
        openedAt: current.openedAt || nowIso,
        statusTimestamps: nextTimestamps,
        statusNotes: nextNotes,
        ownerUid: current.ownerUid || current.citizenId,
        citizenId: current.citizenId || current.ownerUid,
      };

      if (assignedTeam) updated.assignedTeam = String(assignedTeam).trim();
      if (officialNote !== undefined) {
        updated.officialNote = String(officialNote).trim();
        updated.adminNotes = String(officialNote).trim();
      }
      if (urgency && ['normal', 'high', 'emergency'].includes(urgency)) {
        updated.urgency = urgency;
        updated.isUrgencySet = true;
        updated.urgencySetAt = current.urgencySetAt || nowIso;
      }
      if (normalizedStatus === 'resolved') {
        updated.resolvedAt = nowIso;
        if (Array.isArray(resolvedImages)) {
          updated.resolvedImages = resolvedImages.slice(0, 10);
        }
      }

      await restSetDoc('reports', cleanId, updated, caller.idToken, true);

      appendAuditLog(
        {
          action: 'REPORT_STATUS_UPDATED_BY_ADMIN',
          actorUid: caller.uid,
          actorEmail: caller.email,
          actorRole: caller.role,
          reportId: cleanId,
          newStatus: normalizedStatus,
          timestamp: nowIso,
        },
        caller.idToken
      );

      res.json({
        success: true,
        report: toReportDTO(updated as any),
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'فشل تحديث حالة البلاغ.' });
    }
  }
);

/**
 * 15. Secure Backend Blocking / Unblocking for Citizens & Admins
 */
adminRoutes.post(
  '/admin/toggle-block',
  authenticateUser,
  async (req: Request, res: Response) => {
    const caller = (req as any).user;
    if (caller.role !== 'admin' && caller.role !== 'super_admin') {
      res.status(403).json({ error: 'غير مصرح.' });
      return;
    }

    const { targetUid, isBlocked: requestedBlocked } = req.body || {};
    if (!targetUid || typeof targetUid !== 'string') {
      res.status(400).json({ error: 'معرّف المستخدم مطلوب.' });
      return;
    }

    const cleanUid = targetUid.trim();
    if (cleanUid === caller.uid) {
      res.status(400).json({ error: 'لا يمكنك حظر حسابك الحالي.' });
      return;
    }

    try {
      const store = readLocalStore();
      const [remoteUser, remoteCitizen] = await Promise.all([
        restGetDoc('users', cleanUid, caller.idToken),
        restGetDoc('citizens', cleanUid, caller.idToken),
      ]);

      const existingUser = remoteUser || store.users[cleanUid] || {};
      const existingCitizen = remoteCitizen || store.citizens[cleanUid] || {};
      const targetEmail = String(existingUser.email || existingCitizen.email || '')
        .trim()
        .toLowerCase();

      const targetRole: UserRole = isDesignatedSuperAdminEmail(targetEmail)
        ? 'super_admin'
        : (existingUser.role as UserRole) ||
          (existingCitizen.role as UserRole) ||
          (store.super_admins[cleanUid]
            ? 'super_admin'
            : store.admins[cleanUid]
            ? 'admin'
            : 'citizen');

      if (targetRole === 'super_admin') {
        res.status(403).json({ error: 'لا يمكن حظر حساب السوبر أدمن.' });
        return;
      }

      if (targetRole === 'admin' && caller.role !== 'super_admin') {
        res.status(403).json({ error: 'حظر الأدمن محصور بالسوبر أدمن فقط.' });
        return;
      }

      const currentBlocked = Boolean(existingUser.isBlocked ?? existingCitizen.isBlocked ?? false);
      const nextBlocked =
        typeof requestedBlocked === 'boolean' ? requestedBlocked : !currentBlocked;
      const nowIso = new Date().toISOString();

      if (store.users[cleanUid] || remoteUser) {
        store.users[cleanUid] = {
          ...existingUser,
          uid: cleanUid,
          isBlocked: nextBlocked,
          updatedAt: nowIso,
        };
      }

      store.citizens[cleanUid] = {
        ...existingCitizen,
        id: cleanUid,
        isBlocked: nextBlocked,
        updatedAt: nowIso,
      };

      writeLocalStore(store);

      await Promise.all([
        restSetDoc(
          'users',
          cleanUid,
          { uid: cleanUid, isBlocked: nextBlocked, updatedAt: nowIso },
          caller.idToken,
          true
        ),
        restSetDoc(
          'citizens',
          cleanUid,
          { id: cleanUid, isBlocked: nextBlocked, updatedAt: nowIso },
          caller.idToken,
          true
        ),
      ]);

      appendAuditLog(
        {
          action: nextBlocked ? 'USER_BLOCKED_IN_BACKEND' : 'USER_UNBLOCKED_IN_BACKEND',
          actorUid: caller.uid,
          actorEmail: caller.email,
          actorRole: caller.role,
          targetUid: cleanUid,
          targetEmail,
          targetRole,
          isBlocked: nextBlocked,
          timestamp: nowIso,
        },
        caller.idToken
      );

      res.json({
        success: true,
        targetUid: cleanUid,
        isBlocked: nextBlocked,
      });
    } catch {
      res.status(500).json({ error: 'تعذر تحديث حالة الحظر.' });
    }
  }
);

/**
 * 15b. Delete Citizen / User Permanently from Core Application (Admin & Super Admin)
 */
adminRoutes.post(
  '/admin/delete-user',
  authenticateUser,
  async (req: Request, res: Response) => {
    const caller = (req as any).user;
    if (caller.role !== 'admin' && caller.role !== 'super_admin') {
      res.status(403).json({ error: 'غير مصرح.' });
      return;
    }

    const { targetUid, targetEmail: bodyEmail } = req.body || {};
    if (!targetUid || typeof targetUid !== 'string') {
      res.status(400).json({ error: 'معرّف المستخدم مطلوب.' });
      return;
    }

    const cleanUid = targetUid.trim();
    if (cleanUid === caller.uid) {
      res.status(400).json({ error: 'لا يمكنك حذف حسابك الحالي من هنا.' });
      return;
    }

    try {
      const store = readLocalStore();
      const [remoteUser, remoteCitizen] = await Promise.all([
        restGetDoc('users', cleanUid, caller.idToken),
        restGetDoc('citizens', cleanUid, caller.idToken),
      ]);

      const existingUser = remoteUser || store.users[cleanUid] || {};
      const existingCitizen = remoteCitizen || store.citizens[cleanUid] || {};
      const targetEmail = String(
        existingUser.email || existingCitizen.email || bodyEmail || ''
      )
        .trim()
        .toLowerCase();

      const targetRole: UserRole = isDesignatedSuperAdminEmail(targetEmail)
        ? 'super_admin'
        : (existingUser.role as UserRole) ||
          (existingCitizen.role as UserRole) ||
          (store.super_admins[cleanUid]
            ? 'super_admin'
            : store.admins[cleanUid]
            ? 'admin'
            : 'citizen');

      if (targetRole === 'super_admin') {
        res.status(403).json({ error: 'لا يمكن حذف حساب السوبر أدمن.' });
        return;
      }

      if (targetRole === 'admin' && caller.role !== 'super_admin') {
        res.status(403).json({ error: 'حذف حساب المسؤول محصور بالسوبر أدمن فقط.' });
        return;
      }

      delete store.users[cleanUid];
      delete store.citizens[cleanUid];
      delete store.admins[cleanUid];
      delete store.super_admins[cleanUid];
      delete store.admin_recovery_vault[cleanUid];

      if (targetEmail) {
        for (const [id, u] of Object.entries(store.users)) {
          if (String(u?.email || '').trim().toLowerCase() === targetEmail) {
            delete store.users[id];
          }
        }
        for (const [id, c] of Object.entries(store.citizens)) {
          if (String(c?.email || '').trim().toLowerCase() === targetEmail) {
            delete store.citizens[id];
          }
        }
      }

      if (store.user_fcm_tokens) {
        for (const [tokenId, tokenDoc] of Object.entries(store.user_fcm_tokens)) {
          if (tokenDoc?.uid === cleanUid) {
            delete store.user_fcm_tokens[tokenId];
          }
        }
      }
      writeLocalStore(store);

      const deletePromises: Promise<any>[] = [
        restDeleteDoc('users', cleanUid, caller.idToken).catch(() => {}),
        restDeleteDoc('citizens', cleanUid, caller.idToken).catch(() => {}),
        restDeleteDoc('admins', cleanUid, caller.idToken).catch(() => {}),
      ];

      if (targetEmail) {
        deletePromises.push(
          restListDocs('users', caller.idToken, 100)
            .then((docs) =>
              Promise.all(
                docs
                  .filter((d) => String(d.data?.email || '').trim().toLowerCase() === targetEmail)
                  .map((d) => restDeleteDoc('users', d.id, caller.idToken).catch(() => {}))
              )
            )
            .catch(() => {}),
          restListDocs('citizens', caller.idToken, 100)
            .then((docs) =>
              Promise.all(
                docs
                  .filter((d) => String(d.data?.email || '').trim().toLowerCase() === targetEmail)
                  .map((d) => restDeleteDoc('citizens', d.id, caller.idToken).catch(() => {}))
              )
            )
            .catch(() => {})
        );
      }

      await Promise.all(deletePromises);

      appendAuditLog(
        {
          action: 'USER_DELETED_FROM_CORE_APP',
          actorUid: caller.uid,
          actorEmail: caller.email,
          actorRole: caller.role,
          targetUid: cleanUid,
          targetEmail,
          targetRole,
          timestamp: new Date().toISOString(),
        },
        caller.idToken
      );

      res.json({
        success: true,
        targetUid: cleanUid,
        message: 'تم حذف المواطن / المستخدم من أساس التطبيق بنجاح.',
      });
    } catch {
      res.status(500).json({ error: 'فشل حذف المواطن من التطبيق.' });
    }
  }
);
