import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  ClipboardList,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  X,
} from 'lucide-react';
import { useBaadre } from '../context/BaadreContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { playClickSound, playSuccessSound } from '../lib/sound';
import { FIELD_LIMITS, enforceInputLimit } from '../lib/inputLimits';
import {
  DraftQuestion,
  SurveyEditorScreen,
} from './surveys/SurveyEditorScreen';
import { CreatedSurveysListTab } from './surveys/CreatedSurveysListTab';
import { SurveyStatsTab } from './surveys/SurveyStatsTab';

export const SurveysView: React.FC = () => {
  const { language } = useLanguage();
  const { currentUser, isAdmin, isSuperAdmin, isCitizen, role } = useAuth();
  const isRTL = language === 'ar' || language === 'ku';
  const dir: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';

  const {
    activeRole,
    surveys,
    createSurvey,
    updateSurvey,
    togglePublishSurveyToCitizens,
    deleteSurvey,
    setIsSurveysViewOpen,
  } = useBaadre();

  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

  const [screenMode, setScreenMode] = useState<'main' | 'create'>('main');
  const [subTab, setSubTab] = useState<'list' | 'stats'>('list');
  const [selectedStatsSurveyId, setSelectedStatsSurveyId] = useState<string>(
    surveys[0]?.id || 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [openedSurveyId, setOpenedSurveyId] = useState<string | null>(null);
  const [editingSurveyId, setEditingSurveyId] = useState<string | null>(null);
  const [publishFeedbackId, setPublishFeedbackId] = useState<string | null>(null);
  const [surveyToDelete, setSurveyToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

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

  const statsSurveysToDisplay = useMemo(() => {
    if (selectedStatsSurveyId === 'all') return filteredSurveys;
    const found = filteredSurveys.filter((s) => s.id === selectedStatsSurveyId);
    return found.length > 0 ? found : filteredSurveys;
  }, [filteredSurveys, selectedStatsSurveyId]);

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

  if (
    !currentUser ||
    isCitizen ||
    (!isAdmin && !isSuperAdmin) ||
    (role !== 'admin' && role !== 'super_admin') ||
    activeRole !== 'admin'
  ) {
    return null;
  }

  if (screenMode === 'create') {
    return (
      <SurveyEditorScreen
        dir={dir}
        isRTL={isRTL}
        tr={tr}
        editingSurveyId={editingSurveyId}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        draftQuestions={draftQuestions}
        formError={formError}
        onBack={() => setScreenMode('main')}
        onSubmit={handleCreateSurveySubmit}
        onAddQuestion={handleAddQuestion}
        onRemoveQuestion={handleRemoveQuestion}
        onQuestionTextChange={handleQuestionTextChange}
        onAddOption={handleAddOption}
        onRemoveOption={handleRemoveOption}
        onOptionTextChange={handleOptionTextChange}
      />
    );
  }

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
              <h1 className="text-base sm:text-xl font-black text-[#1E3725]">
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
              placeholder={tr('ابحث...', 'بگەڕێ...', 'Search...')}
              className={`w-full bg-[#F4F9F5] rounded-2xl py-3 ${
                isRTL ? 'pr-10 pl-9' : 'pl-10 pr-9'
              } text-xs font-bold text-[#1E3725] placeholder-[#46674D]/45 focus:bg-white focus:ring-2 focus:ring-[#46674D]/30 focus:outline-none shadow-2xs`}
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

        {/* Sub-section Switcher */}
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

      {subTab === 'list' ? (
        <CreatedSurveysListTab
          dir={dir}
          tr={tr}
          filteredSurveys={filteredSurveys}
          openedSurveyId={openedSurveyId}
          setOpenedSurveyId={setOpenedSurveyId}
          publishFeedbackId={publishFeedbackId}
          surveyToDelete={surveyToDelete}
          setSurveyToDelete={setSurveyToDelete}
          onCreateNew={handleOpenCreateNew}
          onStartEditSurvey={handleStartEditSurvey}
          onPublishToCitizens={handlePublishToCitizens}
          onConfirmDeleteSurvey={(id) => deleteSurvey(id)}
        />
      ) : (
        <SurveyStatsTab
          tr={tr}
          filteredSurveys={filteredSurveys}
          statsSurveysToDisplay={statsSurveysToDisplay}
          selectedStatsSurveyId={selectedStatsSurveyId}
          setSelectedStatsSurveyId={setSelectedStatsSurveyId}
        />
      )}
    </div>
  );
};
