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
    appName: 'CAVE BAADRE',
    appSubName: 'عين باعدرى الذكية • منصة البلاغات والخدمات المجتمعية',
    offlineNotice: 'لا يوجد اتصال بالإنترنت حالياً',
    offlineNoticeDesc:
      'يرجى التحقق من اتصال الشبكة لديك لاستكمال تصفح ومزامنة بلاغات واستبيانات ناحية باعدرى.',
    installPwaTitle: 'تثبيت تطبيق عين باعدرى الذكية',
    installPwaDesc: 'ثبّت التطبيق على شاشك الرئيسية للوصول السريع وتقديم البلاغات فوراً.',
    installBtn: 'تثبيت',
    dismissBtn: 'إغلاق',
  },
  ku: {
    appName: 'CAVE BAADRE',
    appSubName: 'چاوی زیرەکی باعەدرێ • سەکۆی سکاڵا و خزمەتگوزارییەکان',
    offlineNotice: 'لە ئێستادا هێڵی ئینتەرنێت نییە',
    offlineNoticeDesc:
      'تکایە دڵنیابەرەوە لە پەیوەندی ئینتەرنێتەکەت بۆ بەردەوامبوون لە ناردنی سکاڵا و ڕاپرسییەکان.',
    installPwaTitle: 'داگرتنی ئەپی چاوی زیرەکی باعەدرێ',
    installPwaDesc: 'ئەپەکە لەسەر شاشەی سەرەکی مۆبایلەکەت جێگیر بکە بۆ دەستگەیشتنی خێرا.',
    installBtn: 'داگرتن',
    dismissBtn: 'داخستن',
  },
  en: {
    appName: 'CAVE BAADRE',
    appSubName: 'Smart Baadre Eye • Civic Reports & Community Services',
    offlineNotice: 'No Internet Connection',
    offlineNoticeDesc:
      'Please check your network connection to continue browsing and syncing Baadre reports and surveys.',
    installPwaTitle: 'Install CAVE BAADRE App',
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
