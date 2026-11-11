import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Camera,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  MessageCircle,
  Check,
  Upload,
  Route,
  Droplets,
  Waves,
  Lightbulb,
  Trash2,
  Building2,
  AlertCircle,
  User,
  Phone,
  FileText,
  Info,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ReportSector,
  SECTOR_META,
  BAADRE_NEIGHBORHOODS,
  BAADRE_STREETS,
  BAADRE_LANDMARKS,
  BAADRE_CENTER_COORDS,
  MUNICIPAL_WHATSAPP_NUMBER,
  CivicReport,
  SECTOR_ILLUSTRATIONS,
  formatWhatsAppReportMessage,
  isReportSentToDepartment,
} from '../types/baadre';
import { useBaadre } from '../context/BaadreContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { playClickSound, playSuccessSound } from '../lib/sound';
import {
  compressImageFile,
  uploadImageToFirebaseStorage,
  MAX_UPLOAD_IMAGES,
} from '../lib/firebase';
import {
  FullScreenGoogleMapPickerModal,
  EmbeddedGoogleMapPreviewCard,
} from './FullScreenGoogleMapPickerModal';
import { SmartAdaptiveImage } from './SmartAdaptiveImage';
import {
  FIELD_LIMITS,
  enforceInputLimit,
  enforcePhoneLimit,
  FieldLimitBadge,
} from '../lib/inputLimits';

const SECTOR_ICONS: Record<ReportSector, React.ComponentType<{ className?: string }>> = {
  roads: Route,
  water: Droplets,
  sewage: Waves,
  lighting: Lightbulb,
  sanitation: Trash2,
  other: Building2,
};

const SECTOR_EXAMPLES: Record<
  ReportSector,
  { ar: string[]; ku: string[]; en: string[] }
> = {
  roads: {
    ar: [
      'شارع يحتاج صيانة',
      'حفرة في الشارع',
      'رصيف متضرر',
      'مطب غير نظامي',
      'أنقاض في الطريق',
    ],
    ku: [
      'شەقام پێویستی بە چاککردنە',
      'چاڵ لەسەر شەقام',
      'شۆستەی تێکچوو',
      'تاسەی نایاسایی',
      'پاشماوە لەسەر ڕێگا',
    ],
    en: [
      'Street needs maintenance',
      'Pothole on the street',
      'Damaged sidewalk',
      'Irregular speed bump',
      'Debris on the road',
    ],
  },
  water: {
    ar: [
      'كسر أنبوب مياه',
      'تسرب مياه مستمر',
      'انقطاع مياه الشرب',
      'ضعف ضخ المياه',
      'عطل قفل المياه',
    ],
    ku: [
      'شکانی بۆری ئاو',
      'دزەکردنی بەردەوامی ئاو',
      'بڕانی ئاوی خواردنەوە',
      'لاوازی پەستانی ئاو',
      'تێکچوونی قوفڵی ئاو',
    ],
    en: [
      'Broken water pipe',
      'Continuous water leak',
      'Water supply outage',
      'Weak water pressure',
      'Faulty water valve',
    ],
  },
  sewage: {
    ar: [
      'انسداد أو طفح مجاري',
      'غطاء منهول مفقود',
      'تجمع مياه أمطار',
      'روائح مجاري كريهة',
      'كسر ساقية تصريف',
    ],
    ku: [
      'گیران یان ڕژانی ئاوەڕۆ',
      'سەری مەنهۆڵی نەماو',
      'کۆبوونەوەی ئاوی باران',
      'بۆنی ناخۆشی ئاوەڕۆ',
      'شکانی جۆگەی ئاوەڕۆ',
    ],
    en: [
      'Blocked or overflowing sewage',
      'Missing manhole cover',
      'Rainwater accumulation',
      'Foul sewage odor',
      'Broken drainage channel',
    ],
  },
  lighting: {
    ar: [
      'إنارة مكسورة أو مطفأة',
      'سلك كهرباء متدلٍ',
      'عمود إنارة مائل',
      'عطل صندوق كهرباء',
      'زقاق مظلم يحتاج إنارة',
    ],
    ku: [
      'ڕووناکی شکاو یان کوژاوە',
      'تێلی کارەبای شۆڕبووەوە',
      'ستوونی کارەبای لاربوو',
      'تێکچوونی بۆکسی کارەبا',
      'کۆڵانی تاریک پێویستی بە ڕووناکییە',
    ],
    en: [
      'Broken or off streetlight',
      'Low-hanging electric wire',
      'Tilted utility pole',
      'Faulty electric box',
      'Dark alley needs lighting',
    ],
  },
  sanitation: {
    ar: [
      'تراكم نفايات',
      'حاوية قمامة ممتلئة',
      'حاوية نفايات مكسورة',
      'صيانة حديقة عامة',
      'أغصان أشجار تعيق الطريق',
    ],
    ku: [
      'کۆبوونەوەی زبڵ و خاشاک',
      'سەبەتەی زبڵی پڕبوو',
      'سەبەتەی زبڵی شکاو',
      'چاککردنی باخچەی گشتی',
      'لقی درەخت ڕێگری دەکات',
    ],
    en: [
      'Trash accumulation',
      'Full garbage bin',
      'Broken trash container',
      'Public park maintenance',
      'Tree branches blocking road',
    ],
  },
  other: {
    ar: [
      'تجاوز على الرصيف',
      'لوحة إرشادية متضررة',
      'مبنى مهجور خطر',
      'حفرة أعمال مكشوفة',
      'خدمة بلدية أخرى',
    ],
    ku: [
      'زێدەڕۆیی سەر شۆستە',
      'تابلۆی هاتوچۆی تێکچوو',
      'بینای چۆڵکراوی مەترسیدار',
      'چاڵی کارکردنی سەرنەپۆشراو',
      'خزمەتگوزاری تری شارەوانی',
    ],
    en: [
      'Sidewalk encroachment',
      'Damaged street sign',
      'Hazardous abandoned building',
      'Open utility trench',
      'Other municipal service',
    ],
  },
};

export interface SmartSectorSuggestion {
  titles: { ar: string[]; ku: string[]; en: string[] };
  descriptions: { ar: string[]; ku: string[]; en: string[] };
}

