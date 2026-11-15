import React, { useState } from 'react';
import {
  Building2,
  Phone,
  MessageCircle,
  MapPin,
  ShieldCheck,
  Trash2,
  Users,
  Ban,
  Unlock,
  UserCog,
  Key,
  Shield,
  ShieldAlert,
  Lock,
  Mail,
  Calendar,
  UserPlus,
  ChevronDown,
  Edit2,
} from 'lucide-react';
import { AdminCitizenDTO } from '../../types/dto';
import { MunicipalDepartment } from '../../types/baadre';
import { OFFICIAL_PHONE_LOCAL, toWhatsAppIntlNumber, toTelHref } from '../../constants/officialContact';
import { playClickSound } from '../../lib/sound';

export interface CitizenAccordionCardProps {
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
  onDeleteCitizen: (cit: AdminCitizenDTO) => void;
}

export const CitizenAccordionCard: React.FC<CitizenAccordionCardProps> = ({
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
  onDeleteCitizen,
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
            <div className="flex items-center gap-1.5 truncate">
              <Mail className="w-3.5 h-3.5 text-[#46674D] shrink-0" />
              <bdi
                dir="ltr"
                className="text-xs sm:text-sm font-black font-mono text-[#1E3725] truncate"
              >
                {cit.email || '—'}
              </bdi>
            </div>

            <p className="text-xs font-bold text-[#2D4833] truncate mt-0.5">
              <bdi>{displayName}</bdi>
            </p>

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

      {isOpen && (
        <div className="p-4 pt-2 border-t border-[#E8F4EA] space-y-3.5 bg-white">
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
                  href={toTelHref(cit.phone)}
                  className="p-2 rounded-xl bg-[#F4F9F5] text-[#46674D] hover:bg-[#E8F4EA] transition-all"
                  title={tr('اتصال هاتفي', 'پەیوەندیکردن', 'Call Citizen')}
                >
                  <Phone className="w-4 h-4" />
                </a>
                <a
                  href={`https://wa.me/${toWhatsAppIntlNumber(cit.phone)}`}
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

          <div
            dir={isRTL ? 'rtl' : 'ltr'}
            className={`p-3.5 rounded-2xl bg-[#F4F9F5]/95 border border-[#E8F4EA] space-y-2 text-xs ${
              isRTL ? 'text-right' : 'text-left'
            }`}
          >
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
                    {tr('منح صلاحية أدمن', 'پێدانی دەسەڵاتی ئەدمین', 'Grant Admin Role')}
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
                    {tr('استرجاع إلى مواطن', 'گەڕاندنەوە بۆ هاووڵاتی', 'Revert to Citizen')}
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

                {!isProtectedSuperAdmin &&
                  cit.role !== 'super_admin' &&
                  currentUser?.uid !== citId &&
                  (isSuperAdmin || cit.role === 'citizen') && (
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        onDeleteCitizen(cit);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{tr('حذف المواطن', 'سڕینەوەی هاووڵاتی', 'Delete Citizen')}</span>
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

export interface DepartmentAccordionCardProps {
  dept: MunicipalDepartment;
  isRTL: boolean;
  tr: (ar: string, ku: string, en: string) => string;
  completedCount: number;
  displayName: string;
  formatWaNumber: (num: string) => string;
  onDeleteDept: (dept: MunicipalDepartment) => void;
  onEditDept?: (dept: MunicipalDepartment) => void;
}

export const DepartmentAccordionCard: React.FC<DepartmentAccordionCardProps> = ({
  dept,
  isRTL,
  tr,
  completedCount,
  displayName,
  formatWaNumber,
  onDeleteDept,
  onEditDept,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const phone1 = dept.phone1 || dept.engineerPhone || dept.phone || OFFICIAL_PHONE_LOCAL;
  const owner1 =
    dept.phone1Owner ||
    dept.engineerName ||
    dept.headName ||
    tr('مسؤول التواصل', 'بەرپرسی پەیوەندی', 'Contact Official');

  const phone2 =
    dept.phone2 ||
    dept.managerPhone ||
    dept.emergencyPhone ||
    dept.deputyPhone ||
    OFFICIAL_PHONE_LOCAL;
  const owner2 =
    dept.phone2Owner ||
    dept.managerName ||
    dept.deputyName ||
    tr('مسؤول إضافي', 'بەرپرسی تر', 'Secondary Official');

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`rounded-3xl bg-white border border-[#E8F4EA] shadow-[0_8px_24px_rgba(70,103,77,0.06)] hover:shadow-[0_12px_32px_rgba(70,103,77,0.1)] transition-all overflow-hidden ${
        isRTL ? 'text-right' : 'text-left'
      }`}
    >
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

      {isOpen && (
        <div className="p-4 pt-2 border-t border-[#E8F4EA] space-y-3 bg-white">
          <div className="p-3 rounded-2xl bg-[#F4F9F5] flex items-center justify-between gap-3">
            <div className={`min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
              <span className="text-[10px] font-black text-[#46674D] block">
                {tr('المسؤول', 'بەرپرس', 'Officer')}
              </span>
              <p className="text-xs sm:text-sm font-black text-[#1E3725] truncate mt-0.5">
                <bdi>{owner1}</bdi>
              </p>
              <bdi className="text-xs font-mono font-bold text-[#2D4833] block mt-0.5" dir="ltr">
                {phone1}
              </bdi>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={toTelHref(phone1)}
                className="p-2 rounded-xl bg-white text-[#46674D] hover:bg-[#E8F4EA] transition-colors"
                title={tr('اتصال هاتفي', 'پەیوەندی تەلەفۆنی', 'Call')}
              >
                <Phone className="w-4 h-4" />
              </a>
              <a
                href={`https://wa.me/${formatWaNumber(phone1)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-[#46674D] text-white hover:bg-[#36593F] transition-colors"
                title={tr('واتساب', 'واتسئەپ', 'WhatsApp')}
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {phone2 && (
            <div className="p-3 rounded-2xl bg-[#F4F9F5] flex items-center justify-between gap-3">
              <div className={`min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                <span className="text-[10px] font-black text-[#46674D] block">
                  {tr('رقم إضافي', 'ژمارەی تر', 'Secondary Number')}
                </span>
                <p className="text-xs sm:text-sm font-black text-[#1E3725] truncate mt-0.5">
                  <bdi>{owner2}</bdi>
                </p>
                <bdi className="text-xs font-mono font-bold text-[#2D4833] block mt-0.5" dir="ltr">
                  {phone2}
                </bdi>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={toTelHref(phone2)}
                  className="p-2 rounded-xl bg-white text-[#46674D] hover:bg-[#E8F4EA] transition-colors"
                  title={tr('اتصال هاتفي', 'پەیوەندی تەلەفۆنی', 'Call')}
                >
                  <Phone className="w-4 h-4" />
                </a>
                <a
                  href={`https://wa.me/${formatWaNumber(phone2)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-[#46674D] text-white hover:bg-[#36593F] transition-colors"
                  title={tr('واتساب', 'واتسئەپ', 'WhatsApp')}
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 gap-2">
            {onEditDept ? (
              <button
                type="button"
                onClick={() => onEditDept(dept)}
                className="px-3.5 py-1.5 rounded-xl bg-[#E8F4EA] hover:bg-[#D4EADB] text-[#2D4833] text-xs font-black inline-flex items-center gap-1.5 transition-colors cursor-pointer border-0"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{tr('تعديل الدائرة', 'دەستکاریکردنی فەرمانگە', 'Edit Department')}</span>
              </button>
            ) : (
              <div />
            )}

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
