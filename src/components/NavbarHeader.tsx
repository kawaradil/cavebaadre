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
import { useAuth } from '../context/AuthContext';
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
    isStartScreenActive,
    reports,
    myReports,
    setSelectedReport,
  } = useBaadre();
  const { currentUser, isSuperAdmin, isAdmin, isLoggedIn, openAuthModal } = useAuth();

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
      className="fixed top-0 inset-x-0 z-50 w-full bg-gradient-to-r from-[#467586]/55 via-[#58899A]/35 to-[#6C9DAE]/55 backdrop-blur-md border-0 shadow-[0_4px_20px_rgba(30,142,147,0.12)] transition-colors text-[#0E3544] overflow-visible"
      style={{
        paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 0.35rem), 0.65rem)',
        paddingBottom: '0.45rem',
        paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 0.75rem)',
        paddingRight: 'calc(env(safe-area-inset-right, 0px) + 0.75rem)',
      }}
    >
      {/* Subtle luminous center glow matching the screenshot */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 38% 50%, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.12) 48%, transparent 80%)',
        }}
      />
      <div className="relative z-10 max-w-7xl mx-auto flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          {/* Left / Start: Sidebar Menu Icon (بدون إطار) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleOpenSidebar}
              className="p-2 rounded-xl bg-transparent text-[#0E3544] hover:bg-white/25 transition-all focus:outline-none cursor-pointer active:scale-90 border-0 shadow-none shrink-0"
              title={language === 'ku' ? 'لیستی سەرەکی' : language === 'en' ? 'Main Menu' : 'القائمة الجانبية'}
              aria-label="Main Menu"
            >
              <Menu className="w-6 h-6 stroke-[2.2]" />
            </button>
          </div>

          {/* Center Desktop Navigation Tabs (Admin & Citizen) */}
          {activeRole === 'admin' && Boolean(currentUser && (isAdmin || isSuperAdmin)) ? (
            <nav className="hidden lg:flex items-center gap-1 bg-white/50 backdrop-blur-xs p-1 rounded-2xl border-0">
              {adminSections.map((sec) => {
                const IconComp = sec.icon;
                const isActive = !isStartScreenActive && adminTab === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      setIsSurveysViewOpen(false);
                      setAdminTab(sec.id);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 border-0 ${
                      isActive
                        ? 'bg-[#467586] text-white font-black shadow-2xs'
                        : 'text-[#0E3544] hover:bg-white/75'
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5 shrink-0" />
                    <span>{language === 'ku' ? sec.ku : language === 'en' ? sec.en : sec.ar}</span>
                  </button>
                );
              })}
            </nav>
          ) : (
            <nav className="hidden lg:flex items-center gap-1 bg-white/50 backdrop-blur-xs p-1 rounded-2xl border-0">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsSurveysViewOpen(false);
                  setCitizenTab('works');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 border-0 ${
                  !isStartScreenActive && (citizenTab === 'works' || citizenTab === 'projects')
                    ? 'bg-[#467586] text-white font-black shadow-2xs'
                    : 'text-[#0E3544] hover:bg-white/75'
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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 border-0 ${
                  !isStartScreenActive && (citizenTab === 'track' || citizenTab === 'home')
                    ? 'bg-[#467586] text-white font-black shadow-2xs'
                    : 'text-[#0E3544] hover:bg-white/75'
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

            {/* زر تقديم بلاغ / إضافة (يظهر للجميع، وعند نقره من قبل زائر يفتح شاشة تسجيل الدخول) */}
            {onOpenSubmitReport && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  if (!isLoggedIn) {
                    openAuthModal('login');
                    return;
                  }
                  onOpenSubmitReport();
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#467586] via-[#58899A] to-[#6C9DAE] text-white text-xs font-black shadow-[0_4px_16px_rgba(70,117,134,0.26)] hover:brightness-105 hover:scale-105 active:scale-95 transition-all cursor-pointer border-0 outline-none"
                title={language === 'ku' ? 'زیادکردنی سکاڵا' : language === 'en' ? 'Add Report' : 'إضافة بلاغ جديد'}
              >
                <Plus className="w-4 h-4 stroke-[2.6]" />
                <span>{language === 'ku' ? 'زیادکردنی سکاڵا' : language === 'en' ? 'Add Report' : 'إضافة بلاغ'}</span>
              </button>
            )}

            {/* أيقونة الجرس للتنبيهات - بدون إطار */}
            <div className="static sm:relative" ref={notifMenuRef}>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  if (!isLoggedIn) {
                    openAuthModal('login');
                    return;
                  }
                  setIsNotifMenuOpen(!isNotifMenuOpen);
                }}
                className={`relative p-2 rounded-xl transition-all active:scale-90 cursor-pointer flex items-center justify-center border-0 shadow-none ${
                  isNotifMenuOpen
                    ? 'bg-white/30 text-[#0E3544]'
                    : 'bg-transparent text-[#0E3544] hover:bg-white/25'
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
                <Bell className="w-5 h-5 stroke-[2.2] text-[#0E3544]" />
                {notifBadgeCount > 0 && (
                  <span
                    dir="ltr"
                    className="absolute top-0.5 right-0.5 min-w-[17px] h-[17px] px-1 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-0 font-mono tabular-nums shadow-xs"
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
                      className="fixed inset-x-0 top-full h-screen z-40 bg-[#1B3A46]/20 backdrop-blur-[2px] sm:hidden"
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
                      } z-50 rounded-3xl flex flex-col overflow-hidden shadow-[0_20px_50px_rgba(58,104,120,0.22)] border border-[#CFE2E8] bg-white text-[#1B3A46]`}
                    >
                      {/* رأس نافذة التنبيهات */}
                      <div className="px-4 py-3 bg-gradient-to-l from-[#E7F2F5] via-[#F2F8FA] to-white border-b border-[#CFE2E8] flex items-center flex-nowrap justify-between gap-2.5">
                        <div className="flex items-center flex-nowrap gap-2.5 min-w-0 overflow-hidden">
                          <div className="w-8 h-8 rounded-xl bg-[#467586] text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <Bell className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 overflow-hidden">
                            <div className="flex items-center flex-nowrap gap-2 whitespace-nowrap">
                              <h4 className="text-xs sm:text-sm font-black text-[#1B3A46] truncate whitespace-nowrap">
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
                                className="px-2 py-0.5 rounded-full bg-[#467586]/15 text-[#1B3A46] text-[10px] font-mono font-black tabular-nums shrink-0 whitespace-nowrap"
                              >
                                {toEnglishDigits(notifBadgeCount)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsNotifMenuOpen(false)}
                          className="w-8 h-8 rounded-xl bg-white/90 hover:bg-[#E3EFF3] text-[#285060] border border-[#CFE2E8] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                          aria-label="Close notifications"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* قائمة البلاغات غير المرسلة */}
                      <div className="p-3 overflow-y-auto max-h-[62vh] sm:max-h-[380px] space-y-2 custom-scrollbar bg-[#F7FBFC]">
                        {notifList.length === 0 ? (
                          <div className="py-8 px-4 text-center rounded-2xl bg-white border border-[#DAE9EE]">
                            <div className="w-10 h-10 rounded-2xl bg-[#E3EFF3] text-[#467586] flex items-center justify-center mx-auto mb-2">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <p className="text-xs font-black text-[#1B3A46] whitespace-nowrap truncate">
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
                                className="group p-3 rounded-2xl bg-white hover:bg-[#F2F8FA] border border-[#CFE2E8] hover:border-[#58899A] shadow-2xs transition-all cursor-pointer flex items-center flex-nowrap justify-between gap-2.5 overflow-hidden"
                              >
                                {/* تفاصيل البلاغ بشكل متناسق وبدون التفاف (nowrap) */}
                                <div className="min-w-0 flex-1 space-y-1 overflow-hidden">
                                  <div className="flex items-center flex-nowrap justify-between gap-2 whitespace-nowrap">
                                    <span className="text-xs font-black text-[#1B3A46] truncate whitespace-nowrap">
                                      {rep.title}
                                    </span>
                                    <span
                                      dir="ltr"
                                      className="text-[10px] font-mono font-black text-[#1B3A46] bg-[#E3EFF3] px-1.5 py-0.5 rounded-md border border-[#CFE2E8] tabular-nums shrink-0 whitespace-nowrap"
                                    >
                                      {toEnglishDigits(rep.trackingCode)}
                                    </span>
                                  </div>

                                  <div className="flex items-center flex-nowrap justify-between gap-2 text-[11px] font-bold text-[#3B6878] whitespace-nowrap">
                                    <span className="inline-flex items-center flex-nowrap gap-1 truncate whitespace-nowrap">
                                      <MapPin className="w-3 h-3 shrink-0" />
                                      <span className="truncate whitespace-nowrap">
                                        {secLabel} • {rep.neighborhood}
                                      </span>
                                    </span>

                                    <span
                                      dir="ltr"
                                      className="text-[10px] font-mono text-slate-500 inline-flex items-center flex-nowrap gap-1 tabular-nums shrink-0 whitespace-nowrap"
                                    >
                                      <Clock className="w-2.5 h-2.5 shrink-0" />
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
                                  className="w-8 h-8 rounded-xl bg-[#F2F8FA] group-hover:bg-[#467586] text-[#467586] group-hover:text-white border border-[#CFE2E8] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
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
