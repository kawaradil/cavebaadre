import React, { createContext, useContext, useEffect } from 'react';

export type ColorPaletteName = 'raba';
export type GreenPaletteName = ColorPaletteName;

export interface ColorThemeTokens {
  name: ColorPaletteName;
  labelAr: string;
  labelKu: string;
  labelEn: string;
  descriptionAr: string;
  descriptionKu: string;
  descriptionEn: string;
  primaryHex: string;         // #257EB8 (أزرق حلقة شعار RABA الخارجي)
  accentHex: string;          // #2BB3B6 (تركواز أيقونة اليد وأوراق شعار RABA)
  primaryHoverHex: string;    // #1D6899 (أزرق داكن عند التمرير)
  secondaryTextHex: string;   // #185A80 (أزرق بترولي للنصوص الفرعية)
  gradientToHex: string;      // #2BB3B6 (تدرج إلى التركواز المشرق)
  primaryTextHex: string;     // #0F314A (كحلي داكن للعناوين الرئيسية)
  primaryLightHex: string;    // #E6F5FA (سماوي تركوازي فاتح للخلفيات الفرعية)
  surfaceSoftHex: string;     // #F2FAFC (أبيض ثلجي مشرب بالتركواز للكروت والحقول)
  surfaceHoverHex: string;    // #D0ECF5 (سماوي ناعم عند التمرير)
  borderSoftHex: string;      // #A5D9EA (حدود سماوية تركوازية متناسقة)
  bgTopTintHex: string;       // #CBEAF5
  bgMidTintHex: string;       // #DFF3FA
  bgSoftTintHex: string;      // #EFF9FC
  shadowRgb: string;          // '37, 126, 184'
  logoUrl?: string;
  cardBgClass: string;
  badgeBgClass: string;
  buttonGradientClass: string;
  borderClass: string;
}

export type GreenColorTokens = ColorThemeTokens;

/**
 * السمة اللونية الوحيدة المعتمدة في التطبيق (مستوحاة من شعار منظمة رابه RABA)
 * يمكن تعديل أي درجة لونية من هنا ليتم تطبيقها تلقائياً في كامل التطبيق
 */
export const RABA_THEME: ColorThemeTokens = {
  name: 'raba',
  labelAr: 'سمة رابه (أزرق وتركواز)',
  labelKu: 'ڕەنگی ڕابە (شین و فیرۆزەیی)',
  labelEn: 'RABA (Blue & Turquoise)',
  descriptionAr: 'مستوحاة من شعار منظمة رابه لتنمية وبناء القدرات',
  descriptionKu: 'لە لۆگۆی ڕێکخراوی ڕابە بۆ گەشەپێدان و ئاڤاکرنا شیانا وەرگیراوە',
  descriptionEn: 'Inspired by RABA Organization for Development & Capacity Building logo',
  primaryHex: '#257EB8',       // أزرق حلقة شعار RABA الخارجي
  accentHex: '#2BB3B6',        // تركواز أيقونة اليد وأوراق شعار RABA
  primaryHoverHex: '#1D6899',  // أزرق داكن عند التمرير
  secondaryTextHex: '#185A80', // أزرق بترولي للنصوص الفرعية
  gradientToHex: '#2BB3B6',    // تدرج إلى التركواز المشرق
  primaryTextHex: '#0F314A',   // كحلي داكن للعناوين الرئيسية
  primaryLightHex: '#E6F5FA',  // سماوي تركوازي فاتح للخلفيات الفرعية
  surfaceSoftHex: '#F2FAFC',   // أبيض ثلجي مشرب بالتركواز للكروت والحقول
  surfaceHoverHex: '#D0ECF5',  // سماوي ناعم عند التمرير
  borderSoftHex: '#A5D9EA',    // حدود سماوية تركوازية متناسقة
  bgTopTintHex: '#CBEAF5',
  bgMidTintHex: '#DFF3FA',
  bgSoftTintHex: '#EFF9FC',
  shadowRgb: '37, 126, 184',
  logoUrl: '/assets/aistudio/Screenshot_20261021_133231_Instagram_dc997749.jpg',
  cardBgClass: 'bg-white/95 backdrop-blur-xl border border-[#BBDDC6]/80 shadow-[0_8px_28px_rgba(37,126,184,0.08)]',
  badgeBgClass: 'bg-[#46674D] text-white',
  buttonGradientClass: 'bg-gradient-to-r from-[#46674D] to-[#2D4833] text-white font-black',
  borderClass: 'border-[#BBDDC6]',
};

export const COLOR_PALETTES: Record<ColorPaletteName, ColorThemeTokens> = {
  raba: RABA_THEME,
};

export const GREEN_PALETTES = COLOR_PALETTES;

interface ColorContextType {
  palette: ColorThemeTokens;
  activePaletteName: ColorPaletteName;
  setPalette: (name: ColorPaletteName) => void;
  availablePalettes: ColorThemeTokens[];
}

const ColorContext = createContext<ColorContextType | undefined>(undefined);

export const ColorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const palette = RABA_THEME;

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-color-palette', palette.name);

    // Core Semantic CSS Variables for dynamic theme binding across the entire app
    root.style.setProperty('--theme-primary', palette.primaryHex);
    root.style.setProperty('--theme-accent', palette.accentHex);
    root.style.setProperty('--theme-primary-hover', palette.primaryHoverHex);
    root.style.setProperty('--theme-secondary', palette.secondaryTextHex);
    root.style.setProperty('--theme-gradient-to', palette.gradientToHex);
    root.style.setProperty('--theme-text-dark', palette.primaryTextHex);
    root.style.setProperty('--theme-bg-light', palette.primaryLightHex);
    root.style.setProperty('--theme-bg-soft', palette.surfaceSoftHex);
    root.style.setProperty('--theme-bg-hover', palette.surfaceHoverHex);
    root.style.setProperty('--theme-border', palette.borderSoftHex);
    root.style.setProperty('--theme-rgb', palette.shadowRgb);

    // Global variables
    root.style.setProperty('--primary', palette.primaryHex);
    root.style.setProperty('--primary-hover', palette.primaryHoverHex);
    root.style.setProperty('--primary-light', palette.primaryLightHex);
    root.style.setProperty('--accent', palette.accentHex);
    root.style.setProperty('--border-focus', palette.primaryHex);
    root.style.setProperty('--color-primary', palette.primaryHex);
    root.style.setProperty('--color-primary-dark', palette.primaryTextHex);
    root.style.setProperty('--color-primary-mid', palette.secondaryTextHex);

    try {
      localStorage.removeItem('cave_baadre_color_palette');
      localStorage.setItem('cave_baadre_theme_palette_v2', 'raba');
    } catch {}
  }, [palette]);

  return (
    <ColorContext.Provider
      value={{
        palette,
        activePaletteName: 'raba',
        setPalette: () => {},
        availablePalettes: [RABA_THEME],
      }}
    >
      {children}
    </ColorContext.Provider>
  );
};

export const useColorTheme = (): ColorContextType => {
  const ctx = useContext(ColorContext);
  if (!ctx) {
    throw new Error('useColorTheme must be used within a ColorProvider');
  }
  return ctx;
};
