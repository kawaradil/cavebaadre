import React from 'react';
import {
  X,
  Camera,
  CheckCircle2,
  Upload,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import { ReportSector, SECTOR_META } from '../../types/baadre';
import { MAX_UPLOAD_IMAGES } from '../../lib/firebase';
import { playClickSound } from '../../lib/sound';
import {
  FIELD_LIMITS,
  enforceInputLimit,
  FieldLimitBadge,
} from '../../lib/inputLimits';
import { EmbeddedGoogleMapPreviewCard } from '../FullScreenGoogleMapPickerModal';
import { SmartAdaptiveImage } from '../SmartAdaptiveImage';
import { SECTOR_ICONS, SelectedPhotoItem, WizardStep } from './wizardSuggestions';

interface WizardStepsContentEarlyProps {
  step: WizardStep;
  language: string;
  isRTL: boolean;
  tr: (ar: string, ku: string, en: string) => string;
  setValidationError: (val: string | null) => void;
  // Step 1
  photoItems: SelectedPhotoItem[];
  maxLimitNotice: boolean;
  previewGalleryUrls: string[];
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  // Step 2
  sector: ReportSector;
  setSector: (sector: ReportSector) => void;
  customSector: string;
  setCustomSector: (val: string) => void;
  setSectorInfoModal: (sector: ReportSector | null) => void;
  // Step 3
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  selectedSectorLabel: string;
  setSmartModalType: (type: 'title' | 'description' | null) => void;
  // Step 4
  latitude: number;
  longitude: number;
  onSelectLocation: (lat: number, lng: number) => void;
  onOpenFullScreenMap: () => void;
}

export const WizardStepsContentEarly: React.FC<WizardStepsContentEarlyProps> = ({
  step,
  language,
  isRTL,
  tr,
  setValidationError,
  photoItems,
  maxLimitNotice,
  previewGalleryUrls,
  onImageSelect,
  onRemoveImage,
  sector,
  setSector,
  customSector,
  setCustomSector,
  setSectorInfoModal,
  title,
  setTitle,
  description,
  setDescription,
  selectedSectorLabel,
  setSmartModalType,
  latitude,
  longitude,
  onSelectLocation,
  onOpenFullScreenMap,
}) => {
  if (step === 1) {
    return (
      <div className="space-y-4">
        <div className="p-5 rounded-2xl bg-[#F4F9F5] border border-dashed border-[#46674D] text-center space-y-3.5 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-[#E8F4EA] border border-[#BBDDC6] flex items-center justify-center mx-auto text-[#46674D] shadow-xs">
            <Camera className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-black text-[#1E3725]">
              {tr(
                'إرفاق صور البلاغ الميداني',
                'هاوپێچکردنی وێنەی سکاڵای مەیدانی',
                'Attach Field Report Photos'
              )}
            </p>
            <p className="text-[11px] font-bold text-[#46674D] mt-1">
              {tr(
                'يمكنك إدراج حتى 10 صور من موقع البلاغ الميداني',
                'دەتوانیت تا ١٠ وێنە لە شوێنی سکاڵاکە هاوپێچ بکەیت',
                'Attach up to 10 photos from the field report site'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {photoItems.length < MAX_UPLOAD_IMAGES ? (
              <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#46674D] hover:bg-[#36593F] text-white font-black text-xs cursor-pointer shadow-xs transition-all active:scale-95">
                <Upload className="w-4 h-4" />
                <span>
                  {tr(
                    `اختيار صور من الجهاز (${photoItems.length}/${MAX_UPLOAD_IMAGES})`,
                    `هەڵبژاردنی وێنە (${photoItems.length}/${MAX_UPLOAD_IMAGES})`,
                    `Select Photos (${photoItems.length}/${MAX_UPLOAD_IMAGES})`
                  )}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    setValidationError(null);
                    onImageSelect(e);
                  }}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-black">
                {tr(
                  'وصلت إلى الحد الأقصى المسموح به (10 صور فقط)',
                  'گەیشتیتە زۆرترین ژمارەی ڕێگەپێدراو (تەنها 10 وێنە)',
                  'Maximum limit reached (10 photos only)'
                )}
              </div>
            )}
          </div>

          {maxLimitNotice && (
            <div className="py-2 px-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-black">
              {tr(
                'تنبيه: يسمح بإدراج 10 صور كحد أقصى لكل بلاغ فقط.',
                'ئاگاداری: تەنها 10 وێنە ڕێگەپێدراوە بۆ هەر سکاڵایەک.',
                'Notice: Maximum 10 photos allowed per report.'
              )}
            </div>
          )}

          {photoItems.length > 0 && (
            <div className="space-y-2 pt-2 text-start">
              <div className="flex items-center justify-between text-xs font-bold text-[#1E3725] px-1">
                <span>
                  {tr(
                    `الصور المحددة (${photoItems.length} / ${MAX_UPLOAD_IMAGES}):`,
                    `وێنە دیاریکراوەکان (${photoItems.length} / ${MAX_UPLOAD_IMAGES}):`,
                    `Selected Photos (${photoItems.length} / ${MAX_UPLOAD_IMAGES}):`
                  )}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {photoItems.map((item, i) => (
                  <div
                    key={item.id}
                    className="group relative aspect-video rounded-xl overflow-hidden border border-[#BBDDC6] shadow-2xs bg-[#1E3725]"
                  >
                    <SmartAdaptiveImage
                      src={item.storageUrl || item.previewUrl}
                      alt={`attachment-${i + 1}`}
                      gallery={previewGalleryUrls}
                      initialIndex={i}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveImage(i);
                      }}
                      className="absolute top-1.5 right-1.5 z-20 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 transition-all cursor-pointer"
                      title={tr('حذف الصورة', 'سڕینەوەی وێنە', 'Remove photo')}
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                    <span
                      dir="ltr"
                      className="absolute bottom-1 left-1.5 z-20 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono pointer-events-none"
                    >
                      #{i + 1}/{MAX_UPLOAD_IMAGES}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-[#F4F9F5] border border-[#BBDDC6] space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <label className="block text-xs sm:text-sm font-black text-[#1E3725]">
            {tr(
              'اختر القطاع الخدمي المختص:',
              'کەرتی خزمەتگوزاری پەیوەندیدار هەڵبژێرە:',
              'Select Relevant Service Sector:'
            )}
          </label>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {Object.values(SECTOR_META).map((item) => {
            const isSelected = sector === item.key;
            const IconComp = SECTOR_ICONS[item.key];
            const itemTitle =
              language === 'ku'
                ? item.ku
                : language === 'en'
                ? item.en
                : item.labelAr;
            return (
              <div
                key={item.key}
                onClick={() => {
                  setValidationError(null);
                  playClickSound();
                  setSector(item.key);
                }}
                className={`group p-3 rounded-2xl border transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                  isRTL ? 'text-right' : 'text-left'
                } ${
                  isSelected
                    ? 'bg-[#E8F4EA] border-[#46674D] shadow-xs'
                    : 'bg-white border-[#BBDDC6] hover:bg-[#E8F4EA]/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-[#46674D] text-white shadow-2xs'
                        : 'bg-[#F4F9F5] text-[#2D4833] border border-[#BBDDC6]/40 shadow-2xs'
                    }`}
                  >
                    <IconComp className="w-4.5 h-4.5 stroke-[2.2]" />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playClickSound();
                        setSectorInfoModal(item.key);
                      }}
                      title={tr(
                        'أمثلة لاختيار هذا القطاع',
                        'نموونەی ئەم کەرتە',
                        'Examples for this sector'
                      )}
                      className="w-6 h-6 rounded-full bg-white hover:bg-[#D4EADB] text-[#1E3725] hover:text-[#46674D] flex items-center justify-center font-black text-xs border border-[#BBDDC6] shadow-2xs transition-all hover:scale-110 active:scale-95 cursor-pointer"
                    >
                      !
                    </button>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-[#46674D] shrink-0" />
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-black text-[#1E3725] leading-snug">
                    {itemTitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {sector === 'other' && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-2xl bg-[#E8F4EA] border border-[#88B793] space-y-1.5 shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <label className="block text-xs font-black text-[#1E3725]">
                  {tr(
                    'حدد نوع القطاع أو الخدمة المخصصة المطلوبة:',
                    'جۆری کەرت یان خزمەتگوزارییە تایبەتەکە بنووسە:',
                    'Specify Custom Sector or Requested Service:'
                  )}
                </label>
              </div>
              <FieldLimitBadge
                value={customSector}
                maxWords={FIELD_LIMITS.LOCATION.maxWords}
                maxChars={FIELD_LIMITS.LOCATION.maxChars}
              />
            </div>
            <input
              type="text"
              maxLength={FIELD_LIMITS.LOCATION.maxChars}
              value={customSector}
              onChange={(e) => {
                setValidationError(null);
                setCustomSector(
                  enforceInputLimit(
                    e.target.value,
                    FIELD_LIMITS.LOCATION.maxWords,
                    FIELD_LIMITS.LOCATION.maxChars
                  )
                );
              }}
              placeholder={tr(
                'اكتب اسم القطاع أو الخدمة...',
                'ناوی کەرت یان خزمەتگوزارییەکە بنووسە...',
                'Write sector/service name...'
              )}
              className="w-full bg-white border border-[#BBDDC6] rounded-xl px-3.5 py-2 text-xs font-bold text-[#1E3725] placeholder-[#46674D]/60 focus:border-[#46674D] focus:outline-none"
            />
          </motion.div>
        )}
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-[#F4F9F5] border border-[#BBDDC6] space-y-4 shadow-2xs">
        {/* 1. عنوان البلاغ مع زر اختيارات ذكية */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <label className="block text-xs sm:text-sm font-black text-[#1E3725]">
                {tr(
                  'عنوان البلاغ المختصر:',
                  'ناونیشانی کورتی سکاڵا:',
                  'Brief Report Title:'
                )}
              </label>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setSmartModalType('title');
                }}
                className="group inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl bg-white hover:bg-[#E2EEF9] text-[#1E75BB] hover:text-[#14558A] border border-[#BBDDC6] hover:border-[#1E75BB] transition-all active:scale-95 shadow-2xs cursor-pointer"
              >
                <span className="w-4.5 h-4.5 rounded-full bg-[#1E75BB] text-white flex items-center justify-center font-black text-xs shadow-2xs group-hover:scale-110 transition-transform">
                  !
                </span>
                <span className="text-[11px] font-black">
                  {tr('اختيارات ذكية', 'بژاردەی زیرەک', 'Smart Choices')}
                </span>
                <Sparkles className="w-3.5 h-3.5 text-[#1E75BB]" />
              </button>
            </div>
            <FieldLimitBadge
              value={title}
              maxWords={FIELD_LIMITS.TITLE.maxWords}
              maxChars={FIELD_LIMITS.TITLE.maxChars}
            />
          </div>
          <input
            type="text"
            maxLength={FIELD_LIMITS.TITLE.maxChars}
            value={title}
            onChange={(e) => {
              setValidationError(null);
              setTitle(
                enforceInputLimit(
                  e.target.value,
                  FIELD_LIMITS.TITLE.maxWords,
                  FIELD_LIMITS.TITLE.maxChars
                )
              );
            }}
            placeholder={tr(
              `مثال: عطل أو صيانة مطلوبة في ${selectedSectorLabel}`,
              `نموونە: کێشە یان چاککردنەوە لە ${selectedSectorLabel}`,
              `Example: Maintenance needed in ${selectedSectorLabel}`
            )}
            className="w-full bg-white border border-[#BBDDC6] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] placeholder-[#46674D]/60 focus:border-[#46674D] focus:outline-none"
          />
        </div>

        {/* 2. وصف المشكلة مع زر نماذج تفاصيل ذكية */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <label className="block text-xs sm:text-sm font-black text-[#1E3725]">
                {tr(
                  'وصف المشكلة الميدانية بالتفصيل:',
                  'وەسفی کێشە مەیدانییەکە بە وردی:',
                  'Detailed Field Problem Description:'
                )}
              </label>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setSmartModalType('description');
                }}
                className="group inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl bg-white hover:bg-[#E2EEF9] text-[#1E75BB] hover:text-[#14558A] border border-[#BBDDC6] hover:border-[#1E75BB] transition-all active:scale-95 shadow-2xs cursor-pointer"
              >
                <span className="w-4.5 h-4.5 rounded-full bg-[#1E75BB] text-white flex items-center justify-center font-black text-xs shadow-2xs group-hover:scale-110 transition-transform">
                  !
                </span>
                <span className="text-[11px] font-black">
                  {tr('نماذج تفاصيل ذكية', 'مۆدێلی وردەکاری زیرەک', 'Smart Details')}
                </span>
                <Sparkles className="w-3.5 h-3.5 text-[#1E75BB]" />
              </button>
              <span className="px-1.5 py-0.2 rounded bg-[#E8F4EA] text-[#46674D] text-[10px] font-bold border border-[#BBDDC6]">
                {tr('(اختياري)', '(ئارەزوومەندانە)', '(Optional)')}
              </span>
            </div>
            <FieldLimitBadge
              value={description}
              maxWords={FIELD_LIMITS.DESCRIPTION.maxWords}
              maxChars={FIELD_LIMITS.DESCRIPTION.maxChars}
            />
          </div>
          <textarea
            rows={4}
            maxLength={FIELD_LIMITS.DESCRIPTION.maxChars}
            value={description}
            onChange={(e) =>
              setDescription(
                enforceInputLimit(
                  e.target.value,
                  FIELD_LIMITS.DESCRIPTION.maxWords,
                  FIELD_LIMITS.DESCRIPTION.maxChars
                )
              )
            }
            placeholder={tr(
              'اشرح طبيعة المشكلة الميدانية وأثرها ليتم توجيه الفريق المختص بالمعدات المناسبة...',
              'سروشتی کێشەکە و کاریگەرییەکانی ڕوون بکەرەوە بۆ ئاڕاستەکردنی تیمی تایبەتمەند...',
              'Describe the field problem and its impact so the right team and equipment can be dispatched...'
            )}
            className="w-full bg-white border border-[#BBDDC6] rounded-xl p-3 text-xs font-bold text-[#1E3725] placeholder-[#46674D]/60 focus:border-[#46674D] focus:outline-none"
          />
        </div>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-[#F4F9F5] border border-[#BBDDC6] space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <label className="block text-xs sm:text-sm font-black text-[#1E3725]">
            {tr('اعتماد الموقع:', 'پەسەندکردنی شوێن:', 'Confirm Location:')}
          </label>
          <span
            dir="ltr"
            className="text-[11px] font-mono font-bold text-[#46674D] bg-white px-2.5 py-0.5 rounded-lg border border-[#BBDDC6]"
          >
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </span>
        </div>

        <EmbeddedGoogleMapPreviewCard
          latitude={latitude}
          longitude={longitude}
          onSelectLocation={onSelectLocation}
          onOpenFullScreen={onOpenFullScreenMap}
        />
      </div>
    );
  }

  return null;
};
