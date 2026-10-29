export type ReportSector =
  | 'roads'          // الشوارع والطرق
  | 'sewage'         // الشبكات والمجاري
  | 'sanitation'     // الحدائق والنظافة
  | 'lighting'       // الإنارة والأعمدة
  | 'water'          // شبكات المياه
  | 'other';         // أخرى

export type ReportStatus =
  | 'pending'        // قيد المراجعة 🟡
  | 'in_progress'    // قيد المعالجة الميدانية 🔵
  | 'resolved'       // تم الإنجاز 🟢
  | 'rejected';      // مرفوض 🔴

export type ReportUrgency = 'normal' | 'high' | 'emergency';

export type AppRole = 'citizen' | 'admin';

export type AdminSectionTab =
  | 'analytics'
  | 'active_reports'
  | 'directory'
  | 'departments_directory'
  | 'projects';

export type CitizenNavTab =
  | 'home'
  | 'track'
  | 'works'
  | 'projects'
  | 'map'
  | 'departments';

export interface CivicReport {
  id: string;
  trackingCode: string; // e.g., BDR-2026-4819
  title: string;
  description: string;
  sector: ReportSector;
  status: ReportStatus;
  urgency: ReportUrgency;
  neighborhood: string;
  street: string;
  landmark: string;
  latitude: number;
  longitude: number;
  lat?: number;
  lng?: number;
  images: string[];
  resolvedImages?: string[]; // صور العمل المنجز
  citizenName: string;
  citizenPhone: string;
  citizenWhatsapp?: string;
  citizenId?: string;
  createdAt: string;       // ISO string
  updatedAt: string;       // ISO string
  resolvedAt?: string;     // ISO string
  responseTimeHours?: number;
  assignedTeam: string;
  assignedDepartmentId?: string;
  assignedRecipient?: string;
  assignedRecipients?: string[];
  officialNote: string;
  adminNotes?: string;
  isUrgencySet?: boolean;
  urgencySetAt?: string;
  isOpened?: boolean;
  openedAt?: string;
  statusNotes?: Partial<Record<ReportStatus, string>>;
  statusTimestamps?: Partial<Record<ReportStatus, string>>;
  completedWorkId?: string;
  upvotes: number;
  upvotesCount?: number;
  viewsCount?: number;
}

export function isReportUrgencyConfirmed(report: CivicReport): boolean {
  if (report.isUrgencySet === true || Boolean(report.urgencySetAt)) return true;
  if (report.isUrgencySet === false) return false;
  // للبلاغات القديمة التي تم إرسالها أو إنجازها أو تحديد أولوية عالية/طارئة لها مسبقاً
  return (
    report.status !== 'pending' ||
    report.urgency === 'high' ||
    report.urgency === 'emergency'
  );
}

export function isReportSentToDepartment(report: CivicReport): boolean {
  return (
    report.status === 'in_progress' ||
    report.status === 'resolved' ||
    report.status === 'rejected' ||
    Boolean(report.statusTimestamps?.in_progress) ||
    Boolean(report.statusNotes?.in_progress)
  );
}

export function isReportOpened(report: CivicReport): boolean {
  if (report.isOpened === true || Boolean(report.openedAt)) return true;
  if (report.isOpened === false) return false;
  return (
    isReportUrgencyConfirmed(report) ||
    isReportSentToDepartment(report) ||
    report.status !== 'pending'
  );
}

export interface OrganizationProject {
  id: string;
  reportId?: string; // رقم البلاغ الأصلي المربوط في كولكشن reports
  trackingCode?: string; // رمز تتبع البلاغ الأصلي (مثل BDR-2026-XXXX)
  title: string;
  organizationName: string; // الدائرة المعنية المنجزة
  completedDepartment?: string; // اسم الدائرة المعنية المنجزة
  category: 'NGO' | 'Municipal' | 'Joint';
  sector: ReportSector;
  status: 'ongoing' | 'completed' | 'planned';
  neighborhood: string;
  description: string; // تفاصيل البلاغ
  completionNotes?: string; // تفاصيل الإنجاز الميداني
  beforeImage?: string; // صورة عند البلاغ
  beforeImages?: string[]; // جميع صور البلاغ (قبل الإنجاز)
  afterImages?: string[]; // جميع صور الإنجاز (بعد الإنجاز)
  durationText?: string; // المدة بين البلاغ والإنجاز
  reportedAt?: string;
  completedAt?: string;
  reporterName?: string; // اسم المبلّغ
  reporterPhone?: string; // رقم المبلّغ
  managedByPeople?: string[]; // الأشخاص الذين أداروا وأنجزوا هذا البلاغ
  budgetOrFunding?: string;
  progressPercentage: number;
  startDate: string;
  expectedCompletionDate: string;
  images: string[];
  beneficiariesCount?: string;
}

