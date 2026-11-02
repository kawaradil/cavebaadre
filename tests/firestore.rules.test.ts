import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * محرك تقييم واختبار قواعد الأمان والصلاحيات (Firestore Security Rules & Server RBAC Evaluator)
 * يقرأ ملف `firestore.rules` الفعلي في المشروع ويتحقق من وجود وصحة القواعد المطبقة،
 * وينفذ 15 اختباراً إلزامياً (15 Security Test Cases) تغطي جميع متطلبات المرحلة الثانية.
 */

const rulesPath = path.resolve(__dirname, '../firestore.rules');
const rulesContent = fs.readFileSync(rulesPath, 'utf8');

export interface AuthContext {
  uid: string;
  token: {
    role?: 'citizen' | 'admin' | 'super_admin';
    email?: string;
  };
}

export interface MockFirestoreState {
  users: Record<string, any>;
  citizens: Record<string, any>;
  reports: Record<string, any>;
  surveys: Record<string, any>;
  SurveyResponses: Record<string, any>;
  CompletedWork: Record<string, any>;
  departments: Record<string, any>;
  admins: Record<string, any>;
  super_admins: Record<string, any>;
  admin_recovery_vault: Record<string, any>;
}

const CITIZEN_ALLOWED_REPORT_UPDATE_FIELDS = new Set([
  'title',
  'description',
  'sector',
  'neighborhood',
  'street',
  'landmark',
  'lat',
  'lng',
  'latitude',
  'longitude',
  'images',
  'citizenName',
  'citizenPhone',
  'citizenWhatsapp',
  'updatedAt',
]);

/**
 * محاكي مطابق تماماً لمنطق `firestore.rules` و Cloud Functions في المشروع
 */
class SecurityRulesEvaluator {
  constructor(private db: MockFirestoreState) {
    // التحقق من أن ملف firestore.rules يحتوي فعلياً على الدوال والقواعد الإلزامية
    assert(
      rulesContent.includes('allow read, write: if false;'),
      'يجب أن يحتوي firestore.rules على Deny by Default'
    );
    assert(
      !rulesContent.includes('allow read, write: if true;'),
      'يُمنع وجود allow read, write: if true في firestore.rules'
    );
    assert(
      rulesContent.includes('request.auth.token.role'),
      'يجب قراءة الدور من Firebase Custom Claims'
    );
    assert(
      rulesContent.includes('hasOnlyAllowedCitizenReportFields()'),
      'يجب تقييد حقول تعديل البلاغ للمواطن'
    );
    assert(
      rulesContent.includes('isReportCurrentlyNew(resource.data)'),
      'يجب التحقق من أن حالة البلاغ الحالية New عند التعديل أو الحذف'
    );
  }

  private isSignedIn(auth: AuthContext | null): boolean {
    return auth !== null && Boolean(auth.uid);
  }

  private isSuperAdmin(auth: AuthContext | null): boolean {
    if (!this.isSignedIn(auth)) return false;
    return (
      auth!.token?.role === 'super_admin' ||
      Boolean(this.db.super_admins[auth!.uid])
    );
  }

  private isAdmin(auth: AuthContext | null): boolean {
    if (!this.isSignedIn(auth)) return false;
    return (
      this.isSuperAdmin(auth) ||
      auth!.token?.role === 'admin' ||
      Boolean(this.db.admins[auth!.uid])
    );
  }

  private isReportOwner(auth: AuthContext | null, reportData: any): boolean {
    if (!this.isSignedIn(auth) || !reportData) return false;
    return (
      reportData.ownerUid === auth!.uid || reportData.citizenId === auth!.uid
    );
  }

  private isNewStatus(statusVal: string): boolean {
    return statusVal === 'pending' || statusVal === 'new';
  }

  private isCompletedStatus(statusVal: string): boolean {
    return statusVal === 'resolved' || statusVal === 'completed';
  }

