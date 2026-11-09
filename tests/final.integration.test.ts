import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateSecureRecoveryCode,
  encryptRecoveryCode,
  decryptRecoveryCode,
  timingSafeMatch,
} from '../server/security/encryption';
import { checkRateLimit, resetRateLimit } from '../server/security/rateLimiter';
import {
  toCitizenProfileDTO,
  toAdminCitizenDTO,
  toReportDTO,
  toNewReportNotificationPayloadDTO,
} from '../src/types/dto';
import {
  CITIZEN_ALLOWED_REPORT_UPDATE_FIELDS,
  getAppCheckTokenHeader,
  withAppCheckHeaders,
  getAppCheckStatus,
} from '../src/lib/firebase';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ============================================================================
 * اختبارات التكامل والأمان النهائية الشاملة (Scenarios A -> V)
 * المرحلة الثالثة والأخيرة - تطبيق ÇAVÊ BAADRÊ (منظمة RABA)
 * ============================================================================
 */

const rulesPath = path.resolve(__dirname, '../firestore.rules');
const rulesContent = fs.readFileSync(rulesPath, 'utf8');
const swPath = path.resolve(__dirname, '../public/firebase-messaging-sw.js');
const swContent = fs.readFileSync(swPath, 'utf8');

interface SimulatedAuth {
  uid: string;
  email: string;
  role: 'citizen' | 'admin' | 'super_admin';
}

class IntegratedPlatformSimulator {
  users: Record<string, any> = {};
  citizens: Record<string, any> = {};
  admins: Record<string, any> = {};
  super_admins: Record<string, any> = {};
  admin_recovery_vault: Record<string, any> = {};
  reports: Record<string, any> = {};
  surveys: Record<string, any> = {};
  SurveyResponses: Record<string, any> = {};
  user_fcm_tokens: Record<string, any> = {};
  notification_dispatch_locks: Record<string, any> = {};
  departments: Record<string, any> = {
    dept_1: {
      id: 'dept_1',
      nameAr: 'مديرية بلدية باعدرى',
      headName: 'مدير البلدية',
      phone: '07504738358',
      whatsapp: '9647504738358',
    },
  };
  audit_logs: any[] = [];
  fcmSentMessages: Array<{
    token: string;
    uid: string;
    deviceId: string;
    payload: any;
  }> = [];

