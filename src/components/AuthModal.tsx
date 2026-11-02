import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  Calendar,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Check,
  ArrowRight,
  Info,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { auth } from '../lib/firebase';
import { authService } from '../services/authService';
import { playClickSound, playSuccessSound } from '../lib/sound';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalMode,
    setAuthModalMode,
    login,
    register,
    isLoading,
  } = useAuth();
  const { language, dir, isRTL } = useLanguage();

  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [requiresSecretCode, setRequiresSecretCode] = useState(false);
  const [resetLinkSent, setResetLinkSent] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const toShortError = (err: any, fallbackAr: string, fallbackKu: string, fallbackEn: string): string => {
    const raw = String(err?.code || err?.message || '').toLowerCase();
    if (
      raw.includes('invalid-credential') ||
      raw.includes('wrong-password') ||
      raw.includes('user-not-found') ||
      raw.includes('invalid-login')
    ) {
      return tr('بيانات الدخول غير صحيحة.', 'زانیاری چوونەژوورەوە هەڵەیە.', 'Invalid credentials.');
    }
    if (raw.includes('email-already-in-use')) {
      return tr('البريد مسجل مسبقاً.', 'ئیمەیڵەکە پێشتر تۆمارکراوە.', 'Email already registered.');
    }
    if (raw.includes('weak-password')) {
      return tr('كلمة المرور ضعيفة.', 'وشەی تێپەڕ لاوازە.', 'Weak password.');
    }
    if (raw.includes('invalid-email')) {
      return tr('البريد غير صالح.', 'ئیمەیڵ نادروستە.', 'Invalid email.');
    }
    if (raw.includes('too-many-requests') || raw.includes('3 مرات')) {
      return tr('تجاوزت الحد المسموح (3 مرات بالساعة).', 'سنووری ڕێگەپێدراوت تێپەڕاند (٣ جار لە کاتژمێرێکدا).', 'Rate limit exceeded (3 per hour).');
    }
    if (raw.includes('network')) {
      return tr('خطأ في الاتصال.', 'هەڵەی پەیوەندی.', 'Connection error.');
    }
    if (
      raw.includes('doctype') ||
      raw.includes('unexpected token') ||
      raw.includes('is not valid json') ||
      raw.includes('json') ||
      raw.includes('<html') ||
      raw.includes('<!')
    ) {
      return tr(
        'خطأ في الاتصال، يرجى المحاولة مرة أخرى.',
        'هەڵەی پەیوەندی ڕوویدا، تکایە دووبارە هەوڵبدەرەوە.',
        'Connection error, please try again.'
      );
    }
    if (
      raw.includes('firebase') ||
      raw.includes('firestore') ||
      raw.includes('auth/') ||
      raw.includes('authentication')
    ) {
      return tr(fallbackAr, fallbackKu, fallbackEn);
    }
    const cleanMsg = String(err?.message || '').trim();
    if (cleanMsg && cleanMsg.length <= 55 && !cleanMsg.includes('<') && !cleanMsg.includes('JSON')) {
      return cleanMsg;
    }
    return tr(fallbackAr, fallbackKu, fallbackEn);
  };

  const resetForm = (clearResetSent = false) => {
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    setBirthDate('');
    setRecoveryCode('');
    setRequiresSecretCode(false);
    setFormError(null);
    if (clearResetSent) {
      setResetLinkSent(false);
      setFormSuccess(null);
    }
  };

  const handleClose = () => {
    playClickSound();
    setPassword('');
    setRecoveryCode('');
    setRequiresSecretCode(false);
    setFormError(null);
    closeAuthModal();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);
    try {
      await login(email, password);
      playSuccessSound();
      resetForm(true);
    } catch (err: any) {
      setFormError(
        toShortError(err, 'بيانات الدخول غير صحيحة.', 'چوونەژوورەوە سەرکەوتوو نەبوو.', 'Invalid credentials.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    try {
      await register({
        fullName,
        email,
        password,
        phone,
        birthDate,
      });
      playSuccessSound();
      resetForm(true);
    } catch (err: any) {
      setFormError(
        toShortError(err, 'تعذر إنشاء الحساب.', 'دروستکردنی هەژمار سەرکەوتوو نەبوو.', 'Registration failed.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    try {
      if (!requiresSecretCode) {
        const res = await authService.requestCitizenPasswordReset(email);

        if (res.requiresSuperAdminSecret || res.requiresAdminRecoveryCode) {
          setRequiresSecretCode(true);
          setFormError(
            tr(
              'يرجى إدخال الرمز السري.',
              'تکایە کۆدی نهێنی بنووسە.',
              'Please enter the secret code.'
            )
          );
          return;
        }

        playSuccessSound();
        setResetLinkSent(true);
        setFormSuccess(
          tr(
            'تم إرسال رابط آمن لإعادة تعيين كلمة المرور إلى بريدك.',
            'بەستەرێکی پارێزراو بۆ نوێکردنەوەی وشەی تێپەڕ بۆ ئیمەیڵەکەت نێردرا.',
            'A secure password reset link has been sent to your email.'
          )
        );
      } else {
        if (!recoveryCode.trim()) {
          setFormError(
            tr(
              'يرجى إدخال الرمز السري.',
              'تکایە کۆدی نهێنی بنووسە.',
              'Please enter the secret code.'
            )
          );
          return;
        }

        await authService.verifyAdminRecoveryCode(email, recoveryCode);
        playSuccessSound();
        setRequiresSecretCode(false);
        setResetLinkSent(true);
        setFormSuccess(
          tr(
            'تم إرسال رابط آمن لإعادة تعيين كلمة المرور إلى بريدك.',
            'بەستەرێکی پارێزراو بۆ نوێکردنەوەی وشەی تێپەڕ بۆ ئیمەیڵەکەت نێردرا.',
            'A secure password reset link has been sent to your email.'
          )
        );
      }
    } catch (err: any) {
      setFormError(
        toShortError(err, 'تعذر إرسال الرابط.', 'ناردنی بەستەر سەرکەوتوو نەبوو.', 'Request failed.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-[200] bg-[#1E3725]/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white shadow-[0_24px_70px_rgba(30,55,37,0.25)] border border-[#BBDDC6]/70 overflow-hidden my-6 transition-all"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-b from-[#F4F9F5] to-white border-b border-[#E8F4EA] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#E8F4EA] text-[#46674D] flex items-center justify-center shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#1E3725]">
                {authModalMode === 'login'
                  ? tr('تسجيل الدخول', 'چوونەژوورەوە', 'Sign In')
                  : authModalMode === 'register'
                  ? tr('تسجيل حساب مواطن جديد', 'تۆمارکردنی هەژماری نوێ', 'Register Citizen Account')
                  : tr('استرداد كلمة المرور', 'گەڕاندنەوەی وشەی تێپەڕ', 'Password Recovery')}
              </h3>
              <p className="text-[11px] font-bold text-[#46674D]">
                {tr(
                  'منظومة ÇAVÊ BAADRÊ • منظمة RABA',
                  'سیستەمی ÇAVÊ BAADRÊ • ڕێکخراوی RABA',
                  'ÇAVÊ BAADRÊ Platform • RABA Organization'
                )}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-[#1E3725] hover:bg-[#E8F4EA] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3">
          <div className="grid grid-cols-3 gap-1 bg-[#F4F9F5] p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setAuthModalMode('login');
                setRequiresSecretCode(false);
                setResetLinkSent(false);
                setFormError(null);
                setFormSuccess(null);
              }}
              className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                authModalMode === 'login'
                  ? 'bg-[#46674D] text-white shadow-xs'
                  : 'text-[#2D4833] hover:bg-white/60'
              }`}
            >
              {tr('دخول', 'چوونەژوورەوە', 'Sign In')}
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setAuthModalMode('register');
                setRequiresSecretCode(false);
                setResetLinkSent(false);
                setFormError(null);
                setFormSuccess(null);
              }}
              className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                authModalMode === 'register'
                  ? 'bg-[#46674D] text-white shadow-xs'
                  : 'text-[#2D4833] hover:bg-white/60'
              }`}
            >
              {tr('حساب جديد', 'تۆمارکردن', 'Register')}
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setAuthModalMode('recovery');
                setRequiresSecretCode(false);
                setFormError(null);
              }}
              className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                authModalMode === 'recovery'
                  ? 'bg-[#46674D] text-white shadow-xs'
                  : 'text-[#2D4833] hover:bg-white/60'
              }`}
            >
              {tr('نسيت كلمة السر', 'وشەی تێپەڕ', 'Recovery')}
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Alerts */}
          {formError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed flex-1">{formError}</div>
            </div>
          )}

          {formSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-start gap-2.5">
              <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div className="leading-relaxed flex-1">{formSuccess}</div>
            </div>
          )}

          {/* 1. LOGIN FORM */}
          {authModalMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-[#46674D] mb-1">
                  {tr('البريد الإلكتروني', 'ئیمەیڵ', 'Email Address')} *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-[#F4F9F5] border border-[#BBDDC6] focus:border-[#46674D] rounded-xl px-3.5 py-2.5 text-xs font-medium text-[#1E3725] focus:outline-none transition-colors pr-9 text-left"
                  />
                  <Mail className="w-4 h-4 text-[#46674D] absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-[#46674D]">
                    {tr('كلمة المرور', 'وشەی تێپەڕ', 'Password')} *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setRequiresSecretCode(false);
                      setFormError(null);
                      setFormSuccess(null);
                      setAuthModalMode('recovery');
                    }}
                    className="text-[11px] font-bold text-[#46674D] hover:underline cursor-pointer"
                  >
                    {tr('نسيت كلمة المرور؟', 'وشەی تێپەڕت لەبیرچووە؟', 'Forgot Password?')}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#F4F9F5] border border-[#BBDDC6] focus:border-[#46674D] rounded-xl px-3.5 py-2.5 text-xs font-medium text-[#1E3725] focus:outline-none transition-colors pr-9 text-left"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="w-5 h-5 text-[#46674D] absolute right-2.5 top-2.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || isLoading}
                className="w-full py-3 rounded-xl bg-[#46674D] hover:bg-[#36593F] text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>{tr('تسجيل الدخول', 'چوونەژوورەوە', 'Sign In')}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* 2. REGISTRATION FORM (CITIZEN) */}
          {authModalMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold text-[#46674D] mb-1">
                  {tr('الاسم الثلاثي كاملاً', 'ناوی سیانی بە تەواوی', 'Full Name (3 words min)')} *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={tr('مثال: أحمد محمد علي', 'نموونە: ئەحمەد محەمەد عەلی', 'e.g. John David Smith')}
                    className="w-full bg-[#F4F9F5] border border-[#BBDDC6] focus:border-[#46674D] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] focus:outline-none transition-colors pr-9"
                  />
                  <UserIcon className="w-4 h-4 text-[#46674D] absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[11px] font-bold text-[#46674D] mb-1">
                  {tr('البريد الإلكتروني', 'ئیمەیڵ', 'Email Address')} *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="citizen@baadre.org"
                    className="w-full bg-[#F4F9F5] border border-[#BBDDC6] focus:border-[#46674D] rounded-xl px-3.5 py-2.5 text-xs font-medium text-[#1E3725] focus:outline-none transition-colors pr-9 text-left"
                  />
                  <Mail className="w-4 h-4 text-[#46674D] absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-bold text-[#46674D] mb-1">
                  {tr('كلمة المرور (6 خانات على الأقل)', 'وشەی تێپەڕ (لانیکەم ٦ پیت)', 'Password (min 6 chars)')} *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    dir="ltr"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#F4F9F5] border border-[#BBDDC6] focus:border-[#46674D] rounded-xl px-3.5 py-2.5 text-xs font-medium text-[#1E3725] focus:outline-none transition-colors pr-9 text-left"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="w-5 h-5 text-[#46674D] absolute right-2.5 top-2.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Mobile Phone */}
              <div>
                <label className="block text-[11px] font-bold text-[#46674D] mb-1">
                  {tr('رقم الموبايل', 'ژمارەی مۆبایل', 'Mobile Phone')} *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0750XXXXXXX"
                    className="w-full bg-[#F4F9F5] border border-[#BBDDC6] focus:border-[#46674D] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-[#1E3725] focus:outline-none transition-colors pr-9 text-left"
                  />
                  <Phone className="w-4 h-4 text-[#46674D] absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-[11px] font-bold text-[#46674D] mb-1">
                  {tr('تاريخ الميلاد', 'بەرواری لەدایکبوون', 'Date of Birth')} *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    dir="ltr"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full bg-[#F4F9F5] border border-[#BBDDC6] focus:border-[#46674D] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] focus:outline-none transition-colors pr-9"
                  />
                  <Calendar className="w-4 h-4 text-[#46674D] absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || isLoading}
                className="w-full py-3 rounded-xl bg-[#46674D] hover:bg-[#36593F] text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{tr('إنشاء الحساب والمتابعة', 'تۆمارکردن و بەردەوامبوون', 'Create Citizen Account')}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* 3. UNIFIED PASSWORD RECOVERY (SINGLE PLACE FOR ALL ACCOUNTS WITHOUT EXPLANATIONS) */}
          {authModalMode === 'recovery' && !resetLinkSent && (
            <form onSubmit={handleRecoverySubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-[#46674D] mb-1">
                  {tr('البريد الإلكتروني', 'ئیمەیڵ', 'Email Address')} *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    dir="ltr"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (requiresSecretCode) {
                        setRequiresSecretCode(false);
                        setRecoveryCode('');
                        setFormError(null);
                      }
                    }}
                    placeholder="name@example.com"
                    className="w-full bg-[#F4F9F5] border border-[#BBDDC6] focus:border-[#46674D] rounded-xl px-3.5 py-2.5 text-xs font-medium text-[#1E3725] focus:outline-none transition-colors pr-9 text-left"
                  />
                  <Mail className="w-4 h-4 text-[#46674D] absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {requiresSecretCode && (
                <div>
                  <label className="block text-[11px] font-bold text-[#46674D] mb-1">
                    {tr('الرمز السري', 'کۆدی نهێنی', 'Secret Code')} *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      dir="ltr"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      placeholder="RC-XXXX-XXXX-XXXX-XXXX"
                      className="w-full bg-[#F4F9F5] border border-[#BBDDC6] focus:border-[#46674D] rounded-xl px-3.5 py-2.5 text-xs font-mono font-black text-[#1E3725] focus:outline-none transition-colors pr-9 text-left tracking-wider"
                    />
                    <KeyRound className="w-4 h-4 text-[#46674D] absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-[#46674D] hover:bg-[#36593F] text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    <span>
                      {requiresSecretCode
                        ? tr('تأكيد الرمز وإرسال الرابط', 'پشتڕاستکردنەوەی کۆد و ناردنی بەستەر', 'Verify Code & Send Link')
                        : tr('إرسال رابط إعادة التعيين', 'ناردنی بەستەری نوێکردنەوە', 'Send Reset Link')}
                    </span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
