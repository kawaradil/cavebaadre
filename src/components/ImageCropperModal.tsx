import React, { useState, useRef, useEffect } from 'react';
import { Crop, Check, X, ZoomIn, MoveVertical, Maximize2, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { playClickSound, playSuccessSound } from '../lib/sound';

export interface ImageCropperModalProps {
  isOpen: boolean;
  imagesQueue: string[];
  onComplete: (processedDataUrls: string[]) => void;
  onCancel: () => void;
}

type CropPreset = '16:9' | '4:3' | '9:16_center';

/**
 * أداة قص وتوسيط الصور الطويلة (9:16) وتنسيق الصور العرضية (16:9 Fit)
 * تظهر تلقائياً عند إدراج صور طويلة أو عند طلب قص الصورة يدوياً.
 */
export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imagesQueue,
  onComplete,
  onCancel,
}) => {
  const { language, dir, isRTL } = useLanguage();
  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [processedList, setProcessedList] = useState<string[]>([]);
  const [preset, setPreset] = useState<CropPreset>('16:9');
  // موضع القص العمودي من 0 (أعلى الصورة) إلى 100 (أسفل الصورة)، الافتراضي 50 (المنتصف)
  const [verticalOffsetPct, setVerticalOffsetPct] = useState<number>(50);
  // موضع القص الأفقي من 0 إلى 100، الافتراضي 50 (المنتصف)
  const [horizontalOffsetPct, setHorizontalOffsetPct] = useState<number>(50);
  // التكبير من 1 إلى 2.4
  const [zoom, setZoom] = useState<number>(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ y: number; startPct: number } | null>(null);

  const currentImageSrc = imagesQueue[currentIndex] || '';

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setProcessedList([]);
      setPreset('16:9');
      setVerticalOffsetPct(50);
      setHorizontalOffsetPct(50);
      setZoom(1);
    }
  }, [isOpen, imagesQueue]);

  if (!isOpen || !currentImageSrc) return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (preset === '9:16_center') return;
    setIsDragging(true);
    dragStartRef.current = {
      y: e.clientY,
      startPct: verticalOffsetPct,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current || preset === '9:16_center') return;
    const deltaY = e.clientY - dragStartRef.current.y;
    const nextPct = Math.max(0, Math.min(100, dragStartRef.current.startPct - deltaY * 0.35));
    setVerticalOffsetPct(Math.round(nextPct));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const generateCroppedDataUrl = (): Promise<string> => {
    return new Promise((resolve) => {
      // إذا اختار المستخدم إبقاء الصورة الطويلة 9:16 متوسطة بدون قص
      if (preset === '9:16_center') {
        resolve(currentImageSrc);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const natW = img.naturalWidth || img.width;
          const natH = img.naturalHeight || img.height;
          if (!natW || !natH) {
            resolve(currentImageSrc);
            return;
          }

          const targetRatio = preset === '16:9' ? 16 / 9 : 4 / 3;

          // حساب أبعاد منطقة القص من الصورة الأصلية مع مراعاة التكبير (zoom)
          let cropW = natW / zoom;
          let cropH = cropW / targetRatio;

          if (cropH > natH / zoom) {
            cropH = natH / zoom;
            cropW = cropH * targetRatio;
          }

          const maxX = Math.max(0, natW - cropW);
          const maxY = Math.max(0, natH - cropH);

          const srcX = (horizontalOffsetPct / 100) * maxX;
          const srcY = (verticalOffsetPct / 100) * maxY;

          const outWidth = 1080;
          const outHeight = Math.round(outWidth / targetRatio);

          const canvas = document.createElement('canvas');
          canvas.width = outWidth;
          canvas.height = outHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(currentImageSrc);
            return;
          }

          ctx.drawImage(img, srcX, srcY, cropW, cropH, 0, 0, outWidth, outHeight);
          const resultDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve(resultDataUrl);
        } catch {
          resolve(currentImageSrc);
        }
      };
      img.onerror = () => resolve(currentImageSrc);
      img.src = currentImageSrc;
    });
  };

  const handleConfirmCurrent = async () => {
    playSuccessSound();
    const outputUrl = await generateCroppedDataUrl();
    const updatedList = [...processedList, outputUrl];

    if (currentIndex + 1 < imagesQueue.length) {
      setProcessedList(updatedList);
      setCurrentIndex((prev) => prev + 1);
      setPreset('16:9');
      setVerticalOffsetPct(50);
      setHorizontalOffsetPct(50);
      setZoom(1);
    } else {
      onComplete(updatedList);
    }
  };

  const handleKeepOriginalCentered = () => {
    playClickSound();
    const updatedList = [...processedList, currentImageSrc];
    if (currentIndex + 1 < imagesQueue.length) {
      setProcessedList(updatedList);
      setCurrentIndex((prev) => prev + 1);
      setPreset('16:9');
      setVerticalOffsetPct(50);
      setHorizontalOffsetPct(50);
      setZoom(1);
    } else {
      onComplete(updatedList);
    }
  };

  return (
    <AnimatePresence>
      <div
        dir={dir}
        className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className={`w-full max-w-lg bg-white rounded-3xl border border-[#BBDDC6] shadow-2xl overflow-hidden flex flex-col my-auto ${
            isRTL ? 'text-right' : 'text-left'
          }`}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-l from-[#E8F4EA] via-[#F4F9F5] to-white border-b border-[#BBDDC6] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#46674D] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Crop className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#1E3725]">
                  {tr(
                    'أداة قص وتنسيق الصور الطويلة',
                    'ئامرازی بڕین و ڕێکخستنی وێنە درێژەکان',
                    'Tall Photo Crop & Fit Tool'
                  )}
                </h3>
                <p className="text-[11px] font-bold text-[#46674D]">
                  {imagesQueue.length > 1
                    ? tr(
                        `تنسيق الصورة ${currentIndex + 1} من ${imagesQueue.length}`,
                        `ڕێکخستنی وێنەی ${currentIndex + 1} لە ${imagesQueue.length}`,
                        `Adjusting photo ${currentIndex + 1} of ${imagesQueue.length}`
                      )
                    : tr(
                        'حدد الجزء المطلوب قصه ليتناسب مع الكارت (16:9) أو اجعل الصورة الطويلة تتوسط (9:16)',
                        'بەشی دڵخواز دیاری بکە بۆ بڕین (16:9) یان وێنە درێژەکە بخەرە ناوەڕاست (9:16)',
                        'Crop to 16:9 fit or center the 9:16 tall photo'
                      )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                onCancel();
              }}
              className="w-8 h-8 rounded-full bg-[#E8F4EA] hover:bg-[#D4EADB] text-[#1E3725] flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-5 space-y-4">
            {/* اختيار نمط القص أو التوسيط */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setPreset('16:9');
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-black border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  preset === '16:9'
                    ? 'bg-[#46674D] text-white border-[#46674D] shadow-xs'
                    : 'bg-[#F4F9F5] text-[#1E3725] border-[#BBDDC6] hover:bg-[#E8F4EA]'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                <span>{tr('قص 16:9 (Fit)', 'بڕینی 16:9', '16:9 Fit')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setPreset('4:3');
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-black border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  preset === '4:3'
                    ? 'bg-[#46674D] text-white border-[#46674D] shadow-xs'
                    : 'bg-[#F4F9F5] text-[#1E3725] border-[#BBDDC6] hover:bg-[#E8F4EA]'
                }`}
              >
                <Crop className="w-3.5 h-3.5 shrink-0" />
                <span>{tr('قص 4:3', 'بڕینی 4:3', '4:3 Crop')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setPreset('9:16_center');
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-black border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  preset === '9:16_center'
                    ? 'bg-[#46674D] text-white border-[#46674D] shadow-xs'
                    : 'bg-[#F4F9F5] text-[#1E3725] border-[#BBDDC6] hover:bg-[#E8F4EA]'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span>{tr('توسيط 9:16', 'ناوەڕاست 9:16', '9:16 Center')}</span>
              </button>
            </div>

            {/* معاينة حية تفاعلية لمنطقة القص أو التوسيط */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#46674D]">
                <span>
                  {preset === '9:16_center'
                    ? tr(
                        'معاينة: ستظهر الصورة الطويلة 9:16 متوسطة داخل الكارت',
                        'پێشبینین: وێنە درێژەکە 9:16 لە ناوەڕاستی کاردەکە دەردەکەوێت',
                        'Preview: 9:16 tall photo centered inside the card'
                      )
                    : tr(
                        'اسحب الصورة للأعلى أو الأسفل لتحديد زاوية القص المناسبة',
                        'وێنەکە ڕابکێشە بۆ سەرەوە یان خوارەوە بۆ دیاریکردنی شوێنی بڕین',
                        'Drag photo up or down to position the crop area'
                      )}
                </span>
              </div>

              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className={`relative w-full ${
                  preset === '4:3' ? 'aspect-[4/3]' : 'aspect-video'
                } rounded-2xl overflow-hidden bg-[#1E3725] border-2 border-[#46674D] shadow-inner select-none ${
                  preset === '9:16_center' ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
                }`}
              >
                {preset === '9:16_center' ? (
                  <>
                    <img
                      src={currentImageSrc}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover object-center blur-xl scale-110 opacity-55 pointer-events-none"
                    />
                    <img
                      src={currentImageSrc}
                      alt="Centered 9:16 preview"
                      className="relative z-10 h-full w-auto max-w-full mx-auto object-contain object-center pointer-events-none"
                    />
                  </>
                ) : (
                  <img
                    src={currentImageSrc}
                    alt="Crop preview"
                    style={{
                      objectPosition: `${horizontalOffsetPct}% ${verticalOffsetPct}%`,
                      transform: `scale(${zoom})`,
                    }}
                    className="w-full h-full object-cover transition-transform duration-75 pointer-events-none"
                  />
                )}

                {/* شبكة إرشادية للقص */}
                {preset !== '9:16_center' && (
                  <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
                    <div className="border-r border-b border-white/25" />
                    <div className="border-r border-b border-white/25" />
                    <div className="border-b border-white/25" />
                    <div className="border-r border-b border-white/25" />
                    <div className="border-r border-b border-white/25" />
                    <div className="border-b border-white/25" />
                    <div className="border-r border-white/25" />
                    <div className="border-r border-white/25" />
                    <div />
                  </div>
                )}
              </div>
            </div>

            {/* أشرطة التحكم بموضع القص العمودي والتكبير */}
            {preset !== '9:16_center' && (
              <div className="p-3.5 rounded-2xl bg-[#F4F9F5] border border-[#BBDDC6] space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-black text-[#1E3725]">
                    <span className="flex items-center gap-1.5">
                      <MoveVertical className="w-3.5 h-3.5 text-[#46674D]" />
                      <span>
                        {tr(
                          'تحريك منطقة القص (أعلى / وسط / أسفل)',
                          'جووڵاندنی ناوچەی بڕین (سەرەوە / ناوەڕاست / خوارەوە)',
                          'Vertical Crop Position (Top / Middle / Bottom)'
                        )}
                      </span>
                    </span>
                    <span className="font-mono text-[11px] text-[#46674D]">
                      {verticalOffsetPct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={verticalOffsetPct}
                    onChange={(e) => setVerticalOffsetPct(Number(e.target.value))}
                    className="w-full accent-[#46674D] cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-black text-[#1E3725]">
                    <span className="flex items-center gap-1.5">
                      <ZoomIn className="w-3.5 h-3.5 text-[#46674D]" />
                      <span>{tr('مستوى التقريب (Zoom)', 'نزیککردنەوە (Zoom)', 'Zoom Level')}</span>
                    </span>
                    <span className="font-mono text-[11px] text-[#46674D]">
                      {zoom.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={2.4}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full accent-[#46674D] cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* أزرار الاعتماد */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[#E8F4EA]">
              <button
                type="button"
                onClick={handleConfirmCurrent}
                className="flex-1 py-3 px-4 rounded-xl bg-[#46674D] hover:bg-[#36593F] text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>
                  {preset === '9:16_center'
                    ? tr(
                        'اعتماد توسيط الصورة (9:16)',
                        'پەسەندکردنی ناوەڕاستکردن (9:16)',
                        'Confirm Centered 9:16 Photo'
                      )
                    : tr(
                        'قص واعتماد الصورة',
                        'بڕین و پەسەندکردنی وێنە',
                        'Crop & Confirm Photo'
                      )}
                </span>
              </button>

              {preset !== '9:16_center' && (
                <button
                  type="button"
                  onClick={handleKeepOriginalCentered}
                  className="py-3 px-3.5 rounded-xl bg-[#E8F4EA] hover:bg-[#D4EADB] text-[#1E3725] font-black text-xs transition-all cursor-pointer"
                >
                  {tr(
                    'إبقاء 9:16 متوسطة بدون قص',
                    'هێشتنەوەی 9:16 لە ناوەڕاست بێ بڕین',
                    'Keep 9:16 Centered'
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
