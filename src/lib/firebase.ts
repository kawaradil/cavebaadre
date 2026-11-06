import * as firebaseAppModule from 'firebase/app';
import { initializeApp, getApps, getApp } from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/storage';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  setLogLevel,
  doc,
  runTransaction,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadString,
  getDownloadURL,
  FirebaseStorage,
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  CivicReport,
  OrganizationProject,
  RegisteredCitizen,
  CommunitySurvey,
  CitizenSurveyResponse,
  SECTOR_ILLUSTRATIONS,
  isReportSentToDepartment,
} from '../types/baadre';
import { sanitizeDatabasePayload } from './inputLimits';

function ensureFirebaseAppWithComponents() {
  const instance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  try {
    const internalComponents = (firebaseAppModule as any)._components;
    const addOrOverwrite = (firebaseAppModule as any)._addOrOverwriteComponent;
    if (
      internalComponents &&
      typeof internalComponents.values === 'function' &&
      typeof addOrOverwrite === 'function'
    ) {
      for (const comp of internalComponents.values()) {
        addOrOverwrite(instance, comp);
      }
    }
  } catch {}
  return instance;
}

export const app = ensureFirebaseAppWithComponents();
export const FIREBASE_STORAGE_BUCKET = 'gs://baadre-smarteye.firebasestorage.app';
export const MAX_UPLOAD_IMAGES = 10;

function initOptimizedFirestore(): Firestore {
  try {
    setLogLevel('silent');
  } catch {}
  return getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db: Firestore = initOptimizedFirestore();
export const auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(app, FIREBASE_STORAGE_BUCKET);

export const COLLECTIONS = {
  REPORTS: 'reports',
  COMPLETED_WORK: 'CompletedWork',
  DEPARTMENTS: 'departments',
  CITIZENS: 'citizens',
  SURVEYS: 'surveys',
  SURVEY_RESPONSES: 'SurveyResponses',
  USER_FCM_TOKENS: 'user_fcm_tokens',
} as const;

const NUMERIC_COUNTERS_KEY = 'cave_baadre_numeric_id_counters_v1';
const memoryCounters: Record<string, number> = {};

function getStoredCounter(collectionName: string): number {
  try {
    const raw = localStorage.getItem(NUMERIC_COUNTERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed[collectionName] === 'number') {
        return parsed[collectionName];
      }
    }
  } catch {}
  return 0;
}

function saveStoredCounter(collectionName: string, val: number): void {
  memoryCounters[collectionName] = val;
  try {
    const raw = localStorage.getItem(NUMERIC_COUNTERS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[collectionName] = val;
    localStorage.setItem(NUMERIC_COUNTERS_KEY, JSON.stringify(parsed));
  } catch {}
}

export function isPureNumericId(id?: string | number | null): boolean {
  if (id === undefined || id === null) return false;
  return /^\d+$/.test(String(id).trim());
}

/**
 * توليد معرّف رقمي أوتوماتيكي متسلسل (1, 2, 3, 4...) لكل مجموعة (Collection)
 */
export function generateAutoNumericId(
  collectionName: string,
  existingItems?: Array<{ id?: string | number }>
): string {
  let maxId = Math.max(memoryCounters[collectionName] || 0, getStoredCounter(collectionName));

  if (Array.isArray(existingItems)) {
    for (const item of existingItems) {
      if (item && isPureNumericId(item.id)) {
        const num = parseInt(String(item.id).trim(), 10);
        if (!Number.isNaN(num) && num > maxId) {
          maxId = num;
        }
      }
    }
  }

  const nextId = maxId + 1;
  saveStoredCounter(collectionName, nextId);
  return String(nextId);
}

/**
 * مزامنة العداد الرقمي مع البيانات القادمة من Firestore لضمان عدم تكرار أي رقم أوتوماتيكي
 */
export function syncNumericCounterWithItems(
  collectionName: string,
  items: Array<{ id?: string | number }>
): void {
  let maxId = Math.max(memoryCounters[collectionName] || 0, getStoredCounter(collectionName));
  for (const item of items) {
    if (item && isPureNumericId(item.id)) {
      const num = parseInt(String(item.id).trim(), 10);
      if (!Number.isNaN(num) && num > maxId) {
        maxId = num;
      }
    }
  }
  if (maxId > 0) {
    saveStoredCounter(collectionName, maxId);
  }
}

/**
 * تنظيف الكائن من القيم غير المعرفة (undefined) وتضمين حقل id الرقمي الأوتوماتيكي رسمياً داخل وثيقة Firestore
 */
export function prepareDocumentWithId<T extends Record<string, any>>(
  collectionName: string,
  data: T,
  customId?: string,
  existingItems?: Array<{ id?: string | number }>
): T & { id: string } {
  const candidateId =
    customId && isPureNumericId(customId)
      ? String(customId).trim()
      : data.id && isPureNumericId(data.id)
      ? String(data.id).trim()
      : generateAutoNumericId(collectionName, existingItems);

  const numVal = parseInt(candidateId, 10);
  if (!Number.isNaN(numVal)) {
    const currentMax = Math.max(
      memoryCounters[collectionName] || 0,
      getStoredCounter(collectionName)
    );
    if (numVal > currentMax) {
      saveStoredCounter(collectionName, numVal);
    }
  }

  const cleaned: Record<string, any> = { id: candidateId };
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleaned[key] = sanitizeDatabasePayload(value);
    }
  }
  cleaned.id = candidateId;
  return cleaned as T & { id: string };
}

