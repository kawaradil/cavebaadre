import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

interface ChangeRoleRequestData {
  targetUid: string;
  newRole: 'citizen' | 'admin' | 'super_admin';
  reason?: string;
}

export const changeUserRole = functions.https.onCall(
  async (request: functions.https.CallableRequest<ChangeRoleRequestData>) => {
    // 1. Verify caller is authenticated
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
        'غير مصرح: هذه العملية محصورة فقط بحساب السوبر أدمن (Super Admin).'
      );
    }

    const { targetUid, newRole, reason } = request.data;
    if (!targetUid || !newRole || !['citizen', 'admin', 'super_admin'].includes(newRole)) {
      throw new functions.https.HttpsError('invalid-argument', 'البيانات المدخلة غير صحيحة.');
    }

    const db = admin.firestore();
    const auth = admin.auth();

    // 3. Fetch target user record & claims
    let targetUser: admin.auth.UserRecord;
    try {
      targetUser = await auth.getUser(targetUid);
    } catch {
      throw new functions.https.HttpsError('not-found', 'المستخدم المستهدف غير موجود.');
    }

    const targetExistingRole = (targetUser.customClaims?.role as string) || 'citizen';

    // 4. MANDATORY SECURITY CONSTRAINT:
    // "لا يستطيع أي سوبر أدمن: حذف حساب سوبر أدمن آخر، أو تخفيض صلاحيات سوبر أدمن آخر"
    if (targetExistingRole === 'super_admin' && callerUid !== targetUid) {
      // Record denied attempt in audit log
      await db.collection('audit_logs').add({
        action: 'ROLE_CHANGE_DENIED',
        actorUid: callerUid,
        actorEmail: callerClaims.email || '',
        targetUid,
        targetEmail: targetUser.email || '',
        reason: 'Attempted to modify another Super Admin account (server constraint enforced).',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      throw new functions.https.HttpsError(
        'permission-denied',
        'قيد أمني إلزامي: لا يُسمح لأي سوبر أدمن بتعديل أو تخفيض صلاحيات سوبر أدمن آخر.'
      );
    }

    // 5. Update Custom Claims in Firebase Auth
    const updatedClaims = {
      role: newRole,
      isAdmin: newRole === 'admin' || newRole === 'super_admin',
      isSuperAdmin: newRole === 'super_admin',
    };
    await auth.setCustomUserClaims(targetUid, updatedClaims);

    // 6. Handle Recovery Code for newly promoted Admins
    const masterKey = crypto
      .createHash('sha256')
      .update(process.env.RECOVERY_ENCRYPTION_KEY || 'RABA_CAVE_BAADRE_CIVIC_SECURE_VAULT_KEY_2026')
      .digest();

    const batch = db.batch();
    const userRef = db.collection('users').doc(targetUid);
    const adminMarkerRef = db.collection('admins').doc(targetUid);
    const superAdminMarkerRef = db.collection('super_admins').doc(targetUid);
    const vaultRef = db.collection('admin_recovery_vault').doc(targetUid);

    batch.set(
      userRef,
      {
        role: newRole,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    let newlyGeneratedRecoveryCode: string | null = null;

    if (newRole === 'admin' || newRole === 'super_admin') {
      batch.set(adminMarkerRef, {
        uid: targetUid,
        email: targetUser.email || '',
        role: newRole,
        assignedBy: callerUid,
        assignedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (newRole === 'super_admin') {
        batch.set(superAdminMarkerRef, {
          uid: targetUid,
          email: targetUser.email || '',
          assignedBy: callerUid,
          assignedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        batch.delete(superAdminMarkerRef);
      }

      // Check if recovery code exists in vault, if not generate one
      const existingVaultDoc = await vaultRef.get();
      if (!existingVaultDoc.exists) {
        const rawHex = crypto.randomBytes(16).toString('hex').toUpperCase();
        newlyGeneratedRecoveryCode = `RC-${rawHex.slice(0, 4)}-${rawHex.slice(4, 8)}-${rawHex.slice(8, 12)}-${rawHex.slice(12, 16)}`;

        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
        let encrypted = cipher.update(newlyGeneratedRecoveryCode, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        const authTag = cipher.getAuthTag();

        batch.set(vaultRef, {
          encryptedData: encrypted,
          iv: iv.toString('base64'),
          authTag: authTag.toString('base64'),
          algorithm: 'aes-256-gcm',
          role: newRole,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } else {
      // Demoted to Citizen: remove markers and vault code
      batch.delete(adminMarkerRef);
      batch.delete(superAdminMarkerRef);
      batch.delete(vaultRef);

      // Session revocation: "عالج إبطال الجلسات عند سحب الصلاحيات الحساسة"
      await auth.revokeRefreshTokens(targetUid);
    }

    // 7. Write Audit Log
    const auditRef = db.collection('audit_logs').doc();
    batch.set(auditRef, {
      action: 'ROLE_CHANGED',
      actorUid: callerUid,
      actorEmail: callerClaims.email || '',
      actorRole: 'super_admin',
      targetUid,
      targetEmail: targetUser.email || '',
      oldRole: targetExistingRole,
      newRole,
      reason: reason || 'Role updated by Super Admin',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return {
      success: true,
      message: `تم تحديث دور المستخدم إلى (${newRole}) بنجاح.`,
      targetUid,
      newRole,
      newlyGeneratedRecoveryCode, // If newly created, returned once for administrative delivery
    };
  }
);
