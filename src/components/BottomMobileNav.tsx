import React from 'react';
import {
  Plus,
  QrCode,
  ClipboardList,
  BarChart3,
  Users,
  Briefcase,
} from 'lucide-react';
import { useBaadre } from '../context/BaadreContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { playClickSound } from '../lib/sound';

interface BottomMobileNavProps {
  onOpenAddProperty?: () => void;
  onOpenSubmitReport?: () => void;
}

export const BottomMobileNav: React.FC<BottomMobileNavProps> = ({
  onOpenAddProperty,
  onOpenSubmitReport,
}) => {
  const { language } = useLanguage();
  const { currentUser, isAdmin, isSuperAdmin, isLoggedIn, openAuthModal } = useAuth();
  const {
    activeRole,
    citizenTab,
    setCitizenTab,
    adminTab,
    setAdminTab,
    setIsSurveysViewOpen,
    isStartScreenActive,
  } = useBaadre();

  const canAccessAdmin = Boolean(currentUser && (isAdmin || isSuperAdmin));

  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

  const handleOpenAdd = () => {
    if (!isLoggedIn) {
      openAuthModal('login');
      return;
    }
    if (onOpenSubmitReport) onOpenSubmitReport();
    else if (onOpenAddProperty) onOpenAddProperty();
  };

  // Unified text styling across Kurdish, Arabic, and English to ensure identical bar dimensions and proportions
  const navTextClass = 'text-[10px] font-black leading-tight text-center truncate max-w-full px-0.5 mt-0.5';
  const adminNavTextClass = 'text-[10px] font-black leading-tight text-center truncate max-w-full px-0.5 mt-0.5';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 pointer-events-none">
      {/* الشريط السفلي مطابق للشريط العلوي بتدرج شفاف وإضاءة ناعمة */}
      <div className="mx-auto bg-gradient-to-r from-[#467586]/55 via-[#58899A]/35 to-[#6C9DAE]/55 backdrop-blur-md border border-white/50 rounded-3xl shadow-[0_8px_28px_rgba(30,142,147,0.16)] px-3 py-1.5 flex items-center max-w-sm justify-around pointer-events-auto relative overflow-hidden">
        {/* Subtle luminous center glow matching NavbarHeader */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.52) 0%, rgba(255,255,255,0.15) 52%, transparent 82%)',
          }}
        />

        {activeRole === 'citizen' || !canAccessAdmin ? (
          <>
            {/* 1. Completed Works (الأعمال المنجزة) */}
            <button
              onClick={() => {
                playClickSound();
                setIsSurveysViewOpen(false);
                setCitizenTab('works');
              }}
              className={`relative z-10 flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all cursor-pointer ${
                !isStartScreenActive && (citizenTab === 'works' || citizenTab === 'projects')
                  ? 'bg-white/85 text-[#0E3544] font-black shadow-2xs'
                  : 'text-[#0E3544] hover:bg-white/55'
              }`}
            >
              <Briefcase
                className={`w-5 h-5 ${
                  !isStartScreenActive && (citizenTab === 'works' || citizenTab === 'projects')
                    ? 'stroke-[2.5] text-[#0E3544]'
                    : 'stroke-[2] text-[#0E3544]'
                }`}
              />
              <span className={navTextClass}>
                {tr('الأعمال المنجزة', 'کارە تەواوکراوەکان', 'Completed')}
              </span>
            </button>

            {/* 2. Center Add Report Button */}
            <div className="relative z-10 px-2">
              <button
                onClick={() => {
                  playClickSound();
                  handleOpenAdd();
                }}
                aria-label={tr('إضافة بلاغ جديد', 'زیادکردنی سکاڵا', 'Add New Report')}
                title={tr('إضافة بلاغ جديد', 'زیادکردنی سکاڵا', 'Add New Report')}
                className="w-11 h-11 rounded-2xl bg-gradient-to-r from-[#467586] to-[#58899A] hover:from-[#3B6878] hover:to-[#467586] active:scale-95 text-white flex items-center justify-center shadow-[0_4px_14px_rgba(30,142,147,0.28)] transition-all cursor-pointer border border-white/40 outline-none group"
              >
                <Plus className="w-6 h-6 stroke-[3] text-white transition-transform duration-200 group-hover:rotate-90 group-hover:scale-110" />
              </button>
            </div>

            {/* 3. Track My Reports (تتبع بلاغاتي) */}
            <button
              onClick={() => {
                playClickSound();
                setIsSurveysViewOpen(false);
                setCitizenTab('track');
              }}
              className={`relative z-10 flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all cursor-pointer ${
                !isStartScreenActive && (citizenTab === 'track' || citizenTab === 'home')
                  ? 'bg-white/85 text-[#0E3544] font-black shadow-2xs'
                  : 'text-[#0E3544] hover:bg-white/55'
              }`}
            >
              <QrCode
                className={`w-5 h-5 ${
                  !isStartScreenActive && (citizenTab === 'track' || citizenTab === 'home')
                    ? 'stroke-[2.5] text-[#0E3544]'
                    : 'stroke-[2] text-[#0E3544]'
                }`}
              />
              <span className={navTextClass}>
                {tr('تتبع بلاغاتي', 'سکاڵاکانم', 'My Reports')}
              </span>
            </button>
          </>
        ) : (
          <>
            {/* Admin Bottom Nav: 1. الإحصاءات, 2. البلاغات, 3. الأعمال المنجزة */}
            <button
              onClick={() => {
                playClickSound();
                setIsSurveysViewOpen(false);
                setAdminTab('analytics');
              }}
              className={`relative z-10 flex-1 flex flex-col items-center justify-center py-1.5 px-1.5 rounded-2xl transition-all cursor-pointer ${
                !isStartScreenActive && adminTab === 'analytics'
                  ? 'bg-white/85 text-[#0E3544] font-black shadow-2xs'
                  : 'text-[#0E3544] hover:bg-white/55'
              }`}
            >
              <BarChart3
                className={`w-5 h-5 ${
                  !isStartScreenActive && adminTab === 'analytics'
                    ? 'stroke-[2.5] text-[#0E3544]'
                    : 'stroke-[2] text-[#0E3544]'
                }`}
              />
              <span className={adminNavTextClass}>
                {tr('الإحصاءات', 'ئامارەکان', 'Analytics')}
              </span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                setIsSurveysViewOpen(false);
                setAdminTab('active_reports');
              }}
              className={`relative z-10 flex-1 flex flex-col items-center justify-center py-1.5 px-1.5 rounded-2xl transition-all cursor-pointer ${
                !isStartScreenActive && adminTab === 'active_reports'
                  ? 'bg-white/85 text-[#0E3544] font-black shadow-2xs'
                  : 'text-[#0E3544] hover:bg-white/55'
              }`}
            >
              <ClipboardList
                className={`w-5 h-5 ${
                  !isStartScreenActive && adminTab === 'active_reports'
                    ? 'stroke-[2.5] text-[#0E3544]'
                    : 'stroke-[2] text-[#0E3544]'
                }`}
              />
              <span className={adminNavTextClass}>
                {tr('البلاغات', 'سکاڵاکان', 'Reports')}
              </span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                setIsSurveysViewOpen(false);
                setAdminTab('projects');
              }}
              className={`relative z-10 flex-1 flex flex-col items-center justify-center py-1.5 px-1.5 rounded-2xl transition-all cursor-pointer ${
                !isStartScreenActive && adminTab === 'projects'
                  ? 'bg-white/85 text-[#0E3544] font-black shadow-2xs'
                  : 'text-[#0E3544] hover:bg-white/55'
              }`}
            >
              <Briefcase
                className={`w-5 h-5 ${
                  !isStartScreenActive && adminTab === 'projects'
                    ? 'stroke-[2.5] text-[#0E3544]'
                    : 'stroke-[2] text-[#0E3544]'
                }`}
              />
              <span className={adminNavTextClass}>
                {tr('الأعمال المنجزة', 'کارە تەواوکراوەکان', 'Completed')}
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

