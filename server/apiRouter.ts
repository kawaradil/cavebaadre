import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateSecureRecoveryCode,
  encryptRecoveryCode,
  decryptRecoveryCode,
  timingSafeMatch,
} from './security/encryption';
import { checkRateLimit, resetRateLimit } from './security/rateLimiter';
import {
  readLocalStore,
  writeLocalStore,
  restGetDoc,
  restListDocs,
  restSetDoc,
  restDeleteDoc,
  appCheckContext,
  getActiveAppCheckToken,
} from './firestoreRest';
import {
  CitizenProfileDTO,
  AdminCitizenDTO,
  toCitizenProfileDTO,
  toAdminCitizenDTO,
  toReportDTO,
  toNewReportNotificationPayloadDTO,
} from '../src/types/dto';
import { UserProfileDocument, UserRole } from '../src/types/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load firebase applet config
const configPath = path.resolve(__dirname, '../firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

export const apiRouter = Router();

// Propagate client X-Firebase-AppCheck token across async operations in this request
apiRouter.use((req, _res, next) => {
  const rawHeader = req.headers['x-firebase-appcheck'];
  const appCheckToken = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  appCheckContext.run(
    { appCheckToken: typeof appCheckToken === 'string' ? appCheckToken.trim() : undefined },
    () => next()
  );
});

export const DESIGNATED_SUPER_ADMIN_EMAIL = '11kattak11@gmail.com';
export const DESIGNATED_SUPER_ADMIN_NAME = 'كاوار عادل طاهر';

function isDesignatedSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return clean === DESIGNATED_SUPER_ADMIN_EMAIL;
}

function appendAuditLog(entry: Record<string, any>, idToken?: string): void {
  const store = readLocalStore();
  const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const fullEntry = { id: logId, ...entry };
  store.audit_logs = [fullEntry, ...(store.audit_logs || [])].slice(0, 200);
  writeLocalStore(store);

  if (idToken) {
    restSetDoc('audit_logs', logId, fullEntry, idToken, true).catch(() => {});
  }
}

function buildIdentityToolkitHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const appCheckToken = getActiveAppCheckToken();
  if (appCheckToken) {
    headers['X-Firebase-AppCheck'] = appCheckToken;
  }
  return headers;
}

/**
 * Helper to verify Firebase ID token using Google Identity Toolkit REST API
 */
async function verifyFirebaseIdToken(
  idToken: string
): Promise<{ uid: string; email?: string; claims?: Record<string, any> } | null> {
  if (!idToken || typeof idToken !== 'string') return null;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: buildIdentityToolkitHeaders(),
        body: JSON.stringify({ idToken }),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const user = data.users?.[0];
    if (!user || !user.localId) return null;

    let parsedClaims: Record<string, any> = {};
    if (user.customAttributes) {
      try {
        parsedClaims = JSON.parse(user.customAttributes);
      } catch {}
    }

    return {
      uid: user.localId,
      email: user.email,
      claims: parsedClaims,
    };
  } catch {
    return null;
  }
}

/**
 * Ensures the designated Super Admin account (كاوار عادل طاهر - 11kattak11@gmail.com)
 * is provisioned in local security store and synced to Firestore via authenticated REST API.
 */
