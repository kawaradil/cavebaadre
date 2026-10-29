import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDocFromServer,
  writeBatch,
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
  SECTOR_ILLUSTRATIONS,
} from '../types/baadre';
import { sanitizeDatabasePayload } from './inputLimits';

export const app = initializeApp(firebaseConfig);
export const FIREBASE_STORAGE_BUCKET = 'gs://baadre-smarteye.firebasestorage.app';
export const MAX_UPLOAD_IMAGES = 10;

/**
 * تهيئة Firestore مع التخزين المحلي الدائم (Persistent IndexedDB Cache) ودعم تعدد النوافذ
 * مما يجعل الاستعلامات فورية (0ms) ويمنع استهلاك قراءات إضافية للبيانات غير المتغيرة
 * مع تقليل التكلفة واستهلاك الموارد إلى الحد الأدنى.
 */
function initOptimizedFirestore(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
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

export const MAX_IMAGE_SIZE_BYTES = 500 * 1024; // 500 KB

function getDataUrlByteSize(dataUrl: string): number {
  const base64Index = dataUrl.indexOf(',');
  const base64Length = base64Index >= 0 ? dataUrl.length - (base64Index + 1) : dataUrl.length;
  return Math.floor(base64Length * 0.75);
}

/**
 * ضغط الصور المرفوعة تلقائياً بحيث لا يتجاوز حجم الصورة 500 كيلوبايت مع الحفاظ على أبعادها ونسبتها الأصلية (9:16 أو 16:9)
 */
export function compressImageFile(
  file: File,
  maxDimension = 1440,
  initialQuality = 0.82
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

            if (quality > 0.45) {
              quality = Number((quality - 0.12).toFixed(2));
            } else {
              currentWidth = Math.round(currentWidth * 0.82);
              currentHeight = Math.round(currentHeight * 0.82);
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
 * رفع الصورة المضغوطة إلى مخزن صور مشروع فايربيس الرسمي:
 * gs://baadre-smarteye.firebasestorage.app
 * وإرجاع رابط التحميل المباشر (Download URL) لحفظه في وثيقة Firestore.
 */
export async function uploadImageToFirebaseStorage(
  dataUrl: string,
  folder: 'reports' | 'completed_work' | 'projects' = 'reports'
): Promise<string> {
  if (!dataUrl) return '';
  if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
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
      setTimeout(() => reject(new Error('Storage upload timeout')), 10000)
    );

    const downloadUrl = await Promise.race([uploadTaskPromise, timeoutPromise]);
    return downloadUrl || dataUrl;
  } catch {
    // في حال عدم توفر اتصال أو قيود صلاحيات Storage، يتم الاحتفاظ بالصورة المضغوطة كاحتياط فوري
    return dataUrl;
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
  const batch = writeBatch(db);

  // 1. حفظ تحديث البلاغ في كولكشن reports
  batch.set(doc(db, COLLECTIONS.REPORTS, updatedReport.id), updatedReport, { merge: true });

  // 2. إذا تم الإنجاز، حفظ أو تحديث وثيقة العمل المنجز الوحيدة في كولكشن CompletedWork
  if (completedWorkDoc) {
    batch.set(doc(db, COLLECTIONS.COMPLETED_WORK, completedWorkDoc.id), completedWorkDoc, {
      merge: true,
    });
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
    batch.delete(doc(db, COLLECTIONS.COMPLETED_WORK, workId));
  });

  // 4. تحديث إحصاءات المواطن صاحب البلاغ في كولكشن citizens
  if (updatedCitizenDoc) {
    batch.set(doc(db, COLLECTIONS.CITIZENS, updatedCitizenDoc.id), updatedCitizenDoc, {
      merge: true,
    });
  }

  try {
    await batch.commit();
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
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();