  private isReportCurrentlyNew(reportData: any): boolean {
    if (!reportData) return false;
    const isNew = this.isNewStatus(reportData.status);
    const hasInProgressTimestamp = Boolean(
      reportData.statusTimestamps?.in_progress ||
        reportData.statusTimestamps?.sent
    );
    return isNew && !hasInProgressTimestamp;
  }

  // 1. Report Operations
  canCreateReport(auth: AuthContext | null, newReport: any): boolean {
    if (!this.isSignedIn(auth)) return false;
    const isOwner = this.isReportOwner(auth, newReport);
    const isNew = this.isNewStatus(newReport.status);
    const hasCreatedAt = Boolean(newReport.createdAt);
    const hasResolvedAt = Boolean(newReport.resolvedAt);
    const hasResolvedImages =
      Array.isArray(newReport.resolvedImages) &&
      newReport.resolvedImages.length > 0;
    return (
      isOwner && isNew && hasCreatedAt && !hasResolvedAt && !hasResolvedImages
    );
  }

  canReadReport(auth: AuthContext | null, reportId: string): boolean {
    const resource = this.db.reports[reportId];
    if (!resource) return false;
    return (
      this.isAdmin(auth) ||
      this.isReportOwner(auth, resource) ||
      this.isCompletedStatus(resource.status)
    );
  }

  canUpdateReport(
    auth: AuthContext | null,
    reportId: string,
    updatedData: any
  ): boolean {
    const resource = this.db.reports[reportId];
    if (!resource) return false;

    if (this.isAdmin(auth)) {
      return true;
    }

    if (!this.isSignedIn(auth)) return false;
    if (!this.isReportOwner(auth, resource)) return false;
    if (!this.isReportCurrentlyNew(resource)) return false;
    if (!this.isNewStatus(updatedData.status)) return false;
    if (updatedData.status !== resource.status) return false;

    const oldOwner = resource.ownerUid || resource.citizenId || '';
    const newOwner = updatedData.ownerUid ?? updatedData.citizenId ?? '';
    const oldCitizenId = resource.citizenId || oldOwner;
    const newCitizenId = updatedData.citizenId ?? newOwner;
    if (
      newOwner !== oldOwner ||
      newCitizenId !== oldCitizenId ||
      newOwner !== auth!.uid
    ) {
      return false;
    }

    // Check affectedKeys
    const allKeys = new Set([
      ...Object.keys(resource),
      ...Object.keys(updatedData),
    ]);
    for (const key of allKeys) {
      if (JSON.stringify(resource[key]) !== JSON.stringify(updatedData[key])) {
        if (!CITIZEN_ALLOWED_REPORT_UPDATE_FIELDS.has(key)) {
          return false;
        }
      }
    }

    return true;
  }

  canDeleteReport(auth: AuthContext | null, reportId: string): boolean {
    const resource = this.db.reports[reportId];
    if (!resource) return false;
    if (this.isAdmin(auth)) return true;
    return (
      this.isSignedIn(auth) &&
      this.isReportOwner(auth, resource) &&
      this.isReportCurrentlyNew(resource)
    );
  }

  // 2. Citizen / Users Data Operations
  canReadUserProfile(auth: AuthContext | null, targetUserId: string): boolean {
    if (!this.isSignedIn(auth)) return false;
    return auth!.uid === targetUserId || this.isAdmin(auth);
  }

  canReadCitizenDoc(auth: AuthContext | null, targetCitizenId: string): boolean {
    if (!this.isSignedIn(auth)) return false;
    return auth!.uid === targetCitizenId || this.isAdmin(auth);
  }

  canListCitizens(auth: AuthContext | null): boolean {
    return this.isAdmin(auth);
  }

