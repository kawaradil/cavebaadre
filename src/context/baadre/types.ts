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
} from '../../types/baadre';
import {
  OFFICIAL_PHONE_LOCAL,
  OFFICIAL_CONTACT_EMAIL,
} from '../../constants/officialContact';

export const STORAGE_MY_REPORT_IDS_KEY = 'cave_baadre_my_report_ids_v3';
export const STORAGE_ROLE_KEY = 'cave_baadre_active_role_v3';

export const CACHE_KEY_REPORTS = 'cave_baadre_persisted_reports_v1';
export const CACHE_KEY_PROJECTS = 'cave_baadre_persisted_projects_v1';
export const CACHE_KEY_DEPTS = 'cave_baadre_persisted_depts_v1';
export const CACHE_KEY_SURVEYS = 'cave_baadre_persisted_surveys_v1';
export const CACHE_KEY_CITIZENS = 'cave_baadre_persisted_citizens_v1';
export const CACHE_KEY_CONTACT = 'cave_baadre_persisted_contact_v1';

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
  videoUrl?: string;
  videoThumbnail?: string;
  videoDurationSeconds?: number;
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

export const SECTOR_DEFAULT_DEPARTMENT: Record<ReportSector, string> = {
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

export const DEFAULT_CLOUD_CONTACT_SETTINGS: CloudContactSettings = {
  whatsappReportsNumber: OFFICIAL_PHONE_LOCAL,
  contactPhone: OFFICIAL_PHONE_LOCAL,
  contactEmail: OFFICIAL_CONTACT_EMAIL,
};

export interface StatusUpdateToastPayload {
  reportId: string;
  trackingCode: string;
  reportTitle: string;
  fromStatus: ReportStatus;
  toStatus: ReportStatus;
  assignedTeam?: string;
  note?: string;
}

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
  statusUpdateToast: StatusUpdateToastPayload | null;
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
