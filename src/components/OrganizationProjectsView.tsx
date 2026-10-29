import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBaadre } from '../context/BaadreContext';
import { useLanguage } from '../context/LanguageContext';
import {
  OrganizationProject,
  CivicReport,
  SECTOR_META,
  SECTOR_ILLUSTRATIONS,
} from '../types/baadre';
import { SmartAdaptiveImage, GallerySlideItem } from './SmartAdaptiveImage';
import { playClickSound } from '../lib/sound';

interface OrganizationProjectsViewProps {
  onOpenAddProject?: () => void;
}

interface CompletedWorkCardProps {
  work: OrganizationProject;
  linkedReport?: CivicReport;
  language: 'ar' | 'ku' | 'en';
  dir: 'rtl' | 'ltr';
  isRTL: boolean;
  tr: (ar: string, ku: string, en: string) => string;
}

const CompletedWorkCard: React.FC<CompletedWorkCardProps> = ({
  work,
  linkedReport,
  language,
  dir,
  isRTL,
  tr,
}) => {
  const [activeSlide, setActiveSlide] = useState<number>(0);

  const sec = SECTOR_META[work.sector] || SECTOR_META.other;
  const secLabel = language === 'ku' ? sec.ku : language === 'en' ? sec.en : sec.ar;
  const fallbackImg = SECTOR_ILLUSTRATIONS[work.sector] || SECTOR_ILLUSTRATIONS.other;

  // جمع كل صور (بعد الإنجاز) بالترتيب
  const afterImagesList = React.useMemo(() => {
    const rawAfter =
      work.afterImages && work.afterImages.length > 0
        ? work.afterImages
        : linkedReport?.resolvedImages && linkedReport.resolvedImages.length > 0
        ? linkedReport.resolvedImages
        : work.images && work.images.length > 0
        ? [work.images[0]]
        : [fallbackImg];
    return Array.from(new Set(rawAfter.filter(Boolean)));
  }, [work.afterImages, work.images, linkedReport?.resolvedImages, fallbackImg]);

  // جمع كل صور (قبل الإنجاز) بالترتيب
  const beforeImagesList = React.useMemo(() => {
    const rawBefore =
      work.beforeImages && work.beforeImages.length > 0
        ? work.beforeImages
        : linkedReport?.images && linkedReport.images.length > 0
        ? linkedReport.images
        : work.beforeImage
        ? [work.beforeImage]
        : [fallbackImg];
    return Array.from(new Set(rawBefore.filter(Boolean)));
  }, [work.beforeImages, work.beforeImage, linkedReport?.images, fallbackImg]);

  // ترتيب الشرائح: كل صور (بعد) أولاً، وبعد انتهاء صور (بعد) تظهر كل صور (قبل)
  const slides = React.useMemo(() => {
    const afterSlides = afterImagesList.map((url, idx) => ({
      type: 'after' as const,
      url,
      indexInGroup: idx + 1,
      groupTotal: afterImagesList.length,
      badge:
        afterImagesList.length > 1
          ? `${tr('بعد الإنجاز', 'دوای ئەنجامدان', 'After')} (${idx + 1}/${afterImagesList.length})`
          : tr('بعد الإنجاز', 'دوای ئەنجامدان', 'After Completion'),
    }));

    const beforeSlides = beforeImagesList.map((url, idx) => ({
      type: 'before' as const,
      url,
      indexInGroup: idx + 1,
      groupTotal: beforeImagesList.length,
      badge:
        beforeImagesList.length > 1
          ? `${tr('قبل الإنجاز', 'پێش ئەنجامدان', 'Before')} (${idx + 1}/${beforeImagesList.length})`
          : tr('قبل الإنجاز', 'پێش ئەنجامدان', 'Before'),
    }));

    return [...afterSlides, ...beforeSlides];
  }, [afterImagesList, beforeImagesList, language]);

  const galleryItems: GallerySlideItem[] = React.useMemo(
    () => slides.map((s) => ({ url: s.url, badge: s.badge })),
    [slides]
  );

  const safeSlideIdx = activeSlide < slides.length ? activeSlide : 0;
  const currentSlide = slides[safeSlideIdx] || slides[0];
  const firstBeforeIndex = afterImagesList.length;

  const deptName = work.completedDepartment || work.organizationName;
  const duration = work.durationText || tr('6 ساعات', '6 کاتژمێر', '6 hours');

  const handleNextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    playClickSound();
    setActiveSlide((prev) => (prev + 1) % slides.length);
  };

  const handlePrevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    playClickSound();
    setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleSelectGroup = (group: 'after' | 'before', e: React.MouseEvent) => {
    e.stopPropagation();
    playClickSound();
    if (group === 'after') {
      if (currentSlide.type === 'after' && afterImagesList.length > 1) {
        // إذا كان داخل مجموعة "بعد" بالفعل يتنقل للصورة التالية في "بعد"
        const nextAfter = (safeSlideIdx + 1) % afterImagesList.length;
        setActiveSlide(nextAfter);
      } else {
        setActiveSlide(0);
      }
    } else {
      if (currentSlide.type === 'before' && beforeImagesList.length > 1) {
        const offsetInBefore = safeSlideIdx - firstBeforeIndex;
        const nextBefore = firstBeforeIndex + ((offsetInBefore + 1) % beforeImagesList.length);
        setActiveSlide(nextBefore);
      } else {
        setActiveSlide(firstBeforeIndex);
      }
    }
  };

  return (
    <div
      dir={dir}
      className={`rounded-3xl bg-white transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-none border-0 group ${
        isRTL ? 'text-right' : 'text-left'
      }`}
    >
      {/* معرض الصور المتسلسل: كل صور (بعد) أولاً ثم كل صور (قبل) */}
      <div className="relative aspect-video w-full bg-[#1E3725] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentSlide.type}-${safeSlideIdx}`}
            initial={{ opacity: 0.65, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0.65 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full"
          >
            <SmartAdaptiveImage
              src={currentSlide.url}
              alt={currentSlide.badge}
              gallery={galleryItems}
              initialIndex={safeSlideIdx}
              badgeText={currentSlide.badge}
            />
          </motion.div>
        </AnimatePresence>

        {/* شارة "بعد" أو "قبل" مع رقم الصورة */}
        <span
          className={`absolute top-3 ${
            isRTL ? 'right-3' : 'left-3'
          } z-20 px-3.5 py-1 rounded-xl text-xs font-black text-white shadow-md backdrop-blur-md flex items-center gap-1.5 pointer-events-none ${
            currentSlide.type === 'after' ? 'bg-[#46674D]/95' : 'bg-[#1E3725]/90'
          }`}
        >
          {currentSlide.type === 'after' && <CheckCircle2 className="w-3.5 h-3.5" />}
          <span>{currentSlide.badge}</span>
        </span>

        {/* عداد إجمالي الصور في الزاوية المقابلة */}
        <span
          dir="ltr"
          className={`absolute top-3 ${
            isRTL ? 'left-3' : 'right-3'
          } z-20 px-2.5 py-1 rounded-xl bg-black/55 text-white text-[11px] font-mono font-bold backdrop-blur-md pointer-events-none`}
        >
          {safeSlideIdx + 1} / {slides.length}
        </span>

        {/* أزرار التبديل السريع بين (بعد) و (قبل) + النقاط المتسلسلة */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-2.5 inset-x-0 flex flex-col items-center gap-1.5 z-20 pointer-events-none"
        >
          <div className="flex items-center justify-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={(e) => handleSelectGroup('after', e)}
              className={`px-3.5 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer backdrop-blur-md shadow-xs ${
                currentSlide.type === 'after'
                  ? 'bg-[#46674D] text-white'
                  : 'bg-white/90 text-[#1E3725] hover:bg-white'
              }`}
            >
              {tr('بعد', 'دوای', 'After')} ({afterImagesList.length})
            </button>
            <button
              type="button"
              onClick={(e) => handleSelectGroup('before', e)}
              className={`px-3.5 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer backdrop-blur-md shadow-xs ${
                currentSlide.type === 'before'
                  ? 'bg-[#1E3725] text-white'
                  : 'bg-white/90 text-[#1E3725] hover:bg-white'
              }`}
            >
              {tr('قبل', 'پێش', 'Before')} ({beforeImagesList.length})
            </button>
          </div>

          {slides.length > 2 && (
            <div className="flex items-center gap-1 pointer-events-auto">
              {slides.map((s, idx) => (
                <button
                  key={`dot-${idx}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playClickSound();
                    setActiveSlide(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === safeSlideIdx
                      ? s.type === 'after'
                        ? 'w-5 bg-emerald-400'
                        : 'w-5 bg-amber-300'
                      : 'w-1.5 bg-white/60 hover:bg-white'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* أزرار الأسهم للتمرير المتسلسل (كل صور بعد ثم كل صور قبل) */}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={isRTL ? handleNextSlide : handlePrevSlide}
              aria-label="Previous Slide"
              className="absolute top-1/2 -translate-y-1/2 left-2.5 z-20 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-[#1E3725] flex items-center justify-center shadow-md backdrop-blur-xs transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={isRTL ? handlePrevSlide : handleNextSlide}
              aria-label="Next Slide"
              className="absolute top-1/2 -translate-y-1/2 right-2.5 z-20 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-[#1E3725] flex items-center justify-center shadow-md backdrop-blur-xs transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* تفاصيل الكارت */}
      <div
        dir={dir}
        className={`p-5 flex-1 flex flex-col justify-between space-y-3.5 bg-white ${
          isRTL ? 'text-right' : 'text-left'
        }`}
      >
        <div className="space-y-3">
          {/* شريط القطاع والمدة */}
          <div className="flex flex-wrap items-center justify-start gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#E8F4EA] text-[#1E3725] text-[11px] font-black shrink-0">
              <span>{sec.badgeEmoji}</span>
              <span>{secLabel}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#F4F9F5] text-[#2D4833] text-[11px] font-black">
              <Clock className="w-3.5 h-3.5 text-[#46674D] shrink-0" />
              <span>
                {tr('مدة الإنجاز:', 'ماوەی ئەنجامدان:', 'Duration:')} {duration}
              </span>
            </span>
          </div>

          {/* عنوان العمل المنجز */}
          <h3 className="text-base font-black text-[#1E3725] leading-snug">
            {work.title}
          </h3>

          {/* وصف مختصر للعمل المنجز */}
          <p className="text-xs font-bold text-[#46674D] leading-relaxed">
            {work.completionNotes || work.description}
          </p>

          {/* الدائرة المنجزة والموقع */}
          <div className="p-3.5 rounded-2xl bg-[#F4F9F5] space-y-2.5">
            <div className="flex items-start gap-2">
              <span className="text-[11px] font-bold text-[#46674D] flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                <Building2 className="w-3.5 h-3.5 text-[#46674D] shrink-0" />
                <span>{tr('الدائرة المنجزة:', 'فەرمانگەی ئەنجامدەر:', 'Department:')}</span>
              </span>
              <span className="text-xs font-black text-[#1E3725] leading-snug">
                {deptName}
              </span>
            </div>

            <div className="flex items-start gap-2 pt-2 border-t border-[#E8F4EA]">
              <span className="text-[11px] font-bold text-[#46674D] flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                <MapPin className="w-3.5 h-3.5 text-[#46674D] shrink-0" />
                <span>{tr('الموقع:', 'شوێن:', 'Location:')}</span>
              </span>
              <span className="text-xs font-black text-[#2D4833] leading-snug">
                {work.neighborhood}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const OrganizationProjectsView: React.FC<OrganizationProjectsViewProps> = () => {
  const { projects, reports } = useBaadre();
  const { language } = useLanguage();

  const isRTL = language === 'ar' || language === 'ku';
  const dir: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';

  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

  const visibleProjects = React.useMemo(() => {
    return projects.filter((work) => {
      if (!work.reportId && !work.trackingCode) return true;
      const linkedReport = reports.find(
        (r) =>
          (work.reportId && String(r.id) === String(work.reportId)) ||
          (work.trackingCode && r.trackingCode === work.trackingCode)
      );
      return !linkedReport || linkedReport.status === 'resolved';
    });
  }, [projects, reports]);

  return (
    <div
      dir={dir}
      className={`max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-5 ${
        isRTL ? 'text-right' : 'text-left'
      }`}
    >
      {visibleProjects.length === 0 ? (
        <div className="p-10 rounded-3xl bg-white shadow-none border-0 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#E8F4EA] text-[#46674D] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-[#1E3725]">
            {tr(
              'لا توجد أعمال منجزة مسجلة حالياً',
              'هیچ کارێکی تەواوکراو تۆمار نەکراوە لە ئێستادا',
              'No Completed Works Recorded Yet'
            )}
          </h3>
          <p className="text-xs font-bold text-[#46674D] max-w-md mx-auto leading-relaxed">
            {tr(
              'عند تحديث حالة أي بلاغ إلى (تم الإنجاز) مع إرفاق صور وتفاصيل الإنجاز في كارت تفاصيل البلاغ، سيُضاف تلقائياً هنا وفي كولكشن CompletedWork في قاعدة البيانات.',
              'کاتێک دۆخی هەر سکاڵایەک دەکرێت بە (ئەنجامدرا) لەگەڵ وێنە و وردەکاری ئەنجامدان، ڕاستەوخۆ لێرە و لە بنکەی زانیاری CompletedWork زیاد دەکرێت.',
              'When any report status is updated to Completed with photos and resolution details, it will automatically appear here and in the CompletedWork database collection.'
            )}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleProjects.map((work) => {
            const linkedReport = reports.find(
              (r) =>
                (work.reportId && String(r.id) === String(work.reportId)) ||
                (work.trackingCode && r.trackingCode === work.trackingCode)
            );
            return (
              <CompletedWorkCard
                key={work.id}
                work={work}
                linkedReport={linkedReport}
                language={language}
                dir={dir}
                isRTL={isRTL}
                tr={tr}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
