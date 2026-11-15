import React, { useState } from 'react';
import {
  X,
  User as UserIcon,
  ShieldCheck,
  ArrowLeftRight,
  Phone,
  Mail,
  ChevronDown,
  ExternalLink,
  ClipboardList,
  Building2,
  LogOut,
  ShieldAlert,
  Pencil,
  Calendar,
  UserCheck,
  Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { useBaadre } from '../context/BaadreContext';
import { useAuth } from '../context/AuthContext';
import { useColorTheme } from '../context/ColorContext';
import { playClickSound, playSuccessSound } from '../lib/sound';
import { AboutOrganizationModal } from './sidebar/AboutOrganizationModal';
import { SidebarAccountModals } from './sidebar/SidebarAccountModals';
import { SidebarAppSettingsSection } from './sidebar/SidebarAppSettingsSection';
import { SidebarInfoAccordions, SidebarFooter } from './sidebar/SidebarInfoAccordions';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSubmitReport: () => void;
  onOpenAddProject?: () => void;
  installPrompt?: any;
  onInstallApp?: () => void;
  onOpenPrivacyPolicy?: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  installPrompt,
  onOpenPrivacyPolicy,
}) => {
  const { language, setLanguage, dir, isRTL } = useLanguage();
  const { palette, activePaletteName, setPalette, availablePalettes } = useColorTheme();
  const {
    activeRole,
    setActiveRole,
    setCitizenTab,
    setAdminTab,
    setIsSurveysViewOpen,
    contactSettings,
    updateContactSettings,
  } = useBaadre();

  const {
    currentUser,
    profile,
    role,
    isSuperAdmin,
    isAdmin,
    isCitizen,
    isLoggedIn,
    openAuthModal,
    updateAccount,
    deleteAccountWithoutData,
    logout,
  } = useAuth();

  const isVerifiedAdminAccount = Boolean(
    currentUser &&
      !isCitizen &&
      (isAdmin || isSuperAdmin) &&
      (role === 'admin' || role === 'super_admin')
  );
  const canAccessProtectedSidebarSections = Boolean(
    isVerifiedAdminAccount && activeRole === 'admin'
  );

  const [adminNotice, setAdminNotice] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isAccountDetailsOpen, setIsAccountDetailsOpen] = useState(false);
  const [isEditAccountOpen, setIsEditAccountOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(() => {
    try {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        (window.navigator as any).standalone === true;
      if (isStandalone) return true;
      return localStorage.getItem('cave_baadre_pwa_installed_v1') === 'true';
    } catch {
      return false;
    }
  });
  const [localPrompt, setLocalPrompt] = useState<any>(() =>
    typeof window !== 'undefined' ? (window as any).__deferredPwaPrompt || null : null
  );

  React.useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsAppInstalled(true);
      try {
        localStorage.setItem('cave_baadre_pwa_installed_v1', 'true');
      } catch {}
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as any).__deferredPwaPrompt = e;
      setLocalPrompt(e);
    };

    const handlePromptReady = () => {
      if ((window as any).__deferredPwaPrompt) {
        setLocalPrompt((window as any).__deferredPwaPrompt);
      }
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      (window as any).__deferredPwaPrompt = null;
      setLocalPrompt(null);
      try {
        localStorage.setItem('cave_baadre_pwa_installed_v1', 'true');
      } catch {}
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleSidebarInstallClick = async () => {
    playClickSound();
    const promptEvent = installPrompt || localPrompt || (window as any).__deferredPwaPrompt;
    if (promptEvent && typeof promptEvent.prompt === 'function') {
      try {
        await promptEvent.prompt();
        const choiceResult = await promptEvent.userChoice;
        if (choiceResult?.outcome === 'accepted') {
          playSuccessSound();
          setIsAppInstalled(true);
          (window as any).__deferredPwaPrompt = null;
          setLocalPrompt(null);
          try {
            localStorage.setItem('cave_baadre_pwa_installed_v1', 'true');
          } catch {}
        }
      } catch {}
    }
  };

  const toggleSection = (sectionKey: string) => {
    playClickSound();
    setExpandedSection((prev) => (prev === sectionKey ? null : sectionKey));
  };

  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

  const handleShareApp = async () => {
    playClickSound();
    const shareData = {
      title: tr(
        'ÇAVÊ BAADRÊ | عين باعذرة - منظمة RABA',
        'ÇAVÊ BAADRÊ | چاڤێ باعدرێ - ڕێکخراوی RABA',
        'ÇAVÊ BAADRÊ | Baadre Eye - RABA Organization'
      ),
      text: tr(
        'تطبيق ÇAVÊ BAADRÊ التابع لمنظمة RABA لاستقبال بلاغات المواطنين ومتابعة الخدمات في ناحية باعذرة',
        'ئەپی ÇAVÊ BAADRÊ سەربە ڕێکخراوی RABA بۆ وەرگرتنی سکاڵای هاووڵاتیان و بەدواداچوونی خزمەتگوزارییەکان لە باعەدرێ',
        'ÇAVÊ BAADRÊ app by RABA Organization for citizen reporting and municipal service tracking in Baadre'
      ),
      url: window.location.origin,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(window.location.origin);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } catch {}
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              onClick={onClose}
              className="fixed inset-0 bg-[#1B3A46]/30 z-50 backdrop-blur-xs"
            />

            <motion.div
              dir={dir}
              initial={{ x: language === 'en' ? '-100%' : '100%' }}
              animate={{ x: 0 }}
              exit={{
                x: language === 'en' ? '-100%' : '100%',
                transition: { duration: 0.15, ease: 'easeOut' },
              }}
              transition={{ type: 'spring', damping: 28, stiffness: 360, mass: 0.7 }}
              className={`fixed top-0 bottom-0 ${
                language === 'en' ? 'left-0 border-r' : 'right-0 border-l'
              } w-96 sm:w-[420px] max-w-[94vw] bg-gradient-to-b from-[#EEF7FA]/98 via-[#F6FAF9]/98 to-[#E9F4F6]/98 backdrop-blur-3xl z-50 flex flex-col shadow-[0_20px_80px_rgba(30,142,147,0.24)] overflow-hidden text-[#1B3A46] border-white/60`}
            >
              <div
                className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full opacity-45 blur-3xl"
                style={{
                  background: `radial-gradient(circle, ${palette.gradientToHex} 0%, transparent 70%)`,
                }}
              />
              <div
                className="pointer-events-none absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-40 blur-3xl"
                style={{
                  background: `radial-gradient(circle, ${palette.primaryHex} 0%, transparent 70%)`,
                }}
              />
              <div
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                  background: `radial-gradient(ellipse at 50% 30%, ${palette.primaryLightHex}66 0%, transparent 80%)`,
                }}
              />

              {/* Header — رأس السايدبار ديناميكي متناسق مع السمة اللونية وشفاف قليلاً ولطيف */}
              <div
                dir={isRTL ? 'rtl' : 'ltr'}
                className="px-5 py-4 relative flex items-center justify-center backdrop-blur-2xl border-b border-white/25 shadow-none select-none overflow-hidden shrink-0 transition-colors duration-300"
                style={{
                  background: `linear-gradient(135deg, ${palette.primaryHex}B3 0%, ${palette.gradientToHex}99 50%, ${palette.accentHex}B3 100%)`,
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-40"
                  style={{
                    background:
                      'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.50) 0%, rgba(255,255,255,0.12) 60%, transparent 80%)',
                  }}
                />

                <span
                  dir="ltr"
                  className="relative z-10 font-black text-base sm:text-lg tracking-widest text-center transition-colors duration-300 drop-shadow-[0_1px_2px_rgba(255,255,255,0.55)]"
                  style={{ color: palette.primaryTextHex }}
                >
                  ÇAVÊ BAADRÊ
                </span>

                <button
                  type="button"
                  onClick={onClose}
                  className={`absolute top-1/2 -translate-y-1/2 ${
                    isRTL ? 'left-4' : 'right-4'
                  } z-10 w-9 h-9 flex items-center justify-center rounded-xl bg-white/25 hover:bg-white/40 border-0 shadow-none transition-all active:scale-95 cursor-pointer`}
                  style={{ color: palette.primaryTextHex }}
                  aria-label="Close"
                >
                  <X className="w-5 h-5 stroke-[2.3]" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div
                dir={isRTL ? 'rtl' : 'ltr'}
                className={`relative z-10 px-3.5 sm:px-4 py-3.5 flex-1 overflow-y-auto space-y-3 custom-scrollbar ${
                  isRTL ? 'text-right' : 'text-left'
                }`}
              >
                {!isAppInstalled && (
                  <button
                    type="button"
                    dir={isRTL ? 'rtl' : 'ltr'}
                    onClick={handleSidebarInstallClick}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#467586] to-[#58899A] hover:from-[#3B6878] hover:to-[#467586] text-white shadow-[0_6px_18px_rgba(30,142,147,0.20)] flex items-center justify-between gap-3 transition-all active:scale-[0.99] cursor-pointer border-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <Download className="w-4 h-4 text-white stroke-[2.4]" />
                      </div>
                      <span className="text-xs sm:text-sm font-black tracking-wide">
                        {tr('تثبيت التطبيق', 'داگرتنی ئەپ', 'Install App')}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold bg-white/20 px-2.5 py-1 rounded-full text-white/95">
                      {tr('تحميل مباشر', 'داگرتن', 'Download')}
                    </span>
                  </button>
                )}

                {/* 0. بطاقة الحساب والمصادقة */}
                <div
                  dir={isRTL ? 'rtl' : 'ltr'}
                  className={`rounded-2xl bg-white/90 border-0 shadow-[0_4px_16px_rgba(30,142,147,0.08)] overflow-hidden transition-all ${
                    isRTL ? 'text-right' : 'text-left'
                  }`}
                >
                  {isLoggedIn ? (
                    <div dir={isRTL ? 'rtl' : 'ltr'}>
                      <button
                        type="button"
                        dir={isRTL ? 'rtl' : 'ltr'}
                        onClick={() => {
                          playClickSound();
                          setIsAccountDetailsOpen((prev) => !prev);
                        }}
                        className={`w-full p-3.5 flex items-center justify-between gap-2.5 ${
                          isRTL ? 'text-right' : 'text-left'
                        } hover:bg-[#E6F1F5]/70 transition-colors cursor-pointer border-0`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0 ${
                              isSuperAdmin
                                ? 'bg-[#386373]'
                                : isAdmin
                                ? 'bg-[#467586]'
                                : 'bg-[#548596]'
                            }`}
                          >
                            <UserCheck className="w-5 h-5 stroke-[2.2]" />
                          </div>

                          <div className={`min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                            <p className="text-xs font-black text-[#1B3A46] truncate">
                              <bdi>
                                {profile?.fullName ||
                                  currentUser?.displayName ||
                                  tr('مستخدم مسجل', 'بەکارهێنەر', 'User')}
                              </bdi>
                            </p>
                            <span className="block text-[10px] font-black text-emerald-700 mt-0.5 leading-tight">
                              {tr('تم تسجيل الدخول', 'تۆمارکراوە', 'Signed In')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <ChevronDown
                            className={`w-4 h-4 text-[#467586] transition-transform duration-250 ${
                              isAccountDetailsOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isAccountDetailsOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.24, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div
                              dir={isRTL ? 'rtl' : 'ltr'}
                              className={`px-3.5 pb-3.5 pt-1 space-y-2.5 ${
                                isRTL ? 'text-right' : 'text-left'
                              }`}
                            >
                              <div
                                dir={isRTL ? 'rtl' : 'ltr'}
                                className={`p-3 rounded-2xl bg-[#F4F9FB] border-0 space-y-2 text-xs font-bold ${
                                  isRTL ? 'text-right' : 'text-left'
                                }`}
                              >
                                <div className="flex items-center justify-start gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-[#E3EFF3] flex items-center justify-center shrink-0">
                                    <UserIcon className="w-3.5 h-3.5 text-[#467586]" />
                                  </div>
                                  <span className="text-[#467586] shrink-0">
                                    {tr('الاسم:', 'ناو:', 'Name:')}
                                  </span>
                                  <span className="font-black text-[#1B3A46] truncate">
                                    <bdi>{profile?.fullName || currentUser?.displayName || '—'}</bdi>
                                  </span>
                                </div>

                                <div className="flex items-center justify-start gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-[#E3EFF3] flex items-center justify-center shrink-0">
                                    <Mail className="w-3.5 h-3.5 text-[#467586]" />
                                  </div>
                                  <span className="text-[#467586] shrink-0">
                                    {tr('البريد:', 'ئیمەیڵ:', 'Email:')}
                                  </span>
                                  <bdi
                                    dir="ltr"
                                    className="font-mono font-bold text-[#1B3A46] truncate text-[11px]"
                                  >
                                    {currentUser?.email || profile?.email || '—'}
                                  </bdi>
                                </div>

                                <div className="flex items-center justify-start gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-[#E3EFF3] flex items-center justify-center shrink-0">
                                    <Phone className="w-3.5 h-3.5 text-[#467586]" />
                                  </div>
                                  <span className="text-[#467586] shrink-0">
                                    {tr('الهاتف:', 'مۆبایل:', 'Phone:')}
                                  </span>
                                  <bdi
                                    dir="ltr"
                                    className="font-mono font-black text-[#1B3A46] text-xs tabular-nums"
                                  >
                                    {profile?.phone || '—'}
                                  </bdi>
                                </div>

                                {profile?.birthDate && (
                                  <div className="flex items-center justify-start gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-[#E3EFF3] flex items-center justify-center shrink-0">
                                      <Calendar className="w-3.5 h-3.5 text-[#467586]" />
                                    </div>
                                    <span className="text-[#467586] shrink-0">
                                      {tr('الميلاد:', 'لەدایکبوون:', 'Birth Date:')}
                                    </span>
                                    <bdi
                                      dir="ltr"
                                      className="font-mono font-black text-[#1B3A46] text-xs tabular-nums"
                                    >
                                      {profile.birthDate}
                                    </bdi>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    playClickSound();
                                    setIsEditAccountOpen(true);
                                  }}
                                  className="p-2.5 rounded-xl bg-[#DFEEF3] hover:bg-[#CDE3EB] text-[#3B6878] flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0 border-0"
                                  title={tr('تعديل الحساب', 'دەستکاری هەژمار', 'Edit Account')}
                                  aria-label={tr('تعديل الحساب', 'دەستکاری هەژمار', 'Edit Account')}
                                >
                                  <Pencil className="w-4 h-4 text-[#3B6878] stroke-[2.2]" />
                                </button>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    playClickSound();
                                    setIsAccountDetailsOpen(false);
                                    await logout();
                                    setActiveRole('citizen');
                                  }}
                                  className="flex-1 py-2.5 rounded-xl bg-[#F4F9FB] hover:bg-rose-50/70 text-[11px] font-black text-rose-600 hover:text-rose-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors border-0"
                                >
                                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                                  <span>{tr('تسجيل الخروج', 'چوونەدەرەوە', 'Sign Out')}</span>
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        openAuthModal('login');
                        onClose();
                      }}
                      className="w-full py-3.5 px-4 flex items-center justify-center text-center cursor-pointer hover:bg-rose-50/70 active:scale-[0.99] transition-all border-0 outline-none"
                    >
                      <span className="text-sm sm:text-base font-black text-rose-600 tracking-wide select-none">
                        {tr('تسجيل الدخول', 'چوونەژوورەوە', 'Sign In')}
                      </span>
                    </button>
                  )}
                </div>

                {adminNotice && (
                  <div className="p-3 rounded-2xl bg-amber-50 border-0 text-amber-900 text-xs font-bold leading-relaxed flex items-start gap-2 shadow-2xs">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                    <span>{adminNotice}</span>
                  </div>
                )}

                {/* 1. التبديل بين الواجهات */}
                {isVerifiedAdminAccount && (
                  <div
                    dir={isRTL ? 'rtl' : 'ltr'}
                    className={`p-3.5 rounded-2xl bg-white/90 border-0 shadow-[0_4px_16px_rgba(30,142,147,0.08)] space-y-3 ${
                      isRTL ? 'text-right' : 'text-left'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-[#467586] text-white flex items-center justify-center shadow-xs shrink-0">
                          {activeRole === 'admin' ? (
                            <ShieldCheck className="w-4 h-4" />
                          ) : (
                            <UserIcon className="w-4 h-4" />
                          )}
                        </div>
                        <p className="text-xs font-black text-[#1B3A46] truncate">
                          {activeRole === 'admin'
                            ? tr(
                                'إدارة المنظمة والإحالة للدوائر',
                                'بەڕێوەبردنی ڕێکخراو و ناردن بۆ فەرمانگەکان',
                                'Organization Admin & Referrals'
                              )
                            : tr(
                                'واجهة المواطن (بلاغاتي)',
                                'ڕووکاری هاووڵاتی (سکاڵاکانم)',
                                'Citizen View (My Reports)'
                              )}
                        </p>
                      </div>
                      <ArrowLeftRight className="w-4 h-4 text-[#467586] shrink-0" />
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 bg-[#E3EFF3]/80 p-1 rounded-xl border-0">
                      <button
                        onClick={() => {
                          playClickSound();
                          setActiveRole('citizen');
                          setCitizenTab('works');
                          setIsSurveysViewOpen(false);
                          setAdminNotice(null);
                          onClose();
                        }}
                        className={`py-2 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer border-0 ${
                          activeRole === 'citizen'
                            ? 'bg-[#467586] text-white shadow-xs'
                            : 'text-[#285060] hover:bg-white/60'
                        }`}
                      >
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>{tr('واجهة المواطن', 'هاووڵاتی', 'Citizen')}</span>
                      </button>

                      <button
                        onClick={() => {
                          playClickSound();
                          if (!isVerifiedAdminAccount) return;
                          setAdminNotice(null);
                          setActiveRole('admin');
                          setAdminTab('analytics');
                          onClose();
                        }}
                        className={`py-2 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer border-0 ${
                          activeRole === 'admin'
                            ? 'bg-[#467586] text-white shadow-xs'
                            : 'text-[#285060] hover:bg-white/60'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{tr('إدارة المنظمة', 'بەڕێوەبەرایەتی', 'Admin')}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* الأقسام التفاعلية */}
                <div className="space-y-2.5 pt-0.5">
                  {canAccessProtectedSidebarSections && (
                    <div className="rounded-2xl bg-white/90 border-0 shadow-[0_4px_16px_rgba(30,142,147,0.08)] overflow-hidden transition-all">
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          if (!canAccessProtectedSidebarSections) return;
                          setIsSurveysViewOpen(true);
                          onClose();
                        }}
                        className={`w-full p-3.5 flex items-center justify-between ${
                          isRTL ? 'text-right' : 'text-left'
                        } cursor-pointer hover:bg-[#E6F1F5]/80 transition-colors border-0`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#467586] text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <ClipboardList className="w-4 h-4" />
                          </div>
                          <p className="text-xs sm:text-sm font-black text-[#1B3A46]">
                            {tr('قسم الاستبيانات', 'بەشی ڕاپرسییەکان', 'Surveys & Polls')}
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-[#467586] shrink-0" />
                      </button>
                    </div>
                  )}

                  {canAccessProtectedSidebarSections && (
                    <div className="rounded-2xl bg-white/90 border-0 shadow-[0_4px_16px_rgba(30,142,147,0.08)] overflow-hidden transition-all">
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          if (!canAccessProtectedSidebarSections) return;
                          setActiveRole('admin');
                          setAdminTab('directory');
                          setIsSurveysViewOpen(false);
                          onClose();
                        }}
                        className={`w-full p-3.5 flex items-center justify-between ${
                          isRTL ? 'text-right' : 'text-left'
                        } cursor-pointer hover:bg-[#E6F1F5]/80 transition-colors border-0`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#467586] text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <p className="text-xs sm:text-sm font-black text-[#1B3A46]">
                            {tr(
                              'دليل الدوائر والمواطنين',
                              'فەرمانگە و هاووڵاتیان',
                              'Departments & Citizens Directory'
                            )}
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-[#467586] shrink-0" />
                      </button>
                    </div>
                  )}

                  <SidebarAppSettingsSection
                    isRTL={isRTL}
                    language={language}
                    setLanguage={setLanguage}
                    activePaletteName={activePaletteName}
                    setPalette={setPalette}
                    availablePalettes={availablePalettes}
                    expandedSection={expandedSection}
                    toggleSection={toggleSection}
                    canAccessProtectedSidebarSections={canAccessProtectedSidebarSections}
                    contactSettings={contactSettings}
                    updateContactSettings={updateContactSettings}
                    tr={tr}
                  />

                  <SidebarInfoAccordions
                    isRTL={isRTL}
                    language={language}
                    palette={palette}
                    expandedSection={expandedSection}
                    toggleSection={toggleSection}
                    contactSettings={contactSettings}
                    copiedLink={copiedLink}
                    onShareApp={handleShareApp}
                    onOpenAboutModal={() => setIsAboutModalOpen(true)}
                    onOpenPrivacyPolicy={onOpenPrivacyPolicy}
                    onCloseSidebar={onClose}
                    tr={tr}
                  />
                </div>
              </div>

              <SidebarFooter
                isRTL={isRTL}
                language={language}
                palette={palette}
                tr={tr}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AboutOrganizationModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
        dir={dir}
        isRTL={isRTL}
        tr={tr}
      />

      <SidebarAccountModals
        dir={dir}
        isRTL={isRTL}
        tr={tr}
        currentUser={currentUser}
        profile={profile}
        isEditAccountOpen={isEditAccountOpen}
        onCloseEditAccount={() => setIsEditAccountOpen(false)}
        isDeleteAccountOpen={isDeleteAccountOpen}
        onOpenDeleteAccount={() => {
          playClickSound();
          setIsDeleteAccountOpen(true);
        }}
        onCloseDeleteAccount={() => setIsDeleteAccountOpen(false)}
        updateAccount={updateAccount}
        deleteAccountWithoutData={deleteAccountWithoutData}
        onAccountDeleted={() => {
          setActiveRole('citizen');
          setIsDeleteAccountOpen(false);
          onClose();
        }}
      />
    </>
  );
};
