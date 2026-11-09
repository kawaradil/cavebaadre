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
  whatsappReportsNumber: '9647749019911',
  contactPhone: '9647749019911',
  contactEmail: 'info@cavebaadre.org',
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

export interface BaadreNavigationContextType {
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
  contactSettings: CloudContactSettings;
  updateContactSettings: (input: CloudContactSettings) => Promise<void>;
}

export interface BaadreReportsContextType {
  reports: CivicReport[];
  myReports: CivicReport[];
  myReportIds: string[];
  reportsLimitCount: number;
  loadMoreReports: () => void;
  hasMoreReports: boolean;
  projects: OrganizationProject[];
  metrics: BaadreMetrics;
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
  addProject: (proj: Omit<OrganizationProject, 'id'>) => void;
}

export interface BaadreDirectoryContextType {
  departments: MunicipalDepartment[];
  citizens: RegisteredCitizen[];
  addDepartment: (dept: Omit<MunicipalDepartment, 'id'>) => void;
  updateDepartment: (deptId: string, updates: Partial<MunicipalDepartment>) => void;
  deleteDepartment: (deptId: string) => void;
  toggleBlockCitizen: (citizenId: string) => void;
  updateDepartmentAvailability: (
    deptId: string,
    availability: 'available' | 'on_mission' | 'standby'
  ) => void;
}

export interface BaadreSurveysContextType {
  surveys: CommunitySurvey[];
  surveyResponses: CitizenSurveyResponse[];
  answeredSurveyIds: string[];
  dismissedSurveyIds: string[];
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

export type BaadreContextType = BaadreNavigationContextType &
  BaadreReportsContextType &
  BaadreDirectoryContextType &
  BaadreSurveysContextType;