export interface MunicipalDepartment {
  id: string;
  name?: string;
  nameAr: string;
  nameKu: string;
  nameEn: string;
  sector: ReportSector;
  specialty?: string;
  specialtyAr?: string;
  specialtyKu?: string;
  specialtyEn?: string;
  headName: string;
  managerName?: string;
  managerPhone?: string;
  deputyName?: string;
  deputyPhone?: string;
  engineerName?: string;
  engineerPhone?: string;
  fieldTeamName: string;
  phone: string;
  emergencyPhone: string;
  whatsapp: string;
  whatsappPhone: string;
  availability: 'available' | 'on_mission' | 'standby';
  vehiclesCount: number;
  activeTeamsCount: number;
  workingHours: string;
  location?: string;
  locationAr?: string;
}

export interface RegisteredCitizen {
  id: string;
  name: string;
  phone: string;
  neighborhood: string;
  role?: string;
  reportsCount?: number;
  reportsSubmittedCount: number;
  resolvedReportsCount: number;
  lastActive?: string;
  lastActiveAt?: string;
  joinedAt: string;
  badge?: 'active_citizen' | 'pioneer' | 'verified';
  avatar?: string;
  verified: boolean;
  isBlocked?: boolean;
}

export interface SectorMetaItem {
  key: ReportSector;
  ar: string;
  ku: string;
  en: string;
  labelAr: string;
  descAr: string;
  descriptionAr: string;
  descKu: string;
  descEn: string;
  badgeBg: string;
  badgeEmoji: string;
  accentColor: string;
}

export const SECTOR_META: Record<ReportSector, SectorMetaItem> = {
  roads: {
    key: 'roads',
    ar: 'الشوارع والطرق',
    ku: 'شەقام و ڕێگاوبان',
    en: 'Streets & Roads',
    labelAr: 'الشوارع والطرق',
    descAr: 'حفر الشوارع، التعبيد، الأرصفة، والمطبات',
    descriptionAr: 'حفر الشوارع، التعبيد، الأرصفة، والمطبات',
    descKu: 'چاڵی شەقام، قیرتاوکردن و شۆستەکان',
    descEn: 'Potholes, paving, sidewalks & road safety',
    badgeBg: 'bg-[#46674D] text-white',
    badgeEmoji: '🛣️',
    accentColor: '#46674D',
  },
  sewage: {
    key: 'sewage',
    ar: 'الشبكات والمجاري',
    ku: 'تۆڕەکان و ئاوەڕۆ',
    en: 'Sewage & Drainage',
    labelAr: 'الشبكات والمجاري',
    descAr: 'انسداد المجاري، أغطية المنهولات، وتصريف الأمطار',
    descriptionAr: 'انسداد المجاري، أغطية المنهولات، وتصريف الأمطار',
    descKu: 'گیرانی ئاوەڕۆ، سەری مەنهۆڵ و ئاوی باران',
    descEn: 'Drainage blockages, manhole covers & storm water',
    badgeBg: 'bg-[#36593F] text-white',
    badgeEmoji: '🚰',
    accentColor: '#0284C7',
  },
  sanitation: {
    key: 'sanitation',
    ar: 'الحدائق والنظافة',
    ku: 'باخچەکان و پاکوخاوێنی',
    en: 'Parks & Sanitation',
    labelAr: 'الحدائق والنظافة',
    descAr: 'رفع النفايات، الحاويات، التشجير والحدائق العامة',
    descriptionAr: 'رفع النفايات، الحاويات، التشجير والحدائق العامة',
    descKu: 'لادانی خاشاک، سەبەتەی زبڵ و سەوزایی',
    descEn: 'Waste collection, bins, landscaping & public parks',
    badgeBg: 'bg-emerald-600 text-white',
    badgeEmoji: '🌳',
    accentColor: '#10B981',
  },
  lighting: {
    key: 'lighting',
    ar: 'الإنارة والأعمدة',
    ku: 'ڕووناکی و ستوونەکان',
    en: 'Lighting & Poles',
    labelAr: 'الإنارة والأعمدة',
    descAr: 'أعطال مصابيح الشوارع، الأعمدة، والأسلاك العامة',
    descriptionAr: 'أعطال مصابيح الشوارع، الأعمدة، والأسلاك العامة',
    descKu: 'تێکچوونی گلۆپی شەقام و ستوونەکانی کارەبا',
    descEn: 'Streetlight outages, utility poles & public wiring',
    badgeBg: 'bg-amber-500 text-white',
    badgeEmoji: '💡',
    accentColor: '#D97706',
  },
  water: {
    key: 'water',
    ar: 'شبكات المياه',
    ku: 'تۆڕەکانی ئاو',
    en: 'Water Networks',
    labelAr: 'شبكات المياه',
    descAr: 'كسر أنابيب المياه، التسربات، وضعف الضخ',
    descriptionAr: 'كسر أنابيب المياه، التسربات، وضعف الضخ',
    descKu: 'شکانی بۆری ئاو، دزەکردن و لاوازی ئاو',
    descEn: 'Water pipe leaks, bursts & pressure issues',
    badgeBg: 'bg-sky-600 text-white',
    badgeEmoji: '💧',
    accentColor: '#0284C7',
  },
  other: {
    key: 'other',
    ar: 'خدمات بلدية أخرى',
    ku: 'خزمەتگوزارییەکانی تر',
    en: 'Other Municipal Services',
    labelAr: 'خدمات بلدية أخرى',
    descAr: 'التجاوزات، اللوحات الإرشادية، والطوارئ العامة',
    descriptionAr: 'التجاوزات، اللوحات الإرشادية، والطوارئ العامة',
    descKu: 'زێدەڕۆیی، هێماکانی هاتووچۆ و فریاکەوتن',
    descEn: 'Public signage, encroachments & general emergencies',
    badgeBg: 'bg-[#2D4833] text-white',
    badgeEmoji: '🏛️',
    accentColor: '#46674D',
  },
};