async function ensureDesignatedSuperAdminProvisioned(params: {
  uid: string;
  email: string;
  fullName?: string;
  phone?: string;
  birthDate?: string;
  idToken?: string;
}): Promise<UserProfileDocument> {
  const { uid, email, fullName, phone, birthDate, idToken } = params;
  const cleanEmail = email.trim().toLowerCase();
  const nowIso = new Date().toISOString();

  const store = readLocalStore();
  const remoteUser = idToken ? await restGetDoc('users', uid, idToken) : null;
  const existingData: Partial<UserProfileDocument> = {
    ...(store.users[uid] || {}),
    ...(remoteUser || {}),
  };

  const resolvedName =
    fullName?.trim() || existingData.fullName?.trim() || DESIGNATED_SUPER_ADMIN_NAME;
  const resolvedPhone = phone?.trim() || existingData.phone?.trim() || '07504738358';
  const resolvedBirthDate = birthDate || existingData.birthDate || '1990-01-01';

  const superAdminProfile: UserProfileDocument = {
    uid,
    fullName: resolvedName,
    email: cleanEmail,
    phone: resolvedPhone,
    birthDate: resolvedBirthDate,
    role: 'super_admin',
    reportsSubmittedCount: existingData.reportsSubmittedCount || 0,
    resolvedReportsCount: existingData.resolvedReportsCount || 0,
    isBlocked: false,
    createdAt: existingData.createdAt || nowIso,
    updatedAt: nowIso,
  };

  const superMarker = {
    uid,
    email: cleanEmail,
    fullName: resolvedName,
    assignedBy: 'SYSTEM_DESIGNATED_SUPER_ADMIN',
    assignedAt: superAdminProfile.createdAt,
  };

  const adminMarker = {
    uid,
    email: cleanEmail,
    fullName: resolvedName,
    role: 'super_admin',
    assignedBy: 'SYSTEM_DESIGNATED_SUPER_ADMIN',
    assignedAt: superAdminProfile.createdAt,
  };

  const citizenRecord = {
    id: uid,
    name: resolvedName,
    email: cleanEmail,
    phone: resolvedPhone,
    birthDate: resolvedBirthDate,
    neighborhood: 'ناحية باعدرى',
    role: 'super_admin',
    reportsSubmittedCount: superAdminProfile.reportsSubmittedCount,
    resolvedReportsCount: superAdminProfile.resolvedReportsCount,
    joinedAt: superAdminProfile.createdAt,
    verified: true,
    isBlocked: false,
  };

  store.users[uid] = superAdminProfile;
  store.super_admins[uid] = superMarker;
  store.admins[uid] = adminMarker;
  store.citizens[uid] = citizenRecord;

  if (!store.admin_recovery_vault[uid]) {
    const recoveryCode = generateSecureRecoveryCode();
    store.admin_recovery_vault[uid] = encryptRecoveryCode(recoveryCode, 'super_admin');
  }

  writeLocalStore(store);

  if (idToken) {
    await Promise.all([
      restSetDoc('users', uid, superAdminProfile, idToken, true),
      restSetDoc('super_admins', uid, superMarker, idToken, true),
      restSetDoc('admins', uid, adminMarker, idToken, true),
      restSetDoc('citizens', uid, citizenRecord, idToken, true),
    ]);
  }

  return superAdminProfile;
}

/**
 * Middleware: Authenticate caller token and resolve user role
 */
async function authenticateUser(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'غير مصرح.' });
    return;
  }

  const token = authHeader.split('Bearer ')[1].trim();
  const verified = await verifyFirebaseIdToken(token);
  if (!verified) {
    res.status(401).json({ error: 'انتهت الجلسة.' });
    return;
  }

  const normalizedEmail = verified.email?.trim().toLowerCase() || '';
  const store = readLocalStore();

  let role: UserRole = isDesignatedSuperAdminEmail(normalizedEmail) ? 'super_admin' : 'citizen';

  if (
    verified.claims?.role === 'super_admin' ||
    verified.claims?.role === 'admin' ||
    verified.claims?.role === 'citizen'
  ) {
    if (role !== 'super_admin') {
      role = verified.claims.role as UserRole;
    }
  }

  if (isDesignatedSuperAdminEmail(normalizedEmail)) {
    try {
      await ensureDesignatedSuperAdminProvisioned({
        uid: verified.uid,
        email: normalizedEmail,
        fullName: DESIGNATED_SUPER_ADMIN_NAME,
        idToken: token,
      });
    } catch {}
    role = 'super_admin';
  } else {
    const localUser = store.users[verified.uid];
    if (localUser?.role && role === 'citizen') {
      role = localUser.role as UserRole;
    }
    if (store.admins[verified.uid] && role === 'citizen') {
      role = 'admin';
    }
    if (store.super_admins[verified.uid]) {
      role = 'super_admin';
    }

    if (role === 'citizen') {
      const remoteUser = await restGetDoc('users', verified.uid, token);
      if (remoteUser) {
        store.users[verified.uid] = remoteUser;
        writeLocalStore(store);
        if (remoteUser.role === 'admin' || remoteUser.role === 'super_admin') {
          role = remoteUser.role as UserRole;
        }
      }
    }

    if (role === 'citizen') {
      const remoteAdmin = await restGetDoc('admins', verified.uid, token);
      if (remoteAdmin) {
        role = (remoteAdmin.role as UserRole) || 'admin';
      }
    }

    if (role !== 'super_admin') {
      const remoteSuperAdmin = await restGetDoc('super_admins', verified.uid, token);
      if (remoteSuperAdmin) {
        role = 'super_admin';
      }
    }
  }

  // Enforce backend block check for non-designated accounts
  if (!isDesignatedSuperAdminEmail(normalizedEmail)) {
    const blockedInStore =
      Boolean(store.users[verified.uid]?.isBlocked) ||
      Boolean(store.citizens[verified.uid]?.isBlocked);
    if (blockedInStore) {
      res.status(403).json({ error: 'تم حظر هذا الحساب.' });
      return;
    }
  }

  (req as any).user = {
    uid: verified.uid,
    email: verified.email,
    role,
    claims: verified.claims,
    idToken: token,
  };

  next();
}

