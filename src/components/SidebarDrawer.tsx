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
  Building,
  LogIn,
  LogOut,
  KeyRound,
  ShieldAlert,
  Pencil,
  Trash2,
  Calendar,
  Lock,
  AlertTriangle,
  Settings,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { useBaadre } from '../context/BaadreContext';
import { useAuth } from '../context/AuthContext';
import { MUNICIPAL_WHATSAPP_NUMBER } from '../types/baadre';
import { AqqarAppIcon } from './AqqarAppIcon';
import { playClickSound, playSuccessSound } from '../lib/sound';

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
    contactSettings,
    updateContactSettings,
  } = useBaadre();

  const {
    currentUser,
    profile,
    isSuperAdmin,
    isAdmin,
    isLoggedIn,
    openAuthModal,
    updateAccount,
    deleteAccountWithoutData,
    logout,
  } = useAuth();
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  const [isAccountDetailsOpen, setIsAccountDetailsOpen] = useState(false);

  // Edit Account & Delete Account Modal States
  const [isEditAccountOpen, setIsEditAccountOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [editConfirmStep, setEditConfirmStep] = useState<0 | 1 | 2>(0);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<1 | 2>(1);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const openEditAccountModal = () => {
    playClickSound();
    setEditFullName(profile?.fullName || currentUser?.displayName || '');
    setEditPhone(profile?.phone || '');
    setEditBirthDate(profile?.birthDate || '1995-01-01');
    setEditNewPassword('');
    setEditConfirmStep(0);
    setEditError(null);
    setEditSuccess(null);
    setIsEditAccountOpen(true);
  };

  const openDeleteAccountModal = () => {
    playClickSound();
    setDeleteConfirmStep(1);
    setDeleteError(null);
    setIsDeleteAccountOpen(true);
  };

  // Contact Settings (Admin & Super Admin only) - الرقم ثابت 9647749019911
  const [waReportsNumberInput, setWaReportsNumberInput] = useState('9647749019911');
  const [contactPhoneInput, setContactPhoneInput] = useState('9647749019911');
  const [contactEmailInput, setContactEmailInput] = useState(contactSettings.contactEmail);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    setWaReportsNumberInput('9647749019911');
    setContactPhoneInput('9647749019911');
    setContactEmailInput(contactSettings.contactEmail);
  }, [contactSettings.contactEmail]);

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
        'ÇAVÊ BAADRÊ | عين باعذرة - منظمة RABA',
        'ÇAVÊ BAADRÊ | چاڤێ باعدرێ - ڕێکخراوی RABA',
        'ÇAVÊ BAADRÊ | Baadre Eye - RABA Organization'
      ),
      text: tr(
        'تطبيق ÇAVÊ BAADRÊ التابع لمنظمة RABA لاستقبال بلاغات المواطنين ومتابعة الخدمات في ناحية باعذرة',
        'ئەپی ÇAVÊ BAADRÊ سەربە ڕێکخراوی RABA بۆ وەرگرتنی سکاڵای هاووڵاتیان و بەدواداچوونی خزمەتگوزارییەکان لە باعەدرێ',
        'ÇAVÊ BAADRÊ app by RABA Organization for citizen reporting and municipal service tracking in Baadre'
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
              dir={dir}
              initial={{ x: language === 'en' ? '-100%' : '100%' }}
              animate={{ x: 0 }}
              exit={{ x: language === 'en' ? '-100%' : '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              className={`fixed top-0 bottom-0 ${
                language === 'en' ? 'left-0' : 'right-0'
              } w-96 sm:w-[420px] max-w-[92vw] bg-white/95 backdrop-blur-2xl z-50 flex flex-col shadow-[0_20px_70px_rgba(37,126,184,0.22)] overflow-hidden text-[#1E3725] border-0`}
            >
              {/* Header (بدون إطارات) */}
              <div
                dir={isRTL ? 'rtl' : 'ltr'}
                className="px-5 py-4 flex items-center justify-between bg-white/80 backdrop-blur-md"
              >
                <div className={`flex items-center gap-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <AqqarAppIcon size="sm" variant="clean" showText={false} />
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <span
                      dir="ltr"
                      className={`font-black text-base text-[#1E3725] tracking-wide block leading-tight ${
                        isRTL ? 'text-right' : 'text-left'
                      }`}
                    >
                      ÇAVÊ BAADRÊ
                    </span>
                    <span className="text-[10px] font-bold text-[#46674D] inline-flex items-center gap-1">
                      {isRTL ? (
                        <>
                          <bdi>{language === 'ku' ? 'چاڤێ باعه‌درێ' : 'عين باعذرة'}</bdi>
                          <span>•</span>
                          <bdi dir="ltr">Baadre Eye</bdi>
                        </>
                      ) : (
                        <>
                          <bdi dir="ltr">Baadre Eye</bdi>
                          <span>•</span>
                          <bdi>عين باعذرة</bdi>
                        </>
                      )}
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
              <div
                dir={isRTL ? 'rtl' : 'ltr'}
                className={`px-4 py-3 flex-1 overflow-y-auto space-y-4 custom-scrollbar ${
                  isRTL ? 'text-right' : 'text-left'
                }`}
              >
                {/* 0. بطاقة الحساب والمصادقة (User Account & Auth) */}
                <div
                  dir={isRTL ? 'rtl' : 'ltr'}
                  className={`rounded-2xl bg-gradient-to-tr from-[#F4F9F5] via-white to-[#E8F4EA]/60 border border-[#BBDDC6]/70 shadow-xs overflow-hidden transition-all ${
                    isRTL ? 'text-right' : 'text-left'
                  }`}
                >
                  {isLoggedIn ? (
                    <div dir={isRTL ? 'rtl' : 'ltr'}>
                      {/* رأس كارت الحساب - عند النقر يفتح تفاصيل الحساب */}
                      <button
                        type="button"
                        dir={isRTL ? 'rtl' : 'ltr'}
                        onClick={() => {
                          playClickSound();
                          setIsAccountDetailsOpen((prev) => !prev);
                        }}
                        className={`w-full p-3.5 flex items-center justify-between gap-2.5 ${
                          isRTL ? 'text-right' : 'text-left'
                        } hover:bg-[#E8F4EA]/50 transition-colors cursor-pointer`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-xs shrink-0 ${
                              isSuperAdmin
                                ? 'bg-[#1E3725]'
                                : isAdmin
                                ? 'bg-[#46674D]'
                                : 'bg-[#2D4833]'
                            }`}
                          >
                            {(profile?.fullName || currentUser?.displayName || 'U')[0].toUpperCase()}
                          </div>
                          <div className={`min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                            <p className="text-xs font-black text-[#1E3725] truncate">
                              <bdi>
                                {profile?.fullName ||
                                  currentUser?.displayName ||
                                  tr('مستخدم مسجل', 'بەکارهێنەر', 'User')}
                              </bdi>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap ${
                              isSuperAdmin
                                ? 'bg-[#E8F4EA] text-[#1E3725] border border-[#88B793]'
                                : isAdmin
                                ? 'bg-[#E8F4EA] text-[#1E3725] border border-[#88B793]'
                                : 'bg-[#F4F9F5] text-[#2D4833] border border-[#BBDDC6]'
                            }`}
                          >
                            {isSuperAdmin
                              ? tr('سوبر أدمن', 'سوپەر ئەدمین', 'Super Admin')
                              : isAdmin
                              ? tr('مسؤول', 'بەڕێوەبەر', 'Admin')
                              : tr('مواطن', 'هاووڵاتی', 'Citizen')}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-[#46674D] transition-transform duration-250 ${
                              isAccountDetailsOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </button>

                      {/* تفاصيل الحساب المنسدلة وبداخلها أزرار التعديل والحذف بتنسيق RTL صحيح ومتناسق */}
                      <AnimatePresence initial={false}>
                        {isAccountDetailsOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.24, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div
                              dir={isRTL ? 'rtl' : 'ltr'}
                              className={`px-3.5 pb-3.5 pt-2.5 border-t border-[#E8F4EA] space-y-2.5 ${
                                isRTL ? 'text-right' : 'text-left'
                              }`}
                            >
                              {/* بيانات وتفاصيل الحساب محاذاة من اليمين في RTL */}
                              <div
                                dir={isRTL ? 'rtl' : 'ltr'}
                                className={`p-3 rounded-2xl bg-white/95 border border-[#BBDDC6]/70 shadow-2xs space-y-2 text-xs font-bold ${
                                  isRTL ? 'text-right' : 'text-left'
                                }`}
                              >
                                <div className="flex items-center justify-start gap-2 pb-2 border-b border-[#E8F4EA]">
                                  <div className="w-7 h-7 rounded-lg bg-[#F4F9F5] flex items-center justify-center shrink-0">
                                    <UserIcon className="w-3.5 h-3.5 text-[#46674D]" />
                                  </div>
                                  <span className="text-[#46674D] shrink-0">
                                    {tr('الاسم:', 'ناو:', 'Name:')}
                                  </span>
                                  <span className="font-black text-[#1E3725] truncate">
                                    <bdi>{profile?.fullName || currentUser?.displayName || '—'}</bdi>
                                  </span>
                                </div>

                                <div className="flex items-center justify-start gap-2 pb-2 border-b border-[#E8F4EA]">
                                  <div className="w-7 h-7 rounded-lg bg-[#F4F9F5] flex items-center justify-center shrink-0">
                                    <Mail className="w-3.5 h-3.5 text-[#46674D]" />
                                  </div>
                                  <span className="text-[#46674D] shrink-0">
                                    {tr('البريد:', 'ئیمەیڵ:', 'Email:')}
                                  </span>
                                  <bdi
                                    dir="ltr"
                                    className="font-mono font-bold text-[#1E3725] truncate text-[11px]"
                                  >
                                    {currentUser?.email || profile?.email || '—'}
                                  </bdi>
                                </div>

                                <div
                                  className={`flex items-center justify-start gap-2 ${
                                    profile?.birthDate ? 'pb-2 border-b border-[#E8F4EA]' : ''
                                  }`}
                                >
                                  <div className="w-7 h-7 rounded-lg bg-[#F4F9F5] flex items-center justify-center shrink-0">
                                    <Phone className="w-3.5 h-3.5 text-[#46674D]" />
                                  </div>
                                  <span className="text-[#46674D] shrink-0">
                                    {tr('الهاتف:', 'مۆبایل:', 'Phone:')}
                                  </span>
                                  <bdi
                                    dir="ltr"
                                    className="font-mono font-black text-[#1E3725] text-xs tabular-nums"
                                  >
                                    {profile?.phone || '—'}
                                  </bdi>
                                </div>

                                {profile?.birthDate && (
                                  <div className="flex items-center justify-start gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-[#F4F9F5] flex items-center justify-center shrink-0">
                                      <Calendar className="w-3.5 h-3.5 text-[#46674D]" />
                                    </div>
                                    <span className="text-[#46674D] shrink-0">
                                      {tr('الميلاد:', 'لەدایکبوون:', 'Birth Date:')}
                                    </span>
                                    <bdi
                                      dir="ltr"
                                      className="font-mono font-black text-[#1E3725] text-xs tabular-nums"
                                    >
                                      {profile.birthDate}
                                    </bdi>
                                  </div>
                                )}
                              </div>

                              {/* أزرار التعديل والحذف داخل تفاصيل الحساب بترتيب RTL سليم */}
                              <div dir={isRTL ? 'rtl' : 'ltr'} className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={openEditAccountModal}
                                  className="py-2.5 px-2.5 rounded-xl bg-[#E8F4EA] hover:bg-[#D4EADB] text-[#1E3725] text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-[#46674D] shrink-0" />
                                  <span>{tr('تعديل الحساب', 'دەستکاری هەژمار', 'Edit Account')}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={openDeleteAccountModal}
                                  className="py-2.5 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/70 text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  <span>{tr('حذف الحساب', 'سڕینەوەی هەژمار', 'Delete Account')}</span>
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={async () => {
                                  playClickSound();
                                  setIsAccountDetailsOpen(false);
                                  await logout();
                                  setActiveRole('citizen');
                                }}
                                className="w-full py-2 rounded-xl bg-white/95 hover:bg-rose-50/70 text-[11px] font-black text-rose-600 hover:text-rose-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors border border-[#E8F4EA]"
                              >
                                <LogOut className="w-3.5 h-3.5 shrink-0" />
                                <span>{tr('تسجيل الخروج', 'چوونەدەرەوە', 'Sign Out')}</span>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-[#E8F4EA] text-[#46674D] flex items-center justify-center">
                          <LogIn className="w-4 h-4" />
                        </div>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <p className="text-xs font-black text-[#1E3725]">
                            {tr('حساب المواطن والإدارة', 'هەژماری هاووڵاتی و بەڕێوەبەر', 'Account & Access')}
                          </p>
                          <p className="text-[10px] font-bold text-[#46674D]">
                            {tr('تسجيل الدخول لمتابعة البلاغات', 'چوونەژوورەوە بۆ بەدواداچوون', 'Sign in to track reports')}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          openAuthModal('login');
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#46674D] text-white text-xs font-black shadow-xs hover:bg-[#36593F] transition-all cursor-pointer"
                      >
                        {tr('دخول', 'چوونەژوورەوە', 'Sign In')}
                      </button>
                    </div>
                  )}
                </div>

                {adminNotice && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold leading-relaxed flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                    <span>{adminNotice}</span>
                  </div>
                )}

                {/* 1. التبديل بين الواجهات (يظهر حصرياً للأدمن والسوبر أدمن فقط) */}
                {Boolean(currentUser && (isAdmin || isSuperAdmin)) && (
                  <div
                    dir={isRTL ? 'rtl' : 'ltr'}
                    className={`p-3.5 rounded-2xl bg-[#F4F9F5] shadow-[0_2px_12px_rgba(37,126,184,0.06)] space-y-3 ${
                      isRTL ? 'text-right' : 'text-left'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-[#46674D] text-white flex items-center justify-center shadow-xs shrink-0">
                          {activeRole === 'admin' ? (
                            <ShieldCheck className="w-4 h-4" />
                          ) : (
                            <UserIcon className="w-4 h-4" />
                          )}
                        </div>
                        <div className={`min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
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
                      <ArrowLeftRight className="w-4 h-4 text-[#46674D] shrink-0" />
                    </div>

                    {/* Segmented Buttons */}
                    <div className="grid grid-cols-2 gap-1.5 bg-[#E8F4EA]/70 p-1 rounded-xl">
                      <button
                        onClick={() => {
                          playClickSound();
                          setActiveRole('citizen');
                          setCitizenTab('works');
                          setAdminNotice(null);
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
                          setAdminNotice(null);
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
                )}

                {/* 2. لغة التطبيق (Language Selector - بدون إطارات) */}
                <div className="space-y-1.5">
                  <p className={`text-[11px] font-black text-[#46674D] px-1 ${isRTL ? 'text-right' : 'text-left'}`}>
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
                  <p className={`text-[11px] font-black text-[#46674D] px-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {tr('أقسام ومعلومات المنصة', 'بەش و زانیارییەکانی سەکۆ', 'Platform Sections')}
                  </p>

                  {/* قسم الاستبيانات (يظهر حصرياً للأدمن والسوبر أدمن فقط) */}
                  {Boolean(currentUser && (isAdmin || isSuperAdmin)) && (
                    <div className="rounded-2xl bg-[#F4F9F5] shadow-[0_2px_12px_rgba(37,126,184,0.06)] overflow-hidden transition-all">
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setIsSurveysViewOpen(true);
                          onClose();
                        }}
                        className={`w-full p-3.5 flex items-center justify-between ${
                          isRTL ? 'text-right' : 'text-left'
                        } cursor-pointer hover:bg-[#EAF4EC]/80 transition-colors`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#46674D] text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <ClipboardList className="w-4 h-4" />
                          </div>
                          <div className={isRTL ? 'text-right' : 'text-left'}>
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
                  )}

                  {/* أ) قسم من نحن (About Us) */}
                  <div className="rounded-2xl bg-[#F4F9F5] shadow-[0_2px_12px_rgba(37,126,184,0.06)] overflow-hidden transition-all">
                    <button
                      type="button"
                      onClick={() => toggleSection('about')}
                      className={`w-full p-3.5 flex items-center justify-between ${
                        isRTL ? 'text-right' : 'text-left'
                      } cursor-pointer hover:bg-[#EAF4EC]/70 transition-colors`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#E8F4EA] text-[#46674D] flex items-center justify-center shrink-0">
                          <Info className="w-4 h-4" />
                        </div>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
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
                                'تطبيق ÇAVÊ BAADRÊ (عين باعذرة) مبادرة مجتمعية رقمية تابعة لمنظمة RABA، تربط المواطنين مباشرة بالدوائر الخدمية ومسؤولي الصيانة الميدانية في ناحية باعذرة.',
                                'ئەپی ÇAVÊ BAADRÊ (چاڤێ باعدرێ) دەستپێشخەرییەکی دیجیتاڵییە سەربە ڕێکخراوی RABA، هاووڵاتیان ڕاستەوخۆ دەبەستێتەوە بە فەرمانگە خزمەتگوزارییەکان لە ناحیەی باعەدرێ.',
                                'ÇAVÊ BAADRÊ is a civic digital initiative by RABA Organization connecting citizens directly with municipal service departments in Baadre.'
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
                      className={`w-full p-3.5 flex items-center justify-between ${
                        isRTL ? 'text-right' : 'text-left'
                      } cursor-pointer hover:bg-[#EAF4EC]/70 transition-colors`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#E8F4EA] text-[#46674D] flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
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
                                'تلتزم منظمة RABA في تطبيق ÇAVÊ BAADRÊ بالحفاظ الكامل على خصوصية وسرية بيانات المواطنين وأرقام هواتفهم، وتُستخدم المعلومات فقط لمعالجة البلاغات الخدمية الميدانية في ناحية باعذرة.',
                                'ڕێکخراوی RABA لە ئەپی ÇAVÊ BAADRÊ بە تەواوی پابەندە بە پاراستنی نهێنی و تایبەتمەندی داتای هاووڵاتیان و تەنها بۆ چارەسەرکردنی سکاڵا خزمەتگوزارییەکان بەکاردەهێنرێت.',
                                'RABA Organization strictly safeguards citizen privacy in ÇAVÊ BAADRÊ. Data is used solely for civic service resolution in Baadre.'
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

                  {/* قسم إعدادات الاتصال (يظهر حصرياً للأدمن والسوبر أدمن فقط ويُحفظ في الكلاود) */}
                  {Boolean(currentUser && (isAdmin || isSuperAdmin)) && (
                    <div className="rounded-2xl bg-[#F4F9F5] shadow-[0_2px_12px_rgba(37,126,184,0.06)] overflow-hidden transition-all">
                      <button
                        type="button"
                        onClick={() => toggleSection('contact_settings')}
                        className={`w-full p-3.5 flex items-center justify-between ${
                          isRTL ? 'text-right' : 'text-left'
                        } cursor-pointer hover:bg-[#EAF4EC]/80 transition-colors`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#46674D] text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <Settings className="w-4 h-4" />
                          </div>
                          <div className={isRTL ? 'text-right' : 'text-left'}>
                            <p className="text-xs font-black text-[#1E3725]">
                              {tr('إعدادات الاتصال', 'ڕێکخستنی پەیوەندی', 'Contact Settings')}
                            </p>
                            <p className="text-[10px] text-[#46674D] font-bold">
                              {tr(
                                'رقم بلاغات المواطنين، الهاتف، والإيميل في الكلاود',
                                'ژمارەی سکاڵا، مۆبایل و ئیمەیڵ لە کڵاود',
                                'Cloud WhatsApp, phone & email settings'
                              )}
                            </p>
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-[#46674D] transition-transform duration-250 ${
                            expandedSection === 'contact_settings' ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      <AnimatePresence initial={false}>
                        {expandedSection === 'contact_settings' && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="p-3.5 pt-0 space-y-2.5">
                              {contactError && (
                                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold">
                                  {contactError}
                                </div>
                              )}
                              {contactSuccess && (
                                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                                  {contactSuccess}
                                </div>
                              )}

                              <div>
                                <label className="block text-[10px] font-black text-[#46674D] mb-1">
                                  {tr(
                                    'رقم واتساب استلام بلاغات المواطنين (ثابت)',
                                    'ژمارەی واتسئەپی وەرگرتنی سکاڵا (جێگیر)',
                                    'Citizens Reports WhatsApp Number (Fixed)'
                                  )}
                                </label>
                                <input
                                  type="tel"
                                  dir="ltr"
                                  readOnly
                                  value={waReportsNumberInput}
                                  className="w-full px-3 py-2 rounded-xl bg-[#EAF4EC] border border-[#BBDDC6] text-xs font-mono font-bold text-[#1E3725] cursor-not-allowed"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-black text-[#46674D] mb-1">
                                  {tr(
                                    'رقم الهاتف الظاهر في القائمة الجانبية (ثابت)',
                                    'ژمارەی مۆبایلی ناو لیستەکە (جێگیر)',
                                    'Sidebar Display Phone Number (Fixed)'
                                  )}
                                </label>
                                <input
                                  type="tel"
                                  dir="ltr"
                                  readOnly
                                  value={contactPhoneInput}
                                  className="w-full px-3 py-2 rounded-xl bg-[#EAF4EC] border border-[#BBDDC6] text-xs font-mono font-bold text-[#1E3725] cursor-not-allowed"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-black text-[#46674D] mb-1">
                                  {tr(
                                    'البريد الإلكتروني الظاهر في القائمة الجانبية',
                                    'ئیمەیڵی ناو لیستەکە',
                                    'Sidebar Display Email'
                                  )}
                                </label>
                                <input
                                  type="email"
                                  dir="ltr"
                                  value={contactEmailInput}
                                  onChange={(e) => setContactEmailInput(e.target.value)}
                                  placeholder="info@cavebaadre.org"
                                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#BBDDC6] text-xs font-mono font-bold text-[#1E3725] focus:outline-none focus:border-[#46674D]"
                                />
                              </div>

                              <button
                                type="button"
                                disabled={contactSaving}
                                onClick={async () => {
                                  playClickSound();
                                  setContactError(null);
                                  setContactSuccess(null);
                                  setContactSaving(true);
                                  try {
                                    await updateContactSettings({
                                      whatsappReportsNumber: '9647749019911',
                                      contactPhone: '9647749019911',
                                      contactEmail: contactEmailInput,
                                    });
                                    playSuccessSound();
                                    setContactSuccess(
                                      tr(
                                        'تم حفظ إعدادات الاتصال في الكلاود بنجاح.',
                                        'ڕێکخستنەکان لە کڵاود پاشەکەوت کران.',
                                        'Contact settings saved to cloud.'
                                      )
                                    );
                                    setTimeout(() => setContactSuccess(null), 3000);
                                  } catch (err: any) {
                                    setContactError(
                                      err?.message ||
                                        tr('فشل الحفظ.', 'پاشەکەوتکردن سەرکەوتوو نەبوو.', 'Save failed.')
                                    );
                                  } finally {
                                    setContactSaving(false);
                                  }
                                }}
                                className="w-full py-2 px-3 rounded-xl bg-[#46674D] hover:bg-[#36593F] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>
                                  {contactSaving
                                    ? tr('جاري الحفظ...', 'پاشەکەوت دەکرێت...', 'Saving...')
                                    : tr(
                                        'حفظ إعدادات الاتصال في الكلاود',
                                        'پاشەکەوتکردن لە کڵاود',
                                        'Save Settings to Cloud'
                                      )}
                                </span>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* ج) قسم تواصل معنا (Contact Us) */}
                  <div className="rounded-2xl bg-[#F4F9F5] shadow-[0_2px_12px_rgba(37,126,184,0.06)] overflow-hidden transition-all">
                    <button
                      type="button"
                      onClick={() => toggleSection('contact')}
                      className={`w-full p-3.5 flex items-center justify-between ${
                        isRTL ? 'text-right' : 'text-left'
                      } cursor-pointer hover:bg-[#EAF4EC]/70 transition-colors`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#E8F4EA] text-[#46674D] flex items-center justify-center shrink-0">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
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
                            {/* اتصال هاتفي مباشر (ثابت 9647749019911) */}
                            <a
                              href={`tel:+${MUNICIPAL_WHATSAPP_NUMBER}`}
                              className="flex items-center justify-start gap-2 p-2.5 rounded-xl bg-white hover:bg-[#E8F4EA] transition-colors text-xs font-bold text-[#1E3725] shadow-2xs"
                            >
                              <Phone className="w-3.5 h-3.5 text-[#46674D] shrink-0" />
                              <span className="text-[#46674D] shrink-0">
                                {tr('رقم الهاتف:', 'ژمارەی مۆبایل:', 'Phone:')}
                              </span>
                              <bdi className="font-mono font-black text-[#1E3725]" dir="ltr">
                                {MUNICIPAL_WHATSAPP_NUMBER}
                              </bdi>
                            </a>

                            {/* واتساب المنظمة المعتمد (ثابت 9647749019911) */}
                            <a
                              href={`https://wa.me/${MUNICIPAL_WHATSAPP_NUMBER}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-start gap-2 p-2.5 rounded-xl bg-[#E8F4EA] hover:bg-[#D4EADB] transition-colors text-xs font-black text-[#1E3725] shadow-2xs"
                            >
                              <MessageCircle className="w-4 h-4 text-[#46674D] shrink-0" />
                              <span className="text-[#46674D] shrink-0">
                                {tr('واتساب المنظمة:', 'واتسئەپی ڕێکخراو:', 'Official WhatsApp:')}
                              </span>
                              <bdi className="font-mono font-black text-[#1E3725]" dir="ltr">
                                {MUNICIPAL_WHATSAPP_NUMBER}
                              </bdi>
                            </a>

                            {/* البريد الإلكتروني */}
                            <a
                              href={`mailto:${contactSettings.contactEmail}`}
                              className="flex items-center justify-start gap-2 p-2.5 rounded-xl bg-white hover:bg-[#E8F4EA] transition-colors text-xs font-bold text-[#1E3725] shadow-2xs"
                            >
                              <Mail className="w-3.5 h-3.5 text-[#46674D] shrink-0" />
                              <span className="text-[#46674D] shrink-0">
                                {tr('الإيميل:', 'ئیمەیڵ:', 'Email:')}
                              </span>
                              <bdi className="font-mono font-black text-[#1E3725] text-[11px] truncate" dir="ltr">
                                {contactSettings.contactEmail}
                              </bdi>
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
                      className={`w-full p-3.5 flex items-center justify-between ${
                        isRTL ? 'text-right' : 'text-left'
                      } cursor-pointer hover:bg-[#EAF4EC]/70 transition-colors`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#E8F4EA] text-[#46674D] flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
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

              {/* Footer (بدون إطارات وبتنسيق BiDi سليم لا ينعكس في RTL) */}
              <div
                dir={isRTL ? 'rtl' : 'ltr'}
                className="p-3 bg-[#F4F9F5]/80 text-center text-[10px] font-bold text-[#46674D] flex items-center justify-center gap-1.5 flex-wrap"
              >
                {isRTL ? (
                  <>
                    <bdi>
                      {language === 'ku' ? 'ڕێکخراوی' : 'منظمة'} <span dir="ltr">RABA</span>
                    </bdi>
                    <span>•</span>
                    <bdi>
                      {language === 'ku' ? 'ئەپی' : 'تطبيق'} <span dir="ltr">ÇAVÊ BAADRÊ</span>
                    </bdi>
                    <bdi dir="ltr">© {new Date().getFullYear()}</bdi>
                  </>
                ) : (
                  <>
                    <bdi>RABA Organization</bdi>
                    <span>•</span>
                    <bdi>ÇAVÊ BAADRÊ App</bdi>
                    <bdi>© {new Date().getFullYear()}</bdi>
                  </>
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
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#0F263D]/50 backdrop-blur-xs"
            onClick={() => setIsAboutModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-xl max-h-[88vh] rounded-3xl bg-white shadow-[0_24px_60px_rgba(15,38,61,0.22)] border border-[#CCE3F5] overflow-hidden flex flex-col ${
                isRTL ? 'text-right' : 'text-left'
              }`}
            >
              {/* Modal Header */}
              <div className="p-5 bg-[#F4F9FD] border-b border-[#E2EEF7] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#1F4C73] text-white flex items-center justify-center shadow-xs">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#153450]">
                      {tr(
                        'من نحن — منظمة RABA وتطبيق ÇAVÊ BAADRÊ',
                        'ئێمە کێین — ڕێکخراوی RABA و ئەپی ÇAVÊ BAADRÊ',
                        'About Us — RABA Organization & ÇAVÊ BAADRÊ'
                      )}
                    </h3>
                    <p className="text-xs font-bold text-[#295B86]">
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
                  onClick={() => setIsAboutModalOpen(false)}
                  className="p-2 rounded-xl text-[#295B86] hover:bg-[#E2EEF7] transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Scrollable Content */}
              <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm text-[#1E3F66] leading-relaxed overflow-y-auto custom-scrollbar">
                {/* قسم نبذة عن منظمة RABA */}
                <div className="p-4 rounded-2xl bg-[#F4F9FD] border border-[#CCE3F5] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black text-[#153450]">
                    <Building className="w-4 h-4 text-[#256BA6]" />
                    <span>
                      {tr(
                        'نبذة عن منظمة RABA (ڕێکخراوی RABA)',
                        'دەربارەی ڕێکخراوی RABA',
                        'About RABA Organization'
                      )}
                    </span>
                  </div>
                  <p className="font-medium text-[#294B6F] text-xs leading-relaxed">
                    {tr(
                      'منظمة RABA هي منظمة مجتمعية غير حكومية تهدف إلى تمكين المجتمعات المحلية، دعم التنمية الحضرية المستدامة، وتوظيف التقنيات الذكية لتعزيز التواصل المباشر بين المواطنين والمؤسسات الخدمية لرفع مستوى جودة الحياة.',
                      'ڕێکخراوی RABA ڕێکخراوێکی کۆمەڵایەتی ناحکومییە بە مەبەستی بەهێزکردنی کۆمەڵگە، پەرەپێدانی بەردەوام، و بەکارهێنانی تەکنەلۆژیای زیرەک بۆ نزیککردنەوەی هاووڵاتیان لە دامەزراوە خزمەتگوزارییەکان.',
                      'RABA Organization is a non-governmental civic organization dedicated to community empowerment, sustainable development, and smart digital governance to enhance local living standards.'
                    )}
                  </p>
                </div>

                {/* قسم تطبيق ÇAVÊ BAADRÊ */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-black text-[#153450]">
                    {tr(
                      'تطبيق ÇAVÊ BAADRÊ (عين باعذرة / چاڤێ باعدرێ)',
                      'ئەپی ÇAVÊ BAADRÊ (چاڤێ باعدرێ)',
                      'The ÇAVÊ BAADRÊ Application'
                    )}
                  </h4>
                  <p className="font-medium text-[#294B6F] text-xs leading-relaxed">
                    {tr(
                      'تطبيق ÇAVÊ BAADRÊ هو المنصة الرقمية الميدانية المعتمدة من منظمة RABA لخدمة أهالي ناحية باعذرة (المركز، المجمعات، والقرى التابعة). يوفر التطبيق حلاً تقنياً آمناً لتوثيق المشاكل والأعطال بالصور والموقع الجغرافي، وإحالتها فورياً إلى الدوائر الخدمية المختصة ومتابعة مراحل إنجازها.',
                      'ئەپی ÇAVÊ BAADRÊ سەکۆی دیجیتاڵی فەرمی ڕێکخراوی RABAیە بۆ خزمەتکردنی هاووڵاتیانی ناحیەی باعەدرێ و کۆمەڵگە و گوندەکانی. ئەپەکە ڕێگەیەکی ئاسانە بۆ وەرگرتنی سکاڵاکان بە وێنە و GPS و ناردنی بۆ فەرمانگە پەیوەندیدارەکان و بەدواداچوونی چاککردنەوەیان.',
                      'ÇAVÊ BAADRÊ is the verified civic platform launched by RABA Organization to serve Baadre sub-district, enabling photo-documented GPS reporting, instant municipal referral, and transparent work verification.'
                    )}
                  </p>
                </div>

                {/* الأهداف والرسالة */}
                <div className="p-4 rounded-2xl bg-[#F4F9FD] space-y-2 border border-[#E2EEF7]">
                  <p className="text-xs font-black text-[#1F4C73] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#256BA6]" />
                    <span>{tr('أهداف ورسالة منظمة RABA عبر التطبيق:', 'ئامانجەکانی ڕێکخراوی RABA لە ڕێگەی ئەپەکە:', 'RABA Organization Strategic Goals:')}</span>
                  </p>
                  <ul className="space-y-2 text-xs font-medium text-[#1E3F66]">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#256BA6] mt-1.5 shrink-0" />
                      <span>{tr('تسهيل إرسال بلاغات المواطنين الموثقة بالصور وإحداثيات GPS بدقة وسرعة.', 'ئاسانکاری بۆ ناردنی سکاڵای هاووڵاتیان بە وێنە و شوێنی GPS بە شێوەیەکی ورد.', 'Facilitating citizen report submission with photos and GPS precision.')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#256BA6] mt-1.5 shrink-0" />
                      <span>{tr('الإحالة الرسمية المباشرة للدوائر (البلدية، الماء، الكهرباء، الطرق، الصرف الصحي، والنظافة).', 'ناردنی فەرمی و ڕاستەوخۆ بۆ فەرمانگەکان (شارەوانی، ئاو، کارەبا، ڕێگاوبان، ئاوەڕۆ، ژینگە).', 'Direct referral to municipal departments (Municipality, Water, Electricity, Roads, Sanitation).')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#256BA6] mt-1.5 shrink-0" />
                      <span>{tr('توثيق وأرشفة المشاريع والأعمال المنجزة بصور (قبل وبعد الإنجاز) لتعزيز الشفافية.', 'بەڵگەنامەکردنی کارە تەواوکراوەکان بە وێنەی (پێش و دوای چاککردنەوە) بۆ شەفافیەت.', 'Documenting completed works with before/after photos for civic transparency.')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#256BA6] mt-1.5 shrink-0" />
                      <span>{tr('استطلاعات الرأي المجتمعية لدراسة احتياجات وأولويات أهالي ناحية باعذرة.', 'ڕاپرسی کۆمەڵایەتی بۆ دیاریکردنی پێداویستییە لەپێشینەکانی خەڵکی باعەدرێ.', 'Community public surveys to assess service priorities in Baadre.')}</span>
                    </li>
                  </ul>
                </div>

                {/* تواصل منظمة RABA */}
                <div className="pt-2 border-t border-[#E2EEF7] flex flex-wrap items-center justify-between gap-2 text-xs text-[#295B86] font-bold">
                  <span>{tr('منظمة RABA • ناحية باعذرة', 'ڕێکخراوی RABA • ناحیەی باعەدرێ', 'RABA Organization • Baadre District')}</span>
                  <span dir="ltr" className="font-mono text-[#153450]">9647749019911</span>
                </div>

                {/* زر الإغلاق */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAboutModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl bg-[#1F4C73] hover:bg-[#163854] text-white text-xs font-black cursor-pointer shadow-xs transition-colors"
                  >
                    {tr('إغلاق', 'داخستن', 'Close')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* نافذة تعديل الحساب مع تأكيدات قوية */}
      <AnimatePresence>
        {isEditAccountOpen && (
          <div
            dir={dir}
            className="fixed inset-0 z-[140] flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditAccountOpen(false)}
              className="fixed inset-0 bg-[#1E3725]/55 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className={`relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#BBDDC6] p-5 sm:p-6 z-10 space-y-4 ${
                isRTL ? 'text-right' : 'text-left'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E8F4EA]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#E8F4EA] text-[#46674D] flex items-center justify-center">
                    <Pencil className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-[#1E3725]">
                      {editConfirmStep === 1
                        ? tr('تأكيد تعديل الحساب', 'پشتڕاستکردنەوەی دەستکاری هەژمار', 'Confirm Account Edit')
                        : editConfirmStep === 2
                        ? tr('حفظ التعديلات', 'پاشەکەوتکردنی گۆڕانکارییەکان', 'Save Changes')
                        : tr('تعديل بيانات الحساب', 'دەستکاری زانیاری هەژمار', 'Edit Account Details')}
                    </h3>
                    <p className="text-[11px] font-bold text-[#46674D]" dir="ltr">
                      {currentUser?.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditAccountOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-[#1E3725] hover:bg-[#E8F4EA] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {editError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {editSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{editSuccess}</span>
                </div>
              )}

              {editConfirmStep === 0 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#46674D] mb-1">
                      {tr('الاسم الثلاثي الكامل', 'ناوی سیانی تەواو', 'Full Name')} *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                        className={`w-full bg-[#F4F9F5] border border-[#BBDDC6] focus:border-[#46674D] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] focus:outline-none ${
                          isRTL ? 'pr-9 text-right' : 'pl-9 text-left'
                        }`}
                      />
                      <UserIcon
                        className={`w-4 h-4 text-[#46674D] absolute ${
                          isRTL ? 'right-3' : 'left-3'
                        } top-3 pointer-events-none`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#46674D] mb-1">
                      {tr('رقم الموبايل', 'ژمارەی مۆبایل', 'Mobile Phone')} *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        dir="ltr"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className={`w-full bg-[#F4F9F5] border border-[#BBDDC6] focus:border-[#46674D] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-[#1E3725] focus:outline-none ${
                          isRTL ? 'pr-9 text-right' : 'pl-9 text-left'
                        }`}
                      />
                      <Phone
                        className={`w-4 h-4 text-[#46674D] absolute ${
                          isRTL ? 'right-3' : 'left-3'
                        } top-3 pointer-events-none`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#46674D] mb-1">
                      {tr('تاريخ الميلاد', 'بەرواری لەدایکبوون', 'Date of Birth')} *
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        dir="ltr"
                        value={editBirthDate}
                        onChange={(e) => setEditBirthDate(e.target.value)}
                        className={`w-full bg-[#F4F9F5] border border-[#BBDDC6] focus:border-[#46674D] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] focus:outline-none ${
                          isRTL ? 'pr-9 text-right' : 'pl-9 text-left'
                        }`}
                      />
                      <Calendar
                        className={`w-4 h-4 text-[#46674D] absolute ${
                          isRTL ? 'right-3' : 'left-3'
                        } top-3 pointer-events-none`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#46674D] mb-1">
                      {tr('كلمة مرور جديدة (اختياري)', 'وشەی تێپەڕی نوێ (ئارەزوومەندانە)', 'New Password (Optional)')}
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        dir="ltr"
                        value={editNewPassword}
                        onChange={(e) => setEditNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full bg-[#F4F9F5] border border-[#BBDDC6] focus:border-[#46674D] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] focus:outline-none ${
                          isRTL ? 'pr-9 text-right' : 'pl-9 text-left'
                        }`}
                      />
                      <Lock
                        className={`w-4 h-4 text-[#46674D] absolute ${
                          isRTL ? 'right-3' : 'left-3'
                        } top-3 pointer-events-none`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditAccountOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-[#F4F9F5] text-[#2D4833] text-xs font-bold hover:bg-[#E8F4EA] transition-colors cursor-pointer"
                    >
                      {tr('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setEditError(null);
                        if (editFullName.trim().split(/\s+/).length < 3) {
                          setEditError(tr('يرجى كتابة الاسم الثلاثي.', 'تکایە ناوی سیانی بنووسە.', 'Enter full 3-part name.'));
                          return;
                        }
                        if (!editPhone.trim() || editPhone.replace(/[\s-]/g, '').length < 10) {
                          setEditError(tr('رقم الهاتف غير صالح.', 'ژمارەی مۆبایل نادروستە.', 'Invalid phone.'));
                          return;
                        }
                        if (!editBirthDate) {
                          setEditError(tr('تاريخ الميلاد مطلوب.', 'بەرواری لەدایکبوون پێویستە.', 'Birth date required.'));
                          return;
                        }
                        if (editNewPassword.trim() && editNewPassword.trim().length < 6) {
                          setEditError(tr('كلمة المرور 6 أحرف على الأقل.', 'وشەی تێپەڕ لانیکەم ٦ پیت بێت.', 'Min 6 chars.'));
                          return;
                        }
                        setEditConfirmStep(1);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#46674D] hover:bg-[#36593F] text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{tr('حفظ التعديلات', 'پاشەکەوتکردنی گۆڕانکاری', 'Save Changes')}</span>
                    </button>
                  </div>
                </div>
              )}

              {editConfirmStep === 1 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1.5">
                    <p className="text-xs font-black">
                      {tr(
                        'هل ترغب في تحديث بيانات حسابك؟',
                        'ئایا دڵنیایت لە نوێکردنەوەی هەژمارەکەت؟',
                        'Do you want to update your account?'
                      )}
                    </p>
                    <p className="text-[11px] font-bold text-amber-800">
                      {editFullName.trim()} • {editPhone.trim()}
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditConfirmStep(0)}
                      className="px-4 py-2.5 rounded-xl bg-[#F4F9F5] text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      {tr('تراجع', 'گەڕانەوە', 'Back')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setEditConfirmStep(2);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black cursor-pointer"
                    >
                      {tr('نعم، متابعة', 'بەڵێ، بەردەوامبە', 'Proceed')}
                    </button>
                  </div>
                </div>
              )}

              {editConfirmStep === 2 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#E8F4EA] border-2 border-[#46674D] text-[#1E3725] space-y-1.5">
                    <p className="text-xs font-black">
                      {tr(
                        'اضغط لاعتماد وحفظ تعديلات الحساب الآن.',
                        'پەسەندکردن و پاشەکەوتکردن.',
                        'Confirm saving changes now.'
                      )}
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={editSubmitting}
                      onClick={() => setEditConfirmStep(0)}
                      className="px-4 py-2.5 rounded-xl bg-[#F4F9F5] text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      {tr('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
                    </button>
                    <button
                      type="button"
                      disabled={editSubmitting}
                      onClick={async () => {
                        setEditSubmitting(true);
                        setEditError(null);
                        try {
                          await updateAccount({
                            fullName: editFullName,
                            phone: editPhone,
                            birthDate: editBirthDate,
                            newPassword: editNewPassword.trim() || undefined,
                          });
                          playSuccessSound();
                          setEditSuccess(tr('تم تحديث الحساب بنجاح.', 'هەژمارەکە نوێکرایەوە.', 'Account updated.'));
                          setTimeout(() => {
                            setIsEditAccountOpen(false);
                          }, 900);
                        } catch (err: any) {
                          setEditError(err?.message || tr('فشل تحديث الحساب.', 'نوێکردنەوە سەرکەوتوو نەبوو.', 'Update failed.'));
                          setEditConfirmStep(0);
                        } finally {
                          setEditSubmitting(false);
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#46674D] hover:bg-[#36593F] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {editSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>{tr('تأكيد وحفظ', 'پشتڕاستکردنەوە و پاشەکەوتکردن', 'Confirm & Save')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* نافذة حذف الحساب دون حذف البيانات مع تأكيدات قوية على مرحلتين */}
      <AnimatePresence>
        {isDeleteAccountOpen && (
          <div
            dir={dir}
            className="fixed inset-0 z-[140] flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteAccountOpen(false)}
              className="fixed inset-0 bg-[#1E3725]/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className={`relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-rose-200 p-5 sm:p-6 z-10 space-y-4 ${
                isRTL ? 'text-right' : 'text-left'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-rose-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-rose-900">
                      {tr('حذف الحساب', 'سڕینەوەی هەژمار', 'Delete Account')}
                    </h3>
                    <p className="text-[11px] font-bold text-rose-600">
                      {tr('حذف الحساب الشخصي دون حذف البيانات', 'سڕینەوەی هەژمار بەبێ سڕینەوەی داتاکان', 'Delete account while keeping data')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDeleteAccountOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {deleteError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              {deleteConfirmStep === 1 ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
                    <p className="text-xs font-black">
                      {tr(
                        'هل أنت متأكد من رغبتك في حذف حسابك؟',
                        'ئایا دڵنیایت لە سڕینەوەی هەژمارەکەت؟',
                        'Are you sure you want to delete your account?'
                      )}
                    </p>
                    <p className="text-[11px] font-bold text-amber-900 leading-relaxed">
                      {tr(
                        'سيتم حذف حساب دخولك وبياناتك الشخصية فقط، بينما ستبقى البلاغات والأعمال الخدمية المرسلة محفوظة دون حذف.',
                        'تەنها هەژماری چوونەژوورەوەت دەسڕدرێتەوە، بەڵام سکاڵا و داتا خزمەتگوزارییەکان پارێزراو دەبن و ناسڕدرێنەوە.',
                        'Only your login account will be removed; all submitted civic reports and service records will remain preserved.'
                      )}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsDeleteAccountOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-[#F4F9F5] text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      {tr('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setDeleteConfirmStep(2);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black cursor-pointer"
                    >
                      {tr('نعم، متابعة', 'بەڵێ، بەردەوامبە', 'Proceed')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-400 text-rose-950 space-y-2">
                    <p className="text-xs font-black">
                      {tr(
                        'سيتم الآن حذف الحساب فوراً مع بقاء البلاغات والبيانات محفوظة.',
                        'ئێستا هەژمارەکە دەسڕدرێتەوە و سکاڵاکان دەمێننەوە.',
                        'Your account will now be deleted while keeping all reports and data.'
                      )}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={deleteSubmitting}
                      onClick={() => setDeleteConfirmStep(1)}
                      className="px-4 py-2.5 rounded-xl bg-[#F4F9F5] text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      {tr('تراجع', 'گەڕانەوە', 'Back')}
                    </button>
                    <button
                      type="button"
                      disabled={deleteSubmitting}
                      onClick={async () => {
                        setDeleteSubmitting(true);
                        setDeleteError(null);
                        try {
                          await deleteAccountWithoutData();
                          playSuccessSound();
                          setActiveRole('citizen');
                          setIsDeleteAccountOpen(false);
                          onClose();
                        } catch {
                          setDeleteError(tr('تعذر حذف الحساب.', 'سڕینەوەی هەژمار سەرکەوتوو نەبوو.', 'Failed to delete account.'));
                        } finally {
                          setDeleteSubmitting(false);
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {deleteSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span>{tr('تأكيد حذف الحساب', 'سڕینەوەی هەژمار', 'Confirm Delete Account')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
