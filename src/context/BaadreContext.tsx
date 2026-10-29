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
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
  writeBatch,
} from 'firebase/firestore';
import {
  db,
  COLLECTIONS,
  generateAutoNumericId,
  isPureNumericId,
  syncNumericCounterWithItems,
  prepareDocumentWithId,
  buildCompletedWorkDocumentFromReport,
  syncReportStatusAndCompletedWorkToFirestore,
  OperationType,
  handleFirestoreError,
} from '../lib/firebase';
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
const STORAGE_ANSWERED_SURVEYS_KEY = 'cave_baadre_answered_surveys_v3';

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

  // Data
  reports: CivicReport[];
  myReports: CivicReport[];
  myReportIds: string[];
  departments: MunicipalDepartment[];
  citizens: RegisteredCitizen[];
  projects: OrganizationProject[];
  surveys: CommunitySurvey[];
  surveyResponses: CitizenSurveyResponse[];
  answeredSurveyIds: string[];
  dismissedSurveyIds: string[];
  metrics: BaadreMetrics;

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
  deleteDepartment: (deptId: string) => void;
  toggleBlockCitizen: (citizenId: string) => void;
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
  const [activeRole, setActiveRoleState] = useState<'citizen' | 'admin'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ROLE_KEY);
      if (saved === 'admin' || saved === 'citizen') return saved;
    } catch {}
    return 'citizen';
  });

  const [citizenTabState, setCitizenTabState] = useState<CitizenNavTab>('works');
  const [adminTabState, setAdminTabState] = useState<AdminSectionTab>('analytics');
  const [isSurveysViewOpen, setIsSurveysViewOpen] = useState<boolean>(false);

  const setCitizenTab = useCallback((tab: CitizenNavTab) => {
    setCitizenTabState(tab);
    setIsSurveysViewOpen(false);
  }, []);

  const setAdminTab = useCallback((tab: AdminSectionTab) => {
    setAdminTabState(tab);
    setIsSurveysViewOpen(false);
  }, []);

  const citizenTab = citizenTabState;
  const adminTab = adminTabState;

  // جميع البيانات تعتمد كلياً على قاعدة بيانات Firestore بدون أي Mock Data
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [departments, setDepartments] = useState<MunicipalDepartment[]>([]);
  const [citizens, setCitizens] = useState<RegisteredCitizen[]>([]);
  const [projects, setProjects] = useState<OrganizationProject[]>([]);
  const [surveys, setSurveys] = useState<CommunitySurvey[]>([]);
  const [surveyResponses, setSurveyResponses] = useState<CitizenSurveyResponse[]>([]);

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

  const [answeredSurveyIds, setAnsweredSurveyIds] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_ANSWERED_SURVEYS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [dismissedSurveyIds, setDismissedSurveyIds] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<'all' | 'ALL' | ReportSector>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'ALL' | ReportStatus>('ALL');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('all');

  const [selectedReport, setSelectedReportState] = useState<CivicReport | null>(null);

  const setSelectedReport = useCallback((rep: CivicReport | null) => {
    if (!rep) {
      setSelectedReportState(null);
      return;
    }
    if (!isReportOpened(rep)) {
      const now = new Date().toISOString();
      const openedReport: CivicReport = {
        ...rep,
        id: rep.id,
        isOpened: true,
        openedAt: now,
      };
      setReports((prev) => prev.map((r) => (r.id === rep.id ? openedReport : r)));
      setSelectedReportState(openedReport);
      setNewAdminReportAlert((curr) => (curr && curr.id === rep.id ? null : curr));
      setDoc(
        doc(db, COLLECTIONS.REPORTS, rep.id),
        { id: rep.id, isOpened: true, openedAt: now },
        { merge: true }
      ).catch(() => {});
    } else {
      setSelectedReportState(rep);
    }
  }, []);
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

  const [newAdminReportAlert, setNewAdminReportAlert] = useState<CivicReport | null>(null);
  const hasLoadedInitialReportsRef = useRef<boolean>(false);
  const knownReportIdsRef = useRef<Set<string>>(new Set());
  const dismissedNewReportIdsRef = useRef<Set<string>>(new Set());

  const dismissNewAdminReportAlert = useCallback(() => {
    setNewAdminReportAlert((curr) => {
      if (curr) {
        dismissedNewReportIdsRef.current.add(curr.id);
      }
      return null;
    });
  }, []);

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
      ];
      legacyMockKeys.forEach((k) => localStorage.removeItem(k));
    } catch {}
  }, []);

  /**
   * مزامنة مباشرة وفورية مع Firestore بدون أي بيانات وهمية (Mock Data)
   */
  useEffect(() => {
    // حذف مجموعة projects القديمة إن وجدت فيها وثائق سابقة لاعتماد CompletedWork فقط
    getDocs(collection(db, 'projects'))
      .then((snap) => {
        if (!snap.empty) {
          const b = writeBatch(db);
          snap.docs.forEach((d) => b.delete(d.ref));
          b.commit().catch(() => {});
        }
      })
      .catch(() => {});

    // 1. البلاغات (reports)
    const reportsQuery = query(
      collection(db, COLLECTIONS.REPORTS),
      orderBy('createdAt', 'desc'),
      limit(150)
    );
    const unsubReports = onSnapshot(
      reportsQuery,
      (snapshot) => {
        const nonNumericDocs = snapshot.docs.filter((d) => !isPureNumericId(d.id));
        const numericDocs = snapshot.docs.filter((d) => isPureNumericId(d.id));

        if (nonNumericDocs.length > 0) {
          const cleanupBatch = writeBatch(db);
          nonNumericDocs.forEach((d) => cleanupBatch.delete(d.ref));
          cleanupBatch.commit().catch(() => {});
        }

        const remoteReports = numericDocs.map((d) => {
          const data = d.data() as CivicReport;
          return { ...data, id: String(d.id) };
        });
        syncNumericCounterWithItems(COLLECTIONS.REPORTS, remoteReports);

        if (!hasLoadedInitialReportsRef.current) {
          remoteReports.forEach((r) => knownReportIdsRef.current.add(r.id));
          hasLoadedInitialReportsRef.current = true;
        } else {
          const newlyArrivedUnsent = remoteReports.find(
            (r) =>
              !knownReportIdsRef.current.has(r.id) &&
              !isReportSentToDepartment(r) &&
              !dismissedNewReportIdsRef.current.has(r.id)
          );
          remoteReports.forEach((r) => knownReportIdsRef.current.add(r.id));
          if (newlyArrivedUnsent) {
            setNewAdminReportAlert(newlyArrivedUnsent);
          }
        }

        setNewAdminReportAlert((curr) => {
          if (!curr) return null;
          const match = remoteReports.find((r) => r.id === curr.id);
          if (!match || isReportSentToDepartment(match)) return null;
          return match;
        });

        setReports(remoteReports);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, COLLECTIONS.REPORTS);
        } catch {}
      }
    );

    // 2. الأعمال المنجزة (CompletedWork) مع منع تكرار أي بلاغ منجز
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

        if (nonNumericDocs.length > 0 || duplicateDocs.length > 0) {
          const cleanupBatch = writeBatch(db);
          nonNumericDocs.forEach((d) => cleanupBatch.delete(d.ref));
          duplicateDocs.forEach((d) => cleanupBatch.delete(d.ref));
          cleanupBatch.commit().catch(() => {});
        }

        syncNumericCounterWithItems(COLLECTIONS.COMPLETED_WORK, uniqueRemoteWorks);
        setProjects(uniqueRemoteWorks);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, COLLECTIONS.COMPLETED_WORK);
        } catch {}
      }
    );

    // 3. الدوائر الخدمية (departments)
    const deptsQuery = query(collection(db, COLLECTIONS.DEPARTMENTS), limit(50));
    const unsubDepts = onSnapshot(
      deptsQuery,
      (snapshot) => {
        const nonNumericDocs = snapshot.docs.filter((d) => !isPureNumericId(d.id));
        const numericDocs = snapshot.docs.filter((d) => isPureNumericId(d.id));

        if (nonNumericDocs.length > 0) {
          const cleanupBatch = writeBatch(db);
          nonNumericDocs.forEach((d) => cleanupBatch.delete(d.ref));
          cleanupBatch.commit().catch(() => {});
        }

        const remoteDepts = numericDocs.map((d) => {
          const data = d.data() as MunicipalDepartment;
          return { ...data, id: String(d.id) };
        });
        syncNumericCounterWithItems(COLLECTIONS.DEPARTMENTS, remoteDepts);
        setDepartments(remoteDepts);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, COLLECTIONS.DEPARTMENTS);
        } catch {}
      }
    );

    // 4. سجل المواطنين (citizens)
    const citizensQuery = query(collection(db, COLLECTIONS.CITIZENS), limit(200));
    const unsubCitizens = onSnapshot(
      citizensQuery,
      (snapshot) => {
        const nonNumericDocs = snapshot.docs.filter((d) => !isPureNumericId(d.id));
        const numericDocs = snapshot.docs.filter((d) => isPureNumericId(d.id));

        if (nonNumericDocs.length > 0) {
          const cleanupBatch = writeBatch(db);
          nonNumericDocs.forEach((d) => cleanupBatch.delete(d.ref));
          cleanupBatch.commit().catch(() => {});
        }

        const remoteCitizens = numericDocs.map((d) => {
          const data = d.data() as RegisteredCitizen;
          return { ...data, id: String(d.id) };
        });
        syncNumericCounterWithItems(COLLECTIONS.CITIZENS, remoteCitizens);
        setCitizens(remoteCitizens);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, COLLECTIONS.CITIZENS);
        } catch {}
      }
    );

    // 5. الاستبيانات المجتمعية (surveys)
    const surveysQuery = query(
      collection(db, COLLECTIONS.SURVEYS),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubSurveys = onSnapshot(
      surveysQuery,
      (snapshot) => {
        const nonNumericDocs = snapshot.docs.filter((d) => !isPureNumericId(d.id));
        const numericDocs = snapshot.docs.filter((d) => isPureNumericId(d.id));

        if (nonNumericDocs.length > 0) {
          const cleanupBatch = writeBatch(db);
          nonNumericDocs.forEach((d) => cleanupBatch.delete(d.ref));
          cleanupBatch.commit().catch(() => {});
        }

        const remoteSurveys = numericDocs.map((d) => {
          const data = d.data() as CommunitySurvey;
          return { ...data, id: String(d.id) };
        });
        syncNumericCounterWithItems(COLLECTIONS.SURVEYS, remoteSurveys);
        setSurveys(remoteSurveys);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, COLLECTIONS.SURVEYS);
        } catch {}
      }
    );

    // 6. إجابات المواطنين على الاستبيانات (SurveyResponses)
    const responsesQuery = query(
      collection(db, COLLECTIONS.SURVEY_RESPONSES),
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    const unsubResponses = onSnapshot(
      responsesQuery,
      (snapshot) => {
        const nonNumericDocs = snapshot.docs.filter((d) => !isPureNumericId(d.id));
        const numericDocs = snapshot.docs.filter((d) => isPureNumericId(d.id));

        if (nonNumericDocs.length > 0) {
          const cleanupBatch = writeBatch(db);
          nonNumericDocs.forEach((d) => cleanupBatch.delete(d.ref));
          cleanupBatch.commit().catch(() => {});
        }

        const remoteResponses = numericDocs.map((d) => {
          const data = d.data() as CitizenSurveyResponse;
          return { ...data, id: String(d.id) };
        });
        syncNumericCounterWithItems(COLLECTIONS.SURVEY_RESPONSES, remoteResponses);
        setSurveyResponses(remoteResponses);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, COLLECTIONS.SURVEY_RESPONSES);
        } catch {}
      }
    );

    return () => {
      unsubReports();
      unsubCompletedWork();
      unsubDepts();
      unsubCitizens();
      unsubSurveys();
      unsubResponses();
    };
  }, []);

  /**
   * تنظيف تلقائي: إذا تغيرت حالة بلاغ في reports إلى غير 'resolved' (مثل قيد المعالجة أو مرفوض)،
   * يتم التأكد من إزالته من CompletedWork حتى لا يبقى عمل غير منجز في قسم الأعمال المنجزة.
   * (عملية الإضافة والتحديث تتم ذرياً عبر updateReportStatus لمنع أي تكرار).
   */
  useEffect(() => {
    if (reports.length === 0 || projects.length === 0) return;

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
  }, [reports, projects]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MY_REPORT_IDS_KEY, JSON.stringify(myReportIds));
    } catch {}
  }, [myReportIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ANSWERED_SURVEYS_KEY, JSON.stringify(answeredSurveyIds));
    } catch {}
  }, [answeredSurveyIds]);

  const myReports = useMemo(() => {
    return reports.filter((r) => myReportIds.includes(r.id));
  }, [reports, myReportIds]);

  // عند فتح التطبيق من قبل الإدارة يُفتح على قسم الإحصاءات، وإذا تم التحويل للمواطن يُفتح على قسم الأعمال/البلاغات المنجزة
  useEffect(() => {
    if (activeRole === 'admin') {
      setAdminTabState('analytics');
      setIsSurveysViewOpen(false);
    } else {
      setCitizenTabState('works');
      setIsSurveysViewOpen(false);
    }
  }, []);

  const setActiveRole = useCallback((role: 'citizen' | 'admin') => {
    setActiveRoleState(role);
    if (role === 'admin') {
      setAdminTabState('analytics');
      setIsSurveysViewOpen(false);
    } else if (role === 'citizen') {
      setCitizenTabState('works');
      setIsSurveysViewOpen(false);
    }
    try {
      localStorage.setItem(STORAGE_ROLE_KEY, role);
    } catch {}
  }, []);

  const toggleRole = useCallback(() => {
    setActiveRoleState((prev) => {
      const next = prev === 'citizen' ? 'admin' : 'citizen';
      if (next === 'admin') {
        setAdminTabState('analytics');
        setIsSurveysViewOpen(false);
      } else {
        setCitizenTabState('works');
        setIsSurveysViewOpen(false);
      }
      try {
        localStorage.setItem(STORAGE_ROLE_KEY, next);
      } catch {}
      return next;
    });
  }, []);

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
   * إضافة بلاغ جديد مع توليد رقم أوتوماتيكي (id) للبلاغ والمواطن
   */
  const submitReport = useCallback(
    (input: SubmitReportInput): CivicReport => {
      const reportNumericId = generateAutoNumericId(COLLECTIONS.REPORTS, reports);
      const existingCitizen = citizens.find(
        (c) => c.phone.replace(/\D/g, '') === (input.citizenPhone || '').replace(/\D/g, '')
      );
      const citizenNumericId = existingCitizen
        ? existingCitizen.id
        : generateAutoNumericId(COLLECTIONS.CITIZENS, citizens);

      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const trackingCode = `BDR-2026-${randomNum}`;
      const now = new Date().toISOString();
      const validImages =
        input.images && input.images.length > 0
          ? input.images.slice(0, 10)
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
          citizenId: citizenNumericId,
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
      setMyReportIds((prev) => [newReport.id, ...prev.filter((id) => id !== newReport.id)]);
      setNewAdminReportAlert(newReport);

      const citizenDoc: RegisteredCitizen = existingCitizen
        ? prepareDocumentWithId<RegisteredCitizen>(
            COLLECTIONS.CITIZENS,
            {
              ...existingCitizen,
              id: existingCitizen.id,
              reportsSubmittedCount: existingCitizen.reportsSubmittedCount + 1,
              lastActiveAt: now,
            },
            existingCitizen.id
          )
        : prepareDocumentWithId<RegisteredCitizen>(
            COLLECTIONS.CITIZENS,
            {
              id: citizenNumericId,
              name: newReport.citizenName,
              phone: newReport.citizenPhone,
              neighborhood: newReport.neighborhood,
              role: 'citizen',
              reportsSubmittedCount: 1,
              resolvedReportsCount: 0,
              joinedAt: now.slice(0, 10),
              lastActiveAt: now,
              avatar: SECTOR_ILLUSTRATIONS[newReport.sector],
              verified: true,
            },
            citizenNumericId
          );

      setCitizens((prev) => {
        if (existingCitizen) {
          return prev.map((c) => (c.id === existingCitizen.id ? citizenDoc : c));
        }
        return [citizenDoc, ...prev];
      });

      const batch = writeBatch(db);
      batch.set(doc(db, COLLECTIONS.REPORTS, newReport.id), newReport);
      batch.set(doc(db, COLLECTIONS.CITIZENS, citizenDoc.id), citizenDoc, { merge: true });
      batch.commit().catch((err) => {
        try {
          handleFirestoreError(err, OperationType.CREATE, `${COLLECTIONS.REPORTS}/${newReport.id}`);
        } catch {}
      });

      return newReport;
    },
    [reports, citizens]
  );

  /**
   * تعديل بيانات البلاغ من قِبل المواطن المسؤول عن البلاغ وحفظها في Firestore
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

      const now = new Date().toISOString();
      const validImages =
        input.images && input.images.length > 0
          ? input.images.slice(0, 10)
          : targetReport.images;
      const latVal = input.latitude ?? input.lat ?? targetReport.latitude;
      const lngVal = input.longitude ?? input.lng ?? targetReport.longitude;

      const updatedReport = prepareDocumentWithId<CivicReport>(
        COLLECTIONS.REPORTS,
        {
          ...targetReport,
          id: targetReport.id,
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
        },
        targetReport.id
      );

      setReports((prev) => prev.map((r) => (r.id === reportId ? updatedReport : r)));
      setSelectedReportState((curr) => (curr && curr.id === reportId ? updatedReport : curr));
      setNewAdminReportAlert((curr) => (curr && curr.id === reportId ? updatedReport : curr));

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
      const finalResolvedImgs =
        resolvedImages !== undefined && resolvedImages.length > 0
          ? resolvedImages
          : targetReport.resolvedImages && targetReport.resolvedImages.length > 0
          ? targetReport.resolvedImages
          : status === 'resolved'
          ? targetReport.images && targetReport.images.length > 0
            ? [targetReport.images[0]]
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
      setReports((prev) => prev.map((r) => (r.id === reportId ? updatedReport : r)));

      // 2. تحديث البلاغ المحدد في نافذة التفاصيل
      setSelectedReportState((curr) => (curr && curr.id === reportId ? updatedReport : curr));

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
          return [completedWorkDoc!, ...withoutCurrentReport];
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
          setProjects((prevProjs) =>
            prevProjs.filter(
              (p) =>
                !removedCompletedWorkIds.includes(p.id) &&
                (!p.reportId || String(p.reportId) !== String(targetReport.id)) &&
                (!p.trackingCode || p.trackingCode !== targetReport.trackingCode)
            )
          );
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

      setReports((prev) => prev.map((r) => (r.id === reportId ? updatedReport : r)));
      setSelectedReportState((curr) => (curr && curr.id === reportId ? updatedReport : curr));

      if (removedCompletedWorkIds.length > 0) {
        setProjects((prevProjs) =>
          prevProjs.filter(
            (p) =>
              !removedCompletedWorkIds.includes(p.id) &&
              (!p.reportId || String(p.reportId) !== String(targetReport.id)) &&
              (!p.trackingCode || p.trackingCode !== targetReport.trackingCode)
          )
        );
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

      setReports((prev) => prev.map((r) => (r.id === reportId ? updatedReport : r)));
      setSelectedReportState((curr) => (curr && curr.id === reportId ? updatedReport : curr));

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
      const linkedWorks = projects.filter(
        (p) =>
          (p.reportId && String(p.reportId) === String(reportId)) ||
          (targetReport?.completedWorkId && String(p.id) === String(targetReport.completedWorkId)) ||
          (targetReport?.trackingCode && p.trackingCode === targetReport.trackingCode)
      );
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setMyReportIds((prev) => prev.filter((id) => id !== reportId));
      setSelectedReportState((curr) => (curr?.id === reportId ? null : curr));
      setNewAdminReportAlert((curr) => (curr?.id === reportId ? null : curr));
      if (linkedWorks.length > 0) {
        const linkedIds = new Set(linkedWorks.map((w) => w.id));
        setProjects((prev) => prev.filter((p) => !linkedIds.has(p.id)));
      }

      const batch = writeBatch(db);
      batch.delete(doc(db, COLLECTIONS.REPORTS, reportId));
      linkedWorks.forEach((w) => {
        batch.delete(doc(db, COLLECTIONS.COMPLETED_WORK, w.id));
      });
      if (targetReport?.completedWorkId) {
        batch.delete(doc(db, COLLECTIONS.COMPLETED_WORK, targetReport.completedWorkId));
      }
      batch.commit().catch((err) => {
        try {
          handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.REPORTS}/${reportId}`);
        } catch {}
      });
    },
    [projects, reports]
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
      const numericId = generateAutoNumericId(COLLECTIONS.DEPARTMENTS, departments);
      const newDept = prepareDocumentWithId<MunicipalDepartment>(
        COLLECTIONS.DEPARTMENTS,
        {
          ...dept,
          id: numericId,
        },
        numericId
      );
      setDepartments((prev) => [newDept, ...prev]);
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
    [departments]
  );

  const deleteDepartment = useCallback((deptId: string) => {
    setDepartments((prev) => prev.filter((d) => d.id !== deptId));
    deleteDoc(doc(db, COLLECTIONS.DEPARTMENTS, deptId)).catch((err) => {
      try {
        handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.DEPARTMENTS}/${deptId}`);
      } catch {}
    });
  }, []);

  const toggleBlockCitizen = useCallback((citizenId: string) => {
    setCitizens((prev) =>
      prev.map((c) => {
        if (c.id !== citizenId) return c;
        const nextBlocked = !c.isBlocked;
        setDoc(
          doc(db, COLLECTIONS.CITIZENS, c.id),
          { id: c.id, isBlocked: nextBlocked },
          { merge: true }
        ).catch((err) => {
          try {
            handleFirestoreError(err, OperationType.UPDATE, `${COLLECTIONS.CITIZENS}/${c.id}`);
          } catch {}
        });
        return { ...c, id: c.id, isBlocked: nextBlocked };
      })
    );
  }, []);

  const addProject = useCallback(
    (proj: Omit<OrganizationProject, 'id'>) => {
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
    [projects]
  );

  const updateDepartmentAvailability = useCallback(
    (deptId: string, availability: 'available' | 'on_mission' | 'standby') => {
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
    []
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
      setSurveys((prev) => [newSurvey, ...prev]);
      setDoc(doc(db, COLLECTIONS.SURVEYS, newSurvey.id), newSurvey).catch((err) => {
        try {
          handleFirestoreError(err, OperationType.CREATE, `${COLLECTIONS.SURVEYS}/${newSurvey.id}`);
        } catch {}
      });
      return newSurvey;
    },
    [surveys]
  );

  const updateSurvey = useCallback((surveyId: string, input: CreateSurveyInput) => {
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
  }, []);

  const togglePublishSurveyToCitizens = useCallback(
    (surveyId: string, forceState?: boolean) => {
      setSurveys((prev) =>
        prev.map((s) => {
          if (s.id !== surveyId) return s;
          const nextPublished =
            forceState !== undefined ? forceState : !s.isPublishedToCitizens;
          if (nextPublished) {
            setDismissedSurveyIds((ids) => ids.filter((id) => id !== surveyId));
            setAnsweredSurveyIds((ids) => ids.filter((id) => id !== surveyId));
          }
          const updated: CommunitySurvey = {
            ...s,
            id: s.id,
            isPublishedToCitizens: nextPublished,
          };
          setDoc(
            doc(db, COLLECTIONS.SURVEYS, s.id),
            { id: s.id, isPublishedToCitizens: nextPublished },
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
    []
  );

  const deleteSurvey = useCallback((surveyId: string) => {
    setSurveys((prev) => prev.filter((s) => s.id !== surveyId));
    deleteDoc(doc(db, COLLECTIONS.SURVEYS, surveyId)).catch((err) => {
      try {
        handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.SURVEYS}/${surveyId}`);
      } catch {}
    });
  }, []);

  /**
   * إرسال إجابة المواطن على الاستبيان:
   * - إنشاء وثيقة جديدة في كولكشن SurveyResponses برقم أوتوماتيكي (id) ومربوطة بـ surveyId
   * - تحديث إحصاءات الاستبيان في surveys/{surveyId} في نفس العملية الذرية (writeBatch)
   */
  const submitSurveyResponse = useCallback(
    (surveyId: string, selectedOptionsByQuestionId: Record<string, string>) => {
      const targetSurvey = surveys.find((s) => s.id === surveyId);
      const responseNumericId = generateAutoNumericId(
        COLLECTIONS.SURVEY_RESPONSES,
        surveyResponses
      );
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

      const newResponseDoc = prepareDocumentWithId<CitizenSurveyResponse>(
        COLLECTIONS.SURVEY_RESPONSES,
        {
          id: responseNumericId,
          surveyId: String(surveyId),
          surveyTitle: targetSurvey?.title || '',
          answers: detailedAnswers,
          selectedOptionsByQuestionId,
          createdAt: now,
        },
        responseNumericId
      );

      setSurveyResponses((prev) => [newResponseDoc, ...prev]);

      setSurveys((prev) =>
        prev.map((s) => {
          if (s.id !== surveyId) return s;
          const updated = prepareDocumentWithId<CommunitySurvey>(
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

          const batch = writeBatch(db);
          batch.set(doc(db, COLLECTIONS.SURVEY_RESPONSES, newResponseDoc.id), newResponseDoc);
          batch.set(
            doc(db, COLLECTIONS.SURVEYS, updated.id),
            {
              id: updated.id,
              totalResponses: updated.totalResponses,
              questions: updated.questions,
            },
            { merge: true }
          );
          batch.commit().catch((err) => {
            try {
              handleFirestoreError(
                err,
                OperationType.WRITE,
                `${COLLECTIONS.SURVEY_RESPONSES}/${newResponseDoc.id}`
              );
            } catch {}
          });

          return updated;
        })
      );

      setAnsweredSurveyIds((prev) =>
        prev.includes(surveyId) ? prev : [...prev, surveyId]
      );
      setDismissedSurveyIds((prev) =>
        prev.includes(surveyId) ? prev : [...prev, surveyId]
      );
    },
    [surveys, surveyResponses]
  );

  const dismissSurveyPopup = useCallback((surveyId: string) => {
    setDismissedSurveyIds((prev) =>
      prev.includes(surveyId) ? prev : [...prev, surveyId]
    );
  }, []);

  const reopenPublishedSurveysPopup = useCallback(() => {
    setDismissedSurveyIds([]);
    setAnsweredSurveyIds([]);
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
      reports,
      myReports,
      myReportIds,
      departments,
      citizens,
      projects,
      surveys,
      surveyResponses,
      answeredSurveyIds,
      dismissedSurveyIds,
      metrics,
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
      deleteDepartment,
      toggleBlockCitizen,
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
      reports,
      myReports,
      myReportIds,
      departments,
      citizens,
      projects,
      surveys,
      surveyResponses,
      answeredSurveyIds,
      dismissedSurveyIds,
      metrics,
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
      deleteDepartment,
      toggleBlockCitizen,
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