const PASSWORD_RESET_MAX_PER_HOUR = 3;
const PASSWORD_RESET_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function canSendPasswordResetLink(cleanEmail: string): boolean {
  const store = readLocalStore();
  if (!store.password_reset_limits) {
    store.password_reset_limits = {};
  }
  const now = Date.now();
  const entry = store.password_reset_limits[cleanEmail];
  if (!entry || now - entry.windowStartMs >= PASSWORD_RESET_WINDOW_MS) {
    return true;
  }
  return entry.count < PASSWORD_RESET_MAX_PER_HOUR;
}

function recordPasswordResetLinkSent(cleanEmail: string): void {
  const store = readLocalStore();
  if (!store.password_reset_limits) {
    store.password_reset_limits = {};
  }
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const entry = store.password_reset_limits[cleanEmail];
  if (!entry || now - entry.windowStartMs >= PASSWORD_RESET_WINDOW_MS) {
    store.password_reset_limits[cleanEmail] = {
      count: 1,
      windowStartMs: now,
      updatedAt: nowIso,
    };
  } else {
    store.password_reset_limits[cleanEmail] = {
      count: entry.count + 1,
      windowStartMs: entry.windowStartMs,
      updatedAt: nowIso,
    };
  }
  writeLocalStore(store);
}

/**
 * Checks if an email is already registered in local store or Firebase Auth
 */
async function isEmailRegisteredOnPlatform(cleanEmail: string, excludeUid?: string): Promise<boolean> {
  if (!cleanEmail) return false;
  if (isDesignatedSuperAdminEmail(cleanEmail)) {
    return true;
  }

  const store = readLocalStore();
  for (const [uid, u] of Object.entries(store.users || {})) {
    if (excludeUid && uid === excludeUid) continue;
    if (String(u?.email || '').trim().toLowerCase() === cleanEmail) {
      return true;
    }
  }
  for (const [id, c] of Object.entries(store.citizens || {})) {
    if (excludeUid && id === excludeUid) continue;
    if (String(c?.email || '').trim().toLowerCase() === cleanEmail) {
      return true;
    }
  }
  for (const [uid, a] of Object.entries(store.admins || {})) {
    if (excludeUid && uid === excludeUid) continue;
    if (String(a?.email || '').trim().toLowerCase() === cleanEmail) {
      return true;
    }
  }
  for (const [uid, s] of Object.entries(store.super_admins || {})) {
    if (excludeUid && uid === excludeUid) continue;
    if (String(s?.email || '').trim().toLowerCase() === cleanEmail) {
      return true;
    }
  }

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: buildIdentityToolkitHeaders(),
        body: JSON.stringify({
          identifier: cleanEmail,
          continueUri: 'http://localhost',
        }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.registered === true) {
        return true;
      }
    }
  } catch {}

  return false;
}

