import React, { useState } from 'react';
import {
  X,
  PlusCircle,
  User as UserIcon,
  ShieldCheck,
  Share2,
  Check,
  MessageCircle,
  ArrowLeftRight,
  Info,
  FileText,
  Phone,
  Mail,
  ChevronDown,
  MapPin,
  Sparkles,
  ExternalLink,
  ClipboardList,
  Building,
  Building2,
  LogIn,
  LogOut,
  KeyRound,
  ShieldAlert,
  Pencil,
  Trash2,
  Calendar,
  Lock,
  AlertTriangle,
  Settings,
  UserCheck,
  Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { useBaadre } from '../context/BaadreContext';
import { useAuth } from '../context/AuthContext';
import { useColorTheme } from '../context/ColorContext';
import { MUNICIPAL_WHATSAPP_NUMBER } from '../types/baadre';
import { playClickSound, playSuccessSound } from '../lib/sound';

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
  onOpenSubmitReport,
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

  // حالة تثبيت التطبيق (إذا تم تثبيته أو تحميله لا يظهر مرة أخرى)
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

  // Edit Account & Delete Account Modal States
  const [isEditAccountOpen, setIsEditAccountOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [editConfirmStep, setEditConfirmStep] = useState<0 | 1 | 2>(0);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<1 | 2>(1);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const openEditAccountModal = () => {
    playClickSound();
    setEditFullName(profile?.fullName || currentUser?.displayName || '');
    setEditPhone(profile?.phone || '');
    setEditBirthDate(profile?.birthDate || '1995-01-01');
    setEditNewPassword('');
    setEditConfirmStep(0);
    setEditError(null);
    setEditSuccess(null);
    setIsEditAccountOpen(true);
  };

  const openDeleteAccountModal = () => {
    playClickSound();
    setDeleteConfirmStep(1);
    setDeleteError(null);
    setIsDeleteAccountOpen(true);
  };

  // Contact Settings (Admin & Super Admin only) - الرقم ثابت 9647749019911
  const [waReportsNumberInput, setWaReportsNumberInput] = useState('9647749019911');
  const [contactPhoneInput, setContactPhoneInput] = useState('9647749019911');
  const [contactEmailInput, setContactEmailInput] = useState(contactSettings.contactEmail);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    setWaReportsNumberInput(contactSettings.whatsappReportsNumber || '9647749019911');
    setContactPhoneInput(contactSettings.contactPhone || '9647749019911');
    setContactEmailInput(contactSettings.contactEmail || 'info@cavebaadre.org');
  }, [contactSettings.whatsappReportsNumber, contactSettings.contactPhone, contactSettings.contactEmail]);

  // Expanded Accordion Sections State - مغلق افتراضياً لجميع الأقسام
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

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
      } catch {
        // user cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.origin);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } catch {
        // fallback
      }
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              onClick={onClose}
              className="fixed inset-0 bg-[#1B3A46]/30 z-50 backdrop-blur-xs"
            />

            {/* Drawer Container — خلفية ناعمة ولطيفة تمتد حتى أطراف السايدبار مع إضاءات خلفية هادئة */}
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
              {/* إضاءات خفيفة ولطيفة تمتد حتى أطراف السايدبار بألوان تركوازية ناعمة */}
              <div
                className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full opacity-45 blur-3xl"
                style={{ background: `radial-gradient(circle, ${palette.gradientToHex} 0%, transparent 70%)` }}
              />
              <div
                className="pointer-events-none absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-40 blur-3xl"
                style={{ background: `radial-gradient(circle, ${palette.primaryHex} 0%, transparent 70%)` }}
              />
              <div
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                  background: `radial-gradient(ellipse at 50% 30%, ${palette.primaryLightHex}66 0%, transparent 80%)`,
                }}
              />

              {/* Header — يمتد كاملاً إلى أطراف السايدبار العلوية */}
              <div
                dir={isRTL ? 'rtl' : 'ltr'}
                className="px-5 py-4 relative flex items-center justify-center bg-gradient-to-r from-[#467586]/60 via-[#58899A]/40 to-[#6C9DAE]/60 backdrop-blur-xl border-b border-white/40 shadow-2xs select-none overflow-hidden shrink-0"
              >
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.60) 0%, rgba(255,255,255,0.18) 50%, transparent 80%)',
                  }}
                />
                <span
                  dir="ltr"
                  className="relative z-10 font-black text-lg sm:text-xl text-[#0E3544] tracking-widest text-center"
                >
                  ÇAVÊ BAADRÊ
                </span>

                <button
                  type="button"
                  onClick={onClose}
                  className={`absolute top-1/2 -translate-y-1/2 ${
                    isRTL ? 'left-4' : 'right-4'
                  } z-10 w-9 h-9 flex items-center justify-center bg-transparent text-[#0E3544] hover:bg-white/30 rounded-xl border-0 shadow-none transition-all active:scale-95 cursor-pointer`}
                  aria-label="Close"
                >
                  <X className="w-5 h-5 stroke-[2.2]" />
                </button>
              </div>

              {/* Scrollable Body — يمتد بأناقة حتى أطراف السايدبار مع بطاقات ناعمة */}
              <div
                dir={isRTL ? 'rtl' : 'ltr'}
                className={`relative z-10 px-3.5 sm:px-4 py-3.5 flex-1 overflow-y-auto space-y-3 custom-scrollbar ${
                  isRTL ? 'text-right' : 'text-left'
                }`}
              >
                {/* قسم تثبيت التطبيق فوق تسجيل الدخول بشكل لطيف مع أيقونة تحميل (يختفي نهائياً بعد تحميله) */}
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

                {/* 0. بطاقة الحساب والمصادقة (User Account & Auth - بدون إطارات) */}
                <div
                  dir={isRTL ? 'rtl' : 'ltr'}
                  className={`rounded-2xl bg-white/90 border-0 shadow-[0_4px_16px_rgba(30,142,147,0.08)] overflow-hidden transition-all ${
                    isRTL ? 'text-right' : 'text-left'
                  }`}
                >
                  {isLoggedIn ? (
                    <div dir={isRTL ? 'rtl' : 'ltr'}>
                      {/* رأس كارت الحساب - عند النقر يفتح تفاصيل الحساب */}
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

                      {/* تفاصيل الحساب المنسدلة وبداخلها أزرار التعديل والحذف بتنسيق RTL صحيح ومتناسق وبدون إطارات */}
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
                              {/* بيانات وتفاصيل الحساب بدون إطارات */}
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

                              {/* زر تعديل الحساب موضوع أمام زر تسجيل الخروج في صف واحد */}
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={openEditAccountModal}
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

                {/* 1. التبديل بين الواجهات (يظهر حصرياً للأدمن والسوبر أدمن فقط - بدون إطارات) */}
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

                    {/* Segmented Buttons */}
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

                {/* الأقسام التفاعلية بدون إطارات مع ظل ناعم ولطيف */}
                <div className="space-y-2.5 pt-0.5">
                  {/* قسم الاستبيانات (محمي ومخفي عن المواطن وواجهة المواطن - بدون إطارات) */}
                  {canAccessProtectedSidebarSections && (
                    <div className="rounded-2xl bg-white/90 border-0 shadow-[0_4px_16px_rgba(30,142,147,0.08)] overflow-hidden transition-all">
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          if (!canAccessProtectedSidebarSections) {
                            return;
                          }
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

                  {/* قسم الدوائر والمواطنين (محمي ومخفي عن المواطن وواجهة المواطن - بدون إطارات) */}
                  {canAccessProtectedSidebarSections && (
                    <div className="rounded-2xl bg-white/90 border-0 shadow-[0_4px_16px_rgba(30,142,147,0.08)] overflow-hidden transition-all">
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          if (!canAccessProtectedSidebarSections) {
                            return;
                          }
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
                            {tr('دليل الدوائر والمواطنين', 'فەرمانگە و هاووڵاتیان', 'Departments & Citizens Directory')}
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-[#467586] shrink-0" />
                      </button>
                    </div>
                  )}

                  {/* قسم إعدادات التطبيق (تحت فەرمانگە و هاووڵاتیان - يضم: اللغات + السمات + الاتصال - بدون إطارات) */}
                  <div className="rounded-2xl bg-white/90 border-0 shadow-[0_4px_16px_rgba(30,142,147,0.08)] overflow-hidden transition-all">
                    <button
                      type="button"
                      onClick={() => toggleSection('app_settings')}
                      className={`w-full p-3.5 flex items-center justify-between ${
                        isRTL ? 'text-right' : 'text-left'
                      } cursor-pointer hover:bg-[#E6F1F5]/80 transition-colors border-0`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#467586] text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <Settings className="w-4 h-4" />
                        </div>
                        <p className="text-xs sm:text-sm font-black text-[#1B3A46]">
                          {tr('إعدادات التطبيق', 'ڕێکخستنەکانی ئەپ', 'App Settings')}
                        </p>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-[#467586] transition-transform duration-250 ${
                          expandedSection === 'app_settings' ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {expandedSection === 'app_settings' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="p-3.5 pt-1 space-y-3.5">
                            {/* 1) اللغات */}
                            <div className="space-y-1.5">
                              <p className={`text-[11px] font-black text-[#3B6878] px-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                {tr('اللغات', 'زمانەکان', 'Languages')}
                              </p>
                              <div className="grid grid-cols-3 gap-1.5 bg-[#F2F8FA] border-0 p-1 rounded-2xl">
                                {(['ar', 'ku', 'en'] as const).map((lang) => (
                                  <button
                                    key={lang}
                                    type="button"
                                    onClick={() => setLanguage(lang)}
                                    className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer border-0 ${
                                      language === lang
                                        ? 'bg-[#467586] text-white shadow-xs'
                                        : 'text-[#285060] hover:bg-white/80'
                                    }`}
                                  >
                                    {lang === 'ar' ? 'العربية' : lang === 'ku' ? 'کوردی' : 'English'}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* 2) السمات */}
                            <div className="space-y-1.5">
                              <p className={`text-[11px] font-black text-[#3B6878] px-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                {tr('السمات', 'ڕەنگەکان', 'Themes')}
                              </p>
                              <div className="grid grid-cols-2 gap-1.5 bg-[#F2F8FA] border-0 p-1.5 rounded-2xl">
                                {availablePalettes.map((themeItem, idx) => {
                                  const isSelected = activePaletteName === themeItem.name;
                                  const label =
                                    language === 'ku'
                                      ? themeItem.labelKu
                                      : language === 'en'
                                      ? themeItem.labelEn
                                      : themeItem.labelAr;
                                  const isFeatured = idx === 0 && availablePalettes.length % 2 === 1;
                                  return (
                                    <button
                                      key={themeItem.name}
                                      type="button"
                                      onClick={() => {
                                        playClickSound();
                                        setPalette(themeItem.name);
                                      }}
                                      className={`${
                                        isFeatured ? 'col-span-2' : ''
                                      } py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-between gap-2 transition-all cursor-pointer border-0 ${
                                        isSelected
                                          ? 'bg-[#467586] text-white shadow-xs'
                                          : 'text-[#285060] hover:bg-white/80'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span
                                          className="w-4 h-4 rounded-full shrink-0 shadow-2xs"
                                          style={{
                                            background: `linear-gradient(135deg, ${themeItem.gradientToHex} 0%, ${themeItem.primaryHex} 55%, ${themeItem.accentHex} 100%)`,
                                          }}
                                        />
                                        <span className="truncate">{label}</span>
                                      </div>
                                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* 3) الاتصال (إعدادات الاتصال باسم "الاتصال" - محمي ومخفي عن المواطن وواجهة المواطن - بدون إطارات) */}
                            {canAccessProtectedSidebarSections && (
                              <div className="pt-1 space-y-2">
                                <p className={`text-[11px] font-black text-[#3B6878] px-1 flex items-center gap-1.5 ${isRTL ? 'text-right' : 'text-left'}`}>
                                  <Phone className="w-3.5 h-3.5 text-[#467586]" />
                                  <span>{tr('الاتصال', 'پەیوەندی', 'Contact')}</span>
                                </p>

                                <div className="p-3 rounded-2xl bg-[#F2F8FA] border-0 space-y-2.5">
                                  {contactError && (
                                    <div className="p-2 rounded-xl bg-rose-50 border-0 text-rose-700 text-[11px] font-bold">
                                      {contactError}
                                    </div>
                                  )}
                                  {contactSuccess && (
                                    <div className="p-2 rounded-xl bg-emerald-50 border-0 text-emerald-800 text-[11px] font-bold">
                                      {contactSuccess}
                                    </div>
                                  )}

                                  <div>
                                    <label className="block text-[10px] font-black text-[#3B6878] mb-1">
                                      {tr(
                                        'رقم واتساب استلام بلاغات المواطنين',
                                        'ژمارەی واتسئەپی وەرگرتنی سکاڵا',
                                        'Citizens Reports WhatsApp Number'
                                      )}
                                    </label>
                                    <input
                                      type="tel"
                                      dir="ltr"
                                      value={waReportsNumberInput}
                                      onChange={(e) => setWaReportsNumberInput(e.target.value)}
                                      placeholder="9647749019911"
                                      className="w-full px-3 py-2 rounded-xl bg-white border-0 shadow-2xs text-xs font-mono font-bold text-[#1B3A46] focus:outline-none"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-black text-[#3B6878] mb-1">
                                      {tr(
                                        'رقم الهاتف الظاهر في القائمة الجانبية',
                                        'ژمارەی مۆبایلی ناو لیستەکە',
                                        'Sidebar Display Phone Number'
                                      )}
                                    </label>
                                    <input
                                      type="tel"
                                      dir="ltr"
                                      value={contactPhoneInput}
                                      onChange={(e) => setContactPhoneInput(e.target.value)}
                                      placeholder="9647749019911"
                                      className="w-full px-3 py-2 rounded-xl bg-white border-0 shadow-2xs text-xs font-mono font-bold text-[#1B3A46] focus:outline-none"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-black text-[#3B6878] mb-1">
                                      {tr(
                                        'البريد الإلكتروني الظاهر في القائمة الجانبية',
                                        'ئیمەیڵی ناو لیستەکە',
                                        'Sidebar Display Email'
                                      )}
                                    </label>
                                    <input
                                      type="email"
                                      dir="ltr"
                                      value={contactEmailInput}
                                      onChange={(e) => setContactEmailInput(e.target.value)}
                                      placeholder="info@cavebaadre.org"
                                      className="w-full px-3 py-2 rounded-xl bg-white border-0 shadow-2xs text-xs font-mono font-bold text-[#1B3A46] focus:outline-none"
                                    />
                                  </div>

                                  <button
                                    type="button"
                                    disabled={contactSaving}
                                    onClick={async () => {
                                      playClickSound();
                                      if (!canAccessProtectedSidebarSections) {
                                        return;
                                      }
                                      setContactError(null);
                                      setContactSuccess(null);
                                      setContactSaving(true);
                                      try {
                                        await updateContactSettings({
                                          whatsappReportsNumber: waReportsNumberInput.trim() || '9647749019911',
                                          contactPhone: contactPhoneInput.trim() || '9647749019911',
                                          contactEmail: contactEmailInput.trim() || 'info@cavebaadre.org',
                                        });
                                        playSuccessSound();
                                        setContactSuccess(
                                          tr(
                                            'تم حفظ وتحديث إعدادات الاتصال في الكلاود بنجاح.',
                                            'ڕێکخستنەکان لە کڵاود نوێکرانەوە بە سەرکەوتوویی.',
                                            'Contact settings updated and saved to cloud.'
                                          )
                                        );
                                        setTimeout(() => setContactSuccess(null), 3000);
                                      } catch (err: any) {
                                        setContactError(
                                          err?.message ||
                                            tr('فشل الحفظ.', 'پاشەکەوتکردن سەرکەوتوو نەبوو.', 'Save failed.')
                                        );
                                      } finally {
                                        setContactSaving(false);
                                      }
                                    }}
                                    className="w-full py-2 px-3 rounded-xl bg-[#467586] hover:bg-[#386373] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50 border-0"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>
                                      {contactSaving
                                        ? tr('جاري الحفظ...', 'پاشەکەوت دەکرێت...', 'Saving...')
                                        : tr(
                                            'حفظ إعدادات الاتصال',
                                            'پاشەکەوتکردن',
                                            'Save Contact Settings'
                                          )}
                                    </span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* أ) قسم من نحن (About Us - بدون إطارات) */}
                  <div className="rounded-2xl bg-white/90 border-0 shadow-[0_4px_16px_rgba(30,142,147,0.08)] overflow-hidden transition-all">
                    <button
                      type="button"
                      onClick={() => toggleSection('about')}
                      className={`w-full p-3.5 flex items-center justify-between ${
                        isRTL ? 'text-right' : 'text-left'
                      } cursor-pointer hover:bg-[#E6F1F5]/70 transition-colors border-0`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#E3EFF3] text-[#3B6878] flex items-center justify-center shrink-0">
                          <Info className="w-4 h-4" />
                        </div>
                        <p className="text-xs sm:text-sm font-black text-[#1B3A46]">
                          {tr('من نحن', 'ئێمە کێین', 'About Us')}
                        </p>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-[#467586] transition-transform duration-250 ${
                          expandedSection === 'about' ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {expandedSection === 'about' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="p-3.5 pt-0 space-y-2 text-xs text-[#285060] leading-relaxed">
                            <p className="font-bold text-[#1B3A46] bg-[#F2F8FA] p-2.5 rounded-xl border-0">
                              {tr(
                                'تطبيق ÇAVÊ BAADRÊ (عين باعذرة) مبادرة مجتمعية رقمية تابعة لمنظمة RABA، تربط المواطنين مباشرة بالدوائر الخدمية ومسؤولي الصيانة الميدانية في ناحية باعذرة.',
                                'ئەپی ÇAVÊ BAADRÊ (چاڤێ باعدرێ) دەستپێشخەرییەکی دیجیتاڵییە سەربە ڕێکخراوی RABA، هاووڵاتیان ڕاستەوخۆ دەبەستێتەوە بە فەرمانگە خزمەتگوزارییەکان لە ناحیەی باعەدرێ.',
                                'ÇAVÊ BAADRÊ is a civic digital initiative by RABA Organization connecting citizens directly with municipal service departments in Baadre.'
                              )}
                            </p>
                            <ul className="space-y-1.5 text-[11px] font-bold text-[#1B3A46] px-1">
                              <li className="flex items-start gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-[#467586] shrink-0 mt-0.5" />
                                <span>{tr('استقبال بلاغات المواطنين الموثقة بالصور وإحداثيات الموقع.', 'وەرگرتنی سکاڵاکان بە وێنە و شوێنی جوگرافی.', 'Receiving photo & GPS verified reports.')}</span>
                              </li>
                              <li className="flex items-start gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-[#467586] shrink-0 mt-0.5" />
                                <span>{tr('إحالة البلاغات رسمياً للدوائر ومتابعة إنجازها الميداني.', 'ناردنی فەرمی سکاڵاکان بۆ فەرمانگەکان و بەدواداچوون.', 'Official referrals to municipal departments.')}</span>
                              </li>
                            </ul>
                            <button
                              type="button"
                              onClick={() => setIsAboutModalOpen(true)}
                              className="w-full mt-2 py-2 px-3 rounded-xl bg-[#E3EFF3] hover:bg-[#D2E6EC] text-[#285060] font-black text-[11px] flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer border-0"
                            >
                              <span>{tr('عرض المزيد من التفاصيل', 'بینینی زانیاری زیاتر', 'View Full Details')}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ب) قسم سياسة الخصوصية (Privacy Policy - بدون إطارات) */}
                  <div className="rounded-2xl bg-white/90 border-0 shadow-[0_4px_16px_rgba(30,142,147,0.08)] overflow-hidden transition-all">
                    <button
                      type="button"
                      onClick={() => toggleSection('privacy')}
                      className={`w-full p-3.5 flex items-center justify-between ${
                        isRTL ? 'text-right' : 'text-left'
                      } cursor-pointer hover:bg-[#E6F1F5]/70 transition-colors border-0`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#E3EFF3] text-[#3B6878] flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <p className="text-xs sm:text-sm font-black text-[#1B3A46]">
                          {tr('سياسات الخصوصية', 'سیاسەتی تایبەتمەندی', 'Privacy Policy')}
                        </p>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-[#467586] transition-transform duration-250 ${
                          expandedSection === 'privacy' ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {expandedSection === 'privacy' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="p-3.5 pt-0 space-y-2 text-xs text-[#285060] leading-relaxed">
                            <p className="font-bold text-[#1B3A46] bg-[#F2F8FA] p-2.5 rounded-xl border-0">
                              {tr(
                                'تلتزم منظمة RABA في تطبيق ÇAVÊ BAADRÊ بالحفاظ الكامل على خصوصية وسرية بيانات المواطنين وأرقام هواتفهم، وتُستخدم المعلومات فقط لمعالجة البلاغات الخدمية الميدانية في ناحية باعذرة.',
                                'ڕێکخراوی RABA لە ئەپی ÇAVÊ BAADRÊ بە تەواوی پابەندە بە پاراستنی نهێنی و تایبەتمەندی داتای هاووڵاتیان و تەنها بۆ چارەسەرکردنی سکاڵا خزمەتگوزارییەکان بەکاردەهێنرێت.',
                                'RABA Organization strictly safeguards citizen privacy in ÇAVÊ BAADRÊ. Data is used solely for civic service resolution in Baadre.'
                              )}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenPrivacyPolicy) {
                                  onClose();
                                  onOpenPrivacyPolicy();
                                }
                              }}
                              className="w-full mt-1 py-2 px-3 rounded-xl bg-[#E3EFF3] hover:bg-[#D2E6EC] text-[#285060] font-black text-[11px] flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer border-0"
                            >
                              <span>{tr('فتح وثيقة الخصوصية الكاملة', 'کردنەوەی بەڵگەنامەی تەواو', 'Open Full Privacy Document')}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ج) قسم تواصل معنا (Contact Us - بدون إطارات) */}
                  <div className="rounded-2xl bg-white/90 border-0 shadow-[0_4px_16px_rgba(30,142,147,0.08)] overflow-hidden transition-all">
                    <button
                      type="button"
                      onClick={() => toggleSection('contact')}
                      className={`w-full p-3.5 flex items-center justify-between ${
                        isRTL ? 'text-right' : 'text-left'
                      } cursor-pointer hover:bg-[#E6F1F5]/70 transition-colors border-0`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#E3EFF3] text-[#3B6878] flex items-center justify-center shrink-0">
                          <Phone className="w-4 h-4" />
                        </div>
                        <p className="text-xs sm:text-sm font-black text-[#1B3A46]">
                          {tr('تواصل معنا', 'پەیوەندیمان پێوە بکە', 'Contact Us')}
                        </p>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-[#467586] transition-transform duration-250 ${
                          expandedSection === 'contact' ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {expandedSection === 'contact' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="p-3.5 pt-0 space-y-2">
                            {/* اتصال هاتفي مباشر */}
                            <a
                              href={`tel:+${contactSettings.contactPhone || '9647749019911'}`}
                              className="flex items-center justify-start gap-2 p-2.5 rounded-xl bg-[#F4F9FB] hover:bg-[#E3EFF3] transition-colors text-xs font-bold text-[#1B3A46] border-0"
                            >
                              <Phone className="w-3.5 h-3.5 text-[#467586] shrink-0" />
                              <span className="text-[#3B6878] shrink-0">
                                {tr('رقم الهاتف:', 'ژمارەی مۆبایل:', 'Phone:')}
                              </span>
                              <bdi className="font-mono font-black text-[#1B3A46]" dir="ltr">
                                {contactSettings.contactPhone || '9647749019911'}
                              </bdi>
                            </a>

                            {/* واتساب المنظمة المعتمد */}
                            <a
                              href={`https://wa.me/${contactSettings.whatsappReportsNumber || '9647749019911'}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-start gap-2 p-2.5 rounded-xl bg-[#E3EFF3] hover:bg-[#D2E6EC] transition-colors text-xs font-black text-[#1B3A46] border-0"
                            >
                              <MessageCircle className="w-4 h-4 text-[#467586] shrink-0" />
                              <span className="text-[#3B6878] shrink-0">
                                {tr('واتساب المنظمة:', 'واتسئەپی ڕێکخراو:', 'Official WhatsApp:')}
                              </span>
                              <bdi className="font-mono font-black text-[#1B3A46]" dir="ltr">
                                {contactSettings.whatsappReportsNumber || '9647749019911'}
                              </bdi>
                            </a>

                            {/* البريد الإلكتروني */}
                            <a
                              href={`mailto:${contactSettings.contactEmail || 'info@cavebaadre.org'}`}
                              className="flex items-center justify-start gap-2 p-2.5 rounded-xl bg-[#F4F9FB] hover:bg-[#E3EFF3] transition-colors text-xs font-bold text-[#1B3A46] border-0"
                            >
                              <Mail className="w-3.5 h-3.5 text-[#467586] shrink-0" />
                              <span className="text-[#3B6878] shrink-0">
                                {tr('الإيميل:', 'ئیمەیڵ:', 'Email:')}
                              </span>
                              <bdi className="font-mono font-black text-[#1B3A46] text-[11px] truncate" dir="ltr">
                                {contactSettings.contactEmail || 'info@cavebaadre.org'}
                              </bdi>
                            </a>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* د) قسم نطاق التغطية والخدمات (Coverage - بدون إطارات) */}
                  <div className="rounded-2xl bg-white/90 border-0 shadow-[0_4px_16px_rgba(30,142,147,0.08)] overflow-hidden transition-all">
                    <button
                      type="button"
                      onClick={() => toggleSection('coverage')}
                      className={`w-full p-3.5 flex items-center justify-between ${
                        isRTL ? 'text-right' : 'text-left'
                      } cursor-pointer hover:bg-[#E6F1F5]/70 transition-colors border-0`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#E3EFF3] text-[#3B6878] flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <p className="text-xs sm:text-sm font-black text-[#1B3A46]">
                          {tr('نطاق التغطية الخدمية', 'سنووری خزمەتگوزاری', 'Service Coverage')}
                        </p>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-[#467586] transition-transform duration-250 ${
                          expandedSection === 'coverage' ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {expandedSection === 'coverage' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="p-3.5 pt-0 space-y-2 text-xs font-bold text-[#1B3A46]">
                            <div className="p-2.5 rounded-xl bg-[#F2F8FA] border-0 space-y-1">
                              <p className="text-[11px] font-black text-[#3B6878]">
                                {tr('المناطق المشمولة:', 'ناوچە داپۆشراوەکان:', 'Covered Areas:')}
                              </p>
                              <p className="text-[11px] text-[#285060]">
                                {tr(
                                  'مركز ناحية باعدرى، مجمع باعدرى، الأحياء السكنية والقرى التابعة إدارياً للناحية.',
                                  'ناوەندی ناحیەی باعەدرێ، کۆمەڵگەی باعەدرێ، گەڕەکەکان و گوندەکانی سەر بە ناحیەکە.',
                                  'Baadre center, Baadre complex, residential quarters and affiliated villages.'
                                )}
                              </p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-[#F2F8FA] border-0 space-y-1">
                              <p className="text-[11px] font-black text-[#3B6878]">
                                {tr('القطاعات المعتمدة:', 'کەرتە پەسەندکراوەکان:', 'Covered Sectors:')}
                              </p>
                              <p className="text-[11px] text-[#285060]">
                                {tr(
                                  'الطرق والتبليط • شبكات المياه • الصرف الصحي • النظافة والبيئة • الإنارة العامة.',
                                  'ڕێگاوبان • تۆڕی ئاو • ئاوەڕۆ • پاکوخاوێنی و ژینگە • ڕووناککردنەوە.',
                                  'Roads • Water networks • Sewage • Sanitation • Public lighting.'
                                )}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* 5. مشاركة المنصة (Share Button - بدون إطارات) */}
                <div className="pt-1">
                  <button
                    onClick={handleShareApp}
                    className="w-full py-2.5 px-3 bg-white/90 hover:bg-[#E3EFF3] border-0 text-[#1B3A46] font-bold rounded-2xl shadow-[0_4px_16px_rgba(30,142,147,0.08)] flex items-center justify-center gap-2 text-xs transition-all cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4 text-[#467586]" />
                        <span className="text-[#3B6878] font-black">
                          {tr(
                            'تم نسخ رابط المنصة بنجاح!',
                            'بەستەری سەکۆکە کۆپی کرا!',
                            'Platform link copied!'
                          )}
                        </span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 text-[#467586]" />
                        <span>
                          {tr('مشاركة رابط المنصة', 'هاوبەشکردنی سەکۆ', 'Share Platform Link')}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Footer — يمتد كاملاً إلى أطراف السايدبار السفلية مع حافة علوية ناعمة */}
              <div
                dir={isRTL ? 'rtl' : 'ltr'}
                className="relative z-10 px-3.5 py-3 bg-gradient-to-r from-[#467586]/60 via-[#58899A]/40 to-[#6C9DAE]/60 backdrop-blur-xl border-t border-white/40 text-center text-[10px] font-bold text-[#0E3544] flex flex-col items-center justify-center gap-2 select-none overflow-hidden shrink-0"
              >
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.52) 0%, rgba(255,255,255,0.14) 50%, transparent 80%)',
                  }}
                />

                {/* زر متابعة منظمة RABA على إنستغرام متناسق مع جميع السمات اللونية */}
                <a
                  href="https://www.instagram.com/rabaorganization?cplk=c21nZ3F3ZmZuZzR6"
                  target="_blank"
                  rel="noopener noreferrer"
                  dir={isRTL ? 'rtl' : 'ltr'}
                  onClick={() => playClickSound()}
                  aria-label={tr(
                    'تابعنا على انستكرام',
                    'لە ئینستاگرام فۆڵۆمان بکە',
                    'Follow us on Instagram'
                  )}
                  title={tr(
                    'تابعنا على انستكرام — RABA Organization',
                    'لە ئینستاگرام فۆڵۆمان بکە — RABA',
                    'Follow us on Instagram — RABA Organization'
                  )}
                  className="relative z-10 group px-3.5 py-1.5 rounded-2xl bg-white/85 hover:bg-white text-[#1B3A46] shadow-[0_4px_14px_rgba(30,142,147,0.10)] hover:shadow-[0_6px_20px_rgba(30,142,147,0.18)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] inline-flex items-center justify-center gap-2.5 cursor-pointer border-0"
                >
                  <span className="text-[11px] sm:text-xs font-black text-[#1B3A46] tracking-wide whitespace-nowrap">
                    {tr(
                      'تابعنا على انستكرام',
                      'لە ئینستاگرام فۆڵۆمان بکە',
                      'Follow us on Instagram'
                    )}
                  </span>
                  <span className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#467586] via-[#58899A] to-[#6C9DAE] text-white flex items-center justify-center shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4"
                      aria-hidden="true"
                    >
                      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                    </svg>
                  </span>
                </a>

                <div className="relative z-10 flex items-center justify-center gap-1.5 flex-wrap">
                  {isRTL ? (
                    <>
                      <bdi className="text-[#0E3544]">
                        {language === 'ku' ? 'ڕێکخراوی' : 'منظمة'} <span dir="ltr" className="font-black text-[#0E3544]">RABA</span>
                      </bdi>
                      <span className="text-[#0E3544]/50">•</span>
                      <bdi className="text-[#0E3544]">
                        {language === 'ku' ? 'ئەپی' : 'تطبيق'} <span dir="ltr" className="font-black text-[#0E3544]">ÇAVÊ BAADRÊ</span>
                      </bdi>
                      <span className="text-[#0E3544]/50">•</span>
                      <bdi dir="ltr" className="font-black text-[#0E3544]">© {new Date().getFullYear()}</bdi>
                    </>
                  ) : (
                    <>
                      <bdi className="font-black text-[#0E3544]">RABA Organization</bdi>
                      <span className="text-[#0E3544]/50">•</span>
                      <bdi className="font-black text-[#0E3544]">ÇAVÊ BAADRÊ App</bdi>
                      <span className="text-[#0E3544]/50">•</span>
                      <bdi className="font-black text-[#0E3544]">© {new Date().getFullYear()}</bdi>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* نافذة من نحن الموسعة (About Us Modal) */}
      <AnimatePresence>
        {isAboutModalOpen && (
          <div
            dir={dir}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#1B3A46]/50 backdrop-blur-xs"
            onClick={() => setIsAboutModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-xl max-h-[88vh] rounded-3xl bg-white shadow-[0_24px_60px_rgba(27,58,70,0.25)] border border-[#CFE2E8] overflow-hidden flex flex-col ${
                isRTL ? 'text-right' : 'text-left'
              }`}
            >
              {/* Modal Header */}
              <div className="p-5 bg-[#EFF6F8] border-b border-[#DAE9EE] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#467586] text-white flex items-center justify-center shadow-xs">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#1B3A46]">
                      {tr(
                        'من نحن — منظمة RABA وتطبيق ÇAVÊ BAADRÊ',
                        'ئێمە کێین — ڕێکخراوی RABA و ئەپی ÇAVÊ BAADRÊ',
                        'About Us — RABA Organization & ÇAVÊ BAADRÊ'
                      )}
                    </h3>
                    <p className="text-xs font-bold text-[#3B6878]">
                      {tr(
                        'منصة الخدمات المجتمعية في ناحية باعذرة',
                        'سەکۆی خزمەتگوزارییە کۆمەڵایەتییەکان لە ناحیەی باعەدرێ',
                        'Civic & Community Service Platform in Baadre'
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAboutModalOpen(false)}
                  className="p-2 rounded-xl text-[#3B6878] hover:bg-[#DFEEF3] transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Scrollable Content */}
              <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm text-[#1B3A46] leading-relaxed overflow-y-auto custom-scrollbar">
                {/* قسم نبذة عن منظمة RABA */}
                <div className="p-4 rounded-2xl bg-[#F2F8FA] border border-[#CFE2E8] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black text-[#1B3A46]">
                    <Building className="w-4 h-4 text-[#467586]" />
                    <span>
                      {tr(
                        'نبذة عن منظمة RABA (ڕێکخراوی RABA)',
                        'دەربارەی ڕێکخراوی RABA',
                        'About RABA Organization'
                      )}
                    </span>
                  </div>
                  <p className="font-medium text-[#285060] text-xs leading-relaxed">
                    {tr(
                      'منظمة RABA هي منظمة مجتمعية غير حكومية تهدف إلى تمكين المجتمعات المحلية، دعم التنمية الحضرية المستدامة، وتوظيف التقنيات الذكية لتعزيز التواصل المباشر بين المواطنين والمؤسسات الخدمية لرفع مستوى جودة الحياة.',
                      'ڕێکخراوی RABA ڕێکخراوێکی کۆمەڵایەتی ناحکومییە بە مەبەستی بەهێزکردنی کۆمەڵگە، پەرەپێدانی بەردەوام، و بەکارهێنانی تەکنەلۆژیای زیرەک بۆ نزیککردنەوەی هاووڵاتیان لە دامەزراوە خزمەتگوزارییەکان.',
                      'RABA Organization is a non-governmental civic organization dedicated to community empowerment, sustainable development, and smart digital governance to enhance local living standards.'
                    )}
                  </p>
                </div>

                {/* قسم تطبيق ÇAVÊ BAADRÊ */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-black text-[#1B3A46]">
                    {tr(
                      'تطبيق ÇAVÊ BAADRÊ (عين باعذرة / چاڤێ باعدرێ)',
                      'ئەپی ÇAVÊ BAADRÊ (چاڤێ باعدرێ)',
                      'The ÇAVÊ BAADRÊ Application'
                    )}
                  </h4>
                  <p className="font-medium text-[#285060] text-xs leading-relaxed">
                    {tr(
                      'تطبيق ÇAVÊ BAADRÊ هو المنصة الرقمية الميدانية المعتمدة من منظمة RABA لخدمة أهالي ناحية باعذرة (المركز، المجمعات، والقرى التابعة). يوفر التطبيق حلاً تقنياً آمناً لتوثيق المشاكل والأعطال بالصور والموقع الجغرافي، وإحالتها فورياً إلى الدوائر الخدمية المختصة ومتابعة مراحل إنجازها.',
                      'ئەپی ÇAVÊ BAADRÊ سەکۆی دیجیتاڵی فەرمی ڕێکخراوی RABAیە بۆ خزمەتکردنی هاووڵاتیانی ناحیەی باعەدرێ و کۆمەڵگە و گوندەکانی. ئەپەکە ڕێگەیەکی ئاسانە بۆ وەرگرتنی سکاڵاکان بە وێنە و GPS و ناردنی بۆ فەرمانگە پەیوەندیدارەکان و بەدواداچوونی چاککردنەوەیان.',
                      'ÇAVÊ BAADRÊ is the verified civic platform launched by RABA Organization to serve Baadre sub-district, enabling photo-documented GPS reporting, instant municipal referral, and transparent work verification.'
                    )}
                  </p>
                </div>

                {/* الأهداف والرسالة */}
                <div className="p-4 rounded-2xl bg-[#F2F8FA] space-y-2 border border-[#DAE9EE]">
                  <p className="text-xs font-black text-[#285060] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#467586]" />
                    <span>{tr('أهداف ورسالة منظمة RABA عبر التطبيق:', 'ئامانجەکانی ڕێکخراوی RABA لە ڕێگەی ئەپەکە:', 'RABA Organization Strategic Goals:')}</span>
                  </p>
                  <ul className="space-y-2 text-xs font-medium text-[#1B3A46]">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#467586] mt-1.5 shrink-0" />
                      <span>{tr('تسهيل إرسال بلاغات المواطنين الموثقة بالصور وإحداثيات GPS بدقة وسرعة.', 'ئاسانکاری بۆ ناردنی سکاڵای هاووڵاتیان بە وێنە و شوێنی GPS بە شێوەیەکی ورد.', 'Facilitating citizen report submission with photos and GPS precision.')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#467586] mt-1.5 shrink-0" />
                      <span>{tr('الإحالة الرسمية المباشرة للدوائر (البلدية، الماء، الكهرباء، الطرق، الصرف الصحي، والنظافة).', 'ناردنی فەرمی و ڕاستەوخۆ بۆ فەرمانگەکان (شارەوانی، ئاو، کارەبا، ڕێگاوبان، ئاوەڕۆ، ژینگە).', 'Direct referral to municipal departments (Municipality, Water, Electricity, Roads, Sanitation).')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#467586] mt-1.5 shrink-0" />
                      <span>{tr('توثيق وأرشفة المشاريع والأعمال المنجزة بصور (قبل وبعد الإنجاز) لتعزيز الشفافية.', 'بەڵگەنامەکردنی کارە تەواوکراوەکان بە وێنەی (پێش و دوای چاککردنەوە) بۆ شەفافیەت.', 'Documenting completed works with before/after photos for civic transparency.')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#467586] mt-1.5 shrink-0" />
                      <span>{tr('استطلاعات الرأي المجتمعية لدراسة احتياجات وأولويات أهالي ناحية باعذرة.', 'ڕاپرسی کۆمەڵایەتی بۆ دیاریکردنی پێداویستییە لەپێشینەکانی خەڵکی باعەدرێ.', 'Community public surveys to assess service priorities in Baadre.')}</span>
                    </li>
                  </ul>
                </div>

                {/* تواصل منظمة RABA */}
                <div className="pt-2 border-t border-[#DAE9EE] flex flex-wrap items-center justify-between gap-2 text-xs text-[#3B6878] font-bold">
                  <span>{tr('منظمة RABA • ناحية باعذرة', 'ڕێکخراوی RABA • ناحیەی باعەدرێ', 'RABA Organization • Baadre District')}</span>
                  <span dir="ltr" className="font-mono text-[#1B3A46]">9647749019911</span>
                </div>

                {/* زر الإغلاق */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAboutModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl bg-[#467586] hover:bg-[#386373] text-white text-xs font-black cursor-pointer shadow-xs transition-colors"
                  >
                    {tr('إغلاق', 'داخستن', 'Close')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* نافذة تعديل الحساب مع تأكيدات قوية */}
      <AnimatePresence>
        {isEditAccountOpen && (
          <div
            dir={dir}
            className="fixed inset-0 z-[140] flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditAccountOpen(false)}
              className="fixed inset-0 bg-[#1B3A46]/55 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className={`relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#CFE2E8] p-5 sm:p-6 z-10 space-y-4 ${
                isRTL ? 'text-right' : 'text-left'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#DAE9EE]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#E3EFF3] text-[#467586] flex items-center justify-center">
                    <Pencil className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-[#1B3A46]">
                      {editConfirmStep === 1
                        ? tr('تأكيد تعديل الحساب', 'پشتڕاستکردنەوەی دەستکاری هەژمار', 'Confirm Account Edit')
                        : editConfirmStep === 2
                        ? tr('حفظ التعديلات', 'پاشەکەوتکردنی گۆڕانکارییەکان', 'Save Changes')
                        : tr('تعديل بيانات الحساب', 'دەستکاری زانیاری هەژمار', 'Edit Account Details')}
                    </h3>
                    <p className="text-[11px] font-bold text-[#3B6878]" dir="ltr">
                      {currentUser?.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditAccountOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-[#1B3A46] hover:bg-[#E3EFF3] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {editError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {editSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{editSuccess}</span>
                </div>
              )}

              {editConfirmStep === 0 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#3B6878] mb-1">
                      {tr('الاسم الثلاثي الكامل', 'ناوی سیانی تەواو', 'Full Name')} *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                        className={`w-full bg-[#F2F8FA] border border-[#BDDAE3] focus:border-[#467586] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1B3A46] focus:outline-none ${
                          isRTL ? 'pr-9 text-right' : 'pl-9 text-left'
                        }`}
                      />
                      <UserIcon
                        className={`w-4 h-4 text-[#467586] absolute ${
                          isRTL ? 'right-3' : 'left-3'
                        } top-3 pointer-events-none`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#3B6878] mb-1">
                      {tr('رقم الموبايل', 'ژمارەی مۆبایل', 'Mobile Phone')} *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        dir="ltr"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className={`w-full bg-[#F2F8FA] border border-[#BDDAE3] focus:border-[#467586] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-[#1B3A46] focus:outline-none ${
                          isRTL ? 'pr-9 text-right' : 'pl-9 text-left'
                        }`}
                      />
                      <Phone
                        className={`w-4 h-4 text-[#467586] absolute ${
                          isRTL ? 'right-3' : 'left-3'
                        } top-3 pointer-events-none`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#3B6878] mb-1">
                      {tr('كلمة مرور جديدة (اختياري)', 'وشەی تێپەڕی نوێ (ئارەزوومەندانە)', 'New Password (Optional)')}
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        dir="ltr"
                        value={editNewPassword}
                        onChange={(e) => setEditNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full bg-[#F2F8FA] border border-[#BDDAE3] focus:border-[#467586] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1B3A46] focus:outline-none ${
                          isRTL ? 'pr-9 text-right' : 'pl-9 text-left'
                        }`}
                      />
                      <Lock
                        className={`w-4 h-4 text-[#467586] absolute ${
                          isRTL ? 'right-3' : 'left-3'
                        } top-3 pointer-events-none`}
                      />
                    </div>
                  </div>

                  {/* خيار حذف الحساب بشكل لطيف داخل تعديل الحساب */}
                  <div className="pt-2.5 border-t border-[#DAE9EE] flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-500">
                      {tr(
                        'هل ترغب في حذف حسابك؟',
                        'دەتەوێت هەژمارەکەت بسڕیتەوە؟',
                        'Want to delete account?'
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditAccountOpen(false);
                        openDeleteAccountModal();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-black inline-flex items-center gap-1.5 transition-colors cursor-pointer border-0 shadow-2xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{tr('حذف الحساب', 'سڕینەوەی هەژمار', 'Delete Account')}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditAccountOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-[#F2F8FA] text-[#285060] text-xs font-bold hover:bg-[#E3EFF3] transition-colors cursor-pointer"
                    >
                      {tr('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setEditError(null);
                        if (editFullName.trim().split(/\s+/).length < 3) {
                          setEditError(tr('يرجى كتابة الاسم الثلاثي.', 'تکایە ناوی سیانی بنووسە.', 'Enter full 3-part name.'));
                          return;
                        }
                        if (!editPhone.trim() || editPhone.replace(/[\s-]/g, '').length < 10) {
                          setEditError(tr('رقم الهاتف غير صالح.', 'ژمارەی مۆبایل نادروستە.', 'Invalid phone.'));
                          return;
                        }
                        if (editNewPassword.trim() && editNewPassword.trim().length < 6) {
                          setEditError(tr('كلمة المرور 6 أحرف على الأقل.', 'وشەی تێپەڕ لانیکەم ٦ پیت بێت.', 'Min 6 chars.'));
                          return;
                        }
                        setEditConfirmStep(1);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#467586] hover:bg-[#386373] text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{tr('حفظ التعديلات', 'پاشەکەوتکردنی گۆڕانکاری', 'Save Changes')}</span>
                    </button>
                  </div>
                </div>
              )}

              {editConfirmStep === 1 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1.5">
                    <p className="text-xs font-black">
                      {tr(
                        'هل ترغب في تحديث بيانات حسابك؟',
                        'ئایا دڵنیایت لە نوێکردنەوەی هەژمارەکەت؟',
                        'Do you want to update your account?'
                      )}
                    </p>
                    <p className="text-[11px] font-bold text-amber-800">
                      {editFullName.trim()} • {editPhone.trim()}
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditConfirmStep(0)}
                      className="px-4 py-2.5 rounded-xl bg-[#F2F8FA] text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      {tr('تراجع', 'گەڕانەوە', 'Back')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setEditConfirmStep(2);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black cursor-pointer"
                    >
                      {tr('نعم، متابعة', 'بەڵێ، بەردەوامبە', 'Proceed')}
                    </button>
                  </div>
                </div>
              )}

              {editConfirmStep === 2 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#E3EFF3] border-2 border-[#467586] text-[#1B3A46] space-y-1.5">
                    <p className="text-xs font-black">
                      {tr(
                        'اضغط لاعتماد وحفظ تعديلات الحساب الآن.',
                        'پەسەندکردن و پاشەکەوتکردن.',
                        'Confirm saving changes now.'
                      )}
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={editSubmitting}
                      onClick={() => setEditConfirmStep(0)}
                      className="px-4 py-2.5 rounded-xl bg-[#F2F8FA] text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      {tr('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
                    </button>
                    <button
                      type="button"
                      disabled={editSubmitting}
                      onClick={async () => {
                        setEditSubmitting(true);
                        setEditError(null);
                        try {
                          await updateAccount({
                            fullName: editFullName,
                            phone: editPhone,
                            birthDate: editBirthDate,
                            newPassword: editNewPassword.trim() || undefined,
                          });
                          playSuccessSound();
                          setEditSuccess(tr('تم تحديث الحساب بنجاح.', 'هەژمارەکە نوێکرایەوە.', 'Account updated.'));
                          setTimeout(() => {
                            setIsEditAccountOpen(false);
                          }, 900);
                        } catch (err: any) {
                          setEditError(err?.message || tr('فشل تحديث الحساب.', 'نوێکردنەوە سەرکەوتوو نەبوو.', 'Update failed.'));
                          setEditConfirmStep(0);
                        } finally {
                          setEditSubmitting(false);
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#467586] hover:bg-[#386373] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {editSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>{tr('تأكيد وحفظ', 'پشتڕاستکردنەوە و پاشەکەوتکردن', 'Confirm & Save')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* نافذة حذف الحساب دون حذف البيانات مع تأكيدات قوية على مرحلتين */}
      <AnimatePresence>
        {isDeleteAccountOpen && (
          <div
            dir={dir}
            className="fixed inset-0 z-[140] flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteAccountOpen(false)}
              className="fixed inset-0 bg-[#1E3725]/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className={`relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-rose-200 p-5 sm:p-6 z-10 space-y-4 ${
                isRTL ? 'text-right' : 'text-left'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-rose-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-rose-900">
                      {tr('حذف الحساب', 'سڕینەوەی هەژمار', 'Delete Account')}
                    </h3>
                    <p className="text-[11px] font-bold text-rose-600">
                      {tr('حذف الحساب الشخصي دون حذف البيانات', 'سڕینەوەی هەژمار بەبێ سڕینەوەی داتاکان', 'Delete account while keeping data')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDeleteAccountOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {deleteError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              {deleteConfirmStep === 1 ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
                    <p className="text-xs font-black">
                      {tr(
                        'هل أنت متأكد من رغبتك في حذف حسابك؟',
                        'ئایا دڵنیایت لە سڕینەوەی هەژمارەکەت؟',
                        'Are you sure you want to delete your account?'
                      )}
                    </p>
                    <p className="text-[11px] font-bold text-amber-900 leading-relaxed">
                      {tr(
                        'سيتم حذف حساب دخولك وبياناتك الشخصية فقط، بينما ستبقى البلاغات والأعمال الخدمية المرسلة محفوظة دون حذف.',
                        'تەنها هەژماری چوونەژوورەوەت دەسڕدرێتەوە، بەڵام سکاڵا و داتا خزمەتگوزارییەکان پارێزراو دەبن و ناسڕدرێنەوە.',
                        'Only your login account will be removed; all submitted civic reports and service records will remain preserved.'
                      )}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsDeleteAccountOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-[#F4F9F5] text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      {tr('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setDeleteConfirmStep(2);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black cursor-pointer"
                    >
                      {tr('نعم، متابعة', 'بەڵێ، بەردەوامبە', 'Proceed')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-400 text-rose-950 space-y-2">
                    <p className="text-xs font-black">
                      {tr(
                        'سيتم الآن حذف الحساب فوراً مع بقاء البلاغات والبيانات محفوظة.',
                        'ئێستا هەژمارەکە دەسڕدرێتەوە و سکاڵاکان دەمێننەوە.',
                        'Your account will now be deleted while keeping all reports and data.'
                      )}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={deleteSubmitting}
                      onClick={() => setDeleteConfirmStep(1)}
                      className="px-4 py-2.5 rounded-xl bg-[#F4F9F5] text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      {tr('تراجع', 'گەڕانەوە', 'Back')}
                    </button>
                    <button
                      type="button"
                      disabled={deleteSubmitting}
                      onClick={async () => {
                        setDeleteSubmitting(true);
                        setDeleteError(null);
                        try {
                          await deleteAccountWithoutData();
                          playSuccessSound();
                          setActiveRole('citizen');
                          setIsDeleteAccountOpen(false);
                          onClose();
                        } catch {
                          setDeleteError(tr('تعذر حذف الحساب.', 'سڕینەوەی هەژمار سەرکەوتوو نەبوو.', 'Failed to delete account.'));
                        } finally {
                          setDeleteSubmitting(false);
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {deleteSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span>{tr('تأكيد حذف الحساب', 'سڕینەوەی هەژمار', 'Confirm Delete Account')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
