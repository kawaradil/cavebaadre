import React, { createContext, useContext, useEffect, useState } from 'react';

export type ColorPaletteName = 'raba' | 'indigo' | 'sky' | 'emerald' | 'royal';
export type GreenPaletteName = ColorPaletteName;

export interface ColorThemeTokens {
  name: ColorPaletteName;
  labelAr: string;
  labelKu: string;
  labelEn: string;
  descriptionAr: string;
  descriptionKu: string;
  descriptionEn: string;
  primaryHex: string;
  accentHex: string;
  primaryHoverHex: string;
  secondaryTextHex: string;
  gradientToHex: string;
  primaryTextHex: string;
  primaryLightHex: string;
  surfaceSoftHex: string;
  surfaceHoverHex: string;
  borderSoftHex: string;
  bgTopTintHex: string;
  bgMidTintHex: string;
  bgSoftTintHex: string;
  shadowRgb: string;
  logoFilter: string;
  splashFilter: string;
  logoUrl?: string;
  cardBgClass: string;
  badgeBgClass: string;
  buttonGradientClass: string;
  borderClass: string;
}

export type GreenColorTokens = ColorThemeTokens;

const STORAGE_THEME_KEY = 'cave_baadre_theme_palette_v5';

/**
 * 1. سمة تركوازي (Turquoise) - الافتراضية
 * مستوحاة مباشرة من الشعار المرفق لمنظمة RABA:
 * - القبضة والأوراق وحروف RABA باللون التركوازي المتألق (#2BB3B6 / #1E8E93)
 * - الإطار الدائري الخارجي باللون الأزرق الصافي (#247CB4)
 */
export const RABA_LOGO_THEME: ColorThemeTokens = {
  name: 'raba',
  labelAr: 'تركوازي',
  labelKu: 'پیرۆزەیی',
  labelEn: 'Turquoise',
  descriptionAr: 'مستوحاة من شعار منظمة RABA (تركوازي القبضة والأوراق مع أزرق الإطار)',
  descriptionKu: 'وەرگیراو لە لۆگۆی ڕێکخراوی RABA (پیرۆزەیی و شین)',
  descriptionEn: 'Inspired by RABA Organization logo (Turquoise emblem & Cerulean ring)',
  primaryHex: '#1E8E93',        // تركوازي رابه الأساسي الغني المستوحى من رمز الشعار
  accentHex: '#247CB4',         // أزرق الإطار الدائري الخارجي لشعار RABA
  primaryHoverHex: '#156E73',   // تركوازي داكن عند التمرير
  secondaryTextHex: '#195D73',  // أزرق بترولي متناغم للنصوص الفرعية
  gradientToHex: '#2BB3B6',     // تركوازي الشعار المشرق للتدرجات اللونية
  primaryTextHex: '#0E3544',    // كحلي بترولي عميق للعناوين الرئيسية
  primaryLightHex: '#DEF5F6',   // خلفية تركوازية ناعمة للأزرار النشطة والشارات
  surfaceSoftHex: '#EFFAFA',    // سطح ثلجي بلمسة تركوازية لطيفة
  surfaceHoverHex: '#C4ECEE',   // لون التمرير الفاتح
  borderSoftHex: '#B2E2E5',     // حدود تركوازية سلفرية متناسقة
  bgTopTintHex: '#DEF5F6',
  bgMidTintHex: '#EFFAFA',
  bgSoftTintHex: '#F7FDFD',
  shadowRgb: '30, 142, 147',
  logoFilter: 'hue-rotate(-18deg) saturate(1.12) brightness(0.97)',
  splashFilter: 'hue-rotate(-18deg) saturate(0.84) brightness(1.02) contrast(0.97)',
  logoUrl: '/assets/aistudio/Screenshot_20261021_133231_Instagram_dc997749.jpg',
  cardBgClass: 'bg-white/90 backdrop-blur-xl border border-[#CFE2E8] shadow-[0_8px_28px_rgba(30,142,147,0.10)]',
  badgeBgClass: 'bg-[#467586] text-white',
  buttonGradientClass: 'bg-gradient-to-r from-[#467586] via-[#58899A] to-[#6C9DAE] text-white font-black',
  borderClass: 'border-[#CFE2E8]',
};

/**
 * 2. سمة أزرق نيلي (Indigo Blue)
 */
