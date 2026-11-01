import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Mail, Phone, Lock, Eye, FileCheck, CheckCircle2, Building, Trash2 } from 'lucide-react';
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
          className="fixed inset-0 bg-[#0F263D]/50 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 12 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className={`relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#BBDDC6]/70 overflow-hidden flex flex-col max-h-[88vh] z-10 ${
            isRTL ? 'text-right' : 'text-left'
          }`}
        >
          {/* Header */}
          <div className="px-5 py-4 sm:px-6 border-b border-[#E2EEF7] bg-[#F4F9FD] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#1F4C73] text-white flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-[#153450] leading-tight">
                  {tr(
                    'سياسة الخصوصية وحماية البيانات',
                    'سیاسەتی تایبەتمەندی و پاراستنی زانیاری',
                    'Privacy & Data Protection Policy'
                  )}
                </h2>
                <p className="text-[11px] text-[#295B86] font-bold">
                  {tr(
                    'منظمة RABA • تطبيق ÇAVÊ BAADRÊ (عين باعذرة)',
                    'ڕێکخراوی RABA • ئەپی ÇAVÊ BAADRÊ (چاڤێ باعدرێ)',
                    'RABA Organization • ÇAVÊ BAADRÊ App (Baadre Eye)'
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#E2EEF7] hover:bg-[#D0E4F3] text-[#153450] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 overflow-y-auto text-xs sm:text-sm text-[#1E3F66] leading-relaxed space-y-4">
            {/* المقدمة الرسمية للمنظمة والتطبيق */}
            <div className="p-4 rounded-2xl bg-[#F4F9FD] border border-[#CCE3F5] space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-[#153450]">
                <Building className="w-4 h-4 text-[#256BA6]" />
                <span>
                  {tr(
                    'مقدمة وإشراف منظمة RABA',
                    'پێشەکی و چاودێری ڕێکخراوی RABA',
                    'RABA Organization Governance'
                  )}
                </span>
              </div>
              <p className="font-medium text-[#1E3F66] leading-relaxed text-xs">
                {tr(
                  'تطبيق ÇAVÊ BAADRÊ (عين باعذرة / Baadre Eye) هو منصة وتطبيق رقمي مجتمعي رسمي أطلقته وتديره منظمة RABA، بهدف تمكين أهالي ناحية باعذرة من الإبلاغ عن الأعطال والخدمات العامة ومتابعتها بشفافية. توضح هذه الوثيقة التزام منظمة RABA الصارم بحماية خصوصية وأمان وسرية بيانات المواطنين.',
                  'ئەپی ÇAVÊ BAADRÊ (چاڤێ باعدرێ / Baadre Eye) سەکۆ و ئەپێکی دیجیتاڵی کۆمەڵایەتی فەرمییە کە لەلایەن ڕێکخراوی RABA سەرپەرشتی دەکرێت بە ئامانجی خزمەتکردنی خەڵکی ناحیەی باعەدرێ. ئەم بەڵگەنامەیە پابەندبوونی تەواوی ڕێکخراوی RABA بۆ پاراستنی نهێنی و ئاسایشی زانیاری هاووڵاتیان دووپات دەکاتەوە.',
                  'The ÇAVÊ BAADRÊ application is an official civic digital platform governed by RABA Organization to serve the Baadre community. This document outlines RABA Organization’s commitment to citizen privacy, data protection, and confidentiality.'
                )}
              </p>
            </div>

            {/* بند 1: البيانات التي نجمعها */}
            <div className="p-4 rounded-2xl bg-white border border-[#E2EEF7] shadow-2xs space-y-1.5">
              <h3 className="text-xs sm:text-sm font-black text-[#153450] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#256BA6]" />
                <span>
                  {tr('1. البيانات التي يتم جمعها', '١. ئەو زانیارییانەی کۆدەکرێنەوە', '1. Data We Collect')}
                </span>
              </h3>
              <p className="text-xs leading-relaxed font-medium text-[#294B6F]">
                {tr(
                  'تقوم منظمة RABA عبر تطبيق ÇAVÊ BAADRÊ بجمع الحد الأدنى من البيانات الضرورية لمعالجة البلاغات الخدمية فقط: اسم المواطن للتواصل، رقم الهاتف لتأكيد البلاغ وتنسيق المعالجة، وصف المشكلة أو العطل، الصور المرفقة للتوثيق الميداني، وإحداثيات الموقع الجغرافي (GPS) لتحديد موقع الخلل بدقة.',
                  'ڕێکخراوی RABA لە ڕێگەی ئەپی ÇAVÊ BAADRÊ تەنها ئەو زانیارییە پێویستانە کۆدەکاتەوە کە گرنگن بۆ چارەسەرکردنی سکاڵاکە: ناوی سکاڵاکار، ژمارەی مۆبایل بۆ پەیوەندی و بەدواداچوون، وەسفی کێشەکە، وێنەی بەڵگەنامەیی، و شوێنی جوگرافی (GPS).',
                  'Through ÇAVÊ BAADRÊ, RABA Organization collects only data required to resolve civic reports: citizen name, contact phone number, issue description, attached verification photos, and GPS location coordinates.'
                )}
              </p>
            </div>

            {/* بند 2: كيفية استخدام المعلومات */}
            <div className="p-4 rounded-2xl bg-white border border-[#E2EEF7] shadow-2xs space-y-1.5">
              <h3 className="text-xs sm:text-sm font-black text-[#153450] flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#256BA6]" />
                <span>
                  {tr('2. آلية استخدام ومعالجة المعلومات', '٢. چۆنیەتی بەکارهێنانی زانیارییەکان', '2. How Information Is Used')}
                </span>
              </h3>
              <p className="text-xs leading-relaxed font-medium text-[#294B6F]">
                {tr(
                  'تُستخدم البيانات حصرياً لإحالة البلاغ رسمياً إلى الدوائر الخدمية المعنية في ناحية باعذرة (البلدية، الماء، الكهرباء، الطرق، الصرف الصحي، والنظافة) بهدف تكليف الفرق الفنية والمهندس المختص بالمعالجة الميدانية، وتوثيق إنجاز العمل ومشاركته مع المواطن.',
                  'زانیارییەکان تەنها بۆ ناردنی فەرمی سکاڵاکە بۆ فەرمانگە خزمەتگوزارییە پەیوەندیدارەکان لە ناحیەی باعەدرێ بەکاردەهێنرێن بە مەبەستی ناردنی تیمی چاککردنەوە و بەڵگەنامەکردنی ئەنجامدانی کارەکە.',
                  'Data is used solely to route reports to the responsible municipal departments in Baadre for field repair and completion verification.'
                )}
              </p>
            </div>

            {/* بند 3: سرية وحماية بيانات المواطنين */}
            <div className="p-4 rounded-2xl bg-white border border-[#E2EEF7] shadow-2xs space-y-1.5">
              <h3 className="text-xs sm:text-sm font-black text-[#153450] flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#256BA6]" />
                <span>
                  {tr('3. حماية وسرية البيانات وعدم المشاركة التجارية', '٣. نهێنی و پاراستنی زانیاری و بەکارنەهێنان بۆ بازرگانی', '3. Strict Confidentiality & Non-Commercial Use')}
                </span>
              </h3>
              <p className="text-xs leading-relaxed font-medium text-[#294B6F]">
                {tr(
                  'تلتزم منظمة RABA التزاماً قاطعاً بعدم بيع أو تأجير أو مشاركة بيانات المواطنين أو أرقام هواتفهم مع أي طرف ثالث أو جهات إعلانية وتجارية. تبقى كافة المعلومات محفوظة في بيئة سحابية مشفرة ومحمية وخاصة بالنظام الرسمي لمنظمة RABA.',
                  'ڕێکخراوی RABA بە تەواوی پابەندە بەوەی کە هەرگیز زانیاری هاووڵاتیان و ژمارەی مۆبایلیان نەفرۆشێت و هاوبەشی پێ نەکات لەگەڵ هیچ لایەنێکی بازرگانی یان دەرەکی. هەموو زانیارییەکان پارێزراون بە سیستەمی ئاسایشی توند.',
                  'RABA Organization strictly guarantees that citizen data and phone numbers are never sold, rented, or shared with third parties or advertisers. All records are secured within encrypted cloud infrastructure.'
                )}
              </p>
            </div>

            {/* بند 4: حقوق المواطن في البيانات */}
            <div className="p-4 rounded-2xl bg-white border border-[#E2EEF7] shadow-2xs space-y-1.5">
              <h3 className="text-xs sm:text-sm font-black text-[#153450] flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-[#256BA6]" />
                <span>
                  {tr('4. حقوق المواطن والتحكم في البيانات', '٤. مافەکانی هاووڵاتی و کۆنترۆڵکردنی داتا', '4. Citizen Rights & Data Control')}
                </span>
              </h3>
              <p className="text-xs leading-relaxed font-medium text-[#294B6F]">
                {tr(
                  'يحق للمواطن في أي وقت تتبع مسار بلاغه، أو طلب تعديل بياناته، أو طلب حذف سجله وبلاغاته عبر التواصل المباشر مع فريق إدارة منظمة RABA.',
                  'هاووڵاتی مافی ئەوەی هەیە لە هەر کاتێکدا بەدواداچوون بۆ سکاڵاکەی بکات، داوای دەستکاریکردن یان سڕینەوەی تۆمارەکانی بکات بە پەیوەندیکردن بە ڕێکخراوی RABA.',
                  'Citizens maintain full rights to track, request correction, or request deletion of their submitted reports and profile records by contacting RABA Organization.'
                )}
              </p>
            </div>

            {/* قنوات التواصل الرسمية */}
            <div className="pt-2 border-t border-[#E2EEF7] space-y-2">
              <h3 className="text-xs font-black text-[#153450]">
                {tr('قنوات تواصل منظمة RABA الرسمية:', 'کەناڵەکانی پەیوەندی فەرمی ڕێکخراوی RABA:', 'RABA Organization Official Contacts:')}
              </h3>
              <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold text-[#153450]">
                <a
                  href="mailto:info@cavebaadre.org"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F4F9FD] border border-[#CCE3F5] hover:bg-[#E2EEF7] transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-[#256BA6]" />
                  <span dir="ltr">info@cavebaadre.org</span>
                </a>
                <a
                  href="tel:+9647504738358"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EAF4EC] border border-[#BBDDC6] text-[#1E3725] hover:bg-[#D8ECDB] transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-[#3E6E4A]" />
                  <span dir="ltr">+964 750 473 8358</span>
                </a>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 sm:px-6 bg-[#F4F9FD] border-t border-[#E2EEF7] flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-[#256BA6] font-bold">
              <CheckCircle2 className="w-4 h-4 text-[#256BA6]" />
              <span>
                {tr(
                  'سياسات معتمدة ومحمية — منظمة RABA',
                  'سیاسەتی پەسەندکراو و پارێزراو — ڕێکخراوی RABA',
                  'Approved & Protected — RABA Organization'
                )}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#1F4C73] hover:bg-[#163854] text-white font-black text-xs transition-all cursor-pointer shadow-xs"
            >
              {tr('إغلاق', 'داخستن', 'Close')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
