import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, CloudOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

export const OfflineBanner: React.FC = () => {
  const { t, language } = useLanguage();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showRestoredToast, setShowRestoredToast] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestoredToast(true);
      const timer = setTimeout(() => {
        setShowRestoredToast(false);
      }, 4500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleCheckConnection = () => {
    setIsChecking(true);
    setTimeout(() => {
      setIsChecking(false);
      setIsOnline(navigator.onLine);
    }, 800);
  };

  return (
    <>
      {/* Offline Blocking Overlay & Banner */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 font-['Noto_Kufi_Arabic',sans-serif]"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-white dark:bg-[#131C31] border border-amber-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl shadow-amber-950/20"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-5 border border-amber-500/30 shadow-inner">
                <WifiOff className="w-8 h-8 animate-bounce" />
              </div>

              <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 inline-block mb-3">
                {language === 'ar' ? 'تنبيه انقطاع الاتصال' : language === 'ku' ? 'ئاگاداری پچڕانی هێڵ' : 'Connection Alert'}
              </span>

              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-2">
                {t('offlineNotice')}
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                {t('offlineNoticeDesc')}
              </p>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleCheckConnection}
                  disabled={isChecking}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-70 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>
                    {isChecking
                      ? (language === 'ar' ? 'جاري التحقق من الاتصال...' : language === 'ku' ? 'پشکنینی هێڵ...' : 'Checking connection...')
                      : (language === 'ar' ? 'إعادة محاولة الاتصال' : language === 'ku' ? 'دووبارە هەوڵدانەوە' : 'Retry Connection')}
                  </span>
                </button>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400">
                {language === 'ar' 
                  ? 'سيتم استئناف العمل تلقائياً بمجرد عودة الاتصال بالإنترنت.' 
                  : language === 'ku' 
                  ? 'بە شێوەیەکی خۆکار کار دەکاتەوە هەر کە ئینتەرنێت گەڕایەوە.' 
                  : 'Operations will resume automatically once connection is restored.'}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Online Restored Toast */}
      <AnimatePresence>
        {showRestoredToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-400/30 font-['Noto_Kufi_Arabic',sans-serif]"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
              <Wifi className="w-4 h-4 text-white" />
            </div>
            <div>
              <h5 className="text-xs font-black">
                {language === 'ar' ? 'تمت استعادة الاتصال!' : language === 'ku' ? 'هێڵی ئینتەرنێت گەڕایەوە!' : 'Connection Restored!'}
              </h5>
              <p className="text-[11px] text-emerald-100">
                {language === 'ar' ? 'يعمل التطبيق الآن بكامل طاقته ومزامنة البيانات.' : language === 'ku' ? 'بەرنامەکە ئێستا بە تەواوی ئیش دەکات.' : 'App is now fully online and syncing.'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
