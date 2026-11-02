import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Bell, Eye, X, MapPin } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BaadreProvider, useBaadre } from './context/BaadreContext';
import { ColorProvider } from './context/ColorContext';
import { NavbarHeader } from './components/NavbarHeader';
import { CitizenTrackingView } from './components/CitizenTrackingView';
import { BottomMobileNav } from './components/BottomMobileNav';
import { ModernGeometricPrismBackground } from './components/ModernGeometricPrismBackground';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { OfflineBanner } from './components/OfflineBanner';
import { SplashLoading } from './components/SplashLoading';
import { CitizenSurveyPopupModal } from './components/CitizenSurveyPopupModal';
import { AuthModal } from './components/AuthModal';
import { SECTOR_META, isReportSentToDepartment } from './types/baadre';
import { playClickSound } from './lib/sound';

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
    <div className="w-8 h-8 rounded-full border-3 border-[#E8F4EA] border-t-[#46674D] animate-spin" />
  </div>
);

const BaadreMainLayout: React.FC = () => {
  const { dir, language } = useLanguage();
  const { currentUser, isAdmin, isSuperAdmin, openAuthModal } = useAuth();
  const canAccessAdmin = Boolean(currentUser && (isAdmin || isSuperAdmin));
  const {
    activeRole,
    isSurveysViewOpen,
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
  const [showSplash, setShowSplash] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
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
      className="min-h-screen text-[#1E3725] relative selection:bg-[#46674D] selection:text-white pb-24 md:pb-12 pt-16"
    >
      {showSplash && (
        <SplashLoading isLoadingDb={false} onFinish={() => setShowSplash(false)} />
      )}

      {/* Signature Geometric Prism Background */}
      <ModernGeometricPrismBackground />

      <OfflineBanner />

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

      {/* إشعار لطيف بدون التفاف (nowrap) على شاشة الإدارة عند وصول بلاغ جديد */}
      {canAccessAdmin &&
        activeRole === 'admin' &&
        newAdminReportAlert &&
        !isReportSentToDepartment(newAdminReportAlert) && (
          <div className="fixed top-20 inset-x-0 z-[140] flex justify-center px-3 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md rounded-2xl bg-white/95 backdrop-blur-xl border border-sky-200/90 shadow-[0_14px_36px_rgba(14,116,144,0.16)] px-3.5 py-2.5 flex items-center flex-nowrap justify-between gap-2.5 transition-all overflow-hidden">
              <div className="flex items-center flex-nowrap gap-2.5 min-w-0 flex-1 overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 border border-sky-200/80 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex items-center flex-nowrap gap-1.5 whitespace-nowrap">
                    <span className="text-xs font-black text-[#1E3725] whitespace-nowrap">
                      {tr(
                        'بلاغ جديد وارد',
                        'سکاڵایەکی نوێ',
                        'New Report'
                      )}
                    </span>
                    <span
                      dir="ltr"
                      className="text-[10px] font-mono font-black text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/70 tabular-nums shrink-0 whitespace-nowrap"
                    >
                      {newAdminReportAlert.trackingCode}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-[#2D4833] truncate whitespace-nowrap mt-0.5">
                    {newAdminReportAlert.title} • {newAdminReportAlert.neighborhood}
                  </p>
                </div>
              </div>

              <div className="flex items-center flex-nowrap gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setSelectedReport(newAdminReportAlert);
                    dismissNewAdminReportAlert();
                  }}
                  title={tr(
                    'معاينة تفاصيل البلاغ',
                    'بینینی وردەکاری سکاڵا',
                    'View Report Details'
                  )}
                  aria-label={tr(
                    'معاينة تفاصيل البلاغ',
                    'بینینی وردەکاری سکاڵا',
                    'View Report Details'
                  )}
                  className="w-8 h-8 rounded-xl bg-[#46674D] hover:bg-[#36593F] text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer shrink-0"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    dismissNewAdminReportAlert();
                  }}
                  title={tr('إغلاق', 'داخستن', 'Close')}
                  aria-label={tr('إغلاق', 'داخستن', 'Close')}
                  className="w-8 h-8 rounded-xl bg-[#F4F9F5] hover:bg-[#E8F4EA] text-slate-500 hover:text-[#1E3725] border border-[#E8F4EA] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Top Glassmorphic Header */}
      <NavbarHeader
        onOpenDrawer={handleOpenDrawer}
        onSelectReport={setSelectedReport}
        onOpenSubmitReport={handleOpenSubmit}
      />

      {/* Main Content Area: Lazy-loaded Views with Suspense */}
      <Suspense fallback={<ViewLoadingFallback />}>
        {canAccessAdmin && isSurveysViewOpen ? (
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

      {/* PWA Install Prompt Banner */}
      <PwaInstallBanner />

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
