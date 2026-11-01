export type Language = 'ar' | 'ku' | 'en';

export interface TranslationDictionary {
  appName: string;
  appSubName: string;
  offlineNotice: string;
  offlineNoticeDesc: string;
  installPwaTitle: string;
  installPwaDesc: string;
  installBtn: string;
  dismissBtn: string;
}

export const translations: Record<Language, TranslationDictionary> = {
  ar: {
    appName: 'ÇAVÊ BAADRÊ',
    appSubName: 'عين باعذرة • تطبيق الخدمات المجتمعية (منظمة RABA)',
    offlineNotice: 'لا يوجد اتصال بالإنترنت حالياً',
    offlineNoticeDesc:
      'يرجى التحقق من اتصال الشبكة لديك لاستكمال تصفح ومزامنة بلاغات واستبيانات ناحية باعذرة.',
    installPwaTitle: 'تثبيت تطبيق ÇAVÊ BAADRÊ',
    installPwaDesc: 'ثبّت التطبيق على شاشتك الرئيسية للوصول السريع وتقديم البلاغات فوراً.',
    installBtn: 'تثبيت',
    dismissBtn: 'إغلاق',
  },
  ku: {
    appName: 'ÇAVÊ BAADRÊ',
    appSubName: 'چاڤێ باعدرێ • ئەپی خزمەتگوزارییە کۆمەڵایەتییەکان (ڕێکخراوی RABA)',
    offlineNotice: 'لە ئێستادا هێڵی ئینتەرنێت نییە',
    offlineNoticeDesc:
      'تکایە دڵنیابەرەوە لە پەیوەندی ئینتەرنێتەکەت بۆ بەردەوامبوون لە ناردنی سکاڵا و ڕاپرسییەکان.',
    installPwaTitle: 'داگرتنی ئەپی ÇAVÊ BAADRÊ',
    installPwaDesc: 'ئەپەکە لەسەر شاشەی سەرەکی مۆبایلەکەت جێگیر بکە بۆ دەستگەیشتنی خێرا.',
    installBtn: 'داگرتن',
    dismissBtn: 'داخستن',
  },
  en: {
    appName: 'ÇAVÊ BAADRÊ',
    appSubName: 'Baadre Eye • Community Services App (RABA Organization)',
    offlineNotice: 'No Internet Connection',
    offlineNoticeDesc:
      'Please check your network connection to continue browsing and syncing Baadre reports and surveys.',
    installPwaTitle: 'Install ÇAVÊ BAADRÊ App',
    installPwaDesc: 'Add the app to your home screen for quick access and instant reporting.',
    installBtn: 'Install',
    dismissBtn: 'Dismiss',
  },
};

/**
 * Lightweight trilingual helper for inline component translations
 */
export function trText(
  language: Language,
  ar: string,
  ku: string,
  en: string
): string {
  if (language === 'ku') return ku;
  if (language === 'en') return en;
  return ar;
}