export interface StatusMetaItem {
  ar: string;
  ku: string;
  en: string;
  labelAr: string;
  emoji: string;
  dotEmoji: string;
  colorClass: string;
  softBgClass: string;
  dotClass: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export const STATUS_META: Record<ReportStatus, StatusMetaItem> = {
  pending: {
    ar: 'بلاغ جديد',
    ku: 'سکاڵای نوێ',
    en: 'New Report',
    labelAr: 'بلاغ جديد',
    emoji: '🔴',
    dotEmoji: '🔴',
    colorClass: 'bg-rose-600 text-white',
    softBgClass: 'bg-rose-50 text-rose-700 border border-rose-200',
    dotClass: 'bg-rose-600',
    bgClass: 'bg-rose-50/95',
    textClass: 'text-rose-700',
    borderClass: 'border-rose-300',
  },
  in_progress: {
    ar: 'تم ارسال البلاغ',
    ku: 'نێردرا بۆ فەرمانگەی پەیوەندیدار',
    en: 'Sent to Relevant Department',
    labelAr: 'تم ارسال البلاغ',
    emoji: '🔵',
    dotEmoji: '🔵',
    colorClass: 'bg-blue-600 text-white',
    softBgClass: 'bg-blue-50 text-blue-700 border border-blue-200',
    dotClass: 'bg-blue-600',
    bgClass: 'bg-blue-50/95',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-300',
  },
  resolved: {
    ar: 'تم الانجاز',
    ku: 'ئەنجامدرا',
    en: 'Completed',
    labelAr: 'تم الانجاز',
    emoji: '🟢',
    dotEmoji: '🟢',
    colorClass: 'bg-emerald-600 text-white',
    softBgClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    dotClass: 'bg-emerald-600',
    bgClass: 'bg-emerald-50/95',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-300',
  },
  rejected: {
    ar: 'تم رفض البلاغ',
    ku: 'ڕەتکرایەوە',
    en: 'Rejected',
    labelAr: 'تم رفض البلاغ',
    emoji: '⚫',
    dotEmoji: '⚫',
    colorClass: 'bg-slate-600 text-white',
    softBgClass: 'bg-slate-100 text-slate-700 border border-slate-300',
    dotClass: 'bg-slate-500',
    bgClass: 'bg-slate-100/95',
    textClass: 'text-slate-700',
    borderClass: 'border-slate-300',
  },
};

export const URGENCY_META: Record<
  ReportUrgency,
  {
    ar: string;
    ku: string;
    en: string;
    labelAr: string;
    badgeClass: string;
  }
> = {
  normal: {
    ar: 'اعتيادي',
    ku: 'ئاسایی',
    en: 'Normal',
    labelAr: 'اعتيادي',
    badgeClass: 'bg-[#E8F4EA] text-[#2D4833] border-[#BBDDC6]',
  },
  high: {
    ar: 'مهم',
    ku: 'گرنگ',
    en: 'High Priority',
    labelAr: 'أولوية عالية',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
  },
  emergency: {
    ar: 'طارئ عاجل',
    ku: 'فریاکەوتنی بەپەلە',
    en: 'Emergency',
    labelAr: 'طارئ عاجل',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-300',
  },
};

export const BAADRE_NEIGHBORHOODS = [
  { id: 'center', ar: 'مركز باعدرى', ku: 'سەنتەری باعەدرێ', en: 'Baadre Center' },
  { id: 'ashti', ar: 'حي آشتي', ku: 'گەڕەکی ئاشتی', en: 'Ashti District' },
  { id: 'nergiz', ar: 'حي نيرگز', ku: 'گەڕەکی نێرگز', en: 'Nergiz District' },
  { id: 'gulan', ar: 'حي كولان', ku: 'گەڕەکی گوڵان', en: 'Gulan District' },
  { id: 'zozan', ar: 'حي زوزان', ku: 'گەڕەکی زۆزان', en: 'Zozan District' },
  { id: 'bahar', ar: 'حي بهار', ku: 'گەڕەکی بەهار', en: 'Bahar District' },
  { id: 'main_road', ar: 'الشارع العام', ku: 'شەقامی گشتی', en: 'Main Street' },
  { id: 'complex', ar: 'المجمع السكني', ku: 'کۆمەڵگەی نیشتەجێبوون', en: 'Residential Complex' },
  { id: 'shuhada', ar: 'حي الشهداء', ku: 'گەڕەکی شەهیدان', en: 'Shuhada District' },
];

export const FIELD_TEAMS = [
  { id: 'team-roads', ar: 'فرقة صيانة وتعبيد الطرق', ku: 'تیمی چاککردنەوە و قیرتاوکردنی ڕێگاوبان', en: 'Roads Maintenance & Paving Team' },
  { id: 'team-sewage', ar: 'فرقة الشبكات والمجاري والصرف', ku: 'تیمی تۆڕەکانی ئاوەڕۆ و مەنهۆڵ', en: 'Sewage & Drainage Network Team' },
  { id: 'team-sanitation', ar: 'فرقة النظافة والحدائق والبيئة', ku: 'تیمی پاکوخاوێنی و باخچەکان', en: 'Sanitation & Parks Team' },
  { id: 'team-lighting', ar: 'فرقة الإنارة والأعمدة الكهربائية', ku: 'تیمی ڕووناکی و ستوونەکانی کارەبا', en: 'Street Lighting & Electrical Team' },
  { id: 'team-water', ar: 'فرقة صيانة شبكات المياه', ku: 'تیمی چاککردنەوەی تۆڕەکانی ئاو', en: 'Water Network Maintenance Team' },
  { id: 'team-emergency', ar: 'فرقة التدخل السريع والطوارئ', ku: 'تیمی فریاکەوتنی خێرا', en: 'Rapid Emergency Response Team' },
];

export const MUNICIPAL_WHATSAPP_NUMBER = '9647504738358';
export const BAADRE_CENTER_COORDS = { lat: 36.7186, lng: 43.2614 };

export interface SurveyOption {
  id: string;
  text: string;
  votesCount: number;
}

export interface SurveyQuestion {
  id: string;
  questionText: string;
  options: SurveyOption[];
}

export interface CommunitySurvey {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  isPublishedToCitizens: boolean;
  totalResponses: number;
  questions: SurveyQuestion[];
}

export interface SurveyAnswerItem {
  questionId: string;
  questionText: string;
  selectedOptionId: string;
  selectedOptionText: string;
}

export interface CitizenSurveyResponse {
  id: string;
  surveyId: string;
  surveyTitle: string;
  answers: SurveyAnswerItem[];
  selectedOptionsByQuestionId: Record<string, string>;
  createdAt: string;
}

function createSvgDataUrl(svgString: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
}

export const SECTOR_ILLUSTRATIONS: Record<ReportSector, string> = {
  roads: createSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1E3725"/>
          <stop offset="55%" stop-color="#2D4833"/>
          <stop offset="100%" stop-color="#46674D"/>
        </linearGradient>
        <linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#334155"/>
          <stop offset="100%" stop-color="#0F172A"/>
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill="url(#bg)"/>
      <circle cx="680" cy="90" r="48" fill="#C39E5C" opacity="0.35"/>
      <path d="M0 260 Q220 200 420 250 T800 230 L800 450 L0 450 Z" fill="#253F2B" opacity="0.8"/>
      <polygon points="290,240 510,240 690,450 110,450" fill="url(#road)"/>
      <line x1="400" y1="255" x2="400" y2="290" stroke="#F59E0B" stroke-width="8" stroke-linecap="round"/>
      <line x1="400" y1="320" x2="400" y2="365" stroke="#F59E0B" stroke-width="10" stroke-linecap="round"/>
      <line x1="400" y1="395" x2="400" y2="445" stroke="#F59E0B" stroke-width="12" stroke-linecap="round"/>
    </svg>
  `),
  lighting: createSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
      <defs>
        <linearGradient id="night" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0B1711"/>
          <stop offset="60%" stop-color="#1E3725"/>
          <stop offset="100%" stop-color="#2D4833"/>
        </linearGradient>
        <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stop-color="#FDE68A" stop-opacity="0.9"/>
          <stop offset="45%" stop-color="#F59E0B" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#F59E0B" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="800" height="450" fill="url(#night)"/>
      <circle cx="260" cy="150" r="130" fill="url(#glow)"/>
      <circle cx="540" cy="170" r="110" fill="url(#glow)"/>
      <rect x="205" y="135" width="12" height="280" fill="#94A3B8"/>
      <path d="M211 140 Q235 120 265 140" stroke="#94A3B8" stroke-width="8" fill="none"/>
      <ellipse cx="265" cy="145" rx="18" ry="8" fill="#FEF08A"/>
      <rect x="485" y="155" width="10" height="260" fill="#94A3B8"/>
      <path d="M490 160 Q515 142 540 160" stroke="#94A3B8" stroke-width="7" fill="none"/>
      <ellipse cx="540" cy="165" rx="16" ry="7" fill="#FEF08A"/>
      <rect x="0" y="400" width="800" height="50" fill="#0F172A"/>
    </svg>
  `),
  sanitation: createSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
      <defs>
        <linearGradient id="park" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#2D4833"/>
          <stop offset="50%" stop-color="#46674D"/>
          <stop offset="100%" stop-color="#6C9775"/>
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill="url(#park)"/>
      <path d="M0 320 Q260 270 520 320 T800 300 L800 450 L0 450 Z" fill="#1E3725"/>
      <rect x="235" y="240" width="18" height="90" fill="#78350F"/>
      <circle cx="244" cy="200" r="62" fill="#88B793"/>
      <circle cx="215" cy="220" r="45" fill="#A3C9A8"/>
      <rect x="525" y="250" width="16" height="80" fill="#78350F"/>
      <circle cx="533" cy="215" r="54" fill="#88B793"/>
      <rect x="350" y="300" width="110" height="12" rx="4" fill="#D3AA66"/>
      <rect x="360" y="312" width="10" height="25" fill="#78350F"/>
      <rect x="440" y="312" width="10" height="25" fill="#78350F"/>
    </svg>
  `),
  water: createSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
      <defs>
        <linearGradient id="waterbg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#153226"/>
          <stop offset="50%" stop-color="#1E4638"/>
          <stop offset="100%" stop-color="#2D6A54"/>
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill="url(#waterbg)"/>
      <rect x="120" y="210" width="560" height="44" rx="12" fill="#64748B"/>
      <rect x="370" y="150" width="60" height="110" rx="8" fill="#94A3B8"/>
      <circle cx="400" cy="135" r="34" stroke="#E2E8F0" stroke-width="10" fill="none"/>
      <path d="M400 280 C370 330 355 355 355 380 A45 45 0 1 0 445 380 C445 355 430 330 400 280 Z" fill="#38BDF8"/>
    </svg>
  `),
  sewage: createSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
      <defs>
        <linearGradient id="sewagebg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1E293B"/>
          <stop offset="55%" stop-color="#2D4833"/>
          <stop offset="100%" stop-color="#334155"/>
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill="url(#sewagebg)"/>
      <ellipse cx="400" cy="260" rx="170" ry="75" fill="#475569" stroke="#94A3B8" stroke-width="8"/>
      <ellipse cx="400" cy="260" rx="130" ry="52" fill="#1E293B" stroke="#CBD5E1" stroke-width="4" stroke-dasharray="16 10"/>
      <line x1="310" y1="260" x2="490" y2="260" stroke="#94A3B8" stroke-width="6"/>
      <line x1="400" y1="215" x2="400" y2="305" stroke="#94A3B8" stroke-width="6"/>
    </svg>
  `),
  other: createSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
      <defs>
        <linearGradient id="otherbg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1E3725"/>
          <stop offset="100%" stop-color="#46674D"/>
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill="url(#otherbg)"/>
      <circle cx="400" cy="225" r="95" fill="#C39E5C" opacity="0.22"/>
      <circle cx="400" cy="225" r="65" stroke="#E8F4EA" stroke-width="6" fill="none"/>
      <circle cx="400" cy="225" r="24" fill="#E8F4EA"/>
    </svg>
  `),
};

