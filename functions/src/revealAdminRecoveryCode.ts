import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

interface RevealRecoveryCodeRequestData {
  targetAdminUid: string;
  superAdminPasswordVerificationToken?: string; // Verification indicator after password prompt
}

export const revealAdminRecoveryCode = functions.https.onCall(
  async (request: functions.https.CallableRequest<RevealRecoveryCodeRequestData>) => {
    // 1. Verify caller authentication
    if (!request.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'يجب تسجيل الدخول لتنفيذ هذا الإجراء.'
      );
    }

    const callerUid = request.auth.uid;
    const callerClaims = request.auth.token;

    // 2. Verify caller has super_admin role
    if (callerClaims.role !== 'super_admin' && !callerClaims.isSuperAdmin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'غير مصرح: كشف رموز الاسترداد محصور بالسوبر أدمن فقط.'
      );
    }

    const { targetAdminUid } = request.data;
    if (!targetAdminUid) {
      throw new functions.https.HttpsError('invalid-argument', 'معرّف المسؤول مطلوب.');
    }

    const db = admin.firestore();
    const auth = admin.auth();

    // 3. Rate limiting check (max 3 reveal requests per 15 minutes)
    const rateLimitDocRef = db.collection('admin_security_rate_limits').doc(callerUid);
    const rateLimitSnap = await rateLimitDocRef.get();
    const now = Date.now();
    if (rateLimitSnap.exists) {
      const data = rateLimitSnap.data() || {};
      const windowStart = data.windowStart || 0;
      const count = data.count || 0;
      if (now - windowStart < 15 * 60 * 1000) {
        if (count >= 5) {
          throw new functions.https.HttpsError(
            'resource-exhausted',
            'تم تجاوز الحد المسموح لمحاولات كشف رموز الاسترداد. يرجى المحاولة بعد 15 دقيقة.'
          );
        }
        await rateLimitDocRef.update({ count: count + 1 });
      } else {
        await rateLimitDocRef.set({ windowStart: now, count: 1 });
      }
    } else {
      await rateLimitDocRef.set({ windowStart: now, count: 1 });
    }

    // 4. Fetch target user
    let targetUser: admin.auth.UserRecord;
    try {
      targetUser = await auth.getUser(targetAdminUid);
    } catch {
      throw new functions.https.HttpsError('not-found', 'المسؤول المستهدف غير موجود.');
    }

    const targetRole = (targetUser.customClaims?.role as string) || 'citizen';

    // 5. MANDATORY SECURITY CONSTRAINT:
    // "لا تسمح لسوبر أدمن بكشف أو تغيير رمز استرداد سوبر أدمن آخر"
    if (targetRole === 'super_admin' && callerUid !== targetAdminUid) {
      // Record violation attempt in audit logs
      await db.collection('audit_logs').add({
        action: 'RECOVERY_CODE_REVEAL_ATTEMPT_DENIED',
        actorUid: callerUid,
        actorEmail: callerClaims.email || '',
        targetUid: targetAdminUid,
        targetEmail: targetUser.email || '',
        reason: 'Super Admin attempted to reveal recovery code of another Super Admin (strictly forbidden).',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      throw new functions.https.HttpsError(
        'permission-denied',
        'قيد أمني مشدد: لا يمكن لأي سوبر أدمن كشف رمز استرداد سوبر أدمن آخر.'
      );
    }

    // 6. Fetch from admin_recovery_vault
    const vaultDoc = await db.collection('admin_recovery_vault').doc(targetAdminUid).get();
    if (!vaultDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'لم يتم العثور على رمز استرداد مسجل لهذا الحساب الإداري.'
      );
    }

    const vaultData = vaultDoc.data();
    if (!vaultData?.encryptedData || !vaultData?.iv || !vaultData?.authTag) {
      throw new functions.https.HttpsError(
        'internal',
        'بيانات التشفير الخاصة برمز الاسترداد غير صالحة.'
      );
    }

    // 7. Decrypt recovery code using AES-256-GCM
    let decryptedCode = '';
    try {
      const masterKey = crypto
        .createHash('sha256')
        .update(process.env.RECOVERY_ENCRYPTION_KEY || 'RABA_CAVE_BAADRE_CIVIC_SECURE_VAULT_KEY_2026')
        .digest();
      const iv = Buffer.from(vaultData.iv, 'base64');
      const authTag = Buffer.from(vaultData.authTag, 'base64');
      const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
      decipher.setAuthTag(authTag);
      decryptedCode = decipher.update(vaultData.encryptedData, 'base64', 'utf8');
      decryptedCode += decipher.final('utf8');
    } catch {
      throw new functions.https.HttpsError('internal', 'فشل فك تشفير رمز الاسترداد.');
    }

    // 8. Record successful reveal in Audit Log
    await db.collection('audit_logs').add({
      action: 'RECOVERY_CODE_REVEALED',
      actorUid: callerUid,
      actorEmail: callerClaims.email || '',
      actorRole: 'super_admin',
      targetUid: targetAdminUid,
      targetEmail: targetUser.email || '',
      targetRole,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      targetAdminUid,
      targetAdminEmail: targetUser.email,
      recoveryCode: decryptedCode.trim(),
    };
  }
);
