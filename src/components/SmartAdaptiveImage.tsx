import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { playClickSound } from '../lib/sound';

export interface GallerySlideItem {
  url: string;
  badge?: string;
}

interface SmartAdaptiveImageProps {
  src?: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  hoverZoom?: boolean;
  gallery?: (string | GallerySlideItem)[];
  initialIndex?: number;
  badgeText?: string;
  disableLightbox?: boolean;
  adaptContainerForTall?: boolean;
}

/**
 * مكوّن عرض الصور الذكي مع عارض الصور بقياس كامل (Full-Screen Scrollable Lightbox):
 * - إذا كانت الصورة 9:16 (طويلة): تظهر كما هي طويلة بكامل أبعادها دون قص.
 * - إذا كانت الصورة 16:9 (عرضية): يتم توسيط الصورة أوتوماتيكياً (object-center).
 * - عند النقر على أي صورة في التطبيق: تفتح بقياس كامل مع إمكانية التمرير بين الصور،
 *   مع شريط علوي وسفلي منفصلين تماماً بحيث لا يختفي أي جزء من الصورة تحتهما، وزر إغلاق واضح.
 */
export const SmartAdaptiveImage: React.FC<SmartAdaptiveImageProps> = ({
  src,
  alt,
  className = '',
  containerClassName = '',
  hoverZoom = true,
  gallery,
  initialIndex = 0,
  badgeText,
  disableLightbox = false,
  adaptContainerForTall = false,
}) => {
  const { language, isRTL, dir } = useLanguage();
  const [orientation, setOrientation] = useState<'landscape' | 'portrait' | 'loading'>('loading');
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(initialIndex);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

  const normalizedGallery: GallerySlideItem[] = React.useMemo(() => {
    if (gallery && gallery.length > 0) {
      return gallery
        .map((item) =>
          typeof item === 'string' ? { url: item, badge: badgeText } : item
        )
        .filter((item) => Boolean(item.url));
    }
    return src ? [{ url: src, badge: badgeText }] : [];
  }, [gallery, src, badgeText]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      if (img.naturalHeight > img.naturalWidth * 1.02) {
        setOrientation('portrait');
      } else {
        setOrientation('landscape');
      }
    } else {
      setOrientation('landscape');
    }
  };

  const handleOpenViewer = (e: React.MouseEvent) => {
    if (disableLightbox || !src) return;
    e.stopPropagation();
    playClickSound();
    const foundIdx = normalizedGallery.findIndex((item) => item.url === src);
    setActiveIdx(foundIdx >= 0 ? foundIdx : initialIndex);
    setIsViewerOpen(true);
  };

  useEffect(() => {
    if (!isViewerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsViewerOpen(false);
      } else if (e.key === 'ArrowLeft') {
        setActiveIdx((prev) =>
          isRTL
            ? (prev + 1) % normalizedGallery.length
            : (prev - 1 + normalizedGallery.length) % normalizedGallery.length
        );
      } else if (e.key === 'ArrowRight') {
        setActiveIdx((prev) =>
          isRTL
            ? (prev - 1 + normalizedGallery.length) % normalizedGallery.length
            : (prev + 1) % normalizedGallery.length
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isViewerOpen, isRTL, normalizedGallery.length]);

  if (!src) {
    return <div className={`w-full h-full bg-[#E8F4EA] ${containerClassName}`} />;
  }

  const isPortrait = orientation === 'portrait';
  const currentSlide = normalizedGallery[activeIdx] || { url: src, badge: badgeText };

  const goPrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    playClickSound();
    setActiveIdx((prev) => (prev - 1 + normalizedGallery.length) % normalizedGallery.length);
  };

  const goNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    playClickSound();
    setActiveIdx((prev) => (prev + 1) % normalizedGallery.length);
  };

  return (
    <>
      <div
        onClick={handleOpenViewer}
        className={`relative w-full ${
          adaptContainerForTall && isPortrait ? 'min-h-[340px] sm:min-h-[420px]' : 'h-full'
        } overflow-hidden bg-[#1E3725] flex items-center justify-center ${
          !disableLightbox ? 'cursor-zoom-in' : ''
        } ${containerClassName}`}
      >
        {/* إذا كانت الصورة 9:16 (طويلة) تظهر كما هي طويلة بالكامل في المنتصف، وإذا كانت 16:9 تتوسط أوتوماتيكياً */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={handleLoad}
          className={
            isPortrait
              ? `relative z-10 h-full w-auto max-w-full mx-auto my-auto object-contain object-center transition-transform duration-500 ${
                  hoverZoom ? 'group-hover:scale-[1.02]' : ''
                } ${className}`
              : `relative z-10 w-full h-full mx-auto my-auto object-cover object-center transition-transform duration-500 ${
                  hoverZoom ? 'group-hover:scale-[1.03]' : ''
                } ${className}`
          }
        />

        {!disableLightbox && (
          <span
            className="absolute bottom-2 right-2 z-20 w-7 h-7 rounded-lg bg-black/50 text-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none backdrop-blur-xs"
            aria-hidden="true"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      {/* عارض الصور بقياس كامل مع دعم التمرير وعدم تغطية الصورة بالشريط العلوي أو السفلي */}
      {isViewerOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            dir={dir}
            onClick={(e) => {
              e.stopPropagation();
              setIsViewerOpen(false);
            }}
            className="fixed inset-0 z-[300] w-screen h-dvh bg-[#0D1A12]/98 flex flex-col select-none overflow-hidden"
          >
            {/* الشريط العلوي المستقل — لا يغطي أي جزء من الصورة */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 w-full bg-[#1E3725] border-b border-white/15 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 z-20 shadow-md"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="px-3 py-1 rounded-xl bg-white/15 text-white text-xs font-mono font-black shrink-0"
                  dir="ltr"
                >
                  {activeIdx + 1} / {normalizedGallery.length}
                </span>
                {currentSlide.badge && (
                  <span className="px-3 py-1 rounded-xl bg-[#46674D] text-white text-xs font-black truncate">
                    {currentSlide.badge}
                  </span>
                )}
              </div>

              {/* زر إغلاق الصور */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playClickSound();
                  setIsViewerOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
                <span>{tr('إغلاق الصورة', 'داخستنی وێنە', 'Close Photo')}</span>
              </button>
            </div>

            {/* المساحة الوسطى لعرض الصورة بقياس كامل وقابلة للتمرير بدون أن يختفي أي جزء منها تحت الشريط العلوي أو السفلي */}
            <div
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
              onTouchEnd={(e) => {
                if (touchStartX === null || normalizedGallery.length <= 1) return;
                const deltaX = e.changedTouches[0].clientX - touchStartX;
                if (Math.abs(deltaX) > 45) {
                  if (deltaX > 0) {
                    isRTL ? goNext() : goPrev();
                  } else {
                    isRTL ? goPrev() : goNext();
                  }
                }
                setTouchStartX(null);
              }}
              className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-auto p-3 sm:p-6 flex items-center justify-center relative"
            >
              {normalizedGallery.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={isRTL ? goNext : goPrev}
                    aria-label="Previous Image"
                    className="fixed left-3 sm:left-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#1E3725]/90 hover:bg-[#46674D] text-white border border-white/25 flex items-center justify-center shadow-xl transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <button
                    type="button"
                    onClick={isRTL ? goPrev : goNext}
                    aria-label="Next Image"
                    className="fixed right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#1E3725]/90 hover:bg-[#46674D] text-white border border-white/25 flex items-center justify-center shadow-xl transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              <div className="w-full h-full flex items-center justify-center overflow-auto">
                <img
                  key={currentSlide.url}
                  src={currentSlide.url}
                  alt={currentSlide.badge || alt}
                  className="max-w-full max-h-full w-auto h-auto object-contain object-center mx-auto my-auto rounded-xl shadow-2xl"
                />
              </div>
            </div>

            {/* الشريط السفلي المستقل للتمرير بين الصور — لا يغطي أي جزء من الصورة */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 w-full bg-[#1E3725] border-t border-white/15 px-4 py-2.5 flex items-center justify-center gap-2 overflow-x-auto z-20"
            >
              {normalizedGallery.length > 1 ? (
                <div className="flex items-center gap-2 overflow-x-auto max-w-full py-0.5 px-1">
                  {normalizedGallery.map((item, idx) => (
                    <button
                      key={`lightbox-thumb-${idx}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playClickSound();
                        setActiveIdx(idx);
                      }}
                      className={`relative w-14 h-10 sm:w-16 sm:h-11 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                        activeIdx === idx
                          ? 'border-emerald-400 scale-105 shadow-md'
                          : 'border-white/20 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={item.url}
                        alt={item.badge || `thumb-${idx + 1}`}
                        className="w-full h-full object-cover object-center"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-xs font-bold text-white/80">
                  {alt || tr('معاينة الصورة بالحجم الكامل', 'پێشبینینی وێنە بە قەبارەی تەواو', 'Full-size photo preview')}
                </span>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

/**
 * فحص أبعاد الصورة
 */
export function inspectImageDimensions(
  dataUrl: string
): Promise<{ isTall: boolean; width: number; height: number }> {
  return new Promise((resolve) => {
    if (!dataUrl) {
      resolve({ isTall: false, width: 0, height: 0 });
      return;
    }
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width || 0;
      const height = img.naturalHeight || img.height || 0;
      resolve({
        isTall: height > width * 1.05,
        width,
        height,
      });
    };
    img.onerror = () => {
      resolve({ isTall: false, width: 0, height: 0 });
    };
    img.src = dataUrl;
  });
}
