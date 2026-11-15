import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { CivicReport } from '../../types/baadre';
import { AdminCitizenDTO } from '../../types/dto';
import { playClickSound } from '../../lib/sound';

export interface DashboardConfirmModalsProps {
  isRTL: boolean;
  tr: (ar: string, ku: string, en: string) => string;
  reportToDelete: CivicReport | null;
  onCancelDeleteReport: () => void;
  onConfirmDeleteReport: (reportId: string) => void;
  citizenToDelete: AdminCitizenDTO | null;
  onCancelDeleteCitizen: () => void;
  onConfirmDeleteCitizen: (citizen: AdminCitizenDTO) => Promise<void> | void;
}

export const DashboardConfirmModals: React.FC<DashboardConfirmModalsProps> = ({
  isRTL,
  tr,
  reportToDelete,
  onCancelDeleteReport,
  onConfirmDeleteReport,
  citizenToDelete,
  onCancelDeleteCitizen,
  onConfirmDeleteCitizen,
}) => {
  return (
    <>
      {reportToDelete && (
        <div
          dir={isRTL ? 'rtl' : 'ltr'}
          onClick={onCancelDeleteReport}
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
                  onConfirmDeleteReport(reportToDelete.id);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer transition-colors shadow-xs"
              >
                {tr('نعم، حذف البلاغ', 'بەڵێ، سڕینەوە', 'Yes, Delete')}
              </button>
              <button
                type="button"
                onClick={onCancelDeleteReport}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
              >
                {tr('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {citizenToDelete && (
        <div
          dir={isRTL ? 'rtl' : 'ltr'}
          onClick={onCancelDeleteCitizen}
          className="fixed inset-0 z-[175] bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
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
                {tr(
                  'تأكيد حذف المواطن من التطبيق',
                  'پشتڕاستکردنەوەی سڕینەوەی هاووڵاتی لە ئەپڵیکەیشن',
                  'Confirm Delete Citizen from Application'
                )}
              </h4>
              <p className="text-xs font-bold text-[#46674D] leading-relaxed">
                {tr(
                  'هل أنت متأكد من حذف هذا المواطن (المستخدم) نهائياً من أساس التطبيق؟ لا يمكن التراجع عن هذا الإجراء.',
                  'ئایا دڵنیایت لە سڕینەوەی ئەم هاووڵاتییە (بەکارهێنەرە) بە تەواوی لە بنەمای ئەپڵیکەیشنەکە؟',
                  'Are you sure you want to permanently delete this citizen (user) from the core application?'
                )}
              </p>
              <p className="text-xs font-black text-rose-700">
                {citizenToDelete.fullName || (citizenToDelete as any).name}
              </p>
              {citizenToDelete.email && (
                <p className="text-[11px] font-mono font-bold text-slate-600" dir="ltr">
                  {citizenToDelete.email}
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={async () => {
                  playClickSound();
                  await onConfirmDeleteCitizen(citizenToDelete);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer transition-colors shadow-xs"
              >
                {tr('نعم، حذف المواطن', 'بەڵێ، سڕینەوەی هاووڵاتی', 'Yes, Delete Citizen')}
              </button>
              <button
                type="button"
                onClick={onCancelDeleteCitizen}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
              >
                {tr('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
