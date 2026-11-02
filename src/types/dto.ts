import { UserRole, UserProfileDocument } from './auth';
import { CivicReport, ReportSector, ReportStatus, ReportUrgency } from './baadre';

/**
 * 1. CitizenProfileDTO
 * Returned to the citizen for their own personal profile.
 * Contains only their personal identity and account details.
 * Strictly excludes: passwords, recovery codes, cryptographic keys, admin audit notes.
 */
export interface CitizenProfileDTO {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  role: UserRole;
  neighborhood?: string;
  reportsSubmittedCount: number;
  resolvedReportsCount: number;
  joinedAt: string;
  isBlocked: boolean;
}

/**
 * 2. AdminCitizenDTO
 * Returned to authorized Administrators & Super Administrators in the citizens directory.
 * Contains contact information, activity count, neighborhood, and system role.
 * Strictly excludes: passwords, recovery codes, encryption keys, private session tokens.
 */
export interface AdminCitizenDTO {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  role: UserRole;
  neighborhood: string;
  reportsSubmittedCount: number;
  resolvedReportsCount: number;
  joinedAt: string;
  isBlocked: boolean;
  hasRecoveryCodeConfigured?: boolean; // Boolean flag only, NEVER the code itself!
}

/**
 * 3. ReportDTO
 * Clean representation of a civic incident report.
 * Strictly excludes: internal security tokens, unhashed secrets.
 */
export interface ReportDTO {
  id: string;
  trackingCode: string;
  title: string;
  description: string;
  sector: ReportSector;
  status: ReportStatus;
  logicalStatus: 'new' | 'sent' | 'completed' | 'rejected';
  urgency: ReportUrgency;
  neighborhood: string;
  street?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  citizenId: string;
  ownerUid: string;
  citizenName: string;
  citizenPhone: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  responseTimeHours?: number;
  assignedTeam?: string;
  officialNote?: string;
  adminNotes?: string;
  images: string[];
  resolvedImages?: string[];
  isOpened?: boolean;
  openedAt?: string;
  upvotes?: number;
}

/**
 * 4. AuthUserDTO
 * Returned to the client upon authentication state change.
 * Identifies the current authenticated session and its assigned verified role.
 */
export interface AuthUserDTO {
  uid: string;
  email: string | null;
  displayName: string | null;
  phone?: string | null;
  role: UserRole;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isCitizen: boolean;
  tokenRefreshedAt?: string;
}

/**
 * DTO Mappers - Zero Leakage Principle
 */
export function toCitizenProfileDTO(doc: UserProfileDocument): CitizenProfileDTO {
  return {
    uid: doc.uid,
    fullName: doc.fullName || '',
    email: doc.email || '',
    phone: doc.phone || '',
    birthDate: doc.birthDate || '',
    role: 'citizen',
    neighborhood: doc.neighborhood || '',
    reportsSubmittedCount: doc.reportsSubmittedCount || 0,
    resolvedReportsCount: doc.resolvedReportsCount || 0,
    joinedAt: doc.createdAt || new Date().toISOString(),
    isBlocked: Boolean(doc.isBlocked),
  };
}

export function toAdminCitizenDTO(
  doc: UserProfileDocument,
  hasRecoveryCode = false
): AdminCitizenDTO {
  return {
    uid: doc.uid,
    fullName: doc.fullName || '',
    email: doc.email || '',
    phone: doc.phone || '',
    birthDate: doc.birthDate || '',
    role: doc.role || 'citizen',
    neighborhood: doc.neighborhood || 'ناحية باعدرى',
    reportsSubmittedCount: doc.reportsSubmittedCount || 0,
    resolvedReportsCount: doc.resolvedReportsCount || 0,
    joinedAt: doc.createdAt || new Date().toISOString(),
    isBlocked: Boolean(doc.isBlocked),
    hasRecoveryCodeConfigured: hasRecoveryCode,
  };
}

export function mapReportStatusToLogical(
  status: ReportStatus | string
): 'new' | 'sent' | 'completed' | 'rejected' {
  if (status === 'pending' || status === 'new') return 'new';
  if (status === 'in_progress' || status === 'sent') return 'sent';
  if (status === 'resolved' || status === 'completed') return 'completed';
  return 'rejected';
}

export function toReportDTO(report: CivicReport): ReportDTO {
  const owner = String(report.ownerUid || report.citizenId || '');
  return {
    id: String(report.id),
    trackingCode: report.trackingCode,
    title: report.title,
    description: report.description,
    sector: report.sector,
    status: report.status,
    logicalStatus: mapReportStatusToLogical(report.status),
    urgency: report.urgency,
    neighborhood: report.neighborhood,
    street: report.street,
    landmark: report.landmark,
    latitude: report.latitude,
    longitude: report.longitude,
    citizenId: owner,
    ownerUid: owner,
    citizenName: report.citizenName,
    citizenPhone: report.citizenPhone,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    resolvedAt: report.resolvedAt,
    responseTimeHours: report.responseTimeHours,
    assignedTeam: report.assignedTeam,
    officialNote: report.officialNote,
    adminNotes: report.adminNotes,
    images: Array.isArray(report.images) ? report.images : [],
    resolvedImages: Array.isArray(report.resolvedImages) ? report.resolvedImages : [],
    isOpened: report.isOpened,
    openedAt: report.openedAt,
    upvotes: report.upvotes,
  };
}

/**
 * 5. NewReportNotificationPayloadDTO
 * Strictly sanitized notification payload sent via FCM to all Admin & Super Admin accounts.
 * Contains ONLY:
 * - عنوان البلاغ (title)
 * - نوع البلاغ (sector / sectorLabelAr)
 * - تاريخ البلاغ (createdAt)
 * - معرف البلاغ (reportId / trackingCode)
 * Strictly excludes ALL sensitive PII (citizenName, citizenPhone, citizenWhatsapp, email, etc.).
 */
export interface NewReportNotificationPayloadDTO {
  reportId: string;
  trackingCode: string;
  title: string;
  sector: ReportSector;
  sectorLabelAr: string;
  createdAt: string;
  clickUrl: string;
}

const SECTOR_AR_LABELS: Record<ReportSector, string> = {
  roads: 'الشوارع والطرق',
  sewage: 'الشبكات والمجاري',
  sanitation: 'الحدائق والنظافة',
  lighting: 'الإنارة والأعمدة',
  water: 'شبكات المياه',
  other: 'خدمات بلدية أخرى',
};

export function toNewReportNotificationPayloadDTO(
  report: Pick<CivicReport, 'id' | 'trackingCode' | 'title' | 'sector' | 'createdAt'>
): NewReportNotificationPayloadDTO {
  const cleanId = String(report.id || '').trim();
  const cleanSector = (report.sector || 'other') as ReportSector;
  return {
    reportId: cleanId,
    trackingCode: String(report.trackingCode || cleanId).trim(),
    title: String(report.title || 'بلاغ جديد').trim().slice(0, 140),
    sector: cleanSector,
    sectorLabelAr: SECTOR_AR_LABELS[cleanSector] || 'خدمات عامة',
    createdAt: String(report.createdAt || new Date().toISOString()),
    clickUrl: `/?reportId=${encodeURIComponent(cleanId)}`,
  };
}

