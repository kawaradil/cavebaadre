import React from 'react';
import { useColorTheme } from '../context/ColorContext';

interface ModernGeometricPrismBackgroundProps {
  className?: string;
}

export const ModernGeometricPrismBackground: React.FC<ModernGeometricPrismBackgroundProps> = React.memo(({ className = '' }) => {
  const { palette } = useColorTheme();

  return (
    <div 
      className={`fixed inset-0 overflow-hidden pointer-events-none z-0 ${className}`}
      aria-hidden="true"
    >
      <svg
        className="absolute inset-0 w-full h-full object-cover select-none transition-opacity duration-700"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1080 1920"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* ================= LIGHT MODE: DYNAMIC COLOR CONTEXT THEME ================= */}
          <linearGradient id="appGreenWhiteGrayLight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={palette.bgTopTintHex} />
            <stop offset="18%" stopColor={palette.bgMidTintHex} />
            <stop offset="38%" stopColor={palette.bgSoftTintHex} />
            <stop offset="58%" stopColor="#FFFFFF" />
            <stop offset="78%" stopColor={palette.surfaceSoftHex} />
            <stop offset="92%" stopColor={palette.bgSoftTintHex} />
            <stop offset="100%" stopColor={palette.primaryLightHex} />
          </linearGradient>

          {/* Top Enhanced Theme Radiance for Rich Depth at Top */}
          <linearGradient id="topRadianceGreen" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor={palette.borderSoftHex} stopOpacity="0.65" />
            <stop offset="25%" stopColor={palette.bgTopTintHex} stopOpacity="0.35" />
            <stop offset="55%" stopColor={palette.primaryLightHex} stopOpacity="0.12" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
          </linearGradient>

          {/* Diagonal Angular Facets in Crisp White, Theme Sheen and Soft Mist */}
          <linearGradient id="facetGreen1Light" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="45%" stopColor={palette.bgTopTintHex} stopOpacity="0.45" />
            <stop offset="85%" stopColor={palette.primaryLightHex} stopOpacity="0.2" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
          </linearGradient>

          <linearGradient id="facetGreen2Light" x1="80%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="40%" stopColor={palette.borderSoftHex} stopOpacity="0.5" />
            <stop offset="80%" stopColor={palette.bgMidTintHex} stopOpacity="0.2" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
          </linearGradient>

          <linearGradient id="facetGreen3Light" x1="100%" y1="20%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={palette.primaryLightHex} stopOpacity="0.6" />
            <stop offset="50%" stopColor={palette.surfaceSoftHex} stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
          </linearGradient>

          {/* ================= DARK MODE: DEEP EMERALD, OBSIDIAN & DARK SLATE ================= */}
          <linearGradient id="appGreenWhiteGrayDark" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10251A" />   {/* Deep Atmospheric Baadre Emerald at Top */}
            <stop offset="22%" stopColor="#0E1F16" />  {/* Dark Forest Shadow */}
            <stop offset="45%" stopColor="#0B1812" />  {/* Obsidian Greenish Core */}
            <stop offset="70%" stopColor="#09140F" />  {/* Midnight Charcoal */}
            <stop offset="88%" stopColor="#07100C" />  {/* Soft Deep Slate */}
            <stop offset="100%" stopColor="#050C09" /> {/* Dark Slate Base at Bottom */}
          </linearGradient>

          <linearGradient id="topRadianceDark" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#46674D" stopOpacity="0.35" />
            <stop offset="35%" stopColor="#2E4A34" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.0" />
          </linearGradient>

          <linearGradient id="facetGreen1Dark" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5E8F67" stopOpacity="0.28" />
            <stop offset="50%" stopColor="#3A5C41" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#1E3B2C" stopOpacity="0.0" />
          </linearGradient>

          <linearGradient id="facetGreen2Dark" x1="80%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#88B793" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#46674D" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#13251B" stopOpacity="0.0" />
          </linearGradient>

          <linearGradient id="facetGreen3Dark" x1="100%" y1="20%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#46674D" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#2A4330" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#0B1711" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* 1. Base Full-Screen Gradient - Light & Dark */}
        <rect width="1080" height="1920" fill="url(#appGreenWhiteGrayLight)" className="dark:hidden" />
        <rect width="1080" height="1920" fill="url(#appGreenWhiteGrayDark)" className="hidden dark:block" />

        {/* 2. Top Enhanced Green Radiance Layer for Higher Gradient at Top */}
        <rect width="1080" height="900" fill="url(#topRadianceGreen)" className="dark:hidden" />
        <rect width="1080" height="900" fill="url(#topRadianceDark)" className="hidden dark:block" />

        {/* 3. LIGHT MODE Geometric Crystalline Origami Facets */}
        <g className="dark:hidden">
          {/* Main Diagonal Background Facet from Top Right */}
          <polygon
            points="320,0 1080,0 1080,880 720,540"
            fill="url(#facetGreen1Light)"
          />

          {/* Sharp Primary Top Right Crystalline Triangle */}
          <polygon
            points="580,0 1080,0 1080,520"
            fill="url(#facetGreen2Light)"
          />

          {/* Soft Angular Secondary Plane flowing down */}
          <polygon
            points="520,220 1080,480 1080,1050 760,780"
            fill="url(#facetGreen3Light)"
          />

          {/* Ultra-Soft Light Refraction Edge in Pure Crisp White */}
          <polygon
            points="760,0 1080,0 920,240"
            fill="#FFFFFF"
            fillOpacity="0.6"
          />

          {/* Left subtle soft light balance in gentle white */}
          <polygon
            points="0,0 280,0 0,380"
            fill="#FFFFFF"
            fillOpacity="0.25"
          />
        </g>

        {/* 4. DARK MODE Geometric Crystalline Origami Facets */}
        <g className="hidden dark:block">
          <polygon
            points="320,0 1080,0 1080,880 720,540"
            fill="url(#facetGreen1Dark)"
          />
          <polygon
            points="580,0 1080,0 1080,520"
            fill="url(#facetGreen2Dark)"
          />
          <polygon
            points="520,220 1080,480 1080,1050 760,780"
            fill="url(#facetGreen3Dark)"
          />
          <polygon
            points="760,0 1080,0 920,240"
            fill="#FFFFFF"
            fillOpacity="0.08"
          />
        </g>
      </svg>
    </div>
  );
});
