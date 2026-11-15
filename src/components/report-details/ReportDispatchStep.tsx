import React from 'react';
import { User, MessageCircle, Check, Clock, Building2 } from 'lucide-react';
import { motion } from 'motion/react';
import { CivicReport, MunicipalDepartment } from '../../types/baadre';
import { FIELD_LIMITS, FieldLimitBadge } from '../../lib/inputLimits';
import { playClickSound } from '../../lib/sound';
import {
  RecipientOption,
  RecipientRoleKey,
  TimelineActionStatus,
} from './reportShareHelpers';

export interface ReportDispatchStepProps {
  report: CivicReport;
  language: 'ar' | 'ku' | 'en';
  activeRole: 'citizen' | 'admin';
  hasInProgressRecord: boolean;
  editingStep: TimelineActionStatus | null;
  setEditingStep: (step: TimelineActionStatus | null) => void;
  savedInProgressTime: string;
  savedInProgressNote: string;
  recipientsHistoryList: string[];
  departments: MunicipalDepartment[];
  assignedTeam: string;
  setAssignedTeam: (val: string) => void;
  recipientOptions: RecipientOption[];
  selectedRecipientKey: RecipientRoleKey;
  setSelectedRecipientKey: (key: RecipientRoleKey) => void;
  inProgressNoteValue: string;
  onChangeInProgressNote: (val: string) => void;
  departmentSelectError: string | null;
  onSaveDispatch: (e: React.FormEvent) => void;
  tr: (ar: string, ku: string, en: string) => string;
}

