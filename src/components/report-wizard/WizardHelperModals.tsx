import React from 'react';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ReportSector, SECTOR_META } from '../../types/baadre';
import { playClickSound } from '../../lib/sound';
import { FIELD_LIMITS, enforceInputLimit } from '../../lib/inputLimits';
import {
  SECTOR_ICONS,
  SECTOR_EXAMPLES,
  SmartSectorSuggestion,
} from './wizardSuggestions';

interface WizardHelperModalsProps {
  dir: 'rtl' | 'ltr';
  language: string;
  isRTL: boolean;
  tr: (ar: string, ku: string, en: string) => string;
  // Sector Examples Modal
  sectorInfoModal: ReportSector | null;
  setSectorInfoModal: (sector: ReportSector | null) => void;
  onSelectSectorFromModal: (sector: ReportSector) => void;
  // Smart Choices Modal
  smartModalType: 'title' | 'description' | null;
  setSmartModalType: (type: 'title' | 'description' | null) => void;
  currentSectorSuggestions: SmartSectorSuggestion;
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  setValidationError: (val: string | null) => void;
}

export const WizardHelperModals: React.FC<WizardHelperModalsProps> = ({
  dir,
  language,
  isRTL,
  tr,
  sectorInfoModal,
  setSectorInfoModal,
  onSelectSectorFromModal,
  smartModalType,
  setSmartModalType,
  currentSectorSuggestions,
  title,
  setTitle,
  description,
  setDescription,
  setValidationError,
}) => {
  return (
    <>
      {/* Modal / Dialog لعرض أمثلة اختيار القطاع عند النقر على زر ! */}
      <AnimatePresence>
        {sectorInfoModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSectorInfoModal(null)}
              className="fixed inset-0 bg-[#1E3725]/45 backdrop-blur-xs"
            />
            <motion.div
              dir={dir}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`relative w-full max-w-md bg-white border border-[#BBDDC6] rounded-3xl shadow-[0_20px_50px_rgba(70,103,77,0.25)] p-5 z-10 space-y-4 max-h-[85vh] overflow-y-auto ${
                isRTL ? 'text-right' : 'text-left'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E8F4EA]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#E8F4EA] text-[#2D4833] flex items-center justify-center shrink-0">
                    {React.createElement(SECTOR_ICONS[sectorInfoModal], {
                      className: 'w-5 h-5 stroke-[2.2]',
                    })}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-[#1E3725]">
                      {language === 'ku'
                        ? SECTOR_META[sectorInfoModal].ku
                        : language === 'en'
                        ? SECTOR_META[sectorInfoModal].en
                        : SECTOR_META[sectorInfoModal].labelAr}
                    </h3>
                    <p className="text-[11px] font-bold text-[#46674D]">
                      {tr(
                        'دليل وأمثلة اختيار هذا القطاع',
                        'ڕێنمایی و نموونەی هەڵبژاردنی ئەم کەرتە',
                        'Guide & Examples for Selecting This Sector'
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSectorInfoModal(null)}
                  className="p-1.5 rounded-full bg-[#F4F9F5] text-[#2D4833] hover:bg-[#E8F4EA] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-black text-[#1E3725]">
                  {tr(
                    'متى تقوم باختيار هذا القطاع؟ (أمثلة عملية):',
                    'کەی ئەم کەرتە هەڵدەبژێریت؟ (نموونەی مەیدانی):',
                    'When should you select this sector? (Practical Examples):'
                  )}
                </p>
                <div className="space-y-2.5 bg-[#F4F9F5] p-3.5 rounded-2xl border border-[#BBDDC6]/50">
                  {SECTOR_EXAMPLES[sectorInfoModal][
                    language === 'ku' ? 'ku' : language === 'en' ? 'en' : 'ar'
                  ].map((ex, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 text-xs text-[#2D4833] font-medium leading-relaxed"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#46674D] mt-1.5 shrink-0" />
                      <span>{ex}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onSelectSectorFromModal(sectorInfoModal);
                    setSectorInfoModal(null);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-tr from-[#315338] to-[#46674D] text-white text-xs font-black shadow-xs hover:brightness-105 active:scale-95 transition-all cursor-pointer text-center"
                >
                  {tr(
                    'تحديد هذا القطاع للبلاغ',
                    'دیاریکردنی ئەم کەرتە بۆ سکاڵا',
                    'Select This Sector'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSectorInfoModal(null)}
                  className="py-2.5 px-4 rounded-xl bg-[#E8F4EA] text-[#2D4833] text-xs font-bold hover:bg-[#D4EADB] transition-colors cursor-pointer"
                >
                  {tr('إغلاق', 'داخستن', 'Close')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* نافذة نظيفة من النصوص والشروحات تعرض 10 اختيارات ذكية فقط */}
      <AnimatePresence>
        {smartModalType && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSmartModalType(null)}
              className="fixed inset-0 bg-[#1E3725]/50 backdrop-blur-xs"
            />
            <motion.div
              dir={dir}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`relative w-full max-w-md bg-white border border-[#BBDDC6] rounded-3xl shadow-[0_20px_50px_rgba(70,103,77,0.3)] p-4 z-10 space-y-2.5 max-h-[82vh] flex flex-col ${
                isRTL ? 'text-right' : 'text-left'
              }`}
            >
              <div className="flex items-center justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setSmartModalType(null)}
                  className="p-1.5 rounded-full bg-[#F4F9F5] text-[#2D4833] hover:bg-[#E8F4EA] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 overflow-y-auto pr-0.5">
                {(smartModalType === 'title'
                  ? currentSectorSuggestions.titles[
                      language === 'ku' ? 'ku' : language === 'en' ? 'en' : 'ar'
                    ]
                  : currentSectorSuggestions.descriptions[
                      language === 'ku' ? 'ku' : language === 'en' ? 'en' : 'ar'
                    ]
                )
                  .slice(0, 10)
                  .map((item, idx) => {
                    const isSelected =
                      smartModalType === 'title' ? title === item : description === item;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          playClickSound();
                          const langKey =
                            language === 'ku' ? 'ku' : language === 'en' ? 'en' : 'ar';
                          if (smartModalType === 'title') {
                            setTitle(
                              enforceInputLimit(
                                item,
                                FIELD_LIMITS.TITLE.maxWords,
                                FIELD_LIMITS.TITLE.maxChars
                              )
                            );
                            const linkedDesc =
                              currentSectorSuggestions.descriptions[langKey]?.[idx];
                            if (linkedDesc) {
                              setDescription(
                                enforceInputLimit(
                                  linkedDesc,
                                  FIELD_LIMITS.DESCRIPTION.maxWords,
                                  FIELD_LIMITS.DESCRIPTION.maxChars
                                )
                              );
                            }
                          } else {
                            setDescription(
                              enforceInputLimit(
                                item,
                                FIELD_LIMITS.DESCRIPTION.maxWords,
                                FIELD_LIMITS.DESCRIPTION.maxChars
                              )
                            );
                          }
                          setValidationError(null);
                          setSmartModalType(null);
                        }}
                        className={`w-full p-3.5 rounded-2xl border text-xs sm:text-sm font-black transition-all flex items-center justify-between gap-3 text-start cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                          isSelected
                            ? 'bg-[#E8F4EA] border-[#46674D] text-[#1E3725] shadow-xs ring-1 ring-[#46674D]'
                            : 'bg-[#F4F9F5] hover:bg-[#EAF4EC] border-[#BBDDC6] text-[#1E3725]'
                        }`}
                      >
                        <span className="leading-relaxed">{item}</span>
                        <Check className="w-4 h-4 text-[#46674D] shrink-0" />
                      </button>
                    );
                  })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
