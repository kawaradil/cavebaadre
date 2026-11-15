import React from 'react';
import { X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'motion/react';
import {
  BAADRE_NEIGHBORHOODS,
  BAADRE_STREETS,
  BAADRE_LANDMARKS,
} from '../../types/baadre';
import { playClickSound } from '../../lib/sound';
import {
  FIELD_LIMITS,
  enforceInputLimit,
  FieldLimitBadge,
} from '../../lib/inputLimits';
import { WizardStep } from './wizardSuggestions';

interface WizardStepsLocationProps {
  step: WizardStep;
  language: string;
  tr: (ar: string, ku: string, en: string) => string;
  setValidationError: (val: string | null) => void;
  // Step 5: Neighborhood / Quarter
  neighborhood: string;
  setNeighborhood: (val: string) => void;
  isOtherNeighborhood: boolean;
  setIsOtherNeighborhood: (val: boolean) => void;
  customNeighborhood: string;
  setCustomNeighborhood: (val: string) => void;
  showNeighborhoodSuggestions: boolean;
  setShowNeighborhoodSuggestions: (val: boolean) => void;
  showAllNeighborhoods: boolean;
  setShowAllNeighborhoods: React.Dispatch<React.SetStateAction<boolean>>;
  // Step 6: Street
  street: string;
  setStreet: (val: string) => void;
  showAllStreets: boolean;
  setShowAllStreets: React.Dispatch<React.SetStateAction<boolean>>;
  showStreetSuggestions: boolean;
  setShowStreetSuggestions: (val: boolean) => void;
  // Step 7: Landmark
  landmark: string;
  setLandmark: (val: string) => void;
  showAllLandmarks: boolean;
  setShowAllLandmarks: React.Dispatch<React.SetStateAction<boolean>>;
  showLandmarkSuggestions: boolean;
  setShowLandmarkSuggestions: (val: boolean) => void;
}

export const WizardStepsLocation: React.FC<WizardStepsLocationProps> = ({
  step,
  language,
  tr,
  setValidationError,
  neighborhood,
  setNeighborhood,
  isOtherNeighborhood,
  setIsOtherNeighborhood,
  customNeighborhood,
  setCustomNeighborhood,
  showNeighborhoodSuggestions,
  setShowNeighborhoodSuggestions,
  showAllNeighborhoods,
  setShowAllNeighborhoods,
  street,
  setStreet,
  showAllStreets,
  setShowAllStreets,
  showStreetSuggestions,
  setShowStreetSuggestions,
  landmark,
  setLandmark,
  showAllLandmarks,
  setShowAllLandmarks,
  showLandmarkSuggestions,
  setShowLandmarkSuggestions,
}) => {
  if (step === 5) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-[#F4F9F5] border border-[#BBDDC6] space-y-4 shadow-2xs">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <label className="block text-xs sm:text-sm font-black text-[#1E3725]">
                {tr(
                  'الحي / الزقاق (گەڕەکەکانی شارەوانی باعەدری):',
                  'گەڕەک یان تاخ (شارەوانی باعەدری):',
                  'Neighborhood / Quarter (Baadre Municipality):'
                )}
              </label>
              <p className="text-[11px] text-teal-800 font-medium mt-0.5">
                {tr(
                  'اختر الحي أو الزقاق من القائمة أدناه أو ابحث عنه مباشرة',
                  'تاخ یان گەڕەک لە لیستەکەی خوارەوە هەڵبژێرە یان ڕاستەوخۆ بگەڕێ',
                  'Select the neighborhood/quarter from the list below or search directly'
                )}
              </p>
            </div>
            <FieldLimitBadge
              value={neighborhood}
              maxWords={FIELD_LIMITS.LOCATION.maxWords}
              maxChars={FIELD_LIMITS.LOCATION.maxChars}
            />
          </div>

          <div className="relative">
            <input
              type="text"
              maxLength={FIELD_LIMITS.LOCATION.maxChars}
              value={neighborhood}
              onFocus={() => setShowNeighborhoodSuggestions(true)}
              onChange={(e) => {
                setValidationError(null);
                const val = enforceInputLimit(
                  e.target.value,
                  FIELD_LIMITS.LOCATION.maxWords,
                  FIELD_LIMITS.LOCATION.maxChars
                );
                setNeighborhood(val);
                setShowNeighborhoodSuggestions(true);
                const lower = val.trim().toLowerCase();
                if (
                  lower === 'أخرى' ||
                  lower === 'اخرى' ||
                  lower === 'other' ||
                  lower === 'هیتر'
                ) {
                  setIsOtherNeighborhood(true);
                } else if (isOtherNeighborhood && !customNeighborhood) {
                  setIsOtherNeighborhood(false);
                }
              }}
              placeholder={tr(
                'اختر من القائمة أو اكتب اسم الحي / الزقاق...',
                'لە لیستەکە هەڵبژێرە یان ناوی تاخ / گەڕەک بنووسە...',
                'Select from list or type neighborhood / quarter...'
              )}
              className="w-full bg-white border border-[#BBDDC6] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all"
            />

            {neighborhood && (
              <button
                type="button"
                onClick={() => {
                  setValidationError(null);
                  setNeighborhood('');
                  setIsOtherNeighborhood(false);
                }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-[#46674D] hover:text-red-600 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {showNeighborhoodSuggestions && (
              <div className="absolute top-full mt-1.5 left-0 right-0 z-30 bg-white border border-[#BBDDC6] rounded-2xl shadow-[0_10px_30px_rgba(70,103,77,0.18)] max-h-56 overflow-y-auto p-1.5">
                {BAADRE_NEIGHBORHOODS.filter((n) => {
                  const q = neighborhood.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    n.name.toLowerCase().includes(q) ||
                    n.ku.toLowerCase().includes(q) ||
                    n.ar.toLowerCase().includes(q)
                  );
                }).map((n) => {
                  const nName = language === 'ku' ? n.ku : n.name;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        setValidationError(null);
                        playClickSound();
                        setNeighborhood(nName);
                        setIsOtherNeighborhood(false);
                        setShowNeighborhoodSuggestions(false);
                      }}
                      className="w-full text-start px-3 py-2 rounded-xl text-xs font-bold text-[#1E3725] hover:bg-teal-50 hover:text-teal-800 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span>{nName}</span>
                      <span className="text-[10px] text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-md font-mono">
                        {tr('حي رسمي', 'تاخی فەرمی', 'Official')}
                      </span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    setValidationError(null);
                    playClickSound();
                    setNeighborhood(tr('أخرى', 'هیتر', 'Other'));
                    setIsOtherNeighborhood(true);
                    setShowNeighborhoodSuggestions(false);
                  }}
                  className="w-full text-start px-3 py-2 rounded-xl text-xs font-black text-[#46674D] bg-[#E8F4EA]/60 hover:bg-[#E8F4EA] transition-colors flex items-center justify-between cursor-pointer border-t border-[#E8F4EA] mt-1"
                >
                  <span>
                    {tr(
                      'أخرى (حي أو قرية أخرى في باعدرى)',
                      'هیتر (گەڕەک یان گوندێکی تر)',
                      'Other (custom location)'
                    )}
                  </span>
                  <span className="text-[10px] bg-[#46674D] text-white px-2 py-0.5 rounded-full font-bold">
                    +
                  </span>
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {(showAllNeighborhoods
              ? BAADRE_NEIGHBORHOODS
              : BAADRE_NEIGHBORHOODS.slice(0, 5)
            ).map((n) => {
              const nName = language === 'ku' ? n.ku : n.name;
              const isCurrent = neighborhood === nName;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    setValidationError(null);
                    playClickSound();
                    setNeighborhood(nName);
                    setIsOtherNeighborhood(false);
                    setShowNeighborhoodSuggestions(false);
                  }}
                  className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-teal-700 text-white shadow-xs border border-teal-800 ring-2 ring-teal-300'
                      : 'bg-white hover:bg-teal-50 text-[#1E3725] border border-[#BBDDC6] hover:border-teal-400'
                  }`}
                >
                  {isCurrent && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  <span>{nName}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setShowAllNeighborhoods((prev) => !prev);
              }}
              className="px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 shadow-2xs hover:border-teal-500"
            >
              {!showAllNeighborhoods ? (
                <>
                  <span>{tr('+ مزيد', '+ زێدەتر', '+ More')}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>{tr('عرض أقل', 'کەمتر نیشان بدە', 'Show less')}</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {(isOtherNeighborhood ||
            neighborhood === 'أخرى' ||
            neighborhood === 'هیتر' ||
            neighborhood === 'Other') && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-2xl bg-[#E8F4EA] border border-[#88B793] space-y-1.5 shadow-2xs mt-2"
            >
              <input
                type="text"
                maxLength={FIELD_LIMITS.LOCATION.maxChars}
                value={customNeighborhood}
                onChange={(e) => {
                  setValidationError(null);
                  setCustomNeighborhood(
                    enforceInputLimit(
                      e.target.value,
                      FIELD_LIMITS.LOCATION.maxWords,
                      FIELD_LIMITS.LOCATION.maxChars
                    )
                  );
                }}
                placeholder={tr(
                  'اكتب اسم الحي أو القرية في باعدرى...',
                  'ناوی گەڕەک یان گوندەکە بنووسە...',
                  'Type custom neighborhood or village...'
                )}
                className="w-full bg-white border border-[#BBDDC6] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] focus:border-teal-600 focus:outline-none"
              />
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  if (step === 6) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-[#F4F9F5] border border-[#BBDDC6] space-y-4 shadow-2xs">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <label className="block text-xs sm:text-sm font-black text-[#1E3725]">
                  {tr('اسم الشارع في باعذرة:', 'ناوی شەقام لە باعەدرێ:', 'Street Name in Baadre:')}
                </label>
                <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  {tr('21 شارع معتمد', '21 شەقامی فەرمی', '21 Official Streets')}
                </span>
              </div>
              <p className="text-[11px] text-teal-800 font-medium mt-0.5">
                {tr(
                  'اختر اسم الشارع من الخيارات السريعة أدناه أو اكتبه في الحقل',
                  'ناوی شەقام لە هەڵبژاردنە خێراکان هەڵبژێرە یان لە خانەکەدا بنووسە',
                  'Select street name from quick options below or type it in'
                )}
              </p>
            </div>
            <FieldLimitBadge
              value={street}
              maxWords={FIELD_LIMITS.LOCATION.maxWords}
              maxChars={FIELD_LIMITS.LOCATION.maxChars}
            />
          </div>

          <div className="relative">
            <input
              type="text"
              maxLength={FIELD_LIMITS.LOCATION.maxChars}
              value={street}
              onFocus={() => setShowStreetSuggestions(true)}
              onChange={(e) => {
                setValidationError(null);
                setStreet(
                  enforceInputLimit(
                    e.target.value,
                    FIELD_LIMITS.LOCATION.maxWords,
                    FIELD_LIMITS.LOCATION.maxChars
                  )
                );
                setShowStreetSuggestions(true);
              }}
              placeholder={tr(
                'اختر من القائمة أدناه أو اكتب اسم الشارع...',
                'لە لیستەکەی خوارەوە هەڵبژێرە یان ناوی شەقام بنووسە...',
                'Select from list below or type street name...'
              )}
              className="w-full bg-white border border-[#BBDDC6] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all"
            />

            {street && (
              <button
                type="button"
                onClick={() => {
                  setValidationError(null);
                  setStreet('');
                }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-[#46674D] hover:text-red-600 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {showStreetSuggestions && street.trim() && (
              <div className="absolute top-full mt-1.5 left-0 right-0 z-30 bg-white border border-[#BBDDC6] rounded-2xl shadow-[0_10px_30px_rgba(70,103,77,0.18)] max-h-48 overflow-y-auto p-1.5">
                {BAADRE_STREETS.filter((s) =>
                  s.toLowerCase().includes(street.trim().toLowerCase())
                ).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setValidationError(null);
                      playClickSound();
                      setStreet(s);
                      setShowStreetSuggestions(false);
                    }}
                    className="w-full text-start px-3 py-2 rounded-xl text-xs font-bold text-[#1E3725] hover:bg-teal-50 hover:text-teal-800 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>{s}</span>
                    <span className="text-[10px] text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-md">
                      {tr('شارع', 'شەقام', 'Street')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {(showAllStreets ? BAADRE_STREETS : BAADRE_STREETS.slice(0, 5)).map(
              (streetName) => {
                const isCurrent = street === streetName;
                return (
                  <button
                    key={streetName}
                    type="button"
                    onClick={() => {
                      setValidationError(null);
                      playClickSound();
                      setStreet(streetName);
                      setShowStreetSuggestions(false);
                    }}
                    className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isCurrent
                        ? 'bg-teal-700 text-white shadow-xs border border-teal-800 ring-2 ring-teal-300'
                        : 'bg-white hover:bg-teal-50 text-[#1E3725] border border-[#BBDDC6] hover:border-teal-400'
                    }`}
                  >
                    {isCurrent && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    <span>{streetName}</span>
                  </button>
                );
              }
            )}

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setShowAllStreets((prev) => !prev);
              }}
              className="px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 shadow-2xs hover:border-teal-500"
            >
              {!showAllStreets ? (
                <>
                  <span>{tr('+ مزيد', '+ زێدەتر', '+ More')}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>{tr('عرض أقل', 'کەمتر نیشان بدە', 'Show less')}</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 7) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-[#F4F9F5] border border-[#BBDDC6] space-y-4 shadow-2xs">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <label className="block text-xs sm:text-sm font-black text-[#1E3725]">
                  {tr(
                    'أقرب نقطة دالة (مدرسة، دائرة، قاعة، مركز...):',
                    'نزیکترین خاڵ (قوتابخانە، فەرمانگە، هۆڵ، سەنتەر...):',
                    'Nearest Landmark (School, Dept, Hall, Center...):'
                  )}
                </label>
                <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  {tr('(اختياري)', '(ئارەزوومەندانە)', '(Optional)')}
                </span>
              </div>
              <p className="text-[11px] text-teal-800 font-medium mt-0.5">
                {tr(
                  'تساعد فرق الصيانة الميدانية في الوصول للموقع بسرعة وسهولة',
                  'یارمەتی تیمەکانی چاککردنەوە دەدات بۆ گەیشتنی خێرا بە شوێنەکە',
                  'Helps maintenance field teams reach the location promptly'
                )}
              </p>
            </div>
            <FieldLimitBadge
              value={landmark}
              maxWords={FIELD_LIMITS.LOCATION.maxWords}
              maxChars={FIELD_LIMITS.LOCATION.maxChars}
            />
          </div>

          <div className="relative">
            <input
              type="text"
              maxLength={FIELD_LIMITS.LOCATION.maxChars}
              value={landmark}
              onFocus={() => setShowLandmarkSuggestions(true)}
              onChange={(e) => {
                setValidationError(null);
                setLandmark(
                  enforceInputLimit(
                    e.target.value,
                    FIELD_LIMITS.LOCATION.maxWords,
                    FIELD_LIMITS.LOCATION.maxChars
                  )
                );
                setShowLandmarkSuggestions(true);
              }}
              placeholder={tr(
                'اختر من القائمة أدناه أو اكتب أقرب نقطة دالة...',
                'لە لیستەکەی خوارەوە هەڵبژێرە یان نزیکترین خاڵ بنووسە...',
                'Select from list below or type nearest point...'
              )}
              className="w-full bg-white border border-[#BBDDC6] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all"
            />

            {landmark && (
              <button
                type="button"
                onClick={() => {
                  setValidationError(null);
                  setLandmark('');
                }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-[#46674D] hover:text-red-600 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {showLandmarkSuggestions && landmark.trim() && (
              <div className="absolute top-full mt-1.5 left-0 right-0 z-30 bg-white border border-[#BBDDC6] rounded-2xl shadow-[0_10px_30px_rgba(70,103,77,0.18)] max-h-48 overflow-y-auto p-1.5">
                {BAADRE_LANDMARKS.filter((lm) =>
                  lm.toLowerCase().includes(landmark.trim().toLowerCase())
                ).map((lm) => (
                  <button
                    key={lm}
                    type="button"
                    onClick={() => {
                      setValidationError(null);
                      playClickSound();
                      setLandmark(lm);
                      setShowLandmarkSuggestions(false);
                    }}
                    className="w-full text-start px-3 py-2 rounded-xl text-xs font-bold text-[#1E3725] hover:bg-teal-50 hover:text-teal-800 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>{lm}</span>
                    <span className="text-[10px] text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-md">
                      {tr('نقطة دالة', 'خاڵی دیار', 'Landmark')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {(showAllLandmarks ? BAADRE_LANDMARKS : BAADRE_LANDMARKS.slice(0, 5)).map(
              (lmName) => {
                const isCurrent = landmark === lmName;
                return (
                  <button
                    key={lmName}
                    type="button"
                    onClick={() => {
                      setValidationError(null);
                      playClickSound();
                      setLandmark(lmName);
                      setShowLandmarkSuggestions(false);
                    }}
                    className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isCurrent
                        ? 'bg-teal-700 text-white shadow-xs border border-teal-800 ring-2 ring-teal-300'
                        : 'bg-white hover:bg-teal-50 text-[#1E3725] border border-[#BBDDC6] hover:border-teal-400'
                    }`}
                  >
                    {isCurrent && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    <span>{lmName}</span>
                  </button>
                );
              }
            )}

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setShowAllLandmarks((prev) => !prev);
              }}
              className="px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 shadow-2xs hover:border-teal-500"
            >
              {!showAllLandmarks ? (
                <>
                  <span>{tr('+ مزيد', '+ زێدەتر', '+ More')}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>{tr('عرض أقل', 'کەمتر نیشان بدە', 'Show less')}</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
