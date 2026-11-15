import React from 'react';
import {
  Plus,
  CheckCircle2,
  Trash2,
  ArrowRight,
  ArrowLeft,
  X,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { motion } from 'motion/react';
import { playClickSound } from '../../lib/sound';
import {
  FIELD_LIMITS,
  enforceInputLimit,
  FieldLimitBadge,
} from '../../lib/inputLimits';

export interface DraftQuestion {
  id: string;
  questionText: string;
  options: string[];
}

interface SurveyEditorScreenProps {
  dir: 'rtl' | 'ltr';
  isRTL: boolean;
  tr: (ar: string, ku: string, en: string) => string;
  editingSurveyId: string | null;
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  draftQuestions: DraftQuestion[];
  formError: string | null;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onAddQuestion: () => void;
  onRemoveQuestion: (qId: string) => void;
  onQuestionTextChange: (qId: string, val: string) => void;
  onAddOption: (qId: string) => void;
  onRemoveOption: (qId: string, optIdx: number) => void;
  onOptionTextChange: (qId: string, optIdx: number, val: string) => void;
}

export const SurveyEditorScreen: React.FC<SurveyEditorScreenProps> = ({
  dir,
  isRTL,
  tr,
  editingSurveyId,
  title,
  setTitle,
  description,
  setDescription,
  draftQuestions,
  formError,
  onBack,
  onSubmit,
  onAddQuestion,
  onRemoveQuestion,
  onQuestionTextChange,
  onAddOption,
  onRemoveOption,
  onOptionTextChange,
}) => {
  return (
    <div
      dir={dir}
      className={`max-w-4xl mx-auto px-3 sm:px-6 pt-4 pb-24 space-y-5 ${
        isRTL ? 'text-right' : 'text-left'
      }`}
    >
      {/* Top Bar with Back Button */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white/95 backdrop-blur-xl shadow-[0_12px_36px_rgba(30,55,37,0.10)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onBack();
            }}
            className="w-10 h-10 rounded-2xl bg-[#E8F4EA] hover:bg-[#D4EADB] text-[#1E3725] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            title={tr('رجوع', 'گەڕانەوە', 'Back')}
          >
            {isRTL ? (
              <ArrowRight className="w-5 h-5" />
            ) : (
              <ArrowLeft className="w-5 h-5" />
            )}
          </button>
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-[#E8F4EA] text-[#46674D] text-[10px] font-black">
              {editingSurveyId
                ? tr('تعديل الاستبيان', 'دەستکاریکردنی ڕاپرسی', 'Edit Survey')
                : tr('إنشاء استبيان جديد', 'دروستکردنی ڕاپرسی نوێ', 'Create New Survey')}
            </span>
            <h1 className="text-base sm:text-xl font-black text-[#1E3725] mt-0.5">
              {editingSurveyId
                ? tr(
                    'تعديل عنوان الاستبيان والأسئلة والاختيارات',
                    'دەستکاریکردنی ناونیشانی ڕاپرسی و پرسیار و هەڵبژاردنەکان',
                    'Edit Survey Title, Questions & Choices'
                  )
                : tr(
                    'إضافة عنوان الاستبيان والأسئلة والاختيارات',
                    'زیادکردنی ناونیشانی ڕاپرسی و پرسیار و هەڵبژاردنەکان',
                    'Add Survey Title, Questions & Choices'
                  )}
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            onBack();
          }}
          className="px-3.5 py-2 rounded-xl bg-[#F4F9F5] hover:bg-[#E8F4EA] text-[#2D4833] text-xs font-black transition-all cursor-pointer"
        >
          {tr('رجوع', 'گەڕانەوە', 'Back')}
        </button>
      </div>

      {/* Create Survey Form */}
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="p-5 sm:p-6 rounded-3xl bg-white/95 shadow-[0_12px_36px_rgba(30,55,37,0.09)] space-y-4">
          <div className="p-4 rounded-2xl bg-[#E8F4EA]/60 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs sm:text-sm font-black text-[#1E3725]">
                <FileText className="w-4 h-4 text-[#46674D]" />
                <span>
                  {tr('عنوان الاستبيان *', 'ناونیشانی ڕاپرسی *', 'Survey Title *')}
                </span>
              </label>
              <FieldLimitBadge
                value={title}
                maxWords={FIELD_LIMITS.TITLE.maxWords}
                maxChars={FIELD_LIMITS.TITLE.maxChars}
              />
            </div>
            <input
              type="text"
              maxLength={FIELD_LIMITS.TITLE.maxChars}
              value={title}
              onChange={(e) =>
                setTitle(
                  enforceInputLimit(
                    e.target.value,
                    FIELD_LIMITS.TITLE.maxWords,
                    FIELD_LIMITS.TITLE.maxChars
                  )
                )
              }
              placeholder={tr(
                'اكتب عنوان الاستبيان هنا (مثال: استبيان تقييم خدمات النظافة والطرق في باعدرى)',
                'ناونیشانی ڕاپرسییەکە لێرە بنووسە...',
                'Enter the survey title here...'
              )}
              className="w-full bg-white rounded-2xl px-4 py-3 text-xs sm:text-sm font-black text-[#1E3725] placeholder-[#46674D]/60 focus:ring-2 focus:ring-[#46674D] focus:outline-none shadow-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="block text-xs font-black text-[#1E3725]">
                {tr(
                  'وصف أو نبذة عن الاستبيان (اختياري):',
                  'وەسفی کورتی ڕاپرسی (ئارەزوومەندانە):',
                  'Survey Description (Optional):'
                )}
              </label>
              <FieldLimitBadge
                value={description}
                maxWords={FIELD_LIMITS.DESCRIPTION.maxWords}
                maxChars={FIELD_LIMITS.DESCRIPTION.maxChars}
              />
            </div>
            <textarea
              rows={2}
              maxLength={FIELD_LIMITS.DESCRIPTION.maxChars}
              value={description}
              onChange={(e) =>
                setDescription(
                  enforceInputLimit(
                    e.target.value,
                    FIELD_LIMITS.DESCRIPTION.maxWords,
                    FIELD_LIMITS.DESCRIPTION.maxChars
                  )
                )
              }
              placeholder={tr(
                'اكتب توضيحاً قصيراً حول الهدف من هذا الاستبيان للمواطنين...',
                'ڕوونکردنەوەیەکی کورت بنووسە دەربارەی ئامانجی ئەم ڕاپرسییە...',
                'Write a brief explanation of the survey goal for citizens...'
              )}
              className="w-full bg-[#F4F9F5] rounded-2xl p-3.5 text-xs font-bold text-[#1E3725] placeholder-[#46674D]/60 focus:bg-white focus:ring-2 focus:ring-[#46674D]/30 focus:outline-none shadow-2xs"
            />
          </div>
        </div>

        {/* Dynamic Questions & Options List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#46674D]" />
              <h2 className="text-sm font-black text-[#1E3725]">
                {tr(
                  `أسئلة الاستبيان واختيارات الإجابة (${draftQuestions.length})`,
                  `پرسیار و هەڵبژاردنەکانی ڕاپرسی (${draftQuestions.length})`,
                  `Survey Questions & Choices (${draftQuestions.length})`
                )}
              </h2>
            </div>
          </div>

          {draftQuestions.map((q, qIndex) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-3xl bg-white/95 shadow-[0_8px_30px_rgba(30,55,37,0.07)] space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-[#46674D] text-white text-xs font-black flex items-center justify-center shadow-2xs">
                    {qIndex + 1}
                  </span>
                  <span className="text-xs font-black text-[#1E3725]">
                    {tr(
                      `السؤال رقم ${qIndex + 1}`,
                      `پرسیاری ژمارە ${qIndex + 1}`,
                      `Question #${qIndex + 1}`
                    )}
                  </span>
                </div>

                {draftQuestions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveQuestion(q.id)}
                    className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{tr('حذف السؤال', 'سڕینەوە', 'Remove')}</span>
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#46674D]">
                    {tr('نص السؤال:', 'دەقی پرسیار:', 'Question Text:')}
                  </span>
                  <FieldLimitBadge
                    value={q.questionText}
                    maxWords={FIELD_LIMITS.SURVEY_QUESTION.maxWords}
                    maxChars={FIELD_LIMITS.SURVEY_QUESTION.maxChars}
                  />
                </div>
                <input
                  type="text"
                  maxLength={FIELD_LIMITS.SURVEY_QUESTION.maxChars}
                  value={q.questionText}
                  onChange={(e) => onQuestionTextChange(q.id, e.target.value)}
                  placeholder={tr(
                    'اكتب نص السؤال هنا (مثال: ما رأيك بمستوى النظافة في حيك؟)',
                    'دەقی پرسیارەکە لێرە بنووسە...',
                    'Enter question text here...'
                  )}
                  className="w-full bg-[#F4F9F5] rounded-2xl px-4 py-3 text-xs sm:text-sm font-black text-[#1E3725] placeholder-[#46674D]/60 focus:bg-white focus:ring-2 focus:ring-[#46674D]/30 focus:outline-none"
                />
              </div>

              <div className="space-y-2.5 pl-1 pr-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-[#46674D]">
                    {tr(
                      `اختيارات الإجابة المتاحة للمواطن (${q.options.length}/${FIELD_LIMITS.MAX_SURVEY_OPTIONS}):`,
                      `هەڵبژاردنەکانی وەڵام بۆ هاووڵاتی (${q.options.length}/${FIELD_LIMITS.MAX_SURVEY_OPTIONS}):`,
                      `Answer Choices for Citizens (${q.options.length}/${FIELD_LIMITS.MAX_SURVEY_OPTIONS}):`
                    )}
                  </span>
                  {q.options.length < FIELD_LIMITS.MAX_SURVEY_OPTIONS && (
                    <button
                      type="button"
                      onClick={() => onAddOption(q.id)}
                      className="text-[11px] font-black text-[#46674D] hover:text-[#1E3725] bg-[#E8F4EA] hover:bg-[#D4EADB] px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{tr('إضافة اختيار', 'زیادکردنی هەڵبژاردن', 'Add Choice')}</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options.map((optText, optIdx) => (
                    <div
                      key={optIdx}
                      className="flex flex-col gap-1 bg-[#F4F9F5] rounded-xl px-3 py-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#E8F4EA] text-[#46674D] text-[10px] font-black flex items-center justify-center shrink-0">
                          {optIdx + 1}
                        </span>
                        <input
                          type="text"
                          maxLength={FIELD_LIMITS.SURVEY_OPTION.maxChars}
                          value={optText}
                          onChange={(e) =>
                            onOptionTextChange(q.id, optIdx, e.target.value)
                          }
                          placeholder={tr(
                            `الاختيار ${optIdx + 1}`,
                            `هەڵبژاردنی ${optIdx + 1}`,
                            `Choice ${optIdx + 1}`
                          )}
                          className="w-full bg-transparent text-xs font-bold text-[#1E3725] placeholder-[#46674D]/55 focus:outline-none"
                        />
                        {q.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => onRemoveOption(q.id, optIdx)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={tr('حذف الاختيار', 'سڕینەوە', 'Remove choice')}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <FieldLimitBadge
                          value={optText}
                          maxWords={FIELD_LIMITS.SURVEY_OPTION.maxWords}
                          maxChars={FIELD_LIMITS.SURVEY_OPTION.maxChars}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}

          <button
            type="button"
            onClick={onAddQuestion}
            className="w-full py-3 rounded-2xl bg-[#E8F4EA] hover:bg-[#D4EADB] text-[#1E3725] font-black text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#46674D]" />
            <span>{tr('إضافة سؤال جديد', 'زیادکردنی پرسیاری نوێ', 'Add New Question')}</span>
          </button>
        </div>

        {formError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-700 text-xs font-black text-center shadow-2xs">
            {formError}
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-4 rounded-2xl bg-gradient-to-tr from-[#33553C] via-[#46674D] to-[#5C8564] text-white font-black text-sm flex items-center justify-center gap-2 shadow-[0_10px_28px_rgba(70,103,77,0.3)] hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>
              {editingSurveyId
                ? tr(
                    'حفظ تعديلات الاستبيان',
                    'پاشەکەوتکردنی گۆڕانکارییەکانی ڕاپرسی',
                    'Save Survey Changes'
                  )
                : tr(
                    'إنشاء الاستبيان وحفظه في القائمة',
                    'دروستکردنی ڕاپرسی و پاشەکەوتکردنی',
                    'Create & Save Survey'
                  )}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