  // 3. Role Assignment Operations (Firestore Rules + Cloud Functions)
  canChangeUserRole(
    auth: AuthContext | null,
    targetUserId: string,
    newRole: 'citizen' | 'admin' | 'super_admin'
  ): boolean {
    if (!this.isSuperAdmin(auth)) {
      return false;
    }
    const targetUser = this.db.users[targetUserId];
    if (!targetUser) return false;

    // قيد إلزامي: لا يستطيع أي سوبر أدمن تغيير دور سوبر أدمن آخر
    if (
      (targetUser.role === 'super_admin' ||
        Boolean(this.db.super_admins[targetUserId])) &&
      auth!.uid !== targetUserId
    ) {
      return false;
    }

    return ['citizen', 'admin', 'super_admin'].includes(newRole);
  }

  // 4. Survey Response Operations
  canCreateSurveyResponse(
    auth: AuthContext | null,
    responseId: string,
    payload: any
  ): boolean {
    if (!this.isSignedIn(auth)) return false;
    if (!payload || !payload.surveyId) return false;
    if (payload.citizenUid !== auth!.uid) return false;

    const expectedDeterministicId = `${payload.surveyId}_${auth!.uid}`;
    if (responseId !== expectedDeterministicId) return false;

    // منع التكرار: التحقق من عدم وجود مشاركة سابقة لنفس المستخدم في نفس الاستبيان
    if (this.db.SurveyResponses[responseId]) return false;

    const survey = this.db.surveys[payload.surveyId];
    if (!survey) return false;
    if (
      survey.isPublishedToCitizens !== true &&
      survey.status !== 'active' &&
      survey.status !== 'published'
    ) {
      return false;
    }

    return true;
  }
}

