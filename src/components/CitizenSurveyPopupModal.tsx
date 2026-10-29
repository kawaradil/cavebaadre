import React, { useState, useEffect } from 'react';
import {
  X,
  ClipboardList,
  CheckCircle2,
  Send,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBaadre } from '../context/BaadreContext';
import { useLanguage } from '../context/LanguageContext';
import { playClickSound, playSuccessSound } from '../lib/sound';

export const CitizenSurveyPopupModal: React.FC = () => {
  const { language, dir, isRTL } = useLanguage();
  const {
    activeRole,
    isSurveysViewOpen,
    surveys,
    dismissedSurveyIds,
    answeredSurveyIds,
    submitSurveyResponse,
    dismissSurveyPopup,
    reopenPublishedSurveysPopup,
  } = useBaadre();

  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

  // All published surveys for citizens
  const publishedSurveys = surveys.filter((s) => s.isPublishedToCitizens);

  // Active survey to display in the popup (first published survey not dismissed)
  const activePopupSurvey = publishedSurveys.find(
    (s) => !dismissedSurveyIds.includes(s.id)
  );

  // Whether the user has clicked "Open Questions" inside the popup ("وعند فتح يفتح أسئلة")
  const [isQuestionsOpened, setIsQuestionsOpened] = useState(false);

  // Selected option ID per question ID
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>(
    {}
  );

  // Whether the current survey was just submitted
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  // Reset internal state when the active survey changes
  useEffect(() => {
    setIsQuestionsOpened(false);
    setSelectedAnswers({});
    setIsSubmittedSuccess(false);
  }, [activePopupSurvey?.id]);

  // Only show on Citizen account when not in the admin/surveys management screen
  if (activeRole !== 'citizen' || isSurveysViewOpen) {
    return null;
  }

  // If there are published surveys, but the user dismissed the popup, show a small floating trigger pill so they can reopen it anytime
  if (!activePopupSurvey) {
    if (publishedSurveys.length === 0) return null;
    const unansweredCount = publishedSurveys.filter(
      (s) => !answeredSurveyIds.includes(s.id)
    ).length;

    return (
      <div
        dir={dir}
        className={`fixed bottom-20 ${
          isRTL ? 'left-4' : 'right-4'
        } z-40 pointer-events-auto`}
      >
        <button
          type="button"
          onClick={() => {
            playClickSound();
            reopenPublishedSurveysPopup();
          }}
          className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-tr from-[#33553C] via-[#46674D] to-[#5C8564] text-white text-xs font-black shadow-[0_8px_25px_rgba(45,72,51,0.3)] flex items-center gap-2 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <ClipboardList className="w-4 h-4" />
          <span>
            {unansweredCount > 0
              ? tr(
                  `استبيان جديد للمواطنين (${unansweredCount})`,
                  `ڕاپرسی نوێ بۆ هاووڵاتیان (${unansweredCount})`,
                  `New Citizen Survey (${unansweredCount})`
                )
              : tr('فتح الاستبيان المجتمعي', 'کردنەوەی ڕاپرسی', 'Open Survey')}
          </span>
        </button>
      </div>
    );
  }

  const allQuestionsAnswered = activePopupSurvey.questions.every(
    (q) => Boolean(selectedAnswers[q.id])
  );

  const handleSelectOption = (questionId: string, optionId: string) => {
    playClickSound();
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmitAnswers = () => {
    if (!allQuestionsAnswered) return;
    playSuccessSound();
    setIsSubmittedSuccess(true);
    setTimeout(() => {
      submitSurveyResponse(activePopupSurvey.id, selectedAnswers);
    }, 1500);
  };

  return (
    <AnimatePresence>
      <div
        dir={dir}
        className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-4 bg-[#1E3725]/35 backdrop-blur-xs overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 24, stiffness: 260 }}
          className={`relative w-full max-w-lg rounded-3xl bg-white shadow-[0_24px_70px_rgba(30,55,37,0.28)] overflow-hidden my-auto max-h-[88vh] flex flex-col ${
            isRTL ? 'text-right' : 'text-left'
          }`}
        >
          {/* Top Header with Close Button (قابل للإغلاق) */}
          <div className="p-4 sm:p-5 bg-gradient-to-l from-[#E8F4EA] via-[#F4F9F5] to-white flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#46674D] text-white flex items-center justify-center shadow-xs shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-[#46674D] text-white text-[9px] font-black">
                    {tr(
                      'استبيان مواطني باعدرى',
                      'ڕاپرسی هاووڵاتیانی باعەدرێ',
                      'Baadre Citizen Poll'
                    )}
                  </span>
                  <span className="text-[10px] font-bold text-[#46674D]">
                    {tr(
                      `${activePopupSurvey.questions.length} أسئلة`,
                      `${activePopupSurvey.questions.length} پرسیار`,
                      `${activePopupSurvey.questions.length} Questions`
                    )}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-[#1E3725] mt-0.5 line-clamp-1">
                  {activePopupSurvey.title}
                </h3>
              </div>
            </div>

            {/* Close Pop-up Button (قابل للإغلاق) */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                dismissSurveyPopup(activePopupSurvey.id);
              }}
              aria-label="Close Survey Popup"
              title={tr('إغلاق الاستبيان', 'داخستن', 'Close')}
              className="p-2 rounded-full bg-white hover:bg-[#E8F4EA] text-[#2D4833] shadow-2xs transition-all cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Pop-up Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
            {isSubmittedSuccess ? (
              /* State 3: Thank You & Sent to Statistics Confirmation */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-6 text-center space-y-3"
              >
                <div className="w-16 h-16 rounded-3xl bg-[#E8F4EA] text-[#46674D] flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h4 className="text-base sm:text-lg font-black text-[#1E3725]">
                  {tr(
                    'شكراً لمشاركتك! تم إرسال إجاباتك بنجاح',
                    'سوپاس بۆ بەشداریکردنت! وەڵامەکانت بە سەرکەوتوویی نێردران',
                    'Thank You! Your Answers Were Sent Successfully'
                  )}
                </h4>
                <p className="text-xs font-bold text-[#46674D] max-w-sm mx-auto leading-relaxed">
                  {tr(
                    'تم تحويل إجاباتك فوراً إلى إحصاءات الاستبيانات في المنصة للمساهمة في تحسين الخدمات في باعدرى.',
                    'وەڵامەکانت ڕاستەوخۆ خرانە ناو ئامارەکانی بەشی ڕاپرسییەکان لە سەکۆکەدا.',
                    'Your responses have been added directly to the Survey Statistics section.'
                  )}
                </p>
              </motion.div>
            ) : !isQuestionsOpened ? (
              /* State 1: Pop-up Invitation Card -> Clicking "Open" reveals the questions ("وعند فتح يفتح أسئلة") */
              <div className="space-y-4 text-center py-2">
                <div className="p-4 rounded-2xl bg-[#F4F9F5] space-y-2 shadow-2xs">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F4EA] text-[#46674D] text-[11px] font-black">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {tr(
                        'صوتك يصنع الفرق في ناحية باعدرى',
                        'دەنگی تۆ جیاوازی دروست دەکات لە باعەدرێ',
                        'Your Voice Matters in Baadre'
                      )}
                    </span>
                  </div>
                  <div className="pt-1">
                    <span className="text-[10px] font-black text-[#46674D] block mb-0.5">
                      {tr('عنوان الاستبيان:', 'ناونیشانی ڕاپرسی:', 'Survey Title:')}
                    </span>
                    <h4 className="text-base font-black text-[#1E3725]">
                      {activePopupSurvey.title}
                    </h4>
                  </div>
                  <p className="text-xs text-[#2D4833] font-bold leading-relaxed">
                    {activePopupSurvey.description}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setIsQuestionsOpened(true);
                    }}
                    className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-tr from-[#33553C] via-[#46674D] to-[#5C8564] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(70,103,77,0.3)] hover:brightness-105 active:scale-98 transition-all cursor-pointer"
                  >
                    <span>
                      {tr(
                        'فتح الاستبيان والإجابة على الأسئلة',
                        'کردنەوەی ڕاپرسی و وەڵامدانەوەی پرسیارەکان',
                        'Open Survey & Answer Questions'
                      )}
                    </span>
                    {isRTL ? (
                      <ChevronLeft className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      dismissSurveyPopup(activePopupSurvey.id);
                    }}
                    className="w-full sm:w-auto py-3.5 px-4 rounded-2xl bg-[#F4F9F5] hover:bg-[#E8F4EA] text-[#2D4833] font-bold text-xs transition-colors cursor-pointer shrink-0"
                  >
                    {tr('إغلاق الآن', 'داخستن', 'Close')}
                  </button>
                </div>
              </div>
            ) : (
              /* State 2: Survey Questions & Selectable Choices ("عند فتح يفتح أسئلة وبعد الجواب يتم إرسال الأجوبة") */
              <div className="space-y-4">
                <p className="text-xs font-bold text-[#46674D] bg-[#F4F9F5] p-3 rounded-2xl">
                  {activePopupSurvey.description}
                </p>

                <div className="space-y-4">
                  {activePopupSurvey.questions.map((q, qIdx) => {
                    const chosenOptionId = selectedAnswers[q.id];
                    return (
                      <div
                        key={q.id}
                        className="p-4 rounded-2xl bg-[#F4F9F5] space-y-2.5 shadow-2xs"
                      >
                        <p className="text-xs sm:text-sm font-black text-[#1E3725]">
                          {qIdx + 1}. {q.questionText}
                        </p>

                        <div className="space-y-2">
                          {q.options.map((opt) => {
                            const isSelected = chosenOptionId === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleSelectOption(q.id, opt.id)}
                                className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                                  isRTL ? 'text-right' : 'text-left'
                                } ${
                                  isSelected
                                    ? 'bg-[#46674D] text-white font-black shadow-xs'
                                    : 'bg-white hover:bg-[#E8F4EA]/70 text-[#1E3725] shadow-2xs'
                                }`}
                              >
                                <span>{opt.text}</span>
                                <div
                                  className={`w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? 'bg-white text-[#46674D]'
                                      : 'border-2 border-[#BBDDC6]'
                                  }`}
                                >
                                  {isSelected && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#46674D]" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Submit Answers Button */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!allQuestionsAnswered}
                    onClick={handleSubmitAnswers}
                    className={`flex-1 py-3.5 px-5 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                      allQuestionsAnswered
                        ? 'bg-gradient-to-tr from-[#33553C] via-[#46674D] to-[#5C8564] text-white shadow-[0_8px_24px_rgba(70,103,77,0.28)] hover:brightness-105 cursor-pointer'
                        : 'bg-[#E8F4EA] text-[#46674D]/60 cursor-not-allowed'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {tr(
                        'إرسال الأجوبة واعتماد المشاركة',
                        'ناردنی وەڵامەکان و پەسەندکردن',
                        'Submit Answers'
                      )}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      dismissSurveyPopup(activePopupSurvey.id);
                    }}
                    className="py-3.5 px-4 rounded-2xl bg-[#F4F9F5] hover:bg-[#E8F4EA] text-[#2D4833] font-bold text-xs transition-colors cursor-pointer"
                  >
                    {tr('إغلاق', 'داخستن', 'Close')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
