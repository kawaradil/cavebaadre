import {
  generateDeterministicRecoveryCode,
  decryptRecoveryCode,
  timingSafeMatch,
} from '../security/encryption';
import { checkRateLimit, resetRateLimit } from '../security/rateLimiter';
import {
  readLocalStore,
  writeLocalStore,
  restGetDoc,
  restSetDoc,
  restDeleteDoc,
} from '../firestoreRest';
import {
  CitizenProfileDTO,
  toCitizenProfileDTO,
  toAdminCitizenDTO,
} from '../../src/types/dto';
import { UserProfileDocument, UserRole } from '../../src/types/auth';
import {
  firebaseConfig,
  DESIGNATED_SUPER_ADMIN_EMAIL,
  DESIGNATED_SUPER_ADMIN_NAME,
  PASSWORD_RESET_MAX_PER_HOUR,
  PASSWORD_RESET_WINDOW_MS,
  isDesignatedSuperAdminEmail,
  appendAuditLog,
  buildIdentityToolkitHeaders,
  ensureDesignatedSuperAdminProvisioned,
  authenticateUser,
  canSendPasswordResetLink,
  recordPasswordResetLinkSent,
  isEmailRegisteredOnPlatform,
  getRecoveryCallerKey,
} from './authMiddleware';

export const authRoutes = Router();

/**
 * 0. Check if Email Exists before Registration
 */
authRoutes.post('/auth/check-email', async (req: Request, res: Response) => {
  try {
    const rawEmail = String(req.body?.email || '').trim().toLowerCase();
    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      res.status(400).json({ exists: false, error: 'البريد غير صالح.' });
      return;
    }
    const exists = await isEmailRegisteredOnPlatform(rawEmail);
    res.json({ exists });
  } catch {
    res.json({ exists: false });
  }
});

/**
 * 1. Citizen / User Registration Profile
 */
authRoutes.post('/auth/register-citizen', async (req: Request, res: Response) => {
  try {
    const { fullName, email, phone, birthDate, uid } = req.body;
    const authHeader = req.headers.authorization;
    const idToken =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split('Bearer ')[1].trim()
        : undefined;

    if (!fullName || typeof fullName !== 'string') {
      res.status(400).json({ error: 'الاسم الثلاثي مطلوب.' });
      return;
    }

    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length < 3) {
      res.status(400).json({ error: 'الاسم الثلاثي مطلوب.' });
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'البريد غير صالح.' });
      return;
    }

    if (!phone || !/^\+?[0-9]{10,15}$/.test(phone.replace(/[\s-]/g, ''))) {
      res.status(400).json({ error: 'رقم الهاتف غير صالح.' });
      return;
    }

    if (!uid) {
      res.status(400).json({ error: 'بيانات الحساب غير مكتملة.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanBirthDate = birthDate ? String(birthDate).trim() : '';
    const isDesignatedSuperAdmin = isDesignatedSuperAdminEmail(cleanEmail);

    // Prevent duplicate email registration for another uid
    if (!isDesignatedSuperAdmin) {
      const storeCheck = readLocalStore();
      const duplicateInUsers = Object.entries(storeCheck.users || {}).some(
        ([existingUid, u]) =>
          existingUid !== uid && String(u?.email || '').trim().toLowerCase() === cleanEmail
      );
      const duplicateInCitizens = Object.entries(storeCheck.citizens || {}).some(
        ([existingId, c]) =>
          existingId !== uid && String(c?.email || '').trim().toLowerCase() === cleanEmail
      );
      if (duplicateInUsers || duplicateInCitizens) {
        res.status(409).json({
          error: 'هذا البريد الإلكتروني موجود ومسجل مسبقاً، لا نقبل إنشاء حساب ببريد موجود.',
        });
        return;
      }
    }

    const cleanFullName = isDesignatedSuperAdmin
      ? DESIGNATED_SUPER_ADMIN_NAME
      : fullName.trim();
    const assignedRole: UserRole = isDesignatedSuperAdmin ? 'super_admin' : 'citizen';
    const nowIso = new Date().toISOString();

    if (isDesignatedSuperAdmin) {
      const superProfile = await ensureDesignatedSuperAdminProvisioned({
        uid,
        email: cleanEmail,
        fullName: cleanFullName,
        phone: cleanPhone,
        birthDate: cleanBirthDate,
        idToken,
      });

      res.status(201).json({
        success: true,
        message: 'تم تفعيل الحساب بنجاح.',
        profile: toAdminCitizenDTO(superProfile, true),
        role: 'super_admin',
      });
      return;
    }

    const profileDoc: UserProfileDocument = {
      uid,
      fullName: cleanFullName,
      email: cleanEmail,
      phone: cleanPhone,
      birthDate: cleanBirthDate,
      role: assignedRole,
      neighborhood: 'ناحية باعدرى',
      reportsSubmittedCount: 0,
      resolvedReportsCount: 0,
      isBlocked: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const store = readLocalStore();
    store.users[uid] = profileDoc;
    writeLocalStore(store);

    if (idToken) {
      await restSetDoc('users', uid, profileDoc, idToken, true);
    }

    const responseDto: CitizenProfileDTO = toCitizenProfileDTO(profileDoc);
    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح.',
      profile: responseDto,
      role: 'citizen',
    });
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مجدداً.' });
  }
});

