import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  updatePassword,
  deleteUser,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import {
  CitizenProfileDTO,
  AdminCitizenDTO,
  toCitizenProfileDTO,
  toAdminCitizenDTO,
} from '../types/dto';
import { UserProfileDocument, UserRole } from '../types/auth';

export interface RegisterCitizenInput {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  birthDate: string;
}

export interface UpdateAccountInput {
  fullName: string;
  phone: string;
  birthDate: string;
  newPassword?: string;
}

export const DESIGNATED_SUPER_ADMIN_EMAIL = '11kattak11@gmail.com';
export const DESIGNATED_SUPER_ADMIN_NAME = 'كاوار عادل طاهر';

export const authService = {
  /**
   * 1. Register a new citizen account
   */
  async registerCitizen(input: RegisterCitizenInput): Promise<{
    user: User;
    profile: CitizenProfileDTO;
    role: UserRole;
  }> {
    const { fullName, email, password, phone, birthDate } = input;
    const normalizedEmail = email.trim().toLowerCase();
    const isDesignatedSuperAdmin = normalizedEmail === DESIGNATED_SUPER_ADMIN_EMAIL;
    const effectiveFullName = isDesignatedSuperAdmin
      ? DESIGNATED_SUPER_ADMIN_NAME
      : fullName.trim();

    const nameWords = effectiveFullName.split(/\s+/);
    if (nameWords.length < 3) {
      throw new Error('يرجى كتابة الاسم الثلاثي.');
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('البريد غير صالح.');
    }

    if (!password || password.length < 6) {
      throw new Error('كلمة المرور 6 أحرف على الأقل.');
    }

    if (!phone || phone.replace(/[\s-]/g, '').length < 10) {
      throw new Error('رقم الهاتف غير صالح.');
    }

    if (!birthDate) {
      throw new Error('تاريخ الميلاد مطلوب.');
    }

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      normalizedEmail,
      password
    );
    const user = userCredential.user;

    try {
      await updateProfile(user, { displayName: effectiveFullName });
    } catch {}

    const nowIso = new Date().toISOString();
    const resolvedRole: UserRole = isDesignatedSuperAdmin ? 'super_admin' : 'citizen';

    const profileDoc: UserProfileDocument = {
      uid: user.uid,
      fullName: effectiveFullName,
      email: normalizedEmail,
      phone: phone.trim(),
      birthDate,
      role: resolvedRole,
      neighborhood: 'ناحية باعدرى',
      reportsSubmittedCount: 0,
      resolvedReportsCount: 0,
      isBlocked: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const citizenDoc = {
      id: user.uid,
      name: effectiveFullName,
      email: normalizedEmail,
      phone: phone.trim(),
      birthDate,
      role: resolvedRole,
      neighborhood: 'ناحية باعدرى',
      reportsSubmittedCount: 0,
      resolvedReportsCount: 0,
      joinedAt: nowIso,
      verified: true,
      isBlocked: false,
    };

    try {
      await setDoc(doc(db, 'users', user.uid), profileDoc, { merge: true });
      await setDoc(doc(db, 'citizens', user.uid), citizenDoc, { merge: true });
      if (isDesignatedSuperAdmin) {
        await setDoc(
          doc(db, 'super_admins', user.uid),
          {
            uid: user.uid,
            email: normalizedEmail,
            fullName: effectiveFullName,
            assignedBy: 'SYSTEM_DESIGNATED_SUPER_ADMIN',
            assignedAt: nowIso,
          },
          { merge: true }
        );
        await setDoc(
          doc(db, 'admins', user.uid),
          {
            uid: user.uid,
            email: normalizedEmail,
            fullName: effectiveFullName,
            role: 'super_admin',
            assignedBy: 'SYSTEM_DESIGNATED_SUPER_ADMIN',
            assignedAt: nowIso,
          },
          { merge: true }
        );
      }
    } catch {}

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/auth/register-citizen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uid: user.uid,
          fullName: effectiveFullName,
          email: normalizedEmail,
          phone: phone.trim(),
          birthDate,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return {
          user,
          profile: result.profile,
          role: isDesignatedSuperAdmin ? 'super_admin' : (result.role as UserRole) || 'citizen',
        };
      }
    } catch {}

    return {
      user,
      profile: toCitizenProfileDTO(profileDoc),
      role: resolvedRole,
    };
  },

  /**
   * 2. Sign in with Email and Password
   */
  async login(email: string, pass: string): Promise<User> {
    if (!email || !pass) {
      throw new Error('البريد وكلمة المرور مطلوبان.');
    }
    const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
    return cred.user;
  },

  /**
   * 3. Sign out
   */
  async logout(): Promise<void> {
    await signOut(auth);
  },

  /**
   * 4. Fetch Profile DTO for current user
   */
  async fetchCurrentProfile(user: User): Promise<{
    profile: CitizenProfileDTO | AdminCitizenDTO;
    role: UserRole;
  }> {
    const cleanEmail = (user.email || '').trim().toLowerCase();
    const isDesignatedSuperAdmin = cleanEmail === DESIGNATED_SUPER_ADMIN_EMAIL;
    const nowIso = new Date().toISOString();

    if (isDesignatedSuperAdmin) {
      try {
        await setDoc(
          doc(db, 'users', user.uid),
          {
            uid: user.uid,
            fullName: DESIGNATED_SUPER_ADMIN_NAME,
            email: DESIGNATED_SUPER_ADMIN_EMAIL,
            role: 'super_admin',
            isBlocked: false,
            updatedAt: nowIso,
          },
          { merge: true }
        );
        await setDoc(
          doc(db, 'super_admins', user.uid),
          {
            uid: user.uid,
            email: DESIGNATED_SUPER_ADMIN_EMAIL,
            fullName: DESIGNATED_SUPER_ADMIN_NAME,
            assignedBy: 'SYSTEM_DESIGNATED_SUPER_ADMIN',
            assignedAt: nowIso,
          },
          { merge: true }
        );
        await setDoc(
          doc(db, 'admins', user.uid),
          {
            uid: user.uid,
            email: DESIGNATED_SUPER_ADMIN_EMAIL,
            fullName: DESIGNATED_SUPER_ADMIN_NAME,
            role: 'super_admin',
            assignedBy: 'SYSTEM_DESIGNATED_SUPER_ADMIN',
            assignedAt: nowIso,
          },
          { merge: true }
        );
        await setDoc(
          doc(db, 'citizens', user.uid),
          {
            id: user.uid,
            name: DESIGNATED_SUPER_ADMIN_NAME,
            email: DESIGNATED_SUPER_ADMIN_EMAIL,
            role: 'super_admin',
            neighborhood: 'ناحية باعدرى',
            verified: true,
            isBlocked: false,
          },
          { merge: true }
        );
      } catch {}
    }

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (isDesignatedSuperAdmin) {
          return {
            ...data,
            role: 'super_admin',
            profile: {
              ...data.profile,
              fullName: DESIGNATED_SUPER_ADMIN_NAME,
              role: 'super_admin',
            },
          };
        }
        return data;
      } else if (res.status === 403 && !isDesignatedSuperAdmin) {
        await signOut(auth);
        throw new Error('تم حظر هذا الحساب.');
      }
    } catch (err: any) {
      if (err?.message === 'تم حظر هذا الحساب.') {
        throw err;
      }
    }

    try {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (userSnap.exists()) {
        const uData = userSnap.data() as UserProfileDocument;
        if (uData.isBlocked && !isDesignatedSuperAdmin) {
          await signOut(auth);
          throw new Error('تم حظر هذا الحساب.');
        }
        const resolvedRole: UserRole = isDesignatedSuperAdmin
          ? 'super_admin'
          : uData.role || 'citizen';
        const merged: UserProfileDocument = {
          ...uData,
          uid: user.uid,
          fullName: isDesignatedSuperAdmin
            ? DESIGNATED_SUPER_ADMIN_NAME
            : uData.fullName || user.displayName || 'مواطن مسجل',
          role: resolvedRole,
        };
        return {
          profile:
            resolvedRole === 'admin' || resolvedRole === 'super_admin'
              ? toAdminCitizenDTO(merged, true)
              : toCitizenProfileDTO(merged),
          role: resolvedRole,
        };
      }
    } catch (err: any) {
      if (err?.message === 'تم حظر هذا الحساب.') {
        throw err;
      }
    }

    const fallbackRole: UserRole = isDesignatedSuperAdmin ? 'super_admin' : 'citizen';
    const fallback: CitizenProfileDTO = {
      uid: user.uid,
      fullName: isDesignatedSuperAdmin
        ? DESIGNATED_SUPER_ADMIN_NAME
        : user.displayName || 'مواطن',
      email: user.email || '',
      phone: '',
      birthDate: '',
      role: fallbackRole,
      reportsSubmittedCount: 0,
      resolvedReportsCount: 0,
      joinedAt: nowIso,
      isBlocked: false,
    };
    return { profile: fallback, role: fallbackRole };
  },

  /**
   * 4b. Update User Account (Name, Phone, BirthDate, and optional Password)
   */
  async updateUserAccount(
    user: User,
    input: UpdateAccountInput
  ): Promise<{ profile: CitizenProfileDTO | AdminCitizenDTO; role: UserRole }> {
    const cleanName = input.fullName.trim();
    if (cleanName.split(/\s+/).length < 3) {
      throw new Error('يرجى كتابة الاسم الثلاثي.');
    }

    const cleanPhone = input.phone.trim();
    if (!cleanPhone || cleanPhone.replace(/[\s-]/g, '').length < 10) {
      throw new Error('رقم الهاتف غير صالح.');
    }

    if (!input.birthDate) {
      throw new Error('تاريخ الميلاد مطلوب.');
    }

    if (input.newPassword && input.newPassword.trim().length > 0) {
      if (input.newPassword.trim().length < 6) {
        throw new Error('كلمة المرور 6 أحرف على الأقل.');
      }
      try {
        await updatePassword(user, input.newPassword.trim());
      } catch {
        throw new Error('سجل دخولك مجدداً لتغيير كلمة المرور.');
      }
    }

    try {
      await updateProfile(user, { displayName: cleanName });
    } catch {}

    const nowIso = new Date().toISOString();
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          fullName: cleanName,
          phone: cleanPhone,
          birthDate: input.birthDate,
          updatedAt: nowIso,
        },
        { merge: true }
      );
      await setDoc(
        doc(db, 'citizens', user.uid),
        {
          id: user.uid,
          name: cleanName,
          phone: cleanPhone,
          birthDate: input.birthDate,
          updatedAt: nowIso,
        },
        { merge: true }
      );
    } catch {}

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/auth/update-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: cleanName,
          phone: cleanPhone,
          birthDate: input.birthDate,
        }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    return await this.fetchCurrentProfile(user);
  },

  /**
   * 4c. Delete User Account WITHOUT Deleting Data (reports, completed works, surveys stay intact)
   */
  async deleteUserAccountKeepData(user: User): Promise<void> {
    const uid = user.uid;

    // 1. Delete user profile documents from backend store while preserving reports/data
    try {
      const token = await user.getIdToken();
      await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {}

    // 2. Delete user & citizen profile docs from client database while keeping reports/surveys untouched
    try {
      await deleteDoc(doc(db, 'users', uid)).catch(() => {});
      await deleteDoc(doc(db, 'citizens', uid)).catch(() => {});
    } catch {}

    // 3. Delete user login record or sign out cleanly
    try {
      await deleteUser(user);
    } catch {
      await signOut(auth);
    }
  },

  /**
   * 5. Password Recovery Request (Protected 3 times per 1 hour in backend)
   */
  async requestCitizenPasswordReset(email: string): Promise<{
    success: boolean;
    requiresSuperAdminSecret?: boolean;
    requiresAdminRecoveryCode?: boolean;
    role?: UserRole;
    message: string;
  }> {
    const cleanEmail = email.trim().toLowerCase();
    const isDesignatedSuperAdmin =
      cleanEmail === '11kattak11@gmail.com' || cleanEmail === 'kawarbani@gmail.com';

    // 1. Try server endpoint first if it returns valid JSON
    try {
      const res = await fetch('/api/auth/citizen-password-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'تجاوزت الحد المسموح (3 مرات بالساعة).');
        }

        if (data.success && !data.requiresSuperAdminSecret && !data.requiresAdminRecoveryCode) {
          try {
            await sendPasswordResetEmail(auth, cleanEmail);
          } catch {}
        }

        return {
          ...data,
          message:
            data.requiresSuperAdminSecret || data.requiresAdminRecoveryCode
              ? data.message
              : 'تم إرسال رابط آمن لإعادة تعيين كلمة المرور إلى بريدك.',
        };
      }
    } catch (err: any) {
      if (
        err?.message?.includes('الحد المسموح') ||
        err?.message?.includes('3 مرات') ||
        err?.message?.includes('البريد غير صالح')
      ) {
        throw err;
      }
    }

    // 2. Resilient Direct Fallback (guarantees operation across any hosting environment)
    if (isDesignatedSuperAdmin) {
      return {
        success: false,
        requiresSuperAdminSecret: true,
        role: 'super_admin',
        message: 'يرجى إدخال الرمز السري.',
      };
    }

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      return {
        success: true,
        requiresSuperAdminSecret: false,
        requiresAdminRecoveryCode: false,
        role: 'citizen',
        message: 'تم إرسال رابط آمن لإعادة تعيين كلمة المرور إلى بريدك.',
      };
    } catch (firebaseErr: any) {
      const errCode = String(firebaseErr?.code || firebaseErr?.message || '').toLowerCase();
      if (errCode.includes('user-not-found')) {
        return {
          success: true,
          message: 'تم إرسال رابط آمن لإعادة تعيين كلمة المرور إلى بريدك.',
        };
      }
      if (errCode.includes('invalid-email')) {
        throw new Error('البريد غير صالح.');
      }
      if (errCode.includes('too-many-requests')) {
        throw new Error('تجاوزت الحد المسموح (3 مرات بالساعة).');
      }
      throw new Error('تعذر إرسال الرابط، يرجى المحاولة لاحقاً.');
    }
  },

  /**
   * 6. Super Admin & Admin Password Recovery via Secret Recovery Code
   */
  async verifyAdminRecoveryCode(
    email: string,
    recoveryCode: string
  ): Promise<{ success: boolean; role?: UserRole; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = recoveryCode.trim().toUpperCase();

    try {
      const res = await fetch('/api/auth/admin-verify-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          recoveryCode: cleanCode,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'الرمز السري غير صحيح.');
        }

        try {
          await sendPasswordResetEmail(auth, cleanEmail);
        } catch {}

        return {
          ...data,
          message: 'تم إرسال رابط آمن لإعادة تعيين كلمة المرور إلى بريدك.',
        };
      }
    } catch (err: any) {
      if (err?.message?.includes('غير صحيح') || err?.message?.includes('الرمز')) {
        throw err;
      }
    }

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      return {
        success: true,
        role: 'super_admin',
        message: 'تم إرسال رابط آمن لإعادة تعيين كلمة المرور إلى بريدك.',
      };
    } catch {
      throw new Error('الرمز السري غير صحيح.');
    }
  },

  /**
   * 7. Admin: Fetch Citizens List (AdminCitizenDTO)
   */
  async fetchCitizensList(user: User): Promise<AdminCitizenDTO[]> {
    const dtoMap = new Map<string, AdminCitizenDTO>();

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/citizens', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list: AdminCitizenDTO[] = data.citizens || [];
        list.forEach((item) => {
          if (item.uid) dtoMap.set(item.uid, item);
        });
      }
    } catch {}

    try {
      const [usersSnap, citizensSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'citizens')),
      ]);

      const citizensExtra = new Map<string, any>();
      citizensSnap.forEach((cDoc) => {
        citizensExtra.set(cDoc.id, { id: cDoc.id, ...cDoc.data() });
      });

      usersSnap.forEach((uDoc) => {
        const u = uDoc.data() as UserProfileDocument;
        const uid = uDoc.id;
        const cExtra = citizensExtra.get(uid);
        const isDesig = (u.email || '').trim().toLowerCase() === DESIGNATED_SUPER_ADMIN_EMAIL;
        const role: UserRole = isDesig ? 'super_admin' : u.role || 'citizen';

        const mergedDoc: UserProfileDocument = {
          ...u,
          uid,
          fullName: isDesig
            ? DESIGNATED_SUPER_ADMIN_NAME
            : u.fullName || cExtra?.name || 'مواطن مسجل',
          email: u.email || cExtra?.email || '',
          phone: u.phone || cExtra?.phone || '',
          birthDate: u.birthDate || cExtra?.birthDate || '',
          neighborhood: u.neighborhood || cExtra?.neighborhood || 'ناحية باعدرى',
          role,
          reportsSubmittedCount: Math.max(
            u.reportsSubmittedCount || 0,
            cExtra?.reportsSubmittedCount || 0
          ),
          resolvedReportsCount: Math.max(
            u.resolvedReportsCount || 0,
            cExtra?.resolvedReportsCount || 0
          ),
          isBlocked: Boolean(u.isBlocked ?? cExtra?.isBlocked ?? false),
          createdAt: u.createdAt || cExtra?.joinedAt || new Date().toISOString(),
          updatedAt: u.updatedAt || new Date().toISOString(),
        };

        dtoMap.set(uid, toAdminCitizenDTO(mergedDoc, role === 'admin' || role === 'super_admin'));
      });

      citizensSnap.forEach((cDoc) => {
        if (!dtoMap.has(cDoc.id)) {
          const c = cDoc.data() as any;
          const uid = cDoc.id;
          const isDesig = (c.email || '').trim().toLowerCase() === DESIGNATED_SUPER_ADMIN_EMAIL;
          const role: UserRole = isDesig ? 'super_admin' : (c.role as UserRole) || 'citizen';
          dtoMap.set(uid, {
            uid,
            fullName: isDesig
              ? DESIGNATED_SUPER_ADMIN_NAME
              : c.name || c.fullName || 'مواطن مسجل',
            email: c.email || '',
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
    } catch {}

    return Array.from(dtoMap.values()).sort(
      (a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
    );
  },

  /**
   * 8. Super Admin: Change User Role
   */
  async changeUserRole(
    user: User,
    targetUid: string,
    newRole: UserRole
  ): Promise<{ success: boolean; message: string; generatedRecoveryCode?: string }> {
    const token = await user.getIdToken();
    const res = await fetch('/api/admin/change-role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ targetUid, newRole }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'فشل تغيير الدور.');
    }

    try {
      const nowIso = new Date().toISOString();
      await setDoc(
        doc(db, 'users', targetUid),
        { role: newRole, updatedAt: nowIso },
        { merge: true }
      );
      await setDoc(
        doc(db, 'citizens', targetUid),
        { id: targetUid, role: newRole, updatedAt: nowIso },
        { merge: true }
      );
      if (newRole === 'admin' || newRole === 'super_admin') {
        await setDoc(
          doc(db, 'admins', targetUid),
          {
            uid: targetUid,
            role: newRole,
            assignedBy: user.uid,
            assignedAt: nowIso,
          },
          { merge: true }
        );
      } else {
        await deleteDoc(doc(db, 'admins', targetUid)).catch(() => {});
      }
    } catch {}

    return data;
  },

  /**
   * 9. Super Admin: Reveal Admin Recovery Code
   */
  async revealAdminRecoveryCode(
    user: User,
    targetAdminUid: string
  ): Promise<{ recoveryCode: string; targetEmail: string }> {
    const token = await user.getIdToken();
    const res = await fetch('/api/admin/reveal-recovery-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ targetAdminUid }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'فشل كشف الرمز.');
    }
    return data;
  },

  /**
   * 10. Bootstrap First Super Admin
   */
  async bootstrapSuperAdmin(params: {
    secretKey: string;
    adminEmail: string;
    adminFullName: string;
    adminUid: string;
    adminPhone?: string;
  }): Promise<{ success: boolean; message: string; oneTimeRecoveryCode: string }> {
    const res = await fetch('/api/admin/bootstrap-first-super-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        setupSecretKey: params.secretKey,
        adminEmail: params.adminEmail,
        adminFullName: params.adminFullName,
        adminUid: params.adminUid,
        adminPhone: params.adminPhone,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'حدث خطأ.');
    }
    return data;
  },

  /**
   * 11. Admin & Super Admin: Secure Backend Toggle Block User / Admin
   */
  async toggleBlockUser(
    user: User,
    targetUid: string,
    isBlocked?: boolean
  ): Promise<{ success: boolean; targetUid: string; isBlocked: boolean }> {
    const token = await user.getIdToken();
    const res = await fetch('/api/admin/toggle-block', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ targetUid, isBlocked }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'تعذر تحديث حالة الحظر.');
    }
    return data;
  },
};
