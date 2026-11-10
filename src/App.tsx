import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BaadreProvider, useBaadre } from './context/BaadreContext';
import { ColorProvider } from './context/ColorContext';
import { NavbarHeader } from './components/NavbarHeader';
import { CitizenTrackingView } from './components/CitizenTrackingView';
import { BottomMobileNav } from './components/BottomMobileNav';
import { ModernGeometricPrismBackground } from './components/ModernGeometricPrismBackground';
import { OfflineBanner } from './components/OfflineBanner';
import { SplashLoading } from './components/SplashLoading';
import { CitizenSurveyPopupModal } from './components/CitizenSurveyPopupModal';
import { AuthModal } from './components/AuthModal';
import { AppStartOverviewScreen } from './components/AppStartOverviewScreen';
import { isReportSentToDepartment } from './types/baadre';
import { playClickSound } from './lib/sound';
import { subscribeToAutoUpdater, setAutoUpdateDeferred } from './services/appAutoUpdater';

// Lazy-loaded feature views & heavy modals for faster initial load and modular scalability
const MunicipalControlDashboard = lazy(() =>
  import('./components/MunicipalControlDashboard').then((m) => ({
    default: m.MunicipalControlDashboard,
  }))
);
const SurveysView = lazy(() =>
  import('./components/SurveysView').then((m) => ({
    default: m.SurveysView,
  }))
);
const SidebarDrawer = lazy(() =>
  import('./components/SidebarDrawer').then((m) => ({
    default: m.SidebarDrawer,
  }))
);
const SubmitReportWizardModal = lazy(() =>
  import('./components/SubmitReportWizardModal').then((m) => ({
    default: m.SubmitReportWizardModal,
  }))
);
const AddOrganizationProjectModal = lazy(() =>
  import('./components/AddOrganizationProjectModal').then((m) => ({
    default: m.AddOrganizationProjectModal,
  }))
);
const CivicReportDetailsModal = lazy(() =>
  import('./components/CivicReportDetailsModal').then((m) => ({
    default: m.CivicReportDetailsModal,
  }))
);
const PrivacyPolicyModal = lazy(() =>
  import('./components/PrivacyPolicyModal').then((m) => ({
    default: m.PrivacyPolicyModal,
  }))
);

const ViewLoadingFallback: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 py-12 flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-3 border-[#E3EFF3] border-t-[#467586] animate-spin" />
  </div>
);

