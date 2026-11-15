import React from 'react';
import {
  Info,
  FileText,
  Phone,
  Mail,
  MessageCircle,
  ChevronDown,
  MapPin,
  Sparkles,
  ExternalLink,
  Share2,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  OFFICIAL_CONTACT_EMAIL,
  toWhatsAppIntlNumber,
  toTelHref,
  formatDisplayPhone,
} from '../../constants/officialContact';
import { CloudContactSettings } from '../../context/baadre/types';
import { playClickSound } from '../../lib/sound';

export interface SidebarInfoAccordionsProps {
  isRTL: boolean;
  language: 'ar' | 'ku' | 'en';
  palette: any;
  expandedSection: string | null;
  toggleSection: (key: string) => void;
  contactSettings: CloudContactSettings;
  copiedLink: boolean;
  onShareApp: () => void;
  onOpenAboutModal: () => void;
  onOpenPrivacyPolicy?: () => void;
  onCloseSidebar: () => void;
  tr: (ar: string, ku: string, en: string) => string;
}

export const SidebarInfoAccordions: React.FC<SidebarInfoAccordionsProps> = ({
  isRTL,
  expandedSection,
  toggleSection,
  contactSettings,
  copiedLink,
  onShareApp,
  onOpenAboutModal,
  onOpenPrivacyPolicy,
  onCloseSidebar,
  tr,
}) => {
  return (
    <>
      {/* أ) قسم من نحن */}
      <div className="rounded-2xl bg-white/90 border-0 shadow-[0_4px_16px_rgba(30,142,147,0.08)] overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleSection('about')}
          className={`w-full p-3.5 flex items-center justify-between ${
            isRTL ? 'text-right' : 'text-left'
          } cursor-pointer hover:bg-[#E6F1F5]/70 transition-colors border-0`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E3EFF3] text-[#3B6878] flex items-center justify-center shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <p className="text-xs sm:text-sm font-black text-[#1B3A46]">
              {tr('من نحن', 'ئێمە کێین', 'About Us')}
            </p>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-[#467586] transition-transform duration-250 ${
              expandedSection === 'about' ? 'rotate-180' : ''
            }`}
          />
        </button>

        <AnimatePresence initial={false}>
          {expandedSection === 'about' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="p-3.5 pt-0 space-y-2 text-xs text-[#285060] leading-relaxed">
                <p className="font-bold text-[#1B3A46] bg-[#F2F8FA] p-2.5 rounded-xl border-0">
                  {tr(
                    'تطبيق ÇAVÊ BAADRÊ (عين باعذرة) مبادرة مجتمعية رقمية تابعة لمنظمة RABA، تربط المواطنين مباشرة بالدوائر الخدمية ومسؤولي الصيانة الميدانية في ناحية باعذرة.',
                    'ئەپی ÇAVÊ BAADRÊ (چاڤێ باعدرێ) دەستپێشخەرییەکی دیجیتاڵییە سەربە ڕێکخراوی RABA، هاووڵاتیان ڕاستەوخۆ دەبەستێتەوە بە فەرمانگە خزمەتگوزارییەکان لە ناحیەی باعەدرێ.',
                    'ÇAVÊ BAADRÊ is a civic digital initiative by RABA Organization connecting citizens directly with municipal service departments in Baadre.'
                  )}
                </p>
                <ul className="space-y-1.5 text-[11px] font-bold text-[#1B3A46] px-1">
                  <li className="flex items-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#467586] shrink-0 mt-0.5" />
                    <span>
                      {tr(
                        'استقبال بلاغات المواطنين الموثقة بالصور وإحداثيات الموقع.',
                        'وەرگرتنی سکاڵاکان بە وێنە و شوێنی جوگرافی.',
                        'Receiving photo & GPS verified reports.'
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#467586] shrink-0 mt-0.5" />
                    <span>
                      {tr(
                        'إحالة البلاغات رسمياً للدوائر ومتابعة إنجازها الميداني.',
                        'ناردنی فەرمی سکاڵاکان بۆ فەرمانگەکان و بەدواداچوون.',
                        'Official referrals to municipal departments.'
                      )}
                    </span>
                  </li>
                </ul>
                <button
                  type="button"
                  onClick={onOpenAboutModal}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-[#E3EFF3] hover:bg-[#D2E6EC] text-[#285060] font-black text-[11px] flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer border-0"
                >
                  <span>
                    {tr('عرض المزيد من التفاصيل', 'بینینی زانیاری زیاتر', 'View Full Details')}
                  </span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ب) قسم سياسة الخصوصية */}
      <div className="rounded-2xl bg-white/90 border-0 shadow-[0_4px_16px_rgba(30,142,147,0.08)] overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleSection('privacy')}
          className={`w-full p-3.5 flex items-center justify-between ${
            isRTL ? 'text-right' : 'text-left'
          } cursor-pointer hover:bg-[#E6F1F5]/70 transition-colors border-0`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E3EFF3] text-[#3B6878] flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <p className="text-xs sm:text-sm font-black text-[#1B3A46]">
              {tr('سياسات الخصوصية', 'سیاسەتی تایبەتمەندی', 'Privacy Policy')}
            </p>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-[#467586] transition-transform duration-250 ${
              expandedSection === 'privacy' ? 'rotate-180' : ''
            }`}
          />
        </button>

        <AnimatePresence initial={false}>
          {expandedSection === 'privacy' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="p-3.5 pt-0 space-y-2 text-xs text-[#285060] leading-relaxed">
                <p className="font-bold text-[#1B3A46] bg-[#F2F8FA] p-2.5 rounded-xl border-0">
                  {tr(
                    'تلتزم منظمة RABA في تطبيق ÇAVÊ BAADRÊ بالحفاظ الكامل على خصوصية وسرية بيانات المواطنين وأرقام هواتفهم، وتُستخدم المعلومات فقط لمعالجة البلاغات الخدمية الميدانية في ناحية باعذرة.',
                    'ڕێکخراوی RABA لە ئەپی ÇAVÊ BAADRÊ بە تەواوی پابەندە بە پاراستنی نهێنی و تایبەتمەندی داتای هاووڵاتیان و تەنها بۆ چارەسەرکردنی سکاڵا خزمەتگوزارییەکان بەکاردەهێنرێت.',
                    'RABA Organization strictly safeguards citizen privacy in ÇAVÊ BAADRÊ. Data is used solely for civic service resolution in Baadre.'
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenPrivacyPolicy) {
                      onCloseSidebar();
                      onOpenPrivacyPolicy();
                    }
                  }}
                  className="w-full mt-1 py-2 px-3 rounded-xl bg-[#E3EFF3] hover:bg-[#D2E6EC] text-[#285060] font-black text-[11px] flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer border-0"
                >
                  <span>
                    {tr(
                      'فتح وثيقة الخصوصية الكاملة',
                      'کردنەوەی بەڵگەنامەی تەواو',
                      'Open Full Privacy Document'
                    )}
                  </span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ج) قسم تواصل معنا */}
      <div className="rounded-2xl bg-white/90 border-0 shadow-[0_4px_16px_rgba(30,142,147,0.08)] overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleSection('contact')}
          className={`w-full p-3.5 flex items-center justify-between ${
            isRTL ? 'text-right' : 'text-left'
          } cursor-pointer hover:bg-[#E6F1F5]/70 transition-colors border-0`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E3EFF3] text-[#3B6878] flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4" />
            </div>
            <p className="text-xs sm:text-sm font-black text-[#1B3A46]">
              {tr('تواصل معنا', 'پەیوەندیمان پێوە بکە', 'Contact Us')}
            </p>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-[#467586] transition-transform duration-250 ${
              expandedSection === 'contact' ? 'rotate-180' : ''
            }`}
          />
        </button>

        <AnimatePresence initial={false}>
          {expandedSection === 'contact' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="p-3.5 pt-0 space-y-2">
                <a
                  href={toTelHref(contactSettings.contactPhone)}
                  className="flex items-center justify-start gap-2 p-2.5 rounded-xl bg-[#F4F9FB] hover:bg-[#E3EFF3] transition-colors text-xs font-bold text-[#1B3A46] border-0"
                >
                  <Phone className="w-3.5 h-3.5 text-[#467586] shrink-0" />
                  <span className="text-[#3B6878] shrink-0">
                    {tr('رقم الهاتف:', 'ژمارەی مۆبایل:', 'Phone:')}
                  </span>
                  <bdi className="font-mono font-black text-[#1B3A46]" dir="ltr">
                    {formatDisplayPhone(contactSettings.contactPhone)}
                  </bdi>
                </a>

                <a
                  href={`https://wa.me/${toWhatsAppIntlNumber(contactSettings.whatsappReportsNumber)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-start gap-2 p-2.5 rounded-xl bg-[#E3EFF3] hover:bg-[#D2E6EC] transition-colors text-xs font-black text-[#1B3A46] border-0"
                >
                  <MessageCircle className="w-4 h-4 text-[#467586] shrink-0" />
                  <span className="text-[#3B6878] shrink-0">
                    {tr('واتساب المنظمة:', 'واتسئەپی ڕێکخراو:', 'Official WhatsApp:')}
                  </span>
                  <bdi className="font-mono font-black text-[#1B3A46]" dir="ltr">
                    {formatDisplayPhone(contactSettings.whatsappReportsNumber)}
                  </bdi>
                </a>

                <a
                  href={`mailto:${OFFICIAL_CONTACT_EMAIL}`}
                  className="flex items-center justify-start gap-2 p-2.5 rounded-xl bg-[#F4F9FB] hover:bg-[#E3EFF3] transition-colors text-xs font-bold text-[#1B3A46] border-0"
                >
                  <Mail className="w-3.5 h-3.5 text-[#467586] shrink-0" />
                  <span className="text-[#3B6878] shrink-0">
                    {tr('الإيميل:', 'ئیمەیڵ:', 'Email:')}
                  </span>
                  <bdi className="font-mono font-black text-[#1B3A46] text-[11px] truncate" dir="ltr">
                    {OFFICIAL_CONTACT_EMAIL}
                  </bdi>
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* د) قسم نطاق التغطية والخدمات */}
      <div className="rounded-2xl bg-white/90 border-0 shadow-[0_4px_16px_rgba(30,142,147,0.08)] overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleSection('coverage')}
          className={`w-full p-3.5 flex items-center justify-between ${
            isRTL ? 'text-right' : 'text-left'
          } cursor-pointer hover:bg-[#E6F1F5]/70 transition-colors border-0`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E3EFF3] text-[#3B6878] flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <p className="text-xs sm:text-sm font-black text-[#1B3A46]">
              {tr('نطاق التغطية الخدمية', 'سنووری خزمەتگوزاری', 'Service Coverage')}
            </p>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-[#467586] transition-transform duration-250 ${
              expandedSection === 'coverage' ? 'rotate-180' : ''
            }`}
          />
        </button>

        <AnimatePresence initial={false}>
          {expandedSection === 'coverage' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="p-3.5 pt-0 space-y-2 text-xs font-bold text-[#1B3A46]">
                <div className="p-2.5 rounded-xl bg-[#F2F8FA] border-0 space-y-1">
                  <p className="text-[11px] font-black text-[#3B6878]">
                    {tr('المناطق المشمولة:', 'ناوچە داپۆشراوەکان:', 'Covered Areas:')}
                  </p>
                  <p className="text-[11px] text-[#285060]">
                    {tr(
                      'مركز ناحية باعدرى، مجمع باعدرى، الأحياء السكنية والقرى التابعة إدارياً للناحية.',
                      'ناوەندی ناحیەی باعەدرێ، کۆمەڵگەی باعەدرێ، گەڕەکەکان و گوندەکانی سەر بە ناحیەکە.',
                      'Baadre center, Baadre complex, residential quarters and affiliated villages.'
                    )}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F2F8FA] border-0 space-y-1">
                  <p className="text-[11px] font-black text-[#3B6878]">
                    {tr('القطاعات المعتمدة:', 'کەرتە پەسەندکراوەکان:', 'Covered Sectors:')}
                  </p>
                  <p className="text-[11px] text-[#285060]">
                    {tr(
                      'الطرق والتبليط • شبكات المياه • الصرف الصحي • النظافة والبيئة • الإنارة العامة.',
                      'ڕێگاوبان • تۆڕی ئاو • ئاوەڕۆ • پاکوخاوێنی و ژینگە • ڕووناککردنەوە.',
                      'Roads • Water networks • Sewage • Sanitation • Public lighting.'
                    )}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* هـ) زر مشاركة المنصة */}
      <div className="pt-1">
        <button
          onClick={onShareApp}
          className="w-full py-2.5 px-3 bg-white/90 hover:bg-[#E3EFF3] border-0 text-[#1B3A46] font-bold rounded-2xl shadow-[0_4px_16px_rgba(30,142,147,0.08)] flex items-center justify-center gap-2 text-xs transition-all cursor-pointer"
        >
          {copiedLink ? (
            <>
              <Check className="w-4 h-4 text-[#467586]" />
              <span className="text-[#3B6878] font-black">
                {tr(
                  'تم نسخ رابط المنصة بنجاح!',
                  'بەستەری سەکۆکە کۆپی کرا!',
                  'Platform link copied!'
                )}
              </span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 text-[#467586]" />
              <span>
                {tr('مشاركة رابط المنصة', 'هاوبەشکردنی سەکۆ', 'Share Platform Link')}
              </span>
            </>
          )}
        </button>
      </div>
    </>
  );
};

export interface SidebarFooterProps {
  isRTL: boolean;
  language: 'ar' | 'ku' | 'en';
  palette: any;
  tr: (ar: string, ku: string, en: string) => string;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = ({
  isRTL,
  language,
  palette,
  tr,
}) => {
  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="relative z-10 px-4 py-3.5 backdrop-blur-2xl border-t border-white/50 text-center select-none overflow-hidden shrink-0 flex flex-col items-center justify-center gap-2.5 shadow-[0_-4px_16px_rgba(30,142,147,0.06)]"
      style={{
        background: `linear-gradient(135deg, ${palette.primaryLightHex}EE 0%, ${palette.surfaceSoftHex}F2 50%, ${palette.primaryLightHex}D9 100%)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.85) 0%, ${palette.primaryLightHex}55 60%, transparent 100%)`,
        }}
      />

      <a
        href="https://www.instagram.com/rabaorganization?cplk=c21nZ3F3ZmZuZzR6"
        target="_blank"
        rel="noopener noreferrer"
        dir={isRTL ? 'rtl' : 'ltr'}
        onClick={() => playClickSound()}
        aria-label={tr(
          'تابعنا على انستكرام',
          'لە ئینستاگرام فۆڵۆمان بکە',
          'Follow us on Instagram'
        )}
        title={tr(
          'تابعنا على انستكرام — RABA Organization',
          'لە ئینستاگرام فۆڵۆمان بکە — RABA',
          'Follow us on Instagram — RABA Organization'
        )}
        className="relative z-10 group px-4 py-2 rounded-2xl bg-white/90 hover:bg-white shadow-[0_4px_14px_rgba(30,142,147,0.08)] hover:shadow-[0_6px_20px_rgba(30,142,147,0.18)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] inline-flex items-center justify-center gap-2.5 cursor-pointer"
        style={{
          border: `1px solid ${palette.borderSoftHex}`,
        }}
      >
        <span
          className="text-[11px] sm:text-xs font-black tracking-wide whitespace-nowrap"
          style={{ color: palette.primaryTextHex }}
        >
          {tr(
            'تابعنا على انستكرام',
            'لە ئینستاگرام فۆڵۆمان بکە',
            'Follow us on Instagram'
          )}
        </span>
        <span
          className="w-7 h-7 rounded-xl text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform"
          style={{
            background: `linear-gradient(135deg, ${palette.primaryHex} 0%, ${palette.accentHex} 100%)`,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
            aria-hidden="true"
          >
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
          </svg>
        </span>
      </a>

      <div
        className="relative z-10 flex items-center justify-center gap-1.5 flex-wrap text-[10px] font-bold"
        style={{ color: palette.primaryTextHex }}
      >
        {isRTL ? (
          <>
            <bdi>
              {language === 'ku' ? 'ڕێکخراوی' : 'منظمة'}{' '}
              <span dir="ltr" className="font-black" style={{ color: palette.primaryHex }}>
                RABA
              </span>
            </bdi>
            <span className="opacity-40">•</span>
            <bdi>
              {language === 'ku' ? 'ئەپی' : 'تطبيق'}{' '}
              <span dir="ltr" className="font-black" style={{ color: palette.primaryHex }}>
                ÇAVÊ BAADRÊ
              </span>
            </bdi>
            <span className="opacity-40">•</span>
            <bdi dir="ltr" className="font-black opacity-80">
              © {new Date().getFullYear()}
            </bdi>
          </>
        ) : (
          <>
            <bdi className="font-black" style={{ color: palette.primaryHex }}>
              RABA Organization
            </bdi>
            <span className="opacity-40">•</span>
            <bdi className="font-black" style={{ color: palette.primaryHex }}>
              ÇAVÊ BAADRÊ App
            </bdi>
            <span className="opacity-40">•</span>
            <bdi dir="ltr" className="font-black opacity-80">
              © {new Date().getFullYear()}
            </bdi>
          </>
        )}
      </div>
    </div>
  );
};
