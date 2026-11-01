import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SplashLoadingProps {
  isLoadingDb: boolean;
  onFinish: () => void;
}

export const SplashLoading: React.FC<SplashLoadingProps> = ({ isLoadingDb, onFinish }) => {
  const [minTimeElapsed, setMinTimeElapsed] = useState<boolean>(false);
  const [isExiting, setIsExiting] = useState<boolean>(false);

  useEffect(() => {
    // Cinematic intro duration (2200ms)
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  // Dismiss splash smoothly once data is ready or safety limit reached
  useEffect(() => {
    if (minTimeElapsed && !isLoadingDb && !isExiting) {
      setIsExiting(true);
      const exitTimer = setTimeout(() => {
        onFinish();
      }, 550);
      return () => clearTimeout(exitTimer);
    }

    // Safety timeout: Maximum 3400ms on splash
    const safetyTimer = setTimeout(() => {
      if (!isExiting) {
        setIsExiting(true);
        setTimeout(() => onFinish(), 550);
      }
    }, 3400);

    return () => clearTimeout(safetyTimer);
  }, [minTimeElapsed, isLoadingDb, onFinish, isExiting]);

  return (
    <AnimatePresence>
      {!isExiting ? (
        <motion.div
          id="splash-loading-screen"
          key="splash-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03, filter: 'blur(8px)' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col justify-between items-center bg-white text-[#183654] overflow-hidden select-none px-6 py-10 sm:py-14"
        >
          {/* Subtle Ambient Top/Bottom Sheen */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white via-white to-[#F4F9FD]/60" />

          {/* Spacer for vertical balance */}
          <div className="h-4 sm:h-8" />

          {/* ───────────────────────────────────────────────────────────
              CENTER SECTION: Exact Mockup Match
              1. Emblem with Animated Maintenance Gear (العنصر الدائري للصيانة والخدمات)
              2. Title: ÇAVÊ BAADRÊ
              3. Subtitle: چاڤێ باعدرێ • عين باعذرة
             ─────────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center justify-center text-center my-auto"
          >
            {/* Official Logo Image: Static image appearing gently */}
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex items-center justify-center mb-6 sm:mb-8"
            >
              <img
                src="/assets/aistudio/cave_baadre_logo.png"
                alt="ÇAVÊ BAADRÊ"
                className="w-56 sm:w-64 h-auto object-contain select-none pointer-events-none"
                loading="eager"
              />
            </motion.div>

            {/* Typography 1: ÇAVÊ BAADRÊ (Glossy 3D Blue Gradient) */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="text-3xl sm:text-4xl md:text-5xl font-black tracking-[0.08em] font-['Montserrat',sans-serif] text-transparent bg-clip-text bg-gradient-to-b from-[#2B577B] via-[#1F4566] to-[#122F4A] drop-shadow-[0_2px_4px_rgba(20,55,90,0.18)]"
            >
              ÇAVÊ BAADRÊ
            </motion.h1>

            {/* Typography 2: چاڤێ باعدرێ • عين باعذرة */}
            <motion.h2
              dir="rtl"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38, duration: 0.6 }}
              className="mt-3 sm:mt-4 text-xl sm:text-2xl md:text-[26px] font-black text-[#2E5E83] tracking-wide font-['Noto_Kufi_Arabic','Cairo',sans-serif] flex items-center justify-center gap-2 drop-shadow-xs"
            >
              <span>چاڤێ باعدرێ</span>
              <span className="text-[#38B6FF] text-base leading-none">•</span>
              <span>عين باعذرة</span>
            </motion.h2>
          </motion.div>

          {/* ───────────────────────────────────────────────────────────
              BOTTOM SECTION: Exact Mockup Match
              1. Cyan Open Circle Spinner (C-shape Loader)
              2. تطبيق الخدمات المجتمعية
              3. Raba organization
             ─────────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="relative z-10 flex flex-col items-center justify-center text-center pb-2 sm:pb-6 space-y-3"
          >
            {/* The Cyan Circular Arc Spinner */}
            <div className="relative w-10 h-10 flex items-center justify-center mb-1">
              <svg
                className="w-10 h-10 animate-spin"
                viewBox="0 0 44 44"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Background faint guide track */}
                <circle
                  cx="22"
                  cy="22"
                  r="17"
                  stroke="#E2EEF7"
                  strokeWidth="3.5"
                />
                {/* Vibrant Cyan Active Arc */}
                <path
                  d="M 22 5 A 17 17 0 1 1 5 22"
                  stroke="#38B6FF"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Community Services Application */}
            <p
              dir="rtl"
              className="text-xs sm:text-sm font-bold text-[#1E4368] font-['Noto_Kufi_Arabic','Cairo',sans-serif] tracking-normal"
            >
              تطبيق الخدمات المجتمعية
            </p>

            {/* Raba organization */}
            <p className="text-xs sm:text-sm font-medium text-[#2A557C] font-['Montserrat',sans-serif] tracking-wider">
              Raba organization
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
