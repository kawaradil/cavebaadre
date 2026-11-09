import React, { useState } from 'react';
import {
  PlusCircle,
  Hash,
  AlertTriangle,
  LogIn,
  Eye,
  X,
  MapPin,
  Calendar,
} from 'lucide-react';
import { useBaadre } from '../context/BaadreContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  CivicReport,
  SECTOR_META,
  isReportSentToDepartment,
  isReportUrgencyConfirmed,
} from '../types/baadre';
import { OrganizationProjectsView } from './OrganizationProjectsView';
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
  onOpenSubmitReport,
}) => {
  const { myReports, citizenTab, deleteReport, setEditingCitizenReport } = useBaadre();
  const { isLoggedIn, openAuthModal, currentUser, isAdmin, isSuperAdmin } = useAuth();
  const { language, dir, isRTL } = useLanguage();
  const [reportToDelete, setReportToDelete] = useState<CivicReport | null>(null);
  const [previewReport, setPreviewReport] = useState<CivicReport | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(12);

  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

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

      {/* نافذة معاينة البلاغ (تفتح عبر زر العين بعد تحديد الحالة) */}
      {previewReport && (
        <div
          className="fixed inset-0 z-[150] bg-[#1E3725]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setPreviewReport(null)}
        >
          <div
            dir={dir}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-3xl bg-white border border-[#BBDDC6] shadow-[0_24px_60px_rgba(30,55,37,0.28)] p-5 space-y-4 max-h-[85vh] overflow-y-auto ${
              isRTL ? 'text-right' : 'text-left'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E8F4EA]">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#E8F4EA] text-[#46674D] flex items-center justify-center shrink-0">
                  <Eye className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-[#1E3725]">
                    {tr('معاينة البلاغ', 'بینینی سکاڵا', 'Report Preview')}
                  </h3>
                  <p className="text-[11px] font-mono font-bold text-[#46674D]" dir="ltr">
                    #{toEnglishDigits(previewReport.trackingCode)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewReport(null)}
                className="p-1.5 rounded-full bg-[#F4F9F5] text-[#2D4833] hover:bg-[#E8F4EA] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* صور البلاغ الميداني */}
            {previewReport.images && previewReport.images.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {previewReport.images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={previewReport.title}
                    className="w-full h-28 object-cover rounded-2xl border border-[#BBDDC6]"
                  />
                ))}
              </div>
            )}

            <div className="space-y-2.5 bg-[#F4F9F5] p-3.5 rounded-2xl border border-[#BBDDC6]/60">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-[#46674D]">
                  {language === 'ku'
                    ? SECTOR_META[previewReport.sector]?.ku
                    : language === 'en'
                    ? SECTOR_META[previewReport.sector]?.en
                    : SECTOR_META[previewReport.sector]?.ar}
                </span>
                <span className="text-[11px] font-mono text-slate-500 inline-flex items-center gap-1" dir="ltr">
                  <Calendar className="w-3 h-3" />
                  {new Date(previewReport.createdAt).toLocaleDateString('en-GB')}
                </span>
              </div>
              <h4 className="text-sm font-black text-[#1E3725]">{previewReport.title}</h4>
              <p className="text-xs font-medium text-[#2D4833] leading-relaxed">
                {previewReport.description}
              </p>
              <div className="pt-2 border-t border-[#E8F4EA] flex items-center gap-1.5 text-[11px] font-bold text-[#46674D]">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {previewReport.neighborhood}
                  {previewReport.landmark ? ` • ${previewReport.landmark}` : ''}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPreviewReport(null)}
              className="w-full py-2.5 rounded-xl bg-[#46674D] hover:bg-[#36593F] text-white text-xs font-black transition-colors cursor-pointer"
            >
              {tr('إغلاق المعاينة', 'داخستن', 'Close Preview')}
            </button>
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

      {/* كروت تتبع بلاغاتي: صغيرة فقط (كود البلاغ + حالة البلاغ + تعديل/حذف قبل تحديد الحالة أو زر عين للمعاينة بعد تحديد الحالة) */}
      {myReports.length > 0 ? (
        <div className="space-y-4">
          <div className="space-y-2.5">
            {myReports.slice(0, visibleCount).map((report) => {
              const isSentToDept = isReportSentToDepartment(report);
              const isUrgencySet = isReportUrgencyConfirmed(report);
              // هل تم تحديد حالة أو أولوية البلاغ من قِبل الإدارة؟
              const isStatusDetermined =
                report.status !== 'pending' || isSentToDept || isUrgencySet;

              const isReportCreator = Boolean(
                currentUser &&
                  (report.ownerUid === currentUser.uid || report.citizenId === currentUser.uid)
              );

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
                if (isUrgencySet) {
                  return {
                    text: tr('تم تحديد الحالة (قيد المتابعة)', 'دۆخ دیاریکرا', 'Status Determined'),
                    colorClass: 'text-amber-600',
                    dotClass: 'bg-amber-500',
                  };
                }
                return {
                  text: tr('بانتظار تحديد الحالة', 'لە چاوەڕوانی دیاریکردنی دۆخ', 'Awaiting Status'),
                  colorClass: 'text-slate-400',
                  dotClass: 'bg-slate-300',
                };
              };

              const statusDisplay = getStatusDisplay();
              // المواطن يستطيع التعديل والحذف فقط قبل تحديد الحالة
              const canCitizenEditAndDelete = isReportCreator && !isStatusDetermined;
              // عند تحديد الحالة يستطيع المواطن فقط معاينة البلاغ عبر زر عين
              const showCitizenPreviewEye = isReportCreator && isStatusDetermined;
              // الأدمن والسوبر أدمن يستطيعون حذف البلاغ
              const canAdminDelete = isAdmin || isSuperAdmin;

              return (
                <div
                  key={report.id}
                  dir={dir}
                  className="rounded-2xl bg-white/95 border border-[#BBDDC6] shadow-[0_4px_14px_rgba(70,103,77,0.06)] px-4 py-3 flex flex-wrap items-center justify-between gap-3 transition-all select-none"
                >
                  {/* كود البلاغ */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-[#46674D]">
                      {tr('كود البلاغ:', 'کۆدی سکاڵا:', 'Report Code:')}
                    </span>
                    <bdi
                      dir="ltr"
                      className="inline-flex items-center gap-0.5 font-mono text-sm sm:text-base font-black text-[#1E3725] tabular-nums"
                    >
                      <Hash className="w-3.5 h-3.5 text-[#46674D] shrink-0" />
                      <span>{toEnglishDigits(report.trackingCode)}</span>
                    </bdi>
                  </div>

                  {/* حالة البلاغ + أزرار التحكم */}
                  <div className="flex items-center gap-3 min-w-0 flex-wrap">
                    <span
                      className={`text-xs sm:text-sm font-black inline-flex items-center gap-1.5 truncate ${statusDisplay.colorClass}`}
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDisplay.dotClass}`}
                      />
                      <span className="truncate">{statusDisplay.text}</span>
                    </span>

                    <div className="flex items-center gap-2.5 ps-2 border-s border-[#E8F4EA]">
                      {/* قبل تحديد الحالة: المواطن يستطيع تعديل وحذف البلاغ */}
                      {canCitizenEditAndDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playClickSound();
                            setEditingCitizenReport(report);
                          }}
                          className="text-[11px] font-bold text-[#46674D] hover:text-[#1E3725] transition-colors cursor-pointer"
                        >
                          {tr('تعديل', 'دەستکاری', 'Edit')}
                        </button>
                      )}

                      {(canCitizenEditAndDelete || canAdminDelete) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playClickSound();
                            setReportToDelete(report);
                          }}
                          className="text-[11px] font-bold text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                        >
                          {tr('حذف', 'سڕینەوە', 'Delete')}
                        </button>
                      )}

                      {/* بعد تحديد الحالة: يستطيع المواطن فقط معاينة البلاغ عبر زر عين */}
                      {showCitizenPreviewEye && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playClickSound();
                            setPreviewReport(report);
                          }}
                          title={tr('معاينة البلاغ', 'بینینی سکاڵا', 'Preview Report')}
                          aria-label={tr('معاينة البلاغ', 'بینینی سکاڵا', 'Preview Report')}
                          className="w-8 h-8 rounded-xl bg-[#E8F4EA] hover:bg-[#D4EADB] text-[#2D4833] flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-4 h-4 stroke-[2.2]" />
                        </button>
                      )}
                    </div>
                  </div>
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


