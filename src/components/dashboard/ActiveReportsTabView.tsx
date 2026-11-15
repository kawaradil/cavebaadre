import React, { useState, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  CivicReport,
  SECTOR_META,
  ReportSector,
  isReportUrgencyConfirmed,
  isReportOpened,
  isReportSentToDepartment,
} from '../../types/baadre';
import { SmartAdaptiveImage } from '../SmartAdaptiveImage';
import { FIELD_LIMITS, enforceInputLimit } from '../../lib/inputLimits';
import { playClickSound } from '../../lib/sound';

export interface ActiveReportsTabViewProps {
  isRTL: boolean;
  localeCode: string;
  currentUser: any;
  totalReportsCount: number;
  activeIncomingReports: CivicReport[];
  adminSearch: string;
  setAdminSearch: (val: string) => void;
  adminSectorFilter: 'ALL' | ReportSector;
  setAdminSectorFilter: (sec: 'ALL' | ReportSector) => void;
  adminVisibleReportsCount: number;
  setAdminVisibleReportsCount: React.Dispatch<React.SetStateAction<number>>;
  hasMoreReports: boolean;
  loadMoreReports: () => void;
  tr: (ar: string, ku: string, en: string) => string;
  getSectorLabel: (secKey: ReportSector) => string;
  getUrgencyLabel: (urgKey: CivicReport['urgency']) => string;
  onSelectReport: (report: CivicReport) => void;
  onEditCitizenReport: (report: CivicReport) => void;
  onRequestDeleteReport: (report: CivicReport) => void;
}

