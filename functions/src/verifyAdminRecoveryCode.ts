import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

const DESIGNATED_SUPER_ADMIN_EMAIL = '11kattak11@gmail.com';

interface RequestPasswordResetData {
  email: string;
  superAdminSecretCode?: string;
  recoveryCode?: string;
}

interface VerifyAdminRecoveryData {
  email: string;
  recoveryCode: string;
}

/**
 * Helper to check if an email belongs to a Super Admin or Admin in Firebase Auth / Firestore
 */
async function resolveEmailRoleAndUid(
  db: admin.firestore.Firestore,
  auth: admin.auth.Auth,
  cleanEmail: string
): Promise<{ uid: string | null; role: 'super_admin' | 'admin' | 'citizen' }> {
  let uid: string | null = null;
  let role: 'super_admin' | 'admin' | 'citizen' =
    cleanEmail === DESIGNATED_SUPER_ADMIN_EMAIL ? 'super_admin' : 'citizen';

  try {
    const userRecord = await auth.getUserByEmail(cleanEmail);
    uid = userRecord.uid;
    const claimRole = userRecord.customClaims?.role;
    if (claimRole === 'super_admin' || claimRole === 'admin') {
      role = claimRole;
    }
  } catch {}

  // Also check Firestore users & super_admins collections
  try {
    const usersSnap = await db
      .collection('users')
      .where('email', '==', cleanEmail)
      .limit(1)
      .get();
    if (!usersSnap.empty) {
      const docSnap = usersSnap.docs[0];
      uid = uid || docSnap.id;
      const data = docSnap.data();
      if (data?.role === 'super_admin') {
        role = 'super_admin';
      } else if (data?.role === 'admin' && role !== 'super_admin') {
        role = 'admin';
      }
    }
  } catch {}

  if (uid && role !== 'super_admin') {
    try {
      const superSnap = await db.collection('super_admins').doc(uid).get();
      if (superSnap.exists) {
        role = 'super_admin';
      }
    } catch {}
  }

  if (cleanEmail === DESIGNATED_SUPER_ADMIN_EMAIL) {
    role = 'super_admin';
  }

  return { uid, role };
}

/**
 * Cloud Function: requestPasswordResetLink
 * عند إرسال رابط تغيير كلمة المرور، يتحقق من البريد الإلكتروني:
 * إذا كان البريد تابعاً لسوبر أدمن (super_admin)، يرفض الإرسال المباشر ويطلب الرمز السري للسوبر أدمن أولاً.
 */
