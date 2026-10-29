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
  const {
    activeRole,
    citizenTab,
    setCitizenTab,
    adminTab,
    setAdminTab,
    setIsSurveysViewOpen,
  } = useBaadre();

  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

  const handleOpenAdd = () => {
    if (onOpenSubmitReport) onOpenSubmitReport();
    else if (onOpenAddProperty) onOpenAddProperty();
  };

  // Dynamic text size classes when language is Kurdish
  const navTextClass = language === 'ku' ? 'text-[8.5px] font-bold tracking-tight' : 'text-[10px] font-black';
  const adminNavTextClass = language === 'ku' ? 'text-[7.5px] leading-tight font-bold tracking-tighter' : 'text-[10px] font-black';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 pointer-events-none">
      {/* الشريط السفلي أبيض شفاف (Transparent White) بدون إطارات وبحواف ناعمة */}
      <div className={`mx-auto bg-white/70 backdrop-blur-xl border-0 rounded-3xl shadow-[0_8px_30px_rgba(30,55,37,0.10)] px-3 py-1.5 flex items-center ${activeRole === 'citizen' ? 'max-w-sm justify-around' : 'max-w-md justify-around'} pointer-events-auto relative`}>
        {activeRole === 'citizen' ? (
          <>
            {/* 1. Completed Works (الأعمال المنجزة) */}
            <button
              onClick={() => {
                playClickSound();
                setIsSurveysViewOpen(false);
                setCitizenTab('works');
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all cursor-pointer ${
                citizenTab === 'works' || citizenTab === 'projects'
                  ? 'bg-[#E8F4EA] text-[#1E3725] font-black'
                  : 'text-[#46674D] hover:bg-white/60'
              }`}
            >
              <Briefcase
                className={`w-5 h-5 ${
                  citizenTab === 'works' || citizenTab === 'projects'
                    ? 'stroke-[2.5] text-[#46674D]'
                    : 'stroke-[1.8]'
                }`}
              />
              <span className={`${navTextClass} mt-0.5 text-center`}>
                {tr('الأعمال المنجزة', 'کارە تەواوکراوەکان', 'Completed')}
              </span>
            </button>

            {/* 2. Center Add Report Button (داخل الشريط، ألوان خفيفة، حواف غير قائمة، فقط علامة + بارز) */}
            <div className="px-2">
              <button
                onClick={() => {
                  playClickSound();
                  handleOpenAdd();
                }}
                aria-label={tr('إضافة بلاغ جديد', 'زیادکردنی سکاڵا', 'Add New Report')}
                title={tr('إضافة بلاغ جديد', 'زیادکردنی سکاڵا', 'Add New Report')}
                className="w-11 h-11 rounded-2xl bg-[#E8F4EA] hover:bg-[#D8EDDC] active:scale-95 text-[#2D4833] flex items-center justify-center shadow-xs transition-all cursor-pointer border-0 outline-none group"
              >
                <Plus className="w-6.5 h-6.5 stroke-[3] text-[#2D4833] transition-transform duration-200 group-hover:rotate-90 group-hover:scale-110" />
              </button>
            </div>

            {/* 3. Track My Reports (تتبع بلاغاتي) */}
            <button
              onClick={() => {
                playClickSound();
                setIsSurveysViewOpen(false);
                setCitizenTab('track');
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all cursor-pointer ${
                citizenTab === 'track' || citizenTab === 'home'
                  ? 'bg-[#E8F4EA] text-[#1E3725] font-black'
                  : 'text-[#46674D] hover:bg-white/60'
              }`}
            >
              <QrCode
                className={`w-5 h-5 ${
                  citizenTab === 'track' || citizenTab === 'home'
                    ? 'stroke-[2.5] text-[#46674D]'
                    : 'stroke-[1.8]'
                }`}
              />
              <span className={`${navTextClass} mt-0.5 text-center`}>
                {tr('تتبع بلاغاتي', 'سکاڵاکانم', 'My Reports')}
              </span>
            </button>
          </>
        ) : (
          <>
            {/* Admin Bottom Nav Order:
               1. الإحصاءات (Analytics)
               2. البلاغات (Active Reports)
               3. الأعمال المنجزة (Projects)
               4. الدوائر والمواطنين (Directory)
            */}
            {/* Admin Bottom Nav Tabs - مطابقة تماماً لتصميم حساب المواطن بألوان خفيفة وحواف ناعمة */}
            <button
              onClick={() => {
                playClickSound();
                setIsSurveysViewOpen(false);
                setAdminTab('analytics');
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer ${
                adminTab === 'analytics'
                  ? 'bg-[#E8F4EA] text-[#1E3725] font-black'
                  : 'text-[#46674D] hover:bg-white/60'
              }`}
            >
              <BarChart3
                className={`w-4.5 h-4.5 ${
                  adminTab === 'analytics' ? 'stroke-[2.5] text-[#46674D]' : 'stroke-[1.8]'
                }`}
              />
              <span className={`${adminNavTextClass} mt-0.5 text-center truncate max-w-full px-0.5`}>
                {tr('الإحصاءات', 'ئامارەکان', 'Analytics')}
              </span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                setIsSurveysViewOpen(false);
                setAdminTab('active_reports');
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer ${
                adminTab === 'active_reports'
                  ? 'bg-[#E8F4EA] text-[#1E3725] font-black'
                  : 'text-[#46674D] hover:bg-white/60'
              }`}
            >
              <ClipboardList
                className={`w-4.5 h-4.5 ${
                  adminTab === 'active_reports' ? 'stroke-[2.5] text-[#46674D]' : 'stroke-[1.8]'
                }`}
              />
              <span className={`${adminNavTextClass} mt-0.5 text-center truncate max-w-full px-0.5`}>
                {tr('البلاغات', 'سکاڵاکان', 'Reports')}
              </span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                setIsSurveysViewOpen(false);
                setAdminTab('projects');
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer ${
                adminTab === 'projects'
                  ? 'bg-[#E8F4EA] text-[#1E3725] font-black'
                  : 'text-[#46674D] hover:bg-white/60'
              }`}
            >
              <Briefcase
                className={`w-4.5 h-4.5 ${
                  adminTab === 'projects' ? 'stroke-[2.5] text-[#46674D]' : 'stroke-[1.8]'
                }`}
              />
              <span className={`${adminNavTextClass} mt-0.5 text-center truncate max-w-full px-0.5`}>
                {tr('الأعمال المنجزة', 'کارە تەواوکراوەکان', 'Completed')}
              </span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                setIsSurveysViewOpen(false);
                setAdminTab('directory');
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer ${
                adminTab === 'directory' || adminTab === 'departments_directory'
                  ? 'bg-[#E8F4EA] text-[#1E3725] font-black'
                  : 'text-[#46674D] hover:bg-white/60'
              }`}
            >
              <Users
                className={`w-4.5 h-4.5 ${
                  adminTab === 'directory' || adminTab === 'departments_directory'
                    ? 'stroke-[2.5] text-[#46674D]'
                    : 'stroke-[1.8]'
                }`}
              />
              <span className={`${adminNavTextClass} mt-0.5 text-center truncate max-w-full px-0.5`}>
                {tr('الدوائر والمواطنين', 'فەرمانگە و هاووڵاتیان', 'Directory')}
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