export const ActiveReportsTabView: React.FC<ActiveReportsTabViewProps> = ({
  isRTL,
  localeCode,
  currentUser,
  totalReportsCount,
  activeIncomingReports,
  adminSearch,
  setAdminSearch,
  adminSectorFilter,
  setAdminSectorFilter,
  adminVisibleReportsCount,
  setAdminVisibleReportsCount,
  hasMoreReports,
  loadMoreReports,
  tr,
  getSectorLabel,
  getUrgencyLabel,
  onSelectReport,
  onEditCitizenReport,
  onRequestDeleteReport,
}) => {
  const [cardPhotoIdxByReportId, setCardPhotoIdxByReportId] = useState<Record<string, number>>({});
  const cardSwipeStartRef = useRef<number | null>(null);
  const cardDidSwipeRef = useRef<boolean>(false);

  return (
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
            {tr('جميع القطاعات', 'هەموو کەرتەکان', 'All Sectors')} ({totalReportsCount})
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
          const isReportCreator = Boolean(
            currentUser &&
              (rep.ownerUid === currentUser.uid || rep.citizenId === currentUser.uid)
          );
          const canCreatorEditReport =
            isReportCreator && rep.status === 'pending' && !isReportSentToDepartment(rep);

          const resolvedCardPhotos =
            rep.status === 'resolved'
              ? Array.from(
                  new Set([
                    ...(rep.resolvedImages || []),
                    ...(rep.images || []),
                  ].filter(Boolean))
                )
              : rep.images || [];
          const activeCardPhotoIdx =
            resolvedCardPhotos.length > 0
              ? (cardPhotoIdxByReportId[rep.id] || 0) % resolvedCardPhotos.length
              : 0;
          const activeCardPhotoSrc =
            resolvedCardPhotos[activeCardPhotoIdx] || rep.images[0];

          const stepCardPhoto = (delta: number) => {
            if (resolvedCardPhotos.length <= 1) return;
            playClickSound();
            setCardPhotoIdxByReportId((prev) => {
              const curr = prev[rep.id] || 0;
              const next =
                (curr + delta + resolvedCardPhotos.length) % resolvedCardPhotos.length;
              return { ...prev, [rep.id]: next };
            });
          };

          return (
            <div
              key={rep.id}
              onClick={() => {
                playClickSound();
                onSelectReport(rep);
              }}
              className="group rounded-3xl bg-white transition-all duration-300 overflow-hidden flex flex-col justify-between border-0 shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.10)] cursor-pointer"
            >
              <div
                className="relative aspect-video w-full overflow-hidden bg-[#1E3725] select-none touch-pan-y"
                onTouchStart={(e) => {
                  if (rep.status !== 'resolved' || resolvedCardPhotos.length <= 1) return;
                  cardSwipeStartRef.current = e.touches[0].clientX;
                  cardDidSwipeRef.current = false;
                }}
                onTouchEnd={(e) => {
                  if (
                    rep.status !== 'resolved' ||
                    cardSwipeStartRef.current === null ||
                    resolvedCardPhotos.length <= 1
                  )
                    return;
                  const deltaX = e.changedTouches[0].clientX - cardSwipeStartRef.current;
                  cardSwipeStartRef.current = null;
                  if (Math.abs(deltaX) > 30) {
                    cardDidSwipeRef.current = true;
                    stepCardPhoto(deltaX > 0 ? (isRTL ? 1 : -1) : isRTL ? -1 : 1);
                  }
                }}
                onMouseDown={(e) => {
                  if (rep.status !== 'resolved' || resolvedCardPhotos.length <= 1) return;
                  cardSwipeStartRef.current = e.clientX;
                  cardDidSwipeRef.current = false;
                }}
                onMouseUp={(e) => {
                  if (
                    rep.status !== 'resolved' ||
                    cardSwipeStartRef.current === null ||
                    resolvedCardPhotos.length <= 1
                  )
                    return;
                  const deltaX = e.clientX - cardSwipeStartRef.current;
                  cardSwipeStartRef.current = null;
                  if (Math.abs(deltaX) > 35) {
                    cardDidSwipeRef.current = true;
                    stepCardPhoto(deltaX > 0 ? (isRTL ? 1 : -1) : isRTL ? -1 : 1);
                  }
                }}
                onClickCapture={(e) => {
                  if (cardDidSwipeRef.current) {
                    e.stopPropagation();
                    e.preventDefault();
                    cardDidSwipeRef.current = false;
                  }
                }}
              >
                <SmartAdaptiveImage
                  src={activeCardPhotoSrc}
                  alt={rep.title}
                  disableLightbox
                />

                {rep.status === 'resolved' && resolvedCardPhotos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        stepCardPhoto(isRTL ? 1 : -1);
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/45 hover:bg-black/70 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                      aria-label={tr('الصورة السابقة', 'وێنەی پێشوو', 'Previous Photo')}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        stepCardPhoto(isRTL ? -1 : 1);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/45 hover:bg-black/70 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                      aria-label={tr('الصورة التالية', 'وێنەی دواتر', 'Next Photo')}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}

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

              <div
                dir={isRTL ? 'rtl' : 'ltr'}
                className={`p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 bg-white ${
                  isRTL ? 'text-right' : 'text-left'
                }`}
              >
                <div className="space-y-2">
                  <h3 className="text-base font-black text-[#1E3725] group-hover:text-[#46674D] transition-colors leading-snug">
                    {rep.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#2D4833] leading-relaxed font-medium">
                    {rep.description}
                  </p>
                </div>

                <div
                  className={`pt-3 border-t border-[#E8F4EA] space-y-2 text-xs font-bold text-[#2D4833] ${
                    isRTL ? 'text-right' : 'text-left'
                  }`}
                >
                  <div className="flex items-center justify-start gap-1.5 text-xs text-[#46674D]">
                    <span>{tr('رمز البلاغ:', 'کۆدێ سکاڵایێ:', 'Report Code:')}</span>
                    <span className="font-mono font-black text-[#1E3725]" dir="ltr">
                      {rep.trackingCode}
                    </span>
                  </div>

                  {statusStep && (
                    <p
                      className={`font-black flex items-center justify-start gap-1.5 ${statusStep.colorClass}`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${statusStep.dotClass}`} />
                      <span>{statusStep.text}</span>
                    </p>
                  )}

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

                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="pt-2 border-t border-[#E8F4EA] flex items-center justify-end gap-4"
                  >
                    {canCreatorEditReport && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playClickSound();
                          onEditCitizenReport(rep);
                        }}
                        className="text-[11px] font-bold text-[#46674D] hover:text-[#1E3725] transition-colors cursor-pointer"
                      >
                        {tr('تعديل البلاغ', 'دەستکاری سکاڵا', 'Edit Report')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playClickSound();
                        onRequestDeleteReport(rep);
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
  );
};
