import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Check,
  Phone,
  Pencil,
  Trash2,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playClickSound, playSuccessSound } from '../../lib/sound';

export interface SidebarAccountModalsProps {
  dir: 'rtl' | 'ltr';
  isRTL: boolean;
  tr: (ar: string, ku: string, en: string) => string;
  currentUser: any;
  profile: any;
  isEditAccountOpen: boolean;
  onCloseEditAccount: () => void;
  isDeleteAccountOpen: boolean;
  onOpenDeleteAccount: () => void;
  onCloseDeleteAccount: () => void;
  updateAccount: (payload: {
    fullName: string;
    phone: string;
    birthDate: string;
    newPassword?: string;
  }) => Promise<void>;
  deleteAccountWithoutData: () => Promise<void>;
  onAccountDeleted: () => void;
}

export const SidebarAccountModals: React.FC<SidebarAccountModalsProps> = ({
  dir,
  isRTL,
  tr,
  currentUser,
  profile,
  isEditAccountOpen,
  onCloseEditAccount,
  isDeleteAccountOpen,
  onOpenDeleteAccount,
  onCloseDeleteAccount,
  updateAccount,
  deleteAccountWithoutData,
  onAccountDeleted,
}) => {
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [editConfirmStep, setEditConfirmStep] = useState<0 | 1 | 2>(0);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deleteConfirmStep, setDeleteConfirmStep] = useState<1 | 2>(1);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  useEffect(() => {
    if (isEditAccountOpen) {
      setEditFullName(profile?.fullName || currentUser?.displayName || '');
      setEditPhone(profile?.phone || '');
      setEditBirthDate(profile?.birthDate || '1995-01-01');
      setEditNewPassword('');
      setEditConfirmStep(0);
      setEditError(null);
      setEditSuccess(null);
    }
  }, [isEditAccountOpen, profile, currentUser]);

  useEffect(() => {
    if (isDeleteAccountOpen) {
      setDeleteConfirmStep(1);
      setDeleteError(null);
    }
  }, [isDeleteAccountOpen]);

  return (
    <>
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
              onClick={onCloseEditAccount}
              className="fixed inset-0 bg-[#1B3A46]/55 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className={`relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#CFE2E8] p-5 sm:p-6 z-10 space-y-4 ${
                isRTL ? 'text-right' : 'text-left'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#DAE9EE]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#E3EFF3] text-[#467586] flex items-center justify-center">
                    <Pencil className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-[#1B3A46]">
                      {editConfirmStep === 1
                        ? tr(
                            'تأكيد تعديل الحساب',
                            'پشتڕاستکردنەوەی دەستکاری هەژمار',
                            'Confirm Account Edit'
                          )
                        : editConfirmStep === 2
                        ? tr(
                            'حفظ التعديلات',
                            'پاشەکەوتکردنی گۆڕانکارییەکان',
                            'Save Changes'
                          )
                        : tr(
                            'تعديل بيانات الحساب',
                            'دەستکاری زانیاری هەژمار',
                            'Edit Account Details'
                          )}
                    </h3>
                    <p className="text-[11px] font-bold text-[#3B6878]" dir="ltr">
                      {currentUser?.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onCloseEditAccount}
                  className="p-2 rounded-xl text-slate-400 hover:text-[#1B3A46] hover:bg-[#E3EFF3] transition-colors cursor-pointer"
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
                    <label className="block text-[11px] font-bold text-[#3B6878] mb-1">
                      {tr('الاسم الثلاثي الكامل', 'ناوی سیانی تەواو', 'Full Name')} *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                        className={`w-full bg-[#F2F8FA] border border-[#BDDAE3] focus:border-[#467586] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1B3A46] focus:outline-none ${
                          isRTL ? 'pr-9 text-right' : 'pl-9 text-left'
                        }`}
                      />
                      <UserIcon
                        className={`w-4 h-4 text-[#467586] absolute ${
                          isRTL ? 'right-3' : 'left-3'
                        } top-3 pointer-events-none`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#3B6878] mb-1">
                      {tr('رقم الموبايل', 'ژمارەی مۆبایل', 'Mobile Phone')} *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        dir="ltr"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className={`w-full bg-[#F2F8FA] border border-[#BDDAE3] focus:border-[#467586] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-[#1B3A46] focus:outline-none ${
                          isRTL ? 'pr-9 text-right' : 'pl-9 text-left'
                        }`}
                      />
                      <Phone
                        className={`w-4 h-4 text-[#467586] absolute ${
                          isRTL ? 'right-3' : 'left-3'
                        } top-3 pointer-events-none`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#3B6878] mb-1">
                      {tr(
                        'كلمة مرور جديدة (اختياري)',
                        'وشەی تێپەڕی نوێ (ئارەزوومەندانە)',
                        'New Password (Optional)'
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        dir="ltr"
                        value={editNewPassword}
                        onChange={(e) => setEditNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full bg-[#F2F8FA] border border-[#BDDAE3] focus:border-[#467586] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1B3A46] focus:outline-none ${
                          isRTL ? 'pr-9 text-right' : 'pl-9 text-left'
                        }`}
                      />
                      <Lock
                        className={`w-4 h-4 text-[#467586] absolute ${
                          isRTL ? 'right-3' : 'left-3'
                        } top-3 pointer-events-none`}
                      />
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-[#DAE9EE] flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-500">
                      {tr(
                        'هل ترغب في حذف حسابك؟',
                        'دەتەوێت هەژمارەکەت بسڕیتەوە؟',
                        'Want to delete account?'
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onCloseEditAccount();
                        onOpenDeleteAccount();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-black inline-flex items-center gap-1.5 transition-colors cursor-pointer border-0 shadow-2xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{tr('حذف الحساب', 'سڕینەوەی هەژمار', 'Delete Account')}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={onCloseEditAccount}
                      className="px-4 py-2.5 rounded-xl bg-[#F2F8FA] text-[#285060] text-xs font-bold hover:bg-[#E3EFF3] transition-colors cursor-pointer"
                    >
                      {tr('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setEditError(null);
                        if (editFullName.trim().split(/\s+/).length < 3) {
                          setEditError(
                            tr(
                              'يرجى كتابة الاسم الثلاثي.',
                              'تکایە ناوی سیانی بنووسە.',
                              'Enter full 3-part name.'
                            )
                          );
                          return;
                        }
                        if (!editPhone.trim() || editPhone.replace(/[\s-]/g, '').length < 10) {
                          setEditError(
                            tr('رقم الهاتف غير صالح.', 'ژمارەی مۆبایل نادروستە.', 'Invalid phone.')
                          );
                          return;
                        }
                        if (editNewPassword.trim() && editNewPassword.trim().length < 6) {
                          setEditError(
                            tr(
                              'كلمة المرور 6 أحرف على الأقل.',
                              'وشەی تێپەڕ لانیکەم ٦ پیت بێت.',
                              'Min 6 chars.'
                            )
                          );
                          return;
                        }
                        setEditConfirmStep(1);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#467586] hover:bg-[#386373] text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {tr('حفظ التعديلات', 'پاشەکەوتکردنی گۆڕانکاری', 'Save Changes')}
                      </span>
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
                      className="px-4 py-2.5 rounded-xl bg-[#F2F8FA] text-slate-700 text-xs font-bold cursor-pointer"
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
                  <div className="p-4 rounded-2xl bg-[#E3EFF3] border-2 border-[#467586] text-[#1B3A46] space-y-1.5">
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
                      className="px-4 py-2.5 rounded-xl bg-[#F2F8FA] text-slate-700 text-xs font-bold cursor-pointer"
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
                          setEditSuccess(
                            tr('تم تحديث الحساب بنجاح.', 'هەژمارەکە نوێکرایەوە.', 'Account updated.')
                          );
                          setTimeout(() => {
                            onCloseEditAccount();
                          }, 900);
                        } catch (err: any) {
                          setEditError(
                            err?.message ||
                              tr(
                                'فشل تحديث الحساب.',
                                'نوێکردنەوە سەرکەوتوو نەبوو.',
                                'Update failed.'
                              )
                          );
                          setEditConfirmStep(0);
                        } finally {
                          setEditSubmitting(false);
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#467586] hover:bg-[#386373] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {editSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>
                            {tr(
                              'تأكيد وحفظ',
                              'پشتڕاستکردنەوە و پاشەکەوتکردن',
                              'Confirm & Save'
                            )}
                          </span>
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
              onClick={onCloseDeleteAccount}
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
                      {tr(
                        'حذف الحساب الشخصي دون حذف البيانات',
                        'سڕینەوەی هەژمار بەبێ سڕینەوەی داتاکان',
                        'Delete account while keeping data'
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onCloseDeleteAccount}
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
                      onClick={onCloseDeleteAccount}
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
                          onAccountDeleted();
                        } catch {
                          setDeleteError(
                            tr(
                              'تعذر حذف الحساب.',
                              'سڕینەوەی هەژمار سەرکەوتوو نەبوو.',
                              'Failed to delete account.'
                            )
                          );
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
                          <span>
                            {tr(
                              'تأكيد حذف الحساب',
                              'سڕینەوەی هەژمار',
                              'Confirm Delete Account'
                            )}
                          </span>
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