export const SMART_SECTOR_SUGGESTIONS: Record<ReportSector, SmartSectorSuggestion> = {
  roads: {
    titles: {
      ar: [
        'حفرة في الشارع',
        'رصيف متضرر يحتاج صيانة',
        'أتربة وصخور في الطريق',
        'مطب يحتاج طلاء وترميم',
        'هبوط في الأسفلت',
        'صيانة عبّارة الطريق',
        'تشققات في الشارع',
        'تآكل حافة الطريق',
        'حصى ومخلفات على الطريق',
        'شارع فرعي يحتاج تبليط',
        'انزلاق صخري قرب المنعطف',
        'ممر مشاة غير مخطط',
        'رصيف مدرسي متكسر',
        'حاجز مروري مكسور',
      ],
      ku: [
        'چاڵ لەسەر شەقام',
        'شۆستەی تێکچوو پێویستی بە چاککردنە',
        'بەرد و خۆڵ لەسەر ڕێگا',
        'تاسە پێویستی بە بۆیاخ و چاککردنە',
        'دابەزینی قیڕی شەقام',
        'چاککردنی ئاوبەری ڕێگا',
        'درزبردن لە قیڕی شەقام',
        'داڕمانی قەراغی شەقام',
        'چەو و پاشماوە لەسەر ڕێگا',
        'کۆڵان پێویستی بە قیرتاوکردنە',
        'خلیسکی بەرد لە نزیک پێچ',
        'ڕێڕەوی پیادەی بێ هێڵکاری',
        'شۆستەی قوتابخانەی تێکچوو',
        'بەربەستی هاتوچۆی شکاو',
      ],
      en: [
        'Pothole on the street',
        'Damaged sidewalk needs repair',
        'Rocks & dirt on roadway',
        'Speed bump needs paint & repair',
        'Asphalt road subsidence',
        'Road culvert maintenance',
        'Cracks in street asphalt',
        'Eroded road edge',
        'Gravel & debris on road',
        'Alley needs paving',
        'Rock slide near road curve',
        'Unmarked pedestrian crossing',
        'Damaged school sidewalk',
        'Broken traffic guardrail',
      ],
    },
    descriptions: {
      ar: [
        'توجد حفر عميقة في وسط الشارع تعيق حركة السيارات وتتسبب بأضرار ميكانيكية وإطارات مثقوبة خاصة أثناء الليل.',
        'الرصيف الجانبي متكسر بالكامل وتوجد صعوبة بالغة في سير المشاة وطلاب المدارس ونأمل إعادة صيانته وتبليطه.',
        'تراكمت صخور وأتربة كثيفة ناتجة عن الأمطار مما أدى إلى تضييق مسار الطريق وخلق خطورة على السائقين.',
        'المطب الصناعي غير واضح وخالٍ من الطلاء العاكس مما يسبب مفاجأة للسائقين وارتطام السيارات.',
        'هبوط ملحوظ في طبقة الأسفلت وسط الطريق العام يشكل خطورة كبيرة على المركبات المارة بسرعة.',
        'عبّارة تصريف المياه تحت الطريق مسدودة ومتضررة مما يهدد بانهيار جزء من الشارع عند هطول الأمطار.',
        'تشققات واسعة ومتفرقة في قير الشارع تزداد اتساعاً يوماً بعد يوم وتحتاج إلى معالجة وترقيع فوري.',
        'حواف الشارع الجانبية متآكلة ومنحدرة بشدة مما يشكل خطراً عند محاولة المركبات التوقف أو التجاوز.',
        'وجود بقايا حصى ورمل متناثر على منعطف الطريق يسبب انزلاق العجلات ويشكل خطراً على الدراجات والسيارات.',
        'هذا الزقاق الفرعي بحاجة ماسة إلى التسوية والفرش أو التبليط لتسهيل وصول الأهالي وسيارات الطوارئ.',
        'تساقط صخور وحصى من التل المجاور على المنعطف يشكل خطراً كبيراً على السيارات القادمة مسرعة.',
        'عدم وجود خطوط عبور مشاة واضحة أمام المدارس والمحلات يعرض الطلاب والأهالي لمخاطر دهس مستمرة.',
        'رصيف المشاة المؤدي إلى المدرسة متهالك وبلاطاته مقلوعة مما يجبر الطلاب على السير وسط حركة السير.',
        'حاجز الحماية الفولاذي على حافة الوادي مكسور بعد حادث مروري وبحاجة إلى صيانة عاجلة لحماية السيارات.',
      ],
      ku: [
        'چاڵی قووڵ لە ناوەڕاستی شەقام هەیە کە زیان بە ئۆتۆمبێلی خەڵک دەگەیەنێت و پێویستی بە قیڕتاوکردنە.',
        'شۆستەی تەنیشت شەقام بە تەواوی تێکچووە و قوتابیان و پیادەڕەوان بە زەحمەت هاتوچۆی پێدا دەکەن.',
        'بەرد و خۆڵی زۆر بەهۆی بارانەوە هاتووەتە سەر شەقام و ڕێگاکەی تەسک کردووەتەوە و مەترسیدارە.',
        'بەربەستی خێرایی ڕەنگی نەماوە و هێمای ئاگادارکەرەوەی نییە و دەبێتە هۆی زیان بە ئۆتۆمبێلەکان.',
        'دابەزینێکی بەرچاو لە قیڕی ناوەڕاستی شەقامەکە دروستبووە و مەترسی هەیە بۆ سەر هاتوچۆی ئۆتۆمبێل.',
        'ئاوبەری ژێر شەقامەکە گیراوە و تێکچووە و مەترسی ڕووخانی بەشێکی ڕێگاکەی لێ دەکرێت لە کاتی باراندا.',
        'درزی گەورە و بڵاو لە قیڕی شەقامەکەدا هەیە و ڕۆژ بە ڕۆژ گەورەتر دەبێت و پێویستی بە پینەکردنە.',
        'قەراغی شەقامەکە داڕماوە و تێکچووە و مەترسی دروست دەکات کاتێک ئۆتۆمبێل لادەدات یان دەوەستێت.',
        'چەو و لمی پەرشوبڵاو لەسەر پێچی شەقامەکە کەوتووە و دەبێتە هۆی خلیسکانی تایەی ئۆتۆمبێلەکان.',
        'ئەم کۆڵانە پێویستی بە تێکەڵەڕێژکردن یان قیڕتاوکردن هەیە بۆ ئاسانکاری هاتوچۆی دانیشتووان.',
        'کەوتنی بەرد و چەو لە گردەکەوە بۆ سەر پێچی شەقام مەترسییە بۆ سەر شۆفێران.',
        'نەبوونی هێڵی پەڕینەوەی پیادە لە بەردەم قوتابخانەکان مەترسی لەسەر ژیانی قوتابیان دروست دەکات.',
        'شۆستەی ڕێگای قوتابخانە تێکچووە و قوتابیان ناچارن لە ناوەڕاستی شەقام هاتوچۆ بکەن.',
        'پەرژینی پارێزگاری قەراغ دۆڵەکە دوای ڕووداوێک شکاوە و پێویستی بە چاککردنەوەی خێرایە.',
      ],
      en: [
        'Deep potholes in the middle of the road damaging vehicles and causing traffic delays, especially at night.',
        'Side pavement is heavily damaged making pedestrian and student walking difficult and hazardous.',
        'Rocks and mud accumulation from rain has narrowed the roadway and created hazards for drivers.',
        'Speed bump is missing warning reflective paint causing sudden impact on passing cars.',
        'Noticeable subsidence in the main road asphalt layer posing a serious hazard to passing traffic.',
        'Under-road water culvert is damaged and clogged, threatening roadway stability during heavy rain.',
        'Widespread cracks across the asphalt surface are expanding daily and require urgent patching.',
        'Roadside shoulders are severely eroded, creating a drop-off hazard when vehicles pull over.',
        'Scattered gravel and sand on the road curve causing tire skidding and safety risks for motorists.',
        'This residential alley urgently needs grading and paving to allow safe passage for residents and emergency vehicles.',
        'Rocks and gravel falling from the adjacent hill onto the road bend pose a serious hazard to fast-moving cars.',
        'Lack of clear pedestrian zebra crossings near schools exposes students and pedestrians to severe traffic risks.',
        'Paved walkway leading to the elementary school is heavily broken, forcing students onto the busy roadway.',
        'Steel safety guardrail along the ravine edge is broken following an accident and needs immediate replacement.',
      ],
    },
  },
  water: {
    titles: {
      ar: [
        'كسر أنبوب مياه رئيسي',
        'تسرب مياه تحت الأسفلت',
        'انقطاع مياه الشرب',
        'تغير لون أو نقاوة المياه',
        'ضعف ضخ المياه',
        'عطل قفل المياه الرئيسي',
        'كسر أنبوب مياه فرعي',
        'تسرب مياه بجانب الرصيف',
        'تأخر ضخ المياه للحي',
        'غرفة صمام مياه مكشوفة',
        'عطل بمضخة خزان الحي',
        'صدأ في شبكة المياه الفرعية',
        'كسر وصلة تغذية مدرسة',
        'هدر مياه في مبنى عام',
      ],
      ku: [
        'شکانی بۆری ئاوی سەرەکی',
        'دزەکردنی ئاو لەژێر قیڕ',
        'بڕانی ئاوی خواردنەوە',
        'لێڵبوونی ئاوی ماڵان',
        'لاوازی پەستانی ئاو',
        'تێکچوونی قوفڵی سەرەکی ئاو',
        'شکانی بۆری فەرعی ئاو',
        'دزەکردنی ئاو لە تەنیشت شۆستە',
        'دواکەوتنی بەردانەوەی ئاو',
        'شوێنی قوفڵی ئاوی سەرنەپۆشراو',
        'تێکچوونی پەمپی تانکی گەڕەک',
        'ژەنگ لە تۆڕی فەرعی ئاو',
        'شکانی بۆری ئاوی قوتابخانە',
        'بەفیڕۆچوونی ئاو لە بینای گشتی',
      ],
      en: [
        'Broken main water pipe',
        'Water leak under asphalt',
        'Drinking water outage',
        'Discolored tap water',
        'Weak water pressure',
        'Faulty main water valve',
        'Broken branch water pipe',
        'Curbside water leak',
        'Delayed water schedule',
        'Uncovered water valve box',
        'Neighborhood tank pump failure',
        'Rust in local water line',
        'Broken school water connection',
        'Water waste at public facility',
      ],
    },
    descriptions: {
      ar: [
        'انكسار في أنبوب المياه الرئيسي مما يؤدي إلى هدر كميات كبيرة من المياه الصالحة وتجمع برك مائية تعيق الحركة.',
        'تسرب مياه من تحت الأسفلت مستمر منذ عدة أيام وتسبب برطوبة وهبوط في أرضية الشارع.',
        'انقطاع تام لمياه الشرب عن منازل الحي منذ أكثر من 48 ساعة ونرجو سرعة المعالجة وضخ المياه.',
        'مياه الإسالة الواردة للمنازل غير صافية وبها شوائب وعكورة واضحة ولا تصلح للاستخدام اليومي.',
        'ضعف شديد في ضغط ضخ المياه بحيث لا تصل المياه إلى الخزانات المنزلية في هذا المربع السكني.',
        'عطل في قفل ومحبس المياه الرئيسي بالحي يؤدي إلى تسرب مستمر وعدم انتظام توزيع المياه للمنازل.',
        'انكسار أنبوب فرعي أمام المنازل نتيجة مرور آليات ثقيلة مما أدى لانقطاع الماء عن عدة بيوت.',
        'خروج مياه مستمر من حافة الرصيف عند تشغيل الضخ مما يدل على ثقب في الأنبوب المدفون تحت الأرض.',
        'لم يتم ضخ المياه لهذا القطاع في الموعد المقرر وبدأت خزانات الأهالي بالنفاد، نرجو المتابعة.',
        'غطاء غرفة محبس المياه مكشوف وممتلئ بالمياه المتسربة ويحتاج إلى صيانة وتبديل التوصيلات التالفة.',
        'توقف مضخة التغذية التابعة لخزان مياه الحي مما أدى إلى انقطاع فوري للإمدادات عن كافة المنازل المحيطة.',
        'مياه الشرب تصل محملة بآثار صدأ وترسبات حديدية نتيجة تآكل الأنابيب القديمة وتحتاج الشبكة لغسيل وصيانة.',
        'انكسار أنبوب التغذية المائي للمدرسة الحكومية مما سبب تشكل مستنقع مائي أمام البوابة الرئيسية.',
        'تسرب وهدر مستمر لمياه الشرب من خزانات أو صمامات مبنى عام دون صيانة منذ أيام.',
      ],
      ku: [
        'شکانی بۆری سەرەکی ئاو کە دەبێتە هۆی بەفیڕۆچوونی ئاوێکی زۆر و دروستبوونی گۆمی ئاو لە شەقامدا.',
        'دزەکردنی ئاو لەژێر قیڕەوە ماوەی چەند ڕۆژە بەردەوامە و بووەتە هۆی دابەزینی زەوی شەقامەکە.',
        'ئاوی خواردنەوە زیاتر لە دوو ڕۆژە لە ماڵەکانی ئەم گەڕەکە بڕاوە و تکایە چارەسەری بەپەلەی بۆ بکەن.',
        'ئاوی ماڵان لێڵە و ڕەنگ و تامی گۆڕاوە و شیاوی بەکارهێنان و خواردنەوە نییە.',
        'پەستانی ئاو زۆر لاوازە و ئاو ناگاتە تانکی سەربانی ماڵەکانی ئەم کۆڵانە.',
        'تێکچوونی قوفڵی سەرەکی ئاوی گەڕەک کە بووەتە هۆی دزەکردنی بەردەوام و ناڕێکی لە دابەشکردنی ئاودا.',
        'شکانی بۆری فەرعی بەردەم ماڵان بەهۆی تێپەڕبوونی ئۆتۆمبێلی قورسەوە کە بووەتە هۆی بڕانی ئاوی چەند ماڵێک.',
        'لە کاتی بەردانەوەی ئاودا لە تەنیشت شۆستەکەوە ئاوێکی زۆر دێتە دەرەوە و نیشانەی شکانی بۆری ژێر زەوییە.',
        'لە کاتی دیاریکراودا ئاو بۆ ئەم کەرتە بەرنەدراوەتەوە و تانکی ماڵەکان خەریکە تەواو دەبێت.',
        'شوێنی قوفڵی ئاوەکە سەری نەماوە و پڕ بووە لە ئاوی دزەکردوو و پێویستی بە چاککردنەوەی بەپەلە هەیە.',
        'پەمپی ئاوی تانکی گەڕەک لەکارکەوتووە و بووەتە هۆی بڕانی تەواوەتی ئاو لە ماڵەکان.',
        'ئاوی خواردنەوە ژەنگی پێوەیە بەهۆی کۆنی بۆرییەکانەوە و پێویستی بە شۆردن و گۆڕین هەیە.',
        'شکانی بۆری ئاوی قوتابخانە کە بووەتە هۆی دروستبوونی گۆماو لە بەردەم دەرگای سەرەکی.',
        'بەفیڕۆچوونی بەردەوامی ئاوی خواردنەوە لە بینایەکی گشتی بەبێ چاککردنەوە.',
      ],
      en: [
        'Burst municipal main line causing massive drinking water loss and street flooding that obstructs access.',
        'Subsurface water leak leaking through asphalt for days, threatening ground stability.',
        'Drinking water has been completely cut off from neighborhood houses for over 48 hours.',
        'Municipal tap water is turbid and cloudy with suspended sediment and is unsuitable for consumption.',
        'Water pressure is extremely weak and fails to reach residential rooftop tanks in this block.',
        'Main neighborhood control valve is malfunctioning, causing continuous leakage and uneven water distribution.',
        'Branch pipe in front of homes broke under heavy vehicle load, cutting supply to multiple houses.',
        'Water gushes from beneath the curb whenever pumping starts, indicating a ruptured underground pipe.',
        'Scheduled water supply has been delayed for this sector and household reserves are running dry.',
        'Water valve chamber is uncovered and flooded with leaking water, requiring urgent fitting replacement.',
        'Neighborhood booster pump stopped operating, cutting water supplies to surrounding homes.',
        'Tap water arrives rusty with particulate sediment due to aged pipe corrosion, requiring system flushing.',
        'School water feed line burst, forming a water pool directly in front of the main school gate.',
        'Continuous potable water leakage and waste from public building fixtures requiring maintenance.',
      ],
    },
  },
  sewage: {
    titles: {
      ar: [
        'طفح مجاري في الشارع',
        'غطاء منهول مفقود أو مكسور',
        'انسداد مشبك مياه الأمطار',
        'روائح مجاري كريهة',
        'هبوط حول فتحة المنهول',
        'انسداد خط المجاري الرئيسي',
        'كسر ساقية تصريف المياه',
        'تجمع مياه آسنة بالزقاق',
        'ارتداد مياه الصرف للمنازل',
        'حاجة لتنظيف مناهيل الشارع',
        'انسداد ساقية مياه الأمطار',
        'تجمع مياه راكدة أمام المسجد',
        'تآكل جدران مجرى الصرف',
        'تسرب مجاري لأرضية ترابية',
      ],
      ku: [
        'ڕژانی ئاوەڕۆ لە شەقام',
        'سەری مەنهۆڵی شکاو یان نەماو',
        'گیرانی مەنهۆڵی باراناو',
        'بۆنی ناخۆشی ئاوەڕۆ',
        'دابەزینی زەوی دەوری مەنهۆڵ',
        'گیرانی بۆری سەرەکی ئاوەڕۆ',
        'شکانی جۆگەی ئاوەڕۆ',
        'کۆبوونەوەی ئاوی پیس لە کۆڵان',
        'گەڕانەوەی ئاوەڕۆ بۆ ماڵان',
        'پێویستی پاککردنەوەی مەنهۆڵەکان',
        'گیرانی جۆگەی ئاوی باران',
        'کۆبوونەوەی ئاوی پیس لای مزگەوت',
        'داڕمانی دیواری جۆگەی ئاوەڕۆ',
        'دزەکردنی ئاوەڕۆ بۆ زەوی',
      ],
      en: [
        'Sewage overflow on street',
        'Missing or broken manhole cover',
        'Clogged rainwater drain',
        'Foul sewage odors',
        'Ground collapse near manhole',
        'Blocked main sewer line',
        'Broken drainage channel',
        'Stagnant wastewater pool',
        'Sewage backflow to homes',
        'Manholes need cleaning',
        'Blocked rainwater gutter',
        'Stagnant puddle near mosque',
        'Drain channel wall collapse',
        'Sewage leak into dirt lot',
      ],
    },
    descriptions: {
      ar: [
        'فيضان مياه الصرف الصحي أمام منازل المواطنين والمحلات مسبباً روائح كريهة ومخاطر صحية تمنع المارة من العبور.',
        'غطاء المنهول مفقود تماماً ويشكل خطراً داهماً بسقوط المارة والأطفال والسيارات فيه نرجو تأمينه فوراً.',
        'انسداد فتحات ومجاري تصريف السيول والأمطار مما يسبب تجمع بحيرات مائية تغلق الشارع عند كل مطرة.',
        'انبعاث غازات وروائح مجاري حادة وخانقة من فتحات الصرف تصل إلى داخل منازل الأهالي.',
        'هبوط وتشقق الأسفلت حول فوهة المنهول في منتصف الطريق مما يهدد بانهيار الفتحة تحت إطارات المركبات.',
        'انسداد كامل في أنبوب المجاري الرئيسي للزقاق يؤدي إلى طفح مستمر للمياه الثقيلة على امتداد الطريق.',
        'الساقية الجانبية لتصريف المياه متكسرة ومليئة بالأتربة والرواسب مما يمنع جريان المياه بشكل طبيعي.',
        'تجمع مستنقع من المياه الآسنة والراكدة في المنخفض الموجود بنهاية الشارع يجلب البعوض والحشرات الضارة.',
        'ضيق وانسداد مجرى الصرف يتسبب بارتداد المياه المتسخة باتجاه أرصفة ومداخل البيوت المجاورة.',
        'المناهيل ومشابك الأمطار في هذا الشارع ممتلئة بالطين والأوساخ وتحتاج إلى حملة تنظيف وتسليك عاجلة.',
        'انسداد ساقية تصريف الأمطار المكشوفة بالقمامة والطين مما يؤدي إلى فيضان المياه فوق الطريق عند كل زخّة مطر.',
        'تجمع مستنقع مائي راكد من الصرف السطحي بجوار المسجد يعيق دخول المصلين وينشر الحشرات والروائح.',
        'تصدع وانهيار جزئي في الجدران الإسمنتية لمجرى الصرف المكشوف مما يهدد بتآكل أساسات الطريق المجاورة.',
        'تسرب مياه الصرف الصحي إلى ساحة ترابية مجاورة للبيوت السكنية مما يلوث التربة ويخلق بؤرة بيئية سيئة.',
      ],
      ku: [
        'ڕژانی ئاوی پیسی ئاوەڕۆ لە بەردەم ماڵان و دووکانەکان کە بۆنی ناخۆش و مەترسی تەندروستی دروستکردووە.',
        'سەری مەنهۆڵەکە بە تەواوی نەماوە و مەترسییەکی گەورەیە بۆ کەوتنی منداڵان و ئۆتۆمبێلەکان.',
        'گیرانی مەنهۆڵی ئاوی باران کە دەبێتە هۆی دروستبوونی گۆماوی گەورە و داخستنی شەقام لە کاتی باراندا.',
        'بڵاوبوونەوەی بۆنی زۆر تیژ و ناخۆش لە ڕێڕەوی ئاوەڕۆوە کە چووەتە ناو ماڵەکانی دراوسێوە.',
        'دابەزین و درزبردنی قیڕ لە دەوری سەری مەنهۆڵەکە لە ناوەڕاستی شەقامدا کە مەترسی داڕمانی هەیە.',
        'گیرانی تەواوەتی بۆری سەرەکی ئاوەڕۆی کۆڵانەکە کە بووەتە هۆی سەرڕێژبوونی بەردەوامی ئاوی قورس.',
        'جۆگەی تەنیشت شەقامەکە شکاوە و پڕ بووە لە قوڕ و خۆڵ و ڕێگری لە ڕۆیشتنی ئاو دەکات.',
        'کۆبوونەوەی گۆماوی ئاوی پیس و وەستاو لە خوارەوەی شەقامەکە کە بووەتە سەرچاوەی مێشوولە و نەخۆشی.',
        'بەهۆی گیرانی ڕێڕەوی ئاوەڕۆکەوە ئاوی پیس دەگەڕێتەوە بۆ بەردەم دەرگای ماڵەکانی گەڕەک.',
        'مەنهۆڵ و تۆڕی باراناوی ئەم شەقامە پڕ بوون لە قوڕ و پاشماوە و پێویستیان بە پاککردنەوەی خێرایە.',
        'گیرانی جۆگەی کراوەی باراناو بە زبڵ و قوڕ کە دەبێتە هۆی لافاو لەسەر شەقام.',
        'کۆبوونەوەی گۆماوی پیس لە بەردەم مزگەوت کە ڕێگری لە نوێژخوێنان دەکات.',
        'داڕمانی دیواری کۆنکریتی جۆگەی ئاوەڕۆ کە مەترسی لەسەر بناغەی شەقامەکە دروست دەکات.',
        'دزەکردنی ئاوی پیسی ئاوەڕۆ بۆ گۆڕەپانی نزیک ماڵان کە ژینگە پیس دەکات.',
      ],
      en: [
        'Sewage flooding in front of houses and shops creating severe health hazards and foul smells.',
        'Manhole cover is completely missing, posing an immediate danger to pedestrians, children, and cars.',
        'Blocked stormwater drain creating deep stagnant water pools whenever it rains.',
        'Persistent foul odors leaking from sewer openings into nearby residential homes.',
        'Asphalt around the manhole rim has sunk and cracked, risking collapse under passing vehicle wheels.',
        'Complete blockage in the main alley sewer line causing continuous wastewater overflow along the street.',
        'Roadside drainage channel is broken and choked with silt and debris, stopping normal water runoff.',
        'Stagnant wastewater puddle at the low end of the street breeding mosquitoes and creating unsanitary conditions.',
        'Clogged sewer conduit causing dirty water to back up toward adjacent house entrances and walkways.',
        'Storm grates and manholes along this street are packed with mud and require urgent desilting.',
        'Open stormwater channel clogged with mud and litter, overflowing onto the street during rain.',
        'Stagnant runoff puddle next to the neighborhood mosque impeding worshippers and attracting insects.',
        'Partial collapse of the concrete sewer ditch sidewall threatening adjacent roadway foundation.',
        'Sewage seepage into an open unpaved lot next to residences, creating unsanitary soil contamination.',
      ],
    },
  },
  lighting: {
    titles: {
      ar: [
        'انطفاء إنارة الشارع',
        'سلك كهرباء متدلٍ وخطر',
        'عمود كهرباء مائل',
        'إنارة مكسورة أو متقطعة',
        'صندوق كهرباء مكشوف',
        'تماس وشرار في العمود',
        'خلل مؤقت الإنارة النهاري',
        'أشجار تلامس أسلاك الكهرباء',
        'تقاطع مظلم يحتاج إنارة',
        'زقاق مظلم يحتاج مصباح',
        'عمود إنارة مائل قرب الملعب',
        'كابل كهربائي مكشوف على الأرض',
        'انطفاء كامل لإنارة المدخل',
        'كسر غطاء مصباح عمود الإنارة',
      ],
      ku: [
        'کوژانەوەی ڕووناکی شەقام',
        'تێلی کارەبای شۆڕبووەوە',
        'ستوونی کارەبای لاربوو',
        'گلۆپی شکاو یان پچڕپچڕ',
        'سندووقی کارەبای کراوە',
        'شۆرت و پریشکە لە ستوون',
        'تێکچوونی ئۆتۆماتیکی گلۆپ',
        'لقی درەخت لەگەڵ تێلی کارەبا',
        'چوارڕیانی تاریک بێ ڕووناکی',
        'کۆڵانی تاریک پێویستی بە گلۆپە',
        'ستوونی ڕووناکی لار لای یاریگا',
        'کێبڵی کارەبای ڕووت لەسەر زەوی',
        'کوژانەوەی تەواوی ڕووناکی دەروازە',
        'شکانی شوشەی گلۆپی ستوون',
      ],
      en: [
        'Streetlight outage',
        'Hazardous dangling wire',
        'Tilted utility pole',
        'Broken or flickering lamp',
        'Exposed electric box',
        'Sparks on utility pole',
        'Faulty daylight switch',
        'Branches touching power lines',
        'Dark unlit intersection',
        'Dark alley needs lamp',
        'Tilted pole near sports pitch',
        'Bare electric cable on ground',
        'Total outage at town entrance',
        'Broken streetlamp glass cover',
      ],
    },
    descriptions: {
      ar: [
        'أعمدة الإنارة في هذا الشارع مطفأة بالكامل منذ عدة ليالٍ مما يتسبب في ظلام دامس وخطورة أمنية ومرورية.',
        'سلك كهربائي متدلٍ من العمود وقريب من الأرض والمارة مما قد يسبب تماس كهربائي خطير على حياة المواطنين.',
        'عمود الإنارة مائل بدرجة كبيرة إثر اصطدام سابق وهو على وشك السقوط على الطريق أو المارة.',
        'مصابيح الإنارة متقطعة وترمش بشكل مستمر وبحاجة إلى صيانة أو استبدال وحدات الإضاءة.',
        'باب صندوق التوزيع الكهربائي بأسفل العمود مخلوع والأسلاك مكشوفة أمام الأطفال والمارة، نرجو تأمينه.',
        'صدور شرار كهربائي وصوت أزيز من أعلى عمود الإنارة خاصة عند هبوب الرياح أو هطول المطر.',
        'خلل في المؤقت الأوتوماتيكي (الخلية الضوئية) يجعل الإنارة تعمل طوال النهار وتنطفئ عند حلول الليل.',
        'تفرعات الأشجار العالية تلامس أسلاك ومصابيح الإنارة وتحجب الضوء عن الرصيف والشارع.',
        'التقاطع الرئيسي مظلم تماماً في المساء مما يصعّب رؤية المشاة والعابرين للسائقين القادمين.',
        'هذا الممر السكني يفتقر إلى وحدات إنارة كافية ويشهد ظلاماً شديداً يعيق تنقل الأهالي ليلاً.',
        'عمود إنارة معدني مائل بشكل حاد بجانب ساحة الألعاب والملعب مما يهدد بسقوطه على رواد المكان.',
        'وجود كابل كهربائي رئيسي مكشوف وممدد على الأرض بدون عازل أو دفن يشكل خطراً مميتاً على المواطنين.',
        'المدخل الرئيسي لبلدة باعدرى مظلم تماماً منذ عدة ليالٍ نتيجة عطل في اللوحة المركزية لتوزيع الكهرباء.',
        'الغطاء الزجاجي للمصباح مكسور ومعلق بالهواء وقد يسقط على السيارات أو المارة عند هبوب الرياح.',
      ],
      ku: [
        'گلۆپی ستوونەکانی ئەم شەقامە چەندین شەوە بە تەواوی کوژاونەتەوە و تاریکی زۆر و مەترسی دروستکردووە.',
        'تێلی کارەبا لە ستوونەکەوە شۆڕبووەتەوە و نزیکە لە زەوی و مەترسی کارەبا لێدانی هەیە بۆ سەر هاووڵاتیان.',
        'ستوونی ڕووناکی بەهۆی بەریەککەوتنی ئۆتۆمبێل لار بووەتەوە و هەر ساتێکە بکەوێتە خوارەوە.',
        'گلۆپەکان دەپڕووزێن و پێویستیان بە چاککردنەوە و گۆڕینی لید (LED)ی نوێ هەیە.',
        'دەرگای سندووقی کارەبای خوارەوەی ستوونەکە کراوەتەوە و تێلەکان دیارن و مەترسیدارە بۆ منداڵان.',
        'پریشکەی کارەبا و دەنگ لە سەرەوەی ستوونەکە دێت بەتایبەت لە کاتی با و باراندا.',
        'تێکچوونی ئۆتۆماتیکی ڕووناکی وایکردووە گلۆپەکان بە ڕۆژ دابگیرسێن و بە شەو بکوژێنەوە.',
        'لقی درەختە بەرزەکان بەر تێل و گلۆپی ستوونەکە کەوتوون و ڕێگری لە بڵاوبوونەوەی ڕووناکی دەکەن.',
        'چوارڕیانە سەرەکییەکە لە شەواندا بە تەواوی تاریکە و شۆفێران بە زەحمەت پیادەڕەوان دەبینن.',
        'ئەم کۆڵانە ڕووناکی پێویستی تێدا نییە و لە شەودا زۆر تاریکە و پێویستی بە دانانی گلۆپی نوێ هەیە.',
        'ستوونی کارەبا لە تەنیشت یاریگای وەرزشی زۆر لار بووەتەوە و مەترسی کەوتنی هەیە.',
        'کێبڵێکی کارەبای مەترسیدار لەسەر زەوی کەوتووە و دانەپۆشراوە و پێویستی بە چارەسەری بەپەلەیە.',
        'دەروازەی سەرەکی باعدرێ لە شەواندا تاریکە بەهۆی تێکچوونی تابلۆی سەرەکی کارەباوە.',
        'شوشەی سەری گلۆپەکە شکاوە و هەڵواسراوە و مەترسی کەوتنی هەیە بەسەر خەڵکدا.',
      ],
      en: [
        'Streetlights have been completely dark for multiple nights causing safety hazards for pedestrians and drivers.',
        'Overhead electrical wire is sagging close to pedestrian level creating an acute electrocution danger.',
        'Light pole has been struck and is tilted at an acute angle, on the verge of falling onto the street.',
        'Flickering and burnt-out lamps require replacement with energy-efficient luminaires.',
        'The electrical junction box cover at the base of the pole is missing, leaving live wires exposed to children.',
        'Sparks and buzzing sounds coming from the top fixture of the pole, especially during wind or rain.',
        'Faulty photocell timer causes streetlights to stay lit all day and turn off after sunset.',
        'High tree branches are rubbing against streetlight cables and blocking illumination from the walkway.',
        'The main intersection is pitch dark at night, making it dangerous for pedestrians crossing the road.',
        'This residential passageway lacks adequate lighting fixtures and remains very dark throughout the night.',
        'Steel lighting pole sharply tilted near the youth playground, risking collapse onto visitors.',
        'Exposed heavy-duty electric cable lying bare on the ground surface, presenting extreme shock hazards.',
        'Main township entrance is completely dark at night due to a fault in the central distribution panel.',
        'Glass luminaire cover is fractured and dangling loosely, threatening to drop on pedestrians below.',
      ],
    },
  },
  sanitation: {
    titles: {
      ar: [
        'تراكم نفايات في الساحة',
        'حاوية نفايات ممتلئة',
        'حاوية قمامة مكسورة',
        'أغصان أشجار تعيق الطريق',
        'مخلفات بناء على الطريق',
        'صيانة ألعاب ومقاعد الحديقة',
        'يباس أشجار الحديقة',
        'حاجة لحاوية قمامة بالحي',
        'أتربة وأوساخ على الرصيف',
        'انتشار حشرات حول النفايات',
        'تراكم مخلفات حديقة عامة',
        'حاوية نفايات بلا غطاء أو عجلات',
        'إلقاء مخلفات قص الأشجار',
        'تجمع نفايات قرب المركز الصحي',
      ],
      ku: [
        'کۆبوونەوەی زبڵ لە گۆڕەپان',
        'سەبەتەی زبڵی پڕبوو',
        'سەبەتەی زبڵی شکاو',
        'لقی درەخت ڕێگری دەکات',
        'پاشماوەی بیناسازی لە قەراغ ڕێگا',
        'چاککردنی کورسی و یاری باخچە',
        'وشکبوونی درەختەکانی باخچە',
        'پێویستی سەبەتەی زبڵ بۆ گەڕەک',
        'کۆبوونەوەی خۆڵ لەسەر شۆستە',
        'بڵاوبوونەوەی مێروو لە دەوری زبڵ',
        'کۆبوونەوەی پاشماوەی باخچەی گشتی',
        'سەبەتەی زبڵی بێ سەر و تایە',
        'فڕێدانی لقی درەخت لەسەر شەقام',
        'کۆبوونەوەی زبڵ لای بنکەی تەندروستی',
      ],
      en: [
        'Accumulated trash in square',
        'Overflowing garbage bin',
        'Broken municipal trash bin',
        'Overgrown tree branches',
        'Construction rubble on roadside',
        'Park benches & play repair',
        'Park trees need watering',
        'Neighborhood needs trash bins',
        'Dirt & litter on sidewalk',
        'Pests around waste spot',
        'Park green waste accumulation',
        'Dumpster missing wheels & lid',
        'Pruned tree branches dumped',
        'Trash pile near health center',
      ],
    },
    descriptions: {
      ar: [
        'تراكمت أكوام كبيرة من القمامة والمخلفات المنزلية في الساحة وبجانب الرصيف مما يجذب الحشرات والروائح الكريهة.',
        'حاوية النفايات الخاصة بالحي ممتلئة وفائضة منذ أيام ولم تمر سيارة النظافة لرفعها ونرجو تفريغها بشكل عاجل.',
        'حاوية النفايات الحالية مكسورة ولا يمكن وضع الأكياس فيها مما أدى لرمي المخلفات على الأرض مباشرة.',
        'أغصان الأشجار الكثيفة متدلية على الشارع وتعيق رؤية السائقين في المنعطف وتتداخل مع أسلاك الكهرباء.',
        'تم إلقاء أنقاض ومخلفات بناء وأتربة على حافة الطريق العام مما شوه المنظر العام وضيق الشارع.',
        'مقاعد الجلوس وألعاب الأطفال في الحديقة العامة متضررة وبحاجة إلى صيانة وتنظيف لسلامة الأطفال.',
        'الأشجار والمساحات الخضراء في الجزرة الوسطية والحديقة تعاني من العطش واليباس وتحتاج إلى سقي وتقليم.',
        'الحي السكني يفتقر إلى حاويات نفايات كافية مما يضطر الأهالي لتجمع الأكياس عند زاوية الشارع.',
        'تراكم الأتربة والأكياس المتطايرة على طول السياج والرصيف العام ويحتاج الموقع إلى حملة كنس وتنظيف.',
        'تجمع الحشرات والقوارض حول موقع النفايات المفتوح ونأمل تنظيف المكان ورشه بالمبيدات الصحية.',
        'تراكم أكوام كبيرة من أوراق الشجر والمخلفات الخضراء داخل الحديقة العامة دون رفعها منذ أيام طويلة.',
        'حاوية النفايات الحديدية فقدت عجلاتها وغطاءها مما يجعلها غير صالحة للنقل الآمن عبر سيارات البلدية.',
        'قام بعض الأهالي بقص أشجارهم ورمي الأغصان الضخمة وسط ممر المشاة مما يغلق الطريق بالكامل.',
        'تراكم النفايات بجانب جدار المركز الصحي العام يهدد بانتشار العدوى ويتطلب رفعاً دورياً مستعجلاً.',
      ],
      ku: [
        'کۆمەڵێک زبڵ و پاشماوە لە گۆڕەپانەکە و تەنیشت شۆستە کۆبووەتەوە و بۆنی ناخۆش و مێرووی زۆری دروستکردووە.',
        'سەبەتەی زبڵی گەڕەکەکە چەند ڕۆژە پڕ بووە و ئۆتۆمبێلی خاوێنکردنەوە نەهاتووە و تکایە بە زوویی بەتاڵی بکەن.',
        'سەبەتەی زبڵەکە شکاوە و ناتوانرێت سکیپەکەی دابخرێت و زبڵەکە دەڕژێتە سەر زەوی.',
        'لقی دارە گەورەکان هاتووەتە سەر شەقامەکە و ڕێگری لە بینینی شۆفێران دەکات لە سووڕانەوەدا.',
        'پاشماوەی بیناسازی و خۆڵ لە قەراغی شەقامی گشتی فڕێدراوە و سیمای گەڕەکەکەی تێکداوە.',
        'کورسی دانیشتن و یارییەکانی منداڵان لە باخچەی گشتی تێکچوون و پێویستیان بە چاککردنەوە و خاوێنکردنەوە هەیە.',
        'دار و سەوزایی ناوەندی شەقام و باخچەکە وشک بوون و پێویستیان بە ئاودان و بڕین و خزمەتکردن هەیە.',
        'ئەم گەڕەکە سەبەتەی زبڵی پێویستی تێدا نییە و هاووڵاتیان ناچارن کیسەی زبڵ لە سووچی کۆڵان دابنێن.',
        'خۆڵ و کیسەی نایلۆن بە درێژایی شۆستە و پەرژینەکە کۆبووەتەوە و پێویستی بە هەڵمەتی ماڵین و پاککردنەوەیە.',
        'مێروو و مێشوولەی زۆر لە دەوری شوێنی زبڵەکە کۆبوونەتەوە و داواکارین پاک بکرێتەوە و دەرمانڕێژ بکرێت.',
        'کۆبوونەوەی گەڵا و پاشماوەی درەخت لە ناو باخچەی گشتی کە چەند ڕۆژە فڕێ نەدراوە.',
        'سەبەتەی ئاسنینی زبڵ تایەکانی شکاون و سەری نەماوە و بارکردنی ئەستەم بووە.',
        'بڕینی دار و فڕێدانی لقە گەورەکانی لەسەر ڕێگای پیادە کە هاتوچۆی بە تەواوی داخستووە.',
        'کۆبوونەوەی زبڵ لە نزیک دیواری بنکەی تەندروستی گشتی کە مەترسی تەندروستی دروست دەکات.',
      ],
      en: [
        'Large heaps of uncollected garbage and trash accumulating on the sidewalk causing noxious odors and pests.',
        'Neighborhood garbage container has been overflowing for days without collection, urgent emptying needed.',
        'The municipal dumpster is severely cracked and broken, forcing residents to deposit bags on the dirt ground.',
        'Dense tree branches overhang the road, blocking line-of-sight around corners and rubbing on power wires.',
        'Construction debris and dirt piles were dumped along the public roadside, narrowing the lane and spoiling the area.',
        'Benches and children play equipment in the public park are damaged and need repair and cleaning.',
        'Trees and green spaces along the median and park are drying out and require regular irrigation and pruning.',
        'The residential block lacks sufficient waste bins, causing trash bags to pile up at the street corner.',
        'Windblown litter and dust have accumulated along the curb and fence, requiring a street sweeping crew.',
        'Pests and insects are gathering around the open waste spot; urgent cleanup and sanitation spraying needed.',
        'Large heaps of trimmed foliage and green waste have accumulated inside the community park for days.',
        'Municipal metal dumpster missing lid and wheels, preventing proper mechanical lifting and emptying.',
        'Heavy tree clippings were discarded along the pedestrian lane, blocking the entire walkway.',
        'Accumulated garbage adjacent to the community health clinic perimeter requiring urgent removal.',
      ],
    },
  },
  other: {
    titles: {
      ar: [
        'تجاوز على الرصيف والشارع',
        'لوحة إرشادية مفقودة أو متضررة',
        'مبنى قديم مهجور وخطر',
        'ضوضاء ورشة داخل الحي',
        'حفرة أعمال مكشوفة',
        'سيارة متروكة تعيق الطريق',
        'سياج حماية متضرر',
        'مقترح تشجير ساحة بالحي',
        'عوائق إسمنتية في الطريق',
        'ملاحظة خدمية عامة',
        'لوحة سرعة مرورية تالفة',
        'مخلفات حدادة في طريق المشاة',
        'كلاب ضالة تتجمع قرب الحي',
        'سياج مدرسي منهار جزئياً',
      ],
      ku: [
        'زێدەڕۆیی سەر شۆستە و شەقام',
        'تابلۆی هاتوچۆ شکاوە یان نەماوە',
        'خانووی کۆنی مەترسیدار',
        'دەنگەدەنگی وەرشە لە گەڕەک',
        'چاڵی کارکردنی سەرنەپۆشراو',
        'ئۆتۆمبێلی جێهێڵدراو لەسەر ڕێگا',
        'تێکچوونی پەرژینی پارێزگاری',
        'پێشنیاری سەوزکردنی گۆڕەپان',
        'بەربەستی کۆنکریتی لەسەر ڕێگا',
        'تێبینی خزمەتگوزاری گشتی',
        'تابلۆی خێرایی هاتوچۆی تێکچوو',
        'پاشماوەی ئاسنگەری لەسەر شۆستە',
        'سەگی بێلانە لە دەوری گەڕەک',
        'داڕمانی بەشێک لە پەرژینی قوتابخانە',
      ],
      en: [
        'Sidewalk & road encroachment',
        'Damaged or missing street sign',
        'Hazardous abandoned building',
        'Workshop noise in neighborhood',
        'Unfenced open trench',
        'Abandoned car blocking road',
        'Damaged safety guardrail',
        'Square landscaping proposal',
        'Concrete blocks on roadway',
        'General civic service note',
        'Damaged speed limit sign',
        'Welding scrap on pedestrian path',
        'Stray dogs gathering near block',
        'Partially collapsed school fence',
      ],
    },
    descriptions: {
      ar: [
        'وجود تعديات ومواد بناء على الرصيف العام تعيق حركة المشاة وتجبر المواطنين على النزول إلى نهر الشارع.',
        'اللوحات المرورية والتسميات في هذا التقاطع مكسورة أو مفقودة مما يسبب تشتتاً للسائقين والزوار.',
        'مبنى قديم مهجور آيل للسقوط وتتساقط منه كتل خرسانية تشكل خطراً على حياة المارة وخاصة الأطفال.',
        'ورشة تعمل بمعدات صاخبة داخل الحي السكني في أوقات متأخرة نرجو متابعة الالتزام بالقوانين البلدية.',
        'توجد حفرة أعمال خدمية تُركت مكشوفة بدون أشرطة تحذيرية أو ردم مما يهدد سلامة السائقين والمارة ليلاً.',
        'هيكل سيارة قديمة متروكة منذ فترة طويلة على جانب الطريق يجمع الأوساخ ويعيق ركن المركبات وحركة المرور.',
        'سياج الحماية الحديدي على حافة المنحدر متضرر ومكسور ويحتاج إلى تثبيت وصيانة لحماية المركبات.',
        'نلتمس من البلدية تأهيل وتشجير هذه الساحة المتروكة في الحي لتكون متنفساً نظيفاً وآمناً للأهالي.',
        'وجود عوائق وحواجز إسمنتية قديمة متروكة في الطريق لم تعد لها حاجة وتعيق انسيابية السير.',
        'ملاحظة ميدانية عامة تتعلق بتحسين المظهر الحضري والسلامة العامة في هذا الموقع ونرجو الكشف الميداني.',
        'لوحة تحديد السرعة المرورية في الشارع العام ملتوية ومطموسة بفعل صدمة سابقة مما يربك السائقين.',
        'وجود قطع حديدية ومخلفات حادة ناتجة عن ورشة حدادة ملقاة على الرصيف العام تشكل خطورة على الأطفال.',
        'تجمع قطيع من الكلاب الضالة في الساحة المهجورة القريبة من المنازل مما يثير مخاوف الأهالي والأطفال.',
        'انهيار جزء من السياج الخارجي للمدرسة مما يسمح بدخول الحيوانات السائبة إلى باحة المدرسة العامة.',
      ],
      ku: [
        'کەلوپەلی بیناسازی لەسەر شۆستەی گشتی دانراوە و پیادەڕەوان ناچار دەبن بچنە ناوەڕاستی شەقام.',
        'تابلۆی ناوی شەقام و هێماکانی هاتوچۆ لەم چوارڕیانەدا شکاون یان دیارنین و دەبێتە هۆی تێکچوونی هاتوچۆ.',
        'خانوویەکی کۆنی چۆڵکراوە کە خەریکە دەڕووخێت و مەترسیدارە بۆ سەر ژیانی منداڵان و خەڵک.',
        'وەرشەیەک بە دەنگەدەنگی زۆر لەناو گەڕەکدا کار دەکات و بێزاری بۆ دانیشتووانی گەڕەک دروستکردووە.',
        'چاڵێکی کارکردن بە کراوەیی و بەبێ نیشانەی ئاگادارکردنەوە جێهێڵدراوە و لە شەودا مەترسی گەورەی هەیە.',
        'لاسی ئۆتۆمبێلێکی کۆن ماوەیەکی زۆرە لە قەراغ شەقام جێهێڵدراوە و بووەتە هۆی کۆبوونەوەی زبڵ و گرتنی ڕێگا.',
        'پەرژینی ئاسنی پارێزگاری قەراغی پرد و لێژاییەکە شکاوە و پێویستی بە چاککردنەوە هەیە بۆ سەلامەتی گشتی.',
        'داواکارین لە شارەوانی ئەم گۆڕەپانە چۆڵەی گەڕەک سەوز و ڕێکبخات بۆ ئەوەی ببێتە شوێنێکی پاک بۆ دانیشتووان.',
        'بەربەستی کۆنکریتی کۆن لەسەر ڕێگاکە جێهێڵدراوە و ئێستا پێویست نین و ئاستەنگی هاتوچۆ دروست دەکەن.',
        'تێبینییەکی گشتی مەیدانی سەبارەت بە باشترکردنی خزمەتگوزاری و سەلامەتی لەم شوێنەدا و تکایە بەدواداچوونی بۆ بکرێت.',
        'تابلۆی دیاریکردنی خێرایی لەسەر شەقامی گشتی لار بووەتەوە و هێماکەی دیار نییە.',
        'پارچەی ئاسنی تیژ و پاشماوەی وەرشەی ئاسنگەری لەسەر شۆستە کە مەترسیدارە بۆ منداڵان.',
        'کۆبوونەوەی سەگی بێلانە لە گۆڕەپانی چۆڵکراوی نزیک ماڵان کە ترس و دڵەڕاوکێی دروستکردووە.',
        'ڕووخانی بەشێک لە پەرژینی دەرەوەی قوتابخانە کە ڕێگە بە چوونەژوورەوەی ئاژەڵ بۆ حەوشەکە دەدات.',
      ],
      en: [
        'Construction material obstructing the sidewalk forcing pedestrians onto the busy road.',
        'Street name sign and traffic guidance boards are damaged or missing, confusing motorists.',
        'Dilapidated abandoned structure showing crumbling masonry that endangers passing pedestrians.',
        'Loud noise and activities from an unauthorized workshop disrupting residential tranquility.',
        'An open utility trench was left unfenced without warning tape or backfilling, endangering night traffic.',
        'An abandoned wrecked vehicle frame has been left on the roadside for months, trapping trash and blocking parking.',
        'The metal safety guardrail along the slope edge is broken and needs reinforcement to protect motorists.',
        'We kindly request the municipality to landscape and rehabilitate this vacant lot into a clean community space.',
        'Old unused concrete blocks left on the roadway are obstructing smooth vehicle movement.',
        'General civic field observation regarding urban safety and public utility improvement at this location.',
        'Traffic speed limit sign is bent and defaced from an earlier collision, confusing road users.',
        'Sharp scrap metal and workshop cuttings discarded across the public sidewalk endangering children.',
        'Pack of stray dogs roaming in an empty lot near homes, creating safety concerns for children and residents.',
        'Section of the school boundary wall has partially collapsed, compromising compound perimeter security.',
      ],
    },
  },
};

