import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Bell,
  CheckCircle2,
  X,
  BarChart3,
  Building2,
  ClipboardList,
  Briefcase,
  Plus,
  QrCode,
  Eye,
  MapPin,
  Clock,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useBaadre } from '../context/BaadreContext';
import { playClickSound } from '../lib/sound';
import {
  AdminSectionTab,
  CivicReport,
  SECTOR_META,
  isReportSentToDepartment,
} from '../types/baadre';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarHeaderProps {
  onOpenSidebar?: () => void;
  onOpenDrawer?: () => void;
  onOpenAddReport?: () => void;
  onOpenSubmitReport?: () => void;
  onSelectReport?: (rep: CivicReport) => void;
}

export const NavbarHeader: React.FC<NavbarHeaderProps> = ({
  onOpenSidebar,
  onOpenDrawer,
  onSelectReport,
  onOpenSubmitReport,
}) => {
  const handleOpenSidebar = () => {
    if (onOpenSidebar) onOpenSidebar();
    else if (onOpenDrawer) onOpenDrawer();
  };

  const { language, isRTL } = useLanguage();
  const {
    activeRole,
    citizenTab,
    setCitizenTab,
    adminTab,
    setAdminTab,
    setIsSurveysViewOpen,
    reports,
    myReports,
    setSelectedReport,
  } = useBaadre();

  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // يظهر في أيقونة الجرس فقط البلاغات التي لم يتم إرسالها إلى الدائرة المعنية
  // وإذا تم إرسال البلاغ لا يظهر في أيقونة الجرس
  const notifList = React.useMemo(
    () =>
      (activeRole === 'admin' ? reports : myReports).filter(
        (r) => !isReportSentToDepartment(r)
      ),
    [activeRole, reports, myReports]
  );

  const notifBadgeCount = notifList.length;

  const toEnglishDigits = (val: string | number): string =>
    String(val)
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));

  const formatShortTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const dateStr = d.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
      });
      const timeStr = d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return toEnglishDigits(`${dateStr} • ${timeStr}`);
    } catch {
      return '';
    }
  };

  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--app-header-height', `${height}px`);
      }
    };
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, [activeRole]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setIsNotifMenuOpen(false);
      }
    };

    if (isNotifMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isNotifMenuOpen]);

  // Admin order: 1. الإحصاءات, 2. البلاغات, 3. الأعمال المنجزة, 4. الدوائر والمواطنين
  const adminSections: { id: AdminSectionTab; ar: string; ku: string; en: string; icon: React.FC<{ className?: string }> }[] = [
    {
      id: 'analytics',
      ar: 'الإحصاءات والمؤشرات',
      ku: 'ئامار و نیشاندەرەکان',
      en: 'Analytics & KPIs',
      icon: BarChart3,
    },
    {
      id: 'active_reports',
      ar: 'البلاغات النشطة',
      ku: 'سکاڵا چالاکەکان',
      en: 'Active Reports',
      icon: ClipboardList,
    },
    {
      id: 'projects',
      ar: 'الأعمال المنجزة',
      ku: 'کارە تەواوکراوەکان',
      en: 'Completed Works',
      icon: Briefcase,
    },
    {
      id: 'directory',
      ar: 'الدوائر والمواطنين',
      ku: 'فەرمانگە و هاووڵاتیان',
      en: 'Departments & Citizens',
      icon: Building2,
    },
  ];

  return (
    <header
      id="main-top-navbar"
      ref={headerRef}
      className="fixed top-0 inset-x-0 z-50 w-full bg-white/75 backdrop-blur-xl border-b border-[#BBDDC6]/60 shadow-[0_4px_20px_rgba(70,103,77,0.06)] transition-colors text-[#2D4833]"
      style={{
        paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 0.35rem), 0.65rem)',
        paddingBottom: '0.45rem',
        paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 0.75rem)',
        paddingRight: 'calc(env(safe-area-inset-right, 0px) + 0.75rem)',
      }}
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Sidebar Menu Icon + Only "ÇAVÊ BAADRÊ" */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={handleOpenSidebar}
              className="p-2 rounded-xl bg-[#E8F4EA]/80 text-[#36593F] hover:text-[#1E3725] hover:bg-[#D4EADB] transition-all focus:outline-none cursor-pointer active:scale-90 border border-[#BBDDC6]/60 shrink-0"
              title={language === 'ku' ? 'لیستی سەرەکی' : language === 'en' ? 'Main Menu' : 'القائمة الجانبية'}
              aria-label="Main Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <span
              onClick={() => {
                if (activeRole === 'citizen') setCitizenTab('works');
                else setAdminTab('analytics');
              }}
              className="text-sm sm:text-base font-black tracking-wider text-[#1E3725] font-mono whitespace-nowrap cursor-pointer select-none"
            >
              ÇAVÊ BAADRÊ
            </span>
          </div>

          {/* Center Desktop Navigation Tabs (Admin & Citizen) */}
          {activeRole === 'admin' ? (
            <nav className="hidden lg:flex items-center gap-1 bg-[#E8F4EA]/70 p-1 rounded-2xl border border-[#BBDDC6]/60">
              {adminSections.map((sec) => {
                const IconComp = sec.icon;
                const isActive = adminTab === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      setIsSurveysViewOpen(false);
                      setAdminTab(sec.id);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-[#46674D] text-white font-black shadow-2xs'
                        : 'text-[#2D4833] hover:bg-white/80'
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5 shrink-0" />
                    <span>{language === 'ku' ? sec.ku : language === 'en' ? sec.en : sec.ar}</span>
                  </button>
                );
              })}
            </nav>
          ) : (
            <nav className="hidden lg:flex items-center gap-1 bg-[#E8F4EA]/70 p-1 rounded-2xl border border-[#BBDDC6]/60">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsSurveysViewOpen(false);
                  setCitizenTab('works');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  citizenTab === 'works' || citizenTab === 'projects'
                    ? 'bg-[#46674D] text-white font-black shadow-2xs'
                    : 'text-[#2D4833] hover:bg-white/80'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {language === 'ku'
                    ? 'کارە تەواوکراوەکان'
                    : language === 'en'
                    ? 'Completed Works'
                    : 'الأعمال المنجزة'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsSurveysViewOpen(false);
                  setCitizenTab('track');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  citizenTab === 'track' || citizenTab === 'home'
                    ? 'bg-[#46674D] text-white font-black shadow-2xs'
                    : 'text-[#2D4833] hover:bg-white/80'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {language === 'ku'
                    ? 'سکاڵاکانم'
                    : language === 'en'
                    ? 'My Reports'
                    : 'تتبع بلاغاتي'}
                </span>
              </button>
            </nav>
          )}

          {/* Right Controls: Add Report Button & Notifications Bell */}
          <div className="flex items-center gap-2 shrink-0">
            {/* زر تقديم بلاغ / إضافة لطيف وبدون إطارات */}
            {onOpenSubmitReport && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onOpenSubmitReport();
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-tr from-[#315338] via-[#46674D] to-[#5C8564] text-white text-xs font-black shadow-[0_4px_16px_rgba(45,72,51,0.28)] hover:brightness-105 hover:scale-105 active:scale-95 transition-all cursor-pointer border-0 outline-none"
                title={language === 'ku' ? 'زیادکردنی سکاڵا' : language === 'en' ? 'Add Report' : 'إضافة بلاغ جديد'}
              >
                <Plus className="w-4 h-4 stroke-[2.6]" />
                <span>{language === 'ku' ? 'زیادکردنی سکاڵا' : language === 'en' ? 'Add Report' : 'إضافة بلاغ'}</span>
              </button>
            )}

            <div className="static sm:relative" ref={notifMenuRef}>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsNotifMenuOpen(!isNotifMenuOpen);
                }}
                className={`relative p-2 rounded-full transition-all active:scale-90 cursor-pointer flex items-center justify-center border shadow-xs ${
                  isNotifMenuOpen
                    ? 'bg-[#46674D] text-white border-[#46674D]'
                    : notifBadgeCount > 0
                    ? 'bg-[#E8F4EA] text-[#2D4833] hover:bg-[#D4EADB] border-[#BBDDC6]/70'
                    : 'bg-[#E8F4EA]/70 text-[#2D4833] border-[#BBDDC6]/50'
                }`}
                title={
                  activeRole === 'admin'
                    ? language === 'ku'
                      ? 'سکاڵا نەنێردراوەکان'
                      : language === 'en'
                      ? 'Unsent Reports'
                      : 'البلاغات غير المرسلة للدائرة'
                    : language === 'ku'
                    ? 'ئاگادارکردنەوەی سکاڵاکانم'
                    : language === 'en'
                    ? 'My Reports Notifications'
                    : 'إشعارات بلاغاتي'
                }
                aria-label="Reports Notifications"
              >
                <Bell
                  className={`w-4 h-4 ${
                    isNotifMenuOpen ? 'text-white' : 'text-[#46674D]'
                  }`}
                />
                {notifBadgeCount > 0 && (
                  <span
                    dir="ltr"
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white font-mono tabular-nums shadow-2xs"
                  >
                    {toEnglishDigits(notifBadgeCount)}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isNotifMenuOpen && (
                  <>
                    {/* طبقة خلفية خفيفة تحت الشريط العلوي لإغلاق القائمة عند النقر خارجها في الجوال */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsNotifMenuOpen(false)}
                      className="fixed inset-x-0 top-full h-screen z-40 bg-[#1E3725]/20 backdrop-blur-[2px] sm:hidden"
                    />

                    {/* نافذة التنبيهات المنسدلة أسفل أيقونة الجرس والشريط العلوي بشكل متناسق */}
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.97 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      dir={isRTL ? 'rtl' : 'ltr'}
                      className={`absolute top-full mt-2.5 left-3 right-3 sm:w-[390px] ${
                        isRTL
                          ? 'sm:left-0 sm:right-auto'
                          : 'sm:right-0 sm:left-auto'
                      } z-50 rounded-3xl flex flex-col overflow-hidden shadow-[0_20px_50px_rgba(30,55,37,0.22)] border border-[#BBDDC6] bg-white text-[#1E3725]`}
                    >
                      {/* رأس نافذة التنبيهات */}
                      <div className="px-4 py-3.5 bg-gradient-to-l from-[#E8F4EA]/90 via-[#F4F9F5] to-white border-b border-[#BBDDC6]/70 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[#46674D] text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <Bell className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs sm:text-sm font-black text-[#1E3725] truncate">
                                {activeRole === 'admin'
                                  ? language === 'ku'
                                    ? 'سکاڵا نەنێردراوەکان'
                                    : language === 'en'
                                    ? 'Unsent Reports'
                                    : 'البلاغات غير المرسلة للدائرة'
                                  : language === 'ku'
                                  ? 'سکاڵا نەنێردراوەکانم'
                                  : language === 'en'
                                  ? 'My Unsent Reports'
                                  : 'بلاغاتي بانتظار الإرسال'}
                              </h4>
                              <span
                                dir="ltr"
                                className="px-2 py-0.5 rounded-full bg-[#46674D]/15 text-[#1E3725] text-[10px] font-mono font-black tabular-nums shrink-0"
                              >
                                {toEnglishDigits(notifBadgeCount)}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#46674D] font-bold truncate mt-0.5">
                              {activeRole === 'admin'
                                ? language === 'ku'
                                  ? 'تەنها ئەو سکاڵایانەی نەنێردراون بۆ فەرمانگە'
                                  : language === 'en'
                                  ? 'Reports not yet sent to the department'
                                  : 'البلاغات التي لم يتم إرسالها للدائرة المعنية'
                                : language === 'ku'
                                ? 'سکاڵاکانت کە چاوەڕوانی ناردنن'
                                : language === 'en'
                                ? 'Your reports waiting to be sent'
                                : 'بلاغاتك المستلمة بانتظار إرسالها للدائرة'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsNotifMenuOpen(false)}
                          className="w-8 h-8 rounded-xl bg-white/90 hover:bg-[#E8F4EA] text-[#2D4833] border border-[#BBDDC6]/70 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                          aria-label="Close notifications"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* قائمة البلاغات غير المرسلة */}
                      <div className="p-3 overflow-y-auto max-h-[62vh] sm:max-h-[380px] space-y-2 custom-scrollbar bg-[#F8FBF9]">
                        {notifList.length === 0 ? (
                          <div className="py-9 px-4 text-center rounded-2xl bg-white border border-[#E8F4EA]">
                            <div className="w-11 h-11 rounded-2xl bg-[#E8F4EA] text-[#46674D] flex items-center justify-center mx-auto mb-2.5">
                              <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <p className="text-xs sm:text-sm font-black text-[#1E3725]">
                              {activeRole === 'admin'
                                ? language === 'ku'
                                  ? 'هەموو سکاڵاکان نێردراون بۆ فەرمانگەکان'
                                  : language === 'en'
                                  ? 'All reports have been sent to departments'
                                  : 'تم إرسال جميع البلاغات للدوائر المعنية'
                                : language === 'ku'
                                ? 'هیچ سکاڵایەکی نەنێردراو نییە'
                                : language === 'en'
                                ? 'No unsent reports at the moment'
                                : 'لا توجد بلاغات غير مرسلة حالياً'}
                            </p>
                          </div>
                        ) : (
                          notifList.map((rep: CivicReport) => {
                            const sec = SECTOR_META[rep.sector] || SECTOR_META.other;
                            const secLabel =
                              language === 'ku'
                                ? sec.ku
                                : language === 'en'
                                ? sec.en
                                : sec.ar;

                            return (
                              <div
                                key={rep.id}
                                onClick={() => {
                                  playClickSound();
                                  setIsNotifMenuOpen(false);
                                  setSelectedReport(rep);
                                  if (onSelectReport) onSelectReport(rep);
                                }}
                                className="group p-3 rounded-2xl bg-white hover:bg-[#E8F4EA]/70 border border-[#BBDDC6]/80 hover:border-[#46674D] shadow-2xs transition-all cursor-pointer flex items-center justify-between gap-3"
                              >
                                {/* أيقونة القطاع */}
                                <div className="w-10 h-10 rounded-xl bg-[#F4F9F5] group-hover:bg-white border border-[#BBDDC6]/70 flex items-center justify-center text-base shrink-0">
                                  {sec.badgeEmoji}
                                </div>

                                {/* تفاصيل البلاغ بشكل متناسق */}
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-black text-[#1E3725] truncate">
                                      {rep.title}
                                    </span>
                                    <span
                                      dir="ltr"
                                      className="text-[10px] font-mono font-black text-[#46674D] bg-[#F4F9F5] px-1.5 py-0.5 rounded-md border border-[#BBDDC6]/60 tabular-nums shrink-0"
                                    >
                                      {toEnglishDigits(rep.trackingCode)}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-[#46674D]">
                                    <span className="inline-flex items-center gap-1 truncate">
                                      <MapPin className="w-3 h-3 shrink-0" />
                                      <span className="truncate">
                                        {secLabel} • {rep.neighborhood}
                                      </span>
                                    </span>

                                    <span
                                      dir="ltr"
                                      className="text-[10px] font-mono text-slate-500 inline-flex items-center gap-1 tabular-nums shrink-0"
                                    >
                                      <Clock className="w-2.5 h-2.5" />
                                      <span>{formatShortTime(rep.createdAt)}</span>
                                    </span>
                                  </div>
                                </div>

                                {/* زر العين لمعاينة تفاصيل البلاغ */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playClickSound();
                                    setIsNotifMenuOpen(false);
                                    setSelectedReport(rep);
                                    if (onSelectReport) onSelectReport(rep);
                                  }}
                                  title={
                                    language === 'ku'
                                      ? 'بینینی وردەکاری سکاڵا'
                                      : language === 'en'
                                      ? 'View Report Details'
                                      : 'معاينة تفاصيل البلاغ'
                                  }
                                  className="w-8 h-8 rounded-xl bg-[#F4F9F5] group-hover:bg-[#46674D] text-[#46674D] group-hover:text-white border border-[#BBDDC6] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
