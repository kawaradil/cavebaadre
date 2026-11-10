import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useColorTheme } from '../context/ColorContext';

interface SplashLoadingProps {
  isLoadingDb: boolean;
  onFinish: () => void;
  isUpdatingApp?: boolean;
}

export const SplashLoading: React.FC<SplashLoadingProps> = ({
  isLoadingDb,
  onFinish,
  isUpdatingApp = false,
}) => {
  const { palette } = useColorTheme();
  const [minTimeElapsed, setMinTimeElapsed] = useState<boolean>(false);
  const [isExiting, setIsExiting] = useState<boolean>(false);

  useEffect(() => {
    // Fast, responsive intro duration (600ms) to ensure instantaneous feel
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  // Dismiss splash smoothly once data is ready or safety limit reached (unless currently updating)
  useEffect(() => {
    if (isUpdatingApp) {
      return;
    }

    if (minTimeElapsed && !isLoadingDb && !isExiting) {
      setIsExiting(true);
      const exitTimer = setTimeout(() => {
        onFinish();
      }, 350);
      return () => clearTimeout(exitTimer);
    }

    // Safety timeout: Maximum 1100ms on splash when not updating
    const safetyTimer = setTimeout(() => {
      if (!isExiting && !isUpdatingApp) {
        setIsExiting(true);
        setTimeout(() => onFinish(), 350);
      }
    }, 1100);

    return () => clearTimeout(safetyTimer);
  }, [minTimeElapsed, isLoadingDb, onFinish, isExiting, isUpdatingApp]);

  return (
    <AnimatePresence>
      {!isExiting ? (
        <motion.div
          id="splash-loading-screen"
          key="splash-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03, filter: 'blur(8px)' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#E7F2F5] text-[#1B3A46] overflow-hidden select-none px-6"
        >
          {/* Full-Screen Splash Background Image harmonized with active ColorContext palette */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <img
              src="/assets/aistudio/file_00000000a96882108a7b95ddc566c771_eb4ccf09.png"
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover object-bottom scale-[1.09] origin-bottom select-none pointer-events-none"
              style={{
                filter: palette.splashFilter,
              }}
              loading="eager"
            />
            {/* Dynamic theme tint layer matching ColorContext (Indigo Blue by default) */}
            <div
              className="absolute inset-0 mix-blend-color opacity-45"
              style={{
                background: `linear-gradient(180deg, ${palette.primaryHex} 0%, ${palette.gradientToHex} 50%, ${palette.primaryHex} 100%)`,
              }}
            />
            {/* Soft radial light behind the logo in the center-upper zone for seamless blending */}
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at 50% 42%, rgba(255,255,255,0.85) 0%, ${palette.surfaceSoftHex}66 38%, rgba(255,255,255,0) 70%)`,
              }}
            />
          </div>

          {/* ───────────────────────────────────────────────────────────
              HARMONIOUS CENTER-UPPER CONTENT (Positioned cleanly in the
              luminous sky zone above the bottom Baadre skyline illustration)
             ─────────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center justify-center text-center -mt-20 sm:-mt-24 max-w-md w-full"
          >
            {/* Harmonious Emblem Container with Subtle Halo */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex items-center justify-center mb-5 sm:mb-6"
            >
              <div className="absolute -inset-6 rounded-full bg-white/75 blur-2xl pointer-events-none" />
              <img
                src="/assets/aistudio/cave_baadre_logo.png"
                alt="ÇAVÊ BAADRÊ"
                className="relative w-44 sm:w-52 md:w-56 h-auto object-contain select-none pointer-events-none"
                style={{
                  filter:
                    palette.logoFilter && palette.logoFilter !== 'none'
                      ? `${palette.logoFilter} drop-shadow(0 14px 28px rgba(${palette.shadowRgb}, 0.24))`
                      : `drop-shadow(0 14px 28px rgba(${palette.shadowRgb}, 0.24))`,
                }}
                loading="eager"
              />
            </motion.div>

            {/* Typography 1: ÇAVÊ BAADRÊ (Harmonized with ColorContext Palette) */}
            <motion.h1
              dir="ltr"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.6 }}
              className="text-3xl sm:text-4xl md:text-[42px] font-black tracking-[0.09em] font-['Montserrat',sans-serif] text-transparent bg-clip-text bg-gradient-to-b from-[#1B3A46] via-[#3B6878] to-[#58899A]"
            >
              ÇAVÊ BAADRÊ
            </motion.h1>

            {/* Typography 2: چاڤێ باعدرێ • عين باعذرة */}
            <motion.h2
              dir="rtl"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mt-2.5 sm:mt-3 text-lg sm:text-xl md:text-2xl font-black text-[#285060] tracking-wide font-['Noto_Kufi_Arabic','Cairo',sans-serif] flex items-center justify-center gap-2.5 drop-shadow-[0_1px_4px_rgba(255,255,255,0.9)]"
            >
              <bdi>چاڤێ باعدرێ</bdi>
              <span className="text-[#58899A] text-base leading-none">•</span>
              <bdi>عين باعذرة</bdi>
            </motion.h2>

            {/* Harmonious Spinner & Organization Subtitle (Above the bottom skyline) */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42, duration: 0.6 }}
              className="mt-7 sm:mt-8 flex flex-col items-center justify-center text-center space-y-2"
            >
              {/* Dynamic Theme Circular Arc Spinner */}
              <div className="relative w-9 h-9 flex items-center justify-center mb-1">
                <svg
                  className="w-9 h-9 animate-spin"
                  viewBox="0 0 44 44"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="22"
                    cy="22"
                    r="17"
                    stroke={`rgba(${palette.shadowRgb}, 0.22)`}
                    strokeWidth="3.5"
                  />
                  <path
                    d="M 22 5 A 17 17 0 1 1 5 22"
                    stroke={palette.primaryHex}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {isUpdatingApp ? (
                <div className="space-y-1 animate-pulse">
                  <p
                    dir="rtl"
                    className="text-xs sm:text-sm font-black text-[#1E8E93] bg-white/80 px-3.5 py-1.5 rounded-full shadow-xs tracking-normal"
                  >
                    جاري تحديث التطبيق إلى الإصدار الجديد...
                  </p>
                  <p
                    dir="ltr"
                    className="text-[10px] sm:text-[11px] font-bold text-[#195D73]"
                  >
                    Updating to latest version...
                  </p>
                </div>
              ) : (
                <>
                  <p
                    dir="rtl"
                    className="text-xs sm:text-sm font-black text-[#1B3A46] font-['Noto_Kufi_Arabic','Cairo',sans-serif] tracking-normal drop-shadow-[0_1px_4px_rgba(255,255,255,0.9)]"
                  >
                    تطبيق الخدمات المجتمعية
                  </p>

                  <p
                    dir="ltr"
                    className="text-[11px] sm:text-xs font-bold uppercase text-[#3B6878] font-['Montserrat',sans-serif] tracking-[0.18em]"
                  >
                    RABA ORGANIZATION
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
