import React from 'react';
import {
  ClipboardList,
  ChevronDown,
  Send,
  CheckCircle2,
  Trash2,
  Sparkles,
  Pencil,
  PauseCircle,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CommunitySurvey } from '../../types/baadre';
import { playClickSound } from '../../lib/sound';

interface CreatedSurveysListTabProps {
  dir: 'rtl' | 'ltr';
  tr: (ar: string, ku: string, en: string) => string;
  filteredSurveys: CommunitySurvey[];
  openedSurveyId: string | null;
  setOpenedSurveyId: (id: string | null) => void;
  publishFeedbackId: string | null;
  surveyToDelete: { id: string; title: string } | null;
  setSurveyToDelete: (val: { id: string; title: string } | null) => void;
  onCreateNew: () => void;
  onStartEditSurvey: (surveyId: string) => void;
  onPublishToCitizens: (surveyId: string, publishState: boolean) => void;
  onConfirmDeleteSurvey: (surveyId: string) => void;
}

export const CreatedSurveysListTab: React.FC<CreatedSurveysListTabProps> = ({
  dir,
  tr,
  filteredSurveys,
  openedSurveyId,
  setOpenedSurveyId,
  publishFeedbackId,
  surveyToDelete,
  setSurveyToDelete,
  onCreateNew,
  onStartEditSurvey,
  onPublishToCitizens,
  onConfirmDeleteSurvey,
}) => {
  return (
    <>
      <div className="space-y-4">
        {filteredSurveys.length === 0 ? (
          <div className="p-10 rounded-3xl bg-white/95 text-center space-y-3 shadow-[0_10px_32px_rgba(30,55,37,0.08)]">
            <div className="w-12 h-12 rounded-2xl bg-[#E8F4EA] text-[#46674D] flex items-center justify-center mx-auto">
              <ClipboardList className="w-6 h-6" />
            </div>
            <p className="text-sm font-black text-[#1E3725]">
              {tr(
                'لا توجد استبيانات مطابقة للبحث',
                'هیچ ڕاپرسییەک نەدۆزرایەوە',
                'No matching surveys found'
              )}
            </p>
            <button
              type="button"
              onClick={onCreateNew}
              className="px-4 py-2 rounded-xl bg-[#46674D] text-white text-xs font-black cursor-pointer"
            >
              {tr('إنشاء استبيان جديد الآن', 'دروستکردنی ڕاپرسی نوێ', 'Create New Survey')}
            </button>
          </div>
        ) : (
          filteredSurveys.map((survey) => {
            const isExpanded = openedSurveyId === survey.id;
            const isJustPublished = publishFeedbackId === survey.id;

            return (
              <div
                key={survey.id}
                className="rounded-3xl bg-white/95 shadow-[0_12px_36px_rgba(30,55,37,0.09)] overflow-hidden transition-all"
              >
                <div
                  onClick={() => {
                    playClickSound();
                    setOpenedSurveyId(isExpanded ? null : survey.id);
                  }}
                  className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#F4F9F5]/70 transition-colors"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#E8F4EA] text-[#1E3725] text-[10px] font-black">
                        {tr('عنوان الاستبيان:', 'ناونیشانی ڕاپرسی:', 'Survey Title:')}
                      </span>

                      {survey.isPublishedToCitizens ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{tr('منشور', 'بڵاوکراوەتەوە', 'Published')}</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#F4F9F5] text-[#46674D] text-[10px] font-black">
                          {tr('متوقف / غير منشور', 'ڕاگیراوە', 'Paused')}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-[#1E3725] leading-snug">
                      {survey.title}
                    </h3>
                    <p className="text-xs text-[#2D4833] font-bold line-clamp-2">
                      {survey.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-9 h-9 rounded-2xl bg-[#E8F4EA]/80 text-[#46674D] flex items-center justify-center shadow-2xs">
                      <ChevronDown
                        className={`w-4.5 h-4.5 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 sm:p-5 pt-0 space-y-4 border-t border-[#E8F4EA]">
                        <div className="space-y-3 pt-3">
                          {survey.questions.map((q, qIdx) => (
                            <div
                              key={q.id}
                              className="p-3.5 rounded-2xl bg-[#F4F9F5] space-y-2 shadow-2xs"
                            >
                              <p className="text-xs font-black text-[#1E3725]">
                                {qIdx + 1}. {q.questionText}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {q.options.map((opt, oIdx) => (
                                  <span
                                    key={opt.id}
                                    className="px-3 py-1.5 rounded-xl bg-white text-[#2D4833] text-[11px] font-bold shadow-2xs flex items-center gap-1.5"
                                  >
                                    <span className="w-4 h-4 rounded-full bg-[#E8F4EA] text-[#46674D] text-[9px] font-black flex items-center justify-center">
                                      {oIdx + 1}
                                    </span>
                                    <span>{opt.text}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {isJustPublished && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 rounded-2xl bg-[#E8F4EA] text-[#1E3725] text-xs font-black flex items-center gap-2 shadow-2xs"
                          >
                            <Sparkles className="w-4 h-4 text-[#46674D] shrink-0" />
                            <span>
                              {tr(
                                'تم نشر الاستبيان على حساب المواطنين بنجاح.',
                                'ڕاپرسییەکە بە سەرکەوتوویی بڵاوکرایەوە.',
                                'Survey published to citizens account.'
                              )}
                            </span>
                          </motion.div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                          <button
                            type="button"
                            onClick={() => onPublishToCitizens(survey.id, true)}
                            className="py-2.5 px-3.5 rounded-2xl bg-[#E8F4EA] hover:bg-[#D7EBDC] text-[#1E3725] font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_4px_14px_rgba(70,103,77,0.10)] active:scale-95 transition-all cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5 text-[#46674D]" />
                            <span>
                              {tr('نشر الاستبيان', 'بڵاوکردنەوەی ڕاپرسی', 'Publish Survey')}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onStartEditSurvey(survey.id)}
                            className="py-2.5 px-3.5 rounded-2xl bg-[#F4F9F5] hover:bg-[#E8F4EA] text-[#2D4833] font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_4px_14px_rgba(70,103,77,0.07)] active:scale-95 transition-all cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5 text-[#46674D]" />
                            <span>{tr('تعديل', 'دەستکاری', 'Edit')}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onPublishToCitizens(survey.id, false)}
                            className="py-2.5 px-3.5 rounded-2xl bg-[#F4F9F5] hover:bg-amber-50/90 text-[#2D4833] hover:text-amber-800 font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_4px_14px_rgba(70,103,77,0.07)] active:scale-95 transition-all cursor-pointer"
                          >
                            <PauseCircle className="w-3.5 h-3.5 text-[#46674D]" />
                            <span>{tr('توقف', 'ڕاگرتن', 'Stop')}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              playClickSound();
                              setSurveyToDelete({ id: survey.id, title: survey.title });
                            }}
                            className="py-2.5 px-3.5 rounded-2xl bg-rose-50/80 hover:bg-rose-100/90 text-rose-700 font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_4px_14px_rgba(225,29,72,0.07)] active:scale-95 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>{tr('حذف', 'سڕینەوە', 'Delete')}</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* نافذة تأكيد حذف الاستبيان */}
      {surveyToDelete && (
        <div
          dir={dir}
          onClick={() => setSurveyToDelete(null)}
          className="fixed inset-0 z-[170] bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
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
                {tr('تأكيد حذف الاستبيان', 'پشتڕاستکردنەوەی سڕینەوەی ڕاپرسی', 'Confirm Delete Survey')}
              </h4>
              <p className="text-xs font-bold text-[#46674D] leading-relaxed">
                {tr(
                  'هل أنت متأكد من حذف هذا الاستبيان نهائياً؟',
                  'ئایا دڵنیایت لە سڕینەوەی ئەم ڕاپرسییە؟',
                  'Are you sure you want to permanently delete this survey?'
                )}
              </p>
              <p className="text-xs font-black text-rose-700 line-clamp-2">
                {surveyToDelete.title}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onConfirmDeleteSurvey(surveyToDelete.id);
                  setSurveyToDelete(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer transition-colors shadow-xs"
              >
                {tr('نعم، حذف الاستبيان', 'بەڵێ، سڕینەوە', 'Yes, Delete')}
              </button>
              <button
                type="button"
                onClick={() => setSurveyToDelete(null)}
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
