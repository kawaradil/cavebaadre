import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useColorTheme } from '../context/ColorContext';
import {
  ShieldCheck,
  Building2,
  Camera,
  MapPin,
  CheckCircle2,
  Plus,
  Sparkles,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

interface AppStartOverviewScreenProps {
  onOpenSubmitReport: () => void;
}

export const AppStartOverviewScreen: React.FC<AppStartOverviewScreenProps> = ({
  onOpenSubmitReport,
}) => {
  const { language: lang, dir } = useLanguage();
  const { palette } = useColorTheme();

  const content = {
    ar: {
      title: 'ÇAVÊ BAADRÊ',
      localTitle: 'چاڤێ باعدرێ • عين باعذرة',
      subtitle: 'منصتكم الميدانية لرصد الأعطال وتوثيق الإنجاز في ناحية باعدرى',
      aboutTitle: 'عمل التطبيق والمنظمة',
      aboutText:
        'مبادرة رقمية تشرف عليها منظمة RABA في ناحية باعدرى لربط المواطنين بالدوائر الخدمية، استلام البلاغات الميدانية، ومتابعة معالجتها وتوثيق إنجازها بشفافية.',
      policyTitle: 'سياسة الخصوصية والأمان',
      policyText:
        'بياناتكم الشخصية ورقم الهاتف محفوظة بسرية تامة داخل النظام ولا تظهر للعامة أو لأي جهة خارجية، وتُستخدم حصراً للتواصل معكم ومتابعة إتمام البلاغ.',
      stepsTitle: 'كيفية إضافة بلاغ بـ 3 خطوات',
      steps: [
        {
          num: '1',
          title: 'التقاط الصورة وتحديد القطاع',
          desc: 'صوّر المشكلة الميدانية واختر القطاع الخدمي المختص.',
          icon: Camera,
        },
        {
          num: '2',
          title: 'تحديد الموقع والوصف الذكي',
          desc: 'حدّد موقع العطل على الخريطة أو اختر عنواناً جاهزاً بضغطة زر.',
          icon: MapPin,
        },
        {
          num: '3',
          title: 'إرسال البلاغ ومتابعة الإنجاز',
          desc: 'يُحال البلاغ فوراً للدائرة المختصة وتصلك إشعارات بمراحل التنفيذ.',
          icon: CheckCircle2,
        },
      ],
      ctaButton: 'أضف بلاغاً',
      ctaHint: 'أو تنقّل بين الأقسام من القائمة لاستعراض الأعمال المنجزة',
    },
    ku: {
      title: 'ÇAVÊ BAADRÊ',
      localTitle: 'چاڤێ باعدرێ • عين باعذرة',
      subtitle: 'سەکۆی مەیدانی بۆ تۆمارکردنی کێشەکان و بەڵگەکردنی کارەکان لە باعەدرێ',
      aboutTitle: 'کاری ئەپڵیکەیشن و ڕێکخراو',
      aboutText:
        'پڕۆژەیەکی دیجیتاڵییە لەژێر سەرپەرشتی ڕێکخراوی RABA لە ناحیەی باعەدرێ بۆ گەیاندنی دەنگی هاووڵاتیان بە فەرمانگە خزمەتگوزارییەکان و بەدواداچوونی چارەسەرکردنیان بە شەفافیەت.',
      policyTitle: 'سیاسەتی پاراستنی تایبەتمەندی',
      policyText:
        'زانیارییە کەسییەکانتان و ژمارەی مۆبایل بە تەواوی پارێزراون و بۆ هیچ لایەنێکی دەرەکی یان گشتی دەرناکەون، تەنها بۆ خزمەتکردن و بەدواداچوونی سکاڵاکەتان بەکاردێن.',
      stepsTitle: 'چۆنیەتی ناردنی سکاڵا بە ٣ هەنگاو',
      steps: [
        {
          num: '1',
          title: 'وێنەگرتن و هەڵبژاردنی کەرت',
          desc: 'وێنەی کێشەکە بگرە و کەرتی خزمەتگوزاری پەیوەندیدار دیاری بکە.',
          icon: Camera,
        },
        {
          num: '2',
          title: 'دیاریکردنی شوێن و وەسفی زیرەک',
          desc: 'شوێنی کێشەکە لەسەر نەخشە دیاری بکە یان ناونیشانی ئامادەکراو هەڵبژێرە.',
          icon: MapPin,
        },
        {
          num: '3',
          title: 'ناردنی سکاڵا و بەدواداچوون',
          desc: 'سکاڵاکە ڕاستەوخۆ دەگاتە فەرمانگەی پەیوەندیدار و قۆناغەکانی جێبەجێکردن دەبینیت.',
          icon: CheckCircle2,
        },
      ],
      ctaButton: 'زیادکردنی سکاڵا',
      ctaHint: 'یان لە ڕێگەی لیستەکەوە سەردانی بەشەکانی تر بکە',
    },
    en: {
      title: 'ÇAVÊ BAADRÊ',
      localTitle: 'چاڤێ باعدرێ • Eye of Baadre',
      subtitle: 'Your civic platform for field reporting & verified impact in Baadre',
      aboutTitle: 'App Mission & RABA Organization',
      aboutText:
        'A civic initiative supervised by RABA Organization in Baadre to connect citizens with municipal departments, streamline field reports, and transparently document completed works.',
      policyTitle: 'Privacy & Data Protection Policy',
      policyText:
        'Your personal details and phone number are strictly confidential, never shared publicly or with external parties, and used solely to follow up on your report.',
      stepsTitle: 'How to Submit a Report in 3 Steps',
      steps: [
        {
          num: '1',
          title: 'Capture Photo & Select Sector',
          desc: 'Take a clear photo of the issue and pick the relevant municipal sector.',
          icon: Camera,
        },
        {
          num: '2',
          title: 'Pin Location & Smart Description',
          desc: 'Mark the spot on the map and select a quick smart title in one tap.',
          icon: MapPin,
        },
        {
          num: '3',
          title: 'Submit & Track Completion',
          desc: 'Your report is routed to the service team with real-time progress updates.',
          icon: CheckCircle2,
        },
      ],
      ctaButton: 'Add a Report',
      ctaHint: 'Or use the navigation menu to explore completed works',
    },
  };

  const t = content[lang] || content.ar;
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <div
      dir={dir}
      className="max-w-3xl mx-auto px-4 sm:px-6 pt-3 pb-28 sm:pb-16 animate-in fade-in duration-300"
    >
      {/* Main Container matched with active ColorContext theme - بدون إطارات */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-b from-[#E7F2F5]/95 via-[#F2F8FA]/95 to-[#E4F0F4]/95 border-0 shadow-[0_18px_50px_rgba(30,142,147,0.14)] text-[#1B3A46]">
        {/* Dynamic Ambient Glow from ColorContext */}
        <div
          className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-35 blur-3xl"
          style={{ background: `radial-gradient(circle, ${palette.gradientToHex} 0%, transparent 70%)` }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 w-64 h-64 rounded-full opacity-30 blur-3xl"
          style={{ background: `radial-gradient(circle, ${palette.primaryHex} 0%, transparent 70%)` }}
        />

        <div className="relative z-10 p-5 sm:p-7 space-y-5">
          {/* App Logo + Subtitle */}
          <div className="text-center space-y-2.5 pt-1">
            <div className="relative flex items-center justify-center py-1">
              <div
                className="absolute w-36 h-36 rounded-full blur-xl pointer-events-none"
                style={{
                  background: `radial-gradient(circle, rgba(255,255,255,0.92) 0%, ${palette.primaryLightHex}88 65%, transparent 100%)`,
                }}
              />
              <img
                src="/assets/aistudio/cave_baadre_logo.png"
                alt="ÇAVÊ BAADRÊ"
                className="relative w-32 sm:w-36 h-auto object-contain select-none pointer-events-none"
                style={{
                  filter:
                    palette.logoFilter && palette.logoFilter !== 'none'
                      ? `${palette.logoFilter} drop-shadow(0 10px 22px rgba(${palette.shadowRgb}, 0.22))`
                      : `drop-shadow(0 10px 22px rgba(${palette.shadowRgb}, 0.22))`,
                }}
              />
            </div>

            <div className="space-y-1 pt-0.5">
              <h1 className="text-base sm:text-lg font-black text-[#1B3A46]">
                {t.localTitle}
              </h1>
              <p className="text-xs sm:text-sm font-bold text-[#285060] max-w-md mx-auto leading-relaxed">
                {t.subtitle}
              </p>
            </div>
          </div>

          {/* Two Concise Cards: Mission/Organization & Privacy Policy (بدون إطارات) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Organization & Work Card */}
            <div className="rounded-2xl bg-white/90 border-0 shadow-[0_4px_18px_rgba(30,142,147,0.08)] p-4 flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#467586] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Building2 className="w-4.5 h-4.5" />
                </div>
                <h2 className="text-xs sm:text-sm font-black text-[#1B3A46]">
                  {t.aboutTitle}
                </h2>
              </div>
              <p className="text-xs text-[#285060] font-bold leading-relaxed bg-[#F2F8FA] p-3 rounded-xl border-0">
                {t.aboutText}
              </p>
            </div>

            {/* Policy & Privacy Protection Card */}
            <div className="rounded-2xl bg-white/90 border-0 shadow-[0_4px_18px_rgba(30,142,147,0.08)] p-4 flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#467586] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <ShieldCheck className="w-4.5 h-4.5" />
                </div>
                <h2 className="text-xs sm:text-sm font-black text-[#1B3A46]">
                  {t.policyTitle}
                </h2>
              </div>
              <p className="text-xs text-[#285060] font-bold leading-relaxed bg-[#F2F8FA] p-3 rounded-xl border-0">
                {t.policyText}
              </p>
            </div>
          </div>

          {/* Harmonious & Gentle 3-Step Card (كيفية إضافة بلاغ بـ 3 خطوات - بدون إطارات) */}
          <div className="rounded-2xl bg-white/90 border-0 shadow-[0_4px_18px_rgba(30,142,147,0.08)] p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2.5 pb-1 border-0">
              <div className="w-8 h-8 rounded-xl bg-[#E3EFF3] text-[#3B6878] flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-[#467586]" />
              </div>
              <h3 className="text-xs sm:text-sm font-black text-[#1B3A46]">
                {t.stepsTitle}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {t.steps.map((step, idx) => {
                const IconComponent = step.icon;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl bg-[#F2F8FA] border-0 p-3.5 flex sm:flex-col items-center sm:items-start gap-3 transition-all hover:bg-[#E8F2F6]/80"
                  >
                    {/* Icon & Step Number Badge */}
                    <div className="flex items-center justify-between sm:w-full shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#467586] to-[#58899A] text-white flex items-center justify-center shadow-[0_4px_12px_rgba(70,117,134,0.20)] shrink-0">
                        <IconComponent className="w-4.5 h-4.5 stroke-[2.2]" />
                      </div>
                      <span
                        dir="ltr"
                        className="hidden sm:inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#E3EFF3] text-[#3B6878] text-xs font-mono font-black border-0"
                      >
                        {step.num}
                      </span>
                    </div>

                    {/* Step Title & Description */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          dir="ltr"
                          className="sm:hidden inline-flex items-center justify-center w-5 h-5 rounded-md bg-[#E3EFF3] text-[#3B6878] text-[11px] font-mono font-black shrink-0 border-0"
                        >
                          {step.num}
                        </span>
                        <h4 className="text-xs font-black text-[#1B3A46] truncate">
                          {step.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-[#285060] font-bold leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Primary Call to Action Button matched with SidebarDrawer Install/Primary Buttons */}
          <div className="pt-1 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onOpenSubmitReport}
              className="w-full sm:w-auto sm:min-w-[260px] py-3.5 px-7 rounded-2xl bg-gradient-to-r from-[#467586] via-[#58899A] to-[#6C9DAE] hover:from-[#3B6878] hover:to-[#467586] text-white font-black text-sm sm:text-base shadow-[0_8px_22px_rgba(70,117,134,0.26)] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer border-0"
            >
              <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Plus className="w-4.5 h-4.5 stroke-[2.6] text-white" />
              </div>
              <span>{t.ctaButton}</span>
              <ArrowIcon className="w-4 h-4 opacity-90" />
            </button>
            <p className="text-[11px] font-bold text-[#3B6878] text-center">
              {t.ctaHint}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