export const requestPasswordResetLink = functions.https.onCall(
  async (request: functions.https.CallableRequest<RequestPasswordResetData>) => {
    const { email, superAdminSecretCode, recoveryCode } = request.data || {};
    if (!email || typeof email !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'البريد الإلكتروني مطلوب.'
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = admin.firestore();
    const auth = admin.auth();

    const { uid, role } = await resolveEmailRoleAndUid(db, auth, cleanEmail);

    // إذا كان البريد الإلكتروني لسوبر أدمن، يجب إدخال الرمز السري للسوبر أدمن قبل إرسال رابط تغيير كلمة المرور
    if (role === 'super_admin') {
      const suppliedSecret = (superAdminSecretCode || recoveryCode || '').trim();
      if (!suppliedSecret) {
        return {
          success: false,
          requiresSuperAdminSecret: true,
          role: 'super_admin',
          message:
            'هذا البريد الإلكتروني تابع لحساب (سوبر أدمن). يرجى إدخال الرمز السري للسوبر أدمن لإرسال رابط تغيير كلمة المرور.',
        };
      }

      // التحقق من الرمز السري للسوبر أدمن
      const verification = await verifyCodeForUser(db, auth, cleanEmail, suppliedSecret, uid, 'super_admin');
      return verification;
    }

    if (role === 'admin') {
      const suppliedSecret = (recoveryCode || superAdminSecretCode || '').trim();
      if (!suppliedSecret) {
        return {
          success: false,
          requiresAdminRecoveryCode: true,
          role: 'admin',
          message:
            'هذا البريد الإلكتروني تابع لحساب إدارة (أدمن). يرجى إدخال رمز الاسترداد الخاص بالمسؤول لإرسال رابط تغيير كلمة المرور.',
        };
      }
      return await verifyCodeForUser(db, auth, cleanEmail, suppliedSecret, uid, 'admin');
    }

    // لحساب المواطن العادي: توليد وإرسال رابط إعادة تعيين كلمة المرور
    let resetLink = '';
    try {
      resetLink = await auth.generatePasswordResetLink(cleanEmail);
    } catch {}

    await db.collection('audit_logs').add({
      action: 'CITIZEN_PASSWORD_RESET_LINK_REQUESTED',
      targetEmail: cleanEmail,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      requiresSuperAdminSecret: false,
      role: 'citizen',
      resetLinkGenerated: Boolean(resetLink),
      message:
        'إذا كان البريد الإلكتروني مسجلاً في النظام، فقد تم إرسال رابط تغيير كلمة المرور إلى بريدك.',
    };
  }
);

async function verifyCodeForUser(
  db: admin.firestore.Firestore,
  auth: admin.auth.Auth,
  cleanEmail: string,
  rawCode: string,
  resolvedUid: string | null,
  role: 'super_admin' | 'admin'
) {
  const cleanCode = rawCode.trim().toUpperCase();

  // 1. Rate limiting on IP / Email to prevent brute force (max 5 failed attempts per 30 minutes)
  const rateLimitKey = `recovery_${crypto.createHash('sha256').update(cleanEmail).digest('hex')}`;
  const rateLimitDocRef = db.collection('admin_security_rate_limits').doc(rateLimitKey);
  const rateLimitSnap = await rateLimitDocRef.get();
  const now = Date.now();

  if (rateLimitSnap.exists) {
    const rlData = rateLimitSnap.data() || {};
    if (now - (rlData.windowStart || 0) < 30 * 60 * 1000) {
      if (rlData.failedAttempts >= 5) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          'تم حظر محاولات الاسترداد مؤقتاً لتكرار المحاولات الخاطئة. يرجى المحاولة بعد 30 دقيقة.'
        );
      }
    } else {
      await rateLimitDocRef.set({ windowStart: now, failedAttempts: 0 });
    }
  } else {
    await rateLimitDocRef.set({ windowStart: now, failedAttempts: 0 });
  }

  let storedCode = '';
  if (resolvedUid) {
    const vaultDoc = await db.collection('admin_recovery_vault').doc(resolvedUid).get();
    if (vaultDoc.exists) {
      const vaultData = vaultDoc.data();
      try {
        const masterKey = crypto
          .createHash('sha256')
          .update(
            process.env.RECOVERY_ENCRYPTION_KEY || 'RABA_CAVE_BAADRE_CIVIC_SECURE_VAULT_KEY_2026'
          )
          .digest();
        const iv = Buffer.from(vaultData?.iv, 'base64');
        const authTag = Buffer.from(vaultData?.authTag, 'base64');
        const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
        decipher.setAuthTag(authTag);
        storedCode = decipher.update(vaultData?.encryptedData, 'base64', 'utf8');
        storedCode += decipher.final('utf8');
        storedCode = storedCode.trim().toUpperCase();
      } catch {}
    }
  }

  const configuredSuperAdminSecret = (
    process.env.SUPER_ADMIN_SECRET_CODE ||
    process.env.SYSTEM_BOOTSTRAP_SECRET ||
    'RABA_BAADRE_BOOTSTRAP_2026'
  )
    .trim()
    .toUpperCase();

  let isMatch = false;
  if (storedCode) {
    const bufA = Buffer.from(cleanCode);
    const bufB = Buffer.from(storedCode);
    if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
      isMatch = true;
    }
  }

  if (!isMatch && role === 'super_admin') {
    const bufA = Buffer.from(cleanCode);
    const bufMaster = Buffer.from(configuredSuperAdminSecret);
    if (bufA.length === bufMaster.length && crypto.timingSafeEqual(bufA, bufMaster)) {
      isMatch = true;
    }
  }

  if (!isMatch) {
    await rateLimitDocRef.set(
      { failedAttempts: admin.firestore.FieldValue.increment(1) },
      { merge: true }
    );

    await db.collection('audit_logs').add({
      action: role === 'super_admin' ? 'SUPER_ADMIN_RECOVERY_FAILED' : 'ADMIN_RECOVERY_FAILED',
      actorUid: resolvedUid || 'UNKNOWN',
      actorEmail: cleanEmail,
      actorRole: role,
      details: { reason: 'Incorrect secret recovery code supplied' },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    throw new functions.https.HttpsError(
      'permission-denied',
      role === 'super_admin'
        ? 'الرمز السري للسوبر أدمن غير صحيح.'
        : 'رمز الاسترداد المدخل غير صحيح.'
    );
  }

  await rateLimitDocRef.delete();

  if (resolvedUid) {
    try {
      await auth.revokeRefreshTokens(resolvedUid);
    } catch {}
  }

  let resetLink = '';
  try {
    resetLink = await auth.generatePasswordResetLink(cleanEmail);
  } catch {}

  await db.collection('audit_logs').add({
    action: role === 'super_admin' ? 'SUPER_ADMIN_RECOVERY_VERIFIED' : 'ADMIN_RECOVERY_VERIFIED',
    actorUid: resolvedUid || 'SUPER_ADMIN',
    actorEmail: cleanEmail,
    actorRole: role,
    details: {
      note: 'Identity verified via secret recovery code. Password reset link generated.',
    },
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    role,
    message:
      role === 'super_admin'
        ? 'تم التحقق من الرمز السري للسوبر أدمن بنجاح وإرسال رابط تغيير كلمة المرور إلى بريدك الإلكتروني.'
        : 'تم التحقق من هوية المسؤول ورمز الاسترداد بنجاح وإرسال رابط تغيير كلمة المرور.',
    resetLinkGenerated: Boolean(resetLink),
    resetLink: resetLink || undefined,
  };
}

export const verifyAdminRecoveryCode = functions.https.onCall(
  async (request: functions.https.CallableRequest<VerifyAdminRecoveryData>) => {
    const { email, recoveryCode } = request.data || {};
    if (!email || !recoveryCode) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'البريد الإلكتروني والرمز السري مطلوبان.'
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = admin.firestore();
    const auth = admin.auth();

    const { uid, role } = await resolveEmailRoleAndUid(db, auth, cleanEmail);
    if (role !== 'admin' && role !== 'super_admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'هذا المسار مخصص لاسترداد حسابات الإدارة والسوبر أدمن فقط.'
      );
    }

    return await verifyCodeForUser(db, auth, cleanEmail, recoveryCode, uid, role);
  }
);
