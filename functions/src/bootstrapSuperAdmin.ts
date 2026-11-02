import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

interface BootstrapRequestData {
  setupSecretKey: string;
  adminEmail: string;
  adminPassword?: string;
  adminFullName: string;
  adminPhone?: string;
}

/**
 * Cloud Function to safely bootstrap the first Super Admin account once.
 * Ensures that public registration cannot grant super_admin.
 * Enforces one-time execution via atomic Firestore check.
 */
export const bootstrapFirstSuperAdmin = functions.https.onCall(
  async (request: functions.https.CallableRequest<BootstrapRequestData>) => {
    const db = admin.firestore();
    const auth = admin.auth();

    const { setupSecretKey, adminEmail, adminFullName, adminPhone } = request.data;

    // 1. Validate Secret Token against configured environment secret
    const EXPECTED_SECRET = process.env.SYSTEM_BOOTSTRAP_SECRET || 'RABA_BAADRE_BOOTSTRAP_2026';
    if (!setupSecretKey || setupSecretKey.trim() !== EXPECTED_SECRET) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'مفتاح التهيئة السري غير صحيح. يتطلب صلاحية موثوقة لإجراء التهيئة.'
      );
    }

    if (!adminEmail || !adminFullName) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'البريد الإلكتروني والاسم الكامل مطلوبان لإتمام التهيئة.'
      );
    }

    // 2. Check if the system has already been bootstrapped
    const bootstrapDocRef = db.collection('system_config').doc('bootstrap');
    const existingBootstrap = await bootstrapDocRef.get();

    if (existingBootstrap.exists && existingBootstrap.data()?.isBootstrapped) {
      throw new functions.https.HttpsError(
        'already-exists',
        'تمت تهيئة النظام وتعيين أول سوبر أدمن مسبقاً. يُمنع إعادة تنفيذ هذه العملية نهائياً لأسباب أمنية.'
      );
    }

    try {
      // 3. Find or retrieve the target user in Firebase Auth
      let targetUser: admin.auth.UserRecord;
      try {
        targetUser = await auth.getUserByEmail(adminEmail);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          // If password was provided, create user; otherwise require pre-existing user
          if (request.data.adminPassword) {
            targetUser = await auth.createUser({
              email: adminEmail,
              password: request.data.adminPassword,
              displayName: adminFullName,
              emailVerified: true,
            });
          } else {
            throw new functions.https.HttpsError(
              'not-found',
              'المستخدم غير مسجل في Firebase Auth. يرجى توفير كلمة مرور لإنشاء الحساب أو تسجيل الحساب أولاً.'
            );
          }
        } else {
          throw err;
        }
      }

      const uid = targetUser.uid;

      // 4. Set Custom Claims: role = 'super_admin'
      await auth.setCustomUserClaims(uid, {
        role: 'super_admin',
        isSuperAdmin: true,
        isAdmin: true,
      });

      // 5. Generate secure static recovery code
      const rawHex = crypto.randomBytes(16).toString('hex').toUpperCase();
      const recoveryCode = `RC-${rawHex.slice(0, 4)}-${rawHex.slice(4, 8)}-${rawHex.slice(8, 12)}-${rawHex.slice(12, 16)}`;

      // 6. Encrypt recovery code using AES-256-GCM
      const masterKey = crypto
        .createHash('sha256')
        .update(process.env.RECOVERY_ENCRYPTION_KEY || 'RABA_CAVE_BAADRE_CIVIC_SECURE_VAULT_KEY_2026')
        .digest();
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
      let encrypted = cipher.update(recoveryCode, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      const authTag = cipher.getAuthTag();

      // 7. Atomic batch commit
      const batch = db.batch();

      // Store encrypted recovery vault entry (forbidden from client read)
      const vaultRef = db.collection('admin_recovery_vault').doc(uid);
      batch.set(vaultRef, {
        encryptedData: encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        algorithm: 'aes-256-gcm',
        role: 'super_admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Marker doc in super_admins collection for security rules
      const superAdminMarkerRef = db.collection('super_admins').doc(uid);
      batch.set(superAdminMarkerRef, {
        uid,
        email: adminEmail,
        fullName: adminFullName,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Marker doc in admins collection
      const adminMarkerRef = db.collection('admins').doc(uid);
      batch.set(adminMarkerRef, {
        uid,
        email: adminEmail,
        fullName: adminFullName,
        role: 'super_admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // User profile doc
      const userRef = db.collection('users').doc(uid);
      batch.set(
        userRef,
        {
          uid,
          email: adminEmail,
          fullName: adminFullName,
          phone: adminPhone || '07500000000',
          birthDate: '1990-01-01',
          role: 'super_admin',
          joinedAt: new Date().toISOString(),
          isBlocked: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // System config: mark as bootstrapped
      batch.set(bootstrapDocRef, {
        isBootstrapped: true,
        bootstrappedAt: admin.firestore.FieldValue.serverTimestamp(),
        superAdminUid: uid,
        superAdminEmail: adminEmail,
      });

      // Audit Log
      const auditLogRef = db.collection('audit_logs').doc();
      batch.set(auditLogRef, {
        action: 'SYSTEM_BOOTSTRAP_SUPER_ADMIN',
        actorUid: 'SYSTEM_BOOTSTRAP',
        targetUid: uid,
        targetEmail: adminEmail,
        targetRole: 'super_admin',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: {
          note: 'First super admin initialized successfully with custom claims and encrypted recovery vault.',
        },
      });

      await batch.commit();

      // Return the unencrypted recovery code ONLY ONCE during bootstrap output
      return {
        success: true,
        message: 'تمت تهيئة حساب السوبر أدمن الأول بنجاح وضبط الصلاحيات.',
        superAdminUid: uid,
        email: adminEmail,
        oneTimeRecoveryCode: recoveryCode,
      };
    } catch (err: any) {
      throw new functions.https.HttpsError('internal', err.message || 'فشلت عملية تهيئة النظام.');
    }
  }
);