/**
 * 2. Get Current Authenticated Profile
 */
authRoutes.get('/auth/me', authenticateUser, async (req: Request, res: Response) => {
  try {
    const caller = (req as any).user;
    const isDesignatedSuperAdmin = isDesignatedSuperAdminEmail(caller.email);

    if (isDesignatedSuperAdmin) {
      const superProfile = await ensureDesignatedSuperAdminProvisioned({
        uid: caller.uid,
        email: DESIGNATED_SUPER_ADMIN_EMAIL,
        fullName: DESIGNATED_SUPER_ADMIN_NAME,
        idToken: caller.idToken,
      });
      res.json({
        profile: toAdminCitizenDTO(superProfile, true),
        role: 'super_admin',
      });
      return;
    }

    const store = readLocalStore();
    const remoteUser = await restGetDoc('users', caller.uid, caller.idToken);
    const userData = (remoteUser || store.users[caller.uid]) as UserProfileDocument | undefined;

    if (!userData) {
      res.status(404).json({ error: 'الحساب غير موجود.' });
      return;
    }

    userData.uid = caller.uid;
    store.users[caller.uid] = userData;
    writeLocalStore(store);

    if (userData.isBlocked && !isDesignatedSuperAdmin) {
      res.status(403).json({ error: 'تم حظر هذا الحساب.' });
      return;
    }

    if (caller.role === 'admin' || caller.role === 'super_admin') {
      res.json({
        profile: toAdminCitizenDTO(userData, true),
        role: caller.role,
      });
    } else {
      res.json({
        profile: toCitizenProfileDTO(userData),
        role: 'citizen',
      });
    }
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مجدداً.' });
  }
});

/**
 * 2b. Update Current Authenticated User Account
 */
