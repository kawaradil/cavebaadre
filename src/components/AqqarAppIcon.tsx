import React from 'react';
import { useColorTheme } from '../context/ColorContext';
import { BaadreEmblemLogo } from './BaadreEmblemLogo';

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
  variant = 'clean',
  showText = false,
  showSubtitle = false,
  subtitleText = 'چاڤێ باعدرێ • عين باعذرة',
  animated = false,
  className = ''
}) => {
  const { palette } = useColorTheme();

  const dimensions = {
    sm: {
      tile: 'w-10 h-10 rounded-xl p-1',
      logoSize: 'sm' as const,
      titleSize: 'text-xs tracking-[0.16em]',
      subSize: 'text-[8px] tracking-[0.08em]'
    },
    md: {
      tile: 'w-14 h-14 rounded-2xl p-1.5',
      logoSize: 'md' as const,
      titleSize: 'text-sm tracking-[0.18em]',
      subSize: 'text-[9px] tracking-[0.1em]'
    },
    lg: {
      tile: 'w-20 h-20 rounded-2xl p-2 shadow-lg',
      logoSize: 'lg' as const,
      titleSize: 'text-lg tracking-[0.2em]',
      subSize: 'text-[10px] tracking-[0.12em]'
    },
    xl: {
      tile: 'w-24 h-24 rounded-3xl p-2.5 shadow-xl',
      logoSize: 'xl' as const,
      titleSize: 'text-2xl tracking-[0.22em]',
      subSize: 'text-xs tracking-[0.14em]'
    },
    '2xl': {
      tile: 'w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-3 shadow-2xl',
      logoSize: 'xl' as const,
      titleSize: 'text-2xl sm:text-3xl tracking-[0.22em]',
      subSize: 'text-xs sm:text-sm tracking-[0.14em]'
    },
    splash: {
      tile: 'w-32 h-32 sm:w-40 sm:h-40 rounded-3xl p-4 shadow-2xl',
      logoSize: 'splash' as const,
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
          className={`relative flex items-center justify-center bg-white border border-[#BBDDC6]/50 shadow-md overflow-hidden transition-transform duration-300 hover:scale-105 ${dim.tile}`}
        >
          <BaadreEmblemLogo
            size={dim.logoSize}
            animateGear={animated}
            className="w-full h-full"
          />
        </div>
      ) : (
        <div className="relative flex items-center justify-center transition-transform duration-300 hover:scale-105">
          <BaadreEmblemLogo
            size={dim.logoSize}
            animateGear={animated}
          />
        </div>
      )}

      {showText && (
        <span
          className={`font-black uppercase leading-none font-['Montserrat',sans-serif] ${dim.titleSize} text-[#1B4368] mt-2.5`}
          style={{
            textShadow: `0 2px 10px rgba(${palette.shadowRgb}, 0.15)`
          }}
        >
          ÇAVÊ BAADRÊ
        </span>
      )}

      {showSubtitle && (
        <span
          className={`font-bold font-['Noto_Kufi_Arabic','Montserrat',sans-serif] text-[#2F5E84] mt-1.5 ${dim.subSize}`}
        >
          {subtitleText}
        </span>
      )}
    </div>
  );
};