const BaadreMainLayout: React.FC = () => {
  const { dir, language } = useLanguage();
  const { currentUser, isAdmin, isSuperAdmin, openAuthModal } = useAuth();
  const canAccessAdmin = Boolean(currentUser && (isAdmin || isSuperAdmin));
  const {
    activeRole,
    isSurveysViewOpen,
    isStartScreenActive,
    selectedReport,
    setSelectedReport,
    editingCitizenReport,
    setEditingCitizenReport,
    isAddProjectOpen,
    setIsAddProjectOpen,
    statusUpdateToast,
    clearStatusUpdateToast,
    newAdminReportAlert,
    dismissNewAdminReportAlert,
  } = useBaadre();

  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

  const getStatusLabelForToast = (st: string) => {
    if (st === 'pending') {
      return tr('تم الاستلام', 'وەرگیرا', 'Received');
    }
    if (st === 'in_progress') {
      return tr('تم الإرسال', 'نێردرا', 'Sent');
    }
    if (st === 'resolved') {
      return tr('تم الإنجاز', 'ئەنجامدرا', 'Completed');
    }
    return tr('مرفوض', 'ڕەتکراوە', 'Rejected');
  };

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(() => {
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem('cave_baadre_session_splash_shown')) {
        return false;
      }
    } catch {}
    return true;
  });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(() =>
    typeof window !== 'undefined' ? (window as any).__deferredPwaPrompt || null : null
  );

  const [updateInfo, setUpdateInfo] = useState<any>(null);

  useEffect(() => {
    return subscribeToAutoUpdater((info) => {
      setUpdateInfo(info);
    });
  }, []);

  useEffect(() => {
    setAutoUpdateDeferred(
      isSubmitModalOpen || Boolean(editingCitizenReport) || isAddProjectOpen
    );
  }, [isSubmitModalOpen, editingCitizenReport, isAddProjectOpen]);

  useEffect(() => {
    if ((window as any).__deferredPwaPrompt) {
      setDeferredPrompt((window as any).__deferredPwaPrompt);
    }
    const handler = (e: Event) => {
      e.preventDefault();
      (window as any).__deferredPwaPrompt = e;
      setDeferredPrompt(e);
    };
    const readyHandler = () => {
      if ((window as any).__deferredPwaPrompt) {
        setDeferredPrompt((window as any).__deferredPwaPrompt);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('pwa-prompt-ready', readyHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('pwa-prompt-ready', readyHandler);
    };
  }, []);

  const handleInstallApp = useCallback(async () => {
    const promptEvent = deferredPrompt || (window as any).__deferredPwaPrompt;
    if (!promptEvent) return;
    promptEvent.prompt();
    await promptEvent.userChoice;
    (window as any).__deferredPwaPrompt = null;
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleOpenDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const handleCloseDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const handleOpenSubmit = useCallback(() => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    setEditingCitizenReport(null);
    setIsSubmitModalOpen(true);
  }, [currentUser, openAuthModal, setEditingCitizenReport]);
  const handleCloseSubmit = useCallback(() => {
    setIsSubmitModalOpen(false);
    setEditingCitizenReport(null);
  }, [setEditingCitizenReport]);
  const handleOpenAddProject = useCallback(
    () => setIsAddProjectOpen(true),
    [setIsAddProjectOpen]
  );
  const handleCloseAddProject = useCallback(
    () => setIsAddProjectOpen(false),
    [setIsAddProjectOpen]
  );
  const handleOpenPrivacy = useCallback(() => setIsPrivacyOpen(true), []);
  const handleClosePrivacy = useCallback(() => setIsPrivacyOpen(false), []);
  const handleClearSelectedReport = useCallback(
    () => setSelectedReport(null),
    [setSelectedReport]
  );

  return (
    <div
      dir={dir}
      className="min-h-screen text-[#1B3A46] relative selection:bg-[#467586] selection:text-white pb-24 md:pb-12 pt-16"
    >
      {showSplash && (
        <SplashLoading
          isLoadingDb={false}
          isUpdatingApp={updateInfo?.phase === 'updating'}
          onFinish={() => {
            try {
              sessionStorage.setItem('cave_baadre_session_splash_shown', '1');
            } catch {}
            setShowSplash(false);
          }}
        />
      )}

      {/* Signature Geometric Prism Background */}
      <ModernGeometricPrismBackground />

      <OfflineBanner />

      {/* إشعار وتنبيه التحديث على الشاشة مباشرةً إذا كان التطبيق مفتوحاً وتم إصدار تحديث جديد */}
      {updateInfo?.phase === 'updating' && !showSplash && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0E3544]/55 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white/95 backdrop-blur-2xl p-6 text-center shadow-[0_24px_60px_rgba(30,142,147,0.30)] border border-[#B2E2E5] space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#DEF5F6] text-[#1E8E93] flex items-center justify-center mx-auto shadow-inner">
              <svg className="w-7 h-7 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
              </svg>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-black text-[#0E3544]">
                {tr(
                  'تم إصدار تحديث جديد للتطبيق',
                  'وەشانێکی نوێی ئەپ بەردەستە',
                  'New App Update Available'
                )}
              </h3>
              <p className="text-xs sm:text-sm font-bold text-[#195D73] leading-relaxed">
                {tr(
                  'جاري تنزيل وتثبيت الإصدار الأحدث تلقائياً الآن...',
                  'نوێکردنەوەی خۆکار بۆ وەشانی نوێ بەڕێوەدەچێت...',
                  'Automatically updating to the latest version now...'
                )}
              </p>
            </div>
            <div className="w-full bg-[#DEF5F6] rounded-full h-1.5 overflow-hidden">
              <div className="bg-[#1E8E93] h-full w-2/3 animate-[pulse_1s_ease-in-out_infinite]" />
            </div>
          </div>
        </div>
      )}

      {/* رسالة لطيفة ونظيفة عند تغيير حالة البلاغ بدون التفاف (nowrap) */}
      {statusUpdateToast && (
        <div className="fixed top-6 inset-x-0 z-[150] flex justify-center px-3 pointer-events-none">
          <div
            onClick={clearStatusUpdateToast}
            className="pointer-events-auto max-w-full px-4 py-2.5 rounded-2xl bg-white/95 backdrop-blur-xl text-[#1E3725] border border-sky-200/90 shadow-[0_12px_32px_rgba(14,116,144,0.14)] flex items-center flex-nowrap gap-2.5 cursor-pointer transition-all whitespace-nowrap overflow-hidden"
          >
            <span className="w-6 h-6 rounded-full bg-[#46674D] text-white text-xs font-black flex items-center justify-center shrink-0">
              ✓
            </span>
            <span className="text-xs sm:text-sm font-black text-[#1E3725] whitespace-nowrap truncate">
              {tr(
                `تم تغيير حالة البلاغ إلى "${getStatusLabelForToast(
                  statusUpdateToast.toStatus
                )}"`,
                `دۆخی سکاڵا گۆڕدرا بۆ "${getStatusLabelForToast(
                  statusUpdateToast.toStatus
                )}"`,
                `Report status changed to "${getStatusLabelForToast(
                  statusUpdateToast.toStatus
                )}"`
              )}
            </span>
          </div>
        </div>
      )}

      {/* إشعار جرس ذهبي كبير بدون خلفية يهتز عند وصول بلاغ جديد مع نص لطيف وشفاف تحته ويُغلق بعد فتحه لأول مرة */}
      <AnimatePresence>
        {canAccessAdmin &&
          activeRole === 'admin' &&
          newAdminReportAlert &&
          !isReportSentToDepartment(newAdminReportAlert) && (
            <motion.div
              key={newAdminReportAlert.id}
              initial={{ opacity: 0, y: -18, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, y: -12 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="fixed top-20 inset-x-0 z-[140] flex justify-center px-4 pointer-events-none"
            >
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setSelectedReport(newAdminReportAlert);
                  dismissNewAdminReportAlert();
                }}
                title={tr(
                  'اضغط لفتح ومعاينة البلاغ الجديد',
                  'کرتە بکە بۆ کردنەوەی سکاڵا نوێیەکە',
                  'Click to open new report'
                )}
                aria-label={tr(
                  'اضغط لفتح ومعاينة البلاغ الجديد',
                  'کرتە بکە بۆ کردنەوەی سکاڵا نوێیەکە',
                  'Click to open new report'
                )}
                className="pointer-events-auto group flex flex-col items-center justify-center bg-transparent border-0 shadow-none outline-none cursor-pointer select-none"
              >
                {/* الجرس الذهبي الكبير بدون أي خلفية ويهتز بشكل مستمر */}
                <motion.div
                  animate={{
                    rotate: [0, -22, 22, -18, 18, -12, 12, -6, 6, 0],
                    scale: [1, 1.08, 1.08, 1.04, 1],
                  }}
                  transition={{
                    duration: 1.3,
                    repeat: Infinity,
                    repeatDelay: 0.35,
                    ease: 'easeInOut',
                  }}
                  style={{ transformOrigin: '50% 8%' }}
                  className="relative flex items-center justify-center bg-transparent border-0"
                >
                  <svg
                    viewBox="0 0 96 96"
                    className="w-20 h-20 sm:w-24 sm:h-24 overflow-visible drop-shadow-[0_10px_22px_rgba(245,158,11,0.55)] group-hover:scale-105 transition-transform"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id="goldBellBody" x1="20" y1="14" x2="76" y2="78" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#FFF6B7" />
                        <stop offset="28%" stopColor="#FDE047" />
                        <stop offset="65%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#B45309" />
                      </linearGradient>
                      <linearGradient id="goldBellRim" x1="16" y1="64" x2="80" y2="74" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#FEF08A" />
                        <stop offset="50%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#92400E" />
                      </linearGradient>
                      <radialGradient id="goldBellClapper" cx="50%" cy="40%" r="60%">
                        <stop offset="0%" stopColor="#FDE047" />
                        <stop offset="65%" stopColor="#D97706" />
                        <stop offset="100%" stopColor="#78350F" />
                      </radialGradient>
                    </defs>

                    {/* موجات رنين ذهبية جانبية بدون خلفية */}
                    <path
                      d="M17 34C12 40 12 50 17 56"
                      stroke="#FBBF24"
                      strokeWidth="3"
                      strokeLinecap="round"
                      opacity="0.85"
                    />
                    <path
                      d="M10 28C3 37 3 53 10 62"
                      stroke="#F59E0B"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      opacity="0.55"
                    />
                    <path
                      d="M79 34C84 40 84 50 79 56"
                      stroke="#FBBF24"
                      strokeWidth="3"
                      strokeLinecap="round"
                      opacity="0.85"
                    />
                    <path
                      d="M86 28C93 37 93 53 86 62"
                      stroke="#F59E0B"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      opacity="0.55"
                    />

                    {/* حلقة تعليق الجرس العلوية */}
                    <circle
                      cx="48"
                      cy="14"
                      r="5.5"
                      fill="url(#goldBellBody)"
                      stroke="#B45309"
                      strokeWidth="1.5"
                    />

                    {/* لسان الجرس السفلي */}
                    <circle
                      cx="48"
                      cy="74"
                      r="8"
                      fill="url(#goldBellClapper)"
                      stroke="#92400E"
                      strokeWidth="1.5"
                    />

                    {/* جسم الجرس الذهبي الثلاثي الأبعاد */}
                    <path
                      d="M48 18C34.2 18 25 28.4 25 42.5V56.5L18.5 64.5C17.3 66 18.4 68.5 20.4 68.5H75.6C77.6 68.5 78.7 66 77.5 64.5L71 56.5V42.5C71 28.4 61.8 18 48 18Z"
                      fill="url(#goldBellBody)"
                      stroke="#B45309"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />

                    {/* حافة الجرس السفلية المذهّبة */}
                    <rect
                      x="18"
                      y="64"
                      width="60"
                      height="6.5"
                      rx="3.25"
                      fill="url(#goldBellRim)"
                      stroke="#92400E"
                      strokeWidth="1.2"
                    />

                    {/* لمعة ذهبية ناعمة على جسم الجرس */}
                    <path
                      d="M34 27C30.5 32 29.5 38.5 29.5 46"
                      stroke="#FFFBEB"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      opacity="0.75"
                    />
                  </svg>
                </motion.div>

                {/* نص لطيف وشفاف تحت الجرس مباشرة */}
                <div className="-mt-1 px-4 py-1.5 rounded-2xl bg-white/45 group-hover:bg-white/65 backdrop-blur-md shadow-[0_8px_24px_rgba(14,53,68,0.10)] border-0 transition-all flex flex-col items-center gap-0.5 max-w-[290px] sm:max-w-xs text-center">
                  <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                    <span className="text-xs sm:text-[13px] font-black text-[#0E3544] drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]">
                      {tr(
                        'بلاغ جديد وارد',
                        'سکاڵایەکی نوێ گەیشت',
                        'New Report Arrived'
                      )}
                    </span>
                    <span
                      dir="ltr"
                      className="text-[10px] font-mono font-black text-amber-900 bg-amber-100/65 px-1.5 py-0.5 rounded-lg tabular-nums"
                    >
                      {newAdminReportAlert.trackingCode}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-[#0E3544]/90 truncate max-w-[250px] sm:max-w-[290px]">
                    {newAdminReportAlert.title} • {newAdminReportAlert.neighborhood}
                  </p>
                </div>
              </button>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Top Glassmorphic Header */}
      <NavbarHeader
        onOpenDrawer={handleOpenDrawer}
        onSelectReport={setSelectedReport}
        onOpenSubmitReport={handleOpenSubmit}
      />

      {/* Main Content Area: Lazy-loaded Views with Suspense */}
      <Suspense fallback={<ViewLoadingFallback />}>
        {isStartScreenActive ? (
          <main className="relative z-10">
            <AppStartOverviewScreen onOpenSubmitReport={handleOpenSubmit} />
          </main>
        ) : canAccessAdmin && isSurveysViewOpen ? (
          <main className="relative z-10">
            <SurveysView />
          </main>
        ) : canAccessAdmin && activeRole === 'admin' ? (
          <main className="relative z-10">
            <MunicipalControlDashboard
              onSelectReport={setSelectedReport}
              onOpenAddProject={handleOpenAddProject}
            />
          </main>
        ) : (
          <main className="relative z-10">
            <CitizenTrackingView
              onSelectReport={setSelectedReport}
              onOpenSubmitReport={handleOpenSubmit}
            />
          </main>
        )}
      </Suspense>

      {/* Citizen Published Survey Dismissible Pop-up (لا يظهر للزائرين غير المسجلين) */}
      {Boolean(currentUser) && <CitizenSurveyPopupModal />}

      {/* On-demand Modals & Drawer */}
      <Suspense fallback={null}>
        {isDrawerOpen && (
          <SidebarDrawer
            isOpen={isDrawerOpen}
            onClose={handleCloseDrawer}
            onOpenSubmitReport={handleOpenSubmit}
            onOpenAddProject={handleOpenAddProject}
            installPrompt={deferredPrompt}
            onInstallApp={handleInstallApp}
            onOpenPrivacyPolicy={handleOpenPrivacy}
          />
        )}

        {Boolean(currentUser) && (isSubmitModalOpen || Boolean(editingCitizenReport)) && (
          <SubmitReportWizardModal
            isOpen={isSubmitModalOpen || Boolean(editingCitizenReport)}
            onClose={handleCloseSubmit}
            editingReport={editingCitizenReport}
            onSuccessSelectReport={setSelectedReport}
          />
        )}

        {isAddProjectOpen && (
          <AddOrganizationProjectModal
            isOpen={isAddProjectOpen}
            onClose={handleCloseAddProject}
          />
        )}

        {selectedReport && (
          <CivicReportDetailsModal
            report={selectedReport}
            onClose={handleClearSelectedReport}
          />
        )}

        {isPrivacyOpen && (
          <PrivacyPolicyModal
            isOpen={isPrivacyOpen}
            onClose={handleClosePrivacy}
          />
        )}
      </Suspense>

      {/* Mobile Bottom Navigation */}
      <BottomMobileNav onOpenSubmitReport={handleOpenSubmit} />

      {/* Auth Modal for Login, Registration, and Recovery */}
      <AuthModal />
    </div>
  );
};

export function App() {
  return (
    <ColorProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <BaadreProvider>
              <BaadreMainLayout />
            </BaadreProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ColorProvider>
  );
}

export default App;