authRoutes.post('/auth/update-account', authenticateUser, async (req: Request, res: Response) => {
  try {
    const caller = (req as any).user;
    const { fullName, phone, birthDate } = req.body;

    const cleanName = String(fullName || '').trim();
    if (!cleanName || cleanName.split(/\s+/).length < 3) {
      res.status(400).json({ error: 'الاسم الثلاثي مطلوب.' });
      return;
    }

    const cleanPhone = String(phone || '').trim();
    if (!cleanPhone || cleanPhone.replace(/[\s-]/g, '').length < 10) {
      res.status(400).json({ error: 'رقم الهاتف غير صالح.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const store = readLocalStore();
    const remoteUser = await restGetDoc('users', caller.uid, caller.idToken);
    const existing = (remoteUser || store.users[caller.uid] || {}) as Partial<UserProfileDocument>;
    const resolvedBirthDate =
      birthDate !== undefined ? String(birthDate).trim() : existing.birthDate || '';

    const isDesignated = isDesignatedSuperAdminEmail(caller.email);
    const effectiveRole: UserRole = isDesignated
      ? 'super_admin'
      : (existing.role as UserRole) || caller.role || 'citizen';

    const updatedUserDoc: UserProfileDocument = {
      uid: caller.uid,
      fullName: cleanName,
      email: (caller.email || existing.email || '').trim().toLowerCase(),
      phone: cleanPhone,
      birthDate: resolvedBirthDate,
      role: effectiveRole,
      neighborhood: existing.neighborhood || 'ناحية باعدرى',
      reportsSubmittedCount: existing.reportsSubmittedCount || 0,
      resolvedReportsCount: existing.resolvedReportsCount || 0,
      isBlocked: Boolean(existing.isBlocked),
      createdAt: existing.createdAt || nowIso,
      updatedAt: nowIso,
    };

    store.users[caller.uid] = updatedUserDoc;
    writeLocalStore(store);

    if (caller.idToken) {
      await restSetDoc('users', caller.uid, updatedUserDoc, caller.idToken, true);
    }

    res.json({
      success: true,
      profile:
        effectiveRole === 'admin' || effectiveRole === 'super_admin'
          ? toAdminCitizenDTO(updatedUserDoc, true)
          : toCitizenProfileDTO(updatedUserDoc),
      role: effectiveRole,
    });
  } catch {
    res.status(500).json({ error: 'فشل تحديث الحساب.' });
  }
});

/**
 * 2c. Delete Current User Account WITHOUT Deleting Data (reports, completed works, surveys stay intact)
 */
authRoutes.post('/auth/delete-account', authenticateUser, async (req: Request, res: Response) => {
  try {
    const caller = (req as any).user;
    const store = readLocalStore();

    delete store.users[caller.uid];
    delete store.citizens[caller.uid];
    delete store.admins[caller.uid];
    delete store.super_admins[caller.uid];
    delete store.admin_recovery_vault[caller.uid];
    if (store.user_fcm_tokens) {
      for (const [tokenId, tokenDoc] of Object.entries(store.user_fcm_tokens)) {
        if (tokenDoc?.uid === caller.uid) {
          delete store.user_fcm_tokens[tokenId];
        }
      }
    }
    writeLocalStore(store);

    if (caller.idToken) {
      await Promise.all([
        restDeleteDoc('users', caller.uid, caller.idToken).catch(() => {}),
        restDeleteDoc('citizens', caller.uid, caller.idToken).catch(() => {}),
      ]);
    }

    appendAuditLog({
      action: 'USER_ACCOUNT_DELETED_KEEPING_DATA',
      actorUid: caller.uid,
      actorEmail: caller.email,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'تم حذف الحساب بنجاح مع الاحتفاظ بجميع البلاغات والبيانات السابقة.',
    });
  } catch {
    res.status(500).json({ error: 'فشل حذف الحساب.' });
  }
});

/**
 * 3. Password Recovery Request
 */
authRoutes.post('/auth/citizen-password-recovery', async (req: Request, res: Response) => {
  const callerKey = getRecoveryCallerKey(req);
  const store = readLocalStore();
  if (!store.password_reset_wrong_attempts) {
    store.password_reset_wrong_attempts = {};
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const wrongRecord = store.password_reset_wrong_attempts[callerKey];

  // 1. Check if caller is currently locked out for 1 hour due to 3 wrong email attempts
  if (wrongRecord && wrongRecord.lockedUntilMs && now < wrongRecord.lockedUntilMs) {
    const remainingMinutes = Math.max(1, Math.ceil((wrongRecord.lockedUntilMs - now) / 60000));
    res.status(429).json({
      error: 'تم إدخال بريد إلكتروني خاطئ 3 مرات. تم إيقاف المحاولات لمدة ساعة، يرجى الاتصال بالإدارة.',
      lockedForOneHour: true,
      lockedUntilMs: wrongRecord.lockedUntilMs,
      remainingMinutes,
    });
    return;
  }

  const { email } = req.body;
  const cleanEmail = String(email || '').trim().toLowerCase();
  const isValidFormat = Boolean(cleanEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail));
  const isRegistered = isValidFormat ? await isEmailRegisteredOnPlatform(cleanEmail) : false;

  // 2. If email is invalid or not registered in the system -> record wrong email attempt
  if (!isValidFormat || !isRegistered) {
    const isExpiredWindow =
      !wrongRecord ||
      (wrongRecord.lockedUntilMs && now >= wrongRecord.lockedUntilMs) ||
      now - wrongRecord.windowStartMs >= PASSWORD_RESET_WINDOW_MS;

    const nextCount = isExpiredWindow ? 1 : (wrongRecord.count || 0) + 1;
    const windowStart = isExpiredWindow ? now : wrongRecord.windowStartMs;

    if (nextCount >= 3) {
      const lockedUntilMs = now + PASSWORD_RESET_WINDOW_MS; // 1 hour lock
      store.password_reset_wrong_attempts[callerKey] = {
        count: nextCount,
        windowStartMs: windowStart,
        lockedUntilMs,
        updatedAt: nowIso,
      };
      writeLocalStore(store);

      appendAuditLog({
        action: 'PASSWORD_RESET_WRONG_EMAIL_LOCKED_1H',
        actorUid: callerKey,
        targetEmail: cleanEmail || 'INVALID',
        timestamp: nowIso,
      });

      res.status(429).json({
        error: 'تم إدخال بريد إلكتروني خاطئ 3 مرات. تم إيقاف المحاولات لمدة ساعة، يرجى الاتصال بالإدارة.',
        lockedForOneHour: true,
        lockedUntilMs,
        remainingMinutes: 60,
        wrongEmailAttempt: 3,
        remainingAttempts: 0,
      });
      return;
    }

    store.password_reset_wrong_attempts[callerKey] = {
      count: nextCount,
      windowStartMs: windowStart,
      updatedAt: nowIso,
    };
    writeLocalStore(store);

    res.status(404).json({
      error: `البريد الإلكتروني غير مسجل أو غير صحيح. (المحاولة ${nextCount} من 3)`,
      wrongEmailAttempt: nextCount,
      remainingAttempts: 3 - nextCount,
      lockedForOneHour: false,
    });
    return;
  }

  // Valid registered email -> reset wrong email attempts counter for this caller
  if (store.password_reset_wrong_attempts[callerKey]) {
    delete store.password_reset_wrong_attempts[callerKey];
    writeLocalStore(store);
  }

  // Check backend-protected 3-times-per-1-hour limit for sending reset links
  if (!canSendPasswordResetLink(cleanEmail)) {
    res.status(429).json({
      error: 'تجاوزت الحد المسموح (3 مرات بالساعة).',
    });
    return;
  }

  try {
    let detectedRole: UserRole = isDesignatedSuperAdminEmail(cleanEmail)
      ? 'super_admin'
      : 'citizen';

    for (const u of Object.values(store.users)) {
      if (u.email?.trim().toLowerCase() === cleanEmail) {
        if (u.role === 'super_admin') {
          detectedRole = 'super_admin';
        } else if (u.role === 'admin' && detectedRole !== 'super_admin') {
          detectedRole = 'admin';
        }
      }
    }

    if (detectedRole !== 'super_admin') {
      for (const c of Object.values(store.citizens)) {
        if (c.email?.trim().toLowerCase() === cleanEmail) {
          if (c.role === 'super_admin') {
            detectedRole = 'super_admin';
          } else if (c.role === 'admin' && detectedRole !== 'super_admin') {
            detectedRole = 'admin';
          }
        }
      }
    }

    if (detectedRole !== 'super_admin') {
      for (const s of Object.values(store.super_admins)) {
        if (s.email?.trim().toLowerCase() === cleanEmail) {
          detectedRole = 'super_admin';
        }
      }
    }

    if (detectedRole === 'citizen') {
      for (const a of Object.values(store.admins)) {
        if (a.email?.trim().toLowerCase() === cleanEmail) {
          detectedRole = (a.role as UserRole) || 'admin';
        }
      }
    }

    if (detectedRole === 'super_admin') {
      res.json({
        success: false,
        requiresSuperAdminSecret: true,
        role: 'super_admin',
        message: 'يرجى إدخال الرمز السري.',
      });
      return;
    }

    if (detectedRole === 'admin') {
      res.json({
        success: false,
        requiresAdminRecoveryCode: true,
        role: 'admin',
        message: 'يرجى إدخال الرمز السري.',
      });
      return;
    }

    const memLimit = checkRateLimit(
      `pwd_reset_${cleanEmail}`,
      PASSWORD_RESET_MAX_PER_HOUR,
      PASSWORD_RESET_WINDOW_MS
    );
    if (!memLimit.allowed) {
      res.status(429).json({
        error: 'تجاوزت الحد المسموح (3 مرات بالساعة).',
      });
      return;
    }

    recordPasswordResetLinkSent(cleanEmail);

    await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: buildIdentityToolkitHeaders(),
        body: JSON.stringify({
          requestType: 'PASSWORD_RESET',
          email: cleanEmail,
        }),
      }
    );

    appendAuditLog({
      action: 'PASSWORD_RESET_REQUESTED',
      actorUid: 'ANONYMOUS',
      targetEmail: cleanEmail,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      requiresSuperAdminSecret: false,
      role: 'citizen',
      message: 'تم إرسال رابط آمن لإعادة تعيين كلمة المرور إلى بريدك.',
    });
  } catch {
    res.json({
      success: true,
      requiresSuperAdminSecret: false,
      role: 'citizen',
      message: 'تم إرسال رابط آمن لإعادة تعيين كلمة المرور إلى بريدك.',
    });
  }
});

/**
 * 4. Super Admin & Admin Secret / Recovery Code Verification before Password Reset Link
 */
authRoutes.post('/auth/admin-verify-recovery', async (req: Request, res: Response) => {
  const { email, recoveryCode } = req.body;
  if (!email || !recoveryCode) {
    res.status(400).json({ error: 'البريد والرمز السري مطلوبان.' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = recoveryCode.trim().toUpperCase();

  if (!canSendPasswordResetLink(cleanEmail)) {
    res.status(429).json({
      error: 'تجاوزت الحد المسموح (3 مرات بالساعة).',
    });
    return;
  }

  const rateLimit = checkRateLimit(`admin_rec_${cleanEmail}`, 6, 30 * 60 * 1000);
  if (!rateLimit.allowed) {
    res.status(429).json({
      error: 'تم تجاوز الحد المسموح (6 محاولات). تم حظر المحاولات مؤقتاً.',
    });
    return;
  }

  try {
    const isDesignatedSuperAdmin = isDesignatedSuperAdminEmail(cleanEmail);
    const store = readLocalStore();
    let matchedUser: UserProfileDocument | null = null;

    for (const [uid, data] of Object.entries(store.users)) {
      if (data.email?.trim().toLowerCase() === cleanEmail) {
        matchedUser = { ...(data as UserProfileDocument), uid };
        break;
      }
    }

    if (!matchedUser) {
      for (const [uid, c] of Object.entries(store.citizens)) {
        if (c.email?.trim().toLowerCase() === cleanEmail) {
          matchedUser = {
            uid,
            fullName: c.name || c.fullName || 'مسؤول',
            email: c.email,
            phone: c.phone || '',
            birthDate: c.birthDate || '',
            role: (c.role as UserRole) || 'citizen',
            reportsSubmittedCount: Number(c.reportsSubmittedCount || 0),
            resolvedReportsCount: Number(c.resolvedReportsCount || 0),
            isBlocked: Boolean(c.isBlocked),
            createdAt: c.joinedAt || c.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          break;
        }
      }
    }

    if (!matchedUser) {
      for (const [uid, a] of Object.entries(store.admins)) {
        if (a.email?.trim().toLowerCase() === cleanEmail) {
          matchedUser = {
            uid,
            fullName: a.fullName || a.name || 'مسؤول',
            email: a.email,
            phone: a.phone || '',
            birthDate: a.birthDate || '',
            role: (a.role as UserRole) || 'admin',
            reportsSubmittedCount: 0,
            resolvedReportsCount: 0,
            isBlocked: false,
            createdAt: a.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          break;
        }
      }
    }

    if (!matchedUser && isDesignatedSuperAdmin) {
      matchedUser = {
        uid: 'designated_super_admin',
        fullName: DESIGNATED_SUPER_ADMIN_NAME,
        email: DESIGNATED_SUPER_ADMIN_EMAIL,
        phone: '07504738358',
        birthDate: '1990-01-01',
        role: 'super_admin',
        reportsSubmittedCount: 0,
        resolvedReportsCount: 0,
        isBlocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    if (!matchedUser) {
      res.status(403).json({ error: 'بيانات غير صحيحة.' });
      return;
    }

    const targetUser = matchedUser as UserProfileDocument;
    const effectiveRole: UserRole = isDesignatedSuperAdmin ? 'super_admin' : targetUser.role;

    if (effectiveRole !== 'admin' && effectiveRole !== 'super_admin') {
      res.status(403).json({ error: 'غير مصرح.' });
      return;
    }

    let storedCode = '';
    const vaultItem = targetUser.uid ? store.admin_recovery_vault[targetUser.uid] : null;
    if (vaultItem) {
      if (vaultItem.plainRecoveryCode) {
        storedCode = String(vaultItem.plainRecoveryCode);
      } else if (vaultItem.encryptedData || vaultItem.encryptedCode) {
        try {
          storedCode = decryptRecoveryCode(vaultItem as any);
        } catch {}
      }
    }

    const deterministicCode = generateDeterministicRecoveryCode(cleanEmail);
    const deterministicUidCode = targetUser.uid ? generateDeterministicRecoveryCode(targetUser.uid) : '';

    let isMatch = false;
    if (storedCode && timingSafeMatch(cleanCode, storedCode)) {
      isMatch = true;
    } else if (timingSafeMatch(cleanCode, deterministicCode)) {
      isMatch = true;
    } else if (deterministicUidCode && timingSafeMatch(cleanCode, deterministicUidCode)) {
      isMatch = true;
    }

    if (!isMatch) {
      appendAuditLog({
        action:
          effectiveRole === 'super_admin'
            ? 'SUPER_ADMIN_RECOVERY_FAILED'
            : 'ADMIN_RECOVERY_FAILED',
        actorUid: targetUser.uid,
        actorEmail: cleanEmail,
        actorRole: effectiveRole,
        timestamp: new Date().toISOString(),
      });

      res.status(403).json({
        error: 'الرمز السري غير صحيح.',
      });
      return;
    }

    const memLimit = checkRateLimit(
      `pwd_reset_${cleanEmail}`,
      PASSWORD_RESET_MAX_PER_HOUR,
      PASSWORD_RESET_WINDOW_MS
    );
    if (!memLimit.allowed) {
      res.status(429).json({
        error: 'تجاوزت الحد المسموح (3 مرات بالساعة).',
      });
      return;
    }

    resetRateLimit(`admin_rec_${cleanEmail}`);
    recordPasswordResetLinkSent(cleanEmail);

    let backendSent = false;
    try {
      const oobRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseConfig.apiKey}`,
        {
          method: 'POST',
          headers: buildIdentityToolkitHeaders(),
          body: JSON.stringify({
            requestType: 'PASSWORD_RESET',
            email: cleanEmail,
          }),
        }
      );
      backendSent = oobRes.ok;
    } catch {}

    appendAuditLog({
      action:
        effectiveRole === 'super_admin'
          ? 'SUPER_ADMIN_RECOVERY_VERIFIED'
          : 'ADMIN_RECOVERY_VERIFIED',
      actorUid: targetUser.uid,
      actorEmail: cleanEmail,
      actorRole: effectiveRole,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      role: effectiveRole,
      sendClientResetEmail: true,
      message: 'تم إرسال رابط آمن لإعادة تعيين كلمة المرور إلى بريدك.',
    });
  } catch {
    res.status(500).json({ error: 'فشل التحقق.' });
  }
});