interface SelectedPhotoItem {
  id: string;
  previewUrl: string;
  file?: File;
  storageUrl?: string;
}

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
const TOTAL_STEPS = 9;

interface SubmitReportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingReport?: CivicReport | null;
  onSuccessSelectReport?: (report: CivicReport) => void;
}

export const SubmitReportWizardModal: React.FC<SubmitReportWizardModalProps> = ({
  isOpen,
  onClose,
  editingReport,
}) => {
  const { submitNewReport, updateCitizenReport, myReports, contactSettings } = useBaadre();
  const { language, dir, isRTL } = useLanguage();
  const { currentUser, profile, isAdmin, isSuperAdmin } = useAuth();

  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

  const [step, setStep] = useState<WizardStep>(1);

  // Step 1: الصور (يتم تحويلها إلى 500 كيلوبايت ورفعها إلى Storage عند النقر على التالي مع دائرة تحميل بدون نصوص)
  const [photoItems, setPhotoItems] = useState<SelectedPhotoItem[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isProcessingImagesOnNext, setIsProcessingImagesOnNext] = useState(false);
  const [maxLimitNotice, setMaxLimitNotice] = useState(false);

  // Step 2: اختر القطاع الخدمي المختص
  const [sector, setSector] = useState<ReportSector>('roads');
  const [customSector, setCustomSector] = useState('');
  const [sectorInfoModal, setSectorInfoModal] = useState<ReportSector | null>(null);

  // Step 3: عنوان البلاغ المختصر + وصف المشكلة الميدانية بالتفصيل
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [smartModalType, setSmartModalType] = useState<'title' | 'description' | null>(null);

  // Step 4: اعتماد الموقع (GPS)
  const [latitude, setLatitude] = useState<number>(BAADRE_CENTER_COORDS.lat);
  const [longitude, setLongitude] = useState<number>(BAADRE_CENTER_COORDS.lng);
  const [isFullScreenMapOpen, setIsFullScreenMapOpen] = useState(false);

  // Step 5: الحي أو القطاع + اسم الشارع + أقرب نقطة دالة
  const [neighborhood, setNeighborhood] = useState<string>('');
  const [isOtherNeighborhood, setIsOtherNeighborhood] = useState(false);
  const [customNeighborhood, setCustomNeighborhood] = useState('');
  const [showNeighborhoodSuggestions, setShowNeighborhoodSuggestions] = useState(false);
  const [showAllNeighborhoods, setShowAllNeighborhoods] = useState(false);
  const [street, setStreet] = useState('');
  const [showAllStreets, setShowAllStreets] = useState(false);
  const [showStreetSuggestions, setShowStreetSuggestions] = useState(false);
  const [landmark, setLandmark] = useState('');
  const [showAllLandmarks, setShowAllLandmarks] = useState(false);
  const [showLandmarkSuggestions, setShowLandmarkSuggestions] = useState(false);

  // Step 6: اسم المواطن الكامل + رقم الهاتف / واتساب للتنبيه
  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');

  // Step 7: مراجعة البيانات المدخلة بالتسلسل ثم إرسال رسالة واتساب وحفظ البلاغ
  const [createdReport, setCreatedReport] = useState<CivicReport | null>(null);
  const [isSent, setIsSent] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // تهيئة البيانات عند فتح النافذة (سواء لإضافة بلاغ جديد أو تعديل بلاغ للمواطن)
  useEffect(() => {
    if (!isOpen) return;
    if (editingReport) {
      // بعد إرسال البلاغ أو إنجازه أو تحديد حالته، لا يمكن التعديل
      if (editingReport.status !== 'pending' || isReportSentToDepartment(editingReport)) {
        onClose();
        return;
      }
      setStep(1);
      const existingImgs = editingReport.images || [];
      setUploadedImages(existingImgs);
      setPhotoItems(
        existingImgs.map((url, idx) => ({
          id: `existing-${idx}-${Date.now()}`,
          previewUrl: url,
          storageUrl: url,
        }))
      );
      setSector(editingReport.sector || 'roads');
      setCustomSector('');
      setTitle(editingReport.title || '');
      setDescription(editingReport.description || '');
      setLatitude(editingReport.latitude ?? BAADRE_CENTER_COORDS.lat);
      setLongitude(editingReport.longitude ?? BAADRE_CENTER_COORDS.lng);
      setNeighborhood(editingReport.neighborhood || '');
      setIsOtherNeighborhood(false);
      setCustomNeighborhood('');
      setStreet(editingReport.street || '');
      setLandmark(editingReport.landmark || '');
      setCitizenName(editingReport.citizenName || '');
      setCitizenPhone(editingReport.citizenPhone || '');
      setCreatedReport(null);
      setIsSent(false);
      setValidationError(null);
    } else {
      setStep(1);
      setPhotoItems([]);
      setUploadedImages([]);
      setSector('roads');
      setCustomSector('');
      setTitle('');
      setDescription('');
      setLatitude(BAADRE_CENTER_COORDS.lat);
      setLongitude(BAADRE_CENTER_COORDS.lng);
      setNeighborhood('');
      setIsOtherNeighborhood(false);
      setCustomNeighborhood('');
      setShowNeighborhoodSuggestions(false);
      setShowAllNeighborhoods(false);
      setStreet('');
      setShowAllStreets(false);
      setShowStreetSuggestions(false);
      setLandmark('');
      setShowAllLandmarks(false);
      setShowLandmarkSuggestions(false);
      setCitizenName(profile?.fullName || currentUser?.displayName || '');
      setCitizenPhone(profile?.phone || '');
      setCreatedReport(null);
      setIsSent(false);
      setValidationError(null);
    }
  }, [isOpen, editingReport?.id, profile?.fullName, profile?.phone, currentUser?.displayName]);

  const finalNeighborhoodVal =
    isOtherNeighborhood && customNeighborhood.trim()
      ? customNeighborhood.trim()
      : neighborhood.trim();

  if (!isOpen || !currentUser) return null;

  const handleRemoveImage = (indexToRemove: number) => {
    setPhotoItems((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setUploadedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setMaxLimitNotice(false);
  };

  // عند اختيار الصور في الخطوة 1: نعرض المعاينة فوراً، ويتم تحويلها إلى 500 كيلو ورفعها إلى Storage عند النقر على "التالي"
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = MAX_UPLOAD_IMAGES - photoItems.length;
    if (remainingSlots <= 0) {
      e.target.value = '';
      setMaxLimitNotice(true);
      setTimeout(() => setMaxLimitNotice(false), 3500);
      return;
    }

    const allSelected: File[] = Array.from(files);
    if (allSelected.length > remainingSlots) {
      setMaxLimitNotice(true);
      setTimeout(() => setMaxLimitNotice(false), 3500);
    }
    const allowedFiles: File[] = allSelected.slice(0, remainingSlots);
    e.target.value = '';

    const newItems: SelectedPhotoItem[] = allowedFiles.map((file, idx) => ({
      id: `local-${Date.now()}-${idx}`,
      previewUrl: URL.createObjectURL(file),
      file,
    }));

    setPhotoItems((prev) => [...prev, ...newItems].slice(0, MAX_UPLOAD_IMAGES));
  };

  const handleSaveAndSendWhatsApp = () => {
    playSuccessSound();
    let reportToDispatch = createdReport;

    const secName =
      sector === 'other' && customSector.trim()
        ? customSector.trim()
        : language === 'ku'
        ? SECTOR_META[sector].ku
        : language === 'en'
        ? SECTOR_META[sector].en
        : SECTOR_META[sector].labelAr;

    const finalNeighborhood =
      isOtherNeighborhood && customNeighborhood.trim()
        ? customNeighborhood.trim()
        : neighborhood.trim() || tr('مركز باعدرى', 'سەنتەری باعەدرێ', 'Baadre Center');

    const finalImagesList =
      uploadedImages.length > 0
        ? uploadedImages
        : photoItems.length > 0
        ? photoItems.map((p) => p.storageUrl || p.previewUrl)
        : [SECTOR_ILLUSTRATIONS[sector]];

    const reportPayload = {
      title:
        title.trim() ||
        tr(
          `بلاغ ${secName} في ${finalNeighborhood}`,
          `سکاڵای ${secName} لە ${finalNeighborhood}`,
          `${secName} Report in ${finalNeighborhood}`
        ),
      description: description.trim(),
      sector,
      urgency: editingReport?.urgency || ('normal' as const),
      neighborhood: finalNeighborhood,
      street: street.trim() || tr('الشارع الرئيسي', 'شەقامی سەرەکی', 'Main Street'),
      landmark: landmark.trim(),
      latitude,
      longitude,
      citizenName:
        citizenName.trim() || tr('مواطن من باعدرى', 'هاووڵاتی باعەدرێ', 'Baadre Citizen'),
      citizenPhone: citizenPhone.trim() || '07500000000',
      images: finalImagesList,
    };

    if (!reportToDispatch) {
      try {
        if (editingReport) {
          reportToDispatch =
            updateCitizenReport(editingReport.id, reportPayload) || editingReport;
        } else {
          reportToDispatch = submitNewReport(reportPayload);
        }
        setCreatedReport(reportToDispatch);
      } catch (err: any) {
        setValidationError(
          err?.message ||
            tr(
              'الحد الأقصى اليومي 3 بلاغات لكل مواطن.',
              'زۆرترین سنووری ڕۆژانە ٣ سکاڵایە بۆ هەر هاووڵاتییەک.',
              'Maximum daily limit is 3 reports per citizen.'
            )
        );
        return;
      }
    }

    if (reportToDispatch) {
      const msg = formatWhatsAppReportMessage(reportToDispatch);
      const url = `https://wa.me/${MUNICIPAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(
        msg
      )}`;
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsSent(true);
      handleResetAndClose();
    }
  };

  const handleNextStep = async () => {
    setValidationError(null);

    if (step === 1) {
      if (photoItems.length === 0) {
        setValidationError(
          tr(
            'يرجى إرفاق صورة واحدة على الأقل لتوثيق البلاغ الميداني.',
            'تکایە لانیکەم یەک وێنە هاوپێچ بکە بۆ بەڵگەی مەیدانی.',
            'Please attach at least one photo for field documentation.'
          )
        );
        return;
      }
      playClickSound();
      // إظهار دائرة التحميل اللطيفة بدون أي نصوص لتحويل الصور إلى 500 كيلوبايت ورفعها إلى Storage
      setIsProcessingImagesOnNext(true);
      try {

        const needsUpload = photoItems.some((item) => !item.storageUrl && item.file);
        if (!needsUpload) {
          await new Promise((r) => setTimeout(r, 400));
          const validUrls = photoItems
            .map((item) => item.storageUrl)
            .filter((url): url is string => Boolean(url && !url.startsWith('data:')));
          setUploadedImages(
            validUrls.length > 0
              ? validUrls
              : [SECTOR_ILLUSTRATIONS[sector] || SECTOR_ILLUSTRATIONS.other]
          );
        } else {
          const processedItems = await Promise.all(
            photoItems.map(async (item) => {
              if (item.storageUrl && !item.storageUrl.startsWith('data:')) return item;
              if (!item.file) return { ...item, storageUrl: '' };
              const compressedDataUrl = await compressImageFile(item.file, 500);
              const storageUrl = await uploadImageToFirebaseStorage(
                compressedDataUrl,
                'reports'
              );
              return {
                ...item,
                storageUrl: storageUrl && !storageUrl.startsWith('data:') ? storageUrl : '',
              };
            })
          );
          setPhotoItems(processedItems);
          const validUrls = processedItems
            .map((item) => item.storageUrl)
            .filter((url): url is string => Boolean(url && !url.startsWith('data:')));
          setUploadedImages(
            validUrls.length > 0
              ? validUrls
              : [SECTOR_ILLUSTRATIONS[sector] || SECTOR_ILLUSTRATIONS.other]
          );
        }
        setStep(2);
      } finally {
        setIsProcessingImagesOnNext(false);
      }
    } else if (step === 2) {
      if (sector === 'other' && !customSector.trim()) {
        setValidationError(
          tr(
            'يرجى تحديد نوع القطاع أو الخدمة المخصصة.',
            'تکایە ناوی کەرتە تایبەتەکە بنووسە.',
            'Please specify the custom sector.'
          )
        );
        return;
      }
      playClickSound();
      setStep(3);
    } else if (step === 3) {
      if (!title.trim()) {
        setValidationError(
          tr(
            'يرجى كتابة عنوان البلاغ المختصر.',
            'تکایە ناونیشانی کورتی سکاڵاکە بنووسە.',
            'Please enter a brief report title.'
          )
        );
        return;
      }
      playClickSound();
      setStep(4);
      setIsFullScreenMapOpen(true);
    } else if (step === 4) {
      playClickSound();
      setStep(5);
    } else if (step === 5) {
      // Step 5: الحي أو الزقاق (گەڕەکەکانی شارەوانی باعەدری)
      if (!finalNeighborhoodVal) {
        setValidationError(
          tr(
            'يرجى تحديد أو اختيار الحي / الزقاق.',
            'تکایە گەڕەک یان تاخەکە دیاری بکە.',
            'Please select or specify the neighborhood/quarter.'
          )
        );
        return;
      }
      playClickSound();
      setStep(6);
    } else if (step === 6) {
      // Step 6: اسم الشارع (ناوی شەقام)
      if (!street.trim()) {
        setValidationError(
          tr(
            'يرجى إدخال أو اختيار اسم الشارع.',
            'تکایە ناوی شەقام هەڵبژێرە یان بنووسە.',
            'Please select or enter street name.'
          )
        );
        return;
      }
      playClickSound();
      setStep(7);
    } else if (step === 7) {
      // Step 7: أقرب نقطة دالة (اختياري)
      playClickSound();
      setStep(8);
    } else if (step === 8) {
      // Step 8: بيانات المواطن والتنبيه
      if (!citizenName.trim()) {
        setValidationError(
          tr(
            'يرجى إدخال اسم المواطن الكامل.',
            'تکایە ناوی تەواوی هاووڵاتی بنووسە.',
            'Please enter full citizen name.'
          )
        );
        return;
      }
      const digitsOnly = citizenPhone.replace(/\D/g, '');
      if (!citizenPhone.trim() || digitsOnly.length < 10) {
        setValidationError(
          tr(
            'يرجى إدخال رقم الهاتف / واتساب للتنبيه لا يقل عن 10 أرقام.',
            'تکایە ژمارەی مۆبایل / واتسئەپ لانیکەم 10 ژمارە بنووسە.',
            'Please enter a valid phone / WhatsApp number with at least 10 digits.'
          )
        );
        return;
      }
      playClickSound();
      setStep(9);
    }
  };

  const handlePrevStep = () => {
    setValidationError(null);
    playClickSound();
    if (step > 1) {
      const prev = (step - 1) as WizardStep;
      setStep(prev);
      if (prev === 4) {
        setIsFullScreenMapOpen(true);
      }
    }
  };

  const handleResetAndClose = () => {
    setStep(1);
    setCreatedReport(null);
    setIsSent(false);
    setValidationError(null);
    setSectorInfoModal(null);
    setSmartModalType(null);
    setIsFullScreenMapOpen(false);
    setIsProcessingImagesOnNext(false);
    onClose();
  };

  const previewGalleryUrls = photoItems.map((p) => p.storageUrl || p.previewUrl);
  const currentSectorSuggestions =
    SMART_SECTOR_SUGGESTIONS[sector] || SMART_SECTOR_SUGGESTIONS.roads;
  const selectedSectorLabel =
    sector === 'other' && customSector.trim()
      ? customSector.trim()
      : language === 'ku'
      ? SECTOR_META[sector].ku
      : language === 'en'
      ? SECTOR_META[sector].en
      : SECTOR_META[sector].labelAr;

  const todayStr = new Date().toDateString();
  const todayCitizenReportsCount = myReports.filter((r) => {
    if (!r.createdAt) return false;
    const reportDate = new Date(r.createdAt);
    return !Number.isNaN(reportDate.getTime()) && reportDate.toDateString() === todayStr;
  }).length;

  const isCitizenAtMaxLimit =
    !editingReport && !createdReport && !isAdmin && !isSuperAdmin && todayCitizenReportsCount >= 3;

  if (isCitizenAtMaxLimit) {
    return (
      <AnimatePresence>
        <div
          dir={dir}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleResetAndClose}
            className="fixed inset-0 bg-[#1E3725]/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className={`relative w-full max-w-md bg-white border border-[#BBDDC6] rounded-3xl shadow-2xl p-6 z-10 text-center space-y-4`}
          >
            <div className="w-14 h-14 rounded-2xl bg-[#E8F4EA] text-[#46674D] flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-[#1E3725]">
                {tr(
                  'تم الوصول للحد الأقصى اليومي للبلاغات',
                  'گەیشتیتە زۆرترین سنووری ڕۆژانەی سکاڵاکان',
                  'Daily Report Limit Reached'
                )}
              </h3>
              <p className="text-xs font-bold text-[#46674D] leading-relaxed">
                {tr(
                  'يُسمح لكل مواطن مسجل بإضافة 3 بلاغات يومياً كحد أقصى.',
                  'هەر هاووڵاتییەکی تۆمارکراو دەتوانێت ڕۆژانە تا ٣ سکاڵا زیاد بکات.',
                  'Each registered citizen can submit up to 3 reports per day.'
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetAndClose}
              className="w-full py-2.5 rounded-xl bg-[#46674D] hover:bg-[#36593F] text-white text-xs font-black transition-all cursor-pointer"
            >
              {tr('حسناً، إغلاق', 'باشە، داخستن', 'OK, Close')}
            </button>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <div
        dir={dir}
        className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleResetAndClose}
          className="fixed inset-0 bg-[#1E3725]/35 backdrop-blur-sm"
        />

        {/* نافذة لطيفة بدون نصوص فيها دائرة تدور لتحويل الصور إلى 500 كيلو ورفعها إلى Storage */}
        <AnimatePresence>
          {isProcessingImagesOnNext && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[160] bg-black/35 backdrop-blur-xs flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-20 h-20 rounded-3xl bg-white/95 border border-[#BBDDC6] shadow-2xl flex items-center justify-center"
              >
                <div className="w-10 h-10 rounded-full border-4 border-[#E8F4EA] border-t-[#46674D] animate-spin" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className={`relative w-full max-w-2xl bg-white border border-[#BBDDC6] rounded-3xl shadow-[0_20px_60px_rgba(70,103,77,0.22)] overflow-hidden z-10 my-auto max-h-[90vh] flex flex-col ${
            isRTL ? 'text-right' : 'text-left'
          }`}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#BBDDC6]/70 bg-gradient-to-l from-[#E8F4EA] via-[#F4F9F5] to-white flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span
                  dir="ltr"
                  className="px-2.5 py-0.5 rounded-full bg-[#46674D] text-white text-[10px] font-mono font-black tabular-nums"
                >
                  {step} / {TOTAL_STEPS}
                </span>
                {editingReport && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                    {tr('تعديل البلاغ', 'دەستکاری سکاڵا', 'Edit Report')}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black text-[#1E3725] mt-1">
                {step === 1 &&
                  tr(
                    'إرفاق صور البلاغ',
                    'هاوپێچکردنی وێنەکانی سکاڵا',
                    'Attach Report Photos'
                  )}
                {step === 2 &&
                  tr(
                    'اختر القطاع الخدمي المختص:',
                    'کەرتی خزمەتگوزاری پەیوەندیدار هەڵبژێرە:',
                    'Select Relevant Service Sector:'
                  )}
                {step === 3 &&
                  tr(
                    'عنوان البلاغ ووصف المشكلة',
                    'ناونیشان و وەسفی کێشەکە',
                    'Report Title & Problem Description'
                  )}
                {step === 4 &&
                  tr(
                    'اعتماد الموقع',
                    'پەسەندکردنی شوێن',
                    'Confirm Location'
                  )}
                {step === 5 &&
                  tr(
                    'الحي أو الزقاق (گەڕەکەکانی شارەوانی)',
                    'گەڕەک یان تاخ (شارەوانی باعەدری)',
                    'Neighborhood / Quarter (Baadre)'
                  )}
                {step === 6 &&
                  tr(
                    'اسم الشارع (اسماء الشوارع)',
                    'ناوی شەقام (شەقامەکانی باعەدرێ)',
                    'Street Name in Baadre'
                  )}
                {step === 7 &&
                  tr(
                    'أقرب نقطة دالة (اختياري)',
                    'نزیکترین خاڵ (ئارەزوومەندانە)',
                    'Nearest Landmark (Optional)'
                  )}
                {step === 8 &&
                  tr(
                    'بيانات المواطن والتنبيه',
                    'زانیاری هاووڵاتی و ئاگادارکردنەوە',
                    'Citizen Details & Contact'
                  )}
                {step === 9 &&
                  tr(
                    'مراجعة البيانات المدخلة وحفظ البلاغ',
                    'پێداچوونەوەی زانیارییەکان و پاشەکەوتکردن',
                    'Review Entered Data & Save Report'
                  )}
              </h2>
            </div>

            <button
              type="button"
              onClick={handleResetAndClose}
              className="p-2 rounded-full bg-[#E8F4EA] hover:bg-[#D4EADB] text-[#2D4833] transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-[#E8F4EA] flex">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((idx) => (
              <div
                key={idx}
                className={`flex-1 transition-all duration-300 ${
                  step >= idx
                    ? 'bg-gradient-to-r from-[#0D9488] to-[#14B8A6]'
                    : 'bg-transparent'
                }`}
              />
            ))}
          </div>

          {/* Wizard Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
            {/* ═══════════════════════════════════════════════════════════════════════
                الخطوة 1: تحديد الصور
               ═══════════════════════════════════════════════════════════════════════ */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-[#F4F9F5] border border-dashed border-[#46674D] text-center space-y-3.5 shadow-2xs">
                  <div className="w-14 h-14 rounded-2xl bg-[#E8F4EA] border border-[#BBDDC6] flex items-center justify-center mx-auto text-[#46674D] shadow-xs">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#1E3725]">
                      {tr(
                        'إرفاق صور البلاغ الميداني',
                        'هاوپێچکردنی وێنەی سکاڵای مەیدانی',
                        'Attach Field Report Photos'
                      )}
                    </p>
                    <p className="text-[11px] font-bold text-[#46674D] mt-1">
                      {tr(
                        'يمكنك إدراج حتى 10 صور من موقع البلاغ الميداني',
                        'دەتوانیت تا ١٠ وێنە لە شوێنی سکاڵاکە هاوپێچ بکەیت',
                        'Attach up to 10 photos from the field report site'
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {photoItems.length < MAX_UPLOAD_IMAGES ? (
                      <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#46674D] hover:bg-[#36593F] text-white font-black text-xs cursor-pointer shadow-xs transition-all active:scale-95">
                        <Upload className="w-4 h-4" />
                        <span>
                          {tr(
                            `اختيار صور من الجهاز (${photoItems.length}/${MAX_UPLOAD_IMAGES})`,
                            `هەڵبژاردنی وێنە (${photoItems.length}/${MAX_UPLOAD_IMAGES})`,
                            `Select Photos (${photoItems.length}/${MAX_UPLOAD_IMAGES})`
                          )}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => {
                            setValidationError(null);
                            handleImageSelect(e);
                          }}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-black">
                        {tr(
                          'وصلت إلى الحد الأقصى المسموح به (10 صور فقط)',
                          'گەیشتیتە زۆرترین ژمارەی ڕێگەپێدراو (تەنها 10 وێنە)',
                          'Maximum limit reached (10 photos only)'
                        )}
                      </div>
                    )}
                  </div>

                  {maxLimitNotice && (
                    <div className="py-2 px-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-black">
                      {tr(
                        'تنبيه: يسمح بإدراج 10 صور كحد أقصى لكل بلاغ فقط.',
                        'ئاگاداری: تەنها 10 وێنە ڕێگەپێدراوە بۆ هەر سکاڵایەک.',
                        'Notice: Maximum 10 photos allowed per report.'
                      )}
                    </div>
                  )}

                  {photoItems.length > 0 && (
                    <div className="space-y-2 pt-2 text-start">
                      <div className="flex items-center justify-between text-xs font-bold text-[#1E3725] px-1">
                        <span>
                          {tr(
                            `الصور المحددة (${photoItems.length} / ${MAX_UPLOAD_IMAGES}):`,
                            `وێنە دیاریکراوەکان (${photoItems.length} / ${MAX_UPLOAD_IMAGES}):`,
                            `Selected Photos (${photoItems.length} / ${MAX_UPLOAD_IMAGES}):`
                          )}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {photoItems.map((item, i) => (
                          <div
                            key={item.id}
                            className="group relative aspect-video rounded-xl overflow-hidden border border-[#BBDDC6] shadow-2xs bg-[#1E3725]"
                          >
                            <SmartAdaptiveImage
                              src={item.storageUrl || item.previewUrl}
                              alt={`attachment-${i + 1}`}
                              gallery={previewGalleryUrls}
                              initialIndex={i}
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveImage(i);
                              }}
                              className="absolute top-1.5 right-1.5 z-20 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 transition-all cursor-pointer"
                              title={tr('حذف الصورة', 'سڕینەوەی وێنە', 'Remove photo')}
                            >
                              <X className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                            <span
                              dir="ltr"
                              className="absolute bottom-1 left-1.5 z-20 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono pointer-events-none"
                            >
                              #{i + 1}/{MAX_UPLOAD_IMAGES}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                الخطوة 2: اختر القطاع الخدمي المختص:
               ═══════════════════════════════════════════════════════════════════════ */}
            {step === 2 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F4F9F5] border border-[#BBDDC6] space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="block text-xs sm:text-sm font-black text-[#1E3725]">
                    {tr(
                      'اختر القطاع الخدمي المختص:',
                      'کەرتی خزمەتگوزاری پەیوەندیدار هەڵبژێرە:',
                      'Select Relevant Service Sector:'
                    )}
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {Object.values(SECTOR_META).map((item) => {
                    const isSelected = sector === item.key;
                    const IconComp = SECTOR_ICONS[item.key];
                    const itemTitle =
                      language === 'ku'
                        ? item.ku
                        : language === 'en'
                        ? item.en
                        : item.labelAr;
                    return (
                      <div
                        key={item.key}
                        onClick={() => {
                          setValidationError(null);
                          playClickSound();
                          setSector(item.key);
                        }}
                        className={`group p-3 rounded-2xl border transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                          isRTL ? 'text-right' : 'text-left'
                        } ${
                          isSelected
                            ? 'bg-[#E8F4EA] border-[#46674D] shadow-xs'
                            : 'bg-white border-[#BBDDC6] hover:bg-[#E8F4EA]/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-[#46674D] text-white shadow-2xs'
                                : 'bg-[#F4F9F5] text-[#2D4833] border border-[#BBDDC6]/40 shadow-2xs'
                            }`}
                          >
                            <IconComp className="w-4.5 h-4.5 stroke-[2.2]" />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                playClickSound();
                                setSectorInfoModal(item.key);
                              }}
                              title={tr(
                                'أمثلة لاختيار هذا القطاع',
                                'نموونەی ئەم کەرتە',
                                'Examples for this sector'
                              )}
                              className="w-6 h-6 rounded-full bg-white hover:bg-[#D4EADB] text-[#1E3725] hover:text-[#46674D] flex items-center justify-center font-black text-xs border border-[#BBDDC6] shadow-2xs transition-all hover:scale-110 active:scale-95 cursor-pointer"
                            >
                              !
                            </button>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-[#46674D] shrink-0" />
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-black text-[#1E3725] leading-snug">
                            {itemTitle}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {sector === 'other' && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-2xl bg-[#E8F4EA] border border-[#88B793] space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <label className="block text-xs font-black text-[#1E3725]">
                          {tr(
                            'حدد نوع القطاع أو الخدمة المخصصة المطلوبة:',
                            'جۆری کەرت یان خزمەتگوزارییە تایبەتەکە بنووسە:',
                            'Specify Custom Sector or Requested Service:'
                          )}
                        </label>
                      </div>
                      <FieldLimitBadge
                        value={customSector}
                        maxWords={FIELD_LIMITS.LOCATION.maxWords}
                        maxChars={FIELD_LIMITS.LOCATION.maxChars}
                      />
                    </div>
                    <input
                      type="text"
                      maxLength={FIELD_LIMITS.LOCATION.maxChars}
                      value={customSector}
                      onChange={(e) => {
                        setValidationError(null);
                        setCustomSector(
                          enforceInputLimit(
                            e.target.value,
                            FIELD_LIMITS.LOCATION.maxWords,
                            FIELD_LIMITS.LOCATION.maxChars
                          )
                        );
                      }}
                      placeholder={tr(
                        'اكتب اسم القطاع أو الخدمة...',
                        'ناوی کەرت یان خزمەتگوزارییەکە بنووسە...',
                        'Write sector/service name...'
                      )}
                      className="w-full bg-white border border-[#BBDDC6] rounded-xl px-3.5 py-2 text-xs font-bold text-[#1E3725] placeholder-[#46674D]/60 focus:border-[#46674D] focus:outline-none"
                    />
                  </motion.div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                الخطوة 3: كارت عنوان البلاغ المختصر + وصف المشكلة الميدانية بالتفصيل
               ═══════════════════════════════════════════════════════════════════════ */}
            {step === 3 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F4F9F5] border border-[#BBDDC6] space-y-4 shadow-2xs">
                {/* 1. عنوان البلاغ مع زر اختيارات ذكية فقط بدون تكرار */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <label className="block text-xs sm:text-sm font-black text-[#1E3725]">
                        {tr(
                          'عنوان البلاغ المختصر:',
                          'ناونیشانی کورتی سکاڵا:',
                          'Brief Report Title:'
                        )}
                      </label>
                      {/* زر اختيارات ذكية */}
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setSmartModalType('title');
                        }}
                        className="group inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl bg-white hover:bg-[#E2EEF9] text-[#1E75BB] hover:text-[#14558A] border border-[#BBDDC6] hover:border-[#1E75BB] transition-all active:scale-95 shadow-2xs cursor-pointer"
                      >
                        <span className="w-4.5 h-4.5 rounded-full bg-[#1E75BB] text-white flex items-center justify-center font-black text-xs shadow-2xs group-hover:scale-110 transition-transform">
                          !
                        </span>
                        <span className="text-[11px] font-black">
                          {tr('اختيارات ذكية', 'بژاردەی زیرەک', 'Smart Choices')}
                        </span>
                        <Sparkles className="w-3.5 h-3.5 text-[#1E75BB]" />
                      </button>
                    </div>
                    <FieldLimitBadge
                      value={title}
                      maxWords={FIELD_LIMITS.TITLE.maxWords}
                      maxChars={FIELD_LIMITS.TITLE.maxChars}
                    />
                  </div>
                  <input
                    type="text"
                    maxLength={FIELD_LIMITS.TITLE.maxChars}
                    value={title}
                    onChange={(e) => {
                      setValidationError(null);
                      setTitle(
                        enforceInputLimit(
                          e.target.value,
                          FIELD_LIMITS.TITLE.maxWords,
                          FIELD_LIMITS.TITLE.maxChars
                        )
                      );
                    }}
                    placeholder={tr(
                      `مثال: عطل أو صيانة مطلوبة في ${selectedSectorLabel}`,
                      `نموونە: کێشە یان چاککردنەوە لە ${selectedSectorLabel}`,
                      `Example: Maintenance needed in ${selectedSectorLabel}`
                    )}
                    className="w-full bg-white border border-[#BBDDC6] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] placeholder-[#46674D]/60 focus:border-[#46674D] focus:outline-none"
                  />
                </div>

                {/* 2. وصف المشكلة مع زر نماذج تفاصيل ذكية فقط بدون تكرار */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <label className="block text-xs sm:text-sm font-black text-[#1E3725]">
                        {tr(
                          'وصف المشكلة الميدانية بالتفصيل:',
                          'وەسفی کێشە مەیدانییەکە بە وردی:',
                          'Detailed Field Problem Description:'
                        )}
                      </label>
                      {/* زر نماذج تفاصيل ذكية */}
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setSmartModalType('description');
                        }}
                        className="group inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl bg-white hover:bg-[#E2EEF9] text-[#1E75BB] hover:text-[#14558A] border border-[#BBDDC6] hover:border-[#1E75BB] transition-all active:scale-95 shadow-2xs cursor-pointer"
                      >
                        <span className="w-4.5 h-4.5 rounded-full bg-[#1E75BB] text-white flex items-center justify-center font-black text-xs shadow-2xs group-hover:scale-110 transition-transform">
                          !
                        </span>
                        <span className="text-[11px] font-black">
                          {tr('نماذج تفاصيل ذكية', 'مۆدێلی وردەکاری زیرەک', 'Smart Details')}
                        </span>
                        <Sparkles className="w-3.5 h-3.5 text-[#1E75BB]" />
                      </button>
                      <span className="px-1.5 py-0.2 rounded bg-[#E8F4EA] text-[#46674D] text-[10px] font-bold border border-[#BBDDC6]">
                        {tr('(اختياري)', '(ئارەزوومەندانە)', '(Optional)')}
                      </span>
                    </div>
                    <FieldLimitBadge
                      value={description}
                      maxWords={FIELD_LIMITS.DESCRIPTION.maxWords}
                      maxChars={FIELD_LIMITS.DESCRIPTION.maxChars}
                    />
                  </div>
                  <textarea
                    rows={4}
                    maxLength={FIELD_LIMITS.DESCRIPTION.maxChars}
                    value={description}
                    onChange={(e) =>
                      setDescription(
                        enforceInputLimit(
                          e.target.value,
                          FIELD_LIMITS.DESCRIPTION.maxWords,
                          FIELD_LIMITS.DESCRIPTION.maxChars
                        )
                      )
                    }
                    placeholder={tr(
                      'اشرح طبيعة المشكلة الميدانية وأثرها ليتم توجيه الفريق المختص بالمعدات المناسبة...',
                      'سروشتی کێشەکە و کاریگەرییەکانی ڕوون بکەرەوە بۆ ئاڕاستەکردنی تیمی تایبەتمەند...',
                      'Describe the field problem and its impact so the right team and equipment can be dispatched...'
                    )}
                    className="w-full bg-white border border-[#BBDDC6] rounded-xl p-3 text-xs font-bold text-[#1E3725] placeholder-[#46674D]/60 focus:border-[#46674D] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                الخطوة 4: اعتماد الموقع
               ═══════════════════════════════════════════════════════════════════════ */}
            {step === 4 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F4F9F5] border border-[#BBDDC6] space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="block text-xs sm:text-sm font-black text-[#1E3725]">
                    {tr(
                      'اعتماد الموقع:',
                      'پەسەندکردنی شوێن:',
                      'Confirm Location:'
                    )}
                  </label>
                  <span
                    dir="ltr"
                    className="text-[11px] font-mono font-bold text-[#46674D] bg-white px-2.5 py-0.5 rounded-lg border border-[#BBDDC6]"
                  >
                    {latitude.toFixed(5)}, {longitude.toFixed(5)}
                  </span>
                </div>

                <EmbeddedGoogleMapPreviewCard
                  latitude={latitude}
                  longitude={longitude}
                  onSelectLocation={(lat, lng) => {
                    setLatitude(lat);
                    setLongitude(lng);
                  }}
                  onOpenFullScreen={() => setIsFullScreenMapOpen(true)}
                />
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                الخطوة 5: الحي أو الزقاق (گەڕەکەکانی شارەوانی باعەدری)
               ═══════════════════════════════════════════════════════════════════════ */}
            {step === 5 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F4F9F5] border border-[#BBDDC6] space-y-4 shadow-2xs">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <label className="block text-xs sm:text-sm font-black text-[#1E3725]">
                        {tr(
                          'الحي / الزقاق (گەڕەکەکانی شارەوانی باعەدری):',
                          'گەڕەک یان تاخ (شارەوانی باعەدری):',
                          'Neighborhood / Quarter (Baadre Municipality):'
                        )}
                      </label>
                      <p className="text-[11px] text-teal-800 font-medium mt-0.5">
                        {tr(
                          'اختر الحي أو الزقاق من القائمة أدناه أو ابحث عنه مباشرة',
                          'تاخ یان گەڕەک لە لیستەکەی خوارەوە هەڵبژێرە یان ڕاستەوخۆ بگەڕێ',
                          'Select the neighborhood/quarter from the list below or search directly'
                        )}
                      </p>
                    </div>
                    <FieldLimitBadge
                      value={neighborhood}
                      maxWords={FIELD_LIMITS.LOCATION.maxWords}
                      maxChars={FIELD_LIMITS.LOCATION.maxChars}
                    />
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      maxLength={FIELD_LIMITS.LOCATION.maxChars}
                      value={neighborhood}
                      onFocus={() => setShowNeighborhoodSuggestions(true)}
                      onChange={(e) => {
                        setValidationError(null);
                        const val = enforceInputLimit(
                          e.target.value,
                          FIELD_LIMITS.LOCATION.maxWords,
                          FIELD_LIMITS.LOCATION.maxChars
                        );
                        setNeighborhood(val);
                        setShowNeighborhoodSuggestions(true);
                        const lower = val.trim().toLowerCase();
                        if (
                          lower === 'أخرى' ||
                          lower === 'اخرى' ||
                          lower === 'other' ||
                          lower === 'هیتر'
                        ) {
                          setIsOtherNeighborhood(true);
                        } else if (isOtherNeighborhood && !customNeighborhood) {
                          setIsOtherNeighborhood(false);
                        }
                      }}
                      placeholder={tr(
                        'اختر من القائمة أو اكتب اسم الحي / الزقاق...',
                        'لە لیستەکە هەڵبژێرە یان ناوی تاخ / گەڕەک بنووسە...',
                        'Select from list or type neighborhood / quarter...'
                      )}
                      className="w-full bg-white border border-[#BBDDC6] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all"
                    />

                    {neighborhood && (
                      <button
                        type="button"
                        onClick={() => {
                          setValidationError(null);
                          setNeighborhood('');
                          setIsOtherNeighborhood(false);
                        }}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-[#46674D] hover:text-red-600 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {showNeighborhoodSuggestions && (
                      <div className="absolute top-full mt-1.5 left-0 right-0 z-30 bg-white border border-[#BBDDC6] rounded-2xl shadow-[0_10px_30px_rgba(70,103,77,0.18)] max-h-56 overflow-y-auto p-1.5">
                        {BAADRE_NEIGHBORHOODS.filter((n) => {
                          const q = neighborhood.trim().toLowerCase();
                          if (!q) return true;
                          return (
                            n.name.toLowerCase().includes(q) ||
                            n.ku.toLowerCase().includes(q) ||
                            n.ar.toLowerCase().includes(q)
                          );
                        }).map((n) => {
                          const nName = language === 'ku' ? n.ku : n.name;
                          return (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => {
                                setValidationError(null);
                                playClickSound();
                                setNeighborhood(nName);
                                setIsOtherNeighborhood(false);
                                setShowNeighborhoodSuggestions(false);
                              }}
                              className="w-full text-start px-3 py-2 rounded-xl text-xs font-bold text-[#1E3725] hover:bg-teal-50 hover:text-teal-800 transition-colors flex items-center justify-between cursor-pointer"
                            >
                              <span>{nName}</span>
                              <span className="text-[10px] text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-md font-mono">
                                {tr('حي رسمي', 'تاخی فەرمی', 'Official')}
                              </span>
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => {
                            setValidationError(null);
                            playClickSound();
                            setNeighborhood(tr('أخرى', 'هیتر', 'Other'));
                            setIsOtherNeighborhood(true);
                            setShowNeighborhoodSuggestions(false);
                          }}
                          className="w-full text-start px-3 py-2 rounded-xl text-xs font-black text-[#46674D] bg-[#E8F4EA]/60 hover:bg-[#E8F4EA] transition-colors flex items-center justify-between cursor-pointer border-t border-[#E8F4EA] mt-1"
                        >
                          <span>
                            {tr(
                              'أخرى (حي أو قرية أخرى في باعدرى)',
                              'هیتر (گەڕەک یان گوندێکی تر)',
                              'Other (custom location)'
                            )}
                          </span>
                          <span className="text-[10px] bg-[#46674D] text-white px-2 py-0.5 rounded-full font-bold">
                            +
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* أزرار سريعة للأحياء */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(showAllNeighborhoods
                      ? BAADRE_NEIGHBORHOODS
                      : BAADRE_NEIGHBORHOODS.slice(0, 5)
                    ).map((n) => {
                      const nName = language === 'ku' ? n.ku : n.name;
                      const isCurrent = neighborhood === nName;
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            setValidationError(null);
                            playClickSound();
                            setNeighborhood(nName);
                            setIsOtherNeighborhood(false);
                            setShowNeighborhoodSuggestions(false);
                          }}
                          className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isCurrent
                              ? 'bg-teal-700 text-white shadow-xs border border-teal-800 ring-2 ring-teal-300'
                              : 'bg-white hover:bg-teal-50 text-[#1E3725] border border-[#BBDDC6] hover:border-teal-400'
                          }`}
                        >
                          {isCurrent && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          <span>{nName}</span>
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setShowAllNeighborhoods((prev) => !prev);
                      }}
                      className="px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 shadow-2xs hover:border-teal-500"
                    >
                      {!showAllNeighborhoods ? (
                        <>
                          <span>{tr('+ مزيد', '+ زێدەتر', '+ More')}</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          <span>{tr('عرض أقل', 'کەمتر نیشان بدە', 'Show less')}</span>
                          <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>

                  {(isOtherNeighborhood ||
                    neighborhood === 'أخرى' ||
                    neighborhood === 'هیتر' ||
                    neighborhood === 'Other') && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-2xl bg-[#E8F4EA] border border-[#88B793] space-y-1.5 shadow-2xs mt-2"
                    >
                      <input
                        type="text"
                        maxLength={FIELD_LIMITS.LOCATION.maxChars}
                        value={customNeighborhood}
                        onChange={(e) => {
                          setValidationError(null);
                          setCustomNeighborhood(
                            enforceInputLimit(
                              e.target.value,
                              FIELD_LIMITS.LOCATION.maxWords,
                              FIELD_LIMITS.LOCATION.maxChars
                            )
                          );
                        }}
                        placeholder={tr(
                          'اكتب اسم الحي أو القرية في باعدرى...',
                          'ناوی گەڕەک یان گوندەکە بنووسە...',
                          'Type custom neighborhood or village...'
                        )}
                        className="w-full bg-white border border-[#BBDDC6] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] focus:border-teal-600 focus:outline-none"
                      />
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                الخطوة 6: اسم الشارع في باعذرة (21 شارع معتمد: 5 جاهزة + زر مزيد)
               ═══════════════════════════════════════════════════════════════════════ */}
            {step === 6 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F4F9F5] border border-[#BBDDC6] space-y-4 shadow-2xs">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <label className="block text-xs sm:text-sm font-black text-[#1E3725]">
                          {tr('اسم الشارع في باعذرة:', 'ناوی شەقام لە باعەدرێ:', 'Street Name in Baadre:')}
                        </label>
                        <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                          {tr('21 شارع معتمد', '21 شەقامی فەرمی', '21 Official Streets')}
                        </span>
                      </div>
                      <p className="text-[11px] text-teal-800 font-medium mt-0.5">
                        {tr(
                          'اختر اسم الشارع من الخيارات السريعة أدناه أو اكتبه في الحقل',
                          'ناوی شەقام لە هەڵبژاردنە خێراکان هەڵبژێرە یان لە خانەکەدا بنووسە',
                          'Select street name from quick options below or type it in'
                        )}
                      </p>
                    </div>
                    <FieldLimitBadge
                      value={street}
                      maxWords={FIELD_LIMITS.LOCATION.maxWords}
                      maxChars={FIELD_LIMITS.LOCATION.maxChars}
                    />
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      maxLength={FIELD_LIMITS.LOCATION.maxChars}
                      value={street}
                      onFocus={() => setShowStreetSuggestions(true)}
                      onChange={(e) => {
                        setValidationError(null);
                        setStreet(
                          enforceInputLimit(
                            e.target.value,
                            FIELD_LIMITS.LOCATION.maxWords,
                            FIELD_LIMITS.LOCATION.maxChars
                          )
                        );
                        setShowStreetSuggestions(true);
                      }}
                      placeholder={tr(
                        'اختر من القائمة أدناه أو اكتب اسم الشارع...',
                        'لە لیستەکەی خوارەوە هەڵبژێرە یان ناوی شەقام بنووسە...',
                        'Select from list below or type street name...'
                      )}
                      className="w-full bg-white border border-[#BBDDC6] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all"
                    />

                    {street && (
                      <button
                        type="button"
                        onClick={() => {
                          setValidationError(null);
                          setStreet('');
                        }}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-[#46674D] hover:text-red-600 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {showStreetSuggestions && street.trim() && (
                      <div className="absolute top-full mt-1.5 left-0 right-0 z-30 bg-white border border-[#BBDDC6] rounded-2xl shadow-[0_10px_30px_rgba(70,103,77,0.18)] max-h-48 overflow-y-auto p-1.5">
                        {BAADRE_STREETS.filter((s) =>
                          s.toLowerCase().includes(street.trim().toLowerCase())
                        ).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setValidationError(null);
                              playClickSound();
                              setStreet(s);
                              setShowStreetSuggestions(false);
                            }}
                            className="w-full text-start px-3 py-2 rounded-xl text-xs font-bold text-[#1E3725] hover:bg-teal-50 hover:text-teal-800 transition-colors flex items-center justify-between cursor-pointer"
                          >
                            <span>{s}</span>
                            <span className="text-[10px] text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-md">
                              {tr('شارع', 'شەقام', 'Street')}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 5 كلمات جاهزة + نص مزيد لعرض جميع الشوارع الـ 21 */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(showAllStreets ? BAADRE_STREETS : BAADRE_STREETS.slice(0, 5)).map(
                      (streetName) => {
                        const isCurrent = street === streetName;
                        return (
                          <button
                            key={streetName}
                            type="button"
                            onClick={() => {
                              setValidationError(null);
                              playClickSound();
                              setStreet(streetName);
                              setShowStreetSuggestions(false);
                            }}
                            className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              isCurrent
                                ? 'bg-teal-700 text-white shadow-xs border border-teal-800 ring-2 ring-teal-300'
                                : 'bg-white hover:bg-teal-50 text-[#1E3725] border border-[#BBDDC6] hover:border-teal-400'
                            }`}
                          >
                            {isCurrent && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            <span>{streetName}</span>
                          </button>
                        );
                      }
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setShowAllStreets((prev) => !prev);
                      }}
                      className="px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 shadow-2xs hover:border-teal-500"
                    >
                      {!showAllStreets ? (
                        <>
                          <span>{tr('+ مزيد', '+ زێدەتر', '+ More')}</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          <span>{tr('عرض أقل', 'کەمتر نیشان بدە', 'Show less')}</span>
                          <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                الخطوة 7: أقرب نقطة دالة (13 نقطة دالة: 5 جاهزة + زر مزيد) - اختياري
               ═══════════════════════════════════════════════════════════════════════ */}
            {step === 7 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F4F9F5] border border-[#BBDDC6] space-y-4 shadow-2xs">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <label className="block text-xs sm:text-sm font-black text-[#1E3725]">
                          {tr(
                            'أقرب نقطة دالة (مدرسة، دائرة، قاعة، مركز...):',
                            'نزیکترین خاڵ (قوتابخانە، فەرمانگە، هۆڵ، سەنتەر...):',
                            'Nearest Landmark (School, Dept, Hall, Center...):'
                          )}
                        </label>
                        <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                          {tr('(اختياري)', '(ئارەزوومەندانە)', '(Optional)')}
                        </span>
                      </div>
                      <p className="text-[11px] text-teal-800 font-medium mt-0.5">
                        {tr(
                          'تساعد فرق الصيانة الميدانية في الوصول للموقع بسرعة وسهولة',
                          'یارمەتی تیمەکانی چاککردنەوە دەدات بۆ گەیشتنی خێرا بە شوێنەکە',
                          'Helps maintenance field teams reach the location promptly'
                        )}
                      </p>
                    </div>
                    <FieldLimitBadge
                      value={landmark}
                      maxWords={FIELD_LIMITS.LOCATION.maxWords}
                      maxChars={FIELD_LIMITS.LOCATION.maxChars}
                    />
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      maxLength={FIELD_LIMITS.LOCATION.maxChars}
                      value={landmark}
                      onFocus={() => setShowLandmarkSuggestions(true)}
                      onChange={(e) => {
                        setValidationError(null);
                        setLandmark(
                          enforceInputLimit(
                            e.target.value,
                            FIELD_LIMITS.LOCATION.maxWords,
                            FIELD_LIMITS.LOCATION.maxChars
                          )
                        );
                        setShowLandmarkSuggestions(true);
                      }}
                      placeholder={tr(
                        'اختر من القائمة أدناه أو اكتب أقرب نقطة دالة...',
                        'لە لیستەکەی خوارەوە هەڵبژێرە یان نزیکترین خاڵ بنووسە...',
                        'Select from list below or type nearest point...'
                      )}
                      className="w-full bg-white border border-[#BBDDC6] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all"
                    />

                    {landmark && (
                      <button
                        type="button"
                        onClick={() => {
                          setValidationError(null);
                          setLandmark('');
                        }}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-[#46674D] hover:text-red-600 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {showLandmarkSuggestions && landmark.trim() && (
                      <div className="absolute top-full mt-1.5 left-0 right-0 z-30 bg-white border border-[#BBDDC6] rounded-2xl shadow-[0_10px_30px_rgba(70,103,77,0.18)] max-h-48 overflow-y-auto p-1.5">
                        {BAADRE_LANDMARKS.filter((lm) =>
                          lm.toLowerCase().includes(landmark.trim().toLowerCase())
                        ).map((lm) => (
                          <button
                            key={lm}
                            type="button"
                            onClick={() => {
                              setValidationError(null);
                              playClickSound();
                              setLandmark(lm);
                              setShowLandmarkSuggestions(false);
                            }}
                            className="w-full text-start px-3 py-2 rounded-xl text-xs font-bold text-[#1E3725] hover:bg-teal-50 hover:text-teal-800 transition-colors flex items-center justify-between cursor-pointer"
                          >
                            <span>{lm}</span>
                            <span className="text-[10px] text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-md">
                              {tr('نقطة دالة', 'خاڵی دیار', 'Landmark')}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 5 كلمات جاهزة + نص مزيد لعرض جميع النقاط الـ 13 */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(showAllLandmarks ? BAADRE_LANDMARKS : BAADRE_LANDMARKS.slice(0, 5)).map(
                      (lmName) => {
                        const isCurrent = landmark === lmName;
                        return (
                          <button
                            key={lmName}
                            type="button"
                            onClick={() => {
                              setValidationError(null);
                              playClickSound();
                              setLandmark(lmName);
                              setShowLandmarkSuggestions(false);
                            }}
                            className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              isCurrent
                                ? 'bg-teal-700 text-white shadow-xs border border-teal-800 ring-2 ring-teal-300'
                                : 'bg-white hover:bg-teal-50 text-[#1E3725] border border-[#BBDDC6] hover:border-teal-400'
                            }`}
                          >
                            {isCurrent && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            <span>{lmName}</span>
                          </button>
                        );
                      }
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setShowAllLandmarks((prev) => !prev);
                      }}
                      className="px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 shadow-2xs hover:border-teal-500"
                    >
                      {!showAllLandmarks ? (
                        <>
                          <span>{tr('+ مزيد', '+ زێدەتر', '+ More')}</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          <span>{tr('عرض أقل', 'کەمتر نیشان بدە', 'Show less')}</span>
                          <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                الخطوة 8: اسم المواطن الكامل • رقم الهاتف / واتساب للتنبيه
               ═══════════════════════════════════════════════════════════════════════ */}
            {step === 8 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F4F9F5] border border-[#BBDDC6] space-y-4 shadow-2xs">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <label className="block text-xs sm:text-sm font-black text-[#1E3725]">
                        {tr(
                          'اسم المواطن الكامل:',
                          'ناوی تەواوی هاووڵاتی:',
                          'Full Citizen Name:'
                        )}
                      </label>
                    </div>
                    <FieldLimitBadge
                      value={citizenName}
                      maxWords={FIELD_LIMITS.NAME.maxWords}
                      maxChars={FIELD_LIMITS.NAME.maxChars}
                    />
                  </div>
                  <input
                    type="text"
                    maxLength={FIELD_LIMITS.NAME.maxChars}
                    value={citizenName}
                    onChange={(e) => {
                      setValidationError(null);
                      setCitizenName(
                        enforceInputLimit(
                          e.target.value,
                          FIELD_LIMITS.NAME.maxWords,
                          FIELD_LIMITS.NAME.maxChars
                        )
                      );
                    }}
                    placeholder={tr(
                      'الاسم الثلاثي أو الكامل',
                      'ناوی سیانی یان تەواو',
                      'Full Name'
                    )}
                    className="w-full bg-white border border-[#BBDDC6] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] focus:border-[#46674D] focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <label className="block text-xs sm:text-sm font-black text-[#1E3725]">
                        {tr(
                          'رقم الهاتف / واتساب للتنبيه:',
                          'ژمارەی مۆبایل / واتسئەپ بۆ ئاگادارکردنەوە:',
                          'Phone / WhatsApp Number for Alerts:'
                        )}
                      </label>
                    </div>
                    <FieldLimitBadge
                      value={citizenPhone}
                      maxChars={FIELD_LIMITS.PHONE.maxChars}
                      isPhone
                    />
                  </div>
                  <input
                    type="tel"
                    dir="ltr"
                    maxLength={FIELD_LIMITS.PHONE.maxChars}
                    value={citizenPhone}
                    onChange={(e) => {
                      setValidationError(null);
                      setCitizenPhone(enforcePhoneLimit(e.target.value));
                    }}
                    placeholder="0750 XXX XXXX"
                    className={`w-full bg-white border border-[#BBDDC6] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] focus:border-[#46674D] focus:outline-none ${
                      isRTL ? 'text-right' : 'text-left'
                    }`}
                  />
                </div>

                {/* ملاحظة حماية الخصوصية باللون الأصفر المتناسق اللطيف */}
                <div className="pt-2 border-t border-[#E8F4EA]">
                  <p className="text-xs font-bold text-amber-800 leading-relaxed text-center bg-amber-50/95 border border-amber-200/90 rounded-xl px-3.5 py-2.5 shadow-2xs">
                    {tr(
                      'اطمئن تماماً، بياناتك الشخصية ورقم هاتفك في أمان تام ومحفوظة بسرية كاملة؛ فهي لا تظهر للعامة داخل التطبيق ولا تُشارك مع أي جهة خارجية مطلقاً، وإنما تُستخدم فقط للتواصل معك وخدمتك بأفضل شكل.',
                      'بە تەواوی دڵنیابە، زانیارییە کەسییەکانت و ژمارەی مۆبایلەکەت بە تەواوی پارێزراون؛ بە هیچ شێوەیەک لەناو ئەپڵیکەیشنەکەدا بۆ خەڵک دەرناکەون و نادرێن بە هیچ لایەنێکی دەرەکی، تەنها بۆ پەیوەندیکردن و خزمەتکردنی ئێوە بەکاردێن.',
                      'Rest assured, your personal details and phone number are strictly protected and confidential; they are never displayed publicly in the app or shared with any external party, and are used solely to update and serve you.'
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                الخطوة 9: مراجعة البيانات المدخلة بالتسلسل من الأول إلى الأخير
                ثم إرسال رسالة واتساب ومعها يتم حفظ البلاغ
               ═══════════════════════════════════════════════════════════════════════ */}
            {step === 9 && (
              <div className="space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-[#F4F9F5] border border-[#BBDDC6] space-y-3.5 text-xs">
                  <div className="flex items-center justify-between border-b border-[#E8F4EA] pb-2.5">
                    <h3 className="text-xs sm:text-sm font-black text-[#1E3725]">
                      {tr(
                        'مراجعة البيانات المدخلة بالتسلسل من الأول إلى الأخير:',
                        'پێداچوونەوەی زانیارییەکان بە زنجیرە لە سەرەتاوە تا کۆتایی:',
                        'Sequential Review of Entered Data (First to Last):'
                      )}
                    </h3>
                  </div>

                  {/* 1. الصور المرفقة */}
                  <div className="p-3 rounded-xl bg-white border border-[#E8F4EA] space-y-2">
                    <div className="flex items-center justify-between font-black text-[#1E3725]">
                      <span className="inline-flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-[#46674D]" />
                        <span>
                          {tr('1. الصور المرفقة:', '1. وێنە هاوپێچکراوەکان:', '1. Attached Photos:')}
                        </span>
                      </span>
                      <span dir="ltr" className="font-mono text-[#46674D]">
                        {previewGalleryUrls.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {previewGalleryUrls.map((url, idx) => (
                        <div
                          key={`rev-img-${idx}`}
                          className="aspect-video rounded-lg overflow-hidden border border-[#BBDDC6] bg-[#1E3725]"
                        >
                          <SmartAdaptiveImage
                            src={url}
                            alt={`review-${idx + 1}`}
                            gallery={previewGalleryUrls}
                            initialIndex={idx}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 2. القطاع الخدمي المختص */}
                  <div className="p-3 rounded-xl bg-white border border-[#E8F4EA] flex items-center justify-between gap-2">
                    <span className="font-black text-[#1E3725]">
                      {tr(
                        '2. القطاع الخدمي المختص:',
                        '2. کەرتی خزمەتگوزاری پەیوەندیدار:',
                        '2. Service Sector:'
                      )}
                    </span>
                    <span className="font-black text-[#46674D]">
                      {SECTOR_META[sector].badgeEmoji} {selectedSectorLabel}
                    </span>
                  </div>

                  {/* 3. عنوان البلاغ المختصر ووصف المشكلة الميدانية بالتفصيل */}
                  <div className="p-3 rounded-xl bg-white border border-[#E8F4EA] space-y-1.5">
                    <div className="flex items-center gap-1.5 font-black text-[#1E3725]">
                      <FileText className="w-3.5 h-3.5 text-[#46674D]" />
                      <span>
                        {tr(
                          '3. عنوان البلاغ المختصر ووصف المشكلة:',
                          '3. ناونیشانی سکاڵا و وەسفی کێشەکە:',
                          '3. Report Title & Problem Description:'
                        )}
                      </span>
                    </div>
                    <p className="font-black text-[#1E3725]">{title}</p>
                    {description.trim() && (
                      <p className="text-[#2D4833] font-medium leading-relaxed bg-[#F4F9F5] p-2 rounded-lg">
                        {description}
                      </p>
                    )}
                  </div>

                  {/* 4. اعتماد الموقع */}
                  <div className="p-3 rounded-xl bg-white border border-[#E8F4EA] flex items-center justify-between gap-2">
                    <span className="font-black text-[#1E3725] inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#46674D]" />
                      <span>
                        {tr('4. الموقع المعتمد:', '4. شوێنی پەسەندکراو:', '4. Confirmed Location:')}
                      </span>
                    </span>
                    <span dir="ltr" className="font-mono font-bold text-[#46674D]">
                      {latitude.toFixed(5)}, {longitude.toFixed(5)}
                    </span>
                  </div>

                  {/* 5. الحي أو الزقاق */}
                  <div className="p-3 rounded-xl bg-white border border-[#E8F4EA] flex items-center justify-between gap-2">
                    <span className="font-black text-[#1E3725]">
                      {tr('5. الحي أو الزقاق:', '5. تاخ یان گەڕەک:', '5. Neighborhood / Quarter:')}
                    </span>
                    <span className="font-bold text-teal-800">
                      {finalNeighborhoodVal}
                    </span>
                  </div>

                  {/* 6. اسم الشارع */}
                  <div className="p-3 rounded-xl bg-white border border-[#E8F4EA] flex items-center justify-between gap-2">
                    <span className="font-black text-[#1E3725]">
                      {tr('6. اسم الشارع:', '6. ناوی شەقام:', '6. Street Name:')}
                    </span>
                    <span className="font-bold text-teal-800">
                      {street}
                    </span>
                  </div>

                  {/* 7. أقرب نقطة دالة */}
                  <div className="p-3 rounded-xl bg-white border border-[#E8F4EA] flex items-center justify-between gap-2">
                    <span className="font-black text-[#1E3725]">
                      {tr('7. أقرب نقطة دالة:', '7. نزیکترین خاڵ:', '7. Nearest Landmark:')}
                    </span>
                    <span className="font-bold text-teal-800">
                      {landmark.trim() || tr('لم تحدد (اختياري)', 'دیاری نەکراوە (ئارەزوومەندانە)', 'None specified (Optional)')}
                    </span>
                  </div>

                  {/* 8. اسم المواطن الكامل • رقم الهاتف / واتساب للتنبيه */}
                  <div className="p-3 rounded-xl bg-white border border-[#E8F4EA] flex flex-wrap items-center justify-between gap-2">
                    <span className="font-black text-[#1E3725] inline-flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#46674D]" />
                      <span>
                        {tr('8. بيانات المواطن:', '8. زانیاری هاووڵاتی:', '8. Citizen Info:')}
                      </span>
                      <span>{citizenName}</span>
                    </span>
                    <span
                      dir="ltr"
                      className="font-mono font-black text-[#46674D] inline-flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{citizenPhone}</span>
                    </span>
                  </div>

                  {/* تنبيه عدم نشر المعلومات باللون الأصفر المتناسق اللطيف */}
                  <p className="text-xs font-bold text-amber-800 leading-relaxed text-center bg-amber-50/95 border border-amber-200/90 rounded-xl px-3.5 py-2.5 shadow-2xs">
                    {tr(
                      'اطمئن تماماً، بياناتك الشخصية ورقم هاتفك في أمان تام ومحفوظة بسرية كاملة؛ فهي لا تظهر للعامة داخل التطبيق ولا تُشارك مع أي جهة خارجية مطلقاً.',
                      'بە تەواوی دڵنیابە، زانیارییە کەسییەکانت و ژمارەی مۆبایلەکەت بە تەواوی پارێزراون و بە هیچ شێوەیەک لەناو ئەپڵیکەیشنەکەدا بۆ خەڵک دەرناکەون.',
                      'Rest assured, your personal details and phone number are strictly protected and never displayed publicly in the app.'
                    )}
                  </p>
                </div>

                {/* إشعار النجاح عند الإرسال */}
                {isSent && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-[#E8F4EA] border border-[#88B793] text-xs font-black text-[#1E3725] flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4 text-[#46674D]" />
                    <span>
                      {tr(
                        'تم حفظ البلاغ وإرسال الرسالة إلى واتساب بنجاح',
                        'سکاڵاکە پاشەکەوتکرا و پەیامەکە بۆ واتسئەپ نێردرا',
                        'Report saved and message dispatched to WhatsApp'
                      )}
                    </span>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* Validation Error Banner */}
          <AnimatePresence>
            {validationError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 py-2.5 bg-red-50 border-t border-b border-red-200 text-red-700 text-xs font-black flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{validationError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setValidationError(null)}
                  className="p-1 hover:bg-red-100 rounded-lg transition-colors cursor-pointer text-red-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Wizard Footer Controls */}
          <div className="p-4 border-t border-[#E8F4EA] bg-[#F4F9F5] flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                disabled={isProcessingImagesOnNext}
                onClick={handlePrevStep}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-[#E8F4EA] text-[#1E3725] border border-[#BBDDC6] font-black text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                {isRTL ? (
                  <ArrowRight className="w-4 h-4 text-[#46674D]" />
                ) : (
                  <ArrowLeft className="w-4 h-4 text-[#46674D]" />
                )}
                <span>{tr('السابق', 'پێشوو', 'Previous')}</span>
              </button>
            ) : (
              <div />
            )}

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                disabled={isProcessingImagesOnNext}
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-xl bg-[#46674D] hover:bg-[#36593F] disabled:opacity-80 text-white font-black text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                {isProcessingImagesOnNext ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-[spin_0.5s_linear_infinite]" />
                    <span>{tr('جاري التجهيز السريع...', 'ئامادەکردنی خێرا...', 'Processing quickly...')}</span>
                  </>
                ) : (
                  <>
                    <span>{tr('التالي', 'دواتر', 'Next')}</span>
                    {isRTL ? (
                      <ArrowLeft className="w-4 h-4" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </>
                )}
              </button>
            ) : isSent ? (
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-6 py-2.5 rounded-xl bg-[#46674D] hover:bg-[#36593F] text-white font-black text-xs transition-all cursor-pointer shadow-xs"
              >
                {tr('إنهاء وإغلاق', 'تەواوکردن و داخستن', 'Done & Close')}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveAndSendWhatsApp}
                className="px-5 sm:px-6 py-2.5 rounded-xl bg-[#46674D] hover:bg-[#36593F] text-white font-black text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 stroke-[2.2]" />
                <span>
                  {tr(
                    'إرسال واتساب وحفظ البلاغ',
                    'ناردنی واتسئەپ و پاشەکەوتکردن',
                    'Save & Send WhatsApp'
                  )}
                </span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Modal / Dialog لعرض أمثلة اختيار القطاع عند النقر على زر ! */}
        <AnimatePresence>
          {sectorInfoModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSectorInfoModal(null)}
                className="fixed inset-0 bg-[#1E3725]/45 backdrop-blur-xs"
              />
              <motion.div
                dir={dir}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className={`relative w-full max-w-md bg-white border border-[#BBDDC6] rounded-3xl shadow-[0_20px_50px_rgba(70,103,77,0.25)] p-5 z-10 space-y-4 max-h-[85vh] overflow-y-auto ${
                  isRTL ? 'text-right' : 'text-left'
                }`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#E8F4EA]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#E8F4EA] text-[#2D4833] flex items-center justify-center shrink-0">
                      {React.createElement(SECTOR_ICONS[sectorInfoModal], {
                        className: 'w-5 h-5 stroke-[2.2]',
                      })}
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-[#1E3725]">
                        {language === 'ku'
                          ? SECTOR_META[sectorInfoModal].ku
                          : language === 'en'
                          ? SECTOR_META[sectorInfoModal].en
                          : SECTOR_META[sectorInfoModal].labelAr}
                      </h3>
                      <p className="text-[11px] font-bold text-[#46674D]">
                        {tr(
                          'دليل وأمثلة اختيار هذا القطاع',
                          'ڕێنمایی و نموونەی هەڵبژاردنی ئەم کەرتە',
                          'Guide & Examples for Selecting This Sector'
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSectorInfoModal(null)}
                    className="p-1.5 rounded-full bg-[#F4F9F5] text-[#2D4833] hover:bg-[#E8F4EA] transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-black text-[#1E3725]">
                    {tr(
                      'متى تقوم باختيار هذا القطاع؟ (أمثلة عملية):',
                      'کەی ئەم کەرتە هەڵدەبژێریت؟ (نموونەی مەیدانی):',
                      'When should you select this sector? (Practical Examples):'
                    )}
                  </p>
                  <div className="space-y-2.5 bg-[#F4F9F5] p-3.5 rounded-2xl border border-[#BBDDC6]/50">
                    {SECTOR_EXAMPLES[sectorInfoModal][
                      language === 'ku' ? 'ku' : language === 'en' ? 'en' : 'ar'
                    ].map((ex, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 text-xs text-[#2D4833] font-medium leading-relaxed"
                      >
                        <span className="w-2 h-2 rounded-full bg-[#46674D] mt-1.5 shrink-0" />
                        <span>{ex}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setSector(sectorInfoModal);
                      setSectorInfoModal(null);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-tr from-[#315338] to-[#46674D] text-white text-xs font-black shadow-xs hover:brightness-105 active:scale-95 transition-all cursor-pointer text-center"
                  >
                    {tr(
                      'تحديد هذا القطاع للبلاغ',
                      'دیاریکردنی ئەم کەرتە بۆ سکاڵا',
                      'Select This Sector'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSectorInfoModal(null)}
                    className="py-2.5 px-4 rounded-xl bg-[#E8F4EA] text-[#2D4833] text-xs font-bold hover:bg-[#D4EADB] transition-colors cursor-pointer"
                  >
                    {tr('إغلاق', 'داخستن', 'Close')}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* نافذة نظيفة من النصوص والشروحات تعرض 10 اختيارات ذكية فقط */}
        <AnimatePresence>
          {smartModalType && (
            <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSmartModalType(null)}
                className="fixed inset-0 bg-[#1E3725]/50 backdrop-blur-xs"
              />
              <motion.div
                dir={dir}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className={`relative w-full max-w-md bg-white border border-[#BBDDC6] rounded-3xl shadow-[0_20px_50px_rgba(70,103,77,0.3)] p-4 z-10 space-y-2.5 max-h-[82vh] flex flex-col ${
                  isRTL ? 'text-right' : 'text-left'
                }`}
              >
                <div className="flex items-center justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => setSmartModalType(null)}
                    className="p-1.5 rounded-full bg-[#F4F9F5] text-[#2D4833] hover:bg-[#E8F4EA] transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 overflow-y-auto pr-0.5">
                  {(smartModalType === 'title'
                    ? currentSectorSuggestions.titles[
                        language === 'ku' ? 'ku' : language === 'en' ? 'en' : 'ar'
                      ]
                    : currentSectorSuggestions.descriptions[
                        language === 'ku' ? 'ku' : language === 'en' ? 'en' : 'ar'
                      ]
                  )
                    .slice(0, 10)
                    .map((item, idx) => {
                      const isSelected =
                        smartModalType === 'title' ? title === item : description === item;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            playClickSound();
                            const langKey =
                              language === 'ku' ? 'ku' : language === 'en' ? 'en' : 'ar';
                            if (smartModalType === 'title') {
                              setTitle(
                                enforceInputLimit(
                                  item,
                                  FIELD_LIMITS.TITLE.maxWords,
                                  FIELD_LIMITS.TITLE.maxChars
                                )
                              );
                              // ربط التفاصيل تلقائياً عند اختيار أي عنوان ذكي مختصر
                              const linkedDesc =
                                currentSectorSuggestions.descriptions[langKey]?.[idx];
                              if (linkedDesc) {
                                setDescription(
                                  enforceInputLimit(
                                    linkedDesc,
                                    FIELD_LIMITS.DESCRIPTION.maxWords,
                                    FIELD_LIMITS.DESCRIPTION.maxChars
                                  )
                                );
                              }
                            } else {
                              setDescription(
                                enforceInputLimit(
                                  item,
                                  FIELD_LIMITS.DESCRIPTION.maxWords,
                                  FIELD_LIMITS.DESCRIPTION.maxChars
                                )
                              );
                            }
                            setValidationError(null);
                            setSmartModalType(null);
                          }}
                          className={`w-full p-3.5 rounded-2xl border text-xs sm:text-sm font-black transition-all flex items-center justify-between gap-3 text-start cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                            isSelected
                              ? 'bg-[#E8F4EA] border-[#46674D] text-[#1E3725] shadow-xs ring-1 ring-[#46674D]'
                              : 'bg-[#F4F9F5] hover:bg-[#EAF4EC] border-[#BBDDC6] text-[#1E3725]'
                          }`}
                        >
                          <span className="leading-relaxed">{item}</span>
                          <Check className="w-4 h-4 text-[#46674D] shrink-0" />
                        </button>
                      );
                    })}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Full-Screen Google Maps Location Picker Modal */}
        <FullScreenGoogleMapPickerModal
          isOpen={isFullScreenMapOpen}
          onClose={() => setIsFullScreenMapOpen(false)}
          latitude={latitude}
          longitude={longitude}
          onSelectLocation={(lat, lng) => {
            setLatitude(lat);
            setLongitude(lng);
          }}
        />
      </div>
    </AnimatePresence>
  );
};
