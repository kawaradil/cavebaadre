import React from 'react';
import {
  ClipboardList,
  BarChart3,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  ShieldCheck,
  TrendingUp,
  Users,
  Activity,
  UserCheck,
  Ban,
  Send,
  HelpCircle,
} from 'lucide-react';
import {
  CivicReport,
  SECTOR_META,
  ReportSector,
  MunicipalDepartment,
  RegisteredCitizen,
  CommunitySurvey,
  CitizenSurveyResponse,
  isReportUrgencyConfirmed,
} from '../../types/baadre';

export interface AnalyticsTabViewProps {
  reports: CivicReport[];
  departments: MunicipalDepartment[];
  citizens: RegisteredCitizen[];
  surveys: CommunitySurvey[];
  surveyResponses: CitizenSurveyResponse[];
  language: 'ar' | 'ku' | 'en';
  isRTL: boolean;
  tr: (ar: string, ku: string, en: string) => string;
  getSectorLabel: (secKey: ReportSector) => string;
}

export const AnalyticsTabView: React.FC<AnalyticsTabViewProps> = React.memo(({
  reports,
  departments,
  citizens,
  surveys,
  surveyResponses,
  language,
  isRTL,
  tr,
  getSectorLabel,
}) => {
  const reportCardTotals = React.useMemo(() => {
    const total = reports.length;
    const pending = reports.filter((rep) => rep.status === 'pending').length;
    const resolved = reports.filter((rep) => rep.status === 'resolved').length;
    const rejected = reports.filter((rep) => rep.status === 'rejected').length;
    const inProgress = reports.filter(
      (rep) =>
        rep.status !== 'pending' &&
        rep.status !== 'resolved' &&
        rep.status !== 'rejected'
    ).length;
    const emergency = reports.filter(
      (rep) => isReportUrgencyConfirmed(rep) && rep.urgency === 'emergency'
    ).length;
    const completionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const reportingCitizens = new Set(
      reports
        .map((rep) => (rep.citizenPhone || rep.citizenName || rep.id).trim().toLowerCase())
        .filter(Boolean)
    ).size;

    return {
      total,
      pending,
      resolved,
      rejected,
      inProgress,
      emergency,
      completionRate,
      reportingCitizens,
    };
  }, [reports]);

  const generalSurveyStats = React.useMemo(() => {
    const totalSurveys = surveys.length;
    const publishedCount = surveys.filter((s) => s.isPublishedToCitizens).length;
    const totalResponses = Math.max(
      surveyResponses.length,
      surveys.reduce((acc, s) => acc + (s.totalResponses || 0), 0)
    );
    const totalQuestions = surveys.reduce((acc, s) => acc + s.questions.length, 0);
    return {
      totalSurveys,
      publishedCount,
      totalResponses,
      totalQuestions,
    };
  }, [surveys, surveyResponses]);

  const sectorDistribution = React.useMemo(() => {
    const counts: Record<ReportSector, number> = {
      roads: 0,
      sewage: 0,
      sanitation: 0,
      lighting: 0,
      water: 0,
      other: 0,
    };
    reports.forEach((r) => {
      counts[r.sector] = (counts[r.sector] || 0) + 1;
    });
    return Object.values(SECTOR_META).map((sec) => ({
      ...sec,
      count: counts[sec.key] || 0,
      percentage:
        reports.length > 0 ? Math.round(((counts[sec.key] || 0) / reports.length) * 100) : 0,
    }));
  }, [reports]);

  const weeklyAnalyticsData = React.useMemo(() => {
    const dayLabels = [
      tr('السبت', 'شەمە', 'Sat'),
      tr('الأحد', 'یەك شەم', 'Sun'),
      tr('الإثنين', 'دووشەم', 'Mon'),
      tr('الثلاثاء', 'سێ شەم', 'Tue'),
      tr('الأربعاء', 'چوار شەم', 'Wed'),
      tr('الخميس', 'بێنچ شەم', 'Thu'),
      tr('الجمعة', 'هەینی', 'Fri'),
    ];
    const counts = dayLabels.map((day) => ({ day, incoming: 0, resolved: 0 }));
    reports.forEach((r) => {
      const d = new Date(r.createdAt);
      if (!Number.isNaN(d.getTime())) {
        const idx = (d.getDay() + 1) % 7;
        counts[idx].incoming += 1;
        if (r.status === 'resolved') {
          counts[idx].resolved += 1;
        }
      }
    });
    return counts;
  }, [reports, language]);

  return (
    <div className="space-y-6">
      {/* Top Control Header & Harmonious Borderless Stat Cards */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white/90 backdrop-blur-2xl border-0 shadow-[0_10px_34px_rgba(30,142,147,0.08)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#467586] to-[#58899A] shadow-xs flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1B3A46]">
              {tr('لوحة الإحصاءات والمؤشرات', 'تەختەی ئامار و نیشاندەرەکان', 'Analytics Dashboard')}
            </h1>
          </div>
        </div>

        {/* 9 مؤشرات بألوان بارزة قليلاً ومتناسقة وبدون إطارات */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* 1. اجمالي البلاغات */}
          <div className="px-4 py-3.5 rounded-2xl bg-gradient-to-l from-[#E6F2F6] to-[#F2F8FA] border-0 shadow-[0_4px_14px_rgba(30,142,147,0.06)] flex items-center justify-between gap-3.5 transition-all">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#3B6878] to-[#58899A] text-white flex items-center justify-center shrink-0 shadow-xs">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className={`min-w-0 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                <p className="text-sm font-black text-[#1B3A46] truncate">
                  {tr('اجمالي البلاغات', 'کۆی گشتی سکاڵاکان', 'Total Reports')}
                </p>
              </div>
            </div>
            <div className="min-w-[3.5rem] px-3.5 py-2 rounded-xl bg-white/90 border-0 flex items-center justify-center shrink-0 shadow-2xs">
              <span className="text-2xl font-black text-[#285060] tabular-nums leading-none">
                {reportCardTotals.total}
              </span>
            </div>
          </div>

          {/* 2. الحالات الطارئة */}
          <div className="px-4 py-3.5 rounded-2xl bg-gradient-to-l from-rose-50/95 to-rose-50/50 border-0 shadow-[0_4px_14px_rgba(244,63,94,0.06)] flex items-center justify-between gap-3.5 transition-all">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className={`min-w-0 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-rose-800 truncate">
                    {tr('الحالات الطارئة', 'حاڵەتە فریاگوزارییەکان', 'Emergency Cases')}
                  </p>
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                </div>
              </div>
            </div>
            <div className="min-w-[3.5rem] px-3.5 py-2 rounded-xl bg-white/90 border-0 flex items-center justify-center shrink-0 shadow-2xs">
              <span className="text-2xl font-black text-rose-700 tabular-nums leading-none">
                {reportCardTotals.emergency}
              </span>
            </div>
          </div>

          {/* 3. الأعمال المنجزة */}
          <div className="px-4 py-3.5 rounded-2xl bg-gradient-to-l from-emerald-50/95 to-teal-50/50 border-0 shadow-[0_4px_14px_rgba(16,185,129,0.06)] flex items-center justify-between gap-3.5 transition-all">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className={`min-w-0 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-emerald-900 truncate">
                    {tr('الأعمال المنجزة', 'کارە ئەنجامدراوەکان', 'Completed Works')}
                  </p>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                </div>
              </div>
            </div>
            <div className="min-w-[3.5rem] px-3.5 py-2 rounded-xl bg-white/90 border-0 flex items-center justify-center shrink-0 shadow-2xs">
              <span className="text-2xl font-black text-emerald-700 tabular-nums leading-none">
                {reportCardTotals.resolved}
              </span>
            </div>
          </div>

          {/* 4. نسبة الانجاز */}
          <div className="px-4 py-3.5 rounded-2xl bg-gradient-to-l from-teal-50/90 to-cyan-50/50 border-0 shadow-[0_4px_14px_rgba(20,184,166,0.06)] flex items-center justify-between gap-3.5 transition-all">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className={`min-w-0 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                <p className="text-sm font-black text-teal-900 truncate">
                  {tr('نسبة الانجاز', 'ڕێژەی ئەنجامدان', 'Completion Rate')}
                </p>
              </div>
            </div>
            <div className="min-w-[3.5rem] px-3.5 py-2 rounded-xl bg-white/90 border-0 flex items-center justify-center shrink-0 shadow-2xs">
              <span className="text-xl font-black text-teal-800 tabular-nums leading-none">
                {reportCardTotals.completionRate}%
              </span>
            </div>
          </div>

          {/* 5. تم الارسال قيد المعالجة */}
          <div className="px-4 py-3.5 rounded-2xl bg-gradient-to-l from-amber-50/90 to-orange-50/40 border-0 shadow-[0_4px_14px_rgba(245,158,11,0.06)] flex items-center justify-between gap-3.5 transition-all">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Wrench className="w-5 h-5" />
              </div>
              <div className={`min-w-0 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-amber-900 truncate">
                    {tr(
                      'تم الارسال قيد المعالجة',
                      'نێردراوە لەژێر چارەسەر',
                      'Sent / In-Progress'
                    )}
                  </p>
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                </div>
              </div>
            </div>
            <div className="min-w-[3.5rem] px-3.5 py-2 rounded-xl bg-white/90 border-0 flex items-center justify-center shrink-0 shadow-2xs">
              <span className="text-2xl font-black text-amber-700 tabular-nums leading-none">
                {reportCardTotals.inProgress}
              </span>
            </div>
          </div>

          {/* 6. البلاغات المرفوضة */}
          <div className="px-4 py-3.5 rounded-2xl bg-gradient-to-l from-orange-50/85 to-rose-50/40 border-0 shadow-[0_4px_14px_rgba(249,115,22,0.06)] flex items-center justify-between gap-3.5 transition-all">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Ban className="w-5 h-5" />
              </div>
              <div className={`min-w-0 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                <p className="text-sm font-black text-orange-900 truncate">
                  {tr('البلاغات المرفوضة', 'سکاڵا ڕەتکراوەکان', 'Rejected Reports')}
                </p>
              </div>
            </div>
            <div className="min-w-[3.5rem] px-3.5 py-2 rounded-xl bg-white/90 border-0 flex items-center justify-center shrink-0 shadow-2xs">
              <span className="text-2xl font-black text-orange-700 tabular-nums leading-none">
                {reportCardTotals.rejected}
              </span>
            </div>
          </div>

          {/* 7. الدوائر الخدمية */}
          <div className="px-4 py-3.5 rounded-2xl bg-gradient-to-l from-indigo-50/85 to-blue-50/50 border-0 shadow-[0_4px_14px_rgba(99,102,241,0.06)] flex items-center justify-between gap-3.5 transition-all">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div className={`min-w-0 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                <p className="text-sm font-black text-indigo-950 truncate">
                  {tr('الدوائر الخدمية', 'فەرمانگە خزمەتگوزارییەکان', 'Service Departments')}
                </p>
              </div>
            </div>
            <div className="min-w-[3.5rem] px-3.5 py-2 rounded-xl bg-white/90 border-0 flex items-center justify-center shrink-0 shadow-2xs">
              <span className="text-2xl font-black text-indigo-700 tabular-nums leading-none">
                {departments.length}
              </span>
            </div>
          </div>

          {/* 8. المواطنين المسجلين */}
          <div className="px-4 py-3.5 rounded-2xl bg-gradient-to-l from-sky-50/90 to-cyan-50/50 border-0 shadow-[0_4px_14px_rgba(14,165,233,0.06)] flex items-center justify-between gap-3.5 transition-all">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div className={`min-w-0 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                <p className="text-sm font-black text-sky-950 truncate">
                  {tr('المواطنين المسجلين', 'هاوڵاتییە تۆمارکراوەکان', 'Registered Citizens')}
                </p>
              </div>
            </div>
            <div className="min-w-[3.5rem] px-3.5 py-2 rounded-xl bg-white/90 border-0 flex items-center justify-center shrink-0 shadow-2xs">
              <span className="text-2xl font-black text-sky-700 tabular-nums leading-none">
                {citizens.length}
              </span>
            </div>
          </div>

          {/* 9. المواطنين المبلغين */}
          <div className="px-4 py-3.5 rounded-2xl bg-gradient-to-l from-violet-50/85 to-purple-50/50 border-0 shadow-[0_4px_14px_rgba(139,92,246,0.06)] flex items-center justify-between gap-3.5 transition-all">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className={`min-w-0 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                <p className="text-sm font-black text-violet-950 truncate">
                  {tr('المواطنين المبلغين', 'هاوڵاتییە سکاڵاکارەکان', 'Reporting Citizens')}
                </p>
              </div>
            </div>
            <div className="min-w-[3.5rem] px-3.5 py-2 rounded-xl bg-white/90 border-0 flex items-center justify-center shrink-0 shadow-2xs">
              <span className="text-2xl font-black text-violet-700 tabular-nums leading-none">
                {reportCardTotals.reportingCitizens}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* كارت الإحصاءات العامة لجميع الاستبيانات */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white/90 backdrop-blur-xl border-0 shadow-[0_10px_34px_rgba(30,142,147,0.08)] space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#467586] to-[#58899A] text-white flex items-center justify-center shadow-xs">
            <BarChart3 className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-[#1B3A46]">
              {tr(
                'الإحصاءات العامة لجميع الاستبيانات',
                'ئاماری گشتی سەرجەم ڕاپرسییەکان',
                'General Statistics Across All Surveys'
              )}
            </h2>
            <p className="text-[11px] font-bold text-[#3B6878]">
              {tr(
                'ملخص شامل لمجمل الاستبيانات المنشأة ومشاركات المواطنين الكلية',
                'پوختەی گشتی سەرجەم ڕاپرسییەکان و بەشداری هاووڵاتیان',
                'Overall summary of all created surveys and total citizen participation'
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-gradient-to-b from-[#E8F3F7] to-[#F4F9FB] border-0 shadow-[0_4px_14px_rgba(30,142,147,0.06)] transition-all space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-[#467586] text-white flex items-center justify-center shadow-2xs">
              <ClipboardList className="w-4 h-4" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-[#1B3A46] font-mono">
              {generalSurveyStats.totalSurveys}
            </p>
            <p className="text-[11px] font-bold text-[#3B6878]">
              {tr('إجمالي الاستبيانات', 'کۆی ڕاپرسییەکان', 'Total Surveys')}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-50/90 to-teal-50/40 border-0 shadow-[0_4px_14px_rgba(16,185,129,0.06)] transition-all space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
              <Send className="w-4 h-4" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-emerald-900 font-mono">
              {generalSurveyStats.publishedCount}
            </p>
            <p className="text-[11px] font-bold text-emerald-700">
              {tr(
                'الاستبيانات المنشورة',
                'ڕاپرسییە بڵاوکراوەکان',
                'Published Surveys'
              )}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-b from-indigo-50/90 to-blue-50/40 border-0 shadow-[0_4px_14px_rgba(99,102,241,0.06)] transition-all space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
              <Users className="w-4 h-4" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-indigo-950 font-mono">
              {generalSurveyStats.totalResponses}
            </p>
            <p className="text-[11px] font-bold text-indigo-700">
              {tr(
                'إجمالي المشاركين بالاستبيانات',
                'کۆی بەشداربووان',
                'Total Survey Participants'
              )}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-50/90 to-orange-50/40 border-0 shadow-[0_4px_14px_rgba(245,158,11,0.06)] transition-all space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-2xs">
              <HelpCircle className="w-4 h-4" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-amber-900 font-mono">
              {generalSurveyStats.totalQuestions}
            </p>
            <p className="text-[11px] font-bold text-amber-700">
              {tr(
                'إجمالي الأسئلة المطروحة',
                'کۆی پرسیارەکان',
                'Total Questions Asked'
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-5 sm:p-6 rounded-3xl bg-white/90 backdrop-blur-xl border-0 space-y-4 shadow-[0_10px_34px_rgba(30,142,147,0.08)]">
          <div className="flex flex-col gap-2">
            <div className="min-w-0">
              <h3 className="text-[11px] sm:text-xs font-black text-[#1B3A46] flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                <TrendingUp className="w-4 h-4 text-[#467586] shrink-0" />
                <span className="whitespace-nowrap">
                  {tr(
                    'المخطط الأسبوعي: البلاغات المستلمة مقابل المنجزة',
                    'خشتەی هەفتانە: سکاڵا وەرگیراوەکان بەرامبەر ئەنجامدراوەکان',
                    'Weekly Chart: Incoming vs. Completed Reports'
                  )}
                </span>
              </h3>
              <p className="text-[11px] text-[#3B6878] font-semibold mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                {tr(
                  'مقارنة الأداء الميداني اليومي لفرق بلدية باعدرى خلال الأسبوع',
                  'بەراوردکردنی ئەدای مەیدانی ڕۆژانەی تیمەکانی شارەوانی باعەدرێ لەم هەفتەیەدا',
                  'Daily field performance comparison across Baadre municipal teams'
                )}
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-bold whitespace-nowrap">
              <span className="flex items-center gap-1 text-[#285060] whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#58899A] shrink-0" />{' '}
                {tr('الواردة', 'هاتوو', 'Incoming')}
              </span>
              <span className="flex items-center gap-1 text-emerald-800 whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0" />{' '}
                {tr('المنجزة', 'ئەنجامدراو', 'Completed')}
              </span>
            </div>
          </div>

          <div className="h-60 pt-6 flex items-end justify-between gap-1.5 sm:gap-2 pb-2 px-1.5 sm:px-2 bg-[#F2F8FA] border-0 rounded-2xl">
            {weeklyAnalyticsData.map((item) => {
              const maxVal = Math.max(
                1,
                ...weeklyAnalyticsData.map((d) => Math.max(d.incoming, d.resolved))
              );
              const inHeight = Math.round((item.incoming / maxVal) * 100);
              const resHeight = Math.round((item.resolved / maxVal) * 100);
              return (
                <div
                  key={item.day}
                  className="flex-1 flex flex-col items-center gap-2 h-full justify-end min-w-0"
                >
                  <div className="w-full flex items-end justify-center gap-1.5 h-44">
                    <div
                      style={{ height: `${inHeight}%` }}
                      className="w-3.5 sm:w-4 rounded-t-lg bg-gradient-to-t from-[#467586] to-[#6C9DAE]"
                    >
                      <span className="text-[9px] font-black text-[#285060] block text-center -mt-4">
                        {item.incoming}
                      </span>
                    </div>
                    <div
                      style={{ height: `${resHeight}%` }}
                      className="w-3.5 sm:w-4 rounded-t-lg bg-gradient-to-t from-emerald-600 to-teal-400"
                    >
                      <span className="text-[9px] font-black text-emerald-800 block text-center -mt-4">
                        {item.resolved}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9.5px] sm:text-[10px] font-black text-[#1B3A46] whitespace-nowrap">
                    {item.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-3xl bg-white/90 backdrop-blur-xl border-0 space-y-4 shadow-[0_10px_34px_rgba(30,142,147,0.08)]">
          <h3 className="text-base font-black text-[#1B3A46] flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#467586]" />
            <span>
              {tr(
                'توزيع البلاغات حسب القطاعات البلدية',
                'دابەشبوونی سکاڵاکان بەپێی کەرتە شارەوانییەکان',
                'Reports Distribution by Municipal Sectors'
              )}
            </span>
          </h3>

          <div className="space-y-3">
            {sectorDistribution.map((sec) => {
              const sectorBarColors: Record<string, string> = {
                roads: 'linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%)',
                water: 'linear-gradient(90deg, #0284C7 0%, #38BDF8 100%)',
                sewage: 'linear-gradient(90deg, #6366F1 0%, #818CF8 100%)',
                lighting: 'linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)',
                sanitation: 'linear-gradient(90deg, #10B981 0%, #34D399 100%)',
                other: 'linear-gradient(90deg, #467586 0%, #6C9DAE 100%)',
              };
              return (
                <div key={sec.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-[#1B3A46]">
                      {sec.badgeEmoji} {getSectorLabel(sec.key)}
                    </span>
                    <span className="text-[#3B6878] font-black">
                      {sec.count} {tr('بلاغ', 'سکاڵا', 'reports')} ({sec.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[#E3EFF3] overflow-hidden">
                    <div
                      style={{
                        width: `${Math.max(sec.percentage, 6)}%`,
                        background: sectorBarColors[sec.key] || sectorBarColors.other,
                      }}
                      className="h-full rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});