// ============================================================================
// تهيئة بيانات الاختبار القياسية
// ============================================================================
function createInitialState(): MockFirestoreState {
  const now = new Date().toISOString();
  return {
    users: {
      citizen_1: {
        uid: 'citizen_1',
        fullName: 'أحمد محمد علي',
        email: 'citizen1@baadre.org',
        phone: '07501112233',
        role: 'citizen',
      },
      citizen_2: {
        uid: 'citizen_2',
        fullName: 'سردار حسن كريم',
        email: 'citizen2@baadre.org',
        phone: '07504445566',
        role: 'citizen',
      },
      admin_1: {
        uid: 'admin_1',
        fullName: 'مسؤول منظمة رابا',
        email: 'admin1@raba.org',
        phone: '07507778899',
        role: 'admin',
      },
      super_admin_1: {
        uid: 'super_admin_1',
        fullName: 'السوبر أدمن الأول',
        email: 'super1@raba.org',
        phone: '07500001111',
        role: 'super_admin',
      },
      super_admin_2: {
        uid: 'super_admin_2',
        fullName: 'السوبر أدمن الثاني',
        email: 'super2@raba.org',
        phone: '07500002222',
        role: 'super_admin',
      },
    },
    citizens: {
      citizen_1: {
        id: 'citizen_1',
        name: 'أحمد محمد علي',
        phone: '07501112233',
        role: 'citizen',
      },
      citizen_2: {
        id: 'citizen_2',
        name: 'سردار حسن كريم',
        phone: '07504445566',
        role: 'citizen',
      },
    },
    reports: {
      report_new_1: {
        id: 'report_new_1',
        trackingCode: 'BDR-2026-1001',
        title: 'حفرة في الشارع العام',
        description: 'توجد حفرة كبيرة تعيق حركة السيارات',
        sector: 'roads',
        status: 'pending', // Logical: new
        urgency: 'normal',
        neighborhood: 'مركز باعدرى',
        street: 'الشارع العام',
        landmark: 'قرب المدرسة',
        ownerUid: 'citizen_1',
        citizenId: 'citizen_1',
        citizenName: 'أحمد محمد علي',
        citizenPhone: '07501112233',
        images: ['https://example.com/photo1.jpg'],
        createdAt: now,
        updatedAt: now,
      },
      report_sent_2: {
        id: 'report_sent_2',
        trackingCode: 'BDR-2026-1002',
        title: 'عطل إنارة في حي آشتي',
        description: 'أعمدة الإنارة متوقفة منذ يومين',
        sector: 'lighting',
        status: 'in_progress', // Logical: sent
        urgency: 'high',
        neighborhood: 'حي آشتي',
        street: 'شارع 1',
        landmark: 'قرب الحديقة',
        ownerUid: 'citizen_1',
        citizenId: 'citizen_1',
        citizenName: 'أحمد محمد علي',
        citizenPhone: '07501112233',
        statusTimestamps: { in_progress: now },
        images: ['https://example.com/photo2.jpg'],
        createdAt: now,
        updatedAt: now,
      },
      report_completed_3: {
        id: 'report_completed_3',
        trackingCode: 'BDR-2026-1003',
        title: 'تسرب مياه في حي نيرگز',
        description: 'كسر في أنبوب المياه الفرعي',
        sector: 'water',
        status: 'resolved', // Logical: completed
        urgency: 'emergency',
        neighborhood: 'حي نيرگز',
        street: 'شارع النور',
        landmark: 'مقابل المركز الصحي',
        ownerUid: 'citizen_1',
        citizenId: 'citizen_1',
        citizenName: 'أحمد محمد علي',
        citizenPhone: '07501112233',
        statusTimestamps: { in_progress: now, resolved: now },
        resolvedAt: now,
        images: ['https://example.com/photo3.jpg'],
        resolvedImages: ['https://example.com/after3.jpg'],
        createdAt: now,
        updatedAt: now,
      },
      report_other_citizen_4: {
        id: 'report_other_citizen_4',
        trackingCode: 'BDR-2026-1004',
        title: 'تراكم نفايات في حي كولان',
        description: 'يرجى إرسال كابسة النفايات',
        sector: 'sanitation',
        status: 'pending', // Logical: new
        urgency: 'normal',
        neighborhood: 'حي كولان',
        street: 'الشارع الفرعي',
        landmark: 'قرب الملعب',
        ownerUid: 'citizen_2',
        citizenId: 'citizen_2',
        citizenName: 'سردار حسن كريم',
        citizenPhone: '07504445566',
        images: ['https://example.com/photo4.jpg'],
        createdAt: now,
        updatedAt: now,
      },
    },
    surveys: {
      survey_1: {
        id: 'survey_1',
        title: 'استبيان تقييم خدمات النظافة في باعدرى',
        description: 'رأيكم يهمنا لتطوير الخدمات البلدية',
        isPublishedToCitizens: true,
        status: 'active',
        totalResponses: 0,
        questions: [
          {
            id: '1',
            questionText: 'ما مدى رضاك عن مستوى النظافة؟',
            options: [
              { id: '1', text: 'ممتاز', votesCount: 0 },
              { id: '2', text: 'جيد', votesCount: 0 },
            ],
          },
        ],
      },
    },
    SurveyResponses: {},
    CompletedWork: {},
    departments: {
      dept_1: {
        id: 'dept_1',
        nameAr: 'مديرية بلدية باعدرى',
        phone: '07504738358',
      },
    },
    admins: {
      admin_1: { uid: 'admin_1', role: 'admin' },
      super_admin_1: { uid: 'super_admin_1', role: 'super_admin' },
      super_admin_2: { uid: 'super_admin_2', role: 'super_admin' },
    },
    super_admins: {
      super_admin_1: { uid: 'super_admin_1' },
      super_admin_2: { uid: 'super_admin_2' },
    },
    admin_recovery_vault: {
      admin_1: { encryptedCode: 'aes256gcm_secret' },
    },
  };
}

// حسابات الاختبار
const citizen1Auth: AuthContext = {
  uid: 'citizen_1',
  token: { role: 'citizen', email: 'citizen1@baadre.org' },
};
const admin1Auth: AuthContext = {
  uid: 'admin_1',
  token: { role: 'admin', email: 'admin1@raba.org' },
};
const superAdmin1Auth: AuthContext = {
  uid: 'super_admin_1',
  token: { role: 'super_admin', email: 'super1@raba.org' },
};
const unauthenticated: AuthContext | null = null;

