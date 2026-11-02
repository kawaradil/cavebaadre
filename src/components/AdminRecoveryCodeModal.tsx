import React, { useState } from 'react';
import {
  X,
  KeyRound,
  ShieldCheck,
  Lock,
  Copy,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { AdminCitizenDTO } from '../types/dto';
import { playClickSound, playSuccessSound } from '../lib/sound';

interface AdminRecoveryCodeModalProps {
  adminCitizen: AdminCitizenDTO;
  isOpen: boolean;
  onClose: () => void;
}

export const AdminRecoveryCodeModal: React.FC<AdminRecoveryCodeModalProps> = ({
  adminCitizen,
  isOpen,
  onClose,
}) => {
  const { language, dir } = useLanguage();
  const { currentUser, isSuperAdmin } = useAuth();

  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

  const [passwordVerification, setPasswordVerification] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [revealedCode, setRevealedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Enforce server constraint: Never reveal another Super Admin's code
  const isTargetAnotherSuperAdmin =
    adminCitizen.role === 'super_admin' && currentUser?.uid !== adminCitizen.uid;

  const handleReveal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isSuperAdmin) return;

    if (isTargetAnotherSuperAdmin) {
      setError(
        tr(
          'قيد أمني مشدد: لا يُسمح لأي سوبر أدمن بكشف رمز استرداد سوبر أدمن آخر.',
          'ڕێگریی ئەمنی: ڕێگەپێدراو نییە کۆدی گەڕاندنەوەی سوپەر ئەدمینێکی تر دەرکەوێت.',
          'Mandatory security rule: You cannot reveal the recovery code of another Super Admin.'
        )
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Re-verify Super Admin identity with their own password
      await authService.login(currentUser.email || '', passwordVerification);

      // Call protected API / Cloud Function to decrypt code
      const result = await authService.revealAdminRecoveryCode(currentUser, adminCitizen.uid);
      playSuccessSound();
      setRevealedCode(result.recoveryCode);
    } catch (err: any) {
      setError(
        err.message ||
          tr('كلمة المرور غير صحيحة أو فشل كشف الرمز.', 'وشەی تێپەڕ هەڵەیە.', 'Authentication failed.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!revealedCode) return;
    navigator.clipboard.writeText(revealedCode);
    setCopied(true);
    playClickSound();
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      dir={dir}
      onClick={onClose}
      className="fixed inset-0 z-[170] bg-[#1E3725]/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white shadow-[0_24px_70px_rgba(30,55,37,0.22)] border border-[#BBDDC6]/70 p-6 space-y-4 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8F4EA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F4EA] text-[#46674D] flex items-center justify-center shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#1E3725]">
                {tr('كشف رمز استرداد المسؤول', 'بینینی کۆدی گەڕاندنەوەی بەڕێوەبەر', 'Reveal Admin Recovery Code')}
              </h3>
              <p className="text-[11px] font-bold text-[#46674D] truncate max-w-[200px]">
                {adminCitizen.fullName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-[#1E3725] hover:bg-[#E8F4EA] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold leading-relaxed flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {isTargetAnotherSuperAdmin ? (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-300 text-slate-700 text-center space-y-2">
            <Lock className="w-6 h-6 text-slate-500 mx-auto" />
            <p className="text-xs font-black text-[#1E3725]">
              {tr(
                'رمز استرداد سوبر أدمن محمي',
                'کۆدی سوپەر ئەدمین پارێزراوە',
                'Super Admin Recovery Code Protected'
              )}
            </p>
            <p className="text-[11px] font-bold text-slate-600 leading-relaxed">
              {tr(
                'لا يُسمح لأي سوبر أدمن بكشف أو تغيير رمز استرداد سوبر أدمن آخر وفق البروتوكول الأمني الخادم.',
                'هیچ سوپەر ئەدمینێک ناتوانێت کۆدی گەڕاندنەوەی سوپەر ئەدمینێکی تر ببینێت.',
                'Server security policy prevents revealing another Super Admin recovery code.'
              )}
            </p>
          </div>
        ) : revealedCode ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#F4F9F5] border-2 border-[#88B793] space-y-2.5">
              <span className="text-[11px] font-bold text-[#46674D] block">
                {tr(
                  'رمز الاسترداد الثابت المشفر:',
                  'کۆدی نەگۆڕی گەڕاندنەوە:',
                  'Decrypted Recovery Code:'
                )}
              </span>
              <div
                className="p-3.5 rounded-xl bg-white border border-[#BBDDC6] font-mono text-center text-base font-black text-[#1E3725] tracking-widest select-all"
                dir="ltr"
              >
                {revealedCode}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
              {tr(
                'ملاحظة أمنية: تم تسجيل هذه العملية رسمياً في سجل التدقيق (Audit Log) مع توثيق هوية السوبر أدمن ووقت كشف الرمز.',
                'ئاگاداری: ئەم کردارە لە تۆماری چاودێری (Audit Log) تۆمارکرا.',
                'Audit notice: This reveal action has been officially recorded in the Audit Log.'
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 py-2.5 rounded-xl bg-[#46674D] hover:bg-[#36593F] text-white text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? tr('تم النسخ', 'کۆپیکرا', 'Copied') : tr('نسخ الرمز', 'کۆپیکردنی کۆد', 'Copy Code')}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                {tr('إغلاق', 'داخستن', 'Close')}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReveal} className="space-y-3.5">
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed flex items-start gap-2">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                {tr(
                  'لأسباب أمنية مشددة، يرجى إعادة إدخال كلمة مرور حسابك (السوبر أدمن) لتأكيد هويتك قبل فك تشفير وعرض رمز الاسترداد.',
                  'تکایە وشەی تێپەڕی خۆت داخڵ بکەوە بۆ پشتڕاستکردنەوە.',
                  'For high security, re-enter your Super Admin password to confirm identity before decrypting the recovery code.'
                )}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#46674D] mb-1">
                {tr('كلمة مرور السوبر أدمن الحالية', 'وشەی تێپەڕی ئێستات', 'Your Current Password')} *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  dir="ltr"
                  value={passwordVerification}
                  onChange={(e) => setPasswordVerification(e.target.value)}
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

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                {tr('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting || !passwordVerification}
                className="px-5 py-2.5 rounded-xl bg-[#46674D] hover:bg-[#36593F] text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-40"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>{tr('تأكيد وفك تشفير الرمز', 'پشتڕاستکردنەوە و بینین', 'Confirm & Reveal')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
