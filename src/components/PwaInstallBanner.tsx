import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

export const PwaInstallBanner: React.FC = () => {
  const { t, language } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);

    if (iosDevice) {
      const dismissed = localStorage.getItem('baadre_pwa_dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem('baadre_pwa_dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      setShowIOSModal(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('baadre_pwa_dismissed', 'true');
  };

  if (isInstalled || !showBanner) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="fixed bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-white/95 rounded-3xl p-3.5 shadow-[0_14px_38px_rgba(30,55,37,0.16)] backdrop-blur-md"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F4F9F5] flex items-center justify-center shrink-0 shadow-xs p-1.5 overflow-hidden">
                <img
                  src="/pwa-icon.svg"
                  alt="CAVE BAADRE Icon"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-start">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-black text-[#1E3725]">
                    {t('installPwaTitle')}
                  </h4>
                  <span className="text-[9px] bg-[#E8F4EA] text-[#46674D] font-bold px-2 py-0.5 rounded-full">
                    {language === 'ar'
                      ? 'مجاني'
                      : language === 'ku'
                      ? 'بێبەرامبەر'
                      : 'Free'}
                  </span>
                </div>
                <p className="text-[11px] text-[#2D4833] mt-0.5">
                  {t('installPwaDesc')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleInstallClick}
                className="py-2 px-3.5 rounded-2xl bg-[#46674D] hover:bg-[#3E5E44] text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-[#46674D]/20 active:scale-95 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t('installBtn')}</span>
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1.5 rounded-xl text-[#46674D] hover:text-[#1E3725] hover:bg-[#E8F4EA] transition-colors cursor-pointer"
                title={t('dismissBtn')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* iOS / Browser Installation Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E3725]/45 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-start shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E8F4EA] pb-3 mb-4">
              <h3 className="text-sm font-black text-[#1E3725] flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#46674D]" />
                <span>
                  {language === 'ar'
                    ? 'تثبيت تطبيق CAVE BAADRE على الهاتف'
                    : language === 'ku'
                    ? 'داگرتنی CAVE BAADRE بۆ مۆبایل'
                    : 'Install CAVE BAADRE on Mobile'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="p-1 text-[#46674D] hover:text-[#1E3725] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#2D4833]">
              <div className="flex items-start gap-2.5 bg-[#F4F9F5] p-3 rounded-2xl">
                <span className="w-5 h-5 rounded-full bg-[#46674D] text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <span>
                  {language === 'ar' ? (
                    <>
                      اضغط على زر{' '}
                      <strong>
                        المشاركة (Share{' '}
                        <Share className="w-3.5 h-3.5 inline text-[#46674D]" />)
                      </strong>{' '}
                      في متصفحك.
                    </>
                  ) : language === 'ku' ? (
                    <>
                      کرتە لەسەر دوگمەی{' '}
                      <strong>
                        هاوبەشکردن (Share{' '}
                        <Share className="w-3.5 h-3.5 inline text-[#46674D]" />)
                      </strong>{' '}
                      بکە.
                    </>
                  ) : (
                    <>
                      Tap the{' '}
                      <strong>
                        Share button (
                        <Share className="w-3.5 h-3.5 inline text-[#46674D]" />)
                      </strong>{' '}
                      in your browser.
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-start gap-2.5 bg-[#F4F9F5] p-3 rounded-2xl">
                <span className="w-5 h-5 rounded-full bg-[#46674D] text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <span>
                  {language === 'ar' ? (
                    <>
                      اختر{' '}
                      <strong>"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</strong>.
                    </>
                  ) : language === 'ku' ? (
                    <>
                      هەڵبژێرە <strong>"Add to Home Screen"</strong>.
                    </>
                  ) : (
                    <>
                      Select <strong>"Add to Home Screen"</strong>.
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-start gap-2.5 bg-[#F4F9F5] p-3 rounded-2xl">
                <span className="w-5 h-5 rounded-full bg-[#46674D] text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <span>
                  {language === 'ar' ? (
                    <>
                      اضغط <strong>إضافة (Add)</strong> وسيصبح تطبيق CAVE BAADRE جاهزاً على هاتفك.
                    </>
                  ) : language === 'ku' ? (
                    <>
                      کرتە لە <strong>Add</strong> بکە و ئەپی CAVE BAADRE ئامادە دەبێت.
                    </>
                  ) : (
                    <>
                      Tap <strong>Add</strong> and CAVE BAADRE will be ready on your home screen.
                    </>
                  )}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full py-3 rounded-2xl bg-[#46674D] hover:bg-[#3E5E44] text-white font-extrabold text-xs shadow-md shadow-[#46674D]/20 transition-all cursor-pointer"
            >
              {language === 'ar' ? 'فهمت ذلك' : language === 'ku' ? 'تێگەیشتم' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
