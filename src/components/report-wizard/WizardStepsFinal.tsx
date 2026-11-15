import React from 'react';
import {
  MapPin,
  Camera,
  Check,
  User,
  Phone,
  FileText,
} from 'lucide-react';
import { motion } from 'motion/react';
import { ReportSector, SECTOR_META } from '../../types/baadre';
import {
  FIELD_LIMITS,
  enforceInputLimit,
  enforcePhoneLimit,
  FieldLimitBadge,
} from '../../lib/inputLimits';
import { SmartAdaptiveImage } from '../SmartAdaptiveImage';
import { WizardStep } from './wizardSuggestions';

interface WizardStepsFinalProps {
  step: WizardStep;
  isRTL: boolean;
  tr: (ar: string, ku: string, en: string) => string;
  setValidationError: (val: string | null) => void;
  // Step 8: Citizen Name & Phone
  citizenName: string;
  setCitizenName: (val: string) => void;
  citizenPhone: string;
  setCitizenPhone: (val: string) => void;
  // Step 9: Sequential Review
  previewGalleryUrls: string[];
  sector: ReportSector;
  selectedSectorLabel: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  finalNeighborhoodVal: string;
  street: string;
  landmark: string;
  isSent: boolean;
}

export const WizardStepsFinal: React.FC<WizardStepsFinalProps> = ({
  step,
  isRTL,
  tr,
  setValidationError,
  citizenName,
  setCitizenName,
  citizenPhone,
  setCitizenPhone,
  previewGalleryUrls,
  sector,
  selectedSectorLabel,
  title,
  description,
  latitude,
  longitude,
  finalNeighborhoodVal,
  street,
  landmark,
  isSent,
}) => {
  if (step === 8) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-[#F4F9F5] border border-[#BBDDC6] space-y-4 shadow-2xs">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5">
              <label className="block text-xs sm:text-sm font-black text-[#1E3725]">
                {tr(
                  'اسم المواطن الكامل:',
                  'ناوی تەواوی هاووڵاتی:',
                  'Full Citizen Name:'
                )}
              </label>
            </div>
            <FieldLimitBadge
              value={citizenName}
              maxWords={FIELD_LIMITS.NAME.maxWords}
              maxChars={FIELD_LIMITS.NAME.maxChars}
            />
          </div>
          <input
            type="text"
            maxLength={FIELD_LIMITS.NAME.maxChars}
            value={citizenName}
            onChange={(e) => {
              setValidationError(null);
              setCitizenName(
                enforceInputLimit(
                  e.target.value,
                  FIELD_LIMITS.NAME.maxWords,
                  FIELD_LIMITS.NAME.maxChars
                )
              );
            }}
            placeholder={tr(
              'الاسم الثلاثي أو الكامل',
              'ناوی سیانی یان تەواو',
              'Full Name'
            )}
            className="w-full bg-white border border-[#BBDDC6] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] focus:border-[#46674D] focus:outline-none"
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5">
              <label className="block text-xs sm:text-sm font-black text-[#1E3725]">
                {tr(
                  'رقم الهاتف / واتساب للتنبيه:',
                  'ژمارەی مۆبایل / واتسئەپ بۆ ئاگادارکردنەوە:',
                  'Phone / WhatsApp Number for Alerts:'
                )}
              </label>
            </div>
            <FieldLimitBadge
              value={citizenPhone}
              maxChars={FIELD_LIMITS.PHONE.maxChars}
              isPhone
            />
          </div>
          <input
            type="tel"
            dir="ltr"
            maxLength={FIELD_LIMITS.PHONE.maxChars}
            value={citizenPhone}
            onChange={(e) => {
              setValidationError(null);
              setCitizenPhone(enforcePhoneLimit(e.target.value));
            }}
            placeholder="0750 XXX XXXX"
            className={`w-full bg-white border border-[#BBDDC6] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] focus:border-[#46674D] focus:outline-none ${
              isRTL ? 'text-right' : 'text-left'
            }`}
          />
        </div>

        <div className="pt-2 border-t border-[#E8F4EA]">
          <p className="text-xs font-bold text-amber-800 leading-relaxed text-center bg-amber-50/95 border border-amber-200/90 rounded-xl px-3.5 py-2.5 shadow-2xs">
            {tr(
              'اطمئن تماماً، بياناتك الشخصية ورقم هاتفك في أمان تام ومحفوظة بسرية كاملة؛ فهي لا تظهر للعامة داخل التطبيق ولا تُشارك مع أي جهة خارجية مطلقاً، وإنما تُستخدم فقط للتواصل معك وخدمتك بأفضل شكل.',
              'بە تەواوی دڵنیابە، زانیارییە کەسییەکانت و ژمارەی مۆبایلەکەت بە تەواوی پارێزراون؛ بە هیچ شێوەیەک لەناو ئەپڵیکەیشنەکەدا بۆ خەڵک دەرناکەون و نادرێن بە هیچ لایەنێکی دەرەکی، تەنها بۆ پەیوەندیکردن و خزمەتکردنی ئێوە بەکاردێن.',
              'Rest assured, your personal details and phone number are strictly protected and confidential; they are never displayed publicly in the app or shared with any external party, and are used solely to update and serve you.'
            )}
          </p>
        </div>
      </div>
    );
  }

  if (step === 9) {
    return (
      <div className="space-y-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-[#F4F9F5] border border-[#BBDDC6] space-y-3.5 text-xs">
          <div className="flex items-center justify-between border-b border-[#E8F4EA] pb-2.5">
            <h3 className="text-xs sm:text-sm font-black text-[#1E3725]">
              {tr(
                'مراجعة البيانات المدخلة بالتسلسل من الأول إلى الأخير:',
                'پێداچوونەوەی زانیارییەکان بە زنجیرە لە سەرەتاوە تا کۆتایی:',
                'Sequential Review of Entered Data (First to Last):'
              )}
            </h3>
          </div>

          {/* 1. الصور المرفقة */}
          <div className="p-3 rounded-xl bg-white border border-[#E8F4EA] space-y-2">
            <div className="flex items-center justify-between font-black text-[#1E3725]">
              <span className="inline-flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#46674D]" />
                <span>
                  {tr('1. الصور المرفقة:', '1. وێنە هاوپێچکراوەکان:', '1. Attached Photos:')}
                </span>
              </span>
              <span dir="ltr" className="font-mono text-[#46674D]">
                {previewGalleryUrls.length}
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {previewGalleryUrls.map((url, idx) => (
                <div
                  key={`rev-img-${idx}`}
                  className="aspect-video rounded-lg overflow-hidden border border-[#BBDDC6] bg-[#1E3725]"
                >
                  <SmartAdaptiveImage
                    src={url}
                    alt={`review-${idx + 1}`}
                    gallery={previewGalleryUrls}
                    initialIndex={idx}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 2. القطاع الخدمي المختص */}
          <div className="p-3 rounded-xl bg-white border border-[#E8F4EA] flex items-center justify-between gap-2">
            <span className="font-black text-[#1E3725]">
              {tr(
                '2. القطاع الخدمي المختص:',
                '2. کەرتی خزمەتگوزاری پەیوەندیدار:',
                '2. Service Sector:'
              )}
            </span>
            <span className="font-black text-[#46674D]">
              {SECTOR_META[sector].badgeEmoji} {selectedSectorLabel}
            </span>
          </div>

          {/* 3. عنوان البلاغ المختصر ووصف المشكلة الميدانية بالتفصيل */}
          <div className="p-3 rounded-xl bg-white border border-[#E8F4EA] space-y-1.5">
            <div className="flex items-center gap-1.5 font-black text-[#1E3725]">
              <FileText className="w-3.5 h-3.5 text-[#46674D]" />
              <span>
                {tr(
                  '3. عنوان البلاغ المختصر ووصف المشكلة:',
                  '3. ناونیشانی سکاڵا و وەسفی کێشەکە:',
                  '3. Report Title & Problem Description:'
                )}
              </span>
            </div>
            <p className="font-black text-[#1E3725]">{title}</p>
            {description.trim() && (
              <p className="text-[#2D4833] font-medium leading-relaxed bg-[#F4F9F5] p-2 rounded-lg">
                {description}
              </p>
            )}
          </div>

          {/* 4. اعتماد الموقع */}
          <div className="p-3 rounded-xl bg-white border border-[#E8F4EA] flex items-center justify-between gap-2">
            <span className="font-black text-[#1E3725] inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#46674D]" />
              <span>
                {tr('4. الموقع المعتمد:', '4. شوێنی پەسەندکراو:', '4. Confirmed Location:')}
              </span>
            </span>
            <span dir="ltr" className="font-mono font-bold text-[#46674D]">
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </span>
          </div>

          {/* 5. الحي أو الزقاق */}
          <div className="p-3 rounded-xl bg-white border border-[#E8F4EA] flex items-center justify-between gap-2">
            <span className="font-black text-[#1E3725]">
              {tr('5. الحي أو الزقاق:', '5. تاخ یان گەڕەک:', '5. Neighborhood / Quarter:')}
            </span>
            <span className="font-bold text-teal-800">{finalNeighborhoodVal}</span>
          </div>

          {/* 6. اسم الشارع */}
          <div className="p-3 rounded-xl bg-white border border-[#E8F4EA] flex items-center justify-between gap-2">
            <span className="font-black text-[#1E3725]">
              {tr('6. اسم الشارع:', '6. ناوی شەقام:', '6. Street Name:')}
            </span>
            <span className="font-bold text-teal-800">{street}</span>
          </div>

          {/* 7. أقرب نقطة دالة */}
          <div className="p-3 rounded-xl bg-white border border-[#E8F4EA] flex items-center justify-between gap-2">
            <span className="font-black text-[#1E3725]">
              {tr('7. أقرب نقطة دالة:', '7. نزیکترین خاڵ:', '7. Nearest Landmark:')}
            </span>
            <span className="font-bold text-teal-800">
              {landmark.trim() ||
                tr('لم تحدد (اختياري)', 'دیاری نەکراوە (ئارەزوومەندانە)', 'None specified (Optional)')}
            </span>
          </div>

          {/* 8. اسم المواطن الكامل • رقم الهاتف / واتساب للتنبيه */}
          <div className="p-3 rounded-xl bg-white border border-[#E8F4EA] flex flex-wrap items-center justify-between gap-2">
            <span className="font-black text-[#1E3725] inline-flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#46674D]" />
              <span>{tr('8. بيانات المواطن:', '8. زانیاری هاووڵاتی:', '8. Citizen Info:')}</span>
              <span>{citizenName}</span>
            </span>
            <span
              dir="ltr"
              className="font-mono font-black text-[#46674D] inline-flex items-center gap-1"
            >
              <Phone className="w-3 h-3" />
              <span>{citizenPhone}</span>
            </span>
          </div>

          <p className="text-xs font-bold text-amber-800 leading-relaxed text-center bg-amber-50/95 border border-amber-200/90 rounded-xl px-3.5 py-2.5 shadow-2xs">
            {tr(
              'اطمئن تماماً، بياناتك الشخصية ورقم هاتفك في أمان تام ومحفوظة بسرية كاملة؛ فهي لا تظهر للعامة داخل التطبيق ولا تُشارك مع أي جهة خارجية مطلقاً.',
              'بە تەواوی دڵنیابە، زانیارییە کەسییەکانت و ژمارەی مۆبایلەکەت بە تەواوی پارێزراون و بە هیچ شێوەیەک لەناو ئەپڵیکەیشنەکەدا بۆ خەڵک دەرناکەون.',
              'Rest assured, your personal details and phone number are strictly protected and never displayed publicly in the app.'
            )}
          </p>
        </div>

        {isSent && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-[#E8F4EA] border border-[#88B793] text-xs font-black text-[#1E3725] flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 text-[#46674D]" />
            <span>
              {tr(
                'تم حفظ البلاغ وإرسال الرسالة إلى واتساب بنجاح',
                'سکاڵاکە پاشەکەوتکرا و پەیامەکە بۆ واتسئەپ نێردرا',
                'Report saved and message dispatched to WhatsApp'
              )}
            </span>
          </motion.div>
        )}
      </div>
    );
  }

  return null;
};