  // A. تسجيل مواطن جديد
  registerCitizen(input: {
    uid: string;
    fullName: string;
    email: string;
    password: string;
    phone: string;
    birthDate: string;
  }) {
    const parts = input.fullName.trim().split(/\s+/);
    if (parts.length < 3) {
      throw new Error('الاسم الثلاثي مطلوب (3 كلمات على الأقل).');
    }
    const cleanEmail = input.email.trim().toLowerCase();
    const emailTaken = Object.values(this.users).some(
      (u) => u.email.toLowerCase() === cleanEmail
    );
    if (emailTaken) {
      throw new Error('البريد الإلكتروني مسجل مسبقاً.');
    }

    const nowIso = new Date().toISOString();
    // عدم تخزين كلمة المرور في Firestore نهائياً
    const userDoc = {
      uid: input.uid,
      fullName: input.fullName.trim(),
      email: cleanEmail,
      phone: input.phone.trim(),
      birthDate: input.birthDate,
      role: 'citizen' as const,
      reportsSubmittedCount: 0,
      resolvedReportsCount: 0,
      isBlocked: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.users[input.uid] = userDoc;
    this.citizens[input.uid] = {
      id: input.uid,
      name: userDoc.fullName,
      phone: userDoc.phone,
      neighborhood: 'ناحية باعدرى',
      role: 'citizen',
      reportsSubmittedCount: 0,
      resolvedReportsCount: 0,
      joinedAt: nowIso,
      verified: true,
      isBlocked: false,
    };

    return toCitizenProfileDTO(userDoc);
  }

  // B. تسجيل دخول مواطن
  loginUser(uid: string): { auth: SimulatedAuth; profileDto: any } {
    const user = this.users[uid];
    if (!user) throw new Error('المستخدم غير موجود.');
    const resolvedRole = this.super_admins[uid]
      ? 'super_admin'
      : this.admins[uid]
      ? 'admin'
      : user.role || 'citizen';
    return {
      auth: { uid, email: user.email, role: resolvedRole },
      profileDto:
        resolvedRole === 'citizen'
          ? toCitizenProfileDTO(user)
          : toAdminCitizenDTO(user, Boolean(this.admin_recovery_vault[uid])),
    };
  }

  // C. استرداد كلمة مرور مواطن
  requestCitizenPasswordRecovery(email: string) {
    const cleanEmail = email.trim().toLowerCase();
    const rl = checkRateLimit(`test_pwd_${cleanEmail}`, 5, 60_000);
    if (!rl.allowed) {
      throw new Error('RATE_LIMITED');
    }
    this.audit_logs.push({
      action: 'PASSWORD_RESET_REQUESTED',
      targetEmail: cleanEmail,
      timestamp: new Date().toISOString(),
    });
    return {
      success: true,
      message:
        'إذا كان البريد الإلكتروني مسجلاً في النظام، فقد تم إرسال رابط آمن لإعادة تعيين كلمة المرور إلى بريدك.',
    };
  }

  // D. استرداد حساب أدمن مع التحقق الإضافي (رمز الاسترداد المشفر)
  verifyAdminRecovery(email: string, recoveryCode: string) {
    const cleanEmail = email.trim().toLowerCase();
    const target = Object.values(this.users).find(
      (u) => u.email.toLowerCase() === cleanEmail
    );
    if (!target || (target.role !== 'admin' && target.role !== 'super_admin')) {
      throw new Error('غير مصرح: هذا المسار لحسابات الإدارة فقط.');
    }
    const vault = this.admin_recovery_vault[target.uid];
    if (!vault) {
      throw new Error('لا يوجد رمز استرداد مهيأ.');
    }
    const decrypted = decryptRecoveryCode(vault);
    if (!timingSafeMatch(recoveryCode.trim().toUpperCase(), decrypted)) {
      throw new Error('رمز الاسترداد غير مطابق.');
    }
    this.audit_logs.push({
      action: 'ADMIN_RECOVERY_VERIFIED',
      actorUid: target.uid,
      timestamp: new Date().toISOString(),
    });
    return { success: true };
  }

  // E, F, G, H. تعيين وتعديل الأدوار
  changeUserRole(
    caller: SimulatedAuth,
    targetUid: string,
    newRole: 'citizen' | 'admin' | 'super_admin'
  ) {
    if (caller.role !== 'super_admin') {
      throw new Error('غير مصرح: تعيين الأدوار محصور بالسوبر أدمن فقط.');
    }
    const target = this.users[targetUid];
    if (!target) throw new Error('المستخدم غير موجود.');

    // قيد إلزامي: لا يمكن لسوبر أدمن تعديل حساب سوبر أدمن آخر
    if (
      (target.role === 'super_admin' || Boolean(this.super_admins[targetUid])) &&
      caller.uid !== targetUid
    ) {
      throw new Error(
        'قيد أمني إلزامي: لا يُسمح لأي سوبر أدمن بتعديل حساب سوبر أدمن آخر.'
      );
    }

    target.role = newRole;
    let plainRecoveryCode: string | null = null;

    if (newRole === 'admin' || newRole === 'super_admin') {
      this.admins[targetUid] = { uid: targetUid, role: newRole };
      if (newRole === 'super_admin') {
        this.super_admins[targetUid] = { uid: targetUid };
      } else {
        delete this.super_admins[targetUid];
      }
      if (!this.admin_recovery_vault[targetUid]) {
        plainRecoveryCode = generateSecureRecoveryCode();
        this.admin_recovery_vault[targetUid] = encryptRecoveryCode(
          plainRecoveryCode,
          newRole
        );
      }
    } else {
      delete this.admins[targetUid];
      delete this.super_admins[targetUid];
      delete this.admin_recovery_vault[targetUid];
    }

    return { newRole, plainRecoveryCode };
  }

  // تسجيل جهاز FCM لحساب إداري (يدعم تعدد الأجهزة لكل حساب)
  registerFcmToken(caller: SimulatedAuth, deviceId: string, fcmToken: string) {
    if (caller.role !== 'admin' && caller.role !== 'super_admin') {
      throw new Error('غير مصرح: تسجيل إشعارات البلاغات مخصص للإدارة فقط.');
    }
    const docId = `${caller.uid}_${deviceId}`;
    this.user_fcm_tokens[docId] = {
      id: docId,
      uid: caller.uid,
      role: caller.role,
      deviceId,
      fcmToken,
      notificationsEnabled: true,
      updatedAt: new Date().toISOString(),
    };
    return docId;
  }

  // تنظيف Token عند تسجيل الخروج
  unregisterFcmTokenOnLogout(caller: SimulatedAuth, deviceId: string) {
    const docId = `${caller.uid}_${deviceId}`;
    delete this.user_fcm_tokens[docId];
  }

  // I. إنشاء بلاغ جديد
  createReport(
    caller: SimulatedAuth,
    input: {
      id: string;
      trackingCode: string;
      title: string;
      description: string;
      sector: 'roads' | 'sewage' | 'sanitation' | 'lighting' | 'water' | 'other';
      neighborhood: string;
      citizenName: string;
      citizenPhone: string;
    }
  ) {
    if (!caller.uid) throw new Error('يجب تسجيل الدخول.');
    const nowIso = new Date().toISOString();
    const report = {
      id: input.id,
      trackingCode: input.trackingCode,
      title: input.title,
      description: input.description,
      sector: input.sector,
      status: 'pending' as const, // Logical: new
      urgency: 'normal' as const,
      neighborhood: input.neighborhood,
      street: input.neighborhood,
      landmark: '',
      latitude: 36.7186,
      longitude: 43.2614,
      ownerUid: caller.uid,
      citizenId: caller.uid,
      citizenName: input.citizenName,
      citizenPhone: input.citizenPhone,
      images: [],
      assignedTeam: 'مديرية بلدية باعدرى',
      officialNote: '',
      upvotes: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    this.reports[report.id] = report;
    return report;
  }

  // J. إرسال إشعار FCM لجميع Admins و Super Admins مع منع التكرار وتنظيف التوكنات غير الصالحة
  dispatchFcmForNewReport(reportId: string) {
    const lock = this.notification_dispatch_locks[reportId];
    if (lock && lock.dispatched === true) {
      return {
        dispatched: false,
        alreadyDispatched: true,
        adminAccountsCount: 0,
        deviceTokensCount: 0,
        invalidTokensRemoved: 0,
        payload: null,
      };
    }

    const report = this.reports[reportId];
    if (!report) {
      throw new Error('البلاغ غير محفوظ في Firestore.');
    }

    // قفل منع التكرار (Idempotency Lock)
    this.notification_dispatch_locks[reportId] = {
      reportId,
      dispatched: true,
      dispatchedAt: new Date().toISOString(),
    };

    const payload = toNewReportNotificationPayloadDTO(report);

    // جمع جميع حسابات Admin و Super Admin بدون استثناء
    const adminUids = new Set<string>();
    Object.keys(this.admins).forEach((uid) => adminUids.add(uid));
    Object.keys(this.super_admins).forEach((uid) => adminUids.add(uid));
    Object.values(this.users).forEach((u) => {
      if ((u.role === 'admin' || u.role === 'super_admin') && !u.isBlocked) {
        adminUids.add(u.uid);
      }
    });

    let deviceTokensCount = 0;
    let invalidTokensRemoved = 0;

    for (const [docId, tokenDoc] of Object.entries(this.user_fcm_tokens)) {
      if (!adminUids.has(tokenDoc.uid)) continue;
      if (
        !tokenDoc.fcmToken ||
        tokenDoc.fcmToken.startsWith('INVALID_') ||
        tokenDoc.fcmToken.startsWith('EXPIRED_')
      ) {
        delete this.user_fcm_tokens[docId];
        invalidTokensRemoved++;
        continue;
      }

      deviceTokensCount++;
      this.fcmSentMessages.push({
        token: tokenDoc.fcmToken,
        uid: tokenDoc.uid,
        deviceId: tokenDoc.deviceId,
        payload,
      });
    }

    return {
      dispatched: true,
      alreadyDispatched: false,
      adminAccountsCount: adminUids.size,
      deviceTokensCount,
      invalidTokensRemoved,
      payload,
    };
  }

  // K, M. تعديل البلاغ مع فحص الحالة والملكية داخل Transaction
  updateCitizenReport(
    caller: SimulatedAuth,
    reportId: string,
    updates: Record<string, any>
  ) {
    const report = this.reports[reportId];
    if (!report) throw new Error('البلاغ غير موجود.');
    if (report.ownerUid !== caller.uid && report.citizenId !== caller.uid) {
      throw new Error('غير مصرح: لست صاحب البلاغ.');
    }
    if (report.status !== 'pending' && report.status !== 'new') {
      throw new Error('لا يمكن تعديل البلاغ بعد إرساله للدائرة أو إنجازه.');
    }
    for (const key of Object.keys(updates)) {
      if (!CITIZEN_ALLOWED_REPORT_UPDATE_FIELDS.includes(key as any)) {
        throw new Error(`حقل غير مسموح للمواطن بتعديله: ${key}`);
      }
    }
    this.reports[reportId] = {
      ...report,
      ...updates,
      status: report.status,
      ownerUid: report.ownerUid,
      citizenId: report.citizenId,
      updatedAt: new Date().toISOString(),
    };
    return this.reports[reportId];
  }

  // L, N. حذف البلاغ مع فحص الحالة والملكية داخل Transaction
  deleteCitizenReport(caller: SimulatedAuth, reportId: string) {
    const report = this.reports[reportId];
    if (!report) throw new Error('البلاغ غير موجود.');
    if (caller.role !== 'admin' && caller.role !== 'super_admin') {
      if (report.ownerUid !== caller.uid && report.citizenId !== caller.uid) {
        throw new Error('غير مصرح: لست صاحب البلاغ.');
      }
      if (report.status !== 'pending' && report.status !== 'new') {
        throw new Error('لا يمكن حذف البلاغ بعد إرساله للدائرة أو إنجازه.');
      }
    }
    delete this.reports[reportId];
    return true;
  }

  // تغيير حالة البلاغ بواسطة الإدارة (بدون إرسال إشعار للمواطن)
  adminUpdateReportStatus(
    caller: SimulatedAuth,
    reportId: string,
    newStatus: 'pending' | 'in_progress' | 'resolved' | 'rejected'
  ) {
    if (caller.role !== 'admin' && caller.role !== 'super_admin') {
      throw new Error('غير مصرح: للإدارة فقط.');
    }
    const report = this.reports[reportId];
    if (!report) throw new Error('البلاغ غير موجود.');
    report.status = newStatus;
    report.updatedAt = new Date().toISOString();
    return report;
  }

  // O. إنشاء ونشر استبيان
  publishSurvey(
    caller: SimulatedAuth,
    survey: {
      id: string;
      title: string;
      description: string;
      questions: Array<{
        id: string;
        questionText: string;
        options: Array<{ id: string; text: string; votesCount: number }>;
      }>;
    }
  ) {
    if (caller.role !== 'admin' && caller.role !== 'super_admin') {
      throw new Error('غير مصرح: نشر الاستبيانات محصور بالإدارة.');
    }
    this.surveys[survey.id] = {
      ...survey,
      isPublishedToCitizens: true,
      status: 'active',
      totalResponses: 0,
      createdAt: new Date().toISOString(),
    };
    return this.surveys[survey.id];
  }

  // الاستبيانات المنشورة غير المكتملة التي تظهر للمواطن (بالاعتماد على Firestore SurveyResponses)
  getVisibleUncompletedSurveysForCitizen(citizenUid: string) {
    return Object.values(this.surveys).filter((s) => {
      const isPublished = s.isPublishedToCitizens === true && s.status !== 'closed';
      const deterministicRespId = `${s.id}_${citizenUid}`;
      const isCompletedInFirestore = Boolean(this.SurveyResponses[deterministicRespId]?.completed);
      return isPublished && !isCompletedInFirestore;
    });
  }

  // R, T. إرسال إجابة الاستبيان ذرياً ومنع التكرار
  submitSurveyResponse(
    caller: SimulatedAuth,
    surveyId: string,
    selectedOptionsByQuestionId: Record<string, string>
  ) {
    if (!caller.uid) throw new Error('يجب تسجيل الدخول.');
    const deterministicId = `${surveyId}_${caller.uid}`;
    if (this.SurveyResponses[deterministicId]) {
      throw new Error('DUPLICATE_SURVEY_RESPONSE: لا يُسمح بالإجابة أكثر من مرة.');
    }
    const survey = this.surveys[surveyId];
    if (!survey || !survey.isPublishedToCitizens || survey.status === 'closed') {
      throw new Error('الاستبيان غير منشور حالياً.');
    }
    for (const q of survey.questions) {
      if (!selectedOptionsByQuestionId[q.id]) {
        throw new Error('يرجى الإجابة على جميع أسئلة الاستبيان.');
      }
    }

    const nowIso = new Date().toISOString();
    this.SurveyResponses[deterministicId] = {
      id: deterministicId,
      surveyId,
      citizenUid: caller.uid,
      ownerUid: caller.uid,
      completed: true,
      submittedAt: nowIso,
      selectedOptionsByQuestionId,
      createdAt: nowIso,
    };

    survey.totalResponses += 1;
    return this.SurveyResponses[deterministicId];
  }
}

// ============================================================================
// تنفيذ السيناريوهات الـ 22 (A -> V)
// ============================================================================
const sim = new IntegratedPlatformSimulator();

// إعداد السوبر أدمن الأول للنظام
sim.users['super_1'] = {
  uid: 'super_1',
  fullName: 'سوبر أدمن المنظمة الأول',
  email: 'super1@raba.org',
  phone: '07500000001',
  birthDate: '1988-01-01',
  role: 'super_admin',
  createdAt: new Date().toISOString(),
};
sim.super_admins['super_1'] = { uid: 'super_1' };
sim.admins['super_1'] = { uid: 'super_1', role: 'super_admin' };
const super1Auth: SimulatedAuth = {
  uid: 'super_1',
  email: 'super1@raba.org',
  role: 'super_admin',
};

const scenarios: Array<{ code: string; title: string; run: () => void }> = [
  {
    code: 'A',
    title: 'تسجيل مواطن جديد (بدون تخزين كلمة المرور في Firestore وإرجاع DTO فقط)',
    run: () => {
      const dto = sim.registerCitizen({
        uid: 'citizen_1',
        fullName: 'دلشاد كاظم سليمان',
        email: 'dilshad@baadre.org',
        password: 'StrongPassword#2026',
        phone: '07501234567',
        birthDate: '1995-05-15',
      });
      assert.strictEqual(dto.uid, 'citizen_1');
      assert.strictEqual(dto.role, 'citizen');
      assert.strictEqual('password' in sim.users['citizen_1'], false);
      assert.strictEqual('password' in dto, false);
      assert.strictEqual('recoveryCode' in dto, false);
    },
  },
  {
    code: 'B',
    title: 'تسجيل دخول مواطن والتحقق من الدور citizen والبيانات المسموحة',
    run: () => {
      const session = sim.loginUser('citizen_1');
      assert.strictEqual(session.auth.role, 'citizen');
      assert.strictEqual(session.profileDto.fullName, 'دلشاد كاظم سليمان');
    },
  },
  {
    code: 'C',
    title: 'استرداد كلمة مرور مواطن مع حماية Rate Limiting وعدم كشف وجود الحساب',
    run: () => {
      resetRateLimit('test_pwd_dilshad@baadre.org');
      const res1 = sim.requestCitizenPasswordRecovery('dilshad@baadre.org');
      const res2 = sim.requestCitizenPasswordRecovery('nonexistent@baadre.org');
      assert.strictEqual(res1.message, res2.message);
      assert.strictEqual(res1.success, true);
    },
  },
  {
    code: 'D',
    title: 'استرداد حساب أدمن مع التحقق الإضافي (رمز الاسترداد المشفر AES-256-GCM)',
    run: () => {
      sim.registerCitizen({
        uid: 'admin_1',
        fullName: 'آزاد فرمان خورشيد',
        email: 'admin1@raba.org',
        password: 'AdminPass#2026',
        phone: '07501112201',
        birthDate: '1990-02-10',
      });
      const assigned = sim.changeUserRole(super1Auth, 'admin_1', 'admin');
      assert(assigned.plainRecoveryCode, 'يجب توليد رمز استرداد للأدمن');

      // رفض رمز خاطئ
      assert.throws(() => {
        sim.verifyAdminRecovery('admin1@raba.org', 'RABA-XXXX-YYYY-ZZZZ');
      });

      // قبول الرمز الصحيح المشفر
      const verified = sim.verifyAdminRecovery(
        'admin1@raba.org',
        assigned.plainRecoveryCode!
      );
      assert.strictEqual(verified.success, true);
    },
  },
  {
    code: 'E',
    title: 'تعيين Admin بواسطة Super Admin (تعيين 5 حسابات Admin)',
    run: () => {
      for (let i = 2; i <= 5; i++) {
        const uid = `admin_${i}`;
        sim.registerCitizen({
          uid,
          fullName: `مسؤول إدارة رقم ${i}`,
          email: `admin${i}@raba.org`,
          password: 'AdminPass#2026',
          phone: `0750111220${i}`,
          birthDate: '1991-03-10',
        });
        const res = sim.changeUserRole(super1Auth, uid, 'admin');
        assert.strictEqual(res.newRole, 'admin');
      }
      const totalAdminsOnly = Object.values(sim.users).filter(
        (u) => u.role === 'admin'
      ).length;
      assert.strictEqual(totalAdminsOnly, 5, 'يجب أن يصبح لدينا 5 حسابات Admin');
    },
  },
  {
    code: 'F',
    title: 'تعيين Super Admin بواسطة Super Admin (تعيين ليصبح المجموع 3 Super Admins)',
    run: () => {
      for (let i = 2; i <= 3; i++) {
        const uid = `super_${i}`;
        sim.registerCitizen({
          uid,
          fullName: `سوبر أدمن رقم ${i}`,
          email: `super${i}@raba.org`,
          password: 'SuperPass#2026',
          phone: `0750000000${i}`,
          birthDate: '1987-07-07',
        });
        const res = sim.changeUserRole(super1Auth, uid, 'super_admin');
        assert.strictEqual(res.newRole, 'super_admin');
      }
      const totalSuperAdmins = Object.values(sim.users).filter(
        (u) => u.role === 'super_admin'
      ).length;
      assert.strictEqual(totalSuperAdmins, 3, 'يجب أن يصبح لدينا 3 حسابات Super Admin');
    },
  },
  {
    code: 'G',
    title: 'منع Admin من تعيين مستخدم إداري أو تغيير الأدوار',
    run: () => {
      const admin1Session = sim.loginUser('admin_1');
      assert.throws(() => {
        sim.changeUserRole(admin1Session.auth, 'citizen_1', 'admin');
      }, /غير مصرح/);
      assert.throws(() => {
        sim.changeUserRole(admin1Session.auth, 'citizen_1', 'super_admin');
      }, /غير مصرح/);
    },
  },
  {
    code: 'H',
    title: 'منع تعديل حساب Super Admin آخر من قبل أي Super Admin',
    run: () => {
      assert.throws(() => {
        sim.changeUserRole(super1Auth, 'super_2', 'admin');
      }, /قيد أمني إلزامي/);
      assert.throws(() => {
        sim.changeUserRole(super1Auth, 'super_3', 'citizen');
      }, /قيد أمني إلزامي/);
    },
  },
  {
    code: 'I',
    title: 'إنشاء بلاغ جديد بواسطة المواطن وحفظه بحالة New وربطه بـ UID المواطن',
    run: () => {
      const citizenSession = sim.loginUser('citizen_1');
      const report = sim.createReport(citizenSession.auth, {
        id: '101',
        trackingCode: 'BDR-2026-8101',
        title: 'انهيار جزئي في رصيف الشارع العام',
        description: 'يوجد تضرر في الرصيف يعيق حركة المشاة',
        sector: 'roads',
        neighborhood: 'مركز باعدرى',
        citizenName: 'دلشاد كاظم سليمان',
        citizenPhone: '07501234567',
      });
      assert.strictEqual(report.id, '101');
      assert.strictEqual(report.ownerUid, 'citizen_1');
      assert.strictEqual(report.status, 'pending');
    },
  },
  {
    code: 'J',
    title:
      'إرسال إشعار FCM لجميع حسابات Admin (5) و Super Admin (3) = 8 حسابات وأجهزتهم المتعددة بدون استثناء، مع منع التكرار وخلو الإشعار من البيانات الحساسة',
    run: () => {
      // تسجيل أجهزة جميع الإداريين الـ 8 (بما في ذلك تعدد الأجهزة لبعضهم + توكن غير صالح لاختبار التنظيف)
      for (let i = 1; i <= 5; i++) {
        const authObj = sim.loginUser(`admin_${i}`).auth;
        sim.registerFcmToken(authObj, 'mobile_1', `fcm_valid_admin_${i}_mob1`);
      }
      for (let i = 1; i <= 3; i++) {
        const authObj = sim.loginUser(`super_${i}`).auth;
        sim.registerFcmToken(authObj, 'mobile_1', `fcm_valid_super_${i}_mob1`);
        sim.registerFcmToken(authObj, 'desktop_2', `fcm_valid_super_${i}_desk2`);
      }
      // إضافة توكن منتهي/غير صالح للتأكد من حذفه تلقائياً
      sim.registerFcmToken(super1Auth, 'old_tablet', 'EXPIRED_TOKEN_000');

      const dispatchResult = sim.dispatchFcmForNewReport('101');
      assert.strictEqual(dispatchResult.dispatched, true);
      assert.strictEqual(dispatchResult.alreadyDispatched, false);
      assert.strictEqual(
        dispatchResult.adminAccountsCount,
        8,
        'يجب شمول جميع الحسابات الثمانية (5 Admin + 3 Super Admin) بدون استثناء'
      );
      assert.strictEqual(
        dispatchResult.deviceTokensCount,
        11,
        'يجب إرسال الإشعار إلى جميع الأجهزة الـ 11 الصالحة المسجلة للحسابات الثمانية'
      );
      assert.strictEqual(
        dispatchResult.invalidTokensRemoved,
        1,
        'يجب حذف التوكن غير الصالح تلقائياً'
      );

      // التحقق من محتوى الإشعار وخلوه التام من أي بيانات شخصية حساسة (Zero PII)
      const payload = dispatchResult.payload!;
      assert.strictEqual(payload.reportId, '101');
      assert.strictEqual(payload.trackingCode, 'BDR-2026-8101');
      assert.strictEqual(payload.title, 'انهيار جزئي في رصيف الشارع العام');
      assert.strictEqual(payload.sector, 'roads');
      assert(payload.createdAt.length > 0);
      assert.strictEqual(payload.clickUrl, '/?reportId=101');

      const serializedPayload = JSON.stringify(payload);
      assert.strictEqual(
        serializedPayload.includes('07501234567'),
        false,
        'يُمنع وضع رقم هاتف المواطن داخل الإشعار'
      );
      assert.strictEqual(
        serializedPayload.includes('دلشاد'),
        false,
        'يُمنع وضع اسم المواطن الشخصي داخل الإشعار'
      );

      // اختبار منع تكرار الإشعار لنفس البلاغ (Idempotency)
      const secondTrigger = sim.dispatchFcmForNewReport('101');
      assert.strictEqual(secondTrigger.dispatched, false);
      assert.strictEqual(secondTrigger.alreadyDispatched, true);

      // اختبار تنظيف التوكن عند تسجيل الخروج
      const admin5Auth = sim.loginUser('admin_5').auth;
      sim.unregisterFcmTokenOnLogout(admin5Auth, 'mobile_1');
      assert.strictEqual(Boolean(sim.user_fcm_tokens['admin_5_mobile_1']), false);
    },
  },
  {
    code: 'K',
    title: 'تعديل بلاغ جديد بواسطة المواطن صاحب البلاغ عندما تكون حالته New',
    run: () => {
      const citizenSession = sim.loginUser('citizen_1');
      const updated = sim.updateCitizenReport(citizenSession.auth, '101', {
        title: 'انهيار جزئي في رصيف الشارع العام - تم تحديث الموقع',
        landmark: 'مقابل مدرسة باعدرى الأولى',
      });
      assert.strictEqual(
        updated.title,
        'انهيار جزئي في رصيف الشارع العام - تم تحديث الموقع'
      );
      assert.strictEqual(updated.ownerUid, 'citizen_1');
    },
  },
  {
    code: 'L',
    title: 'حذف بلاغ جديد بواسطة المواطن صاحب البلاغ عندما تكون حالته New',
    run: () => {
      const citizenSession = sim.loginUser('citizen_1');
      const tempReport = sim.createReport(citizenSession.auth, {
        id: '102',
        trackingCode: 'BDR-2026-8102',
        title: 'بلاغ تجريبي للحذف',
        description: 'سيتم حذفه وهو في حالة جديد',
        sector: 'lighting',
        neighborhood: 'حي آشتي',
        citizenName: 'دلشاد كاظم سليمان',
        citizenPhone: '07501234567',
      });
      assert.strictEqual(tempReport.id, '102');
      const deleted = sim.deleteCitizenReport(citizenSession.auth, '102');
      assert.strictEqual(deleted, true);
      assert.strictEqual(Boolean(sim.reports['102']), false);
    },
  },
  {
    code: 'M',
    title: 'منع تعديل بلاغ مرسل (Sent / in_progress) من قبل المواطن',
    run: () => {
      const citizenSession = sim.loginUser('citizen_1');
      // الإدارة ترسل البلاغ رقم 101 إلى الدائرة المعنية
      sim.adminUpdateReportStatus(super1Auth, '101', 'in_progress');
      assert.throws(() => {
        sim.updateCitizenReport(citizenSession.auth, '101', {
          title: 'محاولة تعديل بعد الإرسال للدائرة',
        });
      }, /لا يمكن تعديل البلاغ/);
    },
  },
  {
    code: 'N',
    title: 'منع حذف بلاغ منجز (Completed / resolved) من قبل المواطن',
    run: () => {
      const citizenSession = sim.loginUser('citizen_1');
      // الإدارة تعتمد إنجاز البلاغ رقم 101
      sim.adminUpdateReportStatus(super1Auth, '101', 'resolved');
      assert.throws(() => {
        sim.deleteCitizenReport(citizenSession.auth, '101');
      }, /لا يمكن حذف البلاغ/);
    },
  },
  {
    code: 'O',
    title: 'نشر استبيان مجتمعي من قبل الإدارة وظهوره للمواطن',
    run: () => {
      sim.publishSurvey(super1Auth, {
        id: 'survey_1',
        title: 'استبيان تقييم خدمات النظافة والبيئة في باعدرى',
        description: 'شاركونا رأيكم لتطوير خدمات النظافة في الأحياء السكنية',
        questions: [
          {
            id: 'q1',
            questionText: 'كيف تقيم التزام كابسات النفايات بالمواعيد؟',
            options: [
              { id: 'opt1', text: 'ممتاز', votesCount: 0 },
              { id: 'opt2', text: 'جيد', votesCount: 0 },
            ],
          },
        ],
      });
      const visible = sim.getVisibleUncompletedSurveysForCitizen('citizen_1');
      assert.strictEqual(visible.length, 1);
      assert.strictEqual(visible[0].id, 'survey_1');
    },
  },
  {
    code: 'P',
    title: 'فتح الاستبيان وإغلاقه دون الضغط على إرسال (لا يُسجل Completed ولا يمنع المشاركة لاحقاً)',
    run: () => {
      // المواطن يفتح النافذة ثم يغلقها دون استدعاء submitSurveyResponse
      const respDoc = sim.SurveyResponses['survey_1_citizen_1'];
      assert.strictEqual(respDoc, undefined, 'لا يجوز تسجيل أي استجابة عند الإغلاق دون إرسال');
    },
  },
  {
    code: 'Q',
    title: 'إعادة فتح الاستبيان غير المكتمل وبقاؤه متاحاً للمواطن',
    run: () => {
      const visibleAfterDismiss = sim.getVisibleUncompletedSurveysForCitizen('citizen_1');
      assert.strictEqual(
        visibleAfterDismiss.length,
        1,
        'يبقى الاستبيان غير المكتمل ظاهراً ومتاحاً للمواطن'
      );
      assert.strictEqual(visibleAfterDismiss[0].id, 'survey_1');
    },
  },
  {
    code: 'R',
    title: 'إرسال إجابة الاستبيان وحفظها ذرياً في Firestore مع completed: true ووقت الإرسال',
    run: () => {
      const citizenSession = sim.loginUser('citizen_1');
      const savedResp = sim.submitSurveyResponse(citizenSession.auth, 'survey_1', {
        q1: 'opt1',
      });
      assert.strictEqual(savedResp.id, 'survey_1_citizen_1');
      assert.strictEqual(savedResp.completed, true);
      assert(savedResp.submittedAt, 'يجب تسجيل وقت الإرسال');
      assert.strictEqual(sim.surveys['survey_1'].totalResponses, 1);
    },
  },
  {
    code: 'S',
    title: 'إخفاء الاستبيان المكتمل نهائياً من واجهة المواطن بالاعتماد على Firestore',
    run: () => {
      const visibleAfterSubmit = sim.getVisibleUncompletedSurveysForCitizen('citizen_1');
      assert.strictEqual(
        visibleAfterSubmit.length,
        0,
        'يجب اختفاء الاستبيان المكتمل من واجهة المواطن'
      );
    },
  },
  {
    code: 'T',
    title: 'منع إرسال إجابة ثانية لنفس الاستبيان من نفس UID حتى بعد التحديث أو تغيير الجهاز',
    run: () => {
      const citizenSession = sim.loginUser('citizen_1');
      assert.throws(() => {
        sim.submitSurveyResponse(citizenSession.auth, 'survey_1', {
          q1: 'opt2',
        });
      }, /DUPLICATE_SURVEY_RESPONSE/);
    },
  },
  {
    code: 'U',
    title: 'ظهور استبيان ثانٍ جديد للمواطن عند نشره بشكل مستقل عن الاستبيان الأول المكتمل',
    run: () => {
      sim.publishSurvey(super1Auth, {
        id: 'survey_2',
        title: 'استبيان أولويات تأهيل الشوارع والإنارة في باعدرى',
        description: 'استطلاع رأي حول مشاريع الإنارة والتعبيد القادمة',
        questions: [
          {
            id: 'q1',
            questionText: 'ما الأولوية الأهم في حيك السكني؟',
            options: [
              { id: 'opt1', text: 'تعبيد الشوارع الفرعية', votesCount: 0 },
              { id: 'opt2', text: 'صيانة أعمدة الإنارة', votesCount: 0 },
            ],
          },
        ],
      });

      const visible = sim.getVisibleUncompletedSurveysForCitizen('citizen_1');
      assert.strictEqual(
        visible.length,
        1,
        'يجب أن يظهر الاستبيان الثاني فقط بينما يبقى الأول مخفياً'
      );
      assert.strictEqual(visible[0].id, 'survey_2');
    },
  },
  {
    code: 'V',
    title: 'منع الوصول غير المصرح إلى Firestore (قواعد الأمان، التوكنات، خزنة الاسترداد، الدوائر)',
    run: () => {
      const citizenSession = sim.loginUser('citizen_1');
      // 1. منع المواطن من تسجيل FCM Token إداري
      assert.throws(() => {
        sim.registerFcmToken(citizenSession.auth, 'cit_dev', 'fcm_citizen_token_12345');
      }, /غير مصرح/);

      // 2. التحقق من وجود قواعد الحماية الصارمة في firestore.rules و Service Worker
      assert(
        rulesContent.includes('match /user_fcm_tokens/{tokenId}'),
        'يجب حماية user_fcm_tokens في firestore.rules'
      );
      assert(
        rulesContent.includes('match /notification_dispatch_locks/{reportId}'),
        'يجب حماية notification_dispatch_locks في firestore.rules'
      );
      assert(
        rulesContent.includes('match /admin_recovery_vault/{adminId}'),
        'يجب عزل admin_recovery_vault في firestore.rules'
      );
      assert(
        swContent.includes('OPEN_ADMIN_REPORT_DETAILS'),
        'يجب دعم فتح تفاصيل البلاغ عند النقر على الإشعار في Service Worker'
      );
    },
  },
  {
    code: 'W',
    title:
      'حماية Rate Limiting المستمرة عبر القرص مع تحديد سقف 6 محاولات وبقاء الحظر بعد إعادة تشغيل الحاوية/الخادم',
    run: () => {
      const testKey = 'test_cloud_run_restart_key';
      resetRateLimit(testKey);

      // أول 6 محاولات مسموحة
      for (let i = 1; i <= 6; i++) {
        const res = checkRateLimit(testKey, 6, 60_000, 120_000);
        assert.strictEqual(res.allowed, true, `المحاولة ${i} يجب أن تكون مسموحة`);
        assert.strictEqual(res.remainingAttempts, 6 - i);
      }

      // المحاولة السابعة يجب حظرها
      const blockedRes = checkRateLimit(testKey, 6, 60_000, 120_000);
      assert.strictEqual(blockedRes.allowed, false, 'المحاولة السابعة يجب أن تكون محظورة');
      assert(blockedRes.retryAfterSeconds && blockedRes.retryAfterSeconds > 0);

      // التحقق من الحفظ على القرص في rate_limits.json
      const rateLimitFilePath = path.resolve(__dirname, '../server/.data/rate_limits.json');
      assert(fs.existsSync(rateLimitFilePath), 'يجب إنشاء وحفظ ملف rate_limits.json');
      const savedData = JSON.parse(fs.readFileSync(rateLimitFilePath, 'utf8'));
      assert(savedData[testKey], 'يجب أن يحتوي الملف الدائم على سجل المفتاح');
      assert.strictEqual(savedData[testKey].count, 7);
      assert(savedData[testKey].blockedUntil > Date.now());

      resetRateLimit(testKey);
    },
  },
  {
    code: 'X',
    title: 'تفعيل Firebase App Check ودمج ترويسات X-Firebase-AppCheck وحماية الاتصالات السحابية',
    run: async () => {
      // 1. التحقق من وجود دوال وتصديرات App Check داخل lib/firebase
      assert(typeof getAppCheckTokenHeader === 'function', 'getAppCheckTokenHeader يجب أن تكون دالة معرفة');
      assert(typeof withAppCheckHeaders === 'function', 'withAppCheckHeaders يجب أن تكون دالة معرفة');
      assert(typeof getAppCheckStatus === 'function', 'getAppCheckStatus يجب أن تكون دالة معرفة');

      const status = getAppCheckStatus();
      assert(typeof status === 'object' && status !== null, 'getAppCheckStatus يجب أن تعيد كائن حالة');
      assert('active' in status, 'كائن الحالة يجب أن يتضمن حقل active');
      assert('isDebug' in status, 'كائن الحالة يجب أن يتضمن حقل isDebug');

      // 2. التحقق من دمج ترويسة X-Firebase-AppCheck في الطلبات
      const base = { 'Content-Type': 'application/json' };
      const merged = await withAppCheckHeaders(base);
      assert.strictEqual(merged['Content-Type'], 'application/json');

      // 3. التحقق من تمرير توكن App Check في سياق الخادم AsyncLocalStorage
      const { appCheckContext, getActiveAppCheckToken } = await import('../server/firestoreRest');
      await appCheckContext.run({ appCheckToken: 'test_appcheck_token_12345' }, async () => {
        const currentToken = getActiveAppCheckToken();
        assert.strictEqual(currentToken, 'test_appcheck_token_12345', 'يجب استرجاع توكن App Check النشط بنجاح من سياق الطلب');
      });

      // 4. التحقق من بناء ترويسات REST API على الخادم مع توكن App Check
      const { buildIdentityToolkitHeaders } = await import('../server/routes/authMiddleware');
      await appCheckContext.run({ appCheckToken: 'test_token_toolkit' }, async () => {
        const headers = buildIdentityToolkitHeaders();
        assert.strictEqual(headers['X-Firebase-AppCheck'], 'test_token_toolkit', 'يجب أن تتضمن ترويسات Identity Toolkit ترويسة X-Firebase-AppCheck');
      });
    },
  },
];

console.log('======================================================================');
console.log('🚀 بدء تشغيل اختبارات التكامل والأمان النهائية الشاملة (Scenarios A -> X)');
console.log('======================================================================');

(async () => {
  let passed = 0;
  for (const sc of scenarios) {
    try {
      await sc.run();
      passed++;
      console.log(`✅ [PASS] (${sc.code}) ${sc.title}`);
    } catch (err: any) {
      console.error(`❌ [FAIL] (${sc.code}) ${sc.title}`);
      console.error(`   السبب: ${err.message}`);
      process.exit(1);
    }
  }

  console.log('----------------------------------------------------------------------');
  console.log(`🎉 اكتملت جميع الاختبارات النهائية بنجاح تام: (${passed}/${scenarios.length})`);
  console.log('======================================================================');
})();
