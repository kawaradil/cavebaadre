import React, { useState } from 'react';
import {
  MapPin,
  PlusCircle,
  Camera,
  User,
  Hash,
  Layers,
  Compass,
  Clock,
  AlertTriangle,
  LogIn,
  ChevronDown,
} from 'lucide-react';
import { useBaadre } from '../context/BaadreContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  CivicReport,
  SECTOR_META,
  isReportUrgencyConfirmed,
  isReportOpened,
} from '../types/baadre';
import { OrganizationProjectsView } from './OrganizationProjectsView';
import { SmartAdaptiveImage } from './SmartAdaptiveImage';
import { playClickSound } from '../lib/sound';

interface CitizenTrackingViewProps {
  onSelectReport: (report: CivicReport) => void;
  onOpenSubmitReport: () => void;
}

const toEnglishDigits = (val: string | number): string =>
  String(val)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));

export const CitizenTrackingView: React.FC<CitizenTrackingViewProps> = ({
  onSelectReport,
  onOpenSubmitReport,
}) => {
  const { myReports, citizenTab, deleteReport, setEditingCitizenReport } = useBaadre();
  const { isLoggedIn, openAuthModal } = useAuth();
  const { language, dir, isRTL } = useLanguage();
  const [reportToDelete, setReportToDelete] = useState<CivicReport | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(12);
  const [openedReportCardId, setOpenedReportCardId] = useState<string | null>(null);

  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

  const formatDateAndTime = (dateString: string) => {
    try {
      const d = new Date(dateString);
      const datePart = d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const timePart = d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return toEnglishDigits(`${datePart} • ${timePart}`);
    } catch {
      return '';
    }
  };

  if (citizenTab === 'works' || citizenTab === 'projects') {
    return <OrganizationProjectsView />;
  }

  if (!isLoggedIn) {
    return (
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5 space-y-6">
        <div
          className={`p-5 sm:p-6 rounded-3xl bg-white/95 backdrop-blur-2xl border border-[#BBDDC6] shadow-[0_12px_36px_rgba(70,103,77,0.1)] space-y-1.5 ${
            isRTL ? 'text-right' : 'text-left'
          }`}
        >
          <h2
            className={`${
              language === 'ku'
                ? 'text-base sm:text-lg font-bold'
                : 'text-xl sm:text-2xl font-black'
            } text-[#1E3725] leading-snug`}
          >
            {tr(
              'تتبع بلاغاتي',
              'سکاڵاکانم',
              'Track My Reports'
            )}
          </h2>
        </div>

        <div className="p-8 sm:p-10 rounded-3xl bg-white/95 border border-[#BBDDC6] text-center space-y-4 shadow-[0_8px_28px_rgba(70,103,77,0.08)]">
          <div className="w-14 h-14 rounded-2xl bg-[#E8F4EA] border border-[#BBDDC6] flex items-center justify-center text-[#46674D] mx-auto">
            <LogIn className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base sm:text-lg font-black text-[#1E3725]">
              {tr(
                'قم بالتسجيل لتتبع بلاغاتك',
                'خۆت تۆمار بکە بۆ بەدواداچوونی سکاڵاکانت',
                'Please register or sign in to track your reports'
              )}
            </h3>
            <p className="text-xs text-[#46674D] font-bold leading-relaxed">
              {tr(
                'يرجى تسجيل الدخول أو إنشاء حساب مواطن جديد لتتمكن من إضافة البلاغات ومتابعة حالتها.',
                'تکایە چوونەژوورەوە ئەنجام بدە یان هەژمارێکی نوێ دروست بکە بۆ زیادکردن و بەدواداچوونی سکاڵاکانت.',
                'Sign in or create a citizen account to submit reports and track their status.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              openAuthModal('login');
            }}
            className="px-6 py-3 rounded-2xl bg-gradient-to-tr from-[#33553C] via-[#46674D] to-[#5C8564] text-white font-black text-xs sm:text-sm inline-flex items-center gap-2 shadow-[0_8px_22px_rgba(70,103,77,0.28)] hover:brightness-105 hover:scale-105 active:scale-95 transition-all cursor-pointer border-0 outline-none"
          >
            <LogIn className="w-4.5 h-4.5 stroke-[2.5]" />
            <span>
              {tr('تسجيل الدخول / إنشاء حساب', 'چوونەژوورەوە / خۆتۆمارکردن', 'Sign In / Register')}
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-5 space-y-5">
      {/* تنبيه على الشاشة عند النقر على حذف البلاغ */}
      {reportToDelete && (
        <div
          className="fixed inset-0 z-[150] bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setReportToDelete(null)}
        >
          <div
            dir={dir}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-3xl bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)] border border-rose-100 space-y-4 ${
              isRTL ? 'text-right' : 'text-left'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#1E3725]">
                  {tr('تنبيه حذف البلاغ', 'ئاگاداری سڕینەوەی سکاڵا', 'Delete Report Alert')}
                </h3>
                <p className="text-xs font-bold text-slate-500 mt-0.5" dir="ltr">
                  #{toEnglishDigits(reportToDelete.trackingCode)}
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm font-bold text-[#2D4833] leading-relaxed">
              {tr(
                'هل أنت متأكد من رغبتك في حذف هذا البلاغ نهائياً؟',
                'ئایا دڵنیایت لە سڕینەوەی ئەم سکاڵایە بە تەواوی؟',
                'Are you sure you want to permanently delete this report?'
              )}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setReportToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition-colors cursor-pointer"
              >
                {tr('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  deleteReport(reportToDelete.id);
                  setReportToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-colors cursor-pointer shadow-xs"
              >
                {tr('نعم، حذف البلاغ', 'بەڵێ، بیسڕەوە', 'Yes, Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Header Box */}
      <div
        className={`p-5 sm:p-6 rounded-3xl bg-white/95 backdrop-blur-2xl border border-[#BBDDC6] shadow-[0_12px_36px_rgba(70,103,77,0.1)] space-y-1.5 ${
          isRTL ? 'text-right' : 'text-left'
        }`}
      >
        <h2
          className={`${
            language === 'ku'
              ? 'text-base sm:text-lg font-bold'
              : 'text-xl sm:text-2xl font-black'
          } text-[#1E3725] leading-snug`}
        >
          {tr(
            'بلاغاتي المضافة ومتابعة الإحالة للدوائر الخدمية',
            'سکاڵا زیادکراوەکانم و بەدواداچوونی ناردنیان بۆ فەرمانگەکان',
            'My Submitted Reports & Departmental Referral Tracking'
          )}
        </h2>
      </div>

      {/* قائمة بلاغات المواطن على شكل ملاحظات تحت بعض (رقم البلاغ + حالة البلاغ فقط) وعند النقر يفتح كارت البلاغ */}
      {myReports.length > 0 ? (
        <div className="space-y-4">
          <div className="space-y-3">
            {myReports.slice(0, visibleCount).map((report) => {
              const sectorMeta = SECTOR_META[report.sector] || SECTOR_META.other;
              const sectorLabel =
                language === 'ku'
                  ? sectorMeta.ku
                  : language === 'en'
                  ? sectorMeta.en
                  : sectorMeta.ar;

              const isUrgencySet = isReportUrgencyConfirmed(report);
              const isSentToDept =
                Boolean(report.statusTimestamps?.in_progress) ||
                Boolean(report.statusNotes?.in_progress) ||
                report.status === 'in_progress' ||
                report.status === 'resolved';

              const imageCount =
                (report.images?.length || 1) + (report.resolvedImages?.length || 0);

              const getStatusDisplay = () => {
                if (report.status === 'resolved') {
                  return {
                    text: tr('تم الإنجاز', 'ئەنجامدرا', 'Completed'),
                    colorClass: 'text-emerald-600',
                    dotClass: 'bg-emerald-600',
                  };
                }
                if (report.status === 'rejected') {
                  const rejLabel = tr('تم رفض البلاغ', 'ڕەتکرایەوە', 'Rejected');
                  return {
                    text: report.officialNote
                      ? `${rejLabel} — ${report.officialNote}`
                      : rejLabel,
                    colorClass: 'text-slate-600',
                    dotClass: 'bg-slate-600',
                  };
                }
                if (isSentToDept) {
                  return {
                    text: tr('تم الإرسال', 'نێردرا بۆ فەرمانگە', 'Sent to Department'),
                    colorClass: 'text-blue-600',
                    dotClass: 'bg-blue-600',
                  };
                }
                return {
                  text: tr('تم الإرسال (غير مرسل بعد)', 'نەنێردراوە', 'Not Sent Yet'),
                  colorClass: 'text-slate-400',
                  dotClass: 'bg-slate-300',
                };
              };

              const statusDisplay = getStatusDisplay();
              const isCardOpened = openedReportCardId === report.id;

              return (
                <div
                  key={report.id}
                  dir={dir}
                  className="rounded-2xl bg-white/95 border border-[#BBDDC6] shadow-[0_4px_18px_rgba(70,103,77,0.08)] overflow-hidden transition-all"
                >
                  {/* شريط الملاحظة: يوضح رقم البلاغ وحالة البلاغ فقط، وعند النقر عليه يفتح كارت البلاغ */}
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setOpenedReportCardId((prev) => (prev === report.id ? null : report.id));
                    }}
                    className={`w-full px-4 py-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isCardOpened ? 'bg-[#F4F9F5]' : 'bg-white hover:bg-[#F4F9F5]/70'
                    }`}
                  >
                    {/* رقم البلاغ */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-[#46674D]">
                        {tr('رقم البلاغ:', 'ژمارەی سکاڵا:', 'Report #:')}
                      </span>
                      <bdi
                        dir="ltr"
                        className="inline-flex items-center gap-0.5 font-mono text-sm sm:text-base font-black text-[#1E3725] tabular-nums"
                      >
                        <Hash className="w-3.5 h-3.5 text-[#46674D] shrink-0" />
                        <span>{toEnglishDigits(report.trackingCode)}</span>
                      </bdi>
                    </div>

                    {/* حالة البلاغ + سهم الفتح */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`text-xs sm:text-sm font-black inline-flex items-center gap-1.5 truncate ${statusDisplay.colorClass}`}
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDisplay.dotClass}`}
                        />
                        <span className="truncate">{statusDisplay.text}</span>
                      </span>

                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 ${
                          isCardOpened
                            ? 'bg-[#46674D] text-white rotate-180'
                            : 'bg-[#F4F9F5] text-[#46674D]'
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </button>

                  {/* كارت البلاغ الكامل يظهر عند النقر على الملاحظة (بدون فتح التفاصيل عند النقر على الكارت، مع إتاحة فتح الصور) */}
                  {isCardOpened && (
                    <div className="p-3 sm:p-4 border-t border-[#E8F4EA] bg-[#F4F9F5]/60">
                      <div className="group relative rounded-[24px] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-300 ease-out flex flex-col select-none overflow-hidden border border-[#E8F4EA]">
                        {/* Top Framed Image Section: 16:9 Fit (فتح الصور مفعل عند النقر) */}
                        <div className="relative w-full aspect-video rounded-t-[24px] rounded-b-none overflow-hidden bg-slate-900">
                          <SmartAdaptiveImage
                            src={report.images?.[0]}
                            alt={report.title}
                            gallery={
                              report.images && report.images.length > 0
                                ? report.images
                                : undefined
                            }
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none z-20" />

                          {/* Top Right Badge */}
                          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                            <span className="px-3.5 py-1 rounded-full text-xs font-black bg-[#46674D] text-white shadow-sm backdrop-blur-md">
                              {sectorLabel}
                            </span>
                          </div>

                          {/* Top Left Circular Icon */}
                          <div className="absolute top-3 left-3 z-10">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/95 text-[#1E3725] shadow-md flex items-center justify-center backdrop-blur-md border border-white/40 text-base">
                              {sectorMeta.badgeEmoji}
                            </div>
                          </div>

                          {/* Bottom Left Image Counter Pill */}
                          <div
                            className="absolute bottom-3 left-3 z-10 flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15 shadow-sm"
                            dir="ltr"
                          >
                            <span className="text-[11px] font-mono font-bold text-white/95 flex items-center gap-1.5">
                              <span>1/{toEnglishDigits(imageCount)}</span>
                              <Camera className="w-3.5 h-3.5 text-[#E8F4EA]" />
                            </span>
                            <span className="w-2 h-2 rounded-full bg-[#46674D]" />
                          </div>

                          {/* نص البلاغ الجديد باللون الأحمر وينبض */}
                          {!isReportOpened(report) && report.status === 'pending' && (
                            <div
                              dir={isRTL ? 'rtl' : 'ltr'}
                              className="absolute bottom-3 right-4 z-20 flex items-center gap-2 pointer-events-none select-none"
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

                        {/* Card Details Body */}
                        <div
                          dir={dir}
                          className={`p-4 sm:p-5 flex-1 flex flex-col justify-between bg-white ${
                            isRTL ? 'text-right' : 'text-left'
                          }`}
                        >
                          <div>
                            {/* Title */}
                            <h3
                              className="text-base sm:text-[17px] font-black text-[#1E3725] group-hover:text-[#46674D] transition-colors line-clamp-2 leading-snug"
                              title={report.title}
                            >
                              <bdi>{report.title}</bdi>
                            </h3>

                            {/* Location */}
                            <div className="flex items-center justify-start gap-1.5 text-xs sm:text-[13px] text-[#46674D] font-bold mt-2">
                              <MapPin className="w-4 h-4 text-[#46674D] shrink-0" />
                              <span className="truncate">
                                {tr('باعدرى', 'باعەدرێ', 'Baadre')} • {report.neighborhood}
                                {report.street ? ` • ${report.street}` : ''}
                              </span>
                            </div>

                            {/* Date and Time Row */}
                            <div className="flex items-center justify-start gap-1.5 text-xs text-[#46674D] font-bold mt-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#46674D] shrink-0" />
                              <bdi dir="ltr" className="font-mono tabular-nums text-[#1E3725]">
                                {formatDateAndTime(report.createdAt)}
                              </bdi>
                            </div>

                            {/* Specs Row */}
                            <div className="mt-3 pt-2.5 border-t border-[#E8F4EA] flex items-center justify-start gap-2 flex-wrap text-xs sm:text-[13px] text-[#2D4833] font-bold">
                              <bdi
                                className="inline-flex items-center gap-1 font-mono font-black text-[#1E3725] tabular-nums"
                                dir="ltr"
                              >
                                <Hash className="w-3.5 h-3.5 text-[#46674D] shrink-0" />
                                <span>{toEnglishDigits(report.trackingCode)}</span>
                              </bdi>

                              <span className="text-[#BBDDC6]">•</span>

                              <span className="inline-flex items-center gap-1 font-bold text-[#1E3725]">
                                <Layers className="w-3.5 h-3.5 text-[#46674D] shrink-0" />
                                <span>{sectorLabel}</span>
                              </span>

                              <span className="text-[#BBDDC6]">•</span>

                              <span
                                className={`inline-flex items-center gap-1 font-black ${
                                  isUrgencySet ? 'text-[#46674D]' : 'text-[#46674D]/70'
                                }`}
                              >
                                <Compass className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  {isUrgencySet
                                    ? tr(
                                        'تم فتح البلاغ وتحديد الأولوية',
                                        'سکاڵا کرایەوە و گرنگی دیاریکرا',
                                        'Opened & Priority Set'
                                      )
                                    : tr(
                                        'تحديد الأولوية (غير محددة)',
                                        'دیاریکردنی گرنگی (دیاری نەکراوە)',
                                        'Priority Not Set Yet'
                                      )}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Bottom Status & Citizen Row */}
                          <div className="mt-3 pt-2.5 border-t border-[#E8F4EA] space-y-2.5">
                            <div className="flex items-end justify-between gap-2">
                              <div className="flex flex-col min-w-0">
                                <span
                                  className={`text-base sm:text-lg font-black tracking-tight leading-snug flex items-center gap-1.5 ${statusDisplay.colorClass}`}
                                >
                                  <span
                                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDisplay.dotClass}`}
                                  />
                                  <span className="truncate">{statusDisplay.text}</span>
                                </span>
                                <div className="flex items-center gap-1 text-xs text-[#46674D] font-bold mt-1 truncate">
                                  <User className="w-3.5 h-3.5 text-[#46674D] shrink-0" />
                                  <span className="truncate">
                                    <bdi>{report.citizenName}</bdi>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* زر تعديل البلاغ أمام زر حذف البلاغ للمواطن */}
                            {!isSentToDept && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="pt-2 border-t border-[#E8F4EA] flex items-center justify-end gap-4"
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playClickSound();
                                    setEditingCitizenReport(report);
                                  }}
                                  className="text-[11px] font-bold text-[#46674D] hover:text-[#1E3725] transition-colors cursor-pointer"
                                >
                                  {tr('تعديل البلاغ', 'دەستکاری سکاڵا', 'Edit Report')}
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playClickSound();
                                    setReportToDelete(report);
                                  }}
                                  className="text-[11px] font-bold text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                                >
                                  {tr('حذف البلاغ', 'سڕینەوەی سکاڵا', 'Delete Report')}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {myReports.length > visibleCount && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setVisibleCount((prev) => prev + 12);
                }}
                className="px-6 py-2.5 rounded-2xl bg-[#46674D] text-white font-black text-xs inline-flex items-center gap-2 hover:bg-[#33553C] transition-all cursor-pointer shadow-sm border-0"
              >
                <span>
                  {tr(
                    `عرض المزيد من البلاغات (${Math.min(visibleCount, myReports.length)} من ${myReports.length})`,
                    `پیشاندانی سکاڵای زیاتر (${Math.min(visibleCount, myReports.length)} لە ${myReports.length})`,
                    `Show More Reports (${Math.min(visibleCount, myReports.length)} of ${myReports.length})`
                  )}
                </span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 sm:p-10 rounded-3xl bg-white/95 border border-[#BBDDC6] text-center space-y-4 shadow-[0_8px_28px_rgba(70,103,77,0.08)]">
          <div className="w-14 h-14 rounded-2xl bg-[#E8F4EA] border border-[#BBDDC6] flex items-center justify-center text-[#46674D] mx-auto">
            <PlusCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base sm:text-lg font-black text-[#1E3725]">
              {tr(
                'لا توجد بلاغات مضافة من قِبلك حتى الآن',
                'هێشتا هیچ سکاڵایەک لەلایەن تۆوە زیاد نەکراوە',
                'No reports submitted by you yet'
              )}
            </h3>
            <p className="text-xs text-[#46674D] font-bold leading-relaxed">
              {tr(
                'بمجرد إضافة بلاغ جديد، سيظهر هنا فوراً مع كود المتابعة وحالة البلاغ.',
                'هەر کە سکاڵایەکی نوێ زیاد بکەیت، دەستبەجێ لێرە دەردەکەوێت لەگەڵ کۆدی بەدواداچوون و دۆخی سکاڵاکە.',
                'Once you submit a new report, it will appear here immediately with its tracking code and status.'
              )}
            </p>
          </div>
          <button
            onClick={() => {
              playClickSound();
              onOpenSubmitReport();
            }}
            className="px-6 py-3 rounded-2xl bg-gradient-to-tr from-[#33553C] via-[#46674D] to-[#5C8564] text-white font-black text-xs sm:text-sm inline-flex items-center gap-2 shadow-[0_8px_22px_rgba(70,103,77,0.28)] hover:brightness-105 hover:scale-105 active:scale-95 transition-all cursor-pointer border-0 outline-none"
          >
            <PlusCircle className="w-4.5 h-4.5 stroke-[2.5]" />
            <span>
              {tr('تقديم بلاغ جديد الآن', 'ئێستا سکاڵای نوێ پێشکەش بکە', 'Submit New Report Now')}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};


