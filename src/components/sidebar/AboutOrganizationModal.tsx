import React from 'react';
import { X, Info, Building, Sparkles, Mail, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  OFFICIAL_PHONE_LOCAL,
  OFFICIAL_CONTACT_EMAIL,
  toTelHref,
} from '../../constants/officialContact';

export interface AboutOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  dir: 'rtl' | 'ltr';
  isRTL: boolean;
  tr: (ar: string, ku: string, en: string) => string;
}

export const AboutOrganizationModal: React.FC<AboutOrganizationModalProps> = ({
  isOpen,
  onClose,
  dir,
  isRTL,
  tr,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div
          dir={dir}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#1B3A46]/50 backdrop-blur-xs"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-xl max-h-[88vh] rounded-3xl bg-white shadow-[0_24px_60px_rgba(27,58,70,0.25)] border border-[#CFE2E8] overflow-hidden flex flex-col ${
              isRTL ? 'text-right' : 'text-left'
            }`}
          >
            <div className="p-5 bg-[#EFF6F8] border-b border-[#DAE9EE] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#467586] text-white flex items-center justify-center shadow-xs">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1B3A46]">
                    {tr(
                      'من نحن — منظمة RABA وتطبيق ÇAVÊ BAADRÊ',
                      'ئێمە کێین — ڕێکخراوی RABA و ئەپی ÇAVÊ BAADRÊ',
                      'About Us — RABA Organization & ÇAVÊ BAADRÊ'
                    )}
                  </h3>
                  <p className="text-xs font-bold text-[#3B6878]">
                    {tr(
                      'منصة الخدمات المجتمعية في ناحية باعذرة',
                      'سەکۆی خزمەتگوزارییە کۆمەڵایەتییەکان لە ناحیەی باعەدرێ',
                      'Civic & Community Service Platform in Baadre'
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-[#3B6878] hover:bg-[#DFEEF3] transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm text-[#1B3A46] leading-relaxed overflow-y-auto custom-scrollbar">
              <div className="p-4 rounded-2xl bg-[#F2F8FA] border border-[#CFE2E8] space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-[#1B3A46]">
                  <Building className="w-4 h-4 text-[#467586]" />
                  <span>
                    {tr(
                      'نبذة عن منظمة RABA (ڕێکخراوی RABA)',
                      'دەربارەی ڕێکخراوی RABA',
                      'About RABA Organization'
                    )}
                  </span>
                </div>
                <p className="font-medium text-[#285060] text-xs leading-relaxed">
                  {tr(
                    'منظمة RABA هي منظمة مجتمعية غير حكومية تهدف إلى تمكين المجتمعات المحلية، دعم التنمية الحضرية المستدامة، وتوظيف التقنيات الذكية لتعزيز التواصل المباشر بين المواطنين والمؤسسات الخدمية لرفع مستوى جودة الحياة.',
                    'ڕێکخراوی RABA ڕێکخراوێکی کۆمەڵایەتی ناحکومییە بە مەبەستی بەهێزکردنی کۆمەڵگە، پەرەپێدانی بەردەوام، و بەکارهێنانی تەکنەلۆژیای زیرەک بۆ نزیککردنەوەی هاووڵاتیان لە دامەزراوە خزمەتگوزارییەکان.',
                    'RABA Organization is a non-governmental civic organization dedicated to community empowerment, sustainable development, and smart digital governance to enhance local living standards.'
                  )}
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-black text-[#1B3A46]">
                  {tr(
                    'تطبيق ÇAVÊ BAADRÊ (عين باعذرة / چاڤێ باعدرێ)',
                    'ئەپی ÇAVÊ BAADRÊ (چاڤێ باعدرێ)',
                    'The ÇAVÊ BAADRÊ Application'
                  )}
                </h4>
                <p className="font-medium text-[#285060] text-xs leading-relaxed">
                  {tr(
                    'تطبيق ÇAVÊ BAADRÊ هو المنصة الرقمية الميدانية المعتمدة من منظمة RABA لخدمة أهالي ناحية باعذرة (المركز، المجمعات، والقرى التابعة). يوفر التطبيق حلاً تقنياً آمناً لتوثيق المشاكل والأعطال بالصور والموقع الجغرافي، وإحالتها فورياً إلى الدوائر الخدمية المختصة ومتابعة مراحل إنجازها.',
                    'ئەپی ÇAVÊ BAADRÊ سەکۆی دیجیتاڵی فەرمی ڕێکخراوی RABAیە بۆ خزمەتکردنی هاووڵاتیانی ناحیەی باعەدرێ و کۆمەڵگە و گوندەکانی. ئەپەکە ڕێگەیەکی ئاسانە بۆ وەرگرتنی سکاڵاکان بە وێنە و GPS و ناردنی بۆ فەرمانگە پەیوەندیدارەکان و بەدواداچوونی چاککردنەوەیان.',
                    'ÇAVÊ BAADRÊ is the verified civic platform launched by RABA Organization to serve Baadre sub-district, enabling photo-documented GPS reporting, instant municipal referral, and transparent work verification.'
                  )}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#F2F8FA] space-y-2 border border-[#DAE9EE]">
                <p className="text-xs font-black text-[#285060] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#467586]" />
                  <span>
                    {tr(
                      'أهداف ورسالة منظمة RABA عبر التطبيق:',
                      'ئامانجەکانی ڕێکخراوی RABA لە ڕێگەی ئەپەکە:',
                      'RABA Organization Strategic Goals:'
                    )}
                  </span>
                </p>
                <ul className="space-y-2 text-xs font-medium text-[#1B3A46]">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#467586] mt-1.5 shrink-0" />
                    <span>
                      {tr(
                        'تسهيل إرسال بلاغات المواطنين الموثقة بالصور وإحداثيات GPS بدقة وسرعة.',
                        'ئاسانکاری بۆ ناردنی سکاڵای هاووڵاتیان بە وێنە و شوێنی GPS بە شێوەیەکی ورد.',
                        'Facilitating citizen report submission with photos and GPS precision.'
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#467586] mt-1.5 shrink-0" />
                    <span>
                      {tr(
                        'الإحالة الرسمية المباشرة للدوائر (البلدية، الماء، الكهرباء، الطرق، الصرف الصحي، والنظافة).',
                        'ناردنی فەرمی و ڕاستەوخۆ بۆ فەرمانگەکان (شارەوانی، ئاو، کارەبا، ڕێگاوبان، ئاوەڕۆ، ژینگە).',
                        'Direct referral to municipal departments (Municipality, Water, Electricity, Roads, Sanitation).'
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#467586] mt-1.5 shrink-0" />
                    <span>
                      {tr(
                        'توثيق وأرشفة المشاريع والأعمال المنجزة بصور (قبل وبعد الإنجاز) لتعزيز الشفافية.',
                        'بەڵگەنامەکردنی کارە تەواوکراوەکان بە وێنەی (پێش و دوای چاککردنەوە) بۆ شەفافیەت.',
                        'Documenting completed works with before/after photos for civic transparency.'
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#467586] mt-1.5 shrink-0" />
                    <span>
                      {tr(
                        'استطلاعات الرأي المجتمعية لدراسة احتياجات وأولويات أهالي ناحية باعذرة.',
                        'ڕاپرسی کۆمەڵایەتی بۆ دیاریکردنی پێداویستییە لەپێشینەکانی خەڵکی باعەدرێ.',
                        'Community public surveys to assess service priorities in Baadre.'
                      )}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="pt-2 border-t border-[#DAE9EE] space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#3B6878] font-bold">
                  <span>
                    {tr(
                      'منظمة RABA • ناحية باعذرة',
                      'ڕێکخراوی RABA • ناحیەی باعەدرێ',
                      'RABA Organization • Baadre District'
                    )}
                  </span>
                  <a
                    href={toTelHref(OFFICIAL_PHONE_LOCAL)}
                    dir="ltr"
                    className="inline-flex items-center gap-1.5 font-mono font-black text-[#1B3A46] hover:text-[#467586] transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#467586]" />
                    <span>{OFFICIAL_PHONE_LOCAL}</span>
                  </a>
                </div>

                <div className="p-3 rounded-2xl bg-[#E8F4F8] border border-[#C5DFE8] flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-[#1B3A46]">
                    <Mail className="w-4 h-4 text-[#467586] shrink-0" />
                    <span>
                      {tr(
                        'البريد الإلكتروني الرسمي للتواصل:',
                        'ئیمەیڵی فەرمی بۆ پەیوەندی:',
                        'Official Contact Email:'
                      )}
                    </span>
                  </div>
                  <a
                    href={`mailto:${OFFICIAL_CONTACT_EMAIL}`}
                    dir="ltr"
                    className="font-mono font-black text-[#205569] hover:text-[#133c4b] hover:underline"
                  >
                    {OFFICIAL_CONTACT_EMAIL}
                  </a>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-[#467586] hover:bg-[#386373] text-white text-xs font-black cursor-pointer shadow-xs transition-colors"
                >
                  {tr('إغلاق', 'داخستن', 'Close')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
