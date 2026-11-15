import React from 'react';
import {
  MapPin,
  User,
  Phone,
  Copy,
  Check,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { CivicReport, SECTOR_META, ReportUrgency } from '../../types/baadre';
import { toEnglishDigits, formatReportDateTime } from './reportShareHelpers';

export interface ReportReceivedAndPriorityStepsProps {
  report: CivicReport;
  activeRole: 'citizen' | 'admin';
  sectorLabel: string;
  urgencyLabel: string;
  selectedUrgency: ReportUrgency;
  isUrgencyConfirmed: boolean;
  urgencySavedToast: boolean;
  copiedCode: boolean;
  onCopyCode: () => void;
  onSelectUrgency: (urgency: ReportUrgency) => void;
  statusStep: {
    text: string;
    colorClass: string;
    dotClass: string;
    timestamp?: string;
  };
  tr: (ar: string, ku: string, en: string) => string;
}

export const ReportReceivedAndPrioritySteps: React.FC<ReportReceivedAndPriorityStepsProps> = ({
  report,
  activeRole,
  sectorLabel,
  urgencyLabel,
  selectedUrgency,
  isUrgencyConfirmed,
  urgencySavedToast,
  copiedCode,
  onCopyCode,
  onSelectUrgency,
  statusStep,
  tr,
}) => {
  const sector = SECTOR_META[report.sector] || SECTOR_META.other;

  const getUrgencyColorClass = (urg: ReportUrgency = selectedUrgency) => {
    if (urg === 'emergency') return 'text-rose-600';
    if (urg === 'high') return 'text-amber-600';
    return 'text-emerald-700';
  };

  return (
    <>
      {/* المرحلة 1: تم الاستلام */}
      <div className="relative flex items-start gap-3">
        <div className="relative z-10 w-8 h-8 rounded-full bg-[#46674D] text-white border-2 border-[#46674D] flex items-center justify-center shrink-0 text-xs font-black shadow-xs">
          1
        </div>

        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="w-full px-4 py-2.5 rounded-xl bg-[#46674D] text-white text-xs font-black flex flex-wrap items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <span>📥</span>
              <span>{tr('تم الاستلام', 'وەرگیرا', 'Received')}</span>
            </div>
            <span
              dir="ltr"
              className="text-[11px] font-mono font-bold bg-white/15 px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1 tabular-nums"
            >
              <Clock className="w-3 h-3" />
              <span>{formatReportDateTime(report.createdAt)}</span>
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#BBDDC6] shadow-xs space-y-3 text-xs sm:text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E8F4EA]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#46674D]">
                  {tr('رمز البلاغ:', 'کۆدی سکاڵا:', 'Code:')}
                </span>
                <button
                  type="button"
                  onClick={onCopyCode}
                  dir="ltr"
                  className="inline-flex items-center gap-1.5 font-mono font-black text-[#1E3725] hover:text-[#46674D] cursor-pointer tabular-nums"
                >
                  <span>{toEnglishDigits(report.trackingCode)}</span>
                  {copiedCode ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#46674D]" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#46674D]">
                  {tr('القطاع:', 'کەرت:', 'Sector:')}
                </span>
                <span className="font-black text-[#1E3725]">
                  {sector.badgeEmoji} {sectorLabel}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-2">
              <span className="text-xs font-bold text-[#46674D]">
                {tr('الحالة الحالية:', 'دۆخی ئێستا:', 'Current Status:')}
              </span>
              <span
                className={`font-black inline-flex items-center gap-1.5 ${statusStep.colorClass}`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${statusStep.dotClass}`} />
                <span>{statusStep.text}</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-4">
              <div className="inline-flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#46674D]" />
                <span className="text-xs font-bold text-[#46674D]">
                  {tr('المبلّغ:', 'سکاڵاکار:', 'Reporter:')}
                </span>
                <span className="font-black text-[#1E3725]">{report.citizenName}</span>
              </div>

              <div className="inline-flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#46674D]" />
                <span className="font-mono font-black text-[#1E3725]" dir="ltr">
                  {report.citizenPhone}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#46674D]" />
                <span className="font-bold text-[#1E3725]">
                  {report.neighborhood} — {report.street}
                  {report.landmark ? ` (${report.landmark})` : ''}
                </span>
              </div>

              <a
                href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-black text-[#46674D] hover:text-[#1E3725] inline-flex items-center gap-1 underline underline-offset-4"
              >
                <span>{tr('موقع GPS', 'شوێنی GPS', 'GPS Map')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="pt-2.5 border-t border-[#E8F4EA] space-y-1">
              <span className="text-xs font-bold text-[#46674D]">
                {tr('تفاصيل البلاغ:', 'وردەکاری سکاڵا:', 'Report Details:')}
              </span>
              <p className="text-xs sm:text-sm text-[#2D4833] leading-relaxed font-medium bg-[#F4F9F5] p-2.5 rounded-xl border border-[#E8F4EA]">
                {report.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* المرحلة 2: تحديد الأولوية */}
      <div className="relative flex items-start gap-3">
        <div
          className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 text-xs font-black transition-all ${
            isUrgencyConfirmed
              ? 'bg-[#46674D] text-white border-[#46674D] shadow-xs'
              : 'bg-slate-100 text-slate-400 border-slate-200'
          }`}
        >
          2
        </div>

        <div className="flex-1 min-w-0 space-y-2.5">
          {activeRole === 'admin' ? (
            <>
              <div
                className={`w-full px-4 py-2.5 rounded-xl border text-xs font-black flex items-center justify-between gap-2 ${
                  isUrgencyConfirmed
                    ? 'bg-white border-[#BBDDC6] text-[#1E3725] shadow-2xs'
                    : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}
              >
                <span>{tr('تحديد الأولوية', 'دیاریکردنی گرنگی', 'Set Priority')}</span>
                {isUrgencyConfirmed ? (
                  <span className={`font-black ${getUrgencyColorClass()}`}>
                    ● {urgencyLabel}
                    {urgencySavedToast ? ` (${tr('تم الحفظ', 'پاشەکەوتکرا', 'Saved')})` : ''}
                  </span>
                ) : (
                  <span className="font-bold text-slate-400">
                    ● {tr('غير محددة', 'دیارینەکراوە', 'Unset')}
                  </span>
                )}
              </div>

              <div className="p-3 rounded-2xl bg-white border border-[#BBDDC6] grid grid-cols-3 gap-2 shadow-2xs">
                <button
                  type="button"
                  onClick={() => onSelectUrgency('normal')}
                  className={`py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isUrgencyConfirmed && selectedUrgency === 'normal'
                      ? 'bg-[#46674D] text-white border-[#46674D] shadow-xs'
                      : 'bg-[#F4F9F5] text-[#2D4833] border-[#BBDDC6] hover:border-[#46674D]'
                  }`}
                >
                  <span>🟢</span>
                  <span>{tr('اعتيادي', 'ئاسایی', 'Normal')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectUrgency('high')}
                  className={`py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isUrgencyConfirmed && selectedUrgency === 'high'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-[#F4F9F5] text-amber-700 border-amber-300 hover:border-amber-500'
                  }`}
                >
                  <span>🟠</span>
                  <span>{tr('مهم', 'گرنگ', 'High')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectUrgency('emergency')}
                  className={`py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isUrgencyConfirmed && selectedUrgency === 'emergency'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-[#F4F9F5] text-rose-700 border-rose-300 hover:border-rose-500'
                  }`}
                >
                  <span>🔴</span>
                  <span>{tr('طارئ', 'بەپەلە', 'Emergency')}</span>
                </button>
              </div>
            </>
          ) : (
            <div
              className={`w-full px-4 py-2.5 rounded-xl border text-xs font-black flex flex-wrap items-center justify-between gap-2 ${
                isUrgencyConfirmed
                  ? 'bg-white border-[#BBDDC6] text-[#1E3725] shadow-2xs'
                  : 'bg-slate-100 border-slate-200 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    isUrgencyConfirmed ? 'bg-[#46674D]' : 'bg-slate-400'
                  }`}
                />
                <span>
                  {isUrgencyConfirmed
                    ? tr(
                        'تم فتح البلاغ وتحديد الأولوية',
                        'سکاڵاکە کرایەوە و گرنگی دیاریکرا',
                        'Report Opened & Priority Set'
                      )
                    : tr('تحديد الأولوية', 'دیاریکردنی گرنگی', 'Set Priority')}
                </span>
              </div>
              {isUrgencyConfirmed ? (
                report.urgencySetAt ? (
                  <span
                    dir="ltr"
                    className="text-[11px] font-mono font-bold text-[#46674D] bg-[#F4F9F5] px-2 py-0.5 rounded-lg inline-flex items-center gap-1 tabular-nums"
                  >
                    <Clock className="w-3 h-3" />
                    <span>{formatReportDateTime(report.urgencySetAt)}</span>
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8F4EA] text-[#2D4833] font-black">
                    {tr('تم التحديد ✓', 'دیاریکرا ✓', 'Set ✓')}
                  </span>
                )
              ) : (
                <span className="text-[11px] font-bold text-slate-400">
                  {tr('غير محددة', 'دیارینەکراوە', 'Unset')}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
