import React, { useState } from 'react';
import { X, CheckCircle2, Upload, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBaadre } from '../context/BaadreContext';
import { useLanguage } from '../context/LanguageContext';
import {
  ReportSector,
  BAADRE_NEIGHBORHOODS,
  BAADRE_CENTER_COORDS,
  SECTOR_META,
  SECTOR_ILLUSTRATIONS,
} from '../types/baadre';
import { playSuccessSound } from '../lib/sound';
import {
  compressImageFile,
  uploadImageToFirebaseStorage,
  MAX_UPLOAD_IMAGES,
} from '../lib/firebase';
import {
  FullScreenGoogleMapPickerModal,
  EmbeddedGoogleMapPreviewCard,
} from './FullScreenGoogleMapPickerModal';
import { SmartAdaptiveImage } from './SmartAdaptiveImage';
import {
  FIELD_LIMITS,
  enforceInputLimit,
  enforcePhoneLimit,
  FieldLimitBadge,
} from '../lib/inputLimits';

interface AddOrganizationProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddOrganizationProjectModal: React.FC<AddOrganizationProjectModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { addProject, departments } = useBaadre();
  const { language, isRTL } = useLanguage();

  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

  const [title, setTitle] = useState('');
  const [completedDepartment, setCompletedDepartment] = useState(
    departments[0]?.nameAr || 'مديرية بلدية باعدرى - قسم الطرق'
  );
  const [sector, setSector] = useState<ReportSector>('roads');
  const [neighborhood, setNeighborhood] = useState(BAADRE_NEIGHBORHOODS[0].ar);
  const [durationText, setDurationText] = useState('6 ساعات');
  const [description, setDescription] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [beforeImages, setBeforeImages] = useState<string[]>([]);
  const [afterImages, setAfterImages] = useState<string[]>([]);
  const [latitude, setLatitude] = useState<number>(BAADRE_CENTER_COORDS.lat);
  const [longitude, setLongitude] = useState<number>(BAADRE_CENTER_COORDS.lng);
  const [isFullScreenMapOpen, setIsFullScreenMapOpen] = useState<boolean>(false);
  const [isUploadingStorage, setIsUploadingStorage] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'before' | 'after'
  ) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    e.target.value = '';

    if (target === 'before') {
      const remaining = MAX_UPLOAD_IMAGES - beforeImages.length;
      if (remaining <= 0) return;
      const slice = files.slice(0, remaining);
      const compressedList = await Promise.all(slice.map((f: File) => compressImageFile(f)));
      const valid = compressedList.filter(Boolean);
      if (valid.length > 0) {
        setBeforeImages((prev) => [...prev, ...valid].slice(0, MAX_UPLOAD_IMAGES));
      }
    } else {
      const remaining = MAX_UPLOAD_IMAGES - afterImages.length;
      if (remaining <= 0) return;
      const slice = files.slice(0, remaining);
      const compressedList = await Promise.all(slice.map((f: File) => compressImageFile(f)));
      const valid = compressedList.filter(Boolean);
      if (valid.length > 0) {
        setAfterImages((prev) => [...prev, ...valid].slice(0, MAX_UPLOAD_IMAGES));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !completedDepartment.trim() || isUploadingStorage) return;

    const defaultImg = SECTOR_ILLUSTRATIONS[sector] || SECTOR_ILLUSTRATIONS.other;

    setIsUploadingStorage(true);
    let finalBeforeList: string[] = [defaultImg];
    let finalAfterList: string[] = [defaultImg];

    try {
      if (beforeImages.length > 0) {
        finalBeforeList = await Promise.all(
          beforeImages
            .slice(0, MAX_UPLOAD_IMAGES)
            .map((img) => uploadImageToFirebaseStorage(img, 'completed_work'))
        );
      }
      if (afterImages.length > 0) {
        finalAfterList = await Promise.all(
          afterImages
            .slice(0, MAX_UPLOAD_IMAGES)
            .map((img) => uploadImageToFirebaseStorage(img, 'completed_work'))
        );
      }
    } finally {
      setIsUploadingStorage(false);
    }

    playSuccessSound();

    addProject({
      title: title.trim(),
      organizationName: completedDepartment.trim(),
      completedDepartment: completedDepartment.trim(),
      category: 'Municipal',
      sector,
      status: 'completed',
      neighborhood,
      description:
        description.trim() ||
        tr(
          'بلاغ ميداني وارد من المواطن تمت معالجته بالكامل.',
          'سکاڵای مەیدانی هاوڵاتی بە تەواوی چارەسەر کرا.',
          'Citizen field report fully resolved.'
        ),
      completionNotes:
        completionNotes.trim() ||
        tr(
          'تم إنجاز العمل الميداني بنجاح من قِبل الدائرة المعنية.',
          'کارە مەیدانییەکە بە سەرکەوتوویی لەلایەن فەرمانگەی پەیوەندیدار ئەنجامدرا.',
          'Field work completed successfully by the relevant department.'
        ),
      durationText: durationText.trim() || tr('6 ساعات', '6 کاتژمێر', '6 hours'),
      reporterName: reporterName.trim() || tr('مواطن من باعدرى', 'هاوڵاتییەک لە باعەدرێ', 'Baadre Citizen'),
      reporterPhone: reporterPhone.trim() || '07500000000',
      managedByPeople: [completedDepartment.trim()],
      beforeImage: finalBeforeList[0] || defaultImg,
      beforeImages: finalBeforeList,
      afterImages: finalAfterList,
      progressPercentage: 100,
      startDate: new Date().toISOString().slice(0, 10),
      expectedCompletionDate: new Date().toISOString().slice(0, 10),
      images: finalAfterList,
    });

    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#1E3725]/30 backdrop-blur-sm"
        />

        <motion.div
          dir={isRTL ? 'rtl' : 'ltr'}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl bg-white border border-[#BBDDC6] rounded-3xl shadow-[0_20px_60px_rgba(70,103,77,0.22)] overflow-hidden z-10 my-auto flex flex-col"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#BBDDC6]/70 bg-gradient-to-l from-[#E8F4EA] via-[#F4F9F5] to-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#46674D] text-white">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-[#1E3725]">
                  {tr(
                    'إضافة عمل منجز جديد (قبل وبعد)',
                    'زیادکردنی کاری ئەنجامدراوی نوێ (پێش و دوای)',
                    'Add New Completed Work (Before & After)'
                  )}
                </h2>
                <p className="text-[11px] font-bold text-[#46674D]">
                  {tr(
                    'توثيق صورة البلاغ وصورة الإنجاز والدائرة المعنية',
                    'دیکۆمێنتکردنی وێنەی سکاڵا و وێنەی ئەنجامدان و فەرمانگەی پەیوەندیدار',
                    'Document report photo, completion photo, and department'
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-[#E8F4EA] hover:bg-[#D4EADB] text-[#2D4833] transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form
            onSubmit={handleSubmit}
            className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[78vh] custom-scrollbar"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="block text-xs font-black text-[#1E3725]">
                  {tr(
                    'عنوان البلاغ / العمل المنجز:',
                    'ناونیشانی سکاڵا / کاری ئەنجامدراو:',
                    'Report / Completed Work Title:'
                  )}
                </label>
                <FieldLimitBadge
                  value={title}
                  maxWords={FIELD_LIMITS.TITLE.maxWords}
                  maxChars={FIELD_LIMITS.TITLE.maxChars}
                />
              </div>
              <input
                type="text"
                required
                maxLength={FIELD_LIMITS.TITLE.maxChars}
                value={title}
                onChange={(e) =>
                  setTitle(
                    enforceInputLimit(
                      e.target.value,
                      FIELD_LIMITS.TITLE.maxWords,
                      FIELD_LIMITS.TITLE.maxChars
                    )
                  )
                }
                placeholder={tr(
                  'مثال: معالجة وتعبيد تخسف الشارع الرئيسي في باعدرى',
                  'نموونە: چارەسەرکردن و قیرتاوکردنی شەقامی سەرەکی لە باعەدرێ',
                  'e.g. Repairing and paving main street pothole in Baadre'
                )}
                className="w-full bg-[#F4F9F5] border border-[#BBDDC6] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] focus:border-[#46674D] focus:bg-white focus:outline-none"
              />
            </div>

            {/* رفع صور عند البلاغ (قبل) + صور عند الإنجاز (بعد) بحد أقصى 10 صور */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                {beforeImages.length < MAX_UPLOAD_IMAGES && (
                  <label className="p-3 rounded-2xl bg-amber-50/70 border border-dashed border-amber-300 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-amber-50 transition-colors text-center">
                    <Upload className="w-4 h-4 text-amber-700" />
                    <span className="text-xs font-black text-amber-900">
                      {beforeImages.length > 0
                        ? `${tr('صور البلاغ (قبل)', 'وێنەکانی سکاڵا (پێش)', 'Before Photos')} (${beforeImages.length}/${MAX_UPLOAD_IMAGES})`
                        : tr('رفع صور البلاغ - قبل (حتى 10 صور)', 'بارکردنی وێنەی سکاڵا - پێش (تا 10 وێنە)', 'Upload Before Photos (up to 10)')}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleImageUpload(e, 'before')}
                      className="hidden"
                    />
                  </label>
                )}
                {beforeImages.length > 0 && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {beforeImages.map((img, idx) => (
                      <div
                        key={`before-up-${idx}`}
                        className="relative rounded-xl overflow-hidden border border-amber-300 aspect-video bg-[#1E3725]"
                      >
                        <SmartAdaptiveImage
                          src={img}
                          alt={`Before ${idx + 1}`}
                          gallery={beforeImages}
                          initialIndex={idx}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setBeforeImages((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="absolute top-1 left-1 z-20 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {afterImages.length < MAX_UPLOAD_IMAGES && (
                  <label className="p-3 rounded-2xl bg-[#E8F4EA]/70 border border-dashed border-[#88B793] flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-[#E8F4EA] transition-colors text-center">
                    <Upload className="w-4 h-4 text-[#46674D]" />
                    <span className="text-xs font-black text-[#1E3725]">
                      {afterImages.length > 0
                        ? `${tr('صور الإنجاز (بعد)', 'وێنەکانی ئەنجامدان (دوای)', 'After Photos')} (${afterImages.length}/${MAX_UPLOAD_IMAGES})`
                        : tr('رفع صور الإنجاز - بعد (حتى 10 صور)', 'بارکردنی وێنەی ئەنجامدان - دوای (تا 10 وێنە)', 'Upload After Photos (up to 10)')}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleImageUpload(e, 'after')}
                      className="hidden"
                    />
                  </label>
                )}
                {afterImages.length > 0 && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {afterImages.map((img, idx) => (
                      <div
                        key={`after-up-${idx}`}
                        className="relative rounded-xl overflow-hidden border border-emerald-300 aspect-video bg-[#1E3725]"
                      >
                        <SmartAdaptiveImage
                          src={img}
                          alt={`After ${idx + 1}`}
                          gallery={afterImages}
                          initialIndex={idx}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setAfterImages((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="absolute top-1 left-1 z-20 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-xs font-black text-[#1E3725]">
                    {tr(
                      'اسم الدائرة المعنية المنجزة:',
                      'ناوی فەرمانگەی جێبەجێکار:',
                      'Executing Department Name:'
                    )}
                  </label>
                  <FieldLimitBadge
                    value={completedDepartment}
                    maxWords={FIELD_LIMITS.DEPT_NAME.maxWords}
                    maxChars={FIELD_LIMITS.DEPT_NAME.maxChars}
                  />
                </div>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.DEPT_NAME.maxChars}
                  value={completedDepartment}
                  onChange={(e) =>
                    setCompletedDepartment(
                      enforceInputLimit(
                        e.target.value,
                        FIELD_LIMITS.DEPT_NAME.maxWords,
                        FIELD_LIMITS.DEPT_NAME.maxChars
                      )
                    )
                  }
                  placeholder={tr(
                    'مثال: مديرية بلدية باعدرى - قسم الطرق',
                    'نموونە: بەڕێوەبەرایەتی شارەوانی باعەدرێ',
                    'e.g. Baadre Municipality Directorate'
                  )}
                  className="w-full bg-[#F4F9F5] border border-[#BBDDC6] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] focus:border-[#46674D] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-xs font-black text-[#1E3725]">
                    {tr(
                      'المدة بين البلاغ والإنجاز:',
                      'ماوەی نێوان سکاڵا و ئەنجامدان:',
                      'Completion Duration:'
                    )}
                  </label>
                  <FieldLimitBadge
                    value={durationText}
                    maxWords={FIELD_LIMITS.DURATION.maxWords}
                    maxChars={FIELD_LIMITS.DURATION.maxChars}
                  />
                </div>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.DURATION.maxChars}
                  value={durationText}
                  onChange={(e) =>
                    setDurationText(
                      enforceInputLimit(
                        e.target.value,
                        FIELD_LIMITS.DURATION.maxWords,
                        FIELD_LIMITS.DURATION.maxChars
                      )
                    )
                  }
                  placeholder={tr('مثال: 6 ساعات / يوم واحد', 'نموونە: 6 کاتژمێر / یەک ڕۆژ', 'e.g. 6 hours / 1 day')}
                  className="w-full bg-[#F4F9F5] border border-[#BBDDC6] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] focus:border-[#46674D] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* اسم ورقم المبلّغ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-xs font-black text-[#1E3725]">
                    {tr('اسم المواطن المبلّغ:', 'ناوی هاوڵاتی سکاڵاکار:', 'Reporter Citizen Name:')}
                  </label>
                  <FieldLimitBadge
                    value={reporterName}
                    maxWords={FIELD_LIMITS.NAME.maxWords}
                    maxChars={FIELD_LIMITS.NAME.maxChars}
                  />
                </div>
                <input
                  type="text"
                  maxLength={FIELD_LIMITS.NAME.maxChars}
                  value={reporterName}
                  onChange={(e) =>
                    setReporterName(
                      enforceInputLimit(
                        e.target.value,
                        FIELD_LIMITS.NAME.maxWords,
                        FIELD_LIMITS.NAME.maxChars
                      )
                    )
                  }
                  placeholder={tr('مثال: دلشاد باعدري', 'نموونە: دڵشاد باعەدری', 'e.g. Dilshad Baadri')}
                  className="w-full bg-[#F4F9F5] border border-[#BBDDC6] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] focus:border-[#46674D] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-xs font-black text-[#1E3725]">
                    {tr('رقم هاتف المبلّغ:', 'ژمارەی مۆبایلی سکاڵاکار:', 'Reporter Phone:')}
                  </label>
                  <FieldLimitBadge
                    value={reporterPhone}
                    maxChars={FIELD_LIMITS.PHONE.maxChars}
                    isPhone
                  />
                </div>
                <input
                  type="tel"
                  dir="ltr"
                  maxLength={FIELD_LIMITS.PHONE.maxChars}
                  value={reporterPhone}
                  onChange={(e) => setReporterPhone(enforcePhoneLimit(e.target.value))}
                  placeholder="07504112233"
                  className="w-full bg-[#F4F9F5] border border-[#BBDDC6] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-[#1E3725] focus:border-[#46674D] focus:bg-white focus:outline-none text-right"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-[#1E3725] mb-1">
                  {tr('القطاع:', 'کەرت:', 'Sector:')}
                </label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value as ReportSector)}
                  className="w-full bg-[#F4F9F5] border border-[#BBDDC6] rounded-xl px-3 py-2.5 text-xs font-bold text-[#1E3725] focus:border-[#46674D] focus:bg-white focus:outline-none"
                >
                  {Object.values(SECTOR_META).map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.badgeEmoji}{' '}
                      {language === 'ku' ? s.ku : language === 'en' ? s.en : s.ar}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-[#1E3725] mb-1">
                  {tr('الحي / الموقع:', 'گەڕەک / شوێن:', 'Neighborhood / Location:')}
                </label>
                <select
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full bg-[#F4F9F5] border border-[#BBDDC6] rounded-xl px-3 py-2.5 text-xs font-bold text-[#1E3725] focus:border-[#46674D] focus:bg-white focus:outline-none"
                >
                  {BAADRE_NEIGHBORHOODS.map((n) => (
                    <option key={n.id} value={n.ar}>
                      {language === 'ku' ? n.ku : language === 'en' ? n.en : n.ar}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="block text-xs font-black text-[#1E3725]">
                  {tr('تفاصيل البلاغ:', 'وردەکاری سکاڵا:', 'Report Details:')}
                </label>
                <FieldLimitBadge
                  value={description}
                  maxWords={FIELD_LIMITS.DESCRIPTION.maxWords}
                  maxChars={FIELD_LIMITS.DESCRIPTION.maxChars}
                />
              </div>
              <textarea
                rows={2}
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
                  'اكتب تفاصيل البلاغ المقدم من المواطن...',
                  'وردەکاری سکاڵای پێشکەشکراو لەلایەن هاوڵاتییەوە بنووسە...',
                  'Write details of the citizen report...'
                )}
                className="w-full bg-[#F4F9F5] border border-[#BBDDC6] rounded-xl p-3 text-xs font-bold text-[#1E3725] focus:border-[#46674D] focus:bg-white focus:outline-none"
              />
            </div>

            {/* Google Maps Location Picker */}
            <EmbeddedGoogleMapPreviewCard
              latitude={latitude}
              longitude={longitude}
              onSelectLocation={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
              }}
              onOpenFullScreen={() => setIsFullScreenMapOpen(true)}
            />

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#F4F9F5] border border-[#BBDDC6] text-[#2D4833] font-bold text-xs cursor-pointer"
              >
                {tr('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={isUploadingStorage}
                className="px-5 py-2 rounded-xl bg-[#46674D] hover:bg-[#36593F] disabled:opacity-60 text-white font-black text-xs shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                {isUploadingStorage ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{tr('جاري رفع الصور...', 'بارکردنی وێنەکان...', 'Uploading...')}</span>
                  </>
                ) : (
                  <span>
                    {tr('نشر وحفظ العمل المنجز', 'بڵاوکردنەوە و پاشەکەوتکردن', 'Publish & Save Completed Work')}
                  </span>
                )}
              </button>
            </div>
          </form>
        </motion.div>

        <FullScreenGoogleMapPickerModal
          isOpen={isFullScreenMapOpen}
          onClose={() => setIsFullScreenMapOpen(false)}
          latitude={latitude}
          longitude={longitude}
          onSelectLocation={(lat, lng) => {
            setLatitude(lat);
            setLongitude(lng);
          }}
        />
      </div>
    </AnimatePresence>
  );
};

