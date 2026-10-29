import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Mail, Phone, Lock, Eye, FileCheck, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDeleteAccount?: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { language, dir, isRTL } = useLanguage();

  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        dir={dir}
        className="fixed inset-0 z-[2500] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#1E3725]/45 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 12 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className={`relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#BBDDC6] overflow-hidden flex flex-col max-h-[88vh] z-10 ${
            isRTL ? 'text-right' : 'text-left'
          }`}
        >
          {/* Header */}
          <div className="px-5 py-4 sm:px-6 border-b border-[#E8F4EA] bg-[#F4F9F5] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#46674D] text-white flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-[#1E3725] leading-tight">
                  {tr(
                    'سياسات الخصوصية وحماية البيانات',
                    'سیاسەتی تایبەتمەندی و پاراستنی زانیاری',
                    'Privacy & Data Protection Policy'
                  )}
                </h2>
                <p className="text-[11px] text-[#46674D] font-bold">
                  {tr(
                    'منظمة CAVE BAADRE • عين باعدرى الذكية',
                    'ڕێکخراوی CAVE BAADRE • چاوی زیرەکی باعەدرێ',
                    'CAVE BAADRE Org • Smart Baadre Eye'
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#E8F4EA] hover:bg-[#D4EADB] text-[#1E3725] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 overflow-y-auto text-xs sm:text-sm text-[#2D4833] leading-relaxed space-y-4">
            <p className="font-bold text-[#1E3725] border-b border-[#E8F4EA] pb-3">
              {tr(
                'توضح سياسة الخصوصية هذه كيف تقوم منظمة CAVE BAADRE بجمع واستخدام وحماية البيانات والمعلومات عند استخدام المنصة لتقديم البلاغات الخدمية في ناحية باعدرى.',
                'ئەم سیاسەتی تایبەتمەندییە ڕوونی دەکاتەوە کە چۆن ڕێکخراوی CAVE BAADRE زانیارییەکان کۆدەکاتەوە و دەپارێزێت لە کاتی بەکارهێنانی سەکۆکە بۆ پێشکەشکردنی سکاڵا خزمەتگوزارییەکان لە ناحیەی باعەدرێ.',
                'This Privacy Policy explains how CAVE BAADRE collects, uses, and protects your information when submitting civic service reports in Baadre sub-district.'
              )}
            </p>

            <div className="p-4 rounded-2xl bg-[#F4F9F5] border border-[#E8F4EA] space-y-1.5">
              <h3 className="text-xs sm:text-sm font-black text-[#1E3725] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#46674D]" />
                <span>
                  {tr('1. البيانات التي نجمعها', '١. ئەو زانیارییانەی کۆیان دەکەینەوە', '1. Information We Collect')}
                </span>
              </h3>
              <p className="text-xs leading-relaxed font-medium">
                {tr(
                  'نقوم بجمع البيانات الضرورية لمعالجة البلاغات الميدانية فقط، وتشمل: اسم المبلّغ، رقم الهاتف للتواصل، وصف المشكلة، الصور المرفقة، وإحداثيات الموقع الجغرافي (GPS) لتحديد مكان العطل بدقة.',
                  'ئێمە تەنها زانیارییە پێویستەکان بۆ چارەسەرکردنی سکاڵا مەیدانییەکان کۆدەکەینەوە، وەک: ناوی سکاڵاکار، ژمارەی مۆبایل، وەسفی کێشەکە، وێنە هاوپێچکراوەکان، و شوێنی جوگرافی (GPS).',
                  'We collect only the information required to process field reports: reporter name, contact phone number, issue description, attached photos, and GPS location coordinates.'
                )}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F4F9F5] border border-[#E8F4EA] space-y-1.5">
              <h3 className="text-xs sm:text-sm font-black text-[#1E3725] flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#46674D]" />
                <span>
                  {tr('2. كيفية استخدام المعلومات', '٢. چۆنیەتی بەکارهێنانی زانیارییەکان', '2. How We Use Information')}
                </span>
              </h3>
              <p className="text-xs leading-relaxed font-medium">
                {tr(
                  'تُستخدم البيانات حصرياً لإحالة البلاغات إلى الدوائر الخدمية المعنية في ناحية باعدرى (المهندس المختص، معاون المدير، أو مدير الدائرة) لمتابعة المعالجة الميدانية وتوثيق الأعمال المنجزة قبل وبعد الإنجاز.',
                  'زانیارییەکان تەنها بۆ ناردنی سکاڵاکان بۆ فەرمانگە خزمەتگوزارییە پەیوەندیدارەکان لە باعەدرێ بەکاردەهێنرێن بە مەبەستی چارەسەرکردنی مەیدانی و بەڵگەنامەکردنی کارە تەواوکراوەکان.',
                  'Your data is used strictly to refer reports to the relevant service departments in Baadre for field resolution and to document completed works before and after.'
                )}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F4F9F5] border border-[#E8F4EA] space-y-1.5">
              <h3 className="text-xs sm:text-sm font-black text-[#1E3725] flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#46674D]" />
                <span>
                  {tr('3. سرية وحماية بيانات المواطنين', '٣. نهێنی و پاراستنی زانیاری هاووڵاتیان', '3. Citizen Data Confidentiality')}
                </span>
              </h3>
              <p className="text-xs leading-relaxed font-medium">
                {tr(
                  'تلتزم منظمة CAVE BAADRE بعدم مشاركة أو بيع بيانات المواطنين لأي جهة خارجية، وتبقى معلومات المبلّغ محفوظة ضمن سجلات المتابعة الرسمية للمنظمة والدائرة الخدمية المختصة.',
                  'ڕێکخراوی CAVE BAADRE پابەندە بە پاراستنی نهێنی زانیاری هاووڵاتیان و هاوبەشی پێناکرێت لەگەڵ هیچ لایەنێکی دەرەکی.',
                  'CAVE BAADRE is committed to never selling or sharing citizen data with third parties; reporter details remain confidential within official organization records.'
                )}
              </p>
            </div>

            <div className="pt-2 border-t border-[#E8F4EA] space-y-2">
              <h3 className="text-xs font-black text-[#1E3725]">
                {tr('للتواصل والاستفسار:', 'بۆ پەیوەندی و پرسیار:', 'Contact & Support:')}
              </h3>
              <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold text-[#1E3725]">
                <a
                  href="mailto:info@cavebaadre.org"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F4F9F5] border border-[#BBDDC6] hover:bg-[#E8F4EA] transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-[#46674D]" />
                  <span dir="ltr">info@cavebaadre.org</span>
                </a>
                <a
                  href="tel:+9647504738358"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E8F4EA] border border-[#88B793] text-[#1E3725] hover:bg-[#D4EADB] transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-[#46674D]" />
                  <span dir="ltr">+964 750 473 8358</span>
                </a>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 sm:px-6 bg-[#F4F9F5] border-t border-[#E8F4EA] flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-[#46674D] font-bold">
              <CheckCircle2 className="w-4 h-4 text-[#46674D]" />
              <span>
                {tr(
                  'حماية كاملة لخصوصية البيانات',
                  'پاراستنی تەواوی تایبەتمەندی زانیارییەکان',
                  'Strict Data Protection & Privacy'
                )}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#46674D] hover:bg-[#36593F] text-white font-black text-xs transition-all cursor-pointer"
            >
              {tr('إغلاق', 'داخستن', 'Close')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