export const INDIGO_THEME: ColorThemeTokens = {
  name: 'indigo',
  labelAr: 'أزرق نيلي',
  labelKu: 'شینی نیلی',
  labelEn: 'Indigo Blue',
  descriptionAr: 'سمة الأزرق النيلي الأنيق لكافة أقسام التطبيق والشعار',
  descriptionKu: 'ڕەنگی شینی نیلی بۆ تەواوی بەشەکانی ئەپ و لۆگۆ',
  descriptionEn: 'Harmonious Indigo Blue theme across all sections and logo',
  primaryHex: '#3949AB',
  accentHex: '#5C6BC0',
  primaryHoverHex: '#283593',
  secondaryTextHex: '#303F9F',
  gradientToHex: '#7986CB',
  primaryTextHex: '#1A237E',
  primaryLightHex: '#E0E7FF',
  surfaceSoftHex: '#EEF2FF',
  surfaceHoverHex: '#C7D2FE',
  borderSoftHex: '#C7D2FE',
  bgTopTintHex: '#E0E7FF',
  bgMidTintHex: '#EEF2FF',
  bgSoftTintHex: '#F5F7FF',
  shadowRgb: '57, 73, 171',
  logoFilter: 'hue-rotate(34deg) saturate(1.15) brightness(0.95)',
  splashFilter: 'hue-rotate(34deg) saturate(0.82) brightness(1.01) contrast(0.97)',
  logoUrl: '/assets/aistudio/Screenshot_20261021_133231_Instagram_dc997749.jpg',
  cardBgClass: 'bg-white/90 backdrop-blur-xl border border-[#CFE2E8] shadow-[0_8px_28px_rgba(57,73,171,0.10)]',
  badgeBgClass: 'bg-[#467586] text-white',
  buttonGradientClass: 'bg-gradient-to-r from-[#467586] via-[#58899A] to-[#6C9DAE] text-white font-black',
  borderClass: 'border-[#CFE2E8]',
};

/**
 * 3. سمة سماوي هادئ (Sky Slate)
 */
export const SKY_SLATE_THEME: ColorThemeTokens = {
  name: 'sky',
  labelAr: 'سماوي هادئ',
  labelKu: 'شینی ئاسمانی',
  labelEn: 'Sky Slate',
  descriptionAr: 'مستوحاة من لون السماء الهادئ',
  descriptionKu: 'لە ڕەنگی ئاسمانی هێمن وەرگیراوە',
  descriptionEn: 'Inspired by calm sky slate tones',
  primaryHex: '#467586',
  accentHex: '#58899A',
  primaryHoverHex: '#3B6878',
  secondaryTextHex: '#285060',
  gradientToHex: '#6C9DAE',
  primaryTextHex: '#1B3A46',
  primaryLightHex: '#E3EFF3',
  surfaceSoftHex: '#F2F8FA',
  surfaceHoverHex: '#D8E9EF',
  borderSoftHex: '#CFE2E8',
  bgTopTintHex: '#E7F2F5',
  bgMidTintHex: '#EFF6F8',
  bgSoftTintHex: '#F5FAFC',
  shadowRgb: '70, 117, 134',
  logoFilter: 'saturate(0.62) hue-rotate(-8deg) brightness(0.98)',
  splashFilter: 'saturate(0.46) hue-rotate(-10deg) brightness(1.03) contrast(0.96)',
  logoUrl: '/assets/aistudio/Screenshot_20261021_133231_Instagram_dc997749.jpg',
  cardBgClass: 'bg-white/90 backdrop-blur-xl border border-[#CFE2E8] shadow-[0_8px_28px_rgba(70,117,134,0.10)]',
  badgeBgClass: 'bg-[#467586] text-white',
  buttonGradientClass: 'bg-gradient-to-r from-[#467586] via-[#58899A] to-[#6C9DAE] text-white font-black',
  borderClass: 'border-[#CFE2E8]',
};

/**
 * 4. سمة أخضر زمردي (Emerald Sage)
 */
export const EMERALD_THEME: ColorThemeTokens = {
  name: 'emerald',
  labelAr: 'أخضر زمردي',
  labelKu: 'سەوزی زمڕودی',
  labelEn: 'Emerald Sage',
  descriptionAr: 'سمة الطبيعة الخضراء الهادئة',
  descriptionKu: 'ڕەنگی سروشتی سەوزی هێمن',
  descriptionEn: 'Calm nature emerald sage palette',
  primaryHex: '#46674D',
  accentHex: '#5C8564',
  primaryHoverHex: '#36593F',
  secondaryTextHex: '#2D4833',
  gradientToHex: '#88B793',
  primaryTextHex: '#1E3725',
  primaryLightHex: '#E8F4EA',
  surfaceSoftHex: '#F4F9F5',
  surfaceHoverHex: '#D4EADB',
  borderSoftHex: '#BBDDC6',
  bgTopTintHex: '#E2F2E5',
  bgMidTintHex: '#EDF7EF',
  bgSoftTintHex: '#F5FAF6',
  shadowRgb: '70, 103, 77',
  logoFilter: 'hue-rotate(-68deg) saturate(0.75) brightness(0.95)',
  splashFilter: 'hue-rotate(-68deg) saturate(0.55) brightness(1.02) contrast(0.96)',
  logoUrl: '/assets/aistudio/Screenshot_20261021_133231_Instagram_dc997749.jpg',
  cardBgClass: 'bg-white/90 backdrop-blur-xl border border-[#CFE2E8] shadow-[0_8px_28px_rgba(70,103,77,0.10)]',
  badgeBgClass: 'bg-[#467586] text-white',
  buttonGradientClass: 'bg-gradient-to-r from-[#467586] via-[#58899A] to-[#6C9DAE] text-white font-black',
  borderClass: 'border-[#CFE2E8]',
};