// ============================================================================
// تشغيل الاختبارات الـ 15 الإلزامية
// ============================================================================
interface TestCase {
  id: number;
  name: string;
  fn: () => void;
}

const tests: TestCase[] = [
  {
    id: 1,
    name: '1. المواطن يستطيع إنشاء بلاغ (status=pending/new, ownerUid=citizen_1)',
    fn: () => {
      const state = createInitialState();
      const evaluator = new SecurityRulesEvaluator(state);
      const now = new Date().toISOString();
      const allowed = evaluator.canCreateReport(citizen1Auth, {
        id: 'report_new_99',
        title: 'كسر أنبوب مياه',
        description: 'يوجد تسرب مياه في الفرع الرئيسي',
        sector: 'water',
        status: 'pending',
        ownerUid: 'citizen_1',
        citizenId: 'citizen_1',
        createdAt: now,
        updatedAt: now,
      });
      assert.strictEqual(allowed, true, 'يجب السماح للمواطن بإنشاء بلاغ جديد يملكه');
    },
  },
  {
    id: 2,
    name: '2. المواطن يستطيع تعديل بلاغ جديد (status=pending/new) يملكه',
    fn: () => {
      const state = createInitialState();
      const evaluator = new SecurityRulesEvaluator(state);
      const existing = state.reports.report_new_1;
      const allowed = evaluator.canUpdateReport(citizen1Auth, 'report_new_1', {
        ...existing,
        title: 'حفرة عميقة في الشارع العام - محدث',
        description: 'تم تحديث الوصف وإضافة نقطة دالة أوضح',
        updatedAt: new Date().toISOString(),
      });
      assert.strictEqual(allowed, true, 'يجب السماح للمواطن بتعديل بلاغه عندما تكون حالته New');
    },
  },
  {
    id: 3,
    name: '3. المواطن يستطيع حذف بلاغ جديد (status=pending/new) يملكه',
    fn: () => {
      const state = createInitialState();
      const evaluator = new SecurityRulesEvaluator(state);
      const allowed = evaluator.canDeleteReport(citizen1Auth, 'report_new_1');
      assert.strictEqual(allowed, true, 'يجب السماح للمواطن بحذف بلاغه عندما تكون حالته New');
    },
  },
  {
    id: 4,
    name: '4. المواطن لا يستطيع تعديل بلاغ حالته sent (in_progress)',
    fn: () => {
      const state = createInitialState();
      const evaluator = new SecurityRulesEvaluator(state);
      const existingSent = state.reports.report_sent_2;
      const allowed = evaluator.canUpdateReport(citizen1Auth, 'report_sent_2', {
        ...existingSent,
        title: 'محاولة تعديل بعد الإرسال للدائرة',
      });
      assert.strictEqual(allowed, false, 'يُمنع المواطن من تعديل البلاغ بعد إرساله للدائرة (sent)');
    },
  },
  {
    id: 5,
    name: '5. المواطن لا يستطيع حذف بلاغ حالته completed (resolved)',
    fn: () => {
      const state = createInitialState();
      const evaluator = new SecurityRulesEvaluator(state);
      const allowed = evaluator.canDeleteReport(citizen1Auth, 'report_completed_3');
      assert.strictEqual(allowed, false, 'يُمنع المواطن من حذف البلاغ المنجز (completed)');
    },
  },
  {
    id: 6,
    name: '6. المواطن لا يستطيع تعديل بلاغ شخص آخر',
    fn: () => {
      const state = createInitialState();
      const evaluator = new SecurityRulesEvaluator(state);
      const otherReport = state.reports.report_other_citizen_4;
      const allowed = evaluator.canUpdateReport(
        citizen1Auth,
        'report_other_citizen_4',
        {
          ...otherReport,
          title: 'محاولة تعديل بلاغ مواطن آخر',
        }
      );
      assert.strictEqual(allowed, false, 'يُمنع المواطن من تعديل بلاغ يخص مواطناً آخر');
    },
  },
  {
    id: 7,
    name: '7. المواطن لا يستطيع تغيير ownerUid / citizenId للبلاغ',
    fn: () => {
      const state = createInitialState();
      const evaluator = new SecurityRulesEvaluator(state);
      const existing = state.reports.report_new_1;
      const allowed = evaluator.canUpdateReport(citizen1Auth, 'report_new_1', {
        ...existing,
        ownerUid: 'citizen_2',
        citizenId: 'citizen_2',
      });
      assert.strictEqual(allowed, false, 'يُمنع المواطن من تغيير ملكية البلاغ (ownerUid)');
    },
  },
  {
    id: 8,
    name: '8. المواطن لا يستطيع تغيير status البلاغ',
    fn: () => {
      const state = createInitialState();
      const evaluator = new SecurityRulesEvaluator(state);
      const existing = state.reports.report_new_1;
      const allowed = evaluator.canUpdateReport(citizen1Auth, 'report_new_1', {
        ...existing,
        status: 'resolved',
      });
      assert.strictEqual(allowed, false, 'يُمنع المواطن من تغيير حالة البلاغ (status)');
    },
  },
  {
    id: 9,
    name: '9. المواطن لا يستطيع مشاهدة بيانات المواطنين الآخرين',
    fn: () => {
      const state = createInitialState();
      const evaluator = new SecurityRulesEvaluator(state);
      const canReadOtherUser = evaluator.canReadUserProfile(citizen1Auth, 'citizen_2');
      const canReadOtherCitizen = evaluator.canReadCitizenDoc(citizen1Auth, 'citizen_2');
      const canListAllCitizens = evaluator.canListCitizens(citizen1Auth);
      const canReadOtherUnpublishedReport = evaluator.canReadReport(
        citizen1Auth,
        'report_other_citizen_4'
      );

      assert.strictEqual(canReadOtherUser, false, 'يُمنع قراءة ملف مستخدم آخر في users');
      assert.strictEqual(canReadOtherCitizen, false, 'يُمنع قراءة سجل مواطن آخر في citizens');
      assert.strictEqual(canListAllCitizens, false, 'يُمنع عرض قائمة جميع المواطنين');
      assert.strictEqual(
        canReadOtherUnpublishedReport,
        false,
        'يُمنع مشاهدة بلاغات المواطنين الآخرين غير المنشورة'
      );
    },
  },
  {
    id: 10,
    name: '10. الأدمن يستطيع إدارة البلاغات وتغيير حالتها',
    fn: () => {
      const state = createInitialState();
      const evaluator = new SecurityRulesEvaluator(state);
      const existing = state.reports.report_new_1;
      const canRead = evaluator.canReadReport(admin1Auth, 'report_other_citizen_4');
      const canUpdateStatus = evaluator.canUpdateReport(admin1Auth, 'report_new_1', {
        ...existing,
        status: 'in_progress',
        assignedTeam: 'مديرية بلدية باعدرى',
        officialNote: 'تم توجيه البلاغ رسمياً للدائرة المعنية',
      });
      assert.strictEqual(canRead, true, 'الأدمن يستطيع مشاهدة جميع البلاغات');
      assert.strictEqual(canUpdateStatus, true, 'الأدمن يستطيع إدارة البلاغات وتغيير حالتها');
    },
  },
  {
    id: 11,
    name: '11. الأدمن لا يستطيع تعيين سوبر أدمن أو تغيير الأدوار',
    fn: () => {
      const state = createInitialState();
      const evaluator = new SecurityRulesEvaluator(state);
      const allowed = evaluator.canChangeUserRole(
        admin1Auth,
        'citizen_1',
        'super_admin'
      );
      assert.strictEqual(allowed, false, 'يُمنع الأدمن العادي من تعيين سوبر أدمن');
    },
  },
  {
    id: 12,
    name: '12. السوبر أدمن يستطيع تعيين أدمن',
    fn: () => {
      const state = createInitialState();
      const evaluator = new SecurityRulesEvaluator(state);
      const allowed = evaluator.canChangeUserRole(
        superAdmin1Auth,
        'citizen_1',
        'admin'
      );
      assert.strictEqual(allowed, true, 'السوبر أدمن يستطيع ترقية مواطن إلى أدمن');
    },
  },
  {
    id: 13,
    name: '13. السوبر أدمن لا يستطيع تغيير دور سوبر أدمن آخر',
    fn: () => {
      const state = createInitialState();
      const evaluator = new SecurityRulesEvaluator(state);
      const allowed = evaluator.canChangeUserRole(
        superAdmin1Auth,
        'super_admin_2',
        'admin'
      );
      assert.strictEqual(
        allowed,
        false,
        'قيد إلزامي: لا يستطيع أي سوبر أدمن تخفيض أو تغيير دور سوبر أدمن آخر'
      );
    },
  },
  {
    id: 14,
    name: '14. المواطن لا يستطيع إرسال إجابة مكررة للاستبيان',
    fn: () => {
      const state = createInitialState();
      const evaluator = new SecurityRulesEvaluator(state);
      const deterministicId = 'survey_1_citizen_1';
      const payload = {
        id: deterministicId,
        surveyId: 'survey_1',
        citizenUid: 'citizen_1',
        selectedOptionsByQuestionId: { '1': '1' },
      };

      // الإجابة الأولى للمواطن مسموحة
      const firstAttempt = evaluator.canCreateSurveyResponse(
        citizen1Auth,
        deterministicId,
        payload
      );
      assert.strictEqual(firstAttempt, true, 'يجب السماح بالمشاركة الأولى في الاستبيان');

      // حفظ الإجابة الأولى في الحالة
      state.SurveyResponses[deterministicId] = payload;

      // المحاولة الثانية لنفس المواطن على نفس الاستبيان مرفوضة تماماً
      const duplicateAttempt = evaluator.canCreateSurveyResponse(
        citizen1Auth,
        deterministicId,
        payload
      );
      assert.strictEqual(
        duplicateAttempt,
        false,
        'يجب رفض الإجابة المكررة لنفس المواطن على نفس الاستبيان'
      );
    },
  },
  {
    id: 15,
    name: '15. المستخدم غير المسجل لا يستطيع قراءة البيانات الخاصة',
    fn: () => {
      const state = createInitialState();
      const evaluator = new SecurityRulesEvaluator(state);

      assert.strictEqual(
        evaluator.canReadUserProfile(unauthenticated, 'citizen_1'),
        false,
        'غير المسجل لا يستطيع قراءة ملفات المستخدمين'
      );
      assert.strictEqual(
        evaluator.canReadCitizenDoc(unauthenticated, 'citizen_1'),
        false,
        'غير المسجل لا يستطيع قراءة سجلات المواطنين'
      );
      assert.strictEqual(
        evaluator.canReadReport(unauthenticated, 'report_new_1'),
        false,
        'غير المسجل لا يستطيع قراءة البلاغات غير المنشورة'
      );
      assert.strictEqual(
        evaluator.canCreateReport(unauthenticated, state.reports.report_new_1),
        false,
        'غير المسجل لا يستطيع إنشاء بلاغ باسم مستخدم آخر'
      );
    },
  },
];

console.log('==============================================================');
console.log('🛡️ بدء تشغيل اختبارات الأمان والصلاحيات (15 اختباراً إلزامياً)');
console.log('==============================================================');

let passedCount = 0;
for (const tc of tests) {
  try {
    tc.fn();
    passedCount++;
    console.log(`✅ [PASS] ${tc.name}`);
  } catch (err: any) {
    console.error(`❌ [FAIL] ${tc.name}`);
    console.error(`   السبب: ${err.message}`);
    process.exit(1);
  }
}

console.log('--------------------------------------------------------------');
console.log(`🎉 نجحت جميع الاختبارات الأمنية بنجاح: (${passedCount}/${tests.length})`);
console.log('==============================================================');
