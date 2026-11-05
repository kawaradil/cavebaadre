import React, { useState } from 'react';
import {
  ClipboardList,
  BarChart3,
  Building2,
  Search,
  AlertTriangle,
  CheckCircle2,
  Phone,
  MessageCircle,
  Wrench,
  MapPin,
  ShieldCheck,
  TrendingUp,
  Eye,
  Trash2,
  Check,
  Users,
  Activity,
  UserCheck,
  Briefcase,
  Plus,
  Ban,
  Unlock,
  X,
  UserCog,
  Send,
  HelpCircle,
  Key,
  Shield,
  ShieldAlert,
  Lock,
  Mail,
  Calendar,
  UserPlus,
  ChevronDown,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useBaadre } from '../context/BaadreContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { RoleManagementModal } from './RoleManagementModal';
import { AdminRecoveryCodeModal } from './AdminRecoveryCodeModal';
import { authService } from '../services/authService';
import { AdminCitizenDTO, toAdminCitizenDTO } from '../types/dto';
import { UserProfileDocument, UserRole } from '../types/auth';
import {
  CivicReport,
  SECTOR_META,
  STATUS_META,
  URGENCY_META,
  ReportSector,
  ReportStatus,
  MunicipalDepartment,
  isReportUrgencyConfirmed,
  isReportOpened,
} from '../types/baadre';
import { OrganizationProjectsView } from './OrganizationProjectsView';
import { SmartAdaptiveImage } from './SmartAdaptiveImage';
import {
  FIELD_LIMITS,
  enforceInputLimit,
  enforcePhoneLimit,
  FieldLimitBadge,
} from '../lib/inputLimits';
import { playClickSound, playSuccessSound } from '../lib/sound';

const formatWaNumberHelper = (phoneStr?: string) => {
  if (!phoneStr) return '9647504738358';
  const digits = phoneStr.replace(/\D/g, '');
  if (digits.startsWith('964')) return digits;
  if (digits.startsWith('0')) return `964${digits.slice(1)}`;
  return `964${digits}`;
};

interface CitizenAccordionCardProps {
  cit: AdminCitizenDTO;
  currentUser: any;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isRTL: boolean;
  tr: (ar: string, ku: string, en: string) => string;
  onSelectForRole: (cit: AdminCitizenDTO) => void;
  onGrantAdminDirect: (cit: AdminCitizenDTO) => void;
  onRevertCitizenDirect: (cit: AdminCitizenDTO) => void;
  onSelectForRecovery: (cit: AdminCitizenDTO) => void;
  onToggleBlock: (citId: string) => void;
}