function getRecoveryCallerKey(req: Request): string {
  const clientKey = String(req.body?.clientKey || '').trim();
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwarded || req.ip || 'default_ip';
  return clientKey ? `client_${clientKey}` : `ip_${ip}`;
}

/**
 * 0. Check if Email Exists before Registration
 */
apiRouter.post('/auth/check-email', async (req: Request, res: Response) => {
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
apiRouter.post('/auth/register-citizen', async (req: Request, res: Response) => {
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
      reportsSubmittedCount: 0,
      resolvedReportsCount: 0,
      isBlocked: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const citizenDoc = {
      id: uid,
      name: cleanFullName,
      email: cleanEmail,
      phone: cleanPhone,
      birthDate: cleanBirthDate,
      role: assignedRole,
      neighborhood: 'ناحية باعدرى',
      reportsSubmittedCount: 0,
      resolvedReportsCount: 0,
      joinedAt: nowIso,
      verified: true,
      isBlocked: false,
    };

    const store = readLocalStore();
    store.users[uid] = profileDoc;
    store.citizens[uid] = citizenDoc;
    writeLocalStore(store);

    if (idToken) {
      await Promise.all([
        restSetDoc('users', uid, profileDoc, idToken, true),
        restSetDoc('citizens', uid, citizenDoc, idToken, true),
      ]);
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
apiRouter.get('/auth/me', authenticateUser, async (req: Request, res: Response) => {
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
apiRouter.post('/auth/update-account', authenticateUser, async (req: Request, res: Response) => {
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

    const existingCitizen = store.citizens[caller.uid] || {};
    const updatedCitizenDoc = {
      ...existingCitizen,
      id: caller.uid,
      name: cleanName,
      email: updatedUserDoc.email,
      phone: cleanPhone,
      birthDate: resolvedBirthDate,
      role: effectiveRole,
      neighborhood: updatedUserDoc.neighborhood || 'ناحية باعدرى',
      reportsSubmittedCount: updatedUserDoc.reportsSubmittedCount,
      resolvedReportsCount: updatedUserDoc.resolvedReportsCount,
      joinedAt: existingCitizen.joinedAt || updatedUserDoc.createdAt,
      verified: true,
      isBlocked: updatedUserDoc.isBlocked,
      updatedAt: nowIso,
    };

    store.users[caller.uid] = updatedUserDoc;
    store.citizens[caller.uid] = updatedCitizenDoc;
    writeLocalStore(store);

    if (caller.idToken) {
      await Promise.all([
        restSetDoc('users', caller.uid, updatedUserDoc, caller.idToken, true),
        restSetDoc('citizens', caller.uid, updatedCitizenDoc, caller.idToken, true),
      ]);
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
apiRouter.post('/auth/delete-account', authenticateUser, async (req: Request, res: Response) => {
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
 *    - Enforces 3 wrong-email attempts limit: on 3rd wrong email, blocks further attempts for 1 hour and prompts user to contact administration.
 *    - Also enforces 3 reset links per hour per valid email.
 */
apiRouter.post('/auth/citizen-password-recovery', async (req: Request, res: Response) => {
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

    const memLimit = checkRateLimit(`pwd_reset_${cleanEmail}`, PASSWORD_RESET_MAX_PER_HOUR, PASSWORD_RESET_WINDOW_MS);
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
apiRouter.post('/auth/admin-verify-recovery', async (req: Request, res: Response) => {
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
    if (targetUser.uid && store.admin_recovery_vault[targetUser.uid]) {
      try {
        storedCode = decryptRecoveryCode(store.admin_recovery_vault[targetUser.uid] as any);
      } catch {}
    }

    let isMatch = false;
    if (storedCode && timingSafeMatch(cleanCode, storedCode)) {
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

    const memLimit = checkRateLimit(`pwd_reset_${cleanEmail}`, PASSWORD_RESET_MAX_PER_HOUR, PASSWORD_RESET_WINDOW_MS);
    if (!memLimit.allowed) {
      res.status(429).json({
        error: 'تجاوزت الحد المسموح (3 مرات بالساعة).',
      });
      return;
    }

    resetRateLimit(`admin_rec_${cleanEmail}`);
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
      message: 'تم إرسال رابط آمن لإعادة تعيين كلمة المرور إلى بريدك.',
    });
  } catch {
    res.status(500).json({ error: 'فشل التحقق.' });
  }
});

/**
 * 5. List Registered Users for Admin (AdminCitizenDTO)
 * Strictly excludes: passwords, recovery codes, encryption keys, and temporary citizens!
 */
apiRouter.get('/admin/citizens', authenticateUser, async (req: Request, res: Response) => {
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
 * - Admin can change Citizen -> Admin and Admin -> Citizen, but CANNOT grant Super Admin or modify a Super Admin.
 * - Super Admin can change Citizen <-> Admin and grant Super Admin, but CANNOT modify another Super Admin.
 */
apiRouter.post('/admin/change-role', authenticateUser, async (req: Request, res: Response) => {
  const caller = (req as any).user;
  if (caller.role !== 'admin' && caller.role !== 'super_admin') {
    res.status(403).json({ error: 'غير مصرح: تعديل الأدوار محصور بحسابات الإدارة (Admin / Super Admin).' });
    return;
  }

  const { targetUid, newRole } = req.body;
  if (!targetUid || !newRole || !['citizen', 'admin', 'super_admin'].includes(newRole)) {
    res.status(400).json({ error: 'البيانات المدخلة غير صحيحة.' });
    return;
  }

  // MANDATORY CONSTRAINT: Admin CANNOT grant super_admin role!
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

    // MANDATORY CONSTRAINT: Cannot modify a super_admin!
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
apiRouter.post(
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
        vaultData = encryptRecoveryCode(freshCode, targetRole === 'super_admin' ? 'super_admin' : 'admin');
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
apiRouter.post('/admin/bootstrap-first-super-admin', async (req: Request, res: Response) => {
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
      phone: adminPhone || '07504738358',
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
apiRouter.get('/admin/audit-logs', authenticateUser, async (req: Request, res: Response) => {
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
apiRouter.post(
  '/admin/update-report-status',
  authenticateUser,
  async (req: Request, res: Response) => {
    const caller = (req as any).user;
    if (caller.role !== 'admin' && caller.role !== 'super_admin') {
      res.status(403).json({
        error: 'غير مصرح: إدارة البلاغات وتغيير حالتها محصورة بحسابات الإدارة (Admin / Super Admin).',
      });
      return;
    }

    const { reportId, status, assignedTeam, officialNote, urgency, resolvedImages } = req.body || {};
    if (!reportId || !status) {
      res.status(400).json({ error: 'معرّف البلاغ والحالة الجديدة مطلوبان.' });
      return;
    }

    const allowedStatuses = ['pending', 'new', 'in_progress', 'sent', 'resolved', 'completed', 'rejected'];
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
 * 11. Submit Survey Response (Single Participation per Survey Guaranteed)
 */
apiRouter.post(
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
apiRouter.post(
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
apiRouter.post(
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
apiRouter.post(
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
 * 15. Secure Backend Blocking / Unblocking for Citizens & Admins
 */
apiRouter.post(
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
          (store.super_admins[cleanUid] ? 'super_admin' : store.admins[cleanUid] ? 'admin' : 'citizen');

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
apiRouter.post(
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

/**
 * 16. Cloud Contact Settings (Read by all, Updated only by Admin & Super Admin)
 */
const DEFAULT_CONTACT_SETTINGS = {
  whatsappReportsNumber: '9647749019911',
  contactPhone: '9647749019911',
  contactEmail: 'cavebaadre@gmail.com',
};

apiRouter.get('/settings/contact', async (_req: Request, res: Response) => {
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

apiRouter.post(
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