export function formatWhatsAppReportMessage(report: CivicReport): string {
  const sectorAr = SECTOR_META[report.sector]?.ar || 'خدمات عامة';
  const sectorKu = SECTOR_META[report.sector]?.ku || 'خزمەتگوزاری گشتی';
  const urgencyAr = URGENCY_META[report.urgency]?.ar || 'اعتيادي';
  const urgencyKu = URGENCY_META[report.urgency]?.ku || 'ئاسایی';
  const statusAr = STATUS_META[report.status]?.ar || 'قيد المراجعة';
  const statusKu = STATUS_META[report.status]?.ku || 'سکاڵای نوێ';
  const lat = report.latitude ?? report.lat;
  const lng = report.longitude ?? report.lng;

  return [
    `🏛️ *بلاغ رسمي - منصة CAVE BAADRE | سکاڵای فەرمی - سەکۆی CAVE BAADRE*`,
    `━━━━━━━━━━━━━━━━━━`,
    `🇮🇶 *العربية:*`,
    `🔖 *رمز البلاغ:* ${report.trackingCode}`,
    `📌 *عنوان البلاغ:* ${report.title}`,
    `🛠️ *القطاع الخدمي:* ${sectorAr}`,
    `🚨 *الأولوية:* ${urgencyAr}`,
    `📊 *الحالة:* ${statusAr}`,
    `📍 *الموقع:* ناحية باعدرى - ${report.neighborhood} (${report.street})`,
    report.landmark ? `🧭 *نقطة دالة:* ${report.landmark}` : '',
    `👤 *المبلّغ:* ${report.citizenName} (${report.citizenPhone})`,
    `📝 *التفاصيل:* ${report.description}`,
    `━━━━━━━━━━━━━━━━━━`,
    `☀️ *کوردی:*`,
    `🔖 *کۆدی سکاڵا:* ${report.trackingCode}`,
    `📌 *ناونیشانی سکاڵا:* ${report.title}`,
    `🛠️ *کەرتی خزمەتگوزاری:* ${sectorKu}`,
    `🚨 *گرنگی:* ${urgencyKu}`,
    `📊 *دۆخ:* ${statusKu}`,
    `📍 *شوێن:* ناحیەی باعەدرێ - ${report.neighborhood} (${report.street})`,
    report.landmark ? `🧭 *نیشانەی نزیک:* ${report.landmark}` : '',
    `👤 *ناوی سکاڵاکار:* ${report.citizenName} (${report.citizenPhone})`,
    `📝 *وردەکاری:* ${report.description}`,
    `━━━━━━━━━━━━━━━━━━`,
    `🌐 *GPS:* https://www.google.com/maps?q=${lat},${lng}`,
    `✨ CAVE BAADRE • SMART BAADRÊ EYE`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildMunicipalWhatsAppUrl(report: CivicReport): string {
  const message = formatWhatsAppReportMessage(report);
  return `https://wa.me/${MUNICIPAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}



