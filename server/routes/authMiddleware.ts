import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateSecureRecoveryCode,
  generateDeterministicRecoveryCode,
  encryptRecoveryCode,
} from '../security/encryption';
import {
  readLocalStore,
  writeLocalStore,
  restGetDoc,
  restSetDoc,
  getActiveAppCheckToken,
} from '../firestoreRest';
import { UserProfileDocument, UserRole } from '../../src/types/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.resolve(__dirname, '../../firebase-applet-config.json');
export const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

export const DESIGNATED_SUPER_ADMIN_EMAIL = '11kattak11@gmail.com';
export const DESIGNATED_SUPER_ADMIN_NAME = 'كاوار عادل طاهر';

export const PASSWORD_RESET_MAX_PER_HOUR = 3;
export const PASSWORD_RESET_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export function isDesignatedSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return clean === DESIGNATED_SUPER_ADMIN_EMAIL;
}

export function appendAuditLog(entry: Record<string, any>, idToken?: string): void {
  const store = readLocalStore();
  const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const fullEntry = { id: logId, ...entry };
  store.audit_logs = [fullEntry, ...(store.audit_logs || [])].slice(0, 200);
  writeLocalStore(store);

  if (idToken) {
    restSetDoc('audit_logs', logId, fullEntry, idToken, true).catch(() => {});
  }
}

export function buildIdentityToolkitHeaders(): Record<string, string> {
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
export async function verifyFirebaseIdToken(
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
export async function ensureDesignatedSuperAdminProvisioned(params: {
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

  if (!store.admin_recovery_vault[uid]) {
    const remoteVault = idToken ? await restGetDoc('admin_recovery_vault', uid, idToken) : null;
    if (remoteVault && (remoteVault.encryptedData || remoteVault.encryptedCode || remoteVault.plainRecoveryCode)) {
      store.admin_recovery_vault[uid] = remoteVault;
    } else {
      const recoveryCode = generateDeterministicRecoveryCode(cleanEmail);
      store.admin_recovery_vault[uid] = {
        ...encryptRecoveryCode(recoveryCode, 'super_admin'),
        plainRecoveryCode: recoveryCode,
      };
    }
  }

  writeLocalStore(store);

  if (idToken) {
    await Promise.all([
      restSetDoc('users', uid, superAdminProfile, idToken, true),
      restSetDoc('super_admins', uid, superMarker, idToken, true),
      restSetDoc('admins', uid, adminMarker, idToken, true),
      restSetDoc('admin_recovery_vault', uid, store.admin_recovery_vault[uid], idToken, true),
    ]);
  }

  return superAdminProfile;
}

/**
 * Middleware: Authenticate caller token and resolve user role
 */
export async function authenticateUser(req: Request, res: Response, next: () => void) {
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

export function canSendPasswordResetLink(cleanEmail: string): boolean {
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

export function recordPasswordResetLinkSent(cleanEmail: string): void {
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
export async function isEmailRegisteredOnPlatform(
  cleanEmail: string,
  excludeUid?: string
): Promise<boolean> {
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
    } else if (res.status === 401 || res.status === 403) {
      // Identity Toolkit requires App Check token which may not be on backend;
      // treat as valid format candidate and delegate verification to the next secure step
      return true;
    }
  } catch {}

  return false;
}

export function getRecoveryCallerKey(req: Request): string {
  const clientKey = String(req.body?.clientKey || '').trim();
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwarded || req.ip || 'default_ip';
  return clientKey ? `client_${clientKey}` : `ip_${ip}`;
}
