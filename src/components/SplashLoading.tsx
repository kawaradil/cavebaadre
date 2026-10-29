import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AqqarAppIcon } from './AqqarAppIcon';
import { useColorTheme } from '../context/ColorContext';

interface SplashLoadingProps {
  isLoadingDb: boolean;
  onFinish: () => void;
}

export const SplashLoading: React.FC<SplashLoadingProps> = ({ isLoadingDb, onFinish }) => {
  const [minTimeElapsed, setMinTimeElapsed] = useState<boolean>(false);
  const { palette } = useColorTheme();

  useEffect(() => {
    // Longer splash duration for cinematic intro (2200ms)
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  // Dismiss splash smoothly once data is ready or safety limit reached
  useEffect(() => {
    if (minTimeElapsed && !isLoadingDb) {
      onFinish();
      return;
    }

    // Safety timeout: Maximum 3200ms on splash
    const safetyTimer = setTimeout(() => {
      onFinish();
    }, 3200);
    return () => clearTimeout(safetyTimer);
  }, [minTimeElapsed, isLoadingDb, onFinish]);

  return (
    <div
      id="splash-loading-screen"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white text-[#1E3725] overflow-hidden select-none"
    >
      {/* 1. Pure White Clean Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Base Light Canvas */}
        <div className="absolute inset-0 bg-white" />

        {/* Geometric Angular Facets & Diagonal Architectural Bands */}
        <svg
          className="absolute inset-0 w-full h-full object-cover opacity-65"
          viewBox="0 0 1000 1800"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="facet-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
              <stop offset="100%" stopColor={palette.bgTopTintHex} stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="facet-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={palette.primaryLightHex} stopOpacity="0.65" />
              <stop offset="100%" stopColor={palette.borderSoftHex} stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id="facet-grad-3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={palette.surfaceSoftHex} stopOpacity="0.9" />
              <stop offset="100%" stopColor={palette.bgMidTintHex} stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Stepped Geometric Chevron Facets (Upper & Middle Sections) */}
          <polygon points="0,0 480,0 200,320 0,320" fill="url(#facet-grad-1)" />
          <polygon points="0,180 180,180 520,0 720,0 320,440 0,440" fill="url(#facet-grad-2)" opacity="0.45" />

          {/* Stepped Diagonal Across Screen */}
          <polygon points="0,380 280,380 780,0 980,0 360,680 0,680" fill="url(#facet-grad-1)" />
          <polygon points="0,520 220,520 860,0 1000,0 1000,120 420,780 0,780" fill="url(#facet-grad-3)" />

          {/* Central Facets with Stepped Edges */}
          <polygon points="0,720 340,720 1000,160 1000,380 500,940 0,940" fill="url(#facet-grad-2)" opacity="0.6" />
          <polygon points="0,880 260,880 1000,420 1000,640 560,1120 0,1120" fill="url(#facet-grad-1)" />

          {/* Lower Diagonal Strata */}
          <polygon points="0,1060 380,1060 1000,680 1000,920 620,1320 0,1320" fill="url(#facet-grad-3)" opacity="0.75" />
          <polygon points="0,1240 300,1240 1000,940 1000,1180 680,1520 0,1520" fill="url(#facet-grad-2)" opacity="0.5" />
          <polygon points="0,1440 420,1440 1000,1200 1000,1460 740,1720 0,1720" fill="url(#facet-grad-1)" opacity="0.6" />
        </svg>

        {/* Radiant Ambient Lighting Glowing from the Bottom in Active Theme Colors */}
        <div 
          className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[850px] sm:w-[1100px] h-[550px] rounded-full blur-[140px] opacity-70 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at bottom, rgba(${palette.shadowRgb}, 0.45) 0%, rgba(${palette.shadowRgb}, 0.3) 35%, ${palette.primaryLightHex} 60%, transparent 80%)`
          }}
        />

        {/* Bottom Smooth Gradient Fade */}
        <div
          className="absolute inset-x-0 bottom-0 h-[40%] pointer-events-none"
          style={{
            background: `linear-gradient(to top, rgba(${palette.shadowRgb}, 0.22) 0%, rgba(${palette.shadowRgb}, 0.12) 20%, transparent 100%)`
          }}
        />

        {/* Bottom Subtle Accent Sheen Line */}
        <div 
          className="absolute inset-x-0 bottom-0 h-1.5 opacity-90"
          style={{
            background: `linear-gradient(90deg, ${palette.primaryHoverHex} 0%, ${palette.primaryHex} 25%, ${palette.accentHex} 50%, ${palette.primaryHex} 75%, ${palette.primaryHoverHex} 100%)`
          }}
        />
      </div>

      {/* Main Center Content: Fluffy Cloud Container + User Logo Image + Progress Bar */}
      <motion.div
        key="aqqar-splash-center"
        initial={{ opacity: 0, scale: 0.7, y: 30, filter: 'blur(8px)' }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-40 flex flex-col items-center justify-center pointer-events-auto px-6 py-8 bg-white/90 backdrop-blur-2xl rounded-[3rem] shadow-2xl border border-[#BBDDC6]/60"
      >
        {/* Clean, Theme-Harmonized, Transparent & Soft Logo Presentation */}
        <motion.div
          animate={{
            scale: [1, 1.025, 1],
            opacity: [0.97, 1, 0.97]
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="relative flex items-center justify-center py-2"
        >
          <AqqarAppIcon
            size="splash"
            variant="clean"
            showText={true}
            showSubtitle={true}
            subtitleText="SMART BAADRÊ EYE • عين باعدرى الذكية"
          />
        </motion.div>

        {/* Minimalist Smooth Progress Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mt-7 flex flex-col items-center gap-2.5"
        >
          <div className="w-36 sm:w-44 h-1 bg-[#46674D]/15 rounded-full overflow-hidden relative shadow-inner">
            <motion.div
              className="h-full bg-gradient-to-r from-[#2F5238] via-[#46674D] to-[#88B793] rounded-full"
              animate={{
                x: ['-100%', '100%']
              }}
              transition={{
                repeat: Infinity,
                duration: 1.3,
                ease: 'easeInOut'
              }}
            />
          </div>
          <span className="text-[10px] sm:text-[11px] font-semibold text-[#3E5E44] tracking-widest font-['Noto_Kufi_Arabic',sans-serif]">
            {isLoadingDb
              ? 'جاري تشغيل منصة باعدرى الذكية... • چاڤێ باعەدرێ'
              : 'SMART BAADRÊ EYE • چاڤێ باعەدرێ • عين باعدرى الذكية'}
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
};
