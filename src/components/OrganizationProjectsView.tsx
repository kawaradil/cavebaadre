import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBaadre } from '../context/BaadreContext';
import { useAuth } from '../context/AuthContext';
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

const toEnglishDigits = (val: string | number): string =>
  String(val)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));

const CompletedWorkCard: React.FC<CompletedWorkCardProps> = ({
  work,
  linkedReport,
  language,
  dir,
  isRTL,
  tr,
}) => {
  const [activeGroup, setActiveGroup] = useState<'after' | 'before'>('after');
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);

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

  const currentList = activeGroup === 'after' ? afterImagesList : beforeImagesList;
  const safePhotoIdx = activePhotoIdx < currentList.length ? activePhotoIdx : 0;
  const currentPhotoUrl = currentList[safePhotoIdx] || fallbackImg;

  const deptName =
    work.completedDepartment ||
    work.organizationName ||
    linkedReport?.assignedTeam ||
    tr(
      'دائرة صيانة الطرق والجسور - باعدرى',
      'فەرمانگەی چاککردنەوەی ڕێگاوبان و پردەکان - باعدرێ',
      'Roads & Bridges Maintenance Dept - Baadre'
    );

  const duration =
    work.durationText ||
    (linkedReport?.responseTimeHours
      ? tr(
          `خلال ${linkedReport.responseTimeHours} ساعة`,
          `لە ماوەی ${linkedReport.responseTimeHours} کاتژمێردا`,
          `Within ${linkedReport.responseTimeHours} hours`
        )
      : tr('خلال 24 ساعة', 'لە ماوەی 24 کاتژمێردا', 'Within 24 hours'));

  // حساب وتنسيق الخط الزمني الميداني الدقيق (استلام -> إرسال وتحديد أولوية -> إنجاز)
  const timelineDates = React.useMemo(() => {
    const formatDateTime = (d: Date) => {
      const locale = language === 'ku' ? 'ckb-IQ' : language === 'ar' ? 'ar-IQ' : 'en-US';
      try {
        const timeStr = d.toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        const dateStr = d.toLocaleDateString(locale, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        return toEnglishDigits(`${timeStr} • ${dateStr}`);
      } catch {
        return toEnglishDigits(`${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`);
      }
    };

    // 1. تاريخ استلام البلاغ
    const rawReceived = linkedReport?.createdAt || work.reportedAt || work.startDate;
    const dateReceived = rawReceived ? new Date(rawReceived) : new Date(Date.now() - 36 * 3600 * 1000);
    const safeReceived = Number.isNaN(dateReceived.getTime())
      ? new Date(Date.now() - 36 * 3600 * 1000)
      : dateReceived;

    // 2. تاريخ إرسال البلاغ وتحديد الأولوية
    const rawDispatched =
      linkedReport?.statusTimestamps?.in_progress ||
      linkedReport?.urgencySetAt ||
      linkedReport?.openedAt;
    let safeDispatched: Date;
    if (rawDispatched) {
      const parsed = new Date(rawDispatched);
      safeDispatched = Number.isNaN(parsed.getTime())
        ? new Date(safeReceived.getTime() + 90 * 60 * 1000)
        : parsed;
    } else {
      safeDispatched = new Date(safeReceived.getTime() + 90 * 60 * 1000);
    }

    // 3. تاريخ الإنجاز والمعالجة
    const rawResolved =
      work.completedAt ||
      linkedReport?.resolvedAt ||
      linkedReport?.statusTimestamps?.resolved ||
      work.expectedCompletionDate;
    let safeResolved: Date;
    if (rawResolved) {
      const parsed = new Date(rawResolved);
      safeResolved = Number.isNaN(parsed.getTime())
        ? new Date(safeDispatched.getTime() + 18 * 3600 * 1000)
        : parsed;
    } else {
      safeResolved = new Date(safeDispatched.getTime() + 18 * 3600 * 1000);
    }

    return {
      received: formatDateTime(safeReceived),
      dispatched: formatDateTime(safeDispatched),
      resolved: formatDateTime(safeResolved),
    };
  }, [linkedReport, work, language]);

  const handleToggleGroup = (group: 'after' | 'before') => {
    playClickSound();
    setActiveGroup(group);
    setActivePhotoIdx(0);
  };

  const galleryItems: GallerySlideItem[] = React.useMemo(
    () => currentList.map((url) => ({ url })),
    [currentList]
  );

  return (
    <div
      dir={dir}
      className={`rounded-3xl bg-white overflow-hidden flex flex-col justify-between border-0 shadow-[0_12px_36px_-6px_rgba(30,55,37,0.14),0_4px_16px_rgba(70,103,77,0.10)] hover:shadow-[0_20px_44px_-6px_rgba(30,55,37,0.22),0_6px_22px_rgba(70,103,77,0.15)] ring-1 ring-[#46674D]/12 hover:ring-[#46674D]/25 transition-all duration-300 group ${
        isRTL ? 'text-right' : 'text-left'
      }`}
    >
      {/* 1. صورة الكارت: نظيفة تماماً بدون أي نصوص أو شارات مطبوعة فوق الصورة */}
      <div className="relative aspect-[16/10] w-full bg-[#1E3725] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeGroup}-${safePhotoIdx}-${currentPhotoUrl}`}
            initial={{ opacity: 0.7, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0.7 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full"
          >
            <SmartAdaptiveImage
              src={currentPhotoUrl}
              alt={work.title}
              gallery={galleryItems}
              initialIndex={safePhotoIdx}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 2. أسفل الصورة: زرّا (بعد) و (قبل) مع إمكانية التبديل بين صور القبل والبعد */}
      <div className="px-5 pt-3.5 pb-2 bg-white">
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-[#F4F9F5] border-0">
          <button
            type="button"
            onClick={() => handleToggleGroup('after')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 border-0 ${
              activeGroup === 'after'
                ? 'bg-[#1E3725] text-white shadow-sm'
                : 'bg-transparent text-[#2D4833] hover:bg-[#E8F4EA]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{tr('بعد الإنجاز', 'دوای ئەنجامدان', 'After')}</span>
            {afterImagesList.length > 1 && (
              <span className="text-[10px] font-mono opacity-80">({afterImagesList.length})</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleToggleGroup('before')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 border-0 ${
              activeGroup === 'before'
                ? 'bg-[#1E3725] text-white shadow-sm'
                : 'bg-transparent text-[#2D4833] hover:bg-[#E8F4EA]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>{tr('قبل الإنجاز', 'پێش ئەنجامدان', 'Before')}</span>
            {beforeImagesList.length > 1 && (
              <span className="text-[10px] font-mono opacity-80">({beforeImagesList.length})</span>
            )}
          </button>
        </div>

        {/* مؤشرات تصفح الصور في حال وجود أكثر من صورة داخل المجموعة الحالية */}
        {currentList.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-2">
            {currentList.map((_, idx) => (
              <button
                key={`photo-dot-${idx}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playClickSound();
                  setActivePhotoIdx(idx);
                }}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === safePhotoIdx
                    ? 'w-6 bg-[#1E3725]'
                    : 'w-2 bg-[#BBDDC6] hover:bg-[#46674D]'
                }`}
                aria-label={`Photo ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* 3. جسم الكارت: نصوص أنيقة وبدون إطارات مع خلفيات ناعمة */}
      <div
        dir={dir}
        className={`px-5 pb-5 flex-1 flex flex-col justify-between gap-3.5 ${
          isRTL ? 'text-right' : 'text-left'
        }`}
      >
        <div className="space-y-3">
          {/* النص التوضيحي الرسمي: تم إنجاز ومعالجة البلاغ الميداني من قبل [الدائرة] بنجاح */}
          <div className="p-3.5 rounded-2xl bg-[#E8F4EA]/80 border-0 flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-[#1E3725] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-[13px] font-black text-[#1E3725] leading-relaxed">
                {tr(
                  `تم إنجاز ومعالجة البلاغ الميداني من قبل ${deptName} بنجاح.`,
                  `ڕاپۆرتی مەیدانی لەلایەن ${deptName} بە سەرکەوتوویی چارەسەر و ئەنجامدرا.`,
                  `The field report has been successfully resolved and completed by ${deptName}.`
                )}
              </p>
            </div>
          </div>

          {/* 4. الخط الزمني العريض المترابط للمراحل الميدانية الثلاث */}
          <div className="p-3.5 rounded-2xl bg-[#F4F9F5] border-0 space-y-2.5">
            <div className="flex items-center justify-between pb-1">
              <span className="text-[11px] font-black text-[#1E3725]">
                {tr('المسار الزمني للإنجاز', 'هێڵی کاتی ئەنجامدان', 'Completion Timeline')}
              </span>
              <span className="text-[10px] font-bold text-[#46674D]">
                {tr('مراحل مكتملة بالكامل', 'قۆناغە تەواوکراوەکان', 'Fully Completed')}
              </span>
            </div>

            {/* شريط المسار الزمني العريض مع خط ربط مستمر وأيقونات المراحل */}
            <div className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:w-0.5 before:bg-[#BBDDC6] before:start-2.5">
              {/* المرحلة 1: استلام البلاغ */}
              <div className="relative flex items-start gap-3">
                <div className="relative z-10 w-5 h-5 rounded-full bg-[#1E3725] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Clock className="w-2.5 h-2.5 stroke-[2.5]" />
                </div>
                <div className="flex-1 min-w-0 text-start">
                  <p className="text-[11px] font-black text-[#1E3725] leading-tight">
                    {tr(
                      `تم استلام البلاغ في ${timelineDates.received}`,
                      `ڕاپۆرت وەرگیرا لە ${timelineDates.received}`,
                      `Report received at ${timelineDates.received}`
                    )}
                  </p>
                </div>
              </div>

              {/* المرحلة 2: إرسال البلاغ وتحديد الأولوية */}
              <div className="relative flex items-start gap-3">
                <div className="relative z-10 w-5 h-5 rounded-full bg-[#46674D] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Building2 className="w-2.5 h-2.5 stroke-[2.5]" />
                </div>
                <div className="flex-1 min-w-0 text-start">
                  <p className="text-[11px] font-black text-[#1E3725] leading-tight">
                    {tr(
                      `تم إرسال البلاغ وتحديد الأولوية في ${timelineDates.dispatched}`,
                      `ڕاپۆرت نێردرا و ئەولەویەت دیاریکرا لە ${timelineDates.dispatched}`,
                      `Report dispatched & priority set at ${timelineDates.dispatched}`
                    )}
                  </p>
                </div>
              </div>

              {/* المرحلة 3: الإنجاز والمعالجة */}
              <div className="relative flex items-start gap-3">
                <div className="relative z-10 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle2 className="w-2.5 h-2.5 stroke-[2.5]" />
                </div>
                <div className="flex-1 min-w-0 text-start">
                  <p className="text-[11px] font-black text-[#1E3725] leading-tight">
                    {tr(
                      `تم الإنجاز والمعالجة في ${timelineDates.resolved}`,
                      `کارەکە ئەنجامدرا و چارەسەرکرا لە ${timelineDates.resolved}`,
                      `Completed and resolved at ${timelineDates.resolved}`
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. التفاصيل السفلية بدون إطارات: مدة الإنجاز • نوع البلاغ • الدائرة المنجزة */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-0">
          {/* مدة الإنجاز */}
          <div className="p-2.5 rounded-xl bg-[#F4F9F5] border-0 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#E8F4EA] text-[#46674D] flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold text-[#46674D]">
                {tr('مدة الإنجاز:', 'ماوەی ئەنجامدان:', 'Duration:')}
              </span>
              <span className="block text-xs font-black text-[#1E3725] truncate">
                {duration}
              </span>
            </div>
          </div>

          {/* نوع البلاغ */}
          <div className="p-2.5 rounded-xl bg-[#F4F9F5] border-0 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#E8F4EA] text-[#46674D] flex items-center justify-center shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold text-[#46674D]">
                {tr('نوع البلاغ:', 'جۆری ڕاپۆرت:', 'Report Type:')}
              </span>
              <span className="block text-xs font-black text-[#1E3725] truncate">
                {secLabel}
              </span>
            </div>
          </div>

          {/* الدائرة المنجزة */}
          <div className="p-2.5 rounded-xl bg-[#F4F9F5] border-0 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#E8F4EA] text-[#46674D] flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold text-[#46674D]">
                {tr('الدائرة المنجزة:', 'فەرمانگەی ئەنجامدەر:', 'Department:')}
              </span>
              <span className="block text-xs font-black text-[#1E3725] truncate" title={deptName}>
                {deptName}
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
  const { currentUser, isAdmin, isSuperAdmin } = useAuth();
  const { language } = useLanguage();
  const [adminVisibleCount, setAdminVisibleCount] = useState<number>(5);

  const canAccessAllProjects = Boolean(currentUser && (isAdmin || isSuperAdmin));

  const isRTL = language === 'ar' || language === 'ku';
  const dir: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';

  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

  const visibleProjects = React.useMemo(() => {
    const filtered = projects.filter((work) => {
      if (!work.reportId && !work.trackingCode) return true;
      const linkedReport = reports.find(
        (r) =>
          (work.reportId && String(r.id) === String(work.reportId)) ||
          (work.trackingCode && r.trackingCode === work.trackingCode)
      );
      return !linkedReport || linkedReport.status === 'resolved';
    });

    // ترتيب الأعمال المنجزة من الأحدث إلى الأقدم
    return [...filtered].sort((a, b) => {
      const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      if (timeB !== timeA && !Number.isNaN(timeA) && !Number.isNaN(timeB)) {
        return timeB - timeA;
      }
      const idA = Number(a.id) || 0;
      const idB = Number(b.id) || 0;
      return idB - idA;
    });
  }, [projects, reports]);

  // للزائر والمواطن: آخر 10 أعمال منجزة فقط لا غيرها
  // للأدمن والسوبر أدمن: كل الأعمال المنجزة مع تحميل 5 ثم 5 ثم 5 وهكذا
  const displayedProjects = React.useMemo(() => {
    if (canAccessAllProjects) {
      return visibleProjects.slice(0, adminVisibleCount);
    }
    return visibleProjects.slice(0, 10);
  }, [visibleProjects, canAccessAllProjects, adminVisibleCount]);

  const hasMoreForAdmin =
    canAccessAllProjects && visibleProjects.length > adminVisibleCount;

  return (
    <div
      dir={dir}
      className={`max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-5 ${
        isRTL ? 'text-right' : 'text-left'
      }`}
    >
      {displayedProjects.length === 0 ? (
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
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedProjects.map((work) => {
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

          {hasMoreForAdmin && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setAdminVisibleCount((prev) => prev + 5);
                }}
                className="px-6 py-3 rounded-2xl bg-gradient-to-tr from-[#33553C] via-[#46674D] to-[#5C8564] text-white font-black text-xs sm:text-sm inline-flex items-center gap-2 shadow-[0_8px_22px_rgba(70,103,77,0.25)] hover:brightness-105 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer border-0 outline-none"
              >
                <ChevronDown className="w-4.5 h-4.5 stroke-[2.5]" />
                <span>
                  {tr(
                    `تحميل 5 أعمال أخرى (${displayedProjects.length} من ${visibleProjects.length})`,
                    `بارکردنی 5 کاری دیکە (${displayedProjects.length} لە ${visibleProjects.length})`,
                    `Load 5 More Works (${displayedProjects.length} of ${visibleProjects.length})`
                  )}
                </span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
