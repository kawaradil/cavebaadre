import React, { useState } from 'react';
import {
  X,
  PlusCircle,
  User as UserIcon,
  ShieldCheck,
  Share2,
  Check,
  MessageCircle,
  ArrowLeftRight,
  Info,
  FileText,
  Phone,
  Mail,
  ChevronDown,
  MapPin,
  Sparkles,
  ExternalLink,
  ClipboardList,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { useBaadre } from '../context/BaadreContext';
import { MUNICIPAL_WHATSAPP_NUMBER } from '../types/baadre';
import { AqqarAppIcon } from './AqqarAppIcon';
import { playClickSound } from '../lib/sound';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSubmitReport: () => void;
  onOpenAddProject?: () => void;
  installPrompt?: any;
  onInstallApp?: () => void;
  onOpenPrivacyPolicy?: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  onOpenSubmitReport,
  onOpenPrivacyPolicy,
}) => {
  const { language, setLanguage, dir, isRTL } = useLanguage();
  const {
    activeRole,
    setActiveRole,
    setCitizenTab,
    setAdminTab,
    setIsSurveysViewOpen,
    surveys,
  } = useBaadre();

  const [copiedLink, setCopiedLink] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  // Expanded Accordion Sections State
  const [expandedSection, setExpandedSection] = useState<string | null>('contact');

  const toggleSection = (sectionKey: string) => {
    playClickSound();
    setExpandedSection((prev) => (prev === sectionKey ? null : sectionKey));
  };

  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

  const handleShareApp = async () => {
    playClickSound();
    const shareData = {
      title: tr(
        'CAVE BAADRE | عين باعدرى الذكية',
        'CAVE BAADRE | چاوی زیرەکی باعەدرێ',
        'CAVE BAADRE | Smart Baadre Eye'
      ),
      text: tr(
        'منصة منظمة CAVE BAADRE الرقمية لاستقبال بلاغات المواطنين وإحالتها إلى الدوائر الخدمية المعنية في ناحية باعدرى',
        'سەکۆی دیجیتاڵی ڕێکخراوی CAVE BAADRE بۆ وەرگرتنی سکاڵای هاووڵاتیان و ناردنی بۆ فەرمانگە پەیوەندیدارەکان لە باعەدرێ',
        'CAVE BAADRE digital platform for receiving citizen reports and referring them to relevant departments in Baadre'
      ),
      url: window.location.origin,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.origin);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } catch {
        // fallback
      }
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-[#1E3725]/25 z-50 backdrop-blur-xs"
            />

            {/* Drawer Container (بدون إطارات مع ظل أنيق جداً) */}
            <motion.div
              initial={{ x: language === 'en' ? '-100%' : '100%' }}
              animate={{ x: 0 }}
              exit={{ x: language === 'en' ? '-100%' : '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              className={`fixed top-0 bottom-0 ${
                language === 'en' ? 'left-0' : 'right-0'
              } w-84 max-w-[85vw] bg-white/95 backdrop-blur-2xl z-50 flex flex-col shadow-[0_20px_70px_rgba(37,126,184,0.22)] overflow-hidden text-[#1E3725] border-0`}
            >
              {/* Header (بدون إطارات) */}
              <div className="px-5 py-4 flex items-center justify-between bg-white/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <AqqarAppIcon size="sm" variant="clean" showText={false} />
                  <div>
                    <span className="font-black text-base text-[#1E3725] tracking-wide block leading-tight">
                      CAVE BAADRE
                    </span>
                    <span className="text-[10px] font-bold text-[#46674D]">
                      {tr('عين باعدرى الذكية', 'چاوی زیرەکی باعەدرێ', 'Smart Baadre Eye')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 text-[#46674D] hover:text-[#1E3725] rounded-xl hover:bg-[#E8F4EA] transition-all cursor-pointer shadow-2xs"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="px-4 py-3 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                {/* 1. التبديل بين الواجهات (Role Switcher - بدون إطارات مع ظل لطيف) */}
                <div className="p-3.5 rounded-2xl bg-[#F4F9F5] shadow-[0_2px_12px_rgba(37,126,184,0.06)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#46674D] text-white flex items-center justify-center shadow-xs">
                        {activeRole === 'admin' ? (
                          <ShieldCheck className="w-4 h-4" />
                        ) : (
                          <UserIcon className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-black text-[#1E3725]">
                          {activeRole === 'admin'
                            ? tr(
                                'إدارة المنظمة والإحالة للدوائر',
                                'بەڕێوەبردنی ڕێکخراو و ناردن بۆ فەرمانگەکان',
                                'Organization Admin & Referrals'
                              )
                            : tr(
                                'واجهة المواطن (بلاغاتي)',
                                'ڕووکاری هاووڵاتی (سکاڵاکانم)',
                                'Citizen View (My Reports)'
                              )}
                        </p>
                        <p className="text-[10px] font-bold text-[#46674D]">
                          {tr(
                            'التبديل المباشر بين الواجهات',
                            'گۆڕینی ڕاستەوخۆ لە نێوان ڕووکارەکان',
                            'Switch directly between interfaces'
                          )}
                        </p>
                      </div>
                    </div>
                    <ArrowLeftRight className="w-4 h-4 text-[#46674D]" />
                  </div>

                  {/* Segmented Buttons (بدون إطارات) */}
                  <div className="grid grid-cols-2 gap-1.5 bg-[#E8F4EA]/70 p-1 rounded-xl">
                    <button
                      onClick={() => {
                        playClickSound();
                        setActiveRole('citizen');
                        setCitizenTab('works');
                        onClose();
                      }}
                      className={`py-2 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        activeRole === 'citizen'
                          ? 'bg-[#46674D] text-white shadow-xs'
                          : 'text-[#2D4833] hover:bg-white/60'
                      }`}
                    >
                      <UserIcon className="w-3.5 h-3.5" />
                      <span>{tr('واجهة المواطن', 'هاووڵاتی', 'Citizen')}</span>
                    </button>

                    <button
                      onClick={() => {
                        playClickSound();
                        setActiveRole('admin');
                        setAdminTab('analytics');
                        onClose();
                      }}
                      className={`py-2 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        activeRole === 'admin'
                          ? 'bg-[#46674D] text-white shadow-xs'
                          : 'text-[#2D4833] hover:bg-white/60'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{tr('إدارة المنظمة', 'بەڕێوەبەرایەتی', 'Admin')}</span>
                    </button>
                  </div>
                </div>

                {/* 2. زر تقديم بلاغ جديد (Primary Action - بدون إطارات مع ظل لطيف) */}
                <div>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSubmitReport();
                    }}
                    className="w-full py-3 px-3.5 bg-gradient-to-tr from-[#33553C] via-[#46674D] to-[#5C8564] text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(70,103,77,0.28)] hover:brightness-105 hover:scale-[1.01] active:scale-[0.98] text-xs cursor-pointer border-0 outline-none"
                  >
                    <PlusCircle className="w-4.5 h-4.5 stroke-[2.5]" />
                    <span>
                      {tr(
                        'تقديم بلاغ جديد للمنظمة',
                        'پێشکەشکردنی سکاڵای نوێ بۆ ڕێکخراو',
                        'Submit New Report to Organization'
                      )}
                    </span>
                  </button>
                </div>

                {/* 3. لغة التطبيق (Language Selector - بدون إطارات) */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-black text-[#46674D] px-1">
                    {tr('لغة التطبيق', 'زمانی ئەپ', 'App Language')}
                  </p>
                  <div className="grid grid-cols-3 gap-1.5 bg-[#F4F9F5] p-1 rounded-2xl shadow-xs">
                    {(['ar', 'ku', 'en'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setLanguage(lang)}
                        className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          language === lang
                            ? 'bg-[#46674D] text-white shadow-xs'
                            : 'text-[#2D4833] hover:bg-white/70'
                        }`}
                      >
                        {lang === 'ar' ? 'العربية' : lang === 'ku' ? 'کوردی' : 'English'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. الأقسام التفاعلية (أسماء الأجزاء ثم بالنقر يظهر تفاصيله - بدون إطارات مع ظل أنيق) */}
                <div className="space-y-2.5 pt-1">
                  <p className="text-[11px] font-black text-[#46674D] px-1">
                    {tr('أقسام ومعلومات المنصة', 'بەش و زانیارییەکانی سەکۆ', 'Platform Sections')}
                  </p>

                  {/* قسم الاستبيانات (Surveys Section - يفتح شاشة الاستبيانات المتناسقة مع التطبيق) */}
                  <div className="rounded-2xl bg-[#F4F9F5] shadow-[0_2px_12px_rgba(37,126,184,0.06)] overflow-hidden transition-all">
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setIsSurveysViewOpen(true);
                        onClose();
                      }}
                      className="w-full p-3.5 flex items-center justify-between text-right cursor-pointer hover:bg-[#EAF4EC]/80 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#46674D] text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <ClipboardList className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-[#1E3725]">
                            {tr('قسم الاستبيانات', 'بەشی ڕاپرسییەکان', 'Surveys & Polls')}
                          </p>
                          <p className="text-[10px] text-[#46674D] font-bold">
                            {tr(
                              'إنشاء الاستبيانات ونشرها للمواطنين والإحصاءات',
                              'دروستکردنی ڕاپرسی و بڵاوکردنەوە و ئامارەکان',
                              'Create, publish & view survey statistics'
                            )}
                          </p>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-[#46674D] shrink-0" />
                    </button>
                  </div>

                  {/* أ) قسم من نحن (About Us) */}
                  <div className="rounded-2xl bg-[#F4F9F5] shadow-[0_2px_12px_rgba(37,126,184,0.06)] overflow-hidden transition-all">
                    <button
                      type="button"
                      onClick={() => toggleSection('about')}
                      className="w-full p-3.5 flex items-center justify-between text-right cursor-pointer hover:bg-[#EAF4EC]/70 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#E8F4EA] text-[#46674D] flex items-center justify-center shrink-0">
                          <Info className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-[#1E3725]">
                            {tr('من نحن', 'ئێمە کێین', 'About Us')}
                          </p>
                          <p className="text-[10px] text-[#46674D] font-bold">
                            {tr('رسالة المنصة وأهدافها', 'پەیام و ئامانجەکان', 'Mission & Goals')}
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-[#46674D] transition-transform duration-250 ${
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
                          <div className="p-3.5 pt-0 space-y-2 text-xs text-[#2D4833] leading-relaxed">
                            <p className="font-bold text-[#1E3725] bg-white/70 p-2.5 rounded-xl">
                              {tr(
                                'منظمة CAVE BAADRE (عين باعدرى الذكية) منصة رقمية مجتمعية تربط المواطنين مباشرة بالدوائر الخدمية في ناحية باعدرى.',
                                'ڕێکخراوی CAVE BAADRE سەکۆیەکی دیجیتاڵییە بۆ پەیوەندی ڕاستەوخۆ لە نێوان هاووڵاتیان و فەرمانگە خزمەتگوزارییەکان لە باعەدرێ.',
                                'CAVE BAADRE is a digital platform connecting citizens directly with municipal departments in Baadre.'
                              )}
                            </p>
                            <ul className="space-y-1.5 text-[11px] font-bold text-[#1E3725] px-1">
                              <li className="flex items-start gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-[#46674D] shrink-0 mt-0.5" />
                                <span>{tr('استقبال بلاغات المواطنين الموثقة بالصور وإحداثيات الموقع.', 'وەرگرتنی سکاڵاکان بە وێنە و شوێنی جوگرافی.', 'Receiving photo & GPS verified reports.')}</span>
                              </li>
                              <li className="flex items-start gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-[#46674D] shrink-0 mt-0.5" />
                                <span>{tr('إحالة البلاغات رسمياً للدوائر ومتابعة إنجازها الميداني.', 'ناردنی فەرمی سکاڵاکان بۆ فەرمانگەکان و بەدواداچوون.', 'Official referrals to municipal departments.')}</span>
                              </li>
                            </ul>
                            <button
                              type="button"
                              onClick={() => setIsAboutModalOpen(true)}
                              className="w-full mt-2 py-2 px-3 rounded-xl bg-white hover:bg-[#E8F4EA] text-[#46674D] font-black text-[11px] flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                            >
                              <span>{tr('عرض المزيد من التفاصيل', 'بینینی زانیاری زیاتر', 'View Full Details')}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ب) قسم سياسة الخصوصية (Privacy Policy) */}
                  <div className="rounded-2xl bg-[#F4F9F5] shadow-[0_2px_12px_rgba(37,126,184,0.06)] overflow-hidden transition-all">
                    <button
                      type="button"
                      onClick={() => toggleSection('privacy')}
                      className="w-full p-3.5 flex items-center justify-between text-right cursor-pointer hover:bg-[#EAF4EC]/70 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#E8F4EA] text-[#46674D] flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-[#1E3725]">
                            {tr('سياسات الخصوصية', 'سیاسەتی تایبەتمەندی', 'Privacy Policy')}
                          </p>
                          <p className="text-[10px] text-[#46674D] font-bold">
                            {tr('حماية البيانات وسرية الأرقام', 'پاراستنی داتا و نهێنی', 'Data Protection & Privacy')}
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-[#46674D] transition-transform duration-250 ${
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
                          <div className="p-3.5 pt-0 space-y-2 text-xs text-[#2D4833] leading-relaxed">
                            <p className="font-bold text-[#1E3725] bg-white/70 p-2.5 rounded-xl">
                              {tr(
                                'تلتزم منصة CAVE BAADRE بالحفاظ الكامل على سرية بيانات المواطنين وأرقام هواتفهم، وتستخدم المعلومات فقط لغرض معالجة البلاغات الخدمية.',
                                'سەکۆی CAVE BAADRE پابەندە بە پاراستنی تەواوی نهێنی داتای هاووڵاتیان و تەنها بۆ چارەسەرکردنی سکاڵاکان بەکاردەهێنرێت.',
                                'CAVE BAADRE is committed to safeguarding citizen privacy. Data is used strictly for municipal resolution.'
                              )}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenPrivacyPolicy) {
                                  onClose();
                                  onOpenPrivacyPolicy();
                                }
                              }}
                              className="w-full mt-1 py-2 px-3 rounded-xl bg-white hover:bg-[#E8F4EA] text-[#46674D] font-black text-[11px] flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                            >
                              <span>{tr('فتح وثيقة الخصوصية الكاملة', 'کردنەوەی بەڵگەنامەی تەواو', 'Open Full Privacy Document')}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ج) قسم تواصل معنا (Contact Us) */}
                  <div className="rounded-2xl bg-[#F4F9F5] shadow-[0_2px_12px_rgba(37,126,184,0.06)] overflow-hidden transition-all">
                    <button
                      type="button"
                      onClick={() => toggleSection('contact')}
                      className="w-full p-3.5 flex items-center justify-between text-right cursor-pointer hover:bg-[#EAF4EC]/70 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#E8F4EA] text-[#46674D] flex items-center justify-center shrink-0">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-[#1E3725]">
                            {tr('تواصل معنا', 'پەیوەندیمان پێوە بکە', 'Contact Us')}
                          </p>
                          <p className="text-[10px] text-[#46674D] font-bold">
                            {tr('الهاتف، الواتساب، والبريد', 'مۆبایل، واتسئەپ، ئیمەیڵ', 'Phone, WhatsApp & Email')}
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-[#46674D] transition-transform duration-250 ${
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
                            {/* اتصال هاتفي مباشر */}
                            <a
                              href={`tel:+${MUNICIPAL_WHATSAPP_NUMBER}`}
                              className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white hover:bg-[#E8F4EA] transition-colors text-xs font-bold text-[#1E3725] shadow-2xs"
                            >
                              <span className="flex items-center gap-2 text-[#46674D]">
                                <Phone className="w-3.5 h-3.5 shrink-0" />
                                <span>{tr('رقم الهاتف:', 'ژمارەی مۆبایل:', 'Phone:')}</span>
                              </span>
                              <span className="font-mono font-black text-[#1E3725]" dir="ltr">
                                +964 750 473 8358
                              </span>
                            </a>

                            {/* واتساب المنظمة المعتمد */}
                            <a
                              href={`https://wa.me/${MUNICIPAL_WHATSAPP_NUMBER}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#E8F4EA] hover:bg-[#D4EADB] transition-colors text-xs font-black text-[#1E3725] shadow-2xs"
                            >
                              <div className="flex items-center gap-2">
                                <MessageCircle className="w-4 h-4 text-[#46674D]" />
                                <span>{tr('واتساب المنظمة', 'واتسئەپی ڕێکخراو', 'Official WhatsApp')}</span>
                              </div>
                              <span className="text-[10px] font-mono text-[#46674D]" dir="ltr">
                                +964 750
                              </span>
                            </a>

                            {/* البريد الإلكتروني */}
                            <a
                              href="mailto:info@cavebaadre.org"
                              className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white hover:bg-[#E8F4EA] transition-colors text-xs font-bold text-[#1E3725] shadow-2xs"
                            >
                              <span className="flex items-center gap-2 text-[#46674D]">
                                <Mail className="w-3.5 h-3.5 shrink-0" />
                                <span>{tr('الإيميل:', 'ئیمەیڵ:', 'Email:')}</span>
                              </span>
                              <span className="font-mono font-black text-[#1E3725] text-[11px] truncate" dir="ltr">
                                info@cavebaadre.org
                              </span>
                            </a>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* د) قسم نطاق التغطية والخدمات (Coverage) */}
                  <div className="rounded-2xl bg-[#F4F9F5] shadow-[0_2px_12px_rgba(37,126,184,0.06)] overflow-hidden transition-all">
                    <button
                      type="button"
                      onClick={() => toggleSection('coverage')}
                      className="w-full p-3.5 flex items-center justify-between text-right cursor-pointer hover:bg-[#EAF4EC]/70 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#E8F4EA] text-[#46674D] flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-[#1E3725]">
                            {tr('نطاق التغطية الخدمية', 'سنووری خزمەتگوزاری', 'Service Coverage')}
                          </p>
                          <p className="text-[10px] text-[#46674D] font-bold">
                            {tr('ناحية باعدرى وقراها', 'ناحیەی باعەدرێ و گوندەکان', 'Baadre District & Villages')}
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-[#46674D] transition-transform duration-250 ${
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
                          <div className="p-3.5 pt-0 space-y-2 text-xs font-bold text-[#1E3725]">
                            <div className="p-2.5 rounded-xl bg-white/70 space-y-1">
                              <p className="text-[11px] font-black text-[#46674D]">
                                {tr('المناطق المشمولة:', 'ناوچە داپۆشراوەکان:', 'Covered Areas:')}
                              </p>
                              <p className="text-[11px] text-[#2D4833]">
                                {tr(
                                  'مركز ناحية باعدرى، مجمع باعدرى، الأحياء السكنية والقرى التابعة إدارياً للناحية.',
                                  'ناوەندی ناحیەی باعەدرێ، کۆمەڵگەی باعەدرێ، گەڕەکەکان و گوندەکانی سەر بە ناحیەکە.',
                                  'Baadre center, Baadre complex, residential quarters and affiliated villages.'
                                )}
                              </p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/70 space-y-1">
                              <p className="text-[11px] font-black text-[#46674D]">
                                {tr('القطاعات المعتمدة:', 'کەرتە پەسەندکراوەکان:', 'Covered Sectors:')}
                              </p>
                              <p className="text-[11px] text-[#2D4833]">
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
                </div>

                {/* 5. مشاركة المنصة (Share Button - بدون إطارات مع ظل) */}
                <div className="pt-1">
                  <button
                    onClick={handleShareApp}
                    className="w-full py-2.5 px-3 bg-[#F4F9F5] hover:bg-[#E8F4EA] text-[#2D4833] font-bold rounded-2xl shadow-[0_2px_10px_rgba(37,126,184,0.06)] flex items-center justify-center gap-2 text-xs transition-all cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4 text-[#46674D]" />
                        <span className="text-[#46674D] font-black">
                          {tr(
                            'تم نسخ رابط المنصة بنجاح!',
                            'بەستەری سەکۆکە کۆپی کرا!',
                            'Platform link copied!'
                          )}
                        </span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 text-[#46674D]" />
                        <span>
                          {tr('مشاركة رابط المنصة', 'هاوبەشکردنی سەکۆ', 'Share Platform Link')}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Footer (بدون إطارات) */}
              <div className="p-3 bg-[#F4F9F5]/80 text-center text-[10px] font-bold text-[#46674D]">
                {tr(
                  `منظمة CAVE BAADRE • SMART BAADRÊ EYE © ${new Date().getFullYear()}`,
                  `ڕێکخراوی CAVE BAADRE • SMART BAADRÊ EYE © ${new Date().getFullYear()}`,
                  `CAVE BAADRE Org • SMART BAADRÊ EYE © ${new Date().getFullYear()}`
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* نافذة من نحن الموسعة (About Us Modal) */}
      <AnimatePresence>
        {isAboutModalOpen && (
          <div
            dir={dir}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#1E3725]/40 backdrop-blur-xs"
            onClick={() => setIsAboutModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg rounded-3xl bg-white shadow-[0_24px_60px_rgba(30,55,37,0.22)] overflow-hidden ${
                isRTL ? 'text-right' : 'text-left'
              }`}
            >
              <div className="p-5 bg-[#F4F9F5] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#46674D] text-white flex items-center justify-center shadow-xs">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#1E3725]">
                      {tr(
                        'من نحن — منظمة CAVE BAADRE',
                        'ئێمە کێین — ڕێکخراوی CAVE BAADRE',
                        'About Us — CAVE BAADRE Organization'
                      )}
                    </h3>
                    <p className="text-xs font-bold text-[#46674D]">
                      {tr(
                        'عين باعدرى الذكية لخدمة المجتمع',
                        'چاوی زیرەکی باعەدرێ بۆ خزمەتی کۆمەڵگە',
                        'Smart Baadre Eye for Community Service'
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAboutModalOpen(false)}
                  className="p-2 rounded-xl text-[#46674D] hover:bg-[#E8F4EA] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-4 text-sm text-[#2D4833] leading-relaxed">
                <p className="font-bold text-[#1E3725]">
                  {tr(
                    'منظمة CAVE BAADRE (عين باعدرى الذكية) هي مبادرة ومنصة مجتمعية رقمية تهدف إلى تعزيز التواصل المباشر بين مواطني ناحية باعدرى والدوائر الخدمية المعنية.',
                    'ڕێکخراوی CAVE BAADRE (چاوی زیرەکی باعەدرێ) دەستپێشخەری و سەکۆیەکی دیجیتاڵی کۆمەڵایەتییە بە ئامانجی بەهێزکردنی پەیوەندی ڕاستەوخۆ لە نێوان هاووڵاتیانی ناحیەی باعەدرێ و فەرمانگە خزمەتگوزارییە پەیوەندیدارەکان.',
                    'CAVE BAADRE (Smart Baadre Eye) is a digital community organization and platform dedicated to connecting citizens of Baadre sub-district directly with relevant municipal and service departments.'
                  )}
                </p>

                <div className="p-4 rounded-2xl bg-[#F4F9F5] space-y-2 shadow-xs">
                  <p className="text-xs font-black text-[#46674D]">
                    {tr('أهدافنا ورسالتنا:', 'ئامانج و پەیاممان:', 'Our Mission & Goals:')}
                  </p>
                  <ul className="space-y-1.5 text-xs font-bold text-[#1E3725] list-disc list-inside">
                    <li>
                      {tr(
                        'استقبال بلاغات المواطنين الموثقة بالصور وإحداثيات GPS بدقة وسهولة.',
                        'وەرگرتنی سکاڵای هاووڵاتیان بە وێنە و شوێنی GPS بە شێوەیەکی ورد و ئاسان.',
                        'Receiving citizen reports documented with photos and accurate GPS coordinates.'
                      )}
                    </li>
                    <li>
                      {tr(
                        'إحالة البلاغات رسمياً إلى الدوائر الخدمية المعنية في ناحية باعدرى ومتابعة إنجازها.',
                        'ناردنی فەرمی سکاڵاکان بۆ فەرمانگە خزمەتگوزارییە پەیوەندیدارەکان لە باعەدرێ و بەدواداچوونیان.',
                        'Officially referring reports to the relevant service departments in Baadre and tracking completion.'
                      )}
                    </li>
                    <li>
                      {tr(
                        'توثيق الأعمال المنجزة قبل وبعد المعالجة لتعزيز الشفافية وجودة الخدمات العامة.',
                        'بەڵگەنامەکردنی کارە تەواوکراوەکان پێش و دوای چارەسەرکردن بۆ بەهێزکردنی شەفافیەت.',
                        'Documenting completed works before and after resolution to promote transparency.'
                      )}
                    </li>
                  </ul>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAboutModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-[#46674D] hover:bg-[#36593F] text-white text-xs font-black cursor-pointer shadow-xs"
                  >
                    {tr('إغلاق', 'داخستن', 'Close')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