export const ReportDispatchStep: React.FC<ReportDispatchStepProps> = ({
  report,
  language,
  activeRole,
  hasInProgressRecord,
  editingStep,
  setEditingStep,
  savedInProgressTime,
  savedInProgressNote,
  recipientsHistoryList,
  departments,
  assignedTeam,
  setAssignedTeam,
  recipientOptions,
  selectedRecipientKey,
  setSelectedRecipientKey,
  inProgressNoteValue,
  onChangeInProgressNote,
  departmentSelectError,
  onSaveDispatch,
  tr,
}) => {
  return (
    <div className="relative flex items-start gap-3">
      <div
        className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 text-xs font-black transition-all ${
          hasInProgressRecord
            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
            : 'bg-slate-100 text-slate-400 border-slate-200'
        }`}
      >
        3
      </div>

      <div className="flex-1 min-w-0 space-y-2.5">
        <div
          className={`w-full px-4 py-2.5 rounded-xl border text-xs font-black flex items-center justify-between gap-2 ${
            hasInProgressRecord
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {hasInProgressRecord ? (
              <span>🔵</span>
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
            )}
            <span>{tr('تم الإرسال', 'نێردرا بۆ فەرمانگە', 'Sent to Department')}</span>
          </div>

          {!hasInProgressRecord && activeRole === 'admin' && editingStep !== 'in_progress' && (
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setEditingStep('in_progress');
              }}
              className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black cursor-pointer transition-colors"
            >
              {tr('إرسال البلاغ', 'ناردنی سکاڵا', 'Send Report')}
            </button>
          )}

          {!hasInProgressRecord && activeRole !== 'admin' && (
            <span className="text-[11px] font-bold text-slate-400">
              {tr('غير مرسل بعد', 'هێشتا نەنێردراوە', 'Not sent yet')}
            </span>
          )}

          {hasInProgressRecord && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-black">
              {tr('تم الإرسال ✓', 'نێردرا ✓', 'Sent ✓')}
            </span>
          )}
        </div>

        {hasInProgressRecord && editingStep !== 'in_progress' && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-2xl bg-white border border-blue-200 shadow-xs space-y-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-blue-800">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>{report.assignedTeam || assignedTeam}</span>
              </div>

              <div className="flex items-center gap-2">
                {savedInProgressTime && (
                  <span
                    dir="ltr"
                    className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg inline-flex items-center gap-1 tabular-nums"
                  >
                    <Clock className="w-3 h-3" />
                    <span>{savedInProgressTime}</span>
                  </span>
                )}
              </div>
            </div>

            {recipientsHistoryList.length > 0 && (
              <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 space-y-1.5">
                <p className="text-[11px] font-black text-blue-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{tr('تم الإرسال إلى:', 'نێردراوە بۆ:', 'Sent to:')}</span>
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {recipientsHistoryList.map((recItem, rIdx) => (
                    <span
                      key={`rec-hist-${rIdx}`}
                      className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-900 text-xs font-black inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <span
                        dir="ltr"
                        className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-mono flex items-center justify-center shrink-0"
                      >
                        {rIdx + 1}
                      </span>
                      <span>{recItem}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {savedInProgressNote && (
              <p className="text-xs text-[#1E3725] font-medium bg-[#F4F9F5] p-2.5 rounded-xl border border-[#E8F4EA]">
                {savedInProgressNote}
              </p>
            )}
          </motion.div>
        )}

        {activeRole === 'admin' && editingStep === 'in_progress' && (
          <motion.form
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={onSaveDispatch}
            className="p-4 rounded-2xl bg-white border-2 border-blue-300 shadow-sm space-y-3.5"
          >
            {departmentSelectError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                {departmentSelectError}
              </div>
            )}

            {recipientsHistoryList.length > 0 && (
              <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1">
                <p className="text-[11px] font-black text-blue-800">
                  {tr(
                    'الأشخاص الذين تم الإرسال إليهم سابقاً (سيتم الاحتفاظ بأسمائهم مع الاسم الجديد):',
                    'ئەو کەسانەی پێشتر بۆیان نێردراوە:',
                    'Previously sent to (will be kept along with new recipient):'
                  )}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {recipientsHistoryList.map((recItem, rIdx) => (
                    <span
                      key={`prev-rec-${rIdx}`}
                      className="px-2 py-0.5 rounded-md bg-white border border-blue-200 text-blue-900 text-[11px] font-black"
                    >
                      {rIdx + 1}. {recItem}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-black text-blue-900">
                {tr('اسم الدائرة:', 'ناوی فەرمانگە:', 'Department:')}
              </label>
              <select
                required
                value={assignedTeam}
                onChange={(e) => {
                  setAssignedTeam(e.target.value);
                  setSelectedRecipientKey('phone1');
                }}
                className="w-full bg-[#F4F9F5] border border-blue-200 focus:border-blue-600 rounded-xl px-3 py-2 text-xs font-black text-[#1E3725] focus:outline-none"
              >
                <option value="">
                  {tr(
                    '-- اختر الدائرة الخدمية المعنية --',
                    '-- فەرمانگەی پێوەندیدار هەڵبژێرە --',
                    '-- Select Department --'
                  )}
                </option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.nameAr}>
                    {language === 'ku' && dept.nameKu
                      ? dept.nameKu
                      : language === 'en' && dept.nameEn
                      ? dept.nameEn
                      : dept.nameAr}
                  </option>
                ))}
              </select>
            </div>

            {!assignedTeam ? (
              <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs font-bold text-center leading-relaxed">
                {tr(
                  '⚠️ الرجاء اختيار الدائرة الخدمية المعنية من القائمة أعلاه لعرض مسؤول التواصل ورقم الهاتف المخصص',
                  '⚠️ تکایە سەرەتا فەرمانگەی پێوەندیدار لە لیستەکە هەڵبژێرە بۆ بینینی ناو و ژمارەی تەلەفۆن',
                  '⚠️ Please select a department above to view contact details'
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-blue-900">
                  {tr(
                    'اختيار الاسم في الدائرة:',
                    'هەڵبژاردنی ناو لە فەرمانگە:',
                    'Select Recipient:'
                  )}
                </label>
                <div
                  className={`grid gap-2 ${
                    recipientOptions.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
                  }`}
                >
                  {recipientOptions.map((rec) => {
                    const isSelected = selectedRecipientKey === rec.key;
                    return (
                      <button
                        key={rec.key}
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setSelectedRecipientKey(rec.key);
                        }}
                        className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-[#F4F9F5] text-[#1E3725] border-blue-200 hover:border-blue-400'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            <User className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 text-start">
                            <p className="text-xs font-black truncate">{rec.name}</p>
                            <p
                              className={`text-[11px] font-mono font-bold mt-0.5 ${
                                isSelected ? 'text-white/90' : 'text-slate-600'
                              }`}
                              dir="ltr"
                            >
                              {rec.phone}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {rec.key === 'phone2' && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {tr('إضافي', 'زیادە', 'Extra')}
                            </span>
                          )}
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-xs font-black text-blue-900">
                  {tr(
                    'ملاحظات الإدارة (تدخل في رسالة الواتساب):',
                    'تێبینی کارگێڕی (لە نامەی واتسئەپ):',
                    'Admin Notes (Included in WhatsApp):'
                  )}
                </label>
                <FieldLimitBadge
                  value={inProgressNoteValue}
                  maxWords={FIELD_LIMITS.DESCRIPTION.maxWords}
                  maxChars={FIELD_LIMITS.DESCRIPTION.maxChars}
                />
              </div>
              <textarea
                rows={2}
                maxLength={FIELD_LIMITS.DESCRIPTION.maxChars}
                value={inProgressNoteValue}
                onChange={(e) => onChangeInProgressNote(e.target.value)}
                placeholder={tr(
                  'اكتب ملاحظات الإدارة هنا...',
                  'تێبینی کارگێڕی بنووسە...',
                  'Write admin notes...'
                )}
                className="w-full bg-[#F4F9F5] border border-blue-200 focus:border-blue-600 focus:bg-white rounded-xl p-2.5 text-xs font-bold text-[#1E3725] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{tr('حفظ وإرسال', 'پاشەکەوت و ناردن', 'Save & Send')}</span>
              </button>
              <button
                type="button"
                onClick={() => setEditingStep(null)}
                className="px-3.5 py-2 rounded-xl bg-[#F4F9F5] hover:bg-[#E8F4EA] text-[#2D4833] font-bold text-xs cursor-pointer"
              >
                {tr('إغلاق', 'داخستن', 'Close')}
              </button>
            </div>
          </motion.form>
        )}
      </div>
    </div>
  );
};
