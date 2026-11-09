import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
} from 'firebase/firestore';
import {
  db,
  auth,
  COLLECTIONS,
  generateAutoNumericId,
  isPureNumericId,
  syncNumericCounterWithItems,
  prepareDocumentWithId,
  buildCompletedWorkDocumentFromReport,
  syncReportStatusAndCompletedWorkToFirestore,
  executeCitizenReportEditTransaction,
  executeCitizenReportDeleteTransaction,
  executeSurveyResponseTransaction,
  OperationType,
  handleFirestoreError,
  maskPhoneNumber,
} from '../lib/firebase';
import { useAuth } from './AuthContext';
import {
  triggerNewReportServerNotification,
  subscribeToForegroundReportNotifications,
  showSystemNotificationViaSW,
  requestMobileNotificationPermission,
} from '../services/fcmService';
import {
  CivicReport,
  MunicipalDepartment,
  RegisteredCitizen,
  OrganizationProject,
  ReportSector,
  ReportStatus,
  ReportUrgency,
  AdminSectionTab,
  CitizenNavTab,
  CommunitySurvey,
  CitizenSurveyResponse,
  SurveyAnswerItem,
  SECTOR_ILLUSTRATIONS,
  isReportSentToDepartment,
  isReportUrgencyConfirmed,
  isReportOpened,
} from '../types/baadre';

const STORAGE_MY_REPORT_IDS_KEY = 'cave_baadre_my_report_ids_v3';
const STORAGE_ROLE_KEY = 'cave_baadre_active_role_v3';

// مفاتيح التخزين الدائم لسرعة الفتح الفورية بدون إعادة تحميل البيانات في كل مرة
const CACHE_KEY_REPORTS = 'cave_baadre_persisted_reports_v1';
const CACHE_KEY_PROJECTS = 'cave_baadre_persisted_projects_v1';
const CACHE_KEY_DEPTS = 'cave_baadre_persisted_depts_v1';
const CACHE_KEY_SURVEYS = 'cave_baadre_persisted_surveys_v1';
const CACHE_KEY_CITIZENS = 'cave_baadre_persisted_citizens_v1';
const CACHE_KEY_CONTACT = 'cave_baadre_persisted_contact_v1';


export interface CreateSurveyInput {
  title: string;
  description: string;
  questions: {
    questionText: string;
    options: string[];
  }[];
}

export interface SubmitReportInput {
  title: string;
  description: string;
  sector: ReportSector;
  urgency?: ReportUrgency;
  neighborhood: string;
  street: string;
  landmark: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  images: string[];
  citizenName: string;
  citizenPhone: string;
}

export interface BaadreMetrics {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  emergencyCount: number;
  completionRate: number;
  avgResponseHours: number;
}

const SECTOR_DEFAULT_DEPARTMENT: Record<ReportSector, string> = {
  roads: 'دائرة صيانة الطرق والجسور - باعدرى',
  sewage: 'دائرة شبكات المجاري والصرف الصحي - باعدرى',
  sanitation: 'قسم البيئة والنظافة والحدائق - بلدية باعدرى',
  lighting: 'دائرة توزيع كهرباء وإنارة باعدرى',
  water: 'مديرية ماء ناحية باعدرى',
  other: 'مديرية بلدية باعدرى - قسم الطوارئ والخدمات',
};

export interface CloudContactSettings {
  whatsappReportsNumber: string;
  contactPhone: string;
  contactEmail: string;
}

const DEFAULT_CLOUD_CONTACT_SETTINGS: CloudContactSettings = {
  whatsappReportsNumber: '9647749019911',
  contactPhone: '9647749019911',
  contactEmail: 'info@cavebaadre.org',
};

export interface BaadreContextType {
  // Role & Navigation
  activeRole: 'citizen' | 'admin';
  setActiveRole: (role: 'citizen' | 'admin') => void;
  toggleRole: () => void;
  citizenTab: CitizenNavTab;
  setCitizenTab: (tab: CitizenNavTab) => void;
  adminTab: AdminSectionTab;
  setAdminTab: (tab: AdminSectionTab) => void;
  isSurveysViewOpen: boolean;
  setIsSurveysViewOpen: (open: boolean) => void;
  isStartScreenActive: boolean;
  dismissStartScreen: () => void;

  // Data
  reports: CivicReport[];
  myReports: CivicReport[];
  myReportIds: string[];
  reportsLimitCount: number;
  loadMoreReports: () => void;
  hasMoreReports: boolean;
  departments: MunicipalDepartment[];
  citizens: RegisteredCitizen[];
  projects: OrganizationProject[];
  surveys: CommunitySurvey[];
  surveyResponses: CitizenSurveyResponse[];
  answeredSurveyIds: string[];
  dismissedSurveyIds: string[];
  metrics: BaadreMetrics;
  contactSettings: CloudContactSettings;
  updateContactSettings: (input: CloudContactSettings) => Promise<void>;

  // Filters & Search (Admin use)
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedSector: 'all' | 'ALL' | ReportSector;
  setSelectedSector: (s: 'all' | 'ALL' | ReportSector) => void;
  selectedStatus: 'all' | 'ALL' | ReportStatus;
  setSelectedStatus: (st: 'all' | 'ALL' | ReportStatus) => void;
  selectedNeighborhood: string;
  setSelectedNeighborhood: (n: string) => void;
  filteredReports: CivicReport[];
  resetFilters: () => void;

  // Modals & Active Selections
  selectedReport: CivicReport | null;
  setSelectedReport: (rep: CivicReport | null) => void;
  editingCitizenReport: CivicReport | null;
  setEditingCitizenReport: (rep: CivicReport | null) => void;
  isAddReportOpen: boolean;
  setIsAddReportOpen: (open: boolean) => void;
  isAddProjectOpen: boolean;
  setIsAddProjectOpen: (open: boolean) => void;
  statusUpdateToast: {
    reportId: string;
    trackingCode: string;
    reportTitle: string;
    fromStatus: ReportStatus;
    toStatus: ReportStatus;
    assignedTeam?: string;
    note?: string;
  } | null;
  clearStatusUpdateToast: () => void;
  newAdminReportAlert: CivicReport | null;
  dismissNewAdminReportAlert: () => void;

  // Actions
  submitReport: (input: SubmitReportInput) => CivicReport;
  submitNewReport: (input: SubmitReportInput) => CivicReport;
  updateCitizenReport: (reportId: string, input: SubmitReportInput) => CivicReport | undefined;
  findReportByTrackingCode: (code: string) => CivicReport | undefined;
  claimReportByTrackingCode: (code: string) => CivicReport | undefined;
  updateReportStatus: (
    reportId: string,
    status: ReportStatus,
    adminNotes?: string,
    assignedTeam?: string,
    resolvedImages?: string[],
    customStatusNotes?: Partial<Record<ReportStatus, string>>,
    urgency?: ReportUrgency,
    assignedRecipient?: string
  ) => void;
  revertReportResolution: (reportId: string) => void;
  updateReportUrgency: (reportId: string, urgency: ReportUrgency) => void;
  deleteReport: (reportId: string) => void;
  upvoteReport: (reportId: string) => void;
  addDepartment: (dept: Omit<MunicipalDepartment, 'id'>) => void;
  updateDepartment: (deptId: string, updates: Partial<MunicipalDepartment>) => void;
  deleteDepartment: (deptId: string) => void;
  toggleBlockCitizen: (citizenId: string) => void;
  deleteCitizen: (citizenId: string) => Promise<boolean>;
  addProject: (proj: Omit<OrganizationProject, 'id'>) => void;
  updateDepartmentAvailability: (
    deptId: string,
    availability: 'available' | 'on_mission' | 'standby'
  ) => void;

  // Survey Actions
  createSurvey: (input: CreateSurveyInput) => CommunitySurvey;
  updateSurvey: (surveyId: string, input: CreateSurveyInput) => void;
  togglePublishSurveyToCitizens: (surveyId: string, forceState?: boolean) => void;
  deleteSurvey: (surveyId: string) => void;
  submitSurveyResponse: (
    surveyId: string,
    selectedOptionsByQuestionId: Record<string, string>
  ) => void;
  dismissSurveyPopup: (surveyId: string) => void;
  reopenPublishedSurveysPopup: () => void;
}

const BaadreContext = createContext<BaadreContextType | undefined>(undefined);

