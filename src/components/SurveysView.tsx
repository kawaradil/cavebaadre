import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  ClipboardList,
  BarChart3,
  ChevronDown,
  Send,
  CheckCircle2,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Users,
  Eye,
  X,
  HelpCircle,
  Check,
  FileText,
  Pencil,
  PauseCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBaadre } from '../context/BaadreContext';
import { useLanguage } from '../context/LanguageContext';
import { playClickSound, playSuccessSound } from '../lib/sound';
import {
  FIELD_LIMITS,
  enforceInputLimit,
  FieldLimitBadge,
} from '../lib/inputLimits';

interface DraftQuestion {
  id: string;
  questionText: string;
  options: string[];
}

export const SurveysView: React.FC = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar' || language === 'ku';
  const dir: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';

  const {
    surveys,
    createSurvey,
    updateSurvey,
    togglePublishSurveyToCitizens,
    deleteSurvey,
    setIsSurveysViewOpen,
  } = useBaadre();

  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

  // Screen mode: 'main' (List + Stats tabs) or 'create' (Separate screen for creating/editing a survey)
  const [screenMode, setScreenMode] = useState<'main' | 'create'>('main');

  // Sub-section tab inside SurveysView: 'list' (الاستبيانات المنشأة) or 'stats' (إحصاءات الاستبيانات)
  const [subTab, setSubTab] = useState<'list' | 'stats'>('list');

  // Selected survey ID inside the Statistics tab (null = show all or click any survey name to focus its dedicated stats)
  const [selectedStatsSurveyId, setSelectedStatsSurveyId] = useState<string>(
    surveys[0]?.id || 'all'
  );

  // Top search query
  const [searchQuery, setSearchQuery] = useState('');

  // Currently opened/expanded survey ID in the created surveys list (مغلقة افتراضياً)
  const [openedSurveyId, setOpenedSurveyId] = useState<string | null>(null);

  // Survey ID currently being edited (null = creating a new survey)
  const [editingSurveyId, setEditingSurveyId] = useState<string | null>(null);

  // Toast feedback when publishing to citizens
  const [publishFeedbackId, setPublishFeedbackId] = useState<string | null>(null);

  // Create / Edit Survey Screen State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([
    {
      id: 'draft-q-1',
      questionText: '',
      options: ['', ''],
    },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  const filteredSurveys = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return surveys;
    return surveys.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.questions.some(
          (qu) =>
            qu.questionText.toLowerCase().includes(q) ||
            qu.options.some((opt) => opt.text.toLowerCase().includes(q))
        )
    );
  }, [surveys, searchQuery]);

  // General KPI metrics at the very top of the Statistics sub-tab (إحصاءات عامة فوق أسماء الاستبيان)
  const generalStats = useMemo(() => {
    const totalSurveys = surveys.length;
    const publishedCount = surveys.filter((s) => s.isPublishedToCitizens).length;
    const totalResponses = surveys.reduce((acc, s) => acc + s.totalResponses, 0);
    const totalQuestions = surveys.reduce((acc, s) => acc + s.questions.length, 0);
    const totalVotesCast = surveys.reduce(
      (acc, s) =>
        acc +
        s.questions.reduce(
          (qAcc, q) =>
            qAcc + q.options.reduce((oAcc, o) => oAcc + o.votesCount, 0),
          0
        ),
      0
    );
    return {
      totalSurveys,
      publishedCount,
      totalResponses,
      totalQuestions,
      totalVotesCast,
    };
  }, [surveys]);

  // Surveys to display in the dedicated per-survey stats area
  const statsSurveysToDisplay = useMemo(() => {
    if (selectedStatsSurveyId === 'all') return filteredSurveys;
    const found = filteredSurveys.filter((s) => s.id === selectedStatsSurveyId);
    return found.length > 0 ? found : filteredSurveys;
  }, [filteredSurveys, selectedStatsSurveyId]);

  // Handlers for Create Survey Screen
  const handleAddQuestion = () => {
    if (draftQuestions.length >= FIELD_LIMITS.MAX_SURVEY_QUESTIONS) return;
    playClickSound();
    setDraftQuestions((prev) => [
      ...prev,
      {
        id: `draft-q-${Date.now()}-${prev.length + 1}`,
        questionText: '',
        options: ['', ''],
      },
    ]);
  };

  const handleRemoveQuestion = (qId: string) => {
    if (draftQuestions.length <= 1) return;
    playClickSound();
    setDraftQuestions((prev) => prev.filter((q) => q.id !== qId));
  };

  const handleQuestionTextChange = (qId: string, val: string) => {
    const safeVal = enforceInputLimit(
      val,
      FIELD_LIMITS.SURVEY_QUESTION.maxWords,
      FIELD_LIMITS.SURVEY_QUESTION.maxChars
    );
    setDraftQuestions((prev) =>
      prev.map((q) => (q.id === qId ? { ...q, questionText: safeVal } : q))
    );
  };

  const handleAddOption = (qId: string) => {
    playClickSound();
    setDraftQuestions((prev) =>
      prev.map((q) =>
        q.id === qId && q.options.length < FIELD_LIMITS.MAX_SURVEY_OPTIONS
          ? { ...q, options: [...q.options, ''] }
          : q
      )
    );
  };

  const handleRemoveOption = (qId: string, optIdx: number) => {
    playClickSound();
    setDraftQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId || q.options.length <= 2) return q;
        return {
          ...q,
          options: q.options.filter((_, idx) => idx !== optIdx),
        };
      })
    );
  };

  const handleOptionTextChange = (qId: string, optIdx: number, val: string) => {
    const safeVal = enforceInputLimit(
      val,
      FIELD_LIMITS.SURVEY_OPTION.maxWords,
      FIELD_LIMITS.SURVEY_OPTION.maxChars
    );
    setDraftQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q;
        const nextOpts = [...q.options];
        nextOpts[optIdx] = safeVal;
        return { ...q, options: nextOpts };
      })
    );
  };

  const handleCreateSurveySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setFormError(
        tr(
          'يرجى كتابة عنوان الاستبيان أولاً.',
          'تکایە سەرەتا ناونیشانی ڕاپرسییەکە بنووسە.',
          'Please enter a survey title first.'
        )
      );
      return;
    }

    const validQuestions = draftQuestions
      .map((q) => ({
        questionText: q.questionText.trim(),
        options: q.options.map((o) => o.trim()).filter(Boolean),
      }))
      .filter((q) => q.questionText.length > 0 && q.options.length >= 2);

    if (validQuestions.length === 0) {
      setFormError(
        tr(
          'يرجى إضافة سؤال واحد على الأقل مع اختيارين (2) أو أكثر.',
          'تکایە لانیکەم یەک پرسیار لەگەڵ دوو هەڵبژاردن یان زیاتر زیاد بکە.',
          'Please add at least one question with 2 or more choices.'
        )
      );
      return;
    }

    playSuccessSound();
    const fallbackDesc =
      description.trim() ||
      tr(
        'استبيان رأي مجتمعي لمواطني ناحية باعدرى لتحسين جودة الخدمات.',
        'ڕاپرسییەکی گشتی بۆ هاووڵاتیانی ناحیەی باعەدرێ بۆ باشترکردنی خزمەتگوزارییەکان.',
        'Community survey for Baadre citizens to improve municipal services.'
      );

    if (editingSurveyId) {
      updateSurvey(editingSurveyId, {
        title: cleanTitle,
        description: fallbackDesc,
        questions: validQuestions,
      });
      setSelectedStatsSurveyId(editingSurveyId);
    } else {
      const created = createSurvey({
        title: cleanTitle,
        description: fallbackDesc,
        questions: validQuestions,
      });
      setSelectedStatsSurveyId(created.id);
    }

    setEditingSurveyId(null);
    setTitle('');
    setDescription('');
    setDraftQuestions([
      {
        id: `draft-q-${Date.now()}`,
        questionText: '',
        options: ['', ''],
      },
    ]);
    // Keep all surveys closed (مغلقة)
    setOpenedSurveyId(null);
    setSubTab('list');
    setScreenMode('main');
  };

  const handleOpenCreateNew = () => {
    playClickSound();
    setEditingSurveyId(null);
    setTitle('');
    setDescription('');
    setDraftQuestions([
      {
        id: `draft-q-${Date.now()}`,
        questionText: '',
        options: ['', ''],
      },
    ]);
    setFormError(null);
    setScreenMode('create');
  };

  const handleStartEditSurvey = (surveyId: string) => {
    const target = surveys.find((s) => s.id === surveyId);
    if (!target) return;
    playClickSound();
    setEditingSurveyId(target.id);
    setTitle(target.title);
    setDescription(target.description);
    setDraftQuestions(
      target.questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        options: q.options.map((o) => o.text),
      }))
    );
    setFormError(null);
    setScreenMode('create');
  };

  const handlePublishToCitizens = (surveyId: string, publishState: boolean) => {
    playSuccessSound();
    togglePublishSurveyToCitizens(surveyId, publishState);
    if (publishState) {
      setPublishFeedbackId(surveyId);
      setTimeout(() => {
        setPublishFeedbackId((curr) => (curr === surveyId ? null : curr));
      }, 3000);
    } else {
      setPublishFeedbackId((curr) => (curr === surveyId ? null : curr));
    }
  };

  // ============================================================================
  // SCREEN 2: شاشة إنشاء استبيان جديد (Separate Create Survey Screen)
  // ============================================================================
  if (screenMode === 'create') {
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
                setScreenMode('main');
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
                  ? tr(
                      'تعديل الاستبيان',
                      'دەستکاریکردنی ڕاپرسی',
                      'Edit Survey'
                    )
                  : tr(
                      'إنشاء استبيان جديد',
                      'دروستکردنی ڕاپرسی نوێ',
                      'Create New Survey'
                    )}
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
              setScreenMode('main');
            }}
            className="px-3.5 py-2 rounded-xl bg-[#F4F9F5] hover:bg-[#E8F4EA] text-[#2D4833] text-xs font-black transition-all cursor-pointer"
          >
            {tr('رجوع', 'گەڕانەوە', 'Back')}
          </button>
        </div>

        {/* Create Survey Form */}
        <form onSubmit={handleCreateSurveySubmit} className="space-y-5">
          {/* Survey Title & Description Card (عنوان الاستبيان واضح وبارز) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white/95 shadow-[0_12px_36px_rgba(30,55,37,0.09)] space-y-4">
            <div className="p-4 rounded-2xl bg-[#E8F4EA]/60 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs sm:text-sm font-black text-[#1E3725]">
                  <FileText className="w-4 h-4 text-[#46674D]" />
                  <span>
                    {tr(
                      'عنوان الاستبيان *',
                      'ناونیشانی ڕاپرسی *',
                      'Survey Title *'
                    )}
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

              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3.5 py-2 rounded-xl bg-[#E8F4EA] hover:bg-[#D4EADB] text-[#1E3725] text-xs font-black flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#46674D]" />
                <span>
                  {tr('إضافة سؤال جديد', 'زیادکردنی پرسیاری نوێ', 'Add Question')}
                </span>
              </button>
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
                      onClick={() => handleRemoveQuestion(q.id)}
                      className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{tr('حذف السؤال', 'سڕینەوە', 'Remove')}</span>
                    </button>
                  )}
                </div>

                {/* Question Text Input */}
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
                    onChange={(e) =>
                      handleQuestionTextChange(q.id, e.target.value)
                    }
                    placeholder={tr(
                      'اكتب نص السؤال هنا (مثال: ما رأيك بمستوى النظافة في حيك؟)',
                      'دەقی پرسیارەکە لێرە بنووسە...',
                      'Enter question text here...'
                    )}
                    className="w-full bg-[#F4F9F5] rounded-2xl px-4 py-3 text-xs sm:text-sm font-black text-[#1E3725] placeholder-[#46674D]/60 focus:bg-white focus:ring-2 focus:ring-[#46674D]/30 focus:outline-none"
                  />
                </div>

                {/* Options List for this Question */}
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
                        onClick={() => handleAddOption(q.id)}
                        className="text-[11px] font-black text-[#46674D] hover:text-[#1E3725] bg-[#E8F4EA] hover:bg-[#D4EADB] px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>
                          {tr('إضافة اختيار', 'زیادکردنی هەڵبژاردن', 'Add Choice')}
                        </span>
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
                              handleOptionTextChange(q.id, optIdx, e.target.value)
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
                              onClick={() => handleRemoveOption(q.id, optIdx)}
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

            {/* Button to add another question */}
            <button
              type="button"
              onClick={handleAddQuestion}
              className="w-full py-3 rounded-2xl bg-[#F4F9F5] hover:bg-[#E8F4EA] text-[#2D4833] font-black text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#46674D]" />
              <span>
                {tr(
                  'إضافة سؤال آخر للاستبيان',
                  'زیادکردنی پرسیارێکی تر بۆ ڕاپرسییەکە',
                  'Add Another Question to Survey'
                )}
              </span>
            </button>
          </div>

          {formError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-700 text-xs font-black text-center shadow-2xs">
              {formError}
            </div>
          )}

          {/* Submit / Save Survey Button */}
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
  }

  // ============================================================================
  // SCREEN 1: الشاشة الرئيسية للاستبيانات (Top Search + Create Button + Created Surveys + Statistics Sub-tab)
  // ============================================================================
  return (
    <div
      dir={dir}
      className={`max-w-5xl mx-auto px-3 sm:px-6 pt-4 pb-24 space-y-5 ${
        isRTL ? 'text-right' : 'text-left'
      }`}
    >
      {/* Top Header Card */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white/95 backdrop-blur-xl shadow-[0_12px_36px_rgba(30,55,37,0.09)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#33553C] to-[#5C8564] text-white flex items-center justify-center shadow-sm shrink-0">
              <ClipboardList className="w-5.5 h-5.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#E8F4EA] text-[#46674D] text-[10px] font-black">
                  ÇAVÊ BAADRÊ • منظمة RABA
                </span>
              </div>
              <h1 className="text-base sm:text-xl font-black text-[#1E3725] mt-0.5">
                {tr(
                  'قسم الاستبيانات واستطلاعات رأي المواطنين',
                  'بەشی ڕاپرسییەکان و وەرگرتنی ڕای هاووڵاتیان',
                  'Community Surveys & Citizen Polls'
                )}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setIsSurveysViewOpen(false);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#F4F9F5] hover:bg-[#E8F4EA] text-[#2D4833] text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <span>
              {tr('رجوع للرئيسية', 'گەڕانەوە بۆ سەرەکی', 'Back to Main')}
            </span>
            {isRTL ? (
              <ArrowLeft className="w-4 h-4" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Top Search Bar + Create Survey Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
          <div className="relative flex-1">
            <Search
              className={`w-4 h-4 text-[#46674D] absolute top-1/2 -translate-y-1/2 ${
                isRTL ? 'right-3.5' : 'left-3.5'
              }`}
            />
            <input
              type="text"
              maxLength={FIELD_LIMITS.SEARCH.maxChars}
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(
                  enforceInputLimit(
                    e.target.value,
                    FIELD_LIMITS.SEARCH.maxWords,
                    FIELD_LIMITS.SEARCH.maxChars
                  )
                )
              }
              placeholder={tr(
                'ابحث في عنوان الاستبيان أو الأسئلة...',
                'گەڕان لە ناونیشانی ڕاپرسی یان پرسیارەکان...',
                'Search survey title or questions...'
              )}
              className={`w-full bg-[#F4F9F5] rounded-2xl py-3 ${
                isRTL ? 'pr-10 pl-9' : 'pl-10 pr-9'
              } text-xs font-bold text-[#1E3725] placeholder-[#46674D]/60 focus:bg-white focus:ring-2 focus:ring-[#46674D]/30 focus:outline-none shadow-2xs`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`absolute top-1/2 -translate-y-1/2 ${
                  isRTL ? 'left-3' : 'right-3'
                } text-[#46674D] hover:text-[#1E3725] cursor-pointer`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleOpenCreateNew}
            className="py-3 px-5 rounded-2xl bg-gradient-to-tr from-[#33553C] via-[#46674D] to-[#5C8564] text-white font-black text-xs flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(70,103,77,0.28)] hover:brightness-105 hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4.5 h-4.5 stroke-[2.6]" />
            <span>
              {tr('إنشاء استبيان', 'دروستکردنی ڕاپرسی', 'Create Survey')}
            </span>
          </button>
        </div>

        {/* Sub-section Switcher (الاستبيانات المنشأة بدون عدد يظهر) */}
        <div className="grid grid-cols-2 gap-2 bg-[#F4F9F5] p-1.5 rounded-2xl shadow-2xs">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setSubTab('list');
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              subTab === 'list'
                ? 'bg-[#46674D] text-white shadow-xs'
                : 'text-[#2D4833] hover:bg-white/70'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>
              {tr(
                'الاستبيانات المنشأة',
                'ڕاپرسییە دروستکراوەکان',
                'Created Surveys'
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setSubTab('stats');
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              subTab === 'stats'
                ? 'bg-[#46674D] text-white shadow-xs'
                : 'text-[#2D4833] hover:bg-white/70'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>
              {tr(
                'إحصاءات الاستبيان',
                'ئامارەکانی ڕاپرسی',
                'Survey Statistics'
              )}
            </span>
          </button>
        </div>
      </div>

      {/* ====================================================================== */}
      {/* SUB-TAB 1: الاستبيانات المنشأة وزر النشر لحساب المواطنين               */}
      {/* ====================================================================== */}
      {subTab === 'list' && (
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
                onClick={() => setScreenMode('create')}
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
                  {/* Survey Header Row with Explicit Survey Title (عنوان الاستبيان - مغلقة افتراضياً وبدون عدد) */}
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
                            <span>
                              {tr(
                                'منشور',
                                'بڵاوکراوەتەوە',
                                'Published'
                              )}
                            </span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#F4F9F5] text-[#46674D] text-[10px] font-black">
                            {tr('متوقف / غير منشور', 'ڕاگیراوە', 'Paused')}
                          </span>
                        )}
                      </div>

                      {/* عنوان الاستبيان البارز */}
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

                  {/* Expanded Survey Details + 4 Harmonious Cute Action Buttons at the End */}
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
                          {/* Questions Preview List */}
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

                          {/* Subtle Feedback when Published */}
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

                          {/* في نهاية الاستبيان فقط: نشر الاستبيان ، تعديل ، توقف ، حذف بأزرار متناسقة لطيفة */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                            {/* 1. نشر الاستبيان */}
                            <button
                              type="button"
                              onClick={() =>
                                handlePublishToCitizens(survey.id, true)
                              }
                              className="py-2.5 px-3.5 rounded-2xl bg-[#E8F4EA] hover:bg-[#D7EBDC] text-[#1E3725] font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_4px_14px_rgba(70,103,77,0.10)] active:scale-95 transition-all cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5 text-[#46674D]" />
                              <span>
                                {tr(
                                  'نشر الاستبيان',
                                  'بڵاوکردنەوەی ڕاپرسی',
                                  'Publish Survey'
                                )}
                              </span>
                            </button>

                            {/* 2. تعديل */}
                            <button
                              type="button"
                              onClick={() => handleStartEditSurvey(survey.id)}
                              className="py-2.5 px-3.5 rounded-2xl bg-[#F4F9F5] hover:bg-[#E8F4EA] text-[#2D4833] font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_4px_14px_rgba(70,103,77,0.07)] active:scale-95 transition-all cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5 text-[#46674D]" />
                              <span>
                                {tr('تعديل', 'دەستکاری', 'Edit')}
                              </span>
                            </button>

                            {/* 3. توقف */}
                            <button
                              type="button"
                              onClick={() =>
                                handlePublishToCitizens(survey.id, false)
                              }
                              className="py-2.5 px-3.5 rounded-2xl bg-[#F4F9F5] hover:bg-amber-50/90 text-[#2D4833] hover:text-amber-800 font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_4px_14px_rgba(70,103,77,0.07)] active:scale-95 transition-all cursor-pointer"
                            >
                              <PauseCircle className="w-3.5 h-3.5 text-[#46674D]" />
                              <span>
                                {tr('توقف', 'ڕاگرتن', 'Stop')}
                              </span>
                            </button>

                            {/* 4. حذف */}
                            <button
                              type="button"
                              onClick={() => {
                                playClickSound();
                                deleteSurvey(survey.id);
                              }}
                              className="py-2.5 px-3.5 rounded-2xl bg-rose-50/80 hover:bg-rose-100/90 text-rose-700 font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_4px_14px_rgba(225,29,72,0.07)] active:scale-95 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>
                                {tr('حذف', 'سڕینەوە', 'Delete')}
                              </span>
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
      )}

      {/* ====================================================================== */}
      {/* SUB-TAB 2: قسم إحصاءات الاستبيان (لكل استبيان إحصاء خاص به)            */}
      {/* ====================================================================== */}
      {subTab === 'stats' && (
        <div className="space-y-6">
          {/* 1. قائمة أسماء الاستبيانات (لاختيار استبيان أو عرض الكل) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white/95 shadow-[0_12px_36px_rgba(30,55,37,0.09)] space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#46674D]" />
                <h3 className="text-xs sm:text-sm font-black text-[#1E3725]">
                  {tr(
                    'أسماء الاستبيانات (اختر عنوان الاستبيان لعرض الإحصاء الخاص به):',
                    'ناوی ڕاپرسییەکان (ناونیشانی ڕاپرسی هەڵبژێرە بۆ بینینی ئاماری تایبەت بە خۆی):',
                    'Survey Titles (Select a survey to view its dedicated statistics):'
                  )}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setSelectedStatsSurveyId('all');
                }}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                  selectedStatsSurveyId === 'all'
                    ? 'bg-[#46674D] text-white shadow-xs'
                    : 'bg-[#F4F9F5] text-[#2D4833] hover:bg-[#E8F4EA]'
                }`}
              >
                {tr(
                  `عرض جميع الاستبيانات (${filteredSurveys.length})`,
                  `پیشاندانی هەمووی (${filteredSurveys.length})`,
                  `Show All (${filteredSurveys.length})`
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredSurveys.map((s, idx) => {
                const isSelected = selectedStatsSurveyId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setSelectedStatsSurveyId(s.id);
                    }}
                    className={`p-3.5 rounded-2xl text-right flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#46674D] text-white shadow-[0_8px_22px_rgba(70,103,77,0.28)]'
                        : 'bg-[#F4F9F5] hover:bg-[#E8F4EA] text-[#1E3725]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-[#E8F4EA] text-[#46674D]'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <p
                          className={`text-xs font-black truncate ${
                            isSelected ? 'text-white' : 'text-[#1E3725]'
                          }`}
                        >
                          {s.title}
                        </p>
                        <p
                          className={`text-[10px] font-bold ${
                            isSelected ? 'text-white/85' : 'text-[#46674D]'
                          }`}
                        >
                          {tr(
                            `${s.totalResponses} مشارك • ${s.questions.length} أسئلة`,
                            `${s.totalResponses} بەشداربوو • ${s.questions.length} پرسیار`,
                            `${s.totalResponses} responses • ${s.questions.length} questions`
                          )}
                        </p>
                      </div>
                    </div>

                    <BarChart3
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? 'text-white' : 'text-[#46674D]'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. الإحصاء الخاص بكل استبيان على حدة (Dedicated Statistics per Survey) */}
          <div className="space-y-5">
            {statsSurveysToDisplay.map((survey) => {
              const surveyTotalVotes = survey.questions.reduce(
                (acc, q) =>
                  acc + q.options.reduce((oAcc, o) => oAcc + o.votesCount, 0),
                0
              );

              return (
                <div
                  key={survey.id}
                  className="p-5 sm:p-6 rounded-3xl bg-white/95 shadow-[0_14px_38px_rgba(30,55,37,0.12)] space-y-5"
                >
                  {/* رأس الإحصاء الخاص بهذا الاستبيان مع عنوان الاستبيان */}
                  <div className="p-4 rounded-2xl bg-[#E8F4EA]/60 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="px-3 py-1 rounded-full bg-[#46674D] text-white text-[10px] font-black">
                        {tr(
                          'إحصاء خاص بالاستبيان',
                          'ئاماری تایبەت بەم ڕاپرسییە',
                          'Dedicated Survey Statistics'
                        )}
                      </span>

                      {survey.isPublishedToCitizens ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                          {tr(
                            'منشور للمواطنين',
                            'بڵاوکراوەتەوە بۆ هاووڵاتیان',
                            'Published to Citizens'
                          )}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-white text-[#46674D] text-[10px] font-black">
                          {tr('غير منشور', 'بڵاونەکراوەتەوە', 'Unpublished')}
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-[#46674D]">
                        {tr(
                          'عنوان الاستبيان:',
                          'ناونیشانی ڕاپرسی:',
                          'Survey Title:'
                        )}
                      </p>
                      <h3 className="text-base sm:text-lg font-black text-[#1E3725] mt-0.5">
                        {survey.title}
                      </h3>
                      <p className="text-xs font-bold text-[#2D4833] mt-1">
                        {survey.description}
                      </p>
                    </div>

                    {/* بطاقات الإحصاء الخاص بهذا الاستبيان فقط */}
                    <div className="grid grid-cols-3 gap-2.5 pt-2">
                      <div className="p-3 rounded-xl bg-white shadow-2xs text-center">
                        <p className="text-base sm:text-lg font-mono font-black text-[#1E3725]">
                          {survey.totalResponses}
                        </p>
                        <p className="text-[10px] font-bold text-[#46674D]">
                          {tr(
                            'مشارك في هذا الاستبيان',
                            'بەشداربووی ئەم ڕاپرسییە',
                            'Survey Participants'
                          )}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-white shadow-2xs text-center">
                        <p className="text-base sm:text-lg font-mono font-black text-[#1E3725]">
                          {survey.questions.length}
                        </p>
                        <p className="text-[10px] font-bold text-[#46674D]">
                          {tr(
                            'عدد أسئلة الاستبيان',
                            'ژمارەی پرسیارەکان',
                            'Questions Count'
                          )}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-white shadow-2xs text-center">
                        <p className="text-base sm:text-lg font-mono font-black text-[#1E3725]">
                          {surveyTotalVotes}
                        </p>
                        <p className="text-[10px] font-bold text-[#46674D]">
                          {tr(
                            'إجمالي الإجابات المسجلة',
                            'کۆی وەڵامە تۆمارکراوەکان',
                            'Total Recorded Votes'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* تفصيل نتائج كل سؤال داخل هذا الاستبيان */}
                  <div className="space-y-4">
                    {survey.questions.map((q, qIdx) => {
                      const totalQVotes = q.options.reduce(
                        (sum, opt) => sum + opt.votesCount,
                        0
                      );
                      const maxVotes = Math.max(
                        ...q.options.map((o) => o.votesCount),
                        0
                      );

                      return (
                        <div
                          key={q.id}
                          className="p-4 rounded-2xl bg-[#F4F9F5] space-y-3 shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs sm:text-sm font-black text-[#1E3725]">
                              {qIdx + 1}. {q.questionText}
                            </p>
                            <span className="text-[11px] font-mono font-black text-[#46674D] shrink-0">
                              {totalQVotes} {tr('إجابة', 'وەڵام', 'votes')}
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            {q.options.map((opt) => {
                              const pct =
                                totalQVotes > 0
                                  ? Math.round(
                                      (opt.votesCount / totalQVotes) * 100
                                    )
                                  : 0;
                              const isTop =
                                totalQVotes > 0 &&
                                opt.votesCount === maxVotes &&
                                maxVotes > 0;

                              return (
                                <div
                                  key={opt.id}
                                  className="p-2.5 rounded-xl bg-white space-y-1.5 shadow-2xs"
                                >
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-[#1E3725] flex items-center gap-1.5">
                                      {isTop && (
                                        <Check className="w-3.5 h-3.5 text-[#46674D] stroke-[3]" />
                                      )}
                                      <span>{opt.text}</span>
                                    </span>
                                    <div className="flex items-center gap-2 font-mono">
                                      <span className="text-[11px] font-bold text-[#46674D]">
                                        ({opt.votesCount})
                                      </span>
                                      <span className="text-xs font-black text-[#1E3725]">
                                        {pct}%
                                      </span>
                                    </div>
                                  </div>

                                  {/* Progress Bar */}
                                  <div className="w-full h-2 rounded-full bg-[#E8F4EA] overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${pct}%` }}
                                      transition={{ duration: 0.5 }}
                                      className={`h-full rounded-full ${
                                        isTop
                                          ? 'bg-gradient-to-r from-[#33553C] to-[#5C8564]'
                                          : 'bg-[#88B793]'
                                      }`}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
