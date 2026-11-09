import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import {
  CivicReport,
  SECTOR_META,
  URGENCY_META,
  ReportSector,
  isReportUrgencyConfirmed,
  isReportOpened,
} from '../../types/baadre';
import { SmartAdaptiveImage } from '../SmartAdaptiveImage';
import { FIELD_LIMITS, enforceInputLimit } from '../../lib/inputLimits';
import { playClickSound } from '../../lib/sound';

interface ActiveReportsTabViewProps {
  reports: CivicReport[];
  isRTL: boolean;
  language: 'ar' | 'ku' | 'en';
  tr: (ar: string, ku: string, en: string) => string;
  hasMoreReports: boolean;
  loadMoreReports: () => void;
  onSelectReport: (report: CivicReport) => void;
  onDeleteReportPrompt: (report: CivicReport) => void;
}

export const ActiveReportsTabView: React.FC<ActiveReportsTabViewProps> = React.memo(
  ({
    reports,
    isRTL,
    language,
    tr,
    hasMoreReports,
    loadMoreReports,
    onSelectReport,
    onDeleteReportPrompt,
  }) => {
    const [adminSectorFilter, setAdminSectorFilter] = useState<'ALL' | ReportSector>('ALL');
    const [adminSearch, setAdminSearch] = useState('');
    const [adminVisibleReportsCount, setAdminVisibleReportsCount] = useState<number>(12);

    const localeCode = 'en-US';

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

    const activeIncomingReports = useMemo(() => {
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

                    {/* Sector & Colored Urgency */}
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

                    {/* Delete Report Button */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="pt-2 border-t border-[#E8F4EA] flex items-center justify-end"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playClickSound();
                          onDeleteReportPrompt(rep);
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
  }
);
