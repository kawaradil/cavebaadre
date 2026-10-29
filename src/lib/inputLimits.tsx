import React from 'react';
import { useLanguage } from '../context/LanguageContext';

/**
 * حدود الكلمات والأحرف الموحدة لجميع حقول الإدخال والفورمات في التطبيق
 * لضمان حماية قاعدة البيانات (Firestore) من البيانات الضخمة أو الإدخالات العشوائية الطويلة.
 */
export const FIELD_LIMITS = {
  TITLE: { maxWords: 15, maxChars: 120 },
  DESCRIPTION: { maxWords: 60, maxChars: 450 },
  NAME: { maxWords: 8, maxChars: 65 },
  DEPT_NAME: { maxWords: 10, maxChars: 80 },
  LOCATION: { maxWords: 10, maxChars: 80 },
  DURATION: { maxWords: 5, maxChars: 35 },
  PHONE: { maxWords: 1, maxChars: 16 },
  SURVEY_QUESTION: { maxWords: 25, maxChars: 180 },
  SURVEY_OPTION: { maxWords: 12, maxChars: 90 },
  SEARCH: { maxWords: 10, maxChars: 80 },
  MAX_SURVEY_QUESTIONS: 15,
  MAX_SURVEY_OPTIONS: 8,
} as const;

/**
 * حساب عدد الكلمات في النص
 */
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * تقييد النص المدخل بعدد أقصى من الكلمات وعدد أقصى من الأحرف
 * يعمل بشكل فوري عند الكتابة أو اللصق (Paste) لمنع تجاوز الحد المسموح.
 */
export function enforceInputLimit(
  rawValue: string,
  maxWords: number,
  maxChars: number
): string {
  if (!rawValue) return '';

  // 1. تقييد الحد الأقصى للأحرف أولاً لمنع النصوص الطويلة المتصلة بدون مسافات
  let result = rawValue.slice(0, maxChars);

  // 2. تقييد الحد الأقصى للكلمات
  const trimmed = result.trim();
  if (!trimmed) return result.slice(0, 1);

  const words = trimmed.split(/\s+/);
  if (words.length > maxWords) {
    result = words.slice(0, maxWords).join(' ');
  } else if (words.length === maxWords && /\s$/.test(result)) {
    // عند الوصول للحد الأقصى للكلمات، نمنع فتح كلمة جديدة عبر المسافة
    result = words.join(' ');
  }

  return result.slice(0, maxChars);
}

/**
 * تقييد حقول أرقام الهواتف والواتساب (أرقام وعلامة + والمسافات البسيطة فقط بحد أقصى 16 حرفاً)
 */
export function enforcePhoneLimit(
  rawValue: string,
  maxChars: number = FIELD_LIMITS.PHONE.maxChars
): string {
  if (!rawValue) return '';
  const cleaned = rawValue.replace(/[^\d+\s-]/g, '');
  return cleaned.slice(0, maxChars);
}

/**
 * تعقيم وتقليم أي قيمة نصية أو كائن قبل حفظه في قاعدة البيانات Firestore
 * كخط دفاع ثانٍ على مستوى قاعدة البيانات.
 */
export function sanitizeDatabasePayload<T>(payload: T, maxStringChars = 500, maxStringWords = 70): T {
  if (payload === null || payload === undefined) return payload;

  if (typeof payload === 'string') {
    // لا نقوم بقص روابط الصور (URLs أو DataURLs)
    if (
      payload.startsWith('http://') ||
      payload.startsWith('https://') ||
      payload.startsWith('data:image/') ||
      payload.startsWith('/')
    ) {
      return payload as unknown as T;
    }
    return enforceInputLimit(payload, maxStringWords, maxStringChars) as unknown as T;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) =>
      sanitizeDatabasePayload(item, maxStringChars, maxStringWords)
    ) as unknown as T;
  }

  if (typeof payload === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(payload as Record<string, any>)) {
      if (v !== undefined) {
        out[k] = sanitizeDatabasePayload(v, maxStringChars, maxStringWords);
      }
    }
    return out as T;
  }

  return payload;
}

interface FieldLimitBadgeProps {
  value: string;
  maxWords?: number;
  maxChars: number;
  isPhone?: boolean;
  className?: string;
}

/**
 * شارة صغيرة متناسقة تعرض عداد الكلمات (أو الأحرف للهاتف) بجانب عنوان الحقل أو أسفله
 */
export const FieldLimitBadge: React.FC<FieldLimitBadgeProps> = ({
  value,
  maxWords,
  maxChars,
  isPhone = false,
  className = '',
}) => {
  const { language } = useLanguage();
  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

  const charCount = (value || '').length;
  const wordCount = countWords(value || '');

  const isAtLimit = isPhone
    ? charCount >= maxChars
    : (maxWords ? wordCount >= maxWords : false) || charCount >= maxChars;

  if (isPhone || !maxWords) {
    return (
      <span
        dir="ltr"
        className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full transition-colors ${
          isAtLimit
            ? 'bg-amber-100 text-amber-800'
            : 'bg-[#E8F4EA]/90 text-[#46674D]'
        } ${className}`}
      >
        <span>
          {charCount}/{maxChars}
        </span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
        isAtLimit
          ? 'bg-amber-100 text-amber-800 font-black'
          : 'bg-[#E8F4EA]/90 text-[#46674D]'
      } ${className}`}
    >
      <span dir="ltr" className="font-mono">
        {wordCount}/{maxWords}
      </span>
      <span>{tr('كلمة', 'وشە', 'words')}</span>
    </span>
  );
};