export const BaadreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, isSuperAdmin, isCitizen, role, currentUser } = useAuth();
  const canAccessAdmin = Boolean(
    currentUser &&
      !isCitizen &&
      (isAdmin || isSuperAdmin) &&
      (role === 'admin' || role === 'super_admin')
  );
  const [activeRole, setActiveRoleState] = useState<'citizen' | 'admin'>('citizen');

  const [citizenTabState, setCitizenTabState] = useState<CitizenNavTab>('works');
  const [adminTabState, setAdminTabState] = useState<AdminSectionTab>('analytics');
  const [isSurveysViewOpenState, setIsSurveysViewOpenState] = useState<boolean>(false);
  const [isStartScreenActive, setIsStartScreenActive] = useState<boolean>(true);

  const dismissStartScreen = useCallback(() => {
    setIsStartScreenActive(false);
  }, []);

  const setIsSurveysViewOpen = useCallback(
    (open: boolean) => {
      if (open) {
        setIsStartScreenActive(false);
      }
      if (open && (!canAccessAdmin || activeRole !== 'admin')) {
        setIsSurveysViewOpenState(false);
        return;
      }
      setIsSurveysViewOpenState(open);
    },
    [canAccessAdmin, activeRole]
  );

  const isSurveysViewOpen =
    canAccessAdmin && activeRole === 'admin' ? isSurveysViewOpenState : false;

  const setCitizenTab = useCallback((tab: CitizenNavTab) => {
    setIsStartScreenActive(false);
    setCitizenTabState(tab);
    setIsSurveysViewOpenState(false);
  }, []);

  const setAdminTab = useCallback(
    (tab: AdminSectionTab) => {
      setIsStartScreenActive(false);
      if (!canAccessAdmin) {
        setActiveRoleState('citizen');
        setCitizenTabState('works');
        setIsSurveysViewOpenState(false);
        return;
      }
      setAdminTabState(tab);
      setIsSurveysViewOpenState(false);
    },
    [canAccessAdmin]
  );

  const citizenTab = citizenTabState;
  const adminTab = canAccessAdmin ? adminTabState : 'analytics';

  // جميع البيانات تعتمد كلياً على Firestore مع تخزين محلي دائم (Persistent Cache) للتحميل الفوري (0ms)
  const [reports, setReports] = useState<CivicReport[]>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY_REPORTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [reportsLimitCount, setReportsLimitCount] = useState<number>(80);
  const [hasMoreReports, setHasMoreReports] = useState<boolean>(true);

  const loadMoreReports = useCallback(() => {
    setReportsLimitCount((prev) => prev + 40);
  }, []);

  const [departments, setDepartments] = useState<MunicipalDepartment[]>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY_DEPTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [citizens, setCitizens] = useState<RegisteredCitizen[]>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY_CITIZENS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [projects, setProjects] = useState<OrganizationProject[]>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY_PROJECTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [surveys, setSurveys] = useState<CommunitySurvey[]>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY_SURVEYS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [surveyResponses, setSurveyResponses] = useState<CitizenSurveyResponse[]>([]);
  const [contactSettings, setContactSettings] = useState<CloudContactSettings>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY_CONTACT);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.contactEmail) return parsed;
      }
    } catch {}
    return DEFAULT_CLOUD_CONTACT_SETTINGS;
  });

  const [myReportIds, setMyReportIds] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_MY_REPORT_IDS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed.filter((id) => isPureNumericId(id));
      }
    } catch {}
    return [];
  });

  // إنجاز الاستبيانات يعتمد حصرياً على Firestore (SurveyResponses/{surveyId}_{uid}) وليس على متغير محلي
  const [answeredSurveyIds, setAnsweredSurveyIds] = useState<string[]>([]);

  const [dismissedSurveyIds, setDismissedSurveyIds] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<'all' | 'ALL' | ReportSector>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'ALL' | ReportStatus>('ALL');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('all');

  const [selectedReport, setSelectedReportState] = useState<CivicReport | null>(null);

  const [newAdminReportAlert, setNewAdminReportAlert] = useState<CivicReport | null>(null);
  const hasLoadedInitialReportsRef = useRef<boolean>(false);
  const knownReportIdsRef = useRef<Set<string>>(new Set());
  const dismissedNewReportIdsRef = useRef<Set<string>>(
    (() => {
      try {
        const raw = localStorage.getItem('cave_baadre_opened_report_alerts_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return new Set<string>(parsed.map(String));
        }
      } catch {}
      return new Set<string>();
    })()
  );

  const persistDismissedAlertId = useCallback((reportId: string) => {
    dismissedNewReportIdsRef.current.add(String(reportId));
    try {
      localStorage.setItem(
        'cave_baadre_opened_report_alerts_v1',
        JSON.stringify(Array.from(dismissedNewReportIdsRef.current).slice(-300))
      );
    } catch {}
  }, []);

  const setSelectedReport = useCallback(
    (rep: CivicReport | null) => {
      if (!rep) {
        setSelectedReportState(null);
        return;
      }
      // بمجرد فتح البلاغ لأول مرة يُغلق إشعار الجرس الذهبي ولا يظهر مرة أخرى لهذا البلاغ
      persistDismissedAlertId(rep.id);
      setNewAdminReportAlert((curr) => (curr && curr.id === rep.id ? null : curr));

      // فقط الإدارة المصادق عليها (Admin / Super Admin) تسجّل فتح البلاغ الإداري في Firestore
      if (!isReportOpened(rep) && (activeRole === 'admin' || isAdmin || isSuperAdmin)) {
        const now = new Date().toISOString();
        const openedReport: CivicReport = {
          ...rep,
          id: rep.id,
          isOpened: true,
          openedAt: now,
        };
        setReports((prev) => prev.map((r) => (r.id === rep.id ? openedReport : r)));
        setSelectedReportState(openedReport);
        if (auth.currentUser && (isAdmin || isSuperAdmin)) {
          setDoc(
            doc(db, COLLECTIONS.REPORTS, rep.id),
            { id: rep.id, isOpened: true, openedAt: now },
            { merge: true }
          ).catch(() => {});
        }
      } else {
        setSelectedReportState(rep);
      }
    },
    [activeRole, isAdmin, isSuperAdmin, persistDismissedAlertId]
  );
  const [editingCitizenReport, setEditingCitizenReport] = useState<CivicReport | null>(null);
  const [isAddReportOpen, setIsAddReportOpen] = useState(false);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [statusUpdateToast, setStatusUpdateToast] = useState<{
    reportId: string;
    trackingCode: string;
    reportTitle: string;
    fromStatus: ReportStatus;
    toStatus: ReportStatus;
    assignedTeam?: string;
    note?: string;
  } | null>(null);

  const dismissNewAdminReportAlert = useCallback(() => {
    setNewAdminReportAlert((curr) => {
      if (curr) {
        persistDismissedAlertId(curr.id);
        if (!isReportOpened(curr) && auth.currentUser && (isAdmin || isSuperAdmin)) {
          const now = new Date().toISOString();
          setReports((prev) =>
            prev.map((r) => (r.id === curr.id ? { ...r, isOpened: true, openedAt: now } : r))
          );
          setDoc(
            doc(db, COLLECTIONS.REPORTS, curr.id),
            { id: curr.id, isOpened: true, openedAt: now },
            { merge: true }
          ).catch(() => {});
        }
      }
      return null;
    });
  }, [isAdmin, isSuperAdmin, persistDismissedAlertId]);

  const clearStatusUpdateToast = useCallback(() => {
    setStatusUpdateToast(null);
  }, []);

  useEffect(() => {
    if (!statusUpdateToast) return;
    const timer = setTimeout(() => {
      setStatusUpdateToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [statusUpdateToast]);

  // تنظيف أي مفاتيح Mock Data قديمة من المتصفح
  useEffect(() => {
    try {
      const legacyMockKeys = [
        'cave_baadre_reports_v5',
        'cave_baadre_reports_v6',
        'cave_baadre_departments_v3',
        'cave_baadre_departments_v4',
        'cave_baadre_citizens_v3',
        'cave_baadre_citizens_v4',
        'cave_baadre_projects_v4',
        'cave_baadre_completed_work_v1',
        'cave_baadre_surveys_v1',
        'cave_baadre_surveys_v2',
        'cave_baadre_survey_responses_v1',
        'cave_baadre_answered_surveys_v3',
      ];
      legacyMockKeys.forEach((k) => localStorage.removeItem(k));
    } catch {}
  }, []);

  // مزامنة إعدادات الاتصال من الكلاود مع تثبيت رقم الواتساب والهاتف على 9647749019911
  useEffect(() => {
    fetch('/api/settings/contact')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.settings) {
          setContactSettings({
            whatsappReportsNumber: '9647749019911',
            contactPhone: '9647749019911',
            contactEmail:
              String(data.settings.contactEmail || '').trim() ||
              DEFAULT_CLOUD_CONTACT_SETTINGS.contactEmail,
          });
        }
      })
      .catch(() => {});

    const unsubContact = onSnapshot(
      doc(db, 'system_config', 'contact_settings'),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data() as Record<string, any>;
          const updatedContact: CloudContactSettings = {
            whatsappReportsNumber: '9647749019911',
            contactPhone: '9647749019911',
            contactEmail:
              String(d.contactEmail || '').trim() ||
              DEFAULT_CLOUD_CONTACT_SETTINGS.contactEmail,
          };
          setContactSettings((prev) => {
            if (prev.contactEmail === updatedContact.contactEmail) return prev;
            try {
              localStorage.setItem(CACHE_KEY_CONTACT, JSON.stringify(updatedContact));
            } catch {}
            return updatedContact;
          });
        }
      },
      () => {}
    );

    return () => unsubContact();
  }, []);

  const updateContactSettings = useCallback(
    async (input: CloudContactSettings) => {
      if (!canAccessAdmin) {
        throw new Error('غير مصرح: هذه الصلاحية مخصصة لإدارة المنظمة فقط.');
      }
      const fixedNumber = '9647749019911';
      const cleanEmail = String(input.contactEmail || '').trim();

      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        throw new Error('البريد الإلكتروني غير صالح.');
      }

      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const res = await fetch('/api/settings/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          whatsappReportsNumber: fixedNumber,
          contactPhone: fixedNumber,
          contactEmail: cleanEmail,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'فشل حفظ الإعدادات.');
      }

      const nextSettings: CloudContactSettings = {
        whatsappReportsNumber: fixedNumber,
        contactPhone: fixedNumber,
        contactEmail: cleanEmail,
      };

      setContactSettings(nextSettings);

      try {
        await setDoc(
          doc(db, 'system_config', 'contact_settings'),
          {
            id: 'contact_settings',
            ...nextSettings,
            updatedBy: auth.currentUser?.uid || 'admin',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch {}
    },
    [canAccessAdmin]
  );

  /**
   * مزامنة مباشرة وفورية مع Firestore بدون أي بيانات وهمية (Mock Data)
   * مع مراعاة صلاحيات الدور المصادق عليه فعلياً في Firebase (Admin / Super Admin مقابل Citizen)
   */
  useEffect(() => {
    const hasFirestoreAdminAuth = Boolean(currentUser && (isAdmin || isSuperAdmin));

    // 1. البلاغات (reports) مع دعم التصفح التدريجي (Pagination) وتحديد الحجم ديناميكياً
    const reportsQuery = query(
      collection(db, COLLECTIONS.REPORTS),
      orderBy('createdAt', 'desc'),
      limit(reportsLimitCount)
    );
    const unsubReports = onSnapshot(
      reportsQuery,
      (snapshot) => {
        const nonNumericDocs = snapshot.docs.filter((d) => !isPureNumericId(d.id));
        const numericDocs = snapshot.docs.filter((d) => isPureNumericId(d.id));

        if (nonNumericDocs.length > 0 && hasFirestoreAdminAuth) {
          const cleanupBatch = writeBatch(db);
          nonNumericDocs.forEach((d) => cleanupBatch.delete(d.ref));
          cleanupBatch.commit().catch(() => {});
        }

        setHasMoreReports(snapshot.docs.length >= reportsLimitCount);

        const remoteReports = numericDocs.map((d) => {
          const data = d.data() as CivicReport;
          const isOwner = Boolean(
            currentUser?.uid &&
              ((data.ownerUid && data.ownerUid === currentUser.uid) ||
                (data.citizenId && data.citizenId === currentUser.uid))
          );
          // حماية خصوصية المواطنين: إخفاء الهاتف لغير صاحب البلاغ وموظفي البلدية
          const shouldMaskPhone = !hasFirestoreAdminAuth && !isOwner;
          return {
            ...data,
            id: String(d.id),
            citizenPhone: shouldMaskPhone ? maskPhoneNumber(data.citizenPhone) : data.citizenPhone,
            citizenWhatsapp: shouldMaskPhone ? maskPhoneNumber(data.citizenWhatsapp) : data.citizenWhatsapp,
          };
        });
        syncNumericCounterWithItems(COLLECTIONS.REPORTS, remoteReports);

        if (!hasLoadedInitialReportsRef.current) {
          remoteReports.forEach((r) => knownReportIdsRef.current.add(r.id));
          hasLoadedInitialReportsRef.current = true;
          // إذا كان هناك بلاغ جديد غير مفتوح مسبقاً عند فتح التطبيق يظهر جرس التنبيه حتى يُفتح لأول مرة
          const latestUnopened = remoteReports.find(
            (r) =>
              !isReportOpened(r) &&
              !isReportSentToDepartment(r) &&
              r.status === 'pending' &&
              !dismissedNewReportIdsRef.current.has(r.id)
          );
          if (latestUnopened) {
            setNewAdminReportAlert(latestUnopened);
          }
        } else {
          const newlyArrivedUnsent = remoteReports.find(
            (r) =>
              !knownReportIdsRef.current.has(r.id) &&
              !isReportOpened(r) &&
              !isReportSentToDepartment(r) &&
              !dismissedNewReportIdsRef.current.has(r.id)
          );
          remoteReports.forEach((r) => knownReportIdsRef.current.add(r.id));
          if (newlyArrivedUnsent) {
            setNewAdminReportAlert(newlyArrivedUnsent);
            if (hasFirestoreAdminAuth) {
              showSystemNotificationViaSW(
                `🔔 بلاغ جديد وارد (${newlyArrivedUnsent.trackingCode})`,
                `${newlyArrivedUnsent.title} • ${newlyArrivedUnsent.neighborhood}`,
                {
                  reportId: newlyArrivedUnsent.id,
                  trackingCode: newlyArrivedUnsent.trackingCode,
                  url: `/?reportId=${encodeURIComponent(newlyArrivedUnsent.id)}`,
                }
              ).catch(() => {});
            }
          }
        }

        setNewAdminReportAlert((curr) => {
          if (!curr) return null;
          const match = remoteReports.find((r) => r.id === curr.id);
          if (
            !match ||
            isReportOpened(match) ||
            isReportSentToDepartment(match) ||
            dismissedNewReportIdsRef.current.has(match.id)
          ) {
            return null;
          }
          return match;
        });

        setReports(remoteReports);
        try {
          localStorage.setItem(CACHE_KEY_REPORTS, JSON.stringify(remoteReports.slice(0, 100)));
        } catch {}

        // تحديث البلاغ النشط فورياً إذا كان مفتوحاً في شاشة التفاصيل ليرى المستخدم التعديل وتغيير الحالة لحظياً
        setSelectedReportState((curr) => {
          if (!curr) return null;
          const fresh = remoteReports.find((r) => r.id === curr.id);
          return fresh ? fresh : curr;
        });
      },
      () => {
        // Fallback if restricted by security rules for unauthenticated/citizen list
      }
    );

    // 2. الأعمال المنجزة المنشورة (CompletedWork) مع منع تكرار أي بلاغ منجز
    const completedWorkQuery = query(collection(db, COLLECTIONS.COMPLETED_WORK), limit(100));
    const unsubCompletedWork = onSnapshot(
      completedWorkQuery,
      (snapshot) => {
        const nonNumericDocs = snapshot.docs.filter((d) => !isPureNumericId(d.id));
        const numericDocs = snapshot.docs.filter((d) => isPureNumericId(d.id));

        const seenReportKeys = new Set<string>();
        const duplicateDocs: typeof numericDocs = [];
        const uniqueRemoteWorks: OrganizationProject[] = [];

        for (const d of numericDocs) {
          const data = d.data() as OrganizationProject;
          const workItem: OrganizationProject = { ...data, id: String(d.id) };
          const reportKey = workItem.reportId
            ? `rep:${String(workItem.reportId)}`
            : workItem.trackingCode
            ? `code:${workItem.trackingCode}`
            : null;

          if (reportKey) {
            if (seenReportKeys.has(reportKey)) {
              duplicateDocs.push(d);
              continue;
            }
            seenReportKeys.add(reportKey);
          }

          uniqueRemoteWorks.push(workItem);
        }

        if ((nonNumericDocs.length > 0 || duplicateDocs.length > 0) && hasFirestoreAdminAuth) {
          const cleanupBatch = writeBatch(db);
          nonNumericDocs.forEach((d) => cleanupBatch.delete(d.ref));
          duplicateDocs.forEach((d) => cleanupBatch.delete(d.ref));
          cleanupBatch.commit().catch(() => {});
        }

        syncNumericCounterWithItems(COLLECTIONS.COMPLETED_WORK, uniqueRemoteWorks);
        setProjects(uniqueRemoteWorks);
        try {
          localStorage.setItem(CACHE_KEY_PROJECTS, JSON.stringify(uniqueRemoteWorks.slice(0, 100)));
        } catch {}
      },
      () => {}
    );

    // 3. الاستبيانات المجتمعية (surveys) — للمسجلين فقط (المواطن يقرأ المنشور فقط، والأدمن يقرأ الكل)
    let unsubSurveys = () => {};
    if (currentUser?.uid) {
      const surveysQuery = hasFirestoreAdminAuth
        ? query(
            collection(db, COLLECTIONS.SURVEYS),
            orderBy('createdAt', 'desc'),
            limit(50)
          )
        : query(
            collection(db, COLLECTIONS.SURVEYS),
            where('isPublishedToCitizens', '==', true),
            limit(50)
          );
      unsubSurveys = onSnapshot(
        surveysQuery,
        (snapshot) => {
          const numericDocs = snapshot.docs.filter((d) => isPureNumericId(d.id));
          const remoteSurveys = numericDocs
            .map((d) => {
              const data = d.data() as CommunitySurvey;
              return { ...data, id: String(d.id) };
            })
            .sort(
              (a, b) =>
                new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
          syncNumericCounterWithItems(COLLECTIONS.SURVEYS, remoteSurveys);
          // للمواطنين المسجلين فقط يظهر الاستبيان المنشور والنشط فقط
          const targetSurveys = hasFirestoreAdminAuth
            ? remoteSurveys
            : remoteSurveys.filter(
                (s) => Boolean(s.isPublishedToCitizens && s.status !== 'closed')
              );
          setSurveys(targetSurveys);
          try {
            if (hasFirestoreAdminAuth) {
              localStorage.setItem(CACHE_KEY_SURVEYS, JSON.stringify(targetSurveys));
            } else {
              localStorage.removeItem(CACHE_KEY_SURVEYS);
            }
          } catch {}
        },
        () => {}
      );
    } else {
      setSurveys([]);
      try {
        localStorage.removeItem(CACHE_KEY_SURVEYS);
      } catch {}
    }

    // 4. أقسام الإدارة فقط (departments, citizens + users, SurveyResponses)
    let unsubDepts = () => {};
    let unsubCitizens = () => {};
    let unsubUsers = () => {};
    let unsubResponses = () => {};

    if (hasFirestoreAdminAuth) {
      const deptsQuery = query(collection(db, COLLECTIONS.DEPARTMENTS), limit(50));
      unsubDepts = onSnapshot(
        deptsQuery,
        (snapshot) => {
          const numericDocs = snapshot.docs.filter((d) => isPureNumericId(d.id));
          const remoteDepts = numericDocs.map((d) => {
            const data = d.data() as MunicipalDepartment;
            return { ...data, id: String(d.id) };
          });
          syncNumericCounterWithItems(COLLECTIONS.DEPARTMENTS, remoteDepts);
          setDepartments(remoteDepts);
          try {
            localStorage.setItem(CACHE_KEY_DEPTS, JSON.stringify(remoteDepts));
          } catch {}
        },
        () => {}
      );

      let latestCitizensDocs: Array<{ id: string; data: Record<string, any> }> = [];
      let latestUsersDocs: Array<{ id: string; data: Record<string, any> }> = [];

      const rebuildMergedCitizens = () => {
        const mergedMap = new Map<string, RegisteredCitizen>();

        for (const { id, data } of latestCitizensDocs) {
          const cleanEmail = String(data.email || '').trim().toLowerCase();
          // تجاهل أي بيانات مواطن مؤقت بدون حساب رسمي أو بمعرف رقمي مؤقت
          if (isPureNumericId(id) || !cleanEmail.includes('@')) {
            continue;
          }
          const isDesig = cleanEmail === '11kattak11@gmail.com';
          mergedMap.set(id, {
            id,
            name: isDesig ? 'كاوار عادل طاهر' : data.name || data.fullName || 'مواطن مسجل',
            email: data.email || '',
            phone: data.phone || '',
            birthDate: data.birthDate || '',
            neighborhood: data.neighborhood || 'ناحية باعدرى',
            role: isDesig ? 'super_admin' : data.role || 'citizen',
            reportsSubmittedCount: Number(data.reportsSubmittedCount || 0),
            resolvedReportsCount: Number(data.resolvedReportsCount || 0),
            joinedAt: data.joinedAt || data.createdAt || new Date().toISOString(),
            lastActiveAt: data.lastActiveAt || data.updatedAt,
            avatar: data.avatar,
            verified: data.verified !== false,
            isBlocked: Boolean(data.isBlocked),
          });
        }

        for (const { id, data } of latestUsersDocs) {
          const existing = mergedMap.get(id);
          const cleanEmail = String(data.email || existing?.email || '').trim().toLowerCase();
          if (isPureNumericId(id) || !cleanEmail.includes('@')) {
            continue;
          }
          const isDesig = cleanEmail === '11kattak11@gmail.com';
          mergedMap.set(id, {
            id,
            name: isDesig
              ? 'كاوار عادل طاهر'
              : data.fullName || data.name || existing?.name || 'مواطن مسجل',
            email: data.email || existing?.email || '',
            phone: data.phone || existing?.phone || '',
            birthDate: data.birthDate || existing?.birthDate || '',
            neighborhood: data.neighborhood || existing?.neighborhood || 'ناحية باعدرى',
            role: isDesig ? 'super_admin' : data.role || existing?.role || 'citizen',
            reportsSubmittedCount: Math.max(
              Number(data.reportsSubmittedCount || 0),
              Number(existing?.reportsSubmittedCount || 0)
            ),
            resolvedReportsCount: Math.max(
              Number(data.resolvedReportsCount || 0),
              Number(existing?.resolvedReportsCount || 0)
            ),
            joinedAt:
              data.createdAt || data.joinedAt || existing?.joinedAt || new Date().toISOString(),
            lastActiveAt: data.updatedAt || existing?.lastActiveAt,
            avatar: existing?.avatar,
            verified: true,
            isBlocked: Boolean(data.isBlocked ?? existing?.isBlocked ?? false),
          });
        }

        const list = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.joinedAt || 0).getTime() - new Date(a.joinedAt || 0).getTime()
        );
        setCitizens(list);
        try {
          localStorage.setItem(CACHE_KEY_CITIZENS, JSON.stringify(list.slice(0, 100)));
        } catch {}
      };

      const citizensQuery = query(collection(db, COLLECTIONS.CITIZENS), limit(100));
      unsubCitizens = onSnapshot(
        citizensQuery,
        (snapshot) => {
          // حذف بيانات المواطنين المؤقتين تلقائياً من قاعدة البيانات
          const tempDocs = snapshot.docs.filter((d) => {
            const dData = d.data() as Record<string, any>;
            const emailStr = String(dData.email || '').trim();
            return isPureNumericId(d.id) || !emailStr.includes('@');
          });
          if (tempDocs.length > 0 && hasFirestoreAdminAuth) {
            const cleanupBatch = writeBatch(db);
            tempDocs.forEach((d) => cleanupBatch.delete(d.ref));
            cleanupBatch.commit().catch(() => {});
          }

          latestCitizensDocs = snapshot.docs
            .filter((d) => {
              const dData = d.data() as Record<string, any>;
              const emailStr = String(dData.email || '').trim();
              return !isPureNumericId(d.id) && emailStr.includes('@');
            })
            .map((d) => ({
              id: String(d.id),
              data: d.data() as Record<string, any>,
            }));
          rebuildMergedCitizens();
        },
        () => {}
      );

      const usersQuery = query(collection(db, 'users'), limit(100));
      unsubUsers = onSnapshot(
        usersQuery,
        (snapshot) => {
          latestUsersDocs = snapshot.docs
            .filter((d) => {
              const dData = d.data() as Record<string, any>;
              const emailStr = String(dData.email || '').trim();
              return !isPureNumericId(d.id) && emailStr.includes('@');
            })
            .map((d) => ({
              id: String(d.id),
              data: d.data() as Record<string, any>,
            }));
          rebuildMergedCitizens();
        },
        () => {}
      );

      const responsesQuery = query(
        collection(db, COLLECTIONS.SURVEY_RESPONSES),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      unsubResponses = onSnapshot(
        responsesQuery,
        (snapshot) => {
          const remoteResponses = snapshot.docs.map((d) => {
            const data = d.data() as CitizenSurveyResponse;
            return { ...data, id: String(d.id) };
          });
          syncNumericCounterWithItems(COLLECTIONS.SURVEY_RESPONSES, remoteResponses);
          setSurveyResponses(remoteResponses);
        },
        () => {}
      );
    } else {
      // حماية بيانات المواطنين والدوائر من حساب المواطن والزائرين
      setDepartments([]);
      setCitizens([]);
      setSurveyResponses([]);
      try {
        localStorage.removeItem(CACHE_KEY_DEPTS);
        localStorage.removeItem(CACHE_KEY_CITIZENS);
        localStorage.removeItem('cave_baadre_persisted_registered_users_v1');
      } catch {}
    }

    return () => {
      unsubReports();
      unsubCompletedWork();
      unsubSurveys();
      unsubDepts();
      unsubCitizens();
      unsubUsers();
      unsubResponses();
    };
  }, [isAdmin, isSuperAdmin, activeRole, currentUser?.uid, reportsLimitCount]);

  /**
   * تنظيف تلقائي: إذا تغيرت حالة بلاغ في reports إلى غير 'resolved' (مثل قيد المعالجة أو مرفوض)،
   * يتم التأكد من إزالته من CompletedWork حتى لا يبقى عمل غير منجز في قسم الأعمال المنجزة.
   * (عملية الإضافة والتحديث تتم ذرياً عبر updateReportStatus لمنع أي تكرار).
   */
  useEffect(() => {
    const hasFirestoreAdminAuth = Boolean(currentUser && (isAdmin || isSuperAdmin));
    if (!hasFirestoreAdminAuth || reports.length === 0 || projects.length === 0) return;

    const nonResolvedWorks = projects.filter((p) => {
      if (!p.reportId && !p.trackingCode) return false;
      const linkedReport = reports.find(
        (r) =>
          (p.reportId && String(r.id) === String(p.reportId)) ||
          (p.trackingCode && r.trackingCode === p.trackingCode)
      );
      return linkedReport && linkedReport.status !== 'resolved';
    });

    if (nonResolvedWorks.length === 0) return;

    const removeIds = new Set(nonResolvedWorks.map((w) => w.id));
    setProjects((prev) => prev.filter((p) => !removeIds.has(p.id)));

    const batch = writeBatch(db);
    nonResolvedWorks.forEach((w) => {
      batch.delete(doc(db, COLLECTIONS.COMPLETED_WORK, w.id));
    });
    batch.commit().catch(() => {});
  }, [reports, projects, isAdmin, isSuperAdmin, activeRole, currentUser?.uid]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MY_REPORT_IDS_KEY, JSON.stringify(myReportIds));
    } catch {}
  }, [myReportIds]);

  /**
   * مزامنة حالة إكمال الاستبيانات مباشرة من Firestore (SurveyResponses/{surveyId}_{uid}):
   * - لا نعتمد على أي متغير محلي لتحديد إنجاز الاستبيان.
   * - إذا حدّث المواطن الصفحة، أو سجل الخروج ثم دخل مرة ثانية، أو استخدم جهازاً آخر،
   *   يبقى الاستبيان المكتمل مخفياً وممنوعاً من الإجابة مرة ثانية.
   */
  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid || surveys.length === 0) {
      if (!uid) {
        setAnsweredSurveyIds([]);
      }
      return;
    }

    const completedSet = new Set<string>();
    const unsubs = surveys.map((survey) => {
      const deterministicResponseId = `${survey.id}_${uid}`;
      const responseRef = doc(db, COLLECTIONS.SURVEY_RESPONSES, deterministicResponseId);
      return onSnapshot(
        responseRef,
        (snap) => {
          if (snap.exists()) {
            completedSet.add(survey.id);
          } else {
            completedSet.delete(survey.id);
          }
          setAnsweredSurveyIds(Array.from(completedSet));
        },
        () => {}
      );
    });

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [surveys, currentUser?.uid]);

  /**
   * معالجة الضغط على إشعار البلاغ الجديد (FCM Notification Click / ?reportId=):
   * - يتحقق أولاً من صلاحية المستخدم (Admin أو Super Admin).
   * - يفتح صفحة تفاصيل البلاغ داخل واجهة إدارة المنظمة.
   */
  const openReportDetailsForVerifiedAdmin = useCallback(
    async (targetReportId: string, trackingCode?: string) => {
      // التحقق الإلزامي من الصلاحية قبل عرض التفاصيل الإدارية
      if (!isAdmin && !isSuperAdmin) {
        return;
      }

      const cleanId = String(targetReportId || '').trim();
      if (!cleanId) return;

      setActiveRoleState('admin');
      setIsSurveysViewOpen(false);

      const existing = reports.find(
        (r) => String(r.id) === cleanId || (trackingCode && r.trackingCode === trackingCode)
      );
      if (existing) {
        setSelectedReport(existing);
        return;
      }

      try {
        const snap = await getDoc(doc(db, COLLECTIONS.REPORTS, cleanId));
        if (snap.exists()) {
          const data = snap.data() as CivicReport;
          setSelectedReport({ ...data, id: String(snap.id) });
        }
      } catch {}
    },
    [isAdmin, isSuperAdmin, reports, setSelectedReport]
  );

  // الاستماع لإشعارات FCM أثناء فتح التطبيق ولرسائل النقر من Service Worker والرابط ?reportId=
  useEffect(() => {
    if (!isAdmin && !isSuperAdmin) return;

    // 1. فحص الرابط عند فتح التطبيق عبر النقر على إشعار الخلفية (?reportId=...)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlReportId = params.get('reportId');
      if (urlReportId) {
        openReportDetailsForVerifiedAdmin(urlReportId);
        // تنظيف الرابط دون إعادة تحميل الصفحة
        try {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        } catch {}
      }
    }

    // 2. الاشتراك في رسائل Service Worker وإشعارات الواجهة الأمامية
    const unsubscribeFcm = subscribeToForegroundReportNotifications({
      onNotificationClickOpenReport: (reportId, trackingCode) => {
        openReportDetailsForVerifiedAdmin(reportId, trackingCode);
      },
      onForegroundReportNotification: (payload) => {
        const match = reports.find((r) => String(r.id) === String(payload.reportId));
        if (match && !isReportSentToDepartment(match)) {
          setNewAdminReportAlert(match);
        }
        showSystemNotificationViaSW(
          `🔔 بلاغ جديد (${payload.trackingCode})`,
          `${payload.title} • ${payload.sectorLabelAr}`,
          {
            reportId: payload.reportId,
            trackingCode: payload.trackingCode,
            url: payload.clickUrl,
          }
        ).catch(() => {});
      },
    });

    return () => {
      unsubscribeFcm();
    };
  }, [isAdmin, isSuperAdmin, openReportDetailsForVerifiedAdmin, reports]);

  // طلب صلاحية إشعارات الهاتف عند أول تفاعل للمستخدم داخل التطبيق المثبت (لأن متصفحات الموبايل تشترط نقرة مباشرة)
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'default') return;

    const handleFirstUserGesture = () => {
      requestMobileNotificationPermission().catch(() => {});
      window.removeEventListener('click', handleFirstUserGesture);
    };

    window.addEventListener('click', handleFirstUserGesture, { once: true });
    return () => {
      window.removeEventListener('click', handleFirstUserGesture);
    };
  }, []);

  const myReports = useMemo(() => {
    if (!currentUser) return [];
    const currentEffectiveRole: 'citizen' | 'admin' | 'super_admin' = isSuperAdmin
      ? 'super_admin'
      : isAdmin
      ? 'admin'
      : 'citizen';

    return reports.filter((r) => {
      const isOwnedByCurrentUser =
        r.ownerUid === currentUser.uid || r.citizenId === currentUser.uid;
      if (!isOwnedByCurrentUser) return false;
      if (r.creatorRole) {
        return r.creatorRole === currentEffectiveRole;
      }
      return true;
    });
  }, [reports, currentUser, isSuperAdmin, isAdmin]);

  // عند فتح التطبيق من قبل الإدارة يُفتح على قسم الإحصاءات، وإذا تم التحويل للمواطن يُفتح على قسم الأعمال/البلاغات المنجزة
  useEffect(() => {
    if (activeRole === 'admin') {
      setAdminTabState('analytics');
      setIsSurveysViewOpenState(false);
    } else {
      setCitizenTabState('works');
      setIsSurveysViewOpenState(false);
    }
  }, []);

  // تفعيل واجهة الإدارة تلقائياً عند تسجيل دخول السوبر أدمن أو الأدمن، وإغلاقها فوراً لأي مواطن أو زائر
  useEffect(() => {
    if (currentUser && (isSuperAdmin || isAdmin)) {
      setActiveRoleState('admin');
      try {
        localStorage.setItem(STORAGE_ROLE_KEY, 'admin');
      } catch {}
    } else {
      setActiveRoleState('citizen');
      setIsSurveysViewOpenState(false);
      if (!currentUser) {
        setCitizenTabState('works');
      }
      try {
        localStorage.setItem(STORAGE_ROLE_KEY, 'citizen');
      } catch {}
    }
  }, [isSuperAdmin, isAdmin, currentUser]);

  const setActiveRole = useCallback(
    (role: 'citizen' | 'admin') => {
      setIsStartScreenActive(false);
      if (role === 'admin' && !canAccessAdmin) {
        setActiveRoleState('citizen');
        setCitizenTabState('works');
        setIsSurveysViewOpenState(false);
        return;
      }
      setActiveRoleState(role);
      if (role === 'admin') {
        setAdminTabState('analytics');
        setIsSurveysViewOpenState(false);
      } else if (role === 'citizen') {
        setCitizenTabState('works');
        setIsSurveysViewOpenState(false);
      }
      try {
        localStorage.setItem(STORAGE_ROLE_KEY, role);
      } catch {}
    },
    [canAccessAdmin]
  );

  const toggleRole = useCallback(() => {
    setIsStartScreenActive(false);
    if (!canAccessAdmin) {
      setActiveRoleState('citizen');
      setCitizenTabState('works');
      setIsSurveysViewOpenState(false);
      return;
    }
    setActiveRoleState((prev) => {
      const next = prev === 'citizen' ? 'admin' : 'citizen';
      if (next === 'admin') {
        setAdminTabState('analytics');
        setIsSurveysViewOpenState(false);
      } else {
        setCitizenTabState('works');
        setIsSurveysViewOpenState(false);
      }
      try {
        localStorage.setItem(STORAGE_ROLE_KEY, next);
      } catch {}
      return next;
    });
  }, [canAccessAdmin]);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedSector('ALL');
    setSelectedStatus('ALL');
    setSelectedNeighborhood('all');
  }, []);

  const metrics: BaadreMetrics = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter((r) => r.status === 'pending').length;
    const inProgress = reports.filter((r) => r.status === 'in_progress').length;
    const resolved = reports.filter((r) => r.status === 'resolved').length;
    const rejected = reports.filter((r) => r.status === 'rejected').length;
    const emergencyCount = reports.filter(
      (r) => isReportUrgencyConfirmed(r) && r.urgency === 'emergency'
    ).length;
    const completionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const resolvedWithHours = reports.filter((r) => r.responseTimeHours !== undefined);
    const avgResponseHours =
      resolvedWithHours.length > 0
        ? Number(
            (
              resolvedWithHours.reduce((acc, r) => acc + (r.responseTimeHours || 0), 0) /
              resolvedWithHours.length
            ).toFixed(1)
          )
        : 0;

    return {
      total,
      pending,
      inProgress,
      resolved,
      rejected,
      emergencyCount,
      completionRate,
      avgResponseHours,
    };
  }, [reports]);

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reports.filter((r) => {
      if (selectedSector !== 'all' && selectedSector !== 'ALL' && r.sector !== selectedSector) {
        return false;
      }
      if (selectedStatus !== 'all' && selectedStatus !== 'ALL' && r.status !== selectedStatus) {
        return false;
      }
      if (
        selectedNeighborhood !== 'all' &&
        selectedNeighborhood !== 'الكل' &&
        r.neighborhood !== selectedNeighborhood
      ) {
        return false;
      }

      if (q) {
        const matchesCode = r.trackingCode.toLowerCase().includes(q);
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesDesc = r.description.toLowerCase().includes(q);
        const matchesNeighborhood = r.neighborhood.toLowerCase().includes(q);
        const matchesCitizen =
          r.citizenName.toLowerCase().includes(q) || r.citizenPhone.includes(q);
        if (
          !matchesCode &&
          !matchesTitle &&
          !matchesDesc &&
          !matchesNeighborhood &&
          !matchesCitizen
        ) {
          return false;
        }
      }
      return true;
    });
  }, [reports, searchQuery, selectedSector, selectedStatus, selectedNeighborhood]);

  /**
   * إضافة بلاغ جديد مع توليد رقم أوتوماتيكي (id) للبلاغ فقط، وعدم إنشاء مواطنين مؤقتين
   */
  const submitReport = useCallback(
    (input: SubmitReportInput): CivicReport => {
      if (!auth.currentUser?.uid) {
        throw new Error('يرجى تسجيل الدخول.');
      }
      const resolvedOwnerUid = auth.currentUser.uid;

      if (!isAdmin && !isSuperAdmin) {
        const todayStr = new Date().toDateString();
        const todayCitizenReportsCount = reports.filter((r) => {
          if (r.ownerUid !== resolvedOwnerUid && r.citizenId !== resolvedOwnerUid) return false;
          if (!r.createdAt) return false;
          const reportDate = new Date(r.createdAt);
          return !Number.isNaN(reportDate.getTime()) && reportDate.toDateString() === todayStr;
        }).length;
        if (todayCitizenReportsCount >= 3) {
          throw new Error('الحد الأقصى اليومي 3 بلاغات لكل مواطن.');
        }
      }

      const reportNumericId = generateAutoNumericId(COLLECTIONS.REPORTS, reports);
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const trackingCode = `BDR-2026-${randomNum}`;
      const now = new Date().toISOString();
      const nonBase64Images = (input.images || []).filter((img) => !img.startsWith('data:'));
      const validImages =
        nonBase64Images.length > 0
          ? nonBase64Images.slice(0, 10)
          : [SECTOR_ILLUSTRATIONS[input.sector] || SECTOR_ILLUSTRATIONS.other];
      const latVal = input.latitude ?? input.lat ?? 36.7186;
      const lngVal = input.longitude ?? input.lng ?? 43.2614;
      const targetDepartment =
        SECTOR_DEFAULT_DEPARTMENT[input.sector] || 'مديرية بلدية باعدرى - الدائرة الخدمية المعنية';

      const newReport = prepareDocumentWithId<CivicReport>(
        COLLECTIONS.REPORTS,
        {
          id: reportNumericId,
          trackingCode,
          title: input.title.trim().slice(0, 300),
          description: input.description.trim().slice(0, 5000),
          sector: input.sector,
          status: 'pending',
          urgency: input.urgency || 'normal',
          neighborhood: input.neighborhood.slice(0, 200),
          street: (input.street.trim() || input.neighborhood).slice(0, 300),
          landmark: input.landmark.trim().slice(0, 300),
          lat: latVal,
          lng: lngVal,
          latitude: latVal,
          longitude: lngVal,
          images: validImages,
          citizenId: resolvedOwnerUid,
          ownerUid: resolvedOwnerUid,
          creatorRole: isSuperAdmin ? 'super_admin' : isAdmin ? 'admin' : 'citizen',
          citizenName: (input.citizenName.trim() || 'مواطن من باعدرى').slice(0, 200),
          citizenPhone: (input.citizenPhone.trim() || '07500000000').slice(0, 40),
          citizenWhatsapp: (input.citizenPhone.trim() || '07500000000').slice(0, 40),
          createdAt: now,
          updatedAt: now,
          assignedTeam: targetDepartment.slice(0, 300),
          adminNotes: '',
          officialNote: '',
          isUrgencySet: false,
          urgencySetAt: '',
          isOpened: false,
          openedAt: '',
          upvotesCount: 1,
          upvotes: 1,
          viewsCount: 1,
        },
        reportNumericId
      );

      knownReportIdsRef.current.add(newReport.id);
      setReports((prev) => [newReport, ...prev]);
      if (auth.currentUser) {
        setMyReportIds((prev) => [newReport.id, ...prev.filter((id) => id !== newReport.id)]);
      }
      setNewAdminReportAlert(newReport);

      setDoc(doc(db, COLLECTIONS.REPORTS, newReport.id), newReport)
        .then(() => {
          triggerNewReportServerNotification(newReport.id).catch(() => {});
        })
        .catch((err) => {
          try {
            handleFirestoreError(err, OperationType.CREATE, `${COLLECTIONS.REPORTS}/${newReport.id}`);
          } catch {}
        });

      if (auth.currentUser?.uid && auth.currentUser?.email) {
        const authUid = auth.currentUser.uid;
        const nextSubmittedCount =
          reports.filter((r) => r.ownerUid === authUid || r.citizenId === authUid).length + 1;
        setDoc(
          doc(db, COLLECTIONS.CITIZENS, authUid),
          {
            id: authUid,
            email: auth.currentUser.email,
            reportsSubmittedCount: nextSubmittedCount,
            lastActiveAt: now,
          },
          { merge: true }
        ).catch(() => {});
        setDoc(
          doc(db, 'users', authUid),
          {
            uid: authUid,
            reportsSubmittedCount: nextSubmittedCount,
            updatedAt: now,
          },
          { merge: true }
        ).catch(() => {});
      }

      return newReport;
    },
    [reports, citizens, isAdmin, isSuperAdmin]
  );

  /**
   * تعديل بيانات البلاغ من قِبل المواطن المسؤول عن البلاغ وحفظها عبر Firestore Transaction:
   * - يتحقق من أن الحالة الحالية في قاعدة البيانات هي New ('pending') ولم يتم إرسالها للدائرة.
   * - يتحقق من أن المستخدم هو صاحب البلاغ (ownerUid / citizenId).
   * - يمنع تعديل ownerUid أو status أو أي حقل إداري.
   */
  const updateCitizenReport = useCallback(
    (reportId: string, input: SubmitReportInput): CivicReport | undefined => {
      const targetReport =
        reports.find((r) => r.id === reportId) ||
        (selectedReport && selectedReport.id === reportId ? selectedReport : undefined) ||
        (editingCitizenReport && editingCitizenReport.id === reportId
          ? editingCitizenReport
          : undefined);

      if (!targetReport) return undefined;

      // لا أحد يستطيع تعديل البلاغ إلا الشخص الذي تم تسجيل البلاغ بواسطته حصراً
      const callerUid = auth.currentUser?.uid || currentUser?.uid;
      if (!callerUid) return undefined;
      const isReportCreator =
        targetReport.ownerUid === callerUid || targetReport.citizenId === callerUid;
      if (!isReportCreator) {
        return undefined;
      }

      // حماية فورية على مستوى العميل قبل بدء المعاملة: لا تعديل إذا لم تكن الحالة New ('pending') أو تم إرسالها للدائرة
      if (targetReport.status !== 'pending' || isReportSentToDepartment(targetReport)) {
        return undefined;
      }

      const now = new Date().toISOString();
      const nonBase64Images = (input.images || []).filter((img) => !img.startsWith('data:'));
      const validImages =
        nonBase64Images.length > 0
          ? nonBase64Images.slice(0, 10)
          : targetReport.images.filter((img) => !img.startsWith('data:'));
      const latVal = input.latitude ?? input.lat ?? targetReport.latitude;
      const lngVal = input.longitude ?? input.lng ?? targetReport.longitude;

      const allowedUpdates: Partial<CivicReport> = {
        title: input.title.trim().slice(0, 300),
        description: input.description.trim().slice(0, 5000),
        sector: input.sector,
        neighborhood: input.neighborhood.slice(0, 200),
        street: (input.street.trim() || input.neighborhood).slice(0, 300),
        landmark: input.landmark.trim().slice(0, 300),
        lat: latVal,
        lng: lngVal,
        latitude: latVal,
        longitude: lngVal,
        images: validImages,
        citizenName: (input.citizenName.trim() || targetReport.citizenName).slice(0, 200),
        citizenPhone: (input.citizenPhone.trim() || targetReport.citizenPhone).slice(0, 40),
        citizenWhatsapp: (input.citizenPhone.trim() || targetReport.citizenPhone).slice(0, 40),
        updatedAt: now,
      };

      const updatedReport = prepareDocumentWithId<CivicReport>(
        COLLECTIONS.REPORTS,
        {
          ...targetReport,
          ...allowedUpdates,
          id: targetReport.id,
          status: 'pending',
          ownerUid: targetReport.ownerUid || targetReport.citizenId,
          citizenId: targetReport.citizenId || targetReport.ownerUid,
        },
        targetReport.id
      );

      setReports((prev) => {
        const next = prev.map((r) => (r.id === reportId ? updatedReport : r));
        try {
          localStorage.setItem(CACHE_KEY_REPORTS, JSON.stringify(next.slice(0, 100)));
        } catch {}
        return next;
      });
      setSelectedReportState(updatedReport);
      setNewAdminReportAlert((curr) => (curr && curr.id === reportId ? updatedReport : curr));

      // تنفيذ التعديل داخل Firestore Transaction لضمان عدم حدوث Race Condition مع إرسال الإدارة
      executeCitizenReportEditTransaction(
        updatedReport.id,
        allowedUpdates,
        auth.currentUser?.uid
      ).catch((err) => {
        // التراجع عن التعديل المحلي إذا فشلت المعاملة بسبب تغيير الإدارة لحالة البلاغ في نفس اللحظة
        setReports((prev) => prev.map((r) => (r.id === reportId ? targetReport : r)));
        setSelectedReportState((curr) => (curr && curr.id === reportId ? targetReport : curr));
        try {
          handleFirestoreError(
            err,
            OperationType.UPDATE,
            `${COLLECTIONS.REPORTS}/${updatedReport.id}`
          );
        } catch {}
      });

      return updatedReport;
    },
    [reports, selectedReport, editingCitizenReport]
  );

  const findReportByTrackingCode = useCallback(
    (code: string): CivicReport | undefined => {
      const normalized = code.trim().toUpperCase();
      return reports.find((r) => r.trackingCode.toUpperCase() === normalized);
    },
    [reports]
  );

  const claimReportByTrackingCode = useCallback(
    (code: string): CivicReport | undefined => {
      const found = findReportByTrackingCode(code);
      if (found) {
        setMyReportIds((prev) => (prev.includes(found.id) ? prev : [found.id, ...prev]));
      }
      return found;
    },
    [findReportByTrackingCode]
  );

  /**
   * تحديث حالة البلاغ ونقل البلاغات المنجزة مع صور الإنجاز وتفاصيل الإنجاز
   * مباشرة إلى قسم الأعمال المنجزة وكولكشن CompletedWork في قاعدة بيانات Firestore
   * مع ضمان عدم تكرار البلاغ نهائياً عند الحفظ المتكرر أو تغيير الحالة والعودة إلى تم الإنجاز.
   */
  const updateReportStatus = useCallback(
    (
      reportId: string,
      status: ReportStatus,
      adminNotes?: string,
      assignedTeam?: string,
      resolvedImages?: string[],
      customStatusNotes?: Partial<Record<ReportStatus, string>>,
      urgency?: ReportUrgency,
      assignedRecipient?: string
    ) => {
      const now = new Date().toISOString();
      const targetReport =
        reports.find((r) => r.id === reportId) ||
        (selectedReport && selectedReport.id === reportId ? selectedReport : undefined);

      if (!targetReport) return;

      const previousStatus = targetReport.status;
      const wasAlreadyResolved = previousStatus === 'resolved';
      const hoursDiff = Math.max(
        1,
        Number(((Date.now() - new Date(targetReport.createdAt).getTime()) / 3600000).toFixed(1))
      );

      const mergedStatusNotes: Partial<Record<ReportStatus, string>> = {
        ...(targetReport.statusNotes || {}),
        ...(customStatusNotes || {}),
      };

      const noteVal =
        adminNotes !== undefined
          ? adminNotes.trim()
          : mergedStatusNotes[status] !== undefined
          ? (mergedStatusNotes[status] || '').trim()
          : targetReport.officialNote || targetReport.adminNotes || '';

      mergedStatusNotes[status] = noteVal;

      const mergedStatusTimestamps: Partial<Record<ReportStatus, string>> = {
        ...(targetReport.statusTimestamps || {}),
        [status]: now,
      };

      // إذا تم الإنجاز، نحذف حالة وسجل المرفوض تماماً
      if (status === 'resolved') {
        mergedStatusNotes.rejected = '';
        mergedStatusTimestamps.rejected = '';
      }

      // تراكم أسماء المستلمين عند تعديل الإرسال وإرساله إلى شخص آخر في الدائرة
      const existingRecipientsList: string[] =
        Array.isArray(targetReport.assignedRecipients) &&
        targetReport.assignedRecipients.length > 0
          ? [...targetReport.assignedRecipients]
          : targetReport.assignedRecipient
          ? targetReport.assignedRecipient
              .split(' ، ثم: ')
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

      if (status === 'in_progress' && assignedRecipient && assignedRecipient.trim()) {
        const cleanRec = assignedRecipient.trim();
        if (!existingRecipientsList.includes(cleanRec)) {
          existingRecipientsList.push(cleanRec);
        }
      }

      const combinedRecipientsText =
        existingRecipientsList.length > 0
          ? existingRecipientsList.join(' ، ثم: ')
          : assignedRecipient !== undefined
          ? assignedRecipient
          : targetReport.assignedRecipient || '';

      const finalTeam =
        assignedTeam !== undefined && assignedTeam.trim()
          ? assignedTeam.trim()
          : targetReport.assignedTeam ||
            SECTOR_DEFAULT_DEPARTMENT[targetReport.sector] ||
            'مديرية بلدية باعدرى';
      const cleanResolved = (resolvedImages || []).filter((img) => !img.startsWith('data:'));
      const finalResolvedImgs =
        cleanResolved.length > 0
          ? cleanResolved
          : targetReport.resolvedImages && targetReport.resolvedImages.length > 0
          ? targetReport.resolvedImages.filter((img) => !img.startsWith('data:'))
          : status === 'resolved'
          ? targetReport.images && targetReport.images.length > 0
            ? targetReport.images.filter((img) => !img.startsWith('data:')).slice(0, 1)
            : [SECTOR_ILLUSTRATIONS[targetReport.sector] || SECTOR_ILLUSTRATIONS.other]
          : targetReport.resolvedImages;

      // البحث عن أي سجل عمل منجز مرتبط بهذا البلاغ مسبقاً لمنع إنشاء سجل مكرر
      const matchingWorks = projects.filter(
        (p) =>
          (targetReport.completedWorkId && String(p.id) === String(targetReport.completedWorkId)) ||
          (p.reportId && String(p.reportId) === String(targetReport.id)) ||
          (p.trackingCode && p.trackingCode === targetReport.trackingCode)
      );

      const deterministicWorkId =
        matchingWorks.length > 0
          ? matchingWorks[0].id
          : targetReport.completedWorkId && isPureNumericId(targetReport.completedWorkId)
          ? String(targetReport.completedWorkId)
          : status === 'resolved'
          ? generateAutoNumericId(COLLECTIONS.COMPLETED_WORK, projects)
          : targetReport.completedWorkId;

      const updatedReport = prepareDocumentWithId<CivicReport>(
        COLLECTIONS.REPORTS,
        {
          ...targetReport,
          id: targetReport.id,
          status,
          urgency: urgency || targetReport.urgency || 'normal',
          isUrgencySet: true,
          urgencySetAt: targetReport.urgencySetAt || now,
          updatedAt: now,
          resolvedAt: status === 'resolved' ? now : targetReport.resolvedAt,
          responseTimeHours:
            status === 'resolved'
              ? targetReport.responseTimeHours || hoursDiff
              : targetReport.responseTimeHours,
          adminNotes: noteVal,
          officialNote: noteVal,
          statusNotes: mergedStatusNotes,
          statusTimestamps: mergedStatusTimestamps,
          completedWorkId: deterministicWorkId,
          assignedTeam: finalTeam,
          assignedRecipient: combinedRecipientsText,
          assignedRecipients: existingRecipientsList,
          resolvedImages: finalResolvedImgs,
        },
        targetReport.id
      );

      // 1. تحديث البلاغات في الواجهة
      // 1. تحديث البلاغات في الواجهة فورياً وحفظ الكاش
      setReports((prev) => {
        const next = prev.map((r) => (r.id === reportId ? updatedReport : r));
        try {
          localStorage.setItem(CACHE_KEY_REPORTS, JSON.stringify(next.slice(0, 100)));
        } catch {}
        return next;
      });

      // 2. تحديث البلاغ المحدد في نافذة التفاصيل فورياً
      setSelectedReportState(updatedReport);

      // إذا تم إرسال البلاغ أو معالجته، نخفيه فوراً من تنبيه البلاغ الجديد
      if (isReportSentToDepartment(updatedReport)) {
        dismissedNewReportIdsRef.current.add(reportId);
        setNewAdminReportAlert((curr) => (curr && curr.id === reportId ? null : curr));
      }

      // إظهار إشعار تحديث الحالة من [الحالة السابقة] إلى [الحالة الجديدة]
      setStatusUpdateToast({
        reportId: updatedReport.id,
        trackingCode: updatedReport.trackingCode,
        reportTitle: updatedReport.title,
        fromStatus: previousStatus,
        toStatus: status,
        assignedTeam: finalTeam,
        note: noteVal,
      });

      // 3. تجهيز سجل العمل المنجز في CompletedWork عند جعل الحالة تم الإنجاز (resolved)
      let completedWorkDoc: OrganizationProject | null = null;
      const removedCompletedWorkIds: string[] = [];

      if (status === 'resolved' && deterministicWorkId) {
        completedWorkDoc = buildCompletedWorkDocumentFromReport(
          updatedReport,
          deterministicWorkId
        );

        // إذا كانت هناك أي نسخ مكررة قديمة لنفس البلاغ نحذفها فوراً ونبقي وثيقة واحدة فقط
        matchingWorks.forEach((w) => {
          if (w.id !== deterministicWorkId) {
            removedCompletedWorkIds.push(w.id);
          }
        });

        setProjects((prevProjs) => {
          const withoutCurrentReport = prevProjs.filter(
            (p) =>
              p.id !== completedWorkDoc!.id &&
              (!p.reportId || String(p.reportId) !== String(updatedReport.id)) &&
              (!p.trackingCode || p.trackingCode !== updatedReport.trackingCode)
          );
          const next = [completedWorkDoc!, ...withoutCurrentReport];
          try {
            localStorage.setItem(CACHE_KEY_PROJECTS, JSON.stringify(next.slice(0, 100)));
          } catch {}
          return next;
        });
      } else {
        // إذا تغيرت الحالة إلى حالة أخرى غير تم الإنجاز، يتم إزالة سجل العمل المنجز المرتبط بهذا البلاغ
        matchingWorks.forEach((w) => removedCompletedWorkIds.push(w.id));
        if (
          targetReport.completedWorkId &&
          !removedCompletedWorkIds.includes(targetReport.completedWorkId)
        ) {
          removedCompletedWorkIds.push(targetReport.completedWorkId);
        }

        if (removedCompletedWorkIds.length > 0) {
          setProjects((prevProjs) => {
            const next = prevProjs.filter(
              (p) =>
                !removedCompletedWorkIds.includes(p.id) &&
                (!p.reportId || String(p.reportId) !== String(targetReport.id)) &&
                (!p.trackingCode || p.trackingCode !== targetReport.trackingCode)
            );
            try {
              localStorage.setItem(CACHE_KEY_PROJECTS, JSON.stringify(next.slice(0, 100)));
            } catch {}
            return next;
          });
        }
      }

      // 4. تحديث عداد البلاغات المنجزة للمواطن صاحب البلاغ
      let updatedCitizenDoc: RegisteredCitizen | null = null;
      if (status === 'resolved' && !wasAlreadyResolved) {
        const targetCitizen = citizens.find(
          (c) =>
            (targetReport.citizenId && c.id === targetReport.citizenId) ||
            c.phone.replace(/\D/g, '') === (targetReport.citizenPhone || '').replace(/\D/g, '')
        );
        if (targetCitizen) {
          updatedCitizenDoc = prepareDocumentWithId<RegisteredCitizen>(
            COLLECTIONS.CITIZENS,
            {
              ...targetCitizen,
              id: targetCitizen.id,
              resolvedReportsCount: (targetCitizen.resolvedReportsCount || 0) + 1,
              lastActiveAt: now,
            },
            targetCitizen.id
          );
          setCitizens((prev) =>
            prev.map((c) => (c.id === updatedCitizenDoc!.id ? updatedCitizenDoc! : c))
          );
        }
      }

      // 5. حفظ التغييرات ذرياً في قاعدة بيانات Firestore (reports + CompletedWork + citizens)
      syncReportStatusAndCompletedWorkToFirestore({
        updatedReport,
        completedWorkDoc,
        removedCompletedWorkIds,
        updatedCitizenDoc,
      }).catch(() => {});
    },
    [reports, projects, citizens, selectedReport]
  );

  /**
   * إلغاء حالة "تم الإنجاز" (زر "لم يتم الإنجاز" في حال تم التحديد بالخطأ)
   */
  const revertReportResolution = useCallback(
    (reportId: string) => {
      const now = new Date().toISOString();
      const targetReport =
        reports.find((r) => r.id === reportId) ||
        (selectedReport && selectedReport.id === reportId ? selectedReport : undefined);

      if (!targetReport) return;

      const nextStatusNotes: Partial<Record<ReportStatus, string>> = {
        ...(targetReport.statusNotes || {}),
        resolved: '',
      };

      const nextStatusTimestamps: Partial<Record<ReportStatus, string>> = {
        ...(targetReport.statusTimestamps || {}),
        resolved: '',
      };

      const fallbackStatus: ReportStatus =
        nextStatusTimestamps.in_progress || nextStatusNotes.in_progress
          ? 'in_progress'
          : 'pending';

      const fallbackNote =
        fallbackStatus === 'in_progress' ? nextStatusNotes.in_progress || '' : '';

      const matchingWorks = projects.filter(
        (p) =>
          (targetReport.completedWorkId && String(p.id) === String(targetReport.completedWorkId)) ||
          (p.reportId && String(p.reportId) === String(targetReport.id)) ||
          (p.trackingCode && p.trackingCode === targetReport.trackingCode)
      );

      const removedCompletedWorkIds: string[] = matchingWorks.map((w) => w.id);
      if (
        targetReport.completedWorkId &&
        !removedCompletedWorkIds.includes(targetReport.completedWorkId)
      ) {
        removedCompletedWorkIds.push(targetReport.completedWorkId);
      }

      const updatedReport = prepareDocumentWithId<CivicReport>(
        COLLECTIONS.REPORTS,
        {
          ...targetReport,
          id: targetReport.id,
          status: fallbackStatus,
          updatedAt: now,
          resolvedAt: '',
          completedWorkId: '',
          adminNotes: fallbackNote,
          officialNote: fallbackNote,
          statusNotes: nextStatusNotes,
          statusTimestamps: nextStatusTimestamps,
          resolvedImages: [],
        },
        targetReport.id
      );

      setReports((prev) => {
        const next = prev.map((r) => (r.id === reportId ? updatedReport : r));
        try {
          localStorage.setItem(CACHE_KEY_REPORTS, JSON.stringify(next.slice(0, 100)));
        } catch {}
        return next;
      });
      setSelectedReportState(updatedReport);

      if (removedCompletedWorkIds.length > 0) {
        setProjects((prevProjs) => {
          const next = prevProjs.filter(
            (p) =>
              !removedCompletedWorkIds.includes(p.id) &&
              (!p.reportId || String(p.reportId) !== String(targetReport.id)) &&
              (!p.trackingCode || p.trackingCode !== targetReport.trackingCode)
          );
          try {
            localStorage.setItem(CACHE_KEY_PROJECTS, JSON.stringify(next.slice(0, 100)));
          } catch {}
          return next;
        });
      }

      syncReportStatusAndCompletedWorkToFirestore({
        updatedReport,
        completedWorkDoc: null,
        removedCompletedWorkIds,
        updatedCitizenDoc: null,
      }).catch(() => {});
    },
    [reports, projects, selectedReport]
  );

  const updateReportUrgency = useCallback(
    (reportId: string, urgency: ReportUrgency) => {
      const now = new Date().toISOString();
      const targetReport =
        reports.find((r) => r.id === reportId) ||
        (selectedReport && selectedReport.id === reportId ? selectedReport : undefined);

      if (!targetReport) return;

      const updatedReport = prepareDocumentWithId<CivicReport>(
        COLLECTIONS.REPORTS,
        {
          ...targetReport,
          id: targetReport.id,
          urgency,
          isUrgencySet: true,
          urgencySetAt: now,
          updatedAt: now,
        },
        targetReport.id
      );

      setReports((prev) => {
        const next = prev.map((r) => (r.id === reportId ? updatedReport : r));
        try {
          localStorage.setItem(CACHE_KEY_REPORTS, JSON.stringify(next.slice(0, 100)));
        } catch {}
        return next;
      });
      setSelectedReportState(updatedReport);

      setDoc(doc(db, COLLECTIONS.REPORTS, updatedReport.id), updatedReport, { merge: true }).catch(
        (err) => {
          try {
            handleFirestoreError(
              err,
              OperationType.UPDATE,
              `${COLLECTIONS.REPORTS}/${updatedReport.id}`
            );
          } catch {}
        }
      );
    },
    [reports, selectedReport]
  );

  const deleteReport = useCallback(
    (reportId: string) => {
      const targetReport = reports.find((r) => r.id === reportId);
      const hasAdminPrivileges = isAdmin || isSuperAdmin || activeRole === 'admin';

      // حماية المواطن: لا يمكن للمواطن حذف البلاغ إذا لم تكن حالته New ('pending') أو تم إرساله للدائرة
      if (
        !hasAdminPrivileges &&
        targetReport &&
        (targetReport.status !== 'pending' || isReportSentToDepartment(targetReport))
      ) {
        return;
      }

      const linkedWorks = projects.filter(
        (p) =>
          (p.reportId && String(p.reportId) === String(reportId)) ||
          (targetReport?.completedWorkId && String(p.id) === String(targetReport.completedWorkId)) ||
          (targetReport?.trackingCode && p.trackingCode === targetReport.trackingCode)
      );
      setReports((prev) => {
        const next = prev.filter((r) => r.id !== reportId);
        try {
          localStorage.setItem(CACHE_KEY_REPORTS, JSON.stringify(next.slice(0, 100)));
        } catch {}
        return next;
      });
      setMyReportIds((prev) => prev.filter((id) => id !== reportId));
      setSelectedReportState((curr) => (curr?.id === reportId ? null : curr));
      setNewAdminReportAlert((curr) => (curr?.id === reportId ? null : curr));
      if (linkedWorks.length > 0 && hasAdminPrivileges) {
        const linkedIds = new Set(linkedWorks.map((w) => w.id));
        setProjects((prev) => {
          const next = prev.filter((p) => !linkedIds.has(p.id));
          try {
            localStorage.setItem(CACHE_KEY_PROJECTS, JSON.stringify(next.slice(0, 100)));
          } catch {}
          return next;
        });
      }

      // تنفيذ الحذف عبر Firestore Transaction لضمان عدم حدوث تعارض (Concurrency) إذا أرسلت الإدارة البلاغ في نفس اللحظة
      executeCitizenReportDeleteTransaction(
        reportId,
        auth.currentUser?.uid,
        hasAdminPrivileges
      )
        .then(() => {
          if (hasAdminPrivileges && (linkedWorks.length > 0 || targetReport?.completedWorkId)) {
            const batch = writeBatch(db);
            linkedWorks.forEach((w) => {
              batch.delete(doc(db, COLLECTIONS.COMPLETED_WORK, w.id));
            });
            if (targetReport?.completedWorkId) {
              batch.delete(doc(db, COLLECTIONS.COMPLETED_WORK, targetReport.completedWorkId));
            }
            batch.commit().catch(() => {});
          }
        })
        .catch((err) => {
          // إعادة البلاغ للواجهة إذا رفضت المعاملة الحذف بسبب تغير الحالة على الخادم
          if (targetReport) {
            setReports((prev) => [targetReport, ...prev.filter((r) => r.id !== reportId)]);
          }
          try {
            handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.REPORTS}/${reportId}`);
          } catch {}
        });
    },
    [projects, reports, isAdmin, isSuperAdmin, activeRole]
  );

  const upvoteReport = useCallback((reportId: string) => {
    setReports((prev) =>
      prev.map((r) => {
        if (r.id !== reportId) return r;
        const nextCount = (r.upvotes ?? r.upvotesCount ?? 0) + 1;
        const now = new Date().toISOString();
        const updated = {
          ...r,
          id: r.id,
          upvotesCount: nextCount,
          upvotes: nextCount,
          updatedAt: now,
        };
        setDoc(
          doc(db, COLLECTIONS.REPORTS, r.id),
          { id: r.id, upvotesCount: nextCount, upvotes: nextCount, updatedAt: now },
          { merge: true }
        ).catch((err) => {
          try {
            handleFirestoreError(err, OperationType.UPDATE, `${COLLECTIONS.REPORTS}/${r.id}`);
          } catch {}
        });
        return updated;
      })
    );
    setSelectedReportState((curr) => {
      if (!curr || curr.id !== reportId) return curr;
      const nextCount = (curr.upvotes ?? curr.upvotesCount ?? 0) + 1;
      return { ...curr, upvotesCount: nextCount, upvotes: nextCount };
    });
  }, []);

  const addDepartment = useCallback(
    (dept: Omit<MunicipalDepartment, 'id'>) => {
      if (!canAccessAdmin) return;
      const numericId = generateAutoNumericId(COLLECTIONS.DEPARTMENTS, departments);
      const newDept = prepareDocumentWithId<MunicipalDepartment>(
        COLLECTIONS.DEPARTMENTS,
        {
          ...dept,
          id: numericId,
        },
        numericId
      );
      setDepartments((prev) => {
        const next = [newDept, ...prev];
        try {
          localStorage.setItem(CACHE_KEY_DEPTS, JSON.stringify(next));
        } catch {}
        return next;
      });
      setDoc(doc(db, COLLECTIONS.DEPARTMENTS, newDept.id), newDept).catch((err) => {
        try {
          handleFirestoreError(
            err,
            OperationType.CREATE,
            `${COLLECTIONS.DEPARTMENTS}/${newDept.id}`
          );
        } catch {}
      });
    },
    [departments, canAccessAdmin]
  );

  const updateDepartment = useCallback(
    (deptId: string, updates: Partial<MunicipalDepartment>) => {
      if (!canAccessAdmin) return;
      setDepartments((prev) => {
        const next = prev.map((d) => (d.id === deptId ? { ...d, ...updates, id: d.id } : d));
        try {
          localStorage.setItem(CACHE_KEY_DEPTS, JSON.stringify(next));
        } catch {}
        return next;
      });
      setDoc(
        doc(db, COLLECTIONS.DEPARTMENTS, deptId),
        { ...updates, id: deptId },
        { merge: true }
      ).catch((err) => {
        try {
          handleFirestoreError(
            err,
            OperationType.UPDATE,
            `${COLLECTIONS.DEPARTMENTS}/${deptId}`
          );
        } catch {}
      });
    },
    [canAccessAdmin]
  );

  const deleteDepartment = useCallback(
    (deptId: string) => {
      if (!canAccessAdmin) return;
      setDepartments((prev) => {
        const next = prev.filter((d) => d.id !== deptId);
        try {
          localStorage.setItem(CACHE_KEY_DEPTS, JSON.stringify(next));
        } catch {}
        return next;
      });
      deleteDoc(doc(db, COLLECTIONS.DEPARTMENTS, deptId)).catch((err) => {
        try {
          handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.DEPARTMENTS}/${deptId}`);
        } catch {}
      });
    },
    [canAccessAdmin]
  );

  const toggleBlockCitizen = useCallback(
    (citizenId: string) => {
      if (!canAccessAdmin) return;
      let targetNextBlocked: boolean | undefined;
      setCitizens((prev) =>
        prev.map((c) => {
          if (c.id !== citizenId) return c;
          if (c.role === 'super_admin') return c;
          const nextBlocked = !c.isBlocked;
          targetNextBlocked = nextBlocked;
          return { ...c, id: c.id, isBlocked: nextBlocked };
        })
      );

      if (targetNextBlocked === undefined) return;
      const finalBlocked = targetNextBlocked;

      (async () => {
        try {
          const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
          const res = await fetch('/api/admin/toggle-block', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ targetUid: citizenId, isBlocked: finalBlocked }),
          });
          if (!res.ok) {
            // Revert optimistic state if backend rejected
            setCitizens((prev) =>
              prev.map((c) => (c.id === citizenId ? { ...c, isBlocked: !finalBlocked } : c))
            );
            return;
          }
        } catch {}

        setDoc(
          doc(db, COLLECTIONS.CITIZENS, citizenId),
          { id: citizenId, isBlocked: finalBlocked },
          { merge: true }
        ).catch(() => {});
        setDoc(
          doc(db, 'users', citizenId),
          { isBlocked: finalBlocked, updatedAt: new Date().toISOString() },
          { merge: true }
        ).catch(() => {});
      })();
    },
    [canAccessAdmin]
  );

  const deleteCitizen = useCallback(
    async (citizenId: string): Promise<boolean> => {
      if (!canAccessAdmin || !citizenId) return false;
      const cleanId = citizenId.trim();
      if (auth.currentUser?.uid === cleanId) return false;

      const targetCit = citizens.find((c) => c.id === cleanId);
      const targetEmail = String(targetCit?.email || '').trim().toLowerCase();

      setCitizens((prev) =>
        prev.filter(
          (c) =>
            c.id !== cleanId &&
            (!targetEmail || String(c.email || '').trim().toLowerCase() !== targetEmail)
        )
      );

      // حذف مباشر ودقيق من قاعدتي المواطنين (citizens) والمستخدمين (users) في فايرستور
      const firestoreDeletions: Promise<any>[] = [
        deleteDoc(doc(db, COLLECTIONS.CITIZENS, cleanId)).catch(() => {}),
        deleteDoc(doc(db, 'users', cleanId)).catch(() => {}),
        deleteDoc(doc(db, 'admins', cleanId)).catch(() => {}),
      ];

      if (targetEmail) {
        firestoreDeletions.push(
          getDocs(query(collection(db, COLLECTIONS.CITIZENS), where('email', '==', targetEmail)))
            .then((snap) => Promise.all(snap.docs.map((d) => deleteDoc(d.ref).catch(() => {}))))
            .catch(() => {}),
          getDocs(query(collection(db, 'users'), where('email', '==', targetEmail)))
            .then((snap) => Promise.all(snap.docs.map((d) => deleteDoc(d.ref).catch(() => {}))))
            .catch(() => {})
        );
      }

      await Promise.all(firestoreDeletions);

      try {
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
        await fetch('/api/admin/delete-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ targetUid: cleanId, targetEmail }),
        });
      } catch {}

      return true;
    },
    [canAccessAdmin, citizens]
  );

  const addProject = useCallback(
    (proj: Omit<OrganizationProject, 'id'>) => {
      if (!canAccessAdmin) return;
      const numericId = generateAutoNumericId(COLLECTIONS.COMPLETED_WORK, projects);
      const newProj = prepareDocumentWithId<OrganizationProject>(
        COLLECTIONS.COMPLETED_WORK,
        {
          ...proj,
          id: numericId,
        },
        numericId
      );
      setProjects((prev) => [newProj, ...prev]);
      setDoc(doc(db, COLLECTIONS.COMPLETED_WORK, newProj.id), newProj).catch((err) => {
        try {
          handleFirestoreError(
            err,
            OperationType.CREATE,
            `${COLLECTIONS.COMPLETED_WORK}/${newProj.id}`
          );
        } catch {}
      });
    },
    [projects, canAccessAdmin]
  );

  const updateDepartmentAvailability = useCallback(
    (deptId: string, availability: 'available' | 'on_mission' | 'standby') => {
      if (!canAccessAdmin) return;
      setDepartments((prev) =>
        prev.map((d) => {
          if (d.id !== deptId) return d;
          const updated = { ...d, id: d.id, availability };
          setDoc(
            doc(db, COLLECTIONS.DEPARTMENTS, d.id),
            { id: d.id, availability },
            { merge: true }
          ).catch((err) => {
            try {
              handleFirestoreError(
                err,
                OperationType.UPDATE,
                `${COLLECTIONS.DEPARTMENTS}/${d.id}`
              );
            } catch {}
          });
          return updated;
        })
      );
    },
    [canAccessAdmin]
  );

  const createSurvey = useCallback(
    (input: CreateSurveyInput): CommunitySurvey => {
      const numericId = generateAutoNumericId(COLLECTIONS.SURVEYS, surveys);
      const now = new Date().toISOString();
      const newSurvey = prepareDocumentWithId<CommunitySurvey>(
        COLLECTIONS.SURVEYS,
        {
          id: numericId,
          title: input.title.trim().slice(0, 300),
          description: input.description.trim().slice(0, 2000),
          createdAt: now,
          isPublishedToCitizens: false,
          status: 'draft',
          totalResponses: 0,
          questions: input.questions.map((q, qIdx) => ({
            id: String(qIdx + 1),
            questionText: q.questionText.trim(),
            options: q.options
              .map((o) => o.trim())
              .filter(Boolean)
              .map((optText, oIdx) => ({
                id: String(oIdx + 1),
                text: optText,
                votesCount: 0,
              })),
          })),
        },
        numericId
      );
      if (!canAccessAdmin) {
        return newSurvey;
      }
      setSurveys((prev) => [newSurvey, ...prev]);
      setDoc(doc(db, COLLECTIONS.SURVEYS, newSurvey.id), newSurvey).catch((err) => {
        try {
          handleFirestoreError(err, OperationType.CREATE, `${COLLECTIONS.SURVEYS}/${newSurvey.id}`);
        } catch {}
      });
      return newSurvey;
    },
    [surveys, canAccessAdmin]
  );

  const updateSurvey = useCallback(
    (surveyId: string, input: CreateSurveyInput) => {
      if (!canAccessAdmin) return;
      setSurveys((prev) =>
        prev.map((s) => {
          if (s.id !== surveyId) return s;
          const updated = prepareDocumentWithId<CommunitySurvey>(
            COLLECTIONS.SURVEYS,
            {
              ...s,
              id: s.id,
              title: input.title.trim().slice(0, 300),
              description: input.description.trim().slice(0, 2000),
              questions: input.questions.map((q, qIdx) => {
                const existingQ = s.questions[qIdx];
                return {
                  id: existingQ && isPureNumericId(existingQ.id) ? existingQ.id : String(qIdx + 1),
                  questionText: q.questionText.trim(),
                  options: q.options
                    .map((o) => o.trim())
                    .filter(Boolean)
                    .map((optText, oIdx) => {
                      const existingOpt = existingQ?.options[oIdx];
                      return {
                        id:
                          existingOpt && isPureNumericId(existingOpt.id)
                            ? existingOpt.id
                            : String(oIdx + 1),
                        text: optText,
                        votesCount: existingOpt ? existingOpt.votesCount : 0,
                      };
                    }),
                };
              }),
            },
            s.id
          );
          setDoc(doc(db, COLLECTIONS.SURVEYS, updated.id), updated, { merge: true }).catch((err) => {
            try {
              handleFirestoreError(
                err,
                OperationType.UPDATE,
                `${COLLECTIONS.SURVEYS}/${updated.id}`
              );
            } catch {}
          });
          return updated;
        })
      );
    },
    [canAccessAdmin]
  );

  const togglePublishSurveyToCitizens = useCallback(
    (surveyId: string, forceState?: boolean) => {
      if (!canAccessAdmin) return;
      setSurveys((prev) =>
        prev.map((s) => {
          if (s.id !== surveyId) return s;
          const nextPublished =
            forceState !== undefined ? forceState : !s.isPublishedToCitizens;
          const nextStatus = nextPublished ? 'active' : 'closed';
          if (nextPublished) {
            setDismissedSurveyIds((ids) => ids.filter((id) => id !== surveyId));
          }
          const updated: CommunitySurvey = {
            ...s,
            id: s.id,
            isPublishedToCitizens: nextPublished,
            status: nextStatus,
          };
          setDoc(
            doc(db, COLLECTIONS.SURVEYS, s.id),
            { id: s.id, isPublishedToCitizens: nextPublished, status: nextStatus },
            { merge: true }
          ).catch((err) => {
            try {
              handleFirestoreError(err, OperationType.UPDATE, `${COLLECTIONS.SURVEYS}/${s.id}`);
            } catch {}
          });
          return updated;
        })
      );
    },
    [canAccessAdmin]
  );

  const deleteSurvey = useCallback(
    (surveyId: string) => {
      if (!canAccessAdmin) return;
      setSurveys((prev) => {
        const next = prev.filter((s) => s.id !== surveyId);
        try {
          localStorage.setItem(CACHE_KEY_SURVEYS, JSON.stringify(next));
        } catch {}
        return next;
      });
      deleteDoc(doc(db, COLLECTIONS.SURVEYS, surveyId)).catch((err) => {
        try {
          handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.SURVEYS}/${surveyId}`);
        } catch {}
      });
    },
    [canAccessAdmin]
  );

  /**
   * إرسال إجابة المواطن على الاستبيان مرة واحدة فقط لكل استبيان:
   * - يستخدم معرّف حتمي فريد `${surveyId}_${citizenUid}` لمنع التكرار على مستوى Firestore Rules
   * - ينفذ العملية داخل Firestore Transaction للتحقق من عدم وجود مشاركة سابقة وتحديث العداد ذرياً
   */
  const submitSurveyResponse = useCallback(
    (surveyId: string, selectedOptionsByQuestionId: Record<string, string>) => {
      // منع الإرسال المتكرر محلياً إذا أجاب المستخدم مسبقاً
      if (answeredSurveyIds.includes(surveyId)) {
        return;
      }

      const targetSurvey = surveys.find((s) => s.id === surveyId);
      const citizenUid =
        auth.currentUser?.uid ||
        (() => {
          const anonKey = 'cave_baadre_device_citizen_uid';
          try {
            let saved = localStorage.getItem(anonKey);
            if (!saved) {
              saved = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
              localStorage.setItem(anonKey, saved);
            }
            return saved;
          } catch {
            return `anon_${Date.now()}`;
          }
        })();

      const deterministicId = `${surveyId}_${citizenUid}`;
      const now = new Date().toISOString();

      const detailedAnswers: SurveyAnswerItem[] = targetSurvey
        ? targetSurvey.questions
            .map((q) => {
              const chosenOptId = selectedOptionsByQuestionId[q.id];
              const chosenOpt = q.options.find((o) => o.id === chosenOptId);
              if (!chosenOptId) return null;
              return {
                questionId: q.id,
                questionText: q.questionText,
                selectedOptionId: chosenOptId,
                selectedOptionText: chosenOpt?.text || '',
              };
            })
            .filter((item): item is SurveyAnswerItem => item !== null)
        : Object.entries(selectedOptionsByQuestionId).map(([qId, optId]) => ({
            questionId: qId,
            questionText: '',
            selectedOptionId: optId,
            selectedOptionText: '',
          }));

      const newResponseDoc: CitizenSurveyResponse = {
        id: deterministicId,
        surveyId: String(surveyId),
        surveyTitle: targetSurvey?.title || '',
        citizenUid,
        ownerUid: citizenUid,
        answers: detailedAnswers,
        selectedOptionsByQuestionId,
        createdAt: now,
      };

      setSurveyResponses((prev) => [
        newResponseDoc,
        ...prev.filter((r) => r.id !== deterministicId),
      ]);

      setSurveys((prev) =>
        prev.map((s) => {
          if (s.id !== surveyId) return s;
          return prepareDocumentWithId<CommunitySurvey>(
            COLLECTIONS.SURVEYS,
            {
              ...s,
              id: s.id,
              totalResponses: s.totalResponses + 1,
              questions: s.questions.map((q) => {
                const selectedOptId = selectedOptionsByQuestionId[q.id];
                if (!selectedOptId) return q;
                return {
                  ...q,
                  options: q.options.map((opt) =>
                    opt.id === selectedOptId
                      ? { ...opt, votesCount: opt.votesCount + 1 }
                      : opt
                  ),
                };
              }),
            },
            s.id
          );
        })
      );

      setAnsweredSurveyIds((prev) =>
        prev.includes(surveyId) ? prev : [...prev, surveyId]
      );
      setDismissedSurveyIds((prev) =>
        prev.includes(surveyId) ? prev : [...prev, surveyId]
      );

      executeSurveyResponseTransaction({
        surveyId: String(surveyId),
        citizenUid,
        responseDoc: newResponseDoc,
        selectedOptionsByQuestionId,
      }).catch((err) => {
        try {
          handleFirestoreError(
            err,
            OperationType.CREATE,
            `${COLLECTIONS.SURVEY_RESPONSES}/${deterministicId}`
          );
        } catch {}
      });
    },
    [surveys, answeredSurveyIds]
  );

  const dismissSurveyPopup = useCallback((surveyId: string) => {
    setDismissedSurveyIds((prev) =>
      prev.includes(surveyId) ? prev : [...prev, surveyId]
    );
  }, []);

  const reopenPublishedSurveysPopup = useCallback(() => {
    // إعادة فتح الاستبيانات غير المكتملة التي أغلقها المواطن مؤقتاً دون المساس بالاستبيانات المكتملة في Firestore
    setDismissedSurveyIds([]);
  }, []);

  const value = useMemo(
    () => ({
      activeRole,
      setActiveRole,
      toggleRole,
      citizenTab,
      setCitizenTab,
      adminTab,
      setAdminTab,
      isSurveysViewOpen,
      setIsSurveysViewOpen,
      isStartScreenActive,
      dismissStartScreen,
      reports,
      myReports,
      myReportIds,
      reportsLimitCount,
      loadMoreReports,
      hasMoreReports,
      departments: canAccessAdmin ? departments : [],
      citizens: canAccessAdmin ? citizens : [],
      projects,
      surveys: canAccessAdmin
        ? surveys
        : surveys.filter((s) => Boolean(s.isPublishedToCitizens && s.status !== 'closed')),
      surveyResponses: canAccessAdmin ? surveyResponses : [],
      answeredSurveyIds,
      dismissedSurveyIds,
      metrics,
      contactSettings,
      updateContactSettings,
      searchQuery,
      setSearchQuery,
      selectedSector,
      setSelectedSector,
      selectedStatus,
      setSelectedStatus,
      selectedNeighborhood,
      setSelectedNeighborhood,
      filteredReports,
      resetFilters,
      selectedReport,
      setSelectedReport,
      editingCitizenReport,
      setEditingCitizenReport,
      isAddReportOpen,
      setIsAddReportOpen,
      isAddProjectOpen,
      setIsAddProjectOpen,
      statusUpdateToast,
      clearStatusUpdateToast,
      newAdminReportAlert,
      dismissNewAdminReportAlert,
      submitReport,
      submitNewReport: submitReport,
      updateCitizenReport,
      findReportByTrackingCode,
      claimReportByTrackingCode,
      updateReportStatus,
      revertReportResolution,
      updateReportUrgency,
      deleteReport,
      upvoteReport,
      addDepartment,
      updateDepartment,
      deleteDepartment,
      toggleBlockCitizen,
      deleteCitizen,
      addProject,
      updateDepartmentAvailability,
      createSurvey,
      updateSurvey,
      togglePublishSurveyToCitizens,
      deleteSurvey,
      submitSurveyResponse,
      dismissSurveyPopup,
      reopenPublishedSurveysPopup,
    }),
    [
      activeRole,
      setActiveRole,
      toggleRole,
      citizenTab,
      setCitizenTab,
      adminTab,
      setAdminTab,
      isSurveysViewOpen,
      setIsSurveysViewOpen,
      isStartScreenActive,
      dismissStartScreen,
      reports,
      myReports,
      myReportIds,
      reportsLimitCount,
      loadMoreReports,
      hasMoreReports,
      departments,
      citizens,
      projects,
      surveys,
      surveyResponses,
      answeredSurveyIds,
      dismissedSurveyIds,
      metrics,
      contactSettings,
      updateContactSettings,
      searchQuery,
      selectedSector,
      selectedStatus,
      selectedNeighborhood,
      filteredReports,
      resetFilters,
      selectedReport,
      setSelectedReport,
      editingCitizenReport,
      isAddReportOpen,
      isAddProjectOpen,
      statusUpdateToast,
      clearStatusUpdateToast,
      newAdminReportAlert,
      dismissNewAdminReportAlert,
      submitReport,
      updateCitizenReport,
      findReportByTrackingCode,
      claimReportByTrackingCode,
      updateReportStatus,
      revertReportResolution,
      updateReportUrgency,
      deleteReport,
      upvoteReport,
      addDepartment,
      updateDepartment,
      deleteDepartment,
      toggleBlockCitizen,
      deleteCitizen,
      addProject,
      updateDepartmentAvailability,
      createSurvey,
      updateSurvey,
      togglePublishSurveyToCitizens,
      deleteSurvey,
      submitSurveyResponse,
      dismissSurveyPopup,
      reopenPublishedSurveysPopup,
    ]
  );

  return <BaadreContext.Provider value={value}>{children}</BaadreContext.Provider>;
};

export const useBaadre = (): BaadreContextType => {
  const ctx = useContext(BaadreContext);
  if (!ctx) {
    throw new Error('useBaadre must be used within a BaadreProvider');
  }
  return ctx;
};
