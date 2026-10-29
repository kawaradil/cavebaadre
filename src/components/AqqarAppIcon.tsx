import React from 'react';
import { useColorTheme } from '../context/ColorContext';

interface AqqarAppIconProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'splash';
  variant?: 'tile' | 'clean';
  showText?: boolean;
  showSubtitle?: boolean;
  subtitleText?: string;
  animated?: boolean;
  className?: string;
}

export const AqqarAppIcon: React.FC<AqqarAppIconProps> = ({
  size = 'md',
  variant = 'tile',
  showText = false,
  showSubtitle = false,
  subtitleText = 'SMART BAADRÊ EYE • عين باعدرى الذكية',
  animated = false,
  className = ''
}) => {
  const { palette } = useColorTheme();

  const dimensions = {
    sm: {
      tile: 'w-10 h-10 rounded-xl p-1.5',
      roofWidth: 26,
      roofHeight: 14,
      titleSize: 'text-xs tracking-[0.16em]',
      subSize: 'text-[8px] tracking-[0.08em]'
    },
    md: {
      tile: 'w-14 h-14 rounded-2xl p-2',
      roofWidth: 38,
      roofHeight: 20,
      titleSize: 'text-sm tracking-[0.18em]',
      subSize: 'text-[9px] tracking-[0.1em]'
    },
    lg: {
      tile: 'w-20 h-20 rounded-2xl p-2.5 shadow-lg',
      roofWidth: 54,
      roofHeight: 28,
      titleSize: 'text-lg tracking-[0.2em]',
      subSize: 'text-[10px] tracking-[0.12em]'
    },
    xl: {
      tile: 'w-24 h-24 rounded-3xl p-3 shadow-xl',
      roofWidth: 68,
      roofHeight: 36,
      titleSize: 'text-2xl tracking-[0.22em]',
      subSize: 'text-xs tracking-[0.14em]'
    },
    '2xl': {
      tile: 'w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-4 shadow-2xl',
      roofWidth: 84,
      roofHeight: 44,
      titleSize: 'text-2xl sm:text-3xl tracking-[0.22em]',
      subSize: 'text-xs sm:text-sm tracking-[0.14em]'
    },
    splash: {
      tile: 'w-28 h-28 sm:w-36 sm:h-36 rounded-3xl p-4 sm:p-5 shadow-2xl',
      roofWidth: 96,
      roofHeight: 52,
      titleSize: 'text-2xl sm:text-4xl tracking-[0.22em]',
      subSize: 'text-xs sm:text-sm tracking-[0.14em]'
    }
  };

  const dim = dimensions[size];

  return (
    <div
      className={`flex flex-col items-center justify-center text-center select-none ${
        animated ? 'animate-pulse' : ''
      } ${className}`}
    >
      {variant === 'tile' ? (
        <div
          className={`relative flex items-center justify-center bg-gradient-to-br from-[#46674D] via-[#2D4833] to-[#1E3725] border border-white/20 shadow-xl overflow-hidden transition-transform duration-300 hover:scale-105 ${dim.tile}`}
        >
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
          <svg
            width={dim.roofWidth * 1.5}
            height={dim.roofHeight * 1.6}
            viewBox="0 0 160 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="relative z-10 drop-shadow-xl"
          >
            <defs>
              <linearGradient id="eye-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="50%" stopColor={palette.primaryLightHex} />
                <stop offset="100%" stopColor={palette.borderSoftHex} />
              </linearGradient>
              <linearGradient id="eye-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={palette.primaryLightHex} />
                <stop offset="100%" stopColor={palette.accentHex} />
              </linearGradient>
            </defs>
            {/* Outer Smart Civic Eye Contour */}
            <path
              d="M 16 50 Q 80 6 144 50 Q 80 94 16 50 Z"
              stroke="url(#eye-grad-1)"
              strokeWidth="7"
              fill="rgba(255,255,255,0.08)"
            />
            {/* Inner Municipal Iris & Location Pin */}
            <circle cx="80" cy="50" r="22" fill="url(#eye-gold)" />
            <circle cx="80" cy="50" r="10" fill={palette.primaryTextHex} />
            <circle cx="86" cy="44" r="3.5" fill="#FFFFFF" />
          </svg>
        </div>
      ) : (
        <div className="relative flex items-center justify-center">
          <svg
            width={dim.roofWidth * 1.55}
            height={dim.roofHeight * 1.65}
            viewBox="0 0 160 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="transition-transform duration-300 hover:scale-105 drop-shadow-md"
          >
            <defs>
              <linearGradient id="clean-eye-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={palette.primaryHex} />
                <stop offset="100%" stopColor={palette.primaryTextHex} />
              </linearGradient>
              <linearGradient id="clean-eye-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={palette.accentHex} />
                <stop offset="100%" stopColor={palette.primaryHex} />
              </linearGradient>
            </defs>
            {/* Smart Civic Eye Arch */}
            <path
              d="M 16 50 Q 80 6 144 50 Q 80 94 16 50 Z"
              stroke="url(#clean-eye-1)"
              strokeWidth="8"
              fill={`rgba(${palette.shadowRgb}, 0.08)`}
            />
            <circle cx="80" cy="50" r="23" fill="url(#clean-eye-1)" />
            <circle cx="80" cy="50" r="12" fill="url(#clean-eye-gold)" />
            <circle cx="85" cy="45" r="4" fill="#FFFFFF" />
          </svg>
        </div>
      )}

      {showText && (
        <span
          className={`font-black uppercase leading-none font-['Montserrat',sans-serif] ${dim.titleSize} ${
            variant === 'tile' ? 'text-[#223E2A] mt-3' : 'text-[#46674D] mt-2.5'
          }`}
          style={{
            textShadow: `0 2px 10px rgba(${palette.shadowRgb}, 0.15)`
          }}
        >
          CAVE BAADRE
        </span>
      )}

      {showSubtitle && (
        <span
          className={`font-bold font-['Noto_Kufi_Arabic','Montserrat',sans-serif] text-[#46674D] mt-1.5 ${dim.subSize}`}
        >
          {subtitleText}
        </span>
      )}
    </div>
  );
};
