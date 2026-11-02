import React, { useState } from 'react';
import {
  X,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
  Check,
  AlertTriangle,
  Lock,
  ArrowRightLeft,
  Key,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { AdminCitizenDTO } from '../types/dto';
import { UserRole } from '../types/auth';
import { playClickSound, playSuccessSound } from '../lib/sound';

interface RoleManagementModalProps {
  citizen: AdminCitizenDTO;
  isOpen: boolean;
  onClose: () => void;
  onRoleUpdated: (newRole: UserRole, targetUid: string) => void;
  onOpenRevealCode?: (citizen: AdminCitizenDTO) => void;
  initialTargetRole?: UserRole;
  startWithConfirmation?: boolean;
}

export const RoleManagementModal: React.FC<RoleManagementModalProps> = ({
  citizen,
  isOpen,
  onClose,
  onRoleUpdated,
  onOpenRevealCode,
  initialTargetRole,
  startWithConfirmation = false,
}) => {
  const { language, dir } = useLanguage();
  const { currentUser, isSuperAdmin } = useAuth();

  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

  const [selectedRole, setSelectedRole] = useState<UserRole>(
    initialTargetRole || citizen.role
  );
  const [confirmationStep, setConfirmationStep] = useState<0 | 1 | 2>(
    startWithConfirmation && (initialTargetRole || 'admin') !== citizen.role ? 1 : 0
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  // Check if target is another Super Admin
  const isTargetAnotherSuperAdmin =
    citizen.role === 'super_admin' && currentUser?.uid !== citizen.uid;

  const getRoleLabel = (r: UserRole) =>
    r === 'super_admin'
      ? tr('سوبر أدمن (Super Admin)', 'سوپەر ئەدمین', 'Super Admin')
      : r === 'admin'
      ? tr('مسؤول المنظمة (Admin)', 'بەڕێوەبەر (Admin)', 'Organization Admin')
      : tr('مواطن (Citizen)', 'هاووڵاتی', 'Citizen');

  const handleProceedToConfirmStep = () => {
    playClickSound();
    if (!currentUser || !isSuperAdmin) {
      setError(
        tr(
          'منح صلاحية الأدمن وتغيير الأدوار محصور بحساب السوبر أدمن فقط.',
          'تەنها سوپەر ئەدمین دەتوانێت ڕۆڵ بگۆڕێت.',
          'Only a Super Admin can grant Admin privileges.'
        )
      );
      return;
    }
    if (selectedRole === citizen.role) return;

    if (isTargetAnotherSuperAdmin) {
      setError(
        tr(
          'قيد أمني إلزامي: لا يُسمح لأي سوبر أدمن بتعديل أو تخفيض صلاحيات سوبر أدمن آخر.',
          'ڕێگریی ئەمنی: ڕێگەپێدراو نییە سوپەر ئەدمین دەستکاری سوپەر ئەدمینێکی تر بکات.',
          'Mandatory server constraint: No Super Admin can modify or demote another Super Admin.'
        )
      );
      return;
    }

    setError(null);
    if (confirmationStep === 0) {
      setConfirmationStep(1);
    } else if (confirmationStep === 1) {
      setConfirmationStep(2);
    }
  };

  const handleApplyRoleChange = async () => {
    if (!currentUser || !isSuperAdmin) return;
    if (selectedRole === citizen.role) return;

    if (isTargetAnotherSuperAdmin) {
      setError(
        tr(
          'قيد أمني إلزامي: لا يُسمح لأي سوبر أدمن بتعديل أو تخفيض صلاحيات سوبر أدمن آخر.',
          'ڕێگریی ئەمنی: ڕێگەپێدراو نییە سوپەر ئەدمین دەستکاری سوپەر ئەدمینێکی تر بکات.',
          'Mandatory server constraint: No Super Admin can modify or demote another Super Admin.'
        )
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await authService.changeUserRole(currentUser, citizen.uid, selectedRole);
      playSuccessSound();
      if (res.generatedRecoveryCode) {
        setGeneratedCode(res.generatedRecoveryCode);
      }
      onRoleUpdated(selectedRole, citizen.uid);
      if (!res.generatedRecoveryCode) {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || tr('فشل تغيير الدور.', 'گۆڕینی ڕۆڵ سەرکەوتوو نەبوو.', 'Failed to change role.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      dir={dir}
      onClick={onClose}
      className="fixed inset-0 z-[160] bg-[#1E3725]/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white shadow-[0_24px_70px_rgba(30,55,37,0.22)] border border-[#BBDDC6]/70 p-6 space-y-5 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8F4EA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F4EA] text-[#46674D] flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#1E3725]">
                {confirmationStep === 1 || confirmationStep === 2
                  ? tr('تأكيد منح الصلاحية', 'پشتڕاستکردنەوەی پێدانی دەسەڵات', 'Confirm Role Change')
                  : tr('إدارة صلاحيات المستخدم', 'بەڕێوەبردنی ڕۆڵی بەکارهێنەر', 'Manage User Role')}
              </h3>
              <p className="text-[11px] font-bold text-[#46674D] truncate max-w-[200px]">
                {citizen.fullName}
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

        {/* User Card Summary */}
        <div className="p-3.5 rounded-2xl bg-[#F4F9F5] border border-[#BBDDC6]/60 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black text-[#1E3725] truncate">{citizen.fullName}</p>
            <p className="text-[11px] font-mono text-[#46674D] mt-0.5" dir="ltr">
              {citizen.email || citizen.phone}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-black shrink-0 ${
              citizen.role === 'super_admin'
                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                : citizen.role === 'admin'
                ? 'bg-[#E8F4EA] text-[#1E3725] border border-[#88B793]'
                : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            {citizen.role === 'super_admin'
              ? tr('سوبر أدمن (Super Admin)', 'سوپەر ئەدمین', 'Super Admin')
              : citizen.role === 'admin'
              ? tr('مسؤول (Admin)', 'بەڕێوەبەر', 'Admin')
              : tr('مواطن (Citizen)', 'هاووڵاتی', 'Citizen')}
          </span>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold leading-relaxed flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Generated Recovery Code Banner */}
        {generatedCode && (
          <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 space-y-2.5">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-xs font-black">
                {tr(
                  'تمت ترقية الحساب وتوليد رمز الاسترداد الثابت بنجاح:',
                  'ڕۆڵ نوێکرایەوە و کۆدی گەڕاندنەوە دروستکرا:',
                  'Account upgraded! Static Recovery Code generated:'
                )}
              </span>
            </div>
            <div
              className="p-3 rounded-xl bg-white border border-emerald-300 font-mono text-center text-sm font-black text-emerald-800 select-all tracking-wider"
              dir="ltr"
            >
              {generatedCode}
            </div>
            <p className="text-[10px] font-bold text-emerald-700 leading-relaxed">
              {tr(
                'زوّد هذا الرمز للمسؤول لحفظه. لن يتم عرضه مجدداً في الواجهة الاعتيادية وسيتم تخزينه مشفراً بـ AES-256-GCM على الخادم.',
                'ئەم کۆدە بدە بە بەڕێوەبەرەکە، لە سێرڤەر بە شێوەیەکی پارێزراو پاشەکەوت دەکرێت.',
                'Provide this code to the admin. It is stored securely encrypted on the server.'
              )}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black transition-colors cursor-pointer"
            >
              {tr('تم الحفظ والإغلاق', 'پاشەکەوتکرا و داخستن', 'Saved & Close')}
            </button>
          </div>
        )}

        {/* If target is another Super Admin: Lock message */}
        {isTargetAnotherSuperAdmin ? (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-300 text-slate-700 space-y-2 text-center">
            <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center mx-auto">
              <Lock className="w-5 h-5" />
            </div>
            <p className="text-xs font-black text-[#1E3725]">
              {tr(
                'حساب سوبر أدمن محمي',
                'هەژماری سوپەر ئەدمینی پارێزراو',
                'Protected Super Admin Account'
              )}
            </p>
            <p className="text-[11px] font-bold text-slate-600 leading-relaxed">
              {tr(
                'لا يستطيع أي سوبر أدمن حذف حساب سوبر أدمن آخر أو تخفيض صلاحياته أو تغيير كلمة مروره أو تغيير رمز استرداده. القيود مفروضة على مستوى الخادم.',
                'هیچ سوپەر ئەدمینێک ناتوانێت دەستکاری هەژماری سوپەر ئەدمینێکی تر بکات بەپێی یاساکانی سێرڤەر.',
                'Mandatory server-enforced security: No Super Admin can delete, demote, or change another Super Admin.'
              )}
            </p>
          </div>
        ) : (
          !generatedCode && (
            <>
              {/* STEP 1 CONFIRMATION */}
              {confirmationStep === 1 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0" />
                      <h4 className="text-xs font-black">
                        {tr(
                          `هل ترغب في منح صلاحية (${getRoleLabel(selectedRole)}) لهذا الحساب؟`,
                          `ئایا دەتەوێت دەسەڵاتی (${getRoleLabel(selectedRole)}) بدەیت بەم هەژمارە؟`,
                          `Do you want to grant (${getRoleLabel(selectedRole)}) role to this account?`
                        )}
                      </h4>
                    </div>
                    <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                      {selectedRole === 'admin'
                        ? tr(
                            'سيتمكن هذا المستخدم من الدخول إلى لوحة إدارة المنظمة، متابعة بلاغات المواطنين، إرسالها إلى الدوائر الخدمية، وإدارة الاستبيانات.',
                            'ئەم بەکارهێنەرە دەتوانێت بچێتە ناو بەشی بەڕێوەبردنی ڕێکخراو و سکاڵاکان بەڕێوەببات.',
                            'This user will be able to access the organization dashboard, manage reports, and publish surveys.'
                          )
                        : selectedRole === 'super_admin'
                        ? tr(
                            'سيحصل هذا المستخدم على صلاحيات سوبر أدمن كاملة في النظام.',
                            'ئەم بەکارهێنەرە دەسەڵاتی تەواوی سوپەر ئەدمین وەردەگرێت.',
                            'This user will receive full Super Admin privileges.'
                          )
                        : tr(
                            'سيتم إرجاع هذا الحساب إلى صلاحية مواطن عادي وإلغاء صلاحياته الإدارية.',
                            'ئەم هەژمارە دەگەڕێتەوە بۆ هاووڵاتی ئاسایی.',
                            'This account will be returned to standard Citizen role.'
                          )}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        if (startWithConfirmation) {
                          onClose();
                        } else {
                          setConfirmationStep(0);
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-[#F4F9F5] text-slate-700 text-xs font-bold hover:bg-[#E8F4EA] transition-colors cursor-pointer"
                    >
                      {tr('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleProceedToConfirmStep}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {tr(
                          'نعم، متابعة',
                          'بەڵێ، بەردەوامبە',
                          'Yes, Continue'
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2 FINAL CONFIRMATION */}
              {confirmationStep === 2 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#E8F4EA] border-2 border-[#46674D] text-[#1E3725] space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-[#46674D] shrink-0" />
                      <h4 className="text-xs font-black">
                        {tr(
                          'تأكيد منح الصلاحية',
                          'پشتڕاستکردنەوەی پێدانی دەسەڵات',
                          'Confirm Granting Role'
                        )}
                      </h4>
                    </div>
                    <p className="text-[11px] font-bold text-[#2D4833] leading-relaxed">
                      {tr(
                        `أنت على وشك اعتماد ترقية وتغيير دور (${citizen.fullName}) بشكل رسمي إلى (${getRoleLabel(selectedRole)}) وتوليد رمز خاص به. هل تؤكد تنفيذ العملية الآن؟`,
                        `ئێستا بە فەرمی ڕۆڵی (${citizen.fullName}) دەگۆڕیت بۆ (${getRoleLabel(selectedRole)}). ئایا دڵنیایت؟`,
                        `You are about to officially set (${citizen.fullName}) as (${getRoleLabel(selectedRole)}). Confirm execution now?`
                      )}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        playClickSound();
                        setConfirmationStep(1);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-[#F4F9F5] text-slate-700 text-xs font-bold hover:bg-[#E8F4EA] transition-colors cursor-pointer"
                    >
                      {tr('رجوع', 'گەڕانەوە', 'Back')}
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleApplyRoleChange}
                      className="px-5 py-2.5 rounded-xl bg-[#46674D] hover:bg-[#36593F] text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-40"
                    >
                      {submitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>
                            {tr(
                              'تأكيد ومنح الصلاحية',
                              'پشتڕاستکردنەوە و پێدانی دەسەڵات',
                              'Confirm & Grant Role'
                            )}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 0: ROLE SELECTION */}
              {confirmationStep === 0 && (
                <div className="space-y-4">
                  <label className="block text-xs font-black text-[#1E3725]">
                    {tr('اختر الدور الجديد للمستخدم:', 'ڕۆڵی نوێ دیاری بکە:', 'Select New User Role:')}
                  </label>

                  <div className="space-y-2.5">
                    {/* 1. Citizen */}
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setSelectedRole('citizen');
                      }}
                      className={`w-full p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        selectedRole === 'citizen'
                          ? 'border-[#46674D] bg-[#E8F4EA] text-[#1E3725] shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-[#F4F9F5]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white border border-[#BBDDC6] flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-[#46674D]" />
                        </div>
                        <div>
                          <p className="text-xs font-black">
                            {tr('مواطن (Citizen)', 'هاووڵاتی', 'Citizen')}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-500">
                            {tr(
                              'تقديم بلاغات، تتبع بلاغاته، مشاهدة الأعمال والاستبيانات',
                              'پێشکەشکردنی سکاڵا، بینینی کارەکان',
                              'Submit reports, track own reports, view completed works'
                            )}
                          </p>
                        </div>
                      </div>
                      {selectedRole === 'citizen' && <Check className="w-4 h-4 text-[#46674D]" />}
                    </button>

                    {/* 2. Admin */}
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setSelectedRole('admin');
                      }}
                      className={`w-full p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        selectedRole === 'admin'
                          ? 'border-[#46674D] bg-[#E8F4EA] text-[#1E3725] shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-[#F4F9F5]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white border border-[#BBDDC6] flex items-center justify-center">
                          <ShieldCheck className="w-4 h-4 text-[#46674D]" />
                        </div>
                        <div>
                          <p className="text-xs font-black">
                            {tr('مسؤول المنظمة (Admin)', 'بەڕێوەبەری ڕێکخراو', 'Organization Admin')}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-500">
                            {tr(
                              'إدارة البلاغات، الإحصاءات، الدوائر، الاستبيانات، مشاهدة المواطنين',
                              'بەڕێوەبردنی سکاڵاکان و ئامارەکان',
                              'Manage reports, KPIs, departments, surveys'
                            )}
                          </p>
                        </div>
                      </div>
                      {selectedRole === 'admin' && <Check className="w-4 h-4 text-[#46674D]" />}
                    </button>

                    {/* 3. Super Admin */}
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setSelectedRole('super_admin');
                      }}
                      className={`w-full p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        selectedRole === 'super_admin'
                          ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-[#F4F9F5]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white border border-purple-300 flex items-center justify-center">
                          <ShieldAlert className="w-4 h-4 text-purple-700" />
                        </div>
                        <div>
                          <p className="text-xs font-black">
                            {tr('سوبر أدمن (Super Admin)', 'سوپەر ئەدمین', 'Super Admin')}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-500">
                            {tr(
                              'صلاحيات كاملة لإدارة التطبيق وتعيين وتعديل المسؤولين ورموز الاسترداد',
                              'دەسەڵاتی تەواو بەسەر هەموو بەشەکاندا',
                              'Full permissions, role assignments, recovery management'
                            )}
                          </p>
                        </div>
                      </div>
                      {selectedRole === 'super_admin' && <Check className="w-4 h-4 text-purple-700" />}
                    </button>
                  </div>

                  {/* Reveal Code button if citizen is already an Admin */}
                  {citizen.role === 'admin' && onOpenRevealCode && (
                    <div className="pt-2 border-t border-[#E8F4EA]">
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          onOpenRevealCode(citizen);
                        }}
                        className="w-full py-2.5 px-3 rounded-xl bg-[#F4F9F5] hover:bg-[#E8F4EA] border border-[#BBDDC6] text-[#1E3725] text-xs font-black flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Key className="w-4 h-4 text-[#46674D]" />
                        <span>
                          {tr(
                            'كشف رمز الاسترداد الخاص بهذا المسؤول',
                            'بینینی کۆدی گەڕاندنەوەی ئەم بەڕێوەبەرە',
                            'Reveal Admin Recovery Code'
                          )}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2.5 pt-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl bg-[#F4F9F5] text-slate-700 text-xs font-bold hover:bg-[#E8F4EA] transition-colors cursor-pointer"
                    >
                      {tr('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
                    </button>
                    <button
                      type="button"
                      disabled={submitting || selectedRole === citizen.role}
                      onClick={handleProceedToConfirmStep}
                      className="px-5 py-2.5 rounded-xl bg-[#46674D] hover:bg-[#36593F] text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-40"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>
                        {tr('متابعة للتأكيد (1/2)', 'بەردەوامبە بۆ پشتڕاستکردنەوە (١/٢)', 'Proceed to Confirm (1/2)')}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
};
