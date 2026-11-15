import React, { useState, useEffect } from 'react';
import { Settings, ChevronDown, Check, Phone, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  OFFICIAL_PHONE_LOCAL,
  OFFICIAL_CONTACT_EMAIL,
  formatDisplayPhone,
} from '../../constants/officialContact';
import { CloudContactSettings } from '../../context/baadre/types';
import { playClickSound, playSuccessSound } from '../../lib/sound';

export interface SidebarAppSettingsSectionProps {
  isRTL: boolean;
  language: 'ar' | 'ku' | 'en';
  setLanguage: (lang: 'ar' | 'ku' | 'en') => void;
  activePaletteName: string;
  setPalette: (name: any) => void;
  availablePalettes: any[];
  expandedSection: string | null;
  toggleSection: (key: string) => void;
  canAccessProtectedSidebarSections: boolean;
  contactSettings: CloudContactSettings;
  updateContactSettings: (settings: CloudContactSettings) => Promise<void>;
  tr: (ar: string, ku: string, en: string) => string;
}

export const SidebarAppSettingsSection: React.FC<SidebarAppSettingsSectionProps> = ({
  isRTL,
  language,
  setLanguage,
  activePaletteName,
  setPalette,
  availablePalettes,
  expandedSection,
  toggleSection,
  canAccessProtectedSidebarSections,
  contactSettings,
  updateContactSettings,
  tr,
}) => {
  const [waReportsNumberInput, setWaReportsNumberInput] = useState(OFFICIAL_PHONE_LOCAL);
  const [contactPhoneInput, setContactPhoneInput] = useState(OFFICIAL_PHONE_LOCAL);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);

  useEffect(() => {
    setWaReportsNumberInput(formatDisplayPhone(contactSettings.whatsappReportsNumber));
    setContactPhoneInput(formatDisplayPhone(contactSettings.contactPhone));
  }, [contactSettings.whatsappReportsNumber, contactSettings.contactPhone]);

  return (
    <div className="rounded-2xl bg-white/90 border-0 shadow-[0_4px_16px_rgba(30,142,147,0.08)] overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => toggleSection('app_settings')}
        className={`w-full p-3.5 flex items-center justify-between ${
          isRTL ? 'text-right' : 'text-left'
        } cursor-pointer hover:bg-[#E6F1F5]/80 transition-colors border-0`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#467586] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Settings className="w-4 h-4" />
          </div>
          <p className="text-xs sm:text-sm font-black text-[#1B3A46]">
            {tr('إعدادات التطبيق', 'ڕێکخستنەکانی ئەپ', 'App Settings')}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[#467586] transition-transform duration-250 ${
            expandedSection === 'app_settings' ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {expandedSection === 'app_settings' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-3.5 pt-1 space-y-3.5">
              {/* 1) اللغات */}
              <div className="space-y-1.5">
                <p
                  className={`text-[11px] font-black text-[#3B6878] px-1 ${
                    isRTL ? 'text-right' : 'text-left'
                  }`}
                >
                  {tr('اللغات', 'زمانەکان', 'Languages')}
                </p>
                <div className="grid grid-cols-3 gap-1.5 bg-[#F2F8FA] border-0 p-1 rounded-2xl">
                  {(['ar', 'ku', 'en'] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLanguage(lang)}
                      className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer border-0 ${
                        language === lang
                          ? 'bg-[#467586] text-white shadow-xs'
                          : 'text-[#285060] hover:bg-white/80'
                      }`}
                    >
                      {lang === 'ar' ? 'العربية' : lang === 'ku' ? 'کوردی' : 'English'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2) السمات */}
              <div className="space-y-1.5">
                <p
                  className={`text-[11px] font-black text-[#3B6878] px-1 ${
                    isRTL ? 'text-right' : 'text-left'
                  }`}
                >
                  {tr('السمات', 'ڕەنگەکان', 'Themes')}
                </p>
                <div className="grid grid-cols-2 gap-1.5 bg-[#F2F8FA] border-0 p-1.5 rounded-2xl">
                  {availablePalettes.map((themeItem, idx) => {
                    const isSelected = activePaletteName === themeItem.name;
                    const label =
                      language === 'ku'
                        ? themeItem.labelKu
                        : language === 'en'
                        ? themeItem.labelEn
                        : themeItem.labelAr;
                    const isFeatured = idx === 0 && availablePalettes.length % 2 === 1;
                    return (
                      <button
                        key={themeItem.name}
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setPalette(themeItem.name);
                        }}
                        className={`${
                          isFeatured ? 'col-span-2' : ''
                        } py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-between gap-2 transition-all cursor-pointer border-0 ${
                          isSelected
                            ? 'bg-[#467586] text-white shadow-xs'
                            : 'text-[#285060] hover:bg-white/80'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-4 h-4 rounded-full shrink-0 shadow-2xs"
                            style={{
                              background: `linear-gradient(135deg, ${themeItem.gradientToHex} 0%, ${themeItem.primaryHex} 55%, ${themeItem.accentHex} 100%)`,
                            }}
                          />
                          <span className="truncate">{label}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3) الاتصال (للإدارة فقط) */}
              {canAccessProtectedSidebarSections && (
                <div className="pt-1 space-y-2">
                  <p
                    className={`text-[11px] font-black text-[#3B6878] px-1 flex items-center gap-1.5 ${
                      isRTL ? 'text-right' : 'text-left'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5 text-[#467586]" />
                    <span>{tr('الاتصال', 'پەیوەندی', 'Contact')}</span>
                  </p>

                  <div className="p-3 rounded-2xl bg-[#F2F8FA] border-0 space-y-2.5">
                    {contactError && (
                      <div className="p-2 rounded-xl bg-rose-50 border-0 text-rose-700 text-[11px] font-bold">
                        {contactError}
                      </div>
                    )}
                    {contactSuccess && (
                      <div className="p-2 rounded-xl bg-emerald-50 border-0 text-emerald-800 text-[11px] font-bold">
                        {contactSuccess}
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-black text-[#3B6878] mb-1">
                        {tr(
                          'رقم واتساب استلام بلاغات المواطنين',
                          'ژمارەی واتسئەپی وەرگرتنی سکاڵا',
                          'Citizens Reports WhatsApp Number'
                        )}
                      </label>
                      <input
                        type="tel"
                        dir="ltr"
                        value={waReportsNumberInput}
                        onChange={(e) => setWaReportsNumberInput(e.target.value)}
                        placeholder={OFFICIAL_PHONE_LOCAL}
                        className="w-full px-3 py-2 rounded-xl bg-white border-0 shadow-2xs text-xs font-mono font-bold text-[#1B3A46] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-[#3B6878] mb-1">
                        {tr(
                          'رقم الهاتف الظاهر في القائمة الجانبية',
                          'ژمارەی مۆبایلی ناو لیستەکە',
                          'Sidebar Display Phone Number'
                        )}
                      </label>
                      <input
                        type="tel"
                        dir="ltr"
                        value={contactPhoneInput}
                        onChange={(e) => setContactPhoneInput(e.target.value)}
                        placeholder={OFFICIAL_PHONE_LOCAL}
                        className="w-full px-3 py-2 rounded-xl bg-white border-0 shadow-2xs text-xs font-mono font-bold text-[#1B3A46] focus:outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-black text-[#3B6878]">
                          {tr(
                            'البريد الإلكتروني الظاهر في القائمة الجانبية',
                            'ئیمەیڵی ناو لیستەکە',
                            'Sidebar Display Email'
                          )}
                        </label>
                        <span className="text-[9px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                          {tr(
                            'ثابت غير قابل للتغيير',
                            'جێگیرە و ناگۆڕدرێت',
                            'Fixed / Unchangeable'
                          )}
                        </span>
                      </div>
                      <div className="w-full px-3 py-2 rounded-xl bg-white/70 border border-[#D0E2E8] shadow-2xs text-xs font-mono font-bold text-[#1B3A46] flex items-center justify-between">
                        <span dir="ltr">{OFFICIAL_CONTACT_EMAIL}</span>
                        <Mail className="w-3.5 h-3.5 text-[#467586]" />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={contactSaving}
                      onClick={async () => {
                        playClickSound();
                        if (!canAccessProtectedSidebarSections) return;
                        setContactError(null);
                        setContactSuccess(null);
                        setContactSaving(true);
                        try {
                          await updateContactSettings({
                            whatsappReportsNumber:
                              waReportsNumberInput.trim() || OFFICIAL_PHONE_LOCAL,
                            contactPhone: contactPhoneInput.trim() || OFFICIAL_PHONE_LOCAL,
                            contactEmail: OFFICIAL_CONTACT_EMAIL,
                          });
                          playSuccessSound();
                          setContactSuccess(
                            tr(
                              'تم حفظ وتحديث إعدادات الاتصال في الكلاود بنجاح.',
                              'ڕێکخستنەکان لە کڵاود نوێکرانەوە بە سەرکەوتوویی.',
                              'Contact settings updated and saved to cloud.'
                            )
                          );
                          setTimeout(() => setContactSuccess(null), 3000);
                        } catch (err: any) {
                          setContactError(
                            err?.message ||
                              tr(
                                'فشل الحفظ.',
                                'پاشەکەوتکردن سەرکەوتوو نەبوو.',
                                'Save failed.'
                              )
                          );
                        } finally {
                          setContactSaving(false);
                        }
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-[#467586] hover:bg-[#386373] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50 border-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {contactSaving
                          ? tr('جاري الحفظ...', 'پاشەکەوت دەکرێت...', 'Saving...')
                          : tr('حفظ إعدادات الاتصال', 'پاشەکەوتکردن', 'Save Contact Settings')}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
