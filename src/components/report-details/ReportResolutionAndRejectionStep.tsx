import React from 'react';
import {
  X,
  Check,
  Camera,
  Upload,
  Loader2,
  Clock,
  Edit3,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { CivicReport } from '../../types/baadre';
import { MAX_UPLOAD_IMAGES } from '../../lib/firebase';
import { SmartAdaptiveImage } from '../SmartAdaptiveImage';
import { FIELD_LIMITS, FieldLimitBadge } from '../../lib/inputLimits';
import { playClickSound } from '../../lib/sound';
import { TimelineActionStatus } from './reportShareHelpers';

export interface ReportResolutionAndRejectionStepProps {
  report: CivicReport;
  activeRole: 'citizen' | 'admin';
  hasResolvedRecord: boolean;
  hasRejectedRecord: boolean;
  editingStep: TimelineActionStatus | null;
  setEditingStep: (step: TimelineActionStatus | null) => void;
  savedResolvedTime: string;
  savedResolvedNote: string;
  savedRejectedTime: string;
  savedRejectedNote: string;
  resolvedImages: string[];
  uploadLimitMessage: string;
  onResolvedImagesUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void> | void;
  onRemoveResolvedImage: (index: number) => void;
  resolvedNoteValue: string;
  onChangeResolvedNote: (val: string) => void;
  rejectedNoteValue: string;
  onChangeRejectedNote: (val: string) => void;
  isUploadingStorage: boolean;
  isRevertConfirmOpen: boolean;
  setIsRevertConfirmOpen: (open: boolean) => void;
  onConfirmRevertResolution: () => void;
  onSaveResolved: (e: React.FormEvent) => void;
  onSaveRejected: (e: React.FormEvent) => void;
  tr: (ar: string, ku: string, en: string) => string;
}

export const ReportResolutionAndRejectionStep: React.FC<ReportResolutionAndRejectionStepProps> = ({
  report,
  activeRole,
  hasResolvedRecord,
  hasRejectedRecord,
  editingStep,
  setEditingStep,
  savedResolvedTime,
  savedResolvedNote,
  savedRejectedTime,
  savedRejectedNote,
  resolvedImages,
  uploadLimitMessage,
  onResolvedImagesUpload,
  onRemoveResolvedImage,
  resolvedNoteValue,
  onChangeResolvedNote,
  rejectedNoteValue,
  onChangeRejectedNote,
  isUploadingStorage,
  isRevertConfirmOpen,
  setIsRevertConfirmOpen,
  onConfirmRevertResolution,
  onSaveResolved,
  onSaveRejected,
  tr,
}) => {
  return (
    <div className="relative flex items-start gap-3">
      <div
        dir="ltr"
        className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 text-xs font-mono font-black transition-all ${
          hasResolvedRecord
            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
            : hasRejectedRecord
            ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
            : 'bg-slate-100 text-slate-500 border-slate-200'
        }`}
      >
        4
      </div>

      <div className="flex-1 min-w-0 space-y-3">
        {/* أ. قسم تم الإنجاز */}
        {!(activeRole !== 'admin' && hasRejectedRecord) && (
          <div className="space-y-2.5">
            <div
              className={`w-full px-4 py-2.5 rounded-xl border text-xs font-black flex items-center justify-between gap-2 ${
                hasResolvedRecord
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    hasResolvedRecord ? 'bg-white' : 'bg-slate-400'
                  }`}
                />
                <span>{tr('تم الإنجاز', 'ئەنجامدرا', 'Completed')}</span>
              </div>

              {!hasResolvedRecord && activeRole === 'admin' && editingStep !== 'resolved' && (
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsRevertConfirmOpen(false);
                    setEditingStep('resolved');
                  }}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black cursor-pointer transition-colors"
                >
                  {tr('تحديد تم الإنجاز', 'دیاریکردنی ئەنجامدان', 'Mark Completed')}
                </button>
              )}

              {hasResolvedRecord && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-white/20 text-white">
                  {tr('تم الإنجاز ✓', 'ئەنجامدرا ✓', 'Completed ✓')}
                </span>
              )}
            </div>

            {hasResolvedRecord && editingStep !== 'resolved' && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-2xl bg-white border border-emerald-200 shadow-xs space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black text-emerald-800">
                    {tr('سجل الإنجاز المحفوظ', 'تۆماری ئەنجامدان', 'Saved Completion Record')}
                  </span>

                  <div className="flex items-center gap-2">
                    {savedResolvedTime && (
                      <span
                        dir="ltr"
                        className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg inline-flex items-center gap-1 tabular-nums text-emerald-700 bg-emerald-50"
                      >
                        <Clock className="w-3 h-3" />
                        <span>{savedResolvedTime}</span>
                      </span>
                    )}
                    {activeRole === 'admin' && (
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setIsRevertConfirmOpen(false);
                          setEditingStep('resolved');
                        }}
                        title={tr('تعديل', 'دەستکاری', 'Edit')}
                        aria-label={tr('تعديل', 'دەستکاری', 'Edit')}
                        className="w-7 h-7 rounded-lg bg-emerald-50/80 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {savedResolvedNote && (
                  <p className="text-xs text-[#1E3725] font-medium bg-[#F4F9F5] p-2.5 rounded-xl border border-[#E8F4EA]">
                    {savedResolvedNote}
                  </p>
                )}

                {report.resolvedImages && report.resolvedImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {report.resolvedImages.map((imgUrl, idx) => (
                      <div
                        key={`saved-res-img-${idx}`}
                        className="rounded-xl overflow-hidden border border-emerald-200 bg-[#1E3725] aspect-video"
                      >
                        <SmartAdaptiveImage
                          src={imgUrl}
                          alt={`Completed ${idx + 1}`}
                          gallery={report.resolvedImages}
                          initialIndex={idx}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeRole === 'admin' && editingStep === 'resolved' && (
              <motion.form
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={onSaveResolved}
                className="p-4 rounded-2xl bg-white border-2 border-emerald-300 shadow-sm space-y-3.5"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-emerald-800">
                      {tr(
                        'إدراج صور الإنجاز:',
                        'زیادکردنی وێنەکانی ئەنجامدان:',
                        'Completion Photos:'
                      )}
                    </label>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black">
                      {resolvedImages.length} / {MAX_UPLOAD_IMAGES}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {resolvedImages.length < MAX_UPLOAD_IMAGES && (
                      <label className="flex-1 inline-flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-emerald-400 bg-[#F4F9F5] hover:bg-emerald-50 transition-all cursor-pointer">
                        <Upload className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-black text-[#1E3725]">
                          {tr('اختيار صور الإنجاز', 'هەڵبژاردنی وێنەکان', 'Select Photos')}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={onResolvedImagesUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {uploadLimitMessage && (
                    <p className="text-[11px] font-black text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
                      {uploadLimitMessage}
                    </p>
                  )}

                  {resolvedImages.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                      {resolvedImages.map((imgUrl, idx) => (
                        <div
                          key={`resolved-upload-${idx}`}
                          className="relative group rounded-xl overflow-hidden border border-emerald-300 aspect-video bg-[#1E3725]"
                        >
                          <SmartAdaptiveImage
                            src={imgUrl}
                            alt={`Completion ${idx + 1}`}
                            gallery={resolvedImages}
                            initialIndex={idx}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveResolvedImage(idx);
                            }}
                            className="absolute top-1.5 left-1.5 z-20 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md hover:bg-rose-700 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <span className="absolute bottom-1 right-1 z-20 px-1.5 py-0.5 rounded bg-emerald-700/90 text-white text-[9px] font-bold flex items-center gap-1 pointer-events-none">
                            <Camera className="w-2.5 h-2.5" />
                            <span>#{idx + 1}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-xs font-black text-emerald-800">
                      {tr('الملاحظات:', 'تێبینییەکان:', 'Notes:')}
                    </label>
                    <FieldLimitBadge
                      value={resolvedNoteValue}
                      maxWords={FIELD_LIMITS.DESCRIPTION.maxWords}
                      maxChars={FIELD_LIMITS.DESCRIPTION.maxChars}
                    />
                  </div>
                  <textarea
                    rows={2}
                    maxLength={FIELD_LIMITS.DESCRIPTION.maxChars}
                    value={resolvedNoteValue}
                    onChange={(e) => onChangeResolvedNote(e.target.value)}
                    placeholder={tr(
                      'اكتب ملاحظات وتفاصيل الإنجاز...',
                      'تێبینی و وردەکاری ئەنجامدان بنووسە...',
                      'Write completion notes...'
                    )}
                    className="w-full bg-[#F4F9F5] border border-emerald-200 focus:border-emerald-600 focus:bg-white rounded-xl p-2.5 text-xs font-bold text-[#1E3725] focus:outline-none"
                  />
                </div>

                {isRevertConfirmOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 space-y-2.5"
                  >
                    <div className="flex items-start gap-2 text-xs font-black text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        {tr(
                          'تنبيه: سيتم حذف صور وملاحظات الإنجاز وإزالة البلاغ من قسم الأعمال المنجزة، هل أنت متأكد؟',
                          'ئاگاداری: وێنە و تێبینییەکانی ئەنجامدان دەسڕدرێنەوە و لە کارە ئەنجامدراوەکان لادەبرێت، ئایا دڵنیایت؟',
                          'Warning: Completion photos and notes will be deleted and removed from Completed Works. Are you sure?'
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onConfirmRevertResolution}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer"
                      >
                        {tr('نعم، متأكد (احذف الإنجاز)', 'بەڵێ، دڵنیام', 'Yes, Delete Completion')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsRevertConfirmOpen(false)}
                        className="px-3.5 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 font-black text-xs cursor-pointer"
                      >
                        {tr('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
                      </button>
                    </div>
                  </motion.div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isUploadingStorage}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                    >
                      {isUploadingStorage ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{tr('جاري الحفظ...', 'پاشەکەوتکردن...', 'Saving...')}</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{tr('حفظ', 'پاشەکەوتکردن', 'Save')}</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRevertConfirmOpen(false);
                        setEditingStep(null);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#F4F9F5] hover:bg-[#E8F4EA] text-[#2D4833] font-bold text-xs cursor-pointer"
                    >
                      {tr('إغلاق', 'داخستن', 'Close')}
                    </button>
                  </div>

                  {hasResolvedRecord && !isRevertConfirmOpen && (
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setIsRevertConfirmOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-black text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{tr('لم يتم الإنجاز', 'ئەنجام نەدراوە', 'Not Completed')}</span>
                    </button>
                  )}
                </div>
              </motion.form>
            )}
          </div>
        )}

        {/* ب. قسم تم الرفض */}
        {!hasResolvedRecord && (activeRole === 'admin' || hasRejectedRecord) && (
          <div className="space-y-2.5">
            <div
              className={`w-full px-4 py-2.5 rounded-xl border text-xs font-black flex items-center justify-between gap-2 ${
                hasRejectedRecord
                  ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>⚫</span>
                <span>{tr('تم الرفض (مرفوض)', 'ڕەتکرایەوە', 'Rejected')}</span>
              </div>

              {!hasRejectedRecord && activeRole === 'admin' && editingStep !== 'rejected' && (
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setEditingStep('rejected');
                  }}
                  className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-[11px] font-black cursor-pointer transition-colors"
                >
                  {tr('تحديد مرفوض', 'دیاریکردنی ڕەتکردنەوە', 'Mark Rejected')}
                </button>
              )}

              {hasRejectedRecord && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-black">
                  {tr('تم الحفظ ✓', 'پاشەکەوتکرا ✓', 'Saved ✓')}
                </span>
              )}
            </div>

            {hasRejectedRecord && editingStep !== 'rejected' && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black text-rose-800">
                    {tr('سجل الرفض المحفوظ', 'تۆماری ڕەتکردنەوە', 'Saved Rejection Record')}
                  </span>

                  <div className="flex items-center gap-2">
                    {savedRejectedTime && (
                      <span
                        dir="ltr"
                        className="text-[11px] font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg inline-flex items-center gap-1 tabular-nums"
                      >
                        <Clock className="w-3 h-3" />
                        <span>{savedRejectedTime}</span>
                      </span>
                    )}
                    {activeRole === 'admin' && (
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setEditingStep('rejected');
                        }}
                        title={tr('تعديل', 'دەستکاری', 'Edit')}
                        aria-label={tr('تعديل', 'دەستکاری', 'Edit')}
                        className="w-7 h-7 rounded-lg bg-rose-50/80 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {savedRejectedNote && (
                  <p className="text-xs text-[#1E3725] font-medium bg-[#F4F9F5] p-2.5 rounded-xl border border-[#E8F4EA]">
                    {savedRejectedNote}
                  </p>
                )}
              </motion.div>
            )}

            {activeRole === 'admin' && editingStep === 'rejected' && (
              <motion.form
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={onSaveRejected}
                className="p-4 rounded-2xl bg-white border-2 border-rose-300 shadow-sm space-y-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-xs font-black text-rose-800">
                      {tr(
                        'ملاحظة وسبب الرفض:',
                        'تێبینی و هۆکاری ڕەتکردنەوە:',
                        'Rejection Note:'
                      )}
                    </label>
                    <FieldLimitBadge
                      value={rejectedNoteValue}
                      maxWords={FIELD_LIMITS.DESCRIPTION.maxWords}
                      maxChars={FIELD_LIMITS.DESCRIPTION.maxChars}
                    />
                  </div>
                  <textarea
                    rows={2}
                    required
                    maxLength={FIELD_LIMITS.DESCRIPTION.maxChars}
                    value={rejectedNoteValue}
                    onChange={(e) => onChangeRejectedNote(e.target.value)}
                    placeholder={tr(
                      'اكتب سبب وملاحظة رفض البلاغ...',
                      'هۆکار و تێبینی ڕەتکردنەوەی سکاڵا بنووسە...',
                      'Write rejection note...'
                    )}
                    className="w-full bg-[#F4F9F5] border border-rose-200 focus:border-rose-600 focus:bg-white rounded-xl p-2.5 text-xs font-bold text-[#1E3725] focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-black text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{tr('حفظ', 'پاشەکەوتکردن', 'Save')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingStep(null)}
                    className="px-3.5 py-2 rounded-xl bg-[#F4F9F5] hover:bg-[#E8F4EA] text-[#2D4833] font-bold text-xs cursor-pointer"
                  >
                    {tr('إغلاق', 'داخستن', 'Close')}
                  </button>
                </div>
              </motion.form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
