import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

interface PwaInstallBannerProps {
  installPrompt?: any;
  isSplashActive?: boolean;
}

export const PwaInstallBanner: React.FC<PwaInstallBannerProps> = ({
  installPrompt,
  isSplashActive = false,
}) => {
  const { language, isRTL } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(installPrompt || null);
  const [isIOS, setIsIOS] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [isDelayCompleted, setIsDelayCompleted] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    if (installPrompt) {
      setDeferredPrompt(installPrompt);
    }
  }, [installPrompt]);

  // إظهار شاشة طلب تثبيت التطبيق بعد انتهاء شاشة تحميل التطبيق بـ 2 ثانية (2000ms)
  useEffect(() => {
    if (isSplashActive) {
      setIsDelayCompleted(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setIsDelayCompleted(true);
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [isSplashActive]);

  useEffect(() => {
    // تنظيف أي إغلاق قديم محفوظ من التصميم السابق في المتصفح حتى يظهر المربع بعد التحميل الأولي
    try {
      localStorage.removeItem('baadre_pwa_dismissed');
    } catch {}

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);

    setShowBanner(true);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
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

    const activePrompt = deferredPrompt || installPrompt;
    if (activePrompt) {
      activePrompt.prompt();
      const choiceResult = await activePrompt.userChoice;
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
  };

  if (isInstalled || !showBanner || isSplashActive || !isDelayCompleted) return null;

  const installLabel =
    language === 'ar' ? 'التثبيت' : language === 'ku' ? 'داگرتن' : 'Install';

  return (
    <>
      <AnimatePresence>
        <motion.div
          dir={isRTL ? 'rtl' : 'ltr'}
          initial={{ scale: 0.88, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.88, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          className={`fixed bottom-24 sm:bottom-6 ${
            isRTL ? 'left-4' : 'right-4'
          } z-[130] w-36 h-36 sm:w-40 sm:h-40 rounded-3xl bg-white/95 backdrop-blur-xl border-2 border-rose-200/90 shadow-[0_16px_40px_rgba(225,29,72,0.22)] p-3 flex flex-col items-center justify-between text-center select-none`}
        >
          {/* زر الإغلاق X */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label={language === 'ar' ? 'إغلاق' : language === 'ku' ? 'داخستن' : 'Close'}
            className={`absolute top-2 ${
              isRTL ? 'left-2' : 'right-2'
            } w-6 h-6 rounded-full bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer`}
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          {/* شعار التطبيق */}
          <div className="mt-1 flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-2xl bg-rose-50/80 border border-rose-100 flex items-center justify-center p-1.5 shadow-2xs">
              <img
                src="/assets/aistudio/cave_baadre_logo.png"
                alt="ÇAVÊ BAADRÊ"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-[10px] font-black text-[#1E3725] tracking-tight line-clamp-1">
              ÇAVÊ BAADRÊ
            </span>
          </div>

          {/* زر واضح لكلمة التثبيت / Install باللون الأحمر مع أيقونة تحميل لطيفة */}
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full py-2 px-3 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/25 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2.5] animate-bounce" />
            <span>{installLabel}</span>
          </button>
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
                    ? 'تثبيت تطبيق ÇAVÊ BAADRÊ على الهاتف'
                    : language === 'ku'
                    ? 'داگرتنی ئەپی ÇAVÊ BAADRÊ بۆ مۆبایل'
                    : 'Install ÇAVÊ BAADRÊ on Mobile'}
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
                      اضغط <strong>إضافة (Add)</strong> وسيصبح تطبيق ÇAVÊ BAADRÊ جاهزاً على هاتفك.
                    </>
                  ) : language === 'ku' ? (
                    <>
                      کرتە لە <strong>Add</strong> بکە و ئەپی ÇAVÊ BAADRÊ ئامادە دەبێت.
                    </>
                  ) : (
                    <>
                      Tap <strong>Add</strong> and ÇAVÊ BAADRÊ will be ready on your home screen.
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