/**
 * 5. سمة أزرق رابه الملكي (Royal Cerulean Blue)
 */
export const ROYAL_BLUE_THEME: ColorThemeTokens = {
  name: 'royal',
  labelAr: 'أزرق ملكي',
  labelKu: 'شینی شاهانە',
  labelEn: 'Royal Blue',
  descriptionAr: 'مستوحاة من الإطار الأزرق لشعار منظمة رابه',
  descriptionKu: 'لە چوارچێوەی شینی لۆگۆی ڕێکخراوی ڕابە وەرگیراوە',
  descriptionEn: 'Inspired by RABA Organization outer blue ring',
  primaryHex: '#247CB4',
  accentHex: '#2BB3B6',
  primaryHoverHex: '#1B6391',
  secondaryTextHex: '#185A80',
  gradientToHex: '#38BDF8',
  primaryTextHex: '#0F314A',
  primaryLightHex: '#E0F2FE',
  surfaceSoftHex: '#F0F9FF',
  surfaceHoverHex: '#BAE6FD',
  borderSoftHex: '#BAE6FD',
  bgTopTintHex: '#E0F2FE',
  bgMidTintHex: '#F0F9FF',
  bgSoftTintHex: '#F8FAFC',
  shadowRgb: '36, 124, 180',
  logoFilter: 'none',
  splashFilter: 'saturate(0.9) brightness(1.01)',
  logoUrl: '/assets/aistudio/Screenshot_20261021_133231_Instagram_dc997749.jpg',
  cardBgClass: 'bg-white/90 backdrop-blur-xl border border-[#CFE2E8] shadow-[0_8px_28px_rgba(36,124,180,0.10)]',
  badgeBgClass: 'bg-[#467586] text-white',
  buttonGradientClass: 'bg-gradient-to-r from-[#467586] via-[#58899A] to-[#6C9DAE] text-white font-black',
  borderClass: 'border-[#CFE2E8]',
};

export const RABA_THEME = RABA_LOGO_THEME;

export const COLOR_PALETTES: Record<ColorPaletteName, ColorThemeTokens> = {
  raba: RABA_LOGO_THEME,
  indigo: INDIGO_THEME,
  sky: SKY_SLATE_THEME,
  emerald: EMERALD_THEME,
  royal: ROYAL_BLUE_THEME,
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
  // السمة الافتراضية هي سمة شعار رابه (تركوازي وأزرق RABA) مع سهولة التبديل عبر Context
  const [activePaletteName, setActivePaletteName] = useState<ColorPaletteName>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_THEME_KEY) as ColorPaletteName | null;
      if (saved && COLOR_PALETTES[saved]) {
        return saved;
      }
    } catch {}
    return 'raba';
  });

  const palette = COLOR_PALETTES[activePaletteName] || RABA_LOGO_THEME;

  const setPalette = (name: ColorPaletteName) => {
    if (!COLOR_PALETTES[name]) return;
    setActivePaletteName(name);
    try {
      localStorage.setItem(STORAGE_THEME_KEY, name);
    } catch {}
  };

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
    root.style.setProperty('--theme-logo-filter', palette.logoFilter);
    root.style.setProperty('--theme-splash-filter', palette.splashFilter);

    // Global design system variables
    root.style.setProperty('--primary', palette.primaryHex);
    root.style.setProperty('--primary-hover', palette.primaryHoverHex);
    root.style.setProperty('--primary-light', palette.primaryLightHex);
    root.style.setProperty('--accent', palette.accentHex);
    root.style.setProperty('--border-focus', palette.primaryHex);
    root.style.setProperty('--border-theme', palette.borderSoftHex);
    root.style.setProperty('--border-subtle', palette.primaryLightHex);
    root.style.setProperty('--text-main', palette.primaryTextHex);
    root.style.setProperty('--text-muted', palette.secondaryTextHex);
    root.style.setProperty('--bg-surface-hover', palette.surfaceSoftHex);
    root.style.setProperty('--bg-card-subtle', palette.surfaceSoftHex);
    root.style.setProperty('--color-primary', palette.primaryHex);
    root.style.setProperty('--color-primary-dark', palette.primaryTextHex);
    root.style.setProperty('--color-primary-mid', palette.secondaryTextHex);
  }, [palette]);

  return (
    <ColorContext.Provider
      value={{
        palette,
        activePaletteName,
        setPalette,
        availablePalettes: Object.values(COLOR_PALETTES),
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