const CitizenAccordionCard: React.FC<CitizenAccordionCardProps> = ({
  cit,
  currentUser,
  isAdmin,
  isSuperAdmin,
  isRTL,
  tr,
  onSelectForRole,
  onGrantAdminDirect,
  onRevertCitizenDirect,
  onSelectForRecovery,
  onToggleBlock,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const displayName = cit.fullName || (cit as any).name || 'مواطن';
  const citId = cit.uid || (cit as any).id;
  const isProtectedSuperAdmin =
    cit.role === 'super_admin' && (!isSuperAdmin || currentUser?.uid !== cit.uid);
  const joinedDateFormatted = (() => {
    if (!cit.joinedAt) return '—';
    const d = new Date(cit.joinedAt);
    if (Number.isNaN(d.getTime())) return cit.joinedAt.slice(0, 10);
    return d.toISOString().slice(0, 10);
  })();

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`rounded-3xl bg-white border border-[#E8F4EA] shadow-[0_8px_24px_rgba(70,103,77,0.06)] hover:shadow-[0_12px_32px_rgba(70,103,77,0.1)] transition-all overflow-hidden ${
        isRTL ? 'text-right' : 'text-left'
      }`}
    >
      {/* 1. رأس الأكورديون (Accordion Header): يحمل فقط الإيميل والدور والزر التفاعلي */}
      <button
        type="button"
        onClick={() => {
          playClickSound();
          setIsOpen((prev) => !prev);
        }}
        className={`w-full p-4 flex items-center justify-between gap-3 text-start cursor-pointer transition-colors ${
          isOpen ? 'bg-[#F4F9F5]/70' : 'bg-white hover:bg-[#F4F9F5]/40'
        }`}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* أيقونة الدور */}
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs transition-colors ${
              cit.role === 'super_admin'
                ? 'bg-[#E8F4EA] text-[#1E3725]'
                : cit.role === 'admin'
                ? 'bg-[#E8F4EA] text-[#46674D]'
                : 'bg-[#F4F9F5] text-[#46674D]'
            }`}
          >
            {cit.role === 'super_admin' ? (
              <ShieldAlert className="w-5 h-5" />
            ) : cit.role === 'admin' ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <Users className="w-5 h-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            {/* البريد الإلكتروني */}
            <div className="flex items-center gap-1.5 truncate">
              <Mail className="w-3.5 h-3.5 text-[#46674D] shrink-0" />
              <bdi
                dir="ltr"
                className="text-xs sm:text-sm font-black font-mono text-[#1E3725] truncate"
              >
                {cit.email || '—'}
              </bdi>
            </div>

            {/* الاسم الثلاثي بشكل لطيف تحت الإيميل */}
            <p className="text-xs font-bold text-[#2D4833] truncate mt-0.5">
              <bdi>{displayName}</bdi>
            </p>

            {/* الدور والحالة بدون إطارات */}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black border-0 ${
                  cit.role === 'super_admin'
                    ? 'bg-[#1E3725] text-white shadow-2xs'
                    : cit.role === 'admin'
                    ? 'bg-[#46674D] text-white shadow-2xs'
                    : 'bg-[#E8F4EA] text-[#2D4833]'
                }`}
              >
                {cit.role === 'super_admin'
                  ? tr('سوبر أدمن', 'سوپەر ئەدمین', 'Super Admin')
                  : cit.role === 'admin'
                  ? tr('مسؤول (أدمن)', 'بەڕێوەبەر', 'Admin')
                  : tr('مواطن مسجل', 'هاووڵاتی تۆمارکراو', 'Registered Citizen')}
              </span>

              {cit.isBlocked && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-600 border-0">
                  {tr('محظور', 'بلۆککراو', 'Blocked')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* سهم فتح وإغلاق الأكورديون */}
        <div className="flex items-center gap-1 shrink-0">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-transform duration-300 ${
              isOpen
                ? 'bg-[#1E3725] text-white rotate-180'
                : 'bg-[#F4F9F5] text-[#46674D]'
            }`}
          >
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </button>

      {/* 2. تفاصيل الحساب: لا تظهر ولا تُحمّل إلا بعد فتح الأكورديون */}
      {isOpen && (
        <div className="p-4 pt-2 border-t border-[#E8F4EA] space-y-3.5 bg-white">
          {/* الاسم وأزرار الاتصال المباشر */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-[#46674D] block">
                {tr('الاسم الكامل للمواطن:', 'ناوی تەواوی هاووڵاتی:', 'Citizen Full Name:')}
              </span>
              <h4 className="font-black text-sm text-[#1E3725] truncate">
                <bdi>{displayName}</bdi>
              </h4>
            </div>

            {cit.phone && (
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={`tel:${cit.phone}`}
                  className="p-2 rounded-xl bg-[#F4F9F5] text-[#46674D] hover:bg-[#E8F4EA] transition-all"
                  title={tr('اتصال هاتفي', 'پەیوەندیکردن', 'Call Citizen')}
                >
                  <Phone className="w-4 h-4" />
                </a>
                <a
                  href={`https://wa.me/${formatWaNumberHelper(cit.phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-[#E8F4EA] text-[#46674D] hover:bg-[#46674D] hover:text-white transition-all"
                  title={tr(
                    'تواصل مباشر عبر واتساب',
                    'پەیوەندی ڕاستەوخۆ بە واتسئەپ',
                    'Direct WhatsApp Contact'
                  )}
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>

          {/* صندوق تفاصيل الحساب الكاملة */}
          <div
            dir={isRTL ? 'rtl' : 'ltr'}
            className={`p-3.5 rounded-2xl bg-[#F4F9F5]/95 border border-[#E8F4EA] space-y-2 text-xs ${
              isRTL ? 'text-right' : 'text-left'
            }`}
          >
            {/* الموبايل */}
            <div className="flex items-center justify-start gap-2 pb-1.5 border-b border-[#E2EFE5]">
              <span className="text-[11px] font-bold text-[#46674D] inline-flex items-center gap-1.5 shrink-0">
                <Phone className="w-3.5 h-3.5 shrink-0 text-[#46674D]" />
                <span>{tr('الموبايل:', 'مۆبایل:', 'Phone:')}</span>
              </span>
              <bdi
                className="font-mono font-black text-[#1E3725] text-[11px] tabular-nums"
                dir="ltr"
              >
                {cit.phone || '—'}
              </bdi>
            </div>

            {/* تاريخ الميلاد */}
            <div className="flex items-center justify-start gap-2 pb-1.5 border-b border-[#E2EFE5]">
              <span className="text-[11px] font-bold text-[#46674D] inline-flex items-center gap-1.5 shrink-0">
                <Calendar className="w-3.5 h-3.5 shrink-0 text-[#46674D]" />
                <span>{tr('تاريخ الميلاد:', 'لەدایکبوون:', 'Birth Date:')}</span>
              </span>
              <bdi
                className="text-[11px] font-mono font-black text-[#1E3725] tabular-nums"
                dir="ltr"
              >
                {cit.birthDate || '—'}
              </bdi>
            </div>

            {/* تاريخ التسجيل */}
            <div className="flex items-center justify-start gap-2 pb-1.5 border-b border-[#E2EFE5]">
              <span className="text-[11px] font-bold text-[#46674D] inline-flex items-center gap-1.5 shrink-0">
                <Calendar className="w-3.5 h-3.5 shrink-0 text-[#46674D]" />
                <span>{tr('تاريخ التسجيل:', 'بەرواری تۆمار:', 'Joined Date:')}</span>
              </span>
              <bdi
                className="text-[11px] font-mono font-black text-[#1E3725] tabular-nums"
                dir="ltr"
              >
                {joinedDateFormatted}
              </bdi>
            </div>

            {/* الموقع وملخص البلاغات */}
            <div className="pt-0.5 flex items-center justify-between gap-2 text-[11px] font-bold text-[#1E3725]">
              <span className="inline-flex items-center gap-1.5 text-[#46674D] truncate">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-[#46674D]" />
                <span className="font-black text-[#1E3725] truncate">
                  {cit.neighborhood || tr('ناحية باعدرى', 'ناحیا باعەدرێ', 'Baadre')}
                </span>
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="px-2 py-0.5 rounded-lg bg-white border border-[#E8F4EA] text-[#1E3725] font-black">
                  {cit.reportsSubmittedCount} {tr('بلاغ', 'سکاڵا', 'reports')}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-[#E8F4EA] text-[#1E3725] font-black">
                  {cit.resolvedReportsCount} {tr('منجز', 'ئەنجامدراو', 'resolved')}
                </span>
              </div>
            </div>
          </div>

          {/* إدارة الدور والصلاحيات والحظر (متاحة للسوبر أدمن وللأدمن لتحويل المواطن إلى أدمن واسترجاعه إلى مواطن) */}
          {(isSuperAdmin || isAdmin) && (
            <div className="space-y-2 pt-1">
              {cit.role === 'citizen' && (
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onGrantAdminDirect(cit);
                  }}
                  className="w-full py-2.5 px-3.5 rounded-2xl bg-[#46674D] hover:bg-[#36593F] text-white text-xs font-black flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>
                    {tr(
                      'منح صلاحية أدمن',
                      'پێدانی دەسەڵاتی ئەدمین',
                      'Grant Admin Role'
                    )}
                  </span>
                </button>
              )}

              {cit.role === 'admin' && currentUser?.uid !== cit.uid && (
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onRevertCitizenDirect(cit);
                  }}
                  className="w-full py-2.5 px-3.5 rounded-2xl bg-[#E8F4EA] hover:bg-[#D4EADB] text-[#1E3725] text-xs font-black flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <UserCog className="w-4 h-4 text-[#46674D]" />
                  <span>
                    {tr(
                      'استرجاع إلى مواطن',
                      'گەڕاندنەوە بۆ هاووڵاتی',
                      'Revert to Citizen'
                    )}
                  </span>
                </button>
              )}

              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                {isProtectedSuperAdmin ? (
                  <div
                    className="px-2.5 py-1.5 rounded-xl bg-[#F4F9F5] text-[#46674D] text-[10px] font-bold flex items-center gap-1 cursor-not-allowed"
                    title={tr(
                      'سوبر أدمن محمي - لا يمكن تعديل أو تخفيض صلاحيات سوبر أدمن',
                      'سوپەر ئەدمینی پارێزراو',
                      'Protected Super Admin'
                    )}
                  >
                    <Lock className="w-3 h-3" />
                    <span>{tr('سوبر أدمن (محمي)', 'پارێزراو', 'Protected')}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      onSelectForRole(cit);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#E8F4EA] hover:bg-[#D4EADB] text-[#1E3725] text-[11px] font-black flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-[#46674D]" />
                    <span>{tr('تغيير الدور', 'گۆڕینی ڕۆڵ', 'Change Role')}</span>
                  </button>
                )}

                {isSuperAdmin &&
                  (cit.role === 'admin' ||
                    (cit.role === 'super_admin' && currentUser?.uid === cit.uid)) && (
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        onSelectForRecovery(cit);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-black flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Key className="w-3.5 h-3.5 text-amber-700" />
                      <span>{tr('الرمز', 'کۆد', 'Code')}</span>
                    </button>
                  )}

                {!isProtectedSuperAdmin &&
                  cit.role !== 'super_admin' &&
                  (isSuperAdmin || cit.role === 'citizen') && (
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        onToggleBlock(citId);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                        cit.isBlocked
                          ? 'bg-[#46674D] text-white'
                          : 'bg-[#F4F9F5] text-rose-600 hover:bg-rose-50'
                      }`}
                    >
                      {cit.isBlocked ? (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>{tr('إلغاء الحظر', 'لادانی بلۆک', 'Unblock')}</span>
                        </>
                      ) : (
                        <>
                          <Ban className="w-3.5 h-3.5" />
                          <span>{tr('حظر', 'بلۆک', 'Block')}</span>
                        </>
                      )}
                    </button>
                  )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface DepartmentAccordionCardProps {
  dept: MunicipalDepartment;
  isRTL: boolean;
  tr: (ar: string, ku: string, en: string) => string;
  completedCount: number;
  displayName: string;
  formatWaNumber: (num: string) => string;
  onDeleteDept: (dept: MunicipalDepartment) => void;
}

const DepartmentAccordionCard: React.FC<DepartmentAccordionCardProps> = ({
  dept,
  isRTL,
  tr,
  completedCount,
  displayName,
  formatWaNumber,
  onDeleteDept,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const engPhone = dept.engineerPhone || dept.phone || '07504738358';
  const engName = dept.engineerName || dept.headName || tr('المهندس المختص', 'ئەندازیاری تایبەتمەند', 'Specialist Engineer');

  const depName = dept.deputyName || tr('معاون المدير', 'یاریدەدەری بەڕێوەبەر', 'Deputy Director');
  const depPhone = dept.deputyPhone || dept.phone || '07504738358';

  const mgrName = dept.managerName || dept.headName || tr('مدير الدائرة', 'بەڕێوەبەری فەرمانگە', 'Department Director');
  const mgrPhone = dept.managerPhone || dept.emergencyPhone || '07504738358';

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`rounded-3xl bg-white border border-[#E8F4EA] shadow-[0_8px_24px_rgba(70,103,77,0.06)] hover:shadow-[0_12px_32px_rgba(70,103,77,0.1)] transition-all overflow-hidden ${
        isRTL ? 'text-right' : 'text-left'
      }`}
    >
      {/* 1. رأس الأكورديون (Accordion Header): اسم الدائرة وعدد الأعمال والسهم */}
      <button
        type="button"
        onClick={() => {
          playClickSound();
          setIsOpen((prev) => !prev);
        }}
        className={`w-full p-4 flex items-center justify-between gap-3 text-start cursor-pointer transition-colors ${
          isOpen ? 'bg-[#F4F9F5]/70' : 'bg-white hover:bg-[#F4F9F5]/40'
        }`}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-2xl bg-[#E8F4EA] text-[#46674D] flex items-center justify-center shrink-0 shadow-xs">
            <Building2 className="w-5 h-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-sm sm:text-base font-black text-[#1E3725] leading-snug truncate">
              <bdi>{displayName}</bdi>
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#E8F4EA] text-[#2D4833] border-0">
                {completedCount} {tr('عمل منجز', 'کاری ئەنجامدراو', 'completed')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-transform duration-300 ${
              isOpen
                ? 'bg-[#1E3725] text-white rotate-180'
                : 'bg-[#F4F9F5] text-[#46674D]'
            }`}
          >
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </button>

      {/* 2. تفاصيل الدائرة تظهر عند فتح الأكورديون فقط */}
      {isOpen && (
        <div className="p-4 pt-2 border-t border-[#E8F4EA] space-y-3 bg-white">
          {/* المهندس المختص */}
          <div className="p-3 rounded-2xl bg-[#F4F9F5] flex items-center justify-between gap-3">
            <div className={`min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
              <span className="text-[10px] font-black text-[#46674D] block">
                {tr('المهندس المختص', 'ئەندازیاری تایبەتمەند', 'Specialist Engineer')}
              </span>
              <p className="text-xs sm:text-sm font-black text-[#1E3725] truncate mt-0.5">
                <bdi>{engName}</bdi>
              </p>
              <bdi className="text-xs font-mono font-bold text-[#2D4833] block mt-0.5" dir="ltr">
                {engPhone}
              </bdi>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={`tel:${engPhone}`}
                className="p-2 rounded-xl bg-white text-[#46674D] hover:bg-[#E8F4EA] transition-colors"
                title={tr('اتصال بالمهندس', 'پەیوەندیکردن بە ئەندازیار', 'Call Engineer')}
              >
                <Phone className="w-4 h-4" />
              </a>
              <a
                href={`https://wa.me/${formatWaNumber(engPhone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-[#46674D] text-white hover:bg-[#36593F] transition-colors"
                title={tr('واتساب المهندس', 'واتسئەپی ئەندازیار', 'WhatsApp Engineer')}
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* معاون المدير */}
          <div className="p-3 rounded-2xl bg-[#F4F9F5] flex items-center justify-between gap-3">
            <div className={`min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
              <span className="text-[10px] font-black text-[#46674D] block">
                {tr('معاون المدير', 'یاریدەدەری بەڕێوەبەر', 'Deputy Director')}
              </span>
              <p className="text-xs sm:text-sm font-black text-[#1E3725] truncate mt-0.5">
                <bdi>{depName}</bdi>
              </p>
              <bdi className="text-xs font-mono font-bold text-[#2D4833] block mt-0.5" dir="ltr">
                {depPhone}
              </bdi>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={`tel:${depPhone}`}
                className="p-2 rounded-xl bg-white text-[#46674D] hover:bg-[#E8F4EA] transition-colors"
                title={tr('اتصال بالمعاون', 'پەیوەندیکردن بە یاریدەدەر', 'Call Deputy')}
              >
                <Phone className="w-4 h-4" />
              </a>
              <a
                href={`https://wa.me/${formatWaNumber(depPhone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-[#46674D] text-white hover:bg-[#36593F] transition-colors"
                title={tr('واتساب المعاون', 'واتسئەپی یاریدەدەر', 'WhatsApp Deputy')}
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* مدير الدائرة */}
          <div className="p-3 rounded-2xl bg-[#F4F9F5] flex items-center justify-between gap-3">
            <div className={`min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
              <span className="text-[10px] font-black text-[#46674D] block">
                {tr('مدير الدائرة', 'بەڕێوەبەری فەرمانگە', 'Department Director')}
              </span>
              <p className="text-xs sm:text-sm font-black text-[#1E3725] truncate mt-0.5">
                <bdi>{mgrName}</bdi>
              </p>
              <bdi className="text-xs font-mono font-bold text-[#2D4833] block mt-0.5" dir="ltr">
                {mgrPhone}
              </bdi>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={`tel:${mgrPhone}`}
                className="p-2 rounded-xl bg-white text-[#46674D] hover:bg-[#E8F4EA] transition-colors"
                title={tr('اتصال بالمدير', 'پەیوەندیکردن بە بەڕێوەبەر', 'Call Director')}
              >
                <Phone className="w-4 h-4" />
              </a>
              <a
                href={`https://wa.me/${formatWaNumber(mgrPhone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-[#46674D] text-white hover:bg-[#36593F] transition-colors"
                title={tr('واتساب المدير', 'واتسئەپی بەڕێوەبەر', 'WhatsApp Director')}
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* زر حذف الدائرة */}
          <div className="flex items-center justify-end pt-1">
            <button
              type="button"
              onClick={() => onDeleteDept(dept)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-black inline-flex items-center gap-1.5 transition-colors cursor-pointer border-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{tr('حذف الدائرة', 'سڕینەوەی فەرمانگە', 'Delete Department')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface MunicipalControlDashboardProps {
  onSelectReport: (report: CivicReport) => void;
  onOpenAddProject?: () => void;
}

export const MunicipalControlDashboard: React.FC<MunicipalControlDashboardProps> = ({
  onSelectReport,
  onOpenAddProject,
}) => {
  const {
    reports,
    departments,
    citizens,
    projects,
    surveys,
    surveyResponses,
    adminTab,
    setAdminTab,
    setIsSurveysViewOpen,
    metrics,
    updateReportStatus,
    deleteReport,
    addDepartment,
    deleteDepartment,
    toggleBlockCitizen,
    setIsAddProjectOpen,
    loadMoreReports,
    hasMoreReports,
    reportsLimitCount,
  } = useBaadre();
  const { language, isRTL } = useLanguage();
  const { currentUser, isSuperAdmin, isAdmin } = useAuth();

  const [reportToDelete, setReportToDelete] = useState<CivicReport | null>(null);
  const [deptToDelete, setDeptToDelete] = useState<MunicipalDepartment | null>(null);
  const [selectedCitizenForRole, setSelectedCitizenForRole] = useState<AdminCitizenDTO | null>(null);
  const [directRoleTarget, setDirectRoleTarget] = useState<{
    cit: AdminCitizenDTO;
    role: UserRole;
  } | null>(null);
  const [selectedAdminForRecovery, setSelectedAdminForRecovery] = useState<AdminCitizenDTO | null>(null);
  const [registeredUsersList, setRegisteredUsersList] = useState<AdminCitizenDTO[]>(() => {
    try {
      const raw = localStorage.getItem('cave_baadre_persisted_registered_users_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const canAccessAdmin = Boolean(currentUser && (isAdmin || isSuperAdmin));

  // Fetch remote registered users with verified RBAC roles + real-time Firestore listener on users collection
  React.useEffect(() => {
    if (!currentUser || !canAccessAdmin) {
      setRegisteredUsersList([]);
      return;
    }

    authService
      .fetchCitizensList(currentUser)
      .then((users) => {
        if (users && users.length > 0) {
          setRegisteredUsersList(users);
          try {
            localStorage.setItem('cave_baadre_persisted_registered_users_v1', JSON.stringify(users.slice(0, 100)));
          } catch {}
        }
      })
      .catch(() => {});

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const liveUsers: AdminCitizenDTO[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as UserProfileDocument;
          const uid = docSnap.id;
          const isDesig = data.email?.trim().toLowerCase() === '11kattak11@gmail.com';
          const effectiveRole: UserRole = isDesig ? 'super_admin' : data.role || 'citizen';
          liveUsers.push(
            toAdminCitizenDTO(
              {
                ...data,
                uid,
                fullName: isDesig ? 'كاوار عادل طاهر' : data.fullName || 'مواطن مسجل',
                role: effectiveRole,
              },
              effectiveRole === 'admin' || effectiveRole === 'super_admin'
            )
          );
        });
        if (liveUsers.length > 0) {
          setRegisteredUsersList(liveUsers);
          try {
            localStorage.setItem('cave_baadre_persisted_registered_users_v1', JSON.stringify(liveUsers.slice(0, 100)));
          } catch {}
        }
      },
      () => {}
    );

    return () => {
      unsubUsers();
    };
  }, [currentUser, isAdmin, isSuperAdmin]);

  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

  const getSectorLabel = (secKey: ReportSector) => {
    const sec = SECTOR_META[secKey];
    if (!sec) return secKey;
    return language === 'ku' ? sec.ku : language === 'en' ? sec.en : sec.ar;
  };

  const getUrgencyLabel = (urgKey: CivicReport['urgency']) => {
    const urg = URGENCY_META[urgKey];
    if (!urg) return urgKey;
    return language === 'ku' ? urg.ku : language === 'en' ? urg.en : urg.ar;
  };

  const getDeptDisplayName = (dept: MunicipalDepartment) => {
    if (language === 'ku') return dept.nameKu || dept.nameAr;
    if (language === 'en') return dept.nameEn || dept.nameAr;
    return dept.nameAr;
  };

  // Search & Edit states
  const [adminSectorFilter, setAdminSectorFilter] = useState<'ALL' | ReportSector>('ALL');
  const [adminSearch, setAdminSearch] = useState('');
  const [deptSearch, setDeptSearch] = useState('');
  const [citizenSearch, setCitizenSearch] = useState('');
  const [directoryChip, setDirectoryChip] = useState<'departments' | 'citizens'>('departments');

  // Add Department Form State
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptSector, setNewDeptSector] = useState<ReportSector>('roads');
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerPhone, setNewManagerPhone] = useState('');
  const [newDeputyName, setNewDeputyName] = useState('');
  const [newDeputyPhone, setNewDeputyPhone] = useState('');
  const [newEngineerName, setNewEngineerName] = useState('');
  const [newEngineerPhone, setNewEngineerPhone] = useState('');

  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [tempStatus, setTempStatus] = useState<ReportStatus>('in_progress');
  const [tempTeam, setTempTeam] = useState('');
  const [tempNote, setTempNote] = useState('');
  const [savedBannerId, setSavedBannerId] = useState<string | null>(null);
  const [adminVisibleReportsCount, setAdminVisibleReportsCount] = useState<number>(12);
  const [adminVisibleCitizensCount, setAdminVisibleCitizensCount] = useState<number>(12);

  const activeIncomingReports = React.useMemo(() => {
    return reports.filter((r) => {
      if (adminSectorFilter !== 'ALL' && r.sector !== adminSectorFilter) return false;
      if (adminSearch.trim() !== '') {
        const q = adminSearch.trim().toLowerCase();
        const matchCode = r.trackingCode.toLowerCase().includes(q);
        const matchCitizen = r.citizenName.toLowerCase().includes(q);
        const matchNeighborhood = r.neighborhood.toLowerCase().includes(q);
        const matchTitle = r.title.toLowerCase().includes(q);
        if (!matchCode && !matchCitizen && !matchNeighborhood && !matchTitle) return false;
      }
      return true;
    });
  }, [reports, adminSectorFilter, adminSearch]);

  const filteredDepartments = React.useMemo(() => {
    if (!deptSearch.trim()) return departments;
    const q = deptSearch.trim().toLowerCase();
    return departments.filter(
      (d) =>
        d.nameAr.toLowerCase().includes(q) ||
        (d.nameKu && d.nameKu.toLowerCase().includes(q)) ||
        (d.nameEn && d.nameEn.toLowerCase().includes(q)) ||
        (d.engineerName && d.engineerName.toLowerCase().includes(q)) ||
        (d.engineerPhone && d.engineerPhone.includes(q)) ||
        (d.deputyName && d.deputyName.toLowerCase().includes(q)) ||
        (d.deputyPhone && d.deputyPhone.includes(q)) ||
        (d.managerName && d.managerName.toLowerCase().includes(q)) ||
        (d.managerPhone && d.managerPhone.includes(q)) ||
        d.phone.includes(q)
    );
  }, [departments, deptSearch]);

  // إجماليات الداشبورد المتعلقة بحالات البلاغات تُحسب مباشرة من كروت البلاغات حسب الحالة الموجودة عليها
  const reportCardTotals = React.useMemo(() => {
    const total = reports.length;
    const pending = reports.filter((rep) => rep.status === 'pending').length;
    const resolved = reports.filter((rep) => rep.status === 'resolved').length;
    const rejected = reports.filter((rep) => rep.status === 'rejected').length;
    const inProgress = reports.filter(
      (rep) =>
        rep.status !== 'pending' &&
        rep.status !== 'resolved' &&
        rep.status !== 'rejected'
    ).length;
    const emergency = reports.filter(
      (rep) => isReportUrgencyConfirmed(rep) && rep.urgency === 'emergency'
    ).length;
    const completionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const reportingCitizens = new Set(
      reports
        .map((rep) => (rep.citizenPhone || rep.citizenName || rep.id).trim().toLowerCase())
        .filter(Boolean)
    ).size;

    return {
      total,
      pending,
      resolved,
      rejected,
      inProgress,
      emergency,
      completionRate,
      reportingCitizens,
    };
  }, [reports]);

  const generalSurveyStats = React.useMemo(() => {
    const totalSurveys = surveys.length;
    const publishedCount = surveys.filter((s) => s.isPublishedToCitizens).length;
    const totalResponses = Math.max(
      surveyResponses.length,
      surveys.reduce((acc, s) => acc + (s.totalResponses || 0), 0)
    );
    const totalQuestions = surveys.reduce((acc, s) => acc + s.questions.length, 0);
    return {
      totalSurveys,
      publishedCount,
      totalResponses,
      totalQuestions,
    };
  }, [surveys, surveyResponses]);

  const getDepartmentCompletedCount = React.useCallback(
    (dept: MunicipalDepartment) => {
      return reports.filter(
        (r) =>
          r.status === 'resolved' &&
          (r.assignedDepartmentId === dept.id ||
            r.assignedTeam === dept.nameAr ||
            r.assignedTeam === dept.fieldTeamName ||
            r.sector === dept.sector)
      ).length;
    },
    [reports]
  );

  const filteredCitizens = React.useMemo<AdminCitizenDTO[]>(() => {
    const submittedByUid: Record<string, number> = {};
    const resolvedByUid: Record<string, number> = {};

    reports.forEach((r) => {
      const owner = String(r.ownerUid || r.citizenId || '').trim();
      if (owner) {
        submittedByUid[owner] = (submittedByUid[owner] || 0) + 1;
        if (r.status === 'resolved') {
          resolvedByUid[owner] = (resolvedByUid[owner] || 0) + 1;
        }
      }
    });

    const mergedMap = new Map<string, AdminCitizenDTO>();

    // 1. Registered users from users collection (primary source of truth for app accounts)
    registeredUsersList.forEach((ru) => {
      const cMatch = citizens.find(
        (c) => c.id === ru.uid || (ru.phone && c.phone && ru.phone === c.phone)
      );
      const isDesig = ru.email?.trim().toLowerCase() === '11kattak11@gmail.com';
      mergedMap.set(ru.uid, {
        ...ru,
        fullName: isDesig
          ? 'كاوار عادل طاهر'
          : ru.fullName || cMatch?.name || 'مواطن مسجل',
        phone: ru.phone || cMatch?.phone || '',
        neighborhood: ru.neighborhood || cMatch?.neighborhood || 'ناحية باعدرى',
        role: isDesig ? 'super_admin' : ru.role || 'citizen',
        reportsSubmittedCount: Math.max(
          ru.reportsSubmittedCount || 0,
          cMatch?.reportsSubmittedCount || 0,
          submittedByUid[ru.uid] || 0
        ),
        resolvedReportsCount: Math.max(
          ru.resolvedReportsCount || 0,
          cMatch?.resolvedReportsCount || 0,
          resolvedByUid[ru.uid] || 0
        ),
        joinedAt: ru.joinedAt || cMatch?.joinedAt || new Date().toISOString(),
        isBlocked: Boolean(ru.isBlocked ?? cMatch?.isBlocked ?? false),
      });
    });

    // 2. Also include any records in citizens collection not yet in mergedMap
    citizens.forEach((c) => {
      if (!mergedMap.has(c.id)) {
        const match = registeredUsersList.find(
          (u) => u.uid === c.id || (u.phone && c.phone && u.phone.includes(c.phone))
        );
        if (match && mergedMap.has(match.uid)) return;

        mergedMap.set(c.id, {
          uid: c.id,
          fullName: c.name || 'مواطن مسجل',
          email: match?.email || '',
          phone: c.phone || '',
          birthDate: match?.birthDate || '',
          role: match?.role || 'citizen',
          neighborhood: c.neighborhood || 'ناحية باعدرى',
          reportsSubmittedCount: Math.max(
            c.reportsSubmittedCount || 0,
            submittedByUid[c.id] || 0
          ),
          resolvedReportsCount: Math.max(
            c.resolvedReportsCount || 0,
            resolvedByUid[c.id] || 0
          ),
          joinedAt: c.joinedAt || new Date().toISOString(),
          isBlocked: Boolean(c.isBlocked),
          hasRecoveryCodeConfigured: match?.hasRecoveryCodeConfigured,
        });
      }
    });

    const list = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
    );

    if (!citizenSearch.trim()) return list;
    const q = citizenSearch.trim().toLowerCase();
    return list.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.neighborhood.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [citizens, registeredUsersList, reports, citizenSearch]);

  const formatWaNumber = (phoneStr?: string) => {
    if (!phoneStr) return '9647504738358';
    const digits = phoneStr.replace(/\D/g, '');
    if (digits.startsWith('964')) return digits;
    if (digits.startsWith('0')) return `964${digits.slice(1)}`;
    return `964${digits}`;
  };

  const handleCreateDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    playSuccessSound();
    const engPhone = newEngineerPhone.trim() || '07504738358';
    const waNum = formatWaNumber(engPhone);

    addDepartment({
      nameAr: newDeptName.trim(),
      nameKu: newDeptName.trim(),
      nameEn: newDeptName.trim(),
      sector: newDeptSector,
      managerName:
        newManagerName.trim() || tr('مدير الدائرة', 'بەڕێوەبەری فەرمانگە', 'Department Director'),
      managerPhone: newManagerPhone.trim() || engPhone,
      deputyName:
        newDeputyName.trim() || tr('معاون المدير', 'یاریدەدەری بەڕێوەبەر', 'Deputy Director'),
      deputyPhone: newDeputyPhone.trim() || engPhone,
      engineerName:
        newEngineerName.trim() || tr('المهندس المختص', 'ئەندازیاری تایبەتمەند', 'Specialist Engineer'),
      engineerPhone: engPhone,
      headName:
        newEngineerName.trim() ||
        newManagerName.trim() ||
        tr('المهندس المختص', 'ئەندازیاری تایبەتمەند', 'Specialist Engineer'),
      fieldTeamName: `${tr('فرقة', 'تیمی', 'Team')} ${newDeptName.trim()}`,
      phone: engPhone,
      emergencyPhone: engPhone,
      whatsapp: waNum,
      whatsappPhone: waNum,
      availability: 'available',
      vehiclesCount: 4,
      activeTeamsCount: 3,
      workingHours: '08:00 AM - 04:00 PM',
      locationAr: tr('ناحية باعدرى', 'ناحیا باعەدرێ', 'Baadre District'),
    });

    setNewDeptName('');
    setNewManagerName('');
    setNewManagerPhone('');
    setNewDeputyName('');
    setNewDeputyPhone('');
    setNewEngineerName('');
    setNewEngineerPhone('');
    setIsAddDeptOpen(false);
  };

  const sectorDistribution = React.useMemo(() => {
    const counts: Record<ReportSector, number> = {
      roads: 0,
      sewage: 0,
      sanitation: 0,
      lighting: 0,
      water: 0,
      other: 0,
    };
    reports.forEach((r) => {
      counts[r.sector] = (counts[r.sector] || 0) + 1;
    });
    return Object.values(SECTOR_META).map((sec) => ({
      ...sec,
      count: counts[sec.key] || 0,
      percentage:
        reports.length > 0 ? Math.round(((counts[sec.key] || 0) / reports.length) * 100) : 0,
    }));
  }, [reports]);

  const weeklyAnalyticsData = React.useMemo(() => {
    const dayLabels = [
      tr('السبت', 'شەمە', 'Sat'),
      tr('الأحد', 'یەك شەم', 'Sun'),
      tr('الإثنين', 'دووشەم', 'Mon'),
      tr('الثلاثاء', 'سێ شەم', 'Tue'),
      tr('الأربعاء', 'چوار شەم', 'Wed'),
      tr('الخميس', 'بێنچ شەم', 'Thu'),
      tr('الجمعة', 'هەینی', 'Fri'),
    ];
    const counts = dayLabels.map((day) => ({ day, incoming: 0, resolved: 0 }));
    reports.forEach((r) => {
      const d = new Date(r.createdAt);
      if (!Number.isNaN(d.getTime())) {
        // JS getDay(): 0=Sun, 1=Mon, ..., 6=Sat -> map Sat to index 0
        const idx = (d.getDay() + 1) % 7;
        counts[idx].incoming += 1;
        if (r.status === 'resolved') {
          counts[idx].resolved += 1;
        }
      }
    });
    return counts;
  }, [reports, language]);

  const startQuickEdit = (rep: CivicReport) => {
    playClickSound();
    setEditingReportId(rep.id);
    setTempStatus(rep.status);
    setTempTeam(rep.assignedTeam || departments[0]?.fieldTeamName || '');
    setTempNote(rep.officialNote || '');
  };

  const saveQuickEdit = (reportId: string) => {
    playSuccessSound();
    updateReportStatus(reportId, tempStatus, tempNote, tempTeam);
    setEditingReportId(null);
    setSavedBannerId(reportId);
    setTimeout(() => setSavedBannerId(null), 2500);
  };

  const localeCode = 'en-US';

  if (!canAccessAdmin) {
    return null;
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-6">
      {/* 1️⃣ الإحصائيات والمؤشرات (Analytics) */}
      {adminTab === 'analytics' && (
        <div className="space-y-6">
          {/* Top Control Header & Harmonious Borderless Stat Cards */}
          <div className="p-4 sm:p-6 rounded-3xl bg-white/90 backdrop-blur-2xl border-0 shadow-[0_10px_34px_rgba(30,142,147,0.08)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#467586] to-[#58899A] shadow-xs flex items-center justify-center text-white">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-[#1B3A46]">
                  {tr('لوحة الإحصاءات والمؤشرات', 'تەختەی ئامار و نیشاندەرەکان', 'Analytics Dashboard')}
                </h1>
              </div>
            </div>

            {/* 9 مؤشرات بألوان بارزة قليلاً ومتناسقة وبدون إطارات */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* 1. اجمالي البلاغات (Sky Slate / Turquoise) */}
              <div className="px-4 py-3.5 rounded-2xl bg-gradient-to-l from-[#E6F2F6] to-[#F2F8FA] border-0 shadow-[0_4px_14px_rgba(30,142,147,0.06)] flex items-center justify-between gap-3.5 transition-all">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#3B6878] to-[#58899A] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div className={`min-w-0 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <p className="text-sm font-black text-[#1B3A46] truncate">
                      {tr('اجمالي البلاغات', 'کۆی گشتی سکاڵاکان', 'Total Reports')}
                    </p>
                  </div>
                </div>
                <div className="min-w-[3.5rem] px-3.5 py-2 rounded-xl bg-white/90 border-0 flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="text-2xl font-black text-[#285060] tabular-nums leading-none">
                    {reportCardTotals.total}
                  </span>
                </div>
              </div>

              {/* 2. الحالات الطارئة (Rose Coral) */}
              <div className="px-4 py-3.5 rounded-2xl bg-gradient-to-l from-rose-50/95 to-rose-50/50 border-0 shadow-[0_4px_14px_rgba(244,63,94,0.06)] flex items-center justify-between gap-3.5 transition-all">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className={`min-w-0 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-rose-800 truncate">
                        {tr('الحالات الطارئة', 'حاڵەتە فریاگوزارییەکان', 'Emergency Cases')}
                      </p>
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    </div>
                  </div>
                </div>
                <div className="min-w-[3.5rem] px-3.5 py-2 rounded-xl bg-white/90 border-0 flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="text-2xl font-black text-rose-700 tabular-nums leading-none">
                    {reportCardTotals.emergency}
                  </span>
                </div>
              </div>

              {/* 3. الأعمال المنجزة (Emerald Mint) */}
              <div className="px-4 py-3.5 rounded-2xl bg-gradient-to-l from-emerald-50/95 to-teal-50/50 border-0 shadow-[0_4px_14px_rgba(16,185,129,0.06)] flex items-center justify-between gap-3.5 transition-all">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className={`min-w-0 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-emerald-900 truncate">
                        {tr('الأعمال المنجزة', 'کارە ئەنجامدراوەکان', 'Completed Works')}
                      </p>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    </div>
                  </div>
                </div>
                <div className="min-w-[3.5rem] px-3.5 py-2 rounded-xl bg-white/90 border-0 flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="text-2xl font-black text-emerald-700 tabular-nums leading-none">
                    {reportCardTotals.resolved}
                  </span>
                </div>
              </div>

              {/* 4. نسبة الانجاز (Teal Cyan) */}
              <div className="px-4 py-3.5 rounded-2xl bg-gradient-to-l from-teal-50/90 to-cyan-50/50 border-0 shadow-[0_4px_14px_rgba(20,184,166,0.06)] flex items-center justify-between gap-3.5 transition-all">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className={`min-w-0 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <p className="text-sm font-black text-teal-900 truncate">
                      {tr('نسبة الانجاز', 'ڕێژەی ئەنجامدان', 'Completion Rate')}
                    </p>
                  </div>
                </div>
                <div className="min-w-[3.5rem] px-3.5 py-2 rounded-xl bg-white/90 border-0 flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="text-xl font-black text-teal-800 tabular-nums leading-none">
                    {reportCardTotals.completionRate}%
                  </span>
                </div>
              </div>

              {/* 5. تم الارسال قيد المعالجة (Warm Amber) */}
              <div className="px-4 py-3.5 rounded-2xl bg-gradient-to-l from-amber-50/90 to-orange-50/40 border-0 shadow-[0_4px_14px_rgba(245,158,11,0.06)] flex items-center justify-between gap-3.5 transition-all">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div className={`min-w-0 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-amber-900 truncate">
                        {tr(
                          'تم الارسال قيد المعالجة',
                          'نێردراوە لەژێر چارەسەر',
                          'Sent / In-Progress'
                        )}
                      </p>
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    </div>
                  </div>
                </div>
                <div className="min-w-[3.5rem] px-3.5 py-2 rounded-xl bg-white/90 border-0 flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="text-2xl font-black text-amber-700 tabular-nums leading-none">
                    {reportCardTotals.inProgress}
                  </span>
                </div>
              </div>

              {/* 6. البلاغات المرفوضة (Soft Orange/Rose) */}
              <div className="px-4 py-3.5 rounded-2xl bg-gradient-to-l from-orange-50/85 to-rose-50/40 border-0 shadow-[0_4px_14px_rgba(249,115,22,0.06)] flex items-center justify-between gap-3.5 transition-all">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Ban className="w-5 h-5" />
                  </div>
                  <div className={`min-w-0 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <p className="text-sm font-black text-orange-900 truncate">
                      {tr('البلاغات المرفوضة', 'سکاڵا ڕەتکراوەکان', 'Rejected Reports')}
                    </p>
                  </div>
                </div>
                <div className="min-w-[3.5rem] px-3.5 py-2 rounded-xl bg-white/90 border-0 flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="text-2xl font-black text-orange-700 tabular-nums leading-none">
                    {reportCardTotals.rejected}
                  </span>
                </div>
              </div>

              {/* 7. الدوائر الخدمية (Indigo Blue) */}
              <div className="px-4 py-3.5 rounded-2xl bg-gradient-to-l from-indigo-50/85 to-blue-50/50 border-0 shadow-[0_4px_14px_rgba(99,102,241,0.06)] flex items-center justify-between gap-3.5 transition-all">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className={`min-w-0 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <p className="text-sm font-black text-indigo-950 truncate">
                      {tr('الدوائر الخدمية', 'فەرمانگە خزمەتگوزارییەکان', 'Service Departments')}
                    </p>
                  </div>
                </div>
                <div className="min-w-[3.5rem] px-3.5 py-2 rounded-xl bg-white/90 border-0 flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="text-2xl font-black text-indigo-700 tabular-nums leading-none">
                    {departments.length}
                  </span>
                </div>
              </div>

              {/* 8. المواطنين المسجلين (Sky Blue) */}
              <div className="px-4 py-3.5 rounded-2xl bg-gradient-to-l from-sky-50/90 to-cyan-50/50 border-0 shadow-[0_4px_14px_rgba(14,165,233,0.06)] flex items-center justify-between gap-3.5 transition-all">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className={`min-w-0 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <p className="text-sm font-black text-sky-950 truncate">
                      {tr('المواطنين المسجلين', 'هاوڵاتییە تۆمارکراوەکان', 'Registered Citizens')}
                    </p>
                  </div>
                </div>
                <div className="min-w-[3.5rem] px-3.5 py-2 rounded-xl bg-white/90 border-0 flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="text-2xl font-black text-sky-700 tabular-nums leading-none">
                    {citizens.length}
                  </span>
                </div>
              </div>

              {/* 9. المواطنين المبلغين (Violet Purple) */}
              <div className="px-4 py-3.5 rounded-2xl bg-gradient-to-l from-violet-50/85 to-purple-50/50 border-0 shadow-[0_4px_14px_rgba(139,92,246,0.06)] flex items-center justify-between gap-3.5 transition-all">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div className={`min-w-0 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <p className="text-sm font-black text-violet-950 truncate">
                      {tr('المواطنين المبلغين', 'هاوڵاتییە سکاڵاکارەکان', 'Reporting Citizens')}
                    </p>
                  </div>
                </div>
                <div className="min-w-[3.5rem] px-3.5 py-2 rounded-xl bg-white/90 border-0 flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="text-2xl font-black text-violet-700 tabular-nums leading-none">
                    {reportCardTotals.reportingCitizens}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* كارت الإحصاءات العامة لجميع الاستبيانات (بدون إطارات) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white/90 backdrop-blur-xl border-0 shadow-[0_10px_34px_rgba(30,142,147,0.08)] space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#467586] to-[#58899A] text-white flex items-center justify-center shadow-xs">
                <BarChart3 className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-[#1B3A46]">
                  {tr(
                    'الإحصاءات العامة لجميع الاستبيانات',
                    'ئاماری گشتی سەرجەم ڕاپرسییەکان',
                    'General Statistics Across All Surveys'
                  )}
                </h2>
                <p className="text-[11px] font-bold text-[#3B6878]">
                  {tr(
                    'ملخص شامل لمجمل الاستبيانات المنشأة ومشاركات المواطنين الكلية',
                    'پوختەی گشتی سەرجەم ڕاپرسییەکان و بەشداری هاووڵاتیان',
                    'Overall summary of all created surveys and total citizen participation'
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-gradient-to-b from-[#E8F3F7] to-[#F4F9FB] border-0 shadow-[0_4px_14px_rgba(30,142,147,0.06)] transition-all space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-[#467586] text-white flex items-center justify-center shadow-2xs">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <p className="text-xl sm:text-2xl font-black text-[#1B3A46] font-mono">
                  {generalSurveyStats.totalSurveys}
                </p>
                <p className="text-[11px] font-bold text-[#3B6878]">
                  {tr('إجمالي الاستبيانات', 'کۆی ڕاپرسییەکان', 'Total Surveys')}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-50/90 to-teal-50/40 border-0 shadow-[0_4px_14px_rgba(16,185,129,0.06)] transition-all space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                  <Send className="w-4 h-4" />
                </div>
                <p className="text-xl sm:text-2xl font-black text-emerald-900 font-mono">
                  {generalSurveyStats.publishedCount}
                </p>
                <p className="text-[11px] font-bold text-emerald-700">
                  {tr(
                    'الاستبيانات المنشورة',
                    'ڕاپرسییە بڵاوکراوەکان',
                    'Published Surveys'
                  )}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-b from-indigo-50/90 to-blue-50/40 border-0 shadow-[0_4px_14px_rgba(99,102,241,0.06)] transition-all space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
                  <Users className="w-4 h-4" />
                </div>
                <p className="text-xl sm:text-2xl font-black text-indigo-950 font-mono">
                  {generalSurveyStats.totalResponses}
                </p>
                <p className="text-[11px] font-bold text-indigo-700">
                  {tr(
                    'إجمالي المشاركين بالاستبيانات',
                    'کۆی بەشداربووان',
                    'Total Survey Participants'
                  )}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-50/90 to-orange-50/40 border-0 shadow-[0_4px_14px_rgba(245,158,11,0.06)] transition-all space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-2xs">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <p className="text-xl sm:text-2xl font-black text-amber-900 font-mono">
                  {generalSurveyStats.totalQuestions}
                </p>
                <p className="text-[11px] font-bold text-amber-700">
                  {tr(
                    'إجمالي الأسئلة المطروحة',
                    'کۆی پرسیارەکان',
                    'Total Questions Asked'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="p-5 sm:p-6 rounded-3xl bg-white/90 backdrop-blur-xl border-0 space-y-4 shadow-[0_10px_34px_rgba(30,142,147,0.08)]">
              <div className="flex flex-col gap-2">
                <div className="min-w-0">
                  <h3 className="text-[11px] sm:text-xs font-black text-[#1B3A46] flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                    <TrendingUp className="w-4 h-4 text-[#467586] shrink-0" />
                    <span className="whitespace-nowrap">
                      {tr(
                        'المخطط الأسبوعي: البلاغات المستلمة مقابل المنجزة',
                        'خشتەی هەفتانە: سکاڵا وەرگیراوەکان بەرامبەر ئەنجامدراوەکان',
                        'Weekly Chart: Incoming vs. Completed Reports'
                      )}
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#3B6878] font-semibold mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                    {tr(
                      'مقارنة الأداء الميداني اليومي لفرق بلدية باعدرى خلال الأسبوع',
                      'بەراوردکردنی ئەدای مەیدانی ڕۆژانەی تیمەکانی شارەوانی باعەدرێ لەم هەفتەیەدا',
                      'Daily field performance comparison across Baadre municipal teams'
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-bold whitespace-nowrap">
                  <span className="flex items-center gap-1 text-[#285060] whitespace-nowrap">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#58899A] shrink-0" />{' '}
                    {tr('الواردة', 'هاتوو', 'Incoming')}
                  </span>
                  <span className="flex items-center gap-1 text-emerald-800 whitespace-nowrap">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0" />{' '}
                    {tr('المنجزة', 'ئەنجامدراو', 'Completed')}
                  </span>
                </div>
              </div>

              <div className="h-60 pt-6 flex items-end justify-between gap-1.5 sm:gap-2 pb-2 px-1.5 sm:px-2 bg-[#F2F8FA] border-0 rounded-2xl">
                {weeklyAnalyticsData.map((item) => {
                  const maxVal = Math.max(
                    1,
                    ...weeklyAnalyticsData.map((d) => Math.max(d.incoming, d.resolved))
                  );
                  const inHeight = Math.round((item.incoming / maxVal) * 100);
                  const resHeight = Math.round((item.resolved / maxVal) * 100);
                  return (
                    <div
                      key={item.day}
                      className="flex-1 flex flex-col items-center gap-2 h-full justify-end min-w-0"
                    >
                      <div className="w-full flex items-end justify-center gap-1.5 h-44">
                        <div
                          style={{ height: `${inHeight}%` }}
                          className="w-3.5 sm:w-4 rounded-t-lg bg-gradient-to-t from-[#467586] to-[#6C9DAE]"
                        >
                          <span className="text-[9px] font-black text-[#285060] block text-center -mt-4">
                            {item.incoming}
                          </span>
                        </div>
                        <div
                          style={{ height: `${resHeight}%` }}
                          className="w-3.5 sm:w-4 rounded-t-lg bg-gradient-to-t from-emerald-600 to-teal-400"
                        >
                          <span className="text-[9px] font-black text-emerald-800 block text-center -mt-4">
                            {item.resolved}
                          </span>
                        </div>
                      </div>
                      <span className="text-[9.5px] sm:text-[10px] font-black text-[#1B3A46] whitespace-nowrap">
                        {item.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-5 sm:p-6 rounded-3xl bg-white/90 backdrop-blur-xl border-0 space-y-4 shadow-[0_10px_34px_rgba(30,142,147,0.08)]">
              <h3 className="text-base font-black text-[#1B3A46] flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#467586]" />
                <span>
                  {tr(
                    'توزيع البلاغات حسب القطاعات البلدية',
                    'دابەشبوونی سکاڵاکان بەپێی کەرتە شارەوانییەکان',
                    'Reports Distribution by Municipal Sectors'
                  )}
                </span>
              </h3>

              <div className="space-y-3">
                {sectorDistribution.map((sec) => {
                  const sectorBarColors: Record<string, string> = {
                    roads: 'linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%)',
                    water: 'linear-gradient(90deg, #0284C7 0%, #38BDF8 100%)',
                    sewage: 'linear-gradient(90deg, #6366F1 0%, #818CF8 100%)',
                    lighting: 'linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)',
                    sanitation: 'linear-gradient(90deg, #10B981 0%, #34D399 100%)',
                    other: 'linear-gradient(90deg, #467586 0%, #6C9DAE 100%)',
                  };
                  return (
                    <div key={sec.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-[#1B3A46]">
                          {sec.badgeEmoji} {getSectorLabel(sec.key)}
                        </span>
                        <span className="text-[#3B6878] font-black">
                          {sec.count} {tr('بلاغ', 'سکاڵا', 'reports')} ({sec.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-[#E3EFF3] overflow-hidden">
                        <div
                          style={{
                            width: `${Math.max(sec.percentage, 6)}%`,
                            background: sectorBarColors[sec.key] || sectorBarColors.other,
                          }}
                          className="h-full rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2️⃣ البلاغات النشطة والواردة */}
      {adminTab === 'active_reports' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border-0 shadow-none flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search
                className={`w-4 h-4 text-[#46674D] absolute ${
                  isRTL ? 'right-3.5' : 'left-3.5'
                } top-1/2 -translate-y-1/2`}
              />
              <input
                type="text"
                maxLength={FIELD_LIMITS.SEARCH.maxChars}
                value={adminSearch}
                onChange={(e) =>
                  setAdminSearch(
                    enforceInputLimit(
                      e.target.value,
                      FIELD_LIMITS.SEARCH.maxWords,
                      FIELD_LIMITS.SEARCH.maxChars
                    )
                  )
                }
                placeholder={tr('ابحث...', 'بگەڕێ...', 'Search...')}
                className={`w-full bg-[#F4F9F5] border-0 rounded-xl ${
                  isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'
                } py-2.5 text-xs font-bold text-[#1E3725] placeholder-[#46674D]/45 focus:bg-white focus:outline-none`}
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setAdminSectorFilter('ALL')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap border-0 transition-all cursor-pointer ${
                  adminSectorFilter === 'ALL'
                    ? 'bg-[#46674D] text-white'
                    : 'bg-[#F4F9F5] text-[#2D4833] hover:bg-[#E8F4EA]'
                }`}
              >
                {tr('جميع القطاعات', 'هەموو کەرتەکان', 'All Sectors')} ({reports.length})
              </button>
              {Object.values(SECTOR_META).map((sec) => (
                <button
                  key={sec.key}
                  onClick={() => setAdminSectorFilter(sec.key)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border-0 transition-all flex items-center justify-center cursor-pointer ${
                    adminSectorFilter === sec.key
                      ? 'bg-[#46674D] text-white'
                      : 'bg-[#F4F9F5] text-[#2D4833] hover:bg-[#E8F4EA]'
                  }`}
                >
                  <span>{getSectorLabel(sec.key)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Report Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeIncomingReports.slice(0, adminVisibleReportsCount).map((rep) => {
              const sec = SECTOR_META[rep.sector];

              const getStatusStepInfo = () => {
                if (rep.status === 'pending') {
                  return null;
                }
                if (rep.status === 'resolved') {
                  return {
                    text: rep.assignedTeam
                      ? `${tr('تم الإنجاز', 'ئەنجامدرا', 'Completed')} — ${rep.assignedTeam}`
                      : tr('تم الإنجاز', 'ئەنجامدرا', 'Completed'),
                    colorClass: 'text-emerald-600',
                    dotClass: 'bg-emerald-600',
                  };
                }
                if (rep.status === 'rejected') {
                  return {
                    text: rep.officialNote
                      ? `${tr('تم رفض البلاغ — السبب:', 'سکاڵا ڕەتکرایەوە — هۆکار:', 'Rejected — Reason:')} ${rep.officialNote}`
                      : tr('تم رفض البلاغ', 'سکاڵا ڕەتکرایەوە', 'Report Rejected'),
                    colorClass: 'text-slate-600',
                    dotClass: 'bg-slate-600',
                  };
                }
                const dept =
                  rep.assignedTeam ||
                  tr('دائرة بلدية باعدرى', 'فەرمانگەی شارەوانی باعەدرێ', 'Baadre Municipality');
                return {
                  text: `${tr('تم إرسال البلاغ إلى', 'سکاڵاکە ڕەوانەکرا بۆ', 'Referred to')} ${dept}`,
                  colorClass: 'text-blue-600',
                  dotClass: 'bg-blue-600',
                };
              };

              const getUrgencyColorClass = () => {
                if (rep.urgency === 'emergency') return 'text-rose-600';
                if (rep.urgency === 'high') return 'text-amber-600';
                return 'text-emerald-700';
              };

              const statusStep = getStatusStepInfo();

              return (
                <div
                  key={rep.id}
                  onClick={() => {
                    playClickSound();
                    onSelectReport(rep);
                  }}
                  className="group rounded-3xl bg-white transition-all duration-300 overflow-hidden flex flex-col justify-between border-0 shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.10)] cursor-pointer"
                >
                  {/* Top Image Header: 16:9 Fit or 9:16 Centered */}
                  <div className="relative aspect-video w-full overflow-hidden bg-[#1E3725]">
                    <SmartAdaptiveImage
                      src={rep.images[0]}
                      alt={rep.title}
                      disableLightbox
                    />

                    {/* نص البلاغ الجديد باللون الأحمر وينبض (نص فقط بدون خلفية) مع نقطة تضيء وتنطفئ على الصورة، ويختفي نهائياً بعد فتح البلاغ */}
                    {!isReportOpened(rep) && rep.status === 'pending' && (
                      <div
                        dir={isRTL ? 'rtl' : 'ltr'}
                        className="absolute bottom-3 inset-x-4 z-20 flex items-center gap-2 pointer-events-none select-none"
                      >
                        <span className="relative flex h-3 w-3 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-90" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 animate-pulse shadow-[0_0_10px_rgba(239,68,68,1)]" />
                        </span>
                        <span className="text-red-500 text-sm sm:text-base font-black animate-pulse drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
                          {tr('بلاغ جديد', 'سکاڵای نوێ', 'New Report')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Text Details Container */}
                  <div
                    dir={isRTL ? 'rtl' : 'ltr'}
                    className={`p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 bg-white ${
                      isRTL ? 'text-right' : 'text-left'
                    }`}
                  >
                    {/* Title & Detailed Description */}
                    <div className="space-y-2">
                      <h3 className="text-base font-black text-[#1E3725] group-hover:text-[#46674D] transition-colors leading-snug">
                        {rep.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-[#2D4833] leading-relaxed font-medium">
                        {rep.description}
                      </p>
                    </div>

                    {/* Divider Line & All Information Under Details */}
                    <div
                      className={`pt-3 border-t border-[#E8F4EA] space-y-2 text-xs font-bold text-[#2D4833] ${
                        isRTL ? 'text-right' : 'text-left'
                      }`}
                    >
                      {/* Report Code at the top above status */}
                      <div className="flex items-center justify-start gap-1.5 text-xs text-[#46674D]">
                        <span>{tr('رمز البلاغ:', 'کۆدێ سکاڵایێ:', 'Report Code:')}</span>
                        <span className="font-mono font-black text-[#1E3725]" dir="ltr">
                          {rep.trackingCode}
                        </span>
                      </div>

                      {/* Colored Step Status */}
                      {statusStep && (
                        <p
                          className={`font-black flex items-center justify-start gap-1.5 ${statusStep.colorClass}`}
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${statusStep.dotClass}`} />
                          <span>{statusStep.text}</span>
                        </p>
                      )}

                      {/* Sector & Colored Urgency (Unset in light gray until opened and set) */}
                      <div className="flex flex-wrap items-center justify-start gap-3">
                        <span className="text-[#1E3725] font-black">
                          {sec.badgeEmoji} {getSectorLabel(rep.sector)}
                        </span>
                        {isReportUrgencyConfirmed(rep) ? (
                          <span className={`font-black ${getUrgencyColorClass()}`}>
                            ● {getUrgencyLabel(rep.urgency)}
                          </span>
                        ) : (
                          <span className="font-bold text-slate-400">
                            ● {tr('الأولوية: غير محددة', 'گرنگی: دیارینەکراوە', 'Priority: Unset')}
                          </span>
                        )}
                      </div>

                      {/* Reporter, Location & Date/Time */}
                      <div className="space-y-1 text-xs text-[#46674D]">
                        <p>
                          <span className="text-[#1E3725] font-bold">
                            {tr('المبلّغ: ', 'سکاڵاکار: ', 'Reporter: ')}
                          </span>
                          <span>{rep.citizenName}</span>{' '}
                          <span dir="ltr" className="inline-block font-mono">
                            ({rep.citizenPhone})
                          </span>
                        </p>
                        <p className="text-[#2D4833] font-bold">
                          {tr('الموقع:', 'شوێن:', 'Location:')} {rep.neighborhood} — {rep.street}
                        </p>
                        <p className="text-[#46674D] font-bold">
                          {tr('التاريخ والساعة:', 'بەروار و کاتژمێر:', 'Date & Time:')}{' '}
                          <span dir="ltr" className="font-mono tabular-nums">
                            {new Date(rep.createdAt).toLocaleDateString(localeCode, {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            })}{' '}
                            •{' '}
                            {new Date(rep.createdAt).toLocaleTimeString(localeCode, {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </span>
                        </p>
                      </div>

                      {/* زر حذف البلاغ في نهاية الكارت على شكل نص أحمر خفيف يفتح تنبيه على الشاشة */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="pt-2 border-t border-[#E8F4EA] flex items-center justify-end"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playClickSound();
                            setReportToDelete(rep);
                          }}
                          className="text-[11px] font-bold text-rose-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          {tr('حذف البلاغ', 'سڕینەوەی سکاڵا', 'Delete Report')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {(activeIncomingReports.length > adminVisibleReportsCount || hasMoreReports) && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              {activeIncomingReports.length > adminVisibleReportsCount && (
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setAdminVisibleReportsCount((prev) => prev + 12);
                  }}
                  className="px-6 py-2.5 rounded-2xl bg-[#46674D] text-white font-black text-xs inline-flex items-center gap-2 hover:bg-[#33553C] transition-all cursor-pointer shadow-sm border-0"
                >
                  <span>
                    {tr(
                      `عرض المزيد من البلاغات (${Math.min(adminVisibleReportsCount, activeIncomingReports.length)} من ${activeIncomingReports.length})`,
                      `پیشاندانی سکاڵای زیاتر (${Math.min(adminVisibleReportsCount, activeIncomingReports.length)} لە ${activeIncomingReports.length})`,
                      `Show More Reports (${Math.min(adminVisibleReportsCount, activeIncomingReports.length)} of ${activeIncomingReports.length})`
                    )}
                  </span>
                </button>
              )}
              {hasMoreReports && (
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    loadMoreReports();
                    setAdminVisibleReportsCount((prev) => prev + 24);
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-[#E8F4EA] text-[#1E3725] font-black text-xs inline-flex items-center gap-2 hover:bg-[#BBDDC6] transition-all cursor-pointer border border-[#BBDDC6]"
                >
                  <span>
                    {tr(
                      'تحميل المزيد من السيرفر',
                      'بارکردنی زیاتر لە سێرڤەرەوە',
                      'Load More From Cloud'
                    )}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3️⃣ الأعمال المنجزة (مباشرة بعد البلاغات) */}
      {adminTab === 'projects' && (
        <div className="-mx-3 sm:-mx-6 -my-5">
          <OrganizationProjectsView
            onOpenAddProject={() => {
              if (onOpenAddProject) onOpenAddProject();
              else setIsAddProjectOpen(true);
            }}
          />
        </div>
      )}

      {/* 4️⃣ الدوائر والمواطنين (داخل القسم 2 Chips) */}
      {(adminTab === 'directory' || adminTab === 'departments_directory') && (
        <div className="space-y-4">
          {/* 1. شريط الأقسام الفرعية (2 Chips) بدون إطارات وبألوان التطبيق المتناسقة */}
          <div className="p-2 rounded-3xl bg-white/95 shadow-[0_8px_24px_rgba(70,103,77,0.06)] flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setDirectoryChip('departments');
              }}
              className={`flex-1 py-2.5 px-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                directoryChip === 'departments'
                  ? 'bg-[#46674D] text-white shadow-xs'
                  : 'bg-[#F4F9F5] text-[#2D4833] hover:bg-[#E8F4EA]'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>{tr('الدوائر الخدمية', 'فەرمانگە خزمەتگوزارییەکان', 'Service Departments')}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  directoryChip === 'departments'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#E8F4EA] text-[#1E3725]'
                }`}
              >
                {departments.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setDirectoryChip('citizens');
              }}
              className={`flex-1 py-2.5 px-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                directoryChip === 'citizens'
                  ? 'bg-[#46674D] text-white shadow-xs'
                  : 'bg-[#F4F9F5] text-[#2D4833] hover:bg-[#E8F4EA]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{tr('المواطنين المسجلين', 'هاوڵاتیانی تۆمارکراو', 'Registered Citizens')}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  directoryChip === 'citizens'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#E8F4EA] text-[#1E3725]'
                }`}
              >
                {citizens.length}
              </span>
            </button>
          </div>

          {/* 2. الشريط الذي تحت شريط الأقسام الفرعية */}
          <div className="p-2.5 rounded-3xl bg-white/95 shadow-[0_8px_24px_rgba(70,103,77,0.06)] flex items-center gap-2.5">
            {directoryChip === 'departments' ? (
              <>
                <div className="relative flex-1">
                  <Search
                    className={`w-4 h-4 text-[#46674D] absolute ${
                      isRTL ? 'right-3.5' : 'left-3.5'
                    } top-1/2 -translate-y-1/2`}
                  />
                  <input
                    type="text"
                    maxLength={FIELD_LIMITS.SEARCH.maxChars}
                    value={deptSearch}
                    onChange={(e) =>
                      setDeptSearch(
                        enforceInputLimit(
                          e.target.value,
                          FIELD_LIMITS.SEARCH.maxWords,
                          FIELD_LIMITS.SEARCH.maxChars
                        )
                      )
                    }
                    placeholder={tr('ابحث...', 'بگەڕێ...', 'Search...')}
                    className={`w-full bg-[#F4F9F5] rounded-2xl ${
                      isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'
                    } py-2.5 text-xs font-bold text-[#1E3725] placeholder-[#46674D]/45 focus:outline-none`}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsAddDeptOpen((prev) => !prev);
                  }}
                  title={tr('إضافة دائرة جديدة', 'زیادکردنی فەرمانگەی نوێ', 'Add New Department')}
                  className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#33553C] to-[#46674D] hover:brightness-110 text-white flex items-center justify-center shrink-0 shadow-[0_4px_14px_rgba(70,103,77,0.25)] hover:scale-105 active:scale-95 transition-all cursor-pointer border-0 outline-none"
                >
                  {isAddDeptOpen ? <X className="w-5 h-5 stroke-[2.5]" /> : <Plus className="w-5 h-5 stroke-[2.5]" />}
                </button>
              </>
            ) : (
              <div className="relative w-full">
                <Search
                  className={`w-4 h-4 text-[#46674D] absolute ${
                    isRTL ? 'right-3.5' : 'left-3.5'
                  } top-1/2 -translate-y-1/2`}
                />
                <input
                  type="text"
                  maxLength={FIELD_LIMITS.SEARCH.maxChars}
                  value={citizenSearch}
                  onChange={(e) =>
                    setCitizenSearch(
                      enforceInputLimit(
                        e.target.value,
                        FIELD_LIMITS.SEARCH.maxWords,
                        FIELD_LIMITS.SEARCH.maxChars
                      )
                    )
                  }
                  placeholder={tr('ابحث...', 'بگەڕێ...', 'Search...')}
                  className={`w-full bg-[#F4F9F5] rounded-2xl ${
                    isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'
                  } py-2.5 text-xs font-bold text-[#1E3725] placeholder-[#46674D]/45 focus:outline-none`}
                />
              </div>
            )}
          </div>

          {/* Chip 1 Content: الدوائر الخدمية */}
          {directoryChip === 'departments' && (
            <div className="space-y-4">
              {/* Add Department Form with clear frames/borders (إطارات) */}
              {isAddDeptOpen && (
                <form
                  onSubmit={handleCreateDepartment}
                  className="p-5 sm:p-6 rounded-3xl bg-white border-2 border-[#88B793] shadow-[0_14px_36px_rgba(70,103,77,0.12)] space-y-5"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#BBDDC6]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-[#E8F4EA] border border-[#88B793] text-[#46674D] flex items-center justify-center">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-black text-[#1E3725]">
                          {tr(
                            'إضافة دائرة خدمية جديدة',
                            'زیادکردنی فەرمانگەی خزمەتگوزاری نوێ',
                            'Add New Service Department'
                          )}
                        </h4>
                        <p className="text-[11px] text-[#46674D] font-bold">
                          {tr(
                            'مسؤولو التواصل: المهندس المختص • معاون المدير • مدير الدائرة (في حالة الضرورة)',
                            'بەرپرسانی پەیوەندی: ئەندازیاری تایبەتمەند • یاریدەدەری بەڕێوەبەر • بەڕێوەبەری فەرمانگە',
                            'Contacts: Specialist Engineer • Deputy Director • Department Director'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Row 1: Department Name & Sector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <label className="block text-xs font-black text-[#1E3725]">
                          {tr('اسم الدائرة *', 'ناوی فەرمانگە *', 'Department Name *')}
                        </label>
                        <FieldLimitBadge
                          value={newDeptName}
                          maxWords={FIELD_LIMITS.DEPT_NAME.maxWords}
                          maxChars={FIELD_LIMITS.DEPT_NAME.maxChars}
                        />
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={FIELD_LIMITS.DEPT_NAME.maxChars}
                        value={newDeptName}
                        onChange={(e) =>
                          setNewDeptName(
                            enforceInputLimit(
                              e.target.value,
                              FIELD_LIMITS.DEPT_NAME.maxWords,
                              FIELD_LIMITS.DEPT_NAME.maxChars
                            )
                          )
                        }
                        placeholder={tr(
                          'مثال: مديرية ماء ناحية باعدرى',
                          'نموونە: بەڕێوەبەرایەتی ئاوی باعەدرێ',
                          'e.g. Baadre Water Directorate'
                        )}
                        className="w-full bg-[#F4F9F5] border-2 border-[#BBDDC6] focus:border-[#46674D] rounded-2xl px-4 py-2.5 text-xs font-bold text-[#1E3725] focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[#1E3725] mb-1.5">
                        {tr('القطاع الخدمي للدائرة', 'کەرتی خزمەتگوزاری فەرمانگە', 'Service Sector')}
                      </label>
                      <select
                        value={newDeptSector}
                        onChange={(e) => setNewDeptSector(e.target.value as ReportSector)}
                        className="w-full bg-[#F4F9F5] border-2 border-[#BBDDC6] focus:border-[#46674D] rounded-2xl px-4 py-2.5 text-xs font-bold text-[#1E3725] focus:outline-none transition-colors"
                      >
                        {Object.values(SECTOR_META).map((sec) => (
                          <option key={sec.key} value={sec.key}>
                            {sec.badgeEmoji} {getSectorLabel(sec.key)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Hierarchy Contacts: Engineer, Deputy, Manager */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {/* المهندس */}
                    <div className="p-4 rounded-2xl bg-[#F4F9F5] border-2 border-[#BBDDC6] space-y-2.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-[#BBDDC6]/70">
                        <span className="text-xs font-black text-[#1E3725]">
                          {tr('المهندس المختص', 'ئەندازیاری تایبەتمەند', 'Specialist Engineer')}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <label className="block text-[11px] font-bold text-[#46674D]">
                            {tr('اسم المهندس *', 'ناوی ئەندازیار *', 'Engineer Name *')}
                          </label>
                          <FieldLimitBadge
                            value={newEngineerName}
                            maxWords={FIELD_LIMITS.NAME.maxWords}
                            maxChars={FIELD_LIMITS.NAME.maxChars}
                          />
                        </div>
                        <input
                          type="text"
                          required
                          maxLength={FIELD_LIMITS.NAME.maxChars}
                          value={newEngineerName}
                          onChange={(e) =>
                            setNewEngineerName(
                              enforceInputLimit(
                                e.target.value,
                                FIELD_LIMITS.NAME.maxWords,
                                FIELD_LIMITS.NAME.maxChars
                              )
                            )
                          }
                          placeholder={tr('اسم المهندس...', 'ناوی ئەندازیار...', 'Engineer name...')}
                          className="w-full bg-white border border-[#88B793] focus:border-[#46674D] rounded-xl px-3.5 py-2 text-xs font-bold text-[#1E3725] focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <label className="block text-[11px] font-bold text-[#46674D]">
                            {tr('رقم هاتف المهندس *', 'ژمارەی مۆبایلی ئەندازیار *', 'Engineer Phone *')}
                          </label>
                          <FieldLimitBadge
                            value={newEngineerPhone}
                            maxWords={FIELD_LIMITS.PHONE.maxWords}
                            maxChars={FIELD_LIMITS.PHONE.maxChars}
                            isPhone
                          />
                        </div>
                        <input
                          type="tel"
                          required
                          dir="ltr"
                          maxLength={FIELD_LIMITS.PHONE.maxChars}
                          value={newEngineerPhone}
                          onChange={(e) =>
                            setNewEngineerPhone(
                              enforcePhoneLimit(e.target.value, FIELD_LIMITS.PHONE.maxChars)
                            )
                          }
                          placeholder="0750XXXXXXX"
                          className="w-full bg-white border border-[#88B793] focus:border-[#46674D] rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-[#1E3725] text-right focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    {/* المعاون */}
                    <div className="p-4 rounded-2xl bg-[#F4F9F5] border-2 border-[#BBDDC6] space-y-2.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-[#BBDDC6]/70">
                        <span className="text-xs font-black text-[#1E3725]">
                          {tr('معاون المدير', 'یاریدەدەری بەڕێوەبەر', 'Deputy Director')}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <label className="block text-[11px] font-bold text-[#46674D]">
                            {tr('اسم المعاون *', 'ناوی یاریدەدەر *', 'Deputy Name *')}
                          </label>
                          <FieldLimitBadge
                            value={newDeputyName}
                            maxWords={FIELD_LIMITS.NAME.maxWords}
                            maxChars={FIELD_LIMITS.NAME.maxChars}
                          />
                        </div>
                        <input
                          type="text"
                          required
                          maxLength={FIELD_LIMITS.NAME.maxChars}
                          value={newDeputyName}
                          onChange={(e) =>
                            setNewDeputyName(
                              enforceInputLimit(
                                e.target.value,
                                FIELD_LIMITS.NAME.maxWords,
                                FIELD_LIMITS.NAME.maxChars
                              )
                            )
                          }
                          placeholder={tr('اسم المعاون...', 'ناوی یاریدەدەر...', 'Deputy name...')}
                          className="w-full bg-white border border-[#88B793] focus:border-[#46674D] rounded-xl px-3.5 py-2 text-xs font-bold text-[#1E3725] focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <label className="block text-[11px] font-bold text-[#46674D]">
                            {tr('رقم هاتف المعاون *', 'ژمارەی مۆبایلی یاریدەدەر *', 'Deputy Phone *')}
                          </label>
                          <FieldLimitBadge
                            value={newDeputyPhone}
                            maxWords={FIELD_LIMITS.PHONE.maxWords}
                            maxChars={FIELD_LIMITS.PHONE.maxChars}
                            isPhone
                          />
                        </div>
                        <input
                          type="tel"
                          required
                          dir="ltr"
                          maxLength={FIELD_LIMITS.PHONE.maxChars}
                          value={newDeputyPhone}
                          onChange={(e) =>
                            setNewDeputyPhone(
                              enforcePhoneLimit(e.target.value, FIELD_LIMITS.PHONE.maxChars)
                            )
                          }
                          placeholder="0750XXXXXXX"
                          className="w-full bg-white border border-[#88B793] focus:border-[#46674D] rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-[#1E3725] text-right focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    {/* المدير */}
                    <div className="p-4 rounded-2xl bg-[#F4F9F5] border-2 border-[#BBDDC6] space-y-2.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-[#BBDDC6]/70">
                        <span className="text-xs font-black text-[#1E3725]">
                          {tr('مدير الدائرة', 'بەڕێوەبەری فەرمانگە', 'Department Director')}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#E8F4EA] border border-[#88B793] text-[#1E3725] text-[10px] font-black">
                          {tr('عند الضرورة', 'لەکاتی پێویست', 'Emergency')}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <label className="block text-[11px] font-bold text-[#46674D]">
                            {tr('اسم المدير *', 'ناوی بەڕێوەبەر *', 'Director Name *')}
                          </label>
                          <FieldLimitBadge
                            value={newManagerName}
                            maxWords={FIELD_LIMITS.NAME.maxWords}
                            maxChars={FIELD_LIMITS.NAME.maxChars}
                          />
                        </div>
                        <input
                          type="text"
                          required
                          maxLength={FIELD_LIMITS.NAME.maxChars}
                          value={newManagerName}
                          onChange={(e) =>
                            setNewManagerName(
                              enforceInputLimit(
                                e.target.value,
                                FIELD_LIMITS.NAME.maxWords,
                                FIELD_LIMITS.NAME.maxChars
                              )
                            )
                          }
                          placeholder={tr('اسم المدير...', 'ناوی بەڕێوەبەر...', 'Director name...')}
                          className="w-full bg-white border border-[#88B793] focus:border-[#46674D] rounded-xl px-3.5 py-2 text-xs font-bold text-[#1E3725] focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <label className="block text-[11px] font-bold text-[#46674D]">
                            {tr('رقم هاتف المدير *', 'ژمارەی مۆبایلی بەڕێوەبەر *', 'Director Phone *')}
                          </label>
                          <FieldLimitBadge
                            value={newManagerPhone}
                            maxWords={FIELD_LIMITS.PHONE.maxWords}
                            maxChars={FIELD_LIMITS.PHONE.maxChars}
                            isPhone
                          />
                        </div>
                        <input
                          type="tel"
                          required
                          dir="ltr"
                          maxLength={FIELD_LIMITS.PHONE.maxChars}
                          value={newManagerPhone}
                          onChange={(e) =>
                            setNewManagerPhone(
                              enforcePhoneLimit(e.target.value, FIELD_LIMITS.PHONE.maxChars)
                            )
                          }
                          placeholder="0750XXXXXXX"
                          className="w-full bg-white border border-[#88B793] focus:border-[#46674D] rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-[#1E3725] text-right focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#BBDDC6]">
                    <button
                      type="button"
                      onClick={() => setIsAddDeptOpen(false)}
                      className="px-4 py-2 rounded-xl bg-[#F4F9F5] border border-[#BBDDC6] text-[#2D4833] text-xs font-black hover:bg-[#E8F4EA] cursor-pointer"
                    >
                      {tr('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-[#46674D] hover:bg-[#36593F] text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {tr('حفظ وإضافة الدائرة', 'پاشەکەوتکردن و زیادکردنی فەرمانگە', 'Save & Add Department')}
                      </span>
                    </button>
                  </div>
                </form>
              )}

              {/* كروت الدوائر على شكل أكورديون تفاعلي مثل كروت المواطنين المسجلين */}
              <div
                dir={isRTL ? 'rtl' : 'ltr'}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {filteredDepartments.map((dept) => {
                  const completedCount = getDepartmentCompletedCount(dept);

                  return (
                    <DepartmentAccordionCard
                      key={dept.id}
                      dept={dept}
                      isRTL={isRTL}
                      tr={tr}
                      completedCount={completedCount}
                      displayName={getDeptDisplayName(dept)}
                      formatWaNumber={formatWaNumber}
                      onDeleteDept={(d) => setDeptToDelete(d)}
                    />
                  );
                })}
              </div>

              {/* نافذة تأكيد حذف الدائرة */}
              {deptToDelete && (
                <div
                  dir={isRTL ? 'rtl' : 'ltr'}
                  onClick={() => setDeptToDelete(null)}
                  className="fixed inset-0 z-[170] bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`w-full max-w-sm rounded-3xl bg-white border border-rose-200 shadow-2xl p-6 text-center space-y-4`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-base font-black text-[#1E3725]">
                        {tr('تأكيد حذف الدائرة', 'پشتڕاستکردنەوەی سڕینەوەی فەرمانگە', 'Confirm Delete Department')}
                      </h4>
                      <p className="text-xs font-bold text-[#46674D] leading-relaxed">
                        {tr(
                          'هل أنت متأكد من حذف هذه الدائرة الخدمية من الدليل؟',
                          'ئایا دڵنیایت لە سڕینەوەی ئەم فەرمانگەیە؟',
                          'Are you sure you want to delete this department?'
                        )}
                      </p>
                      <p className="text-xs font-black text-rose-700">
                        {getDeptDisplayName(deptToDelete)}
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          deleteDepartment(deptToDelete.id);
                          setDeptToDelete(null);
                        }}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer transition-colors shadow-xs"
                      >
                        {tr('نعم، حذف الدائرة', 'بەڵێ، سڕینەوە', 'Yes, Delete')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeptToDelete(null)}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-[#F4F9F5] hover:bg-[#E8F4EA] text-[#2D4833] font-bold text-xs cursor-pointer transition-colors"
                      >
                        {tr('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chip 2 Content: المواطنين المسجلين في التطبيق مع تفاصيل حسابهم وزر منح صلاحية أدمن بعد 2 تأكيد */}
          {directoryChip === 'citizens' && (
            <div className="space-y-4">
              {filteredCitizens.length === 0 ? (
                <div className="p-8 rounded-3xl bg-white/95 text-center space-y-2 shadow-[0_8px_26px_rgba(70,103,77,0.06)]">
                  <div className="w-12 h-12 rounded-2xl bg-[#E8F4EA] text-[#46674D] flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-black text-[#1E3725]">
                    {tr('لا يوجد مواطنون مسجلون مطابقون للبحث', 'هیچ هاووڵاتییەکی تۆمارکراو نەدۆزرایەوە', 'No registered citizens found')}
                  </p>
                </div>
              ) : (
                <>
                  <div
                    dir={isRTL ? 'rtl' : 'ltr'}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {filteredCitizens.slice(0, adminVisibleCitizensCount).map((cit) => (
                    <CitizenAccordionCard
                      key={cit.uid || (cit as any).id}
                      cit={cit}
                      currentUser={currentUser}
                      isAdmin={isAdmin}
                      isSuperAdmin={isSuperAdmin}
                      isRTL={isRTL}
                      tr={tr}
                      onSelectForRole={(targetCit) => {
                        setDirectRoleTarget(null);
                        setSelectedCitizenForRole(targetCit);
                      }}
                      onGrantAdminDirect={(targetCit) => {
                        setDirectRoleTarget({ cit: targetCit, role: 'admin' });
                        setSelectedCitizenForRole(targetCit);
                      }}
                      onRevertCitizenDirect={(targetCit) => {
                        setDirectRoleTarget({ cit: targetCit, role: 'citizen' });
                        setSelectedCitizenForRole(targetCit);
                      }}
                      onSelectForRecovery={(targetCit) => {
                        setSelectedAdminForRecovery(targetCit);
                      }}
                      onToggleBlock={(citId) => {
                        toggleBlockCitizen(citId);
                      }}
                    />
                  ))}
                </div>

                {filteredCitizens.length > adminVisibleCitizensCount && (
                  <div className="flex items-center justify-center pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setAdminVisibleCitizensCount((prev) => prev + 12);
                      }}
                      className="px-6 py-2.5 rounded-2xl bg-[#46674D] text-white font-black text-xs inline-flex items-center gap-2 hover:bg-[#33553C] transition-all cursor-pointer shadow-sm border-0"
                    >
                      <span>
                        {tr(
                          `عرض المزيد من المواطنين (${Math.min(adminVisibleCitizensCount, filteredCitizens.length)} من ${filteredCitizens.length})`,
                          `پیشاندانی هاووڵاتی زیاتر (${Math.min(adminVisibleCitizensCount, filteredCitizens.length)} لە ${filteredCitizens.length})`,
                          `Show More Citizens (${Math.min(adminVisibleCitizensCount, filteredCitizens.length)} of ${filteredCitizens.length})`
                        )}
                      </span>
                    </button>
                  </div>
                )}
              </>
            )}
            </div>
          )}
        </div>
      )}

      {/* نافذة تنبيه على الشاشة عند نقر حذف البلاغ */}
      {reportToDelete && (
        <div
          dir={isRTL ? 'rtl' : 'ltr'}
          onClick={() => setReportToDelete(null)}
          className="fixed inset-0 z-[150] bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white border border-rose-200 shadow-2xl p-6 text-center space-y-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-black text-[#1E3725]">
                {tr('تنبيه حذف البلاغ', 'ئاگاداری سڕینەوەی سکاڵا', 'Delete Report Alert')}
              </h4>
              <p className="text-xs font-bold text-[#46674D] leading-relaxed">
                {tr(
                  'هل أنت متأكد من حذف هذا البلاغ نهائياً؟ لا يمكن التراجع عن هذا الإجراء.',
                  'ئایا دڵنیایت لە سڕینەوەی ئەم سکاڵایە بە تەواوی؟ ناتوانرێت بگەڕێنرێتەوە.',
                  'Are you sure you want to permanently delete this report?'
                )}
              </p>
              <p className="text-xs font-mono font-black text-rose-600" dir="ltr">
                {reportToDelete.trackingCode}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  deleteReport(reportToDelete.id);
                  setReportToDelete(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer transition-colors shadow-xs"
              >
                {tr('نعم، حذف البلاغ', 'بەڵێ، سڕینەوە', 'Yes, Delete')}
              </button>
              <button
                type="button"
                onClick={() => setReportToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
              >
                {tr('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Management Modal (Supports 2-Confirmation Grant Admin & Revert to Citizen Flow) */}
      {selectedCitizenForRole && (
        <RoleManagementModal
          citizen={selectedCitizenForRole}
          isOpen={Boolean(selectedCitizenForRole)}
          initialTargetRole={
            directRoleTarget && directRoleTarget.cit.uid === selectedCitizenForRole.uid
              ? directRoleTarget.role
              : undefined
          }
          startWithConfirmation={Boolean(
            directRoleTarget && directRoleTarget.cit.uid === selectedCitizenForRole.uid
          )}
          onClose={() => {
            setSelectedCitizenForRole(null);
            setDirectRoleTarget(null);
          }}
          onOpenRevealCode={(adminCit) => {
            setSelectedCitizenForRole(null);
            setDirectRoleTarget(null);
            setSelectedAdminForRecovery(adminCit);
          }}
          onRoleUpdated={(newRole, uid) => {
            setRegisteredUsersList((prev) =>
              prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u))
            );
          }}
        />
      )}

      {/* Super Admin Reveal Admin Recovery Code Modal */}
      {selectedAdminForRecovery && (
        <AdminRecoveryCodeModal
          adminCitizen={selectedAdminForRecovery}
          isOpen={Boolean(selectedAdminForRecovery)}
          onClose={() => setSelectedAdminForRecovery(null)}
        />
      )}
    </div>
  );
};
