import React from 'react';
import { BarChart3, Check, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { CommunitySurvey } from '../../types/baadre';
import { playClickSound } from '../../lib/sound';

interface SurveyStatsTabProps {
  tr: (ar: string, ku: string, en: string) => string;
  filteredSurveys: CommunitySurvey[];
  statsSurveysToDisplay: CommunitySurvey[];
  selectedStatsSurveyId: string;
  setSelectedStatsSurveyId: (id: string) => void;
}

export const SurveyStatsTab: React.FC<SurveyStatsTabProps> = ({
  tr,
  filteredSurveys,
  statsSurveysToDisplay,
  selectedStatsSurveyId,
  setSelectedStatsSurveyId,
}) => {
  return (
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

      {/* الإحصاء الخاص بكل استبيان على حدة */}
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
                    {tr('عنوان الاستبيان:', 'ناونیشانی ڕاپرسی:', 'Survey Title:')}
                  </p>
                  <h3 className="text-base sm:text-lg font-black text-[#1E3725] mt-0.5">
                    {survey.title}
                  </h3>
                  <p className="text-xs font-bold text-[#2D4833] mt-1">
                    {survey.description}
                  </p>
                </div>

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
                              ? Math.round((opt.votesCount / totalQVotes) * 100)
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
  );
};