export const MAX_IMAGE_SIZE_BYTES = 95 * 1024; // 95 KB max to ensure documents never exceed Firestore 1MB quota

function getDataUrlByteSize(dataUrl: string): number {
  const base64Index = dataUrl.indexOf(',');
  const base64Length = base64Index >= 0 ? dataUrl.length - (base64Index + 1) : dataUrl.length;
  return Math.floor(base64Length * 0.75);
}

/**
 * إخفاء رقم الهاتف لغير أصحاب البلاغ وموظفي البلدية لحماية الخصوصية (مثال: 0750***3858)
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const cleaned = String(phone).trim();
  if (cleaned.length <= 6) return cleaned;
  const start = cleaned.slice(0, 4);
  const end = cleaned.slice(-3);
  return `${start}***${end}`;
}

/**
 * ضغط الصور المرفوعة تلقائياً بحيث لا يتجاوز حجم الصورة 95 كيلوبايت مع الحفاظ على وضوحها وأبعادها
 * مما يجعل حفظ البلاغات فائق السرعة ويمنع تجاوز حد الـ 1 ميجابايت لوثائق Firestore.
 */
export function compressImageFile(
  file: File,
  maxDimension = 960,
  initialQuality = 0.72
): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) {
        resolve('');
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          let currentWidth = width;
          let currentHeight = height;
          let quality = initialQuality;
          let compressed = dataUrl;

          for (let attempt = 0; attempt < 7; attempt++) {
            canvas.width = Math.max(1, currentWidth);
            canvas.height = Math.max(1, currentHeight);
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(dataUrl);
              return;
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            compressed = canvas.toDataURL('image/jpeg', quality);

            if (getDataUrlByteSize(compressed) <= MAX_IMAGE_SIZE_BYTES) {
              break;
            }

            if (quality > 0.40) {
              quality = Number((quality - 0.10).toFixed(2));
            } else {
              currentWidth = Math.round(currentWidth * 0.80);
              currentHeight = Math.round(currentHeight * 0.80);
            }
          }

          resolve(compressed);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * رفع الصورة إلى مخزن صور فايربيس السحابي الرسمي:
 * gs://baadre-smarteye.firebasestorage.app
 * وإرجاع رابط التنزيل المباشر (Download URL).
 * يُمنع نهائياً التراجع إلى حفظ نصوص Base64 في وثائق Firestore لحماية قاعدة البيانات من تجاوز حد الـ 1MB.
 */
export async function uploadImageToFirebaseStorage(
  dataUrl: string,
  folder: 'reports' | 'completed_work' | 'projects' = 'reports'
): Promise<string> {
  if (!dataUrl) return '';
  // إذا كانت الصورة رابطاً سحابياً أو مساراً ثابتاً، يتم إرجاعها مباشرة
  if (
    dataUrl.startsWith('http://') ||
    dataUrl.startsWith('https://') ||
    (dataUrl.startsWith('/') && !dataUrl.startsWith('data:'))
  ) {
    return dataUrl;
  }

  try {
    const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}.jpg`;
    const objectPath = `${folder}/${uniqueName}`;
    const imgRef = storageRef(storage, objectPath);

    const uploadTaskPromise = (async () => {
      await uploadString(imgRef, dataUrl, 'data_url', {
        contentType: 'image/jpeg',
        customMetadata: {
          bucket: FIREBASE_STORAGE_BUCKET,
          uploadedAt: new Date().toISOString(),
        },
      });
      return await getDownloadURL(imgRef);
    })();

    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Storage upload timeout')), 12000)
    );

    const downloadUrl = await Promise.race([uploadTaskPromise, timeoutPromise]);
    if (!downloadUrl || downloadUrl.startsWith('data:')) {
      throw new Error('فشل الحصول على رابط التنزيل السحابي من Firebase Storage.');
    }
    return downloadUrl;
  } catch (err) {
    console.warn('[FirebaseStorage] فشل رفع الصورة إلى Storage:', err);
    // إلغاء التراجع إلى Base64 لمنع تضخم وثائق Firestore؛ يتم إرجاع سلسلة فارغة ليتم استبدالها برابط الأيقونة التوضيحية
    return '';
  }
}

/**
 * تحويل بيانات البلاغ المنجز (status === 'resolved') مع جميع صور الإنجاز (بعد) وجميع صور البلاغ (قبل)
 * إلى وثيقة عمل منجز متكاملة داخل كولكشن CompletedWork في Firestore.
 */
export function buildCompletedWorkDocumentFromReport(
  report: CivicReport,
  targetWorkNumericId: string
): OrganizationProject {
  const nowIso = report.resolvedAt || report.updatedAt || new Date().toISOString();
  const hoursDiff =
    report.responseTimeHours ||
    Math.max(
      1,
      Number(((new Date(nowIso).getTime() - new Date(report.createdAt).getTime()) / 3600000).toFixed(1))
    );

  const fallbackSectorImg = SECTOR_ILLUSTRATIONS[report.sector] || SECTOR_ILLUSTRATIONS.other;
  const validBeforeImages =
    report.images && report.images.length > 0
      ? report.images.slice(0, MAX_UPLOAD_IMAGES)
      : [fallbackSectorImg];
  const beforePhoto = validBeforeImages[0] || fallbackSectorImg;

  const validResolvedImages =
    report.resolvedImages && report.resolvedImages.length > 0
      ? report.resolvedImages.slice(0, MAX_UPLOAD_IMAGES)
      : [beforePhoto];
  const primaryAfterPhoto = validResolvedImages[0] || beforePhoto;

  const completingDept =
    (report.assignedTeam && report.assignedTeam.trim()) || 'مديرية بلدية باعدرى';
  const resolvedNote = report.statusNotes?.resolved?.trim();
  const completionDetails =
    resolvedNote ||
    (report.officialNote && report.officialNote.trim()) ||
    (report.adminNotes && report.adminNotes.trim()) ||
    `تم إنجاز ومعالجة البلاغ الميداني من قبل ${completingDept} بنجاح.`;

  const locationDisplay = report.street
    ? `${report.neighborhood} — ${report.street}`
    : report.neighborhood;

  return prepareDocumentWithId<OrganizationProject>(
    COLLECTIONS.COMPLETED_WORK,
    {
      id: targetWorkNumericId,
      reportId: String(report.id),
      trackingCode: report.trackingCode,
      title: report.title,
      description: report.description,
      completionNotes: completionDetails,
      category: 'Municipal',
      sector: report.sector,
      neighborhood: locationDisplay,
      status: 'completed',
      progressPercentage: 100,
      startDate: report.createdAt.slice(0, 10),
      expectedCompletionDate: nowIso.slice(0, 10),
      reportedAt: report.createdAt,
      completedAt: nowIso,
      beneficiariesCount: 'أهالي الحي',
      images: [...validResolvedImages, ...validBeforeImages],
      beforeImage: beforePhoto,
      beforeImages: validBeforeImages,
      afterImages: validResolvedImages.length > 0 ? validResolvedImages : [primaryAfterPhoto],
      organizationName: completingDept,
      completedDepartment: completingDept,
      managedByPeople: [completingDept],
      durationText: `${hoursDiff} ساعة`,
      reporterName: report.citizenName,
      reporterPhone: report.citizenPhone,
    },
    targetWorkNumericId
  );
}

/**
 * تنفيذ عملية ذرية (Atomic WriteBatch) في قاعدة بيانات Firestore عند تحديث حالة البلاغ:
 * 1. تحديث البلاغ في reports/{reportId} (الحالة، صور الإنجاز resolvedImages، تفاصيل الإنجاز officialNote، ملاحظات كل حالة statusNotes، الدائرة المنجزة، وقت الاستجابة).
 * 2. إذا كانت الحالة 'resolved' (تم الإنجاز): إضافة أو تحديث البلاغ فوراً في كولكشن CompletedWork/{workId} بوثيقة واحدة فقط مربوطة بـ reportId بدون تكرار.
 * 3. إذا تغيرت الحالة من 'resolved' إلى غيرها أو وُجدت نسخ مكررة: حذف سجلات العمل المنجز المرتبطة بهذا البلاغ من CompletedWork.
 * 4. تحديث عداد البلاغات المنجزة للمواطن في citizens/{citizenId}.
 */
export async function syncReportStatusAndCompletedWorkToFirestore(params: {
  updatedReport: CivicReport;
  completedWorkDoc?: OrganizationProject | null;
  removedCompletedWorkId?: string | null;
  removedCompletedWorkIds?: string[];
  updatedCitizenDoc?: RegisteredCitizen | null;
}): Promise<void> {
  const {
    updatedReport,
    completedWorkDoc,
    removedCompletedWorkId,
    removedCompletedWorkIds,
    updatedCitizenDoc,
  } = params;

  try {
    await runTransaction(db, async (transaction) => {
      const reportRef = doc(db, COLLECTIONS.REPORTS, updatedReport.id);
      const reportSnap = await transaction.get(reportRef);

      const existingData = reportSnap.exists() ? (reportSnap.data() as CivicReport) : null;
      const mergedReport: CivicReport = existingData
        ? {
            ...existingData,
            ...updatedReport,
            ownerUid: existingData.ownerUid || existingData.citizenId || updatedReport.ownerUid || updatedReport.citizenId,
            citizenId: existingData.citizenId || existingData.ownerUid || updatedReport.citizenId || updatedReport.ownerUid,
          }
        : updatedReport;

      // 1. حفظ تحديث البلاغ ذرياً داخل Transaction
      transaction.set(reportRef, mergedReport, { merge: true });

      // 2. إذا تم الإنجاز، حفظ أو تحديث وثيقة العمل المنجز الوحيدة في كولكشن CompletedWork
      if (completedWorkDoc) {
        const workRef = doc(db, COLLECTIONS.COMPLETED_WORK, completedWorkDoc.id);
        transaction.set(workRef, completedWorkDoc, { merge: true });
      }

      // 3. حذف أي وثائق سابقة أو مكررة مرتبطة بالبلاغ من CompletedWork
      const idsToDelete = new Set<string>();
      if (removedCompletedWorkId) idsToDelete.add(removedCompletedWorkId);
      if (Array.isArray(removedCompletedWorkIds)) {
        removedCompletedWorkIds.forEach((id) => {
          if (id && (!completedWorkDoc || id !== completedWorkDoc.id)) {
            idsToDelete.add(id);
          }
        });
      }
      idsToDelete.forEach((workId) => {
        transaction.delete(doc(db, COLLECTIONS.COMPLETED_WORK, workId));
      });

      // 4. تحديث إحصاءات المواطن صاحب البلاغ في كولكشن citizens
      if (updatedCitizenDoc) {
        const citizenRef = doc(db, COLLECTIONS.CITIZENS, updatedCitizenDoc.id);
        transaction.set(citizenRef, updatedCitizenDoc, { merge: true });
      }
    });
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.WRITE,
      completedWorkDoc
        ? `${COLLECTIONS.COMPLETED_WORK}/${completedWorkDoc.id}`
        : `${COLLECTIONS.REPORTS}/${updatedReport.id}`
    );
  }
}

/**
 * قائمة الحقول المسموح للمواطن تعديلها فقط عندما تكون حالة البلاغ New ('pending')
 */
export const CITIZEN_ALLOWED_REPORT_UPDATE_FIELDS = [
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
] as const;

/**
 * حماية التزامن (Concurrency Protection) عند تعديل البلاغ من قبل المواطن:
 * يتحقق داخل Firestore Transaction من أحدث نسخة مخزنة في الخادم:
 * 1. أن المستخدم هو صاحب البلاغ (ownerUid / citizenId).
 * 2. أن الحالة الحالية في قاعدة البيانات ما زالت New ('pending' أو 'new') ولم يتم إرسالها للدائرة.
 * 3. عدم تغيير ownerUid أو citizenId أو status.
 * 4. اقتصار التعديل على الحقول المسموحة للمواطن فقط.
 */
export async function executeCitizenReportEditTransaction(
  reportId: string,
  allowedUpdates: Partial<CivicReport>,
  callerUid?: string | null
): Promise<CivicReport> {
  const reportRef = doc(db, COLLECTIONS.REPORTS, reportId);

  return await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(reportRef);
    if (!snap.exists()) {
      throw new Error('البلاغ غير موجود في قاعدة البيانات.');
    }

    const currentReport = snap.data() as CivicReport;
    const storedStatus = String(currentReport.status || 'pending');

    // منع التعديل إذا لم تعد الحالة New ('pending' / 'new') أو تم إرساله للدائرة
    if (
      (storedStatus !== 'pending' && storedStatus !== 'new') ||
      isReportSentToDepartment(currentReport)
    ) {
      throw new Error(
        'لا يمكن تعديل البلاغ لأن حالته تغيرت وتمت إحالته للدائرة المعنية أو إنجازه.'
      );
    }

    // التحقق من الملكية إذا كان للبلاغ ownerUid مرتبط بحساب مصادق
    const reportOwner = currentReport.ownerUid || currentReport.citizenId;
    if (callerUid && reportOwner && !isPureNumericId(reportOwner) && reportOwner !== callerUid) {
      throw new Error('غير مصرح: لا يمكنك تعديل بلاغ يخص مواطناً آخر.');
    }

    // بناء حزمة الحقول المسموحة فقط دون المساس بحقول الإدارة أو الحالة أو الملكية
    const safePatch: Record<string, any> = {};
    for (const key of CITIZEN_ALLOWED_REPORT_UPDATE_FIELDS) {
      if (allowedUpdates[key] !== undefined) {
        safePatch[key] = sanitizeDatabasePayload(allowedUpdates[key]);
      }
    }

    // ضمان بقاء ownerUid و citizenId و status كما هي تماماً
    safePatch.status = currentReport.status;
    if (currentReport.ownerUid !== undefined) safePatch.ownerUid = currentReport.ownerUid;
    if (currentReport.citizenId !== undefined) safePatch.citizenId = currentReport.citizenId;

    transaction.update(reportRef, safePatch);

    return {
      ...currentReport,
      ...safePatch,
      id: reportId,
    } as CivicReport;
  });
}

/**
 * حماية التزامن (Concurrency Protection) عند حذف البلاغ من قبل المواطن:
 * يتحقق داخل Firestore Transaction من أحدث نسخة مخزنة في الخادم:
 * إذا قامت الإدارة في نفس اللحظة بتحويل البلاغ إلى sent ('in_progress') أو completed ('resolved')،
 * ترفض المعاملة حذف البلاغ فوراً.
 */
export async function executeCitizenReportDeleteTransaction(
  reportId: string,
  callerUid?: string | null,
  isAdminCaller = false
): Promise<void> {
  const reportRef = doc(db, COLLECTIONS.REPORTS, reportId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(reportRef);
    if (!snap.exists()) {
      return;
    }

    const currentReport = snap.data() as CivicReport;
    const storedStatus = String(currentReport.status || 'pending');

    if (!isAdminCaller) {
      // المواطن لا يستطيع الحذف إلا إذا كانت الحالة الحالية New ('pending' / 'new') وغير مرسل للدائرة
      if (
        (storedStatus !== 'pending' && storedStatus !== 'new') ||
        isReportSentToDepartment(currentReport)
      ) {
        throw new Error(
          'لا يمكن حذف البلاغ بعد إرساله للدائرة المعنية أو إنجازه.'
        );
      }

      const reportOwner = currentReport.ownerUid || currentReport.citizenId;
      if (callerUid && reportOwner && !isPureNumericId(reportOwner) && reportOwner !== callerUid) {
        throw new Error('غير مصرح: لا يمكنك حذف بلاغ يخص مواطناً آخر.');
      }
    }

    transaction.delete(reportRef);
  });
}

/**
 * حماية الاستبيانات ومنع الإجابة المكررة عبر Firestore Transaction ومعرّف حتمي فريد:
 * SurveyResponses/{surveyId}_{citizenUid}
 */
export async function executeSurveyResponseTransaction(params: {
  surveyId: string;
  citizenUid: string;
  responseDoc: CitizenSurveyResponse;
  selectedOptionsByQuestionId: Record<string, string>;
}): Promise<void> {
  const { surveyId, citizenUid, responseDoc, selectedOptionsByQuestionId } = params;
  const deterministicResponseId = `${surveyId}_${citizenUid}`;
  const responseRef = doc(db, COLLECTIONS.SURVEY_RESPONSES, deterministicResponseId);
  const surveyRef = doc(db, COLLECTIONS.SURVEYS, surveyId);

  await runTransaction(db, async (transaction) => {
    const existingRespSnap = await transaction.get(responseRef);
    if (existingRespSnap.exists()) {
      throw new Error('لقد قمت بالمشاركة والإجابة على هذا الاستبيان مسبقاً.');
    }

    const surveySnap = await transaction.get(surveyRef);
    if (!surveySnap.exists()) {
      throw new Error('الاستبيان غير موجود.');
    }

    const surveyData = surveySnap.data() as CommunitySurvey;
    if (!surveyData.isPublishedToCitizens && surveyData.status !== 'active' && surveyData.status !== 'published') {
      throw new Error('هذا الاستبيان غير منشور حالياً للمواطنين.');
    }

    const updatedQuestions = (surveyData.questions || []).map((q) => {
      const selectedOptId = selectedOptionsByQuestionId[q.id];
      if (!selectedOptId) return q;
      return {
        ...q,
        options: (q.options || []).map((opt) =>
          opt.id === selectedOptId
            ? { ...opt, votesCount: (opt.votesCount || 0) + 1 }
            : opt
        ),
      };
    });

    const finalResponseDoc: CitizenSurveyResponse = {
      ...responseDoc,
      id: deterministicResponseId,
      surveyId: String(surveyId),
      citizenUid,
      ownerUid: citizenUid,
      completed: true,
      submittedAt: serverTimestamp(),
    };

    transaction.set(responseRef, finalResponseDoc);
    transaction.update(surveyRef, {
      totalResponses: (surveyData.totalResponses || 0) + 1,
      questions: updatedQuestions,
    });
  });
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  _error: unknown,
  _operationType: OperationType,
  _path: string | null
): void {
  throw new Error('حدث خطأ، يرجى المحاولة مرة أخرى.');
}
