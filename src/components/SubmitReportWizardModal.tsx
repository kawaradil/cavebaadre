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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ReportSector,
  SECTOR_META,
  BAADRE_NEIGHBORHOODS,
  BAADRE_CENTER_COORDS,
  MUNICIPAL_WHATSAPP_NUMBER,
  CivicReport,
  SECTOR_ILLUSTRATIONS,
  formatWhatsAppReportMessage,
} from '../types/baadre';
import { useBaadre } from '../context/BaadreContext';
import { useLanguage } from '../context/LanguageContext';
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
      'حفر وتشققات وهبوط في طبقة الأسفلت في الشوارع الرئيسية أو الفرعية.',
      'تلف أو كسر الأرصفة الجانبية وأحجار الرصيف وبحاجة لتبليط.',
      'مطبات اصطناعية مكسورة أو غير نظامية بحاجة لإعادة طلاء تحذيري.',
      'انسداد الطرق بالصخور المتساقطة أو تراكم الأتربة والأنقاض.',
      'صيانة فتحات العبارات والجسور الصغيرة على الطرق العامة.',
    ],
    ku: [
      'چاڵ، دابەزین و درزبردن لە قیڕی شەقامە گشتی و لاوەکییەکاندا.',
      'تێکچوون یان شکانی شۆستەکان و بەردی شۆستە و پێویستی قیرتاوکردن.',
      'کەند و بەربەستی خێرایی شکاو یان نانیزامی کە بۆیاخیان دەوێت.',
      'گیرانی ڕێگاوبان بەهۆی کەوتنی بەرد یان پاشماوەی بیناسازی.',
      'نۆژەنکردنەوەی پردە بچووکەکان و ڕێڕەوەکانی هاتوچۆ.',
    ],
    en: [
      'Potholes, cracks, and asphalt sinking on main or branch roads.',
      'Damaged or missing sidewalks and road curb stones.',
      'Broken or irregular speed bumps needing warning paint.',
      'Road blockages due to fallen rocks, mud, or rubble.',
      'Maintenance of culverts and small bridges on public roads.',
    ],
  },
  water: {
    ar: [
      'كسر في خطوط وأنابيب الإسالة الرئيسية أو الفرعية وهدر المياه.',
      'تسربات مياه غير مرئية تسبب رطوبة وهبوطاً في التربة أو الشارع.',
      'انقطاع تام لمياه الشرب عن حي معين أو ضعف شديد في ضغط الضخ.',
      'أعطال في المحابس الرئيسية وفتحات التحكم بشبكة المياه.',
      'تلوث أو تغير في طعم أو لون مياه الشرب الواردة للمنازل.',
    ],
    ku: [
      'شکانی بۆرییە سەرەکی یان لاوەکییەکانی ئاو و بەفیڕۆچوونی ئاو.',
      'دزەکردنی ئاو کە دەبێتە هۆی شێداری و دابەزینی زەوی و شەقام.',
      'بڕانی تەواوەتی ئاوی خواردنەوە لە گەڕەکێک یان لاوازی زۆری پەستان.',
      'تێکچوونی قوفڵە سەرەکییەکان و کۆنتڕۆڵی تۆڕی ئاو.',
      'لێڵبوون یان گۆڕانی تام و ڕەنگی ئاوی خواردنەوەی ماڵان.',
    ],
    en: [
      'Burst municipal water pipes causing street flooding & wastage.',
      'Underground leaks causing soil erosion or pavement damage.',
      'Drinking water outages or severe water pressure drops.',
      'Broken main valves and water distribution regulators.',
      'Discoloration, turbidity, or odor in domestic tap water.',
    ],
  },
  sewage: {
    ar: [
      'طفح مياه الصرف الصحي والمجاري في الشارع أو أمام المنازل.',
      'انسداد مشابك وفتحات تصريف مياه الأمطار والسيول.',
      'أغطية المنهولات المكسورة أو المفقودة والتي تشكل خطراً كبيراً.',
      'انبعاث روائح مجاري كريهة ومستمرة من فتحات التصريف.',
      'هبوط التربة والشارع حول فتحات التفتيش وغرف المجاري.',
    ],
    ku: [
      'زێدەڕۆیی و ڕژانی ئاوەڕۆ لەسەر شەقام یان بەردەم ماڵان.',
      'گیرانی مەنهۆڵ و کانیەکانی ئاوی باراناو لە وەرزی زستاندا.',
      'سەری مەنهۆڵی شکاو یان ونبوو کە مەترسییە بۆ سەلامەتی.',
      'بڵاوبوونەوەی بۆنی زۆر ناخۆش لە ڕێڕەوەکانی ئاوەڕۆوە.',
      'دابەزینی زەوی و شەقام لە دەوری چاڵەکانی پشکنینی ئاوەڕۆ.',
    ],
    en: [
      'Sewage overflow onto roads, sidewalks, or near residences.',
      'Clogged stormwater grates and rain drainage channels.',
      'Broken or missing manhole covers posing pedestrian/car hazard.',
      'Persistent foul sewage fumes and odors from drains.',
      'Ground subsidence around sewage inspection chambers.',
    ],
  },
  lighting: {
    ar: [
      'مصابيح الإنارة المطفأة ليلاً في الشوارع أو الأزقة الداخلية.',
      'أسلاك كهربائية متدلية من الأعمدة تشكل خطراً على حياة السكان.',
      'أعمدة إنارة مائلة أو متآكلة من القاعدة ومعرضة للسقوط.',
      'لوحات تغذية ومفاتيح الإنارة المكشوفة أو التالفة.',
      'ظلام تام في تقاطعات أو ساحات عامة بحاجة لإنارة إضافية.',
    ],
    ku: [
      'کوژانەوەی گلۆپەکانی ڕووناکی شەقام لە شەواندا لە گەڕەکەکاندا.',
      'وایەر و تێلی شۆڕبووەوە لە ستوونەکان کە مەترسییە بۆ سەر ژیانی خەڵک.',
      'ستوونی کارەبای لاربووەوە یان تێکچوو لە بنکەکەیەوە کە مەترسی کەوتنی هەیە.',
      'تابڵۆی کارەبای سەر شەقام کە کراوەتەوە یان سووتاوە.',
      'تاریکی تەواو لە چوارڕیان یان گۆڕەپانە گشتییەکان کە پێویستی بە ڕووناکییە.',
    ],
    en: [
      'Streetlight failures and dark areas along roads at night.',
      'Dangling, exposed, or sparking electrical wires on poles.',
      'Tilted, damaged, or severely corroded lighting poles.',
      'Vandalized or damaged public electrical power panels.',
      'Total lighting blackout across road intersections or squares.',
    ],
  },
  sanitation: {
    ar: [
      'تراكم النفايات والأوساخ في الساحات العامة أو بجانب الأرصفة.',
      'حاويات نفايات ممتلئة لم يتم تفريغها أو حاويات مكسورة تالفة.',
      'صيانة ألعاب الأطفال والمقاعد في الحدائق والمتنزهات العامة.',
      'أغصان الأشجار الكثيفة المتداخلة مع أسلاك الكهرباء أو تحجب الرؤية.',
      'انتشار الحشرات أو القوارض والكلاب السائبة وبحاجة لحملات مكافحة.',
    ],
    ku: [
      'کۆبوونەوەی زبڵ و خاشاک لە گۆڕەپانە گشتییەکان یان تەنیشت شۆستە.',
      'سەبەتەی زبڵی پڕبوو کە بەتاڵ نەکراوەتەوە یان سەبەتەی شکاو.',
      'خزمەتگوزاری یاری منداڵان و کورسییەکانی باخچە و سەیرانگا گشتییەکان.',
      'لقی درەختەکان کە تێکەڵ بە وایەری کارەبا بوون یان ڕێگری لە بینین دەکەن.',
      'بڵاوبوونەوەی مێروو یان سەگی بێلانە کە پێویستی بە دەرمانڕێژکردنە.',
    ],
    en: [
      'Accumulation of trash and garbage in open spaces or sidewalks.',
      'Overflowing or damaged municipal trash dumpsters and bins.',
      'Maintenance of benches and kids play equipment in parks.',
      'Overgrown tree branches entangling wires or blocking road sight.',
      'Pest and stray animal proliferation requiring municipality action.',
    ],
  },
  other: {
    ar: [
      'التجاوز على الأرصفة العامة أو بناء بدون ترخيص يعيق حركة السير.',
      'لوحات إرشادية وتسميات شوارع تالفة أو مفقودة.',
      'مباني قديمة مهجورة آيلة للسقوط تشكل تهديداً لسلامة المارة.',
      'شكاوى الضوضاء الصادرة من المعامل أو الورش غير المرخصة وسط الأحياء.',
      'بلاغات الطوارئ البلدية والخدمات التي لا تندرج تحت القطاعات الأخرى.',
    ],
    ku: [
      'زێدەڕۆیی بۆ سەر شۆستەی گشتی یان دروستکردنی ناڕەوا کە ڕێگا دەگرێت.',
      'هێماکانی هاتوچۆ و تابلۆی ناوی شەقامەکان کە تێکچوون یان نەماون.',
      'خانووی کۆن و چۆڵکراو کە مەترسی ڕووخانی هەیە بەسەر خەڵکدا.',
      'دەنگەدەنگ و بێزاری لە کارگە و وەرشەی ناڕێگەپێدراو لەناو گەڕەکدا.',
      'سکاڵا و فریاکەوتنی گشتی کە لە کەرتەکانی تردا جێگەی نابێتەوە.',
    ],
    en: [
      'Illegal building encroachments obstructing walkways or streets.',
      'Missing or damaged street direction signs and traffic boards.',
      'Dilapidated abandoned buildings threatening pedestrian safety.',
      'Excessive noise from unlicensed industrial shops in neighborhoods.',
      'General civic emergency requests not covered by other sectors.',
    ],
  },
};

interface SelectedPhotoItem {
  id: string;
  previewUrl: string;
  file?: File;
  storageUrl?: string;
}

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;
const TOTAL_STEPS = 7;

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
  const { submitNewReport, updateCitizenReport } = useBaadre();
  const { language, dir, isRTL } = useLanguage();

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

  // Step 4: اعتماد الموقع (GPS)
  const [latitude, setLatitude] = useState<number>(BAADRE_CENTER_COORDS.lat);
  const [longitude, setLongitude] = useState<number>(BAADRE_CENTER_COORDS.lng);
  const [isFullScreenMapOpen, setIsFullScreenMapOpen] = useState(false);

  // Step 5: الحي أو القطاع + اسم الشارع + أقرب نقطة دالة
  const [neighborhood, setNeighborhood] = useState<string>('مركز باعدرى');
  const [isOtherNeighborhood, setIsOtherNeighborhood] = useState(false);
  const [customNeighborhood, setCustomNeighborhood] = useState('');
  const [showNeighborhoodSuggestions, setShowNeighborhoodSuggestions] = useState(false);
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');

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
      setNeighborhood(editingReport.neighborhood || 'مركز باعدرى');
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
      setNeighborhood('مركز باعدرى');
      setIsOtherNeighborhood(false);
      setCustomNeighborhood('');
      setStreet('');
      setLandmark('');
      setCitizenName('');
      setCitizenPhone('');
      setCreatedReport(null);
      setIsSent(false);
      setValidationError(null);
    }
  }, [isOpen, editingReport?.id]);

  const finalNeighborhoodVal =
    isOtherNeighborhood && customNeighborhood.trim()
      ? customNeighborhood.trim()
      : neighborhood.trim();

  if (!isOpen) return null;

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
      landmark:
        landmark.trim() ||
        tr(
          `قرب مركز ${finalNeighborhood}`,
          `نزیک سەنتەری ${finalNeighborhood}`,
          `Near ${finalNeighborhood} center`
        ),
      latitude,
      longitude,
      citizenName:
        citizenName.trim() || tr('مواطن من باعدرى', 'هاووڵاتی باعەدرێ', 'Baadre Citizen'),
      citizenPhone: citizenPhone.trim() || '07500000000',
      images: finalImagesList,
    };

    if (!reportToDispatch) {
      if (editingReport) {
        reportToDispatch =
          updateCitizenReport(editingReport.id, reportPayload) || editingReport;
      } else {
        reportToDispatch = submitNewReport(reportPayload);
      }
      setCreatedReport(reportToDispatch);
    }

    if (reportToDispatch) {
      const msg = formatWhatsAppReportMessage(reportToDispatch);
      const url = `https://wa.me/${MUNICIPAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(
        msg
      )}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      setIsSent(true);
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
          setUploadedImages(photoItems.map((item) => item.storageUrl || item.previewUrl));
        } else {
          const processedItems = await Promise.all(
            photoItems.map(async (item) => {
              if (item.storageUrl) return item;
              if (!item.file) return { ...item, storageUrl: item.previewUrl };
              const compressedDataUrl = await compressImageFile(item.file, 500);
              const storageUrl = await uploadImageToFirebaseStorage(
                compressedDataUrl,
                'reports'
              );
              return {
                ...item,
                storageUrl: storageUrl || compressedDataUrl,
              };
            })
          );
          setPhotoItems(processedItems);
          setUploadedImages(
            processedItems
              .map((item) => item.storageUrl || item.previewUrl)
              .filter(Boolean)
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
    } else if (step === 4) {
      playClickSound();
      setStep(5);
    } else if (step === 5) {
      if (!finalNeighborhoodVal) {
        setValidationError(
          tr(
            'يرجى تحديد الحي أو القطاع.',
            'تکایە گەڕەک یان کەرتەکە بنووسە.',
            'Please specify the neighborhood.'
          )
        );
        return;
      }
      if (!street.trim()) {
        setValidationError(
          tr(
            'يرجى إدخال اسم الشارع.',
            'تکایە ناوی شەقام بنووسە.',
            'Please enter street name.'
          )
        );
        return;
      }
      if (!landmark.trim()) {
        setValidationError(
          tr(
            'يرجى إدخال أقرب نقطة دالة (مدرسة، جامع، تقاطع).',
            'تکایە نزیکترین نیشانەی دیار بنووسە.',
            'Please enter the nearest landmark.'
          )
        );
        return;
      }
      playClickSound();
      setStep(6);
    } else if (step === 6) {
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
      setStep(7);
    }
  };

  const handleResetAndClose = () => {
    setStep(1);
    setCreatedReport(null);
    setIsSent(false);
    setValidationError(null);
    setSectorInfoModal(null);
    setIsFullScreenMapOpen(false);
    setIsProcessingImagesOnNext(false);
    onClose();
  };

  const previewGalleryUrls = photoItems.map((p) => p.storageUrl || p.previewUrl);
  const selectedSectorLabel =
    sector === 'other' && customSector.trim()
      ? customSector.trim()
      : language === 'ku'
      ? SECTOR_META[sector].ku
      : language === 'en'
      ? SECTOR_META[sector].en
      : SECTOR_META[sector].labelAr;

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
                    'الحي أو القطاع • اسم الشارع • أقرب نقطة دالة',
                    'گەڕەک • ناوی شەقام • نزیکترین نیشانە',
                    'Neighborhood, Street & Nearest Landmark'
                  )}
                {step === 6 &&
                  tr(
                    'بيانات المواطن والتنبيه',
                    'زانیاری هاووڵاتی و ئاگادارکردنەوە',
                    'Citizen Details & Contact'
                  )}
                {step === 7 &&
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
            {[1, 2, 3, 4, 5, 6, 7].map((idx) => (
              <div
                key={idx}
                className={`flex-1 transition-all duration-300 ${
                  step >= idx
                    ? 'bg-gradient-to-r from-[#46674D] to-[#88B793]'
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
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-sm font-black text-[#1E3725]">
                        {tr(
                          'تحديد وإرفاق صور البلاغ الميداني',
                          'دیاریکردن و هاوپێچکردنی وێنەی سکاڵا',
                          'Select & Attach Field Report Photos'
                        )}
                      </p>
                    </div>
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
                    <div className="space-y-2 pt-2">
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
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <label className="block text-xs sm:text-sm font-black text-[#1E3725]">
                        {tr(
                          'عنوان البلاغ المختصر:',
                          'ناونیشانی کورتی سکاڵا:',
                          'Brief Report Title:'
                        )}
                      </label>
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

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <label className="block text-xs sm:text-sm font-black text-[#1E3725]">
                        {tr(
                          'وصف المشكلة الميدانية بالتفصيل:',
                          'وەسفی کێشە مەیدانییەکە بە وردی:',
                          'Detailed Field Problem Description:'
                        )}
                      </label>
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
                الخطوة 5: الحي أو القطاع • اسم الشارع • أقرب نقطة دالة (مدرسة، جامع، تقاطع)
               ═══════════════════════════════════════════════════════════════════════ */}
            {step === 5 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F4F9F5] border border-[#BBDDC6] space-y-4 shadow-2xs">
                {/* الحي أو القطاع */}
                <div className="space-y-2">
                  <div className="relative">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <label className="block text-xs sm:text-sm font-black text-[#1E3725]">
                          {tr(
                            'الحي أو القطاع:',
                            'گەڕەک یان کەرت:',
                            'Neighborhood or Sector:'
                          )}
                        </label>
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
                          'اكتب اسم الحي أو القطاع في باعدرى...',
                          'ناوی گەڕەک یان کەرت لە باعەدرێ بنووسە...',
                          'Type neighborhood or sector in Baadre...'
                        )}
                        className="w-full bg-white border border-[#BBDDC6] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] focus:border-[#46674D] focus:outline-none"
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
                    </div>

                    {showNeighborhoodSuggestions && (
                      <div className="absolute top-full mt-1.5 left-0 right-0 z-30 bg-white border border-[#BBDDC6] rounded-2xl shadow-[0_10px_30px_rgba(70,103,77,0.18)] max-h-48 overflow-y-auto p-1.5">
                        {BAADRE_NEIGHBORHOODS.filter((n) => {
                          const q = neighborhood.trim().toLowerCase();
                          if (!q) return true;
                          return (
                            n.ar.toLowerCase().includes(q) ||
                            n.ku.toLowerCase().includes(q) ||
                            n.en.toLowerCase().includes(q)
                          );
                        }).map((n) => {
                          const nName =
                            language === 'ku' ? n.ku : language === 'en' ? n.en : n.ar;
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
                              className="w-full text-start px-3 py-2 rounded-xl text-xs font-bold text-[#1E3725] hover:bg-[#E8F4EA] hover:text-[#46674D] transition-colors flex items-center justify-between cursor-pointer"
                            >
                              <span>{nName}</span>
                              <span className="text-[10px] text-[#46674D]/70 font-mono">
                                {n.ar}
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
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {BAADRE_NEIGHBORHOODS.slice(0, 6).map((n) => {
                      const nName =
                        language === 'ku' ? n.ku : language === 'en' ? n.en : n.ar;
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
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-[#46674D] text-white shadow-2xs'
                              : 'bg-white hover:bg-[#E8F4EA] text-[#1E3725] border border-[#BBDDC6]'
                          }`}
                        >
                          {nName}
                        </button>
                      );
                    })}
                  </div>

                  {(isOtherNeighborhood ||
                    neighborhood === 'أخرى' ||
                    neighborhood === 'هیتر' ||
                    neighborhood === 'Other') && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-2xl bg-[#E8F4EA] border border-[#88B793] space-y-1.5 shadow-2xs mt-2"
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
                        className="w-full bg-white border border-[#BBDDC6] rounded-xl px-3.5 py-2 text-xs font-bold text-[#1E3725] focus:border-[#46674D] focus:outline-none"
                      />
                    </motion.div>
                  )}
                </div>

                {/* اسم الشارع */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <label className="block text-xs sm:text-sm font-black text-[#1E3725]">
                        {tr('اسم الشارع:', 'ناوی شەقام:', 'Street Name:')}
                      </label>
                    </div>
                    <FieldLimitBadge
                      value={street}
                      maxWords={FIELD_LIMITS.LOCATION.maxWords}
                      maxChars={FIELD_LIMITS.LOCATION.maxChars}
                    />
                  </div>
                  <input
                    type="text"
                    maxLength={FIELD_LIMITS.LOCATION.maxChars}
                    value={street}
                    onChange={(e) => {
                      setValidationError(null);
                      setStreet(
                        enforceInputLimit(
                          e.target.value,
                          FIELD_LIMITS.LOCATION.maxWords,
                          FIELD_LIMITS.LOCATION.maxChars
                        )
                      );
                    }}
                    placeholder={tr(
                      'مثال: الشارع العام / زقاق رقم 4',
                      'نموونە: شەقامی گشتی / کۆڵانی ژمارە 4',
                      'Example: Main Street / Alley 4'
                    )}
                    className="w-full bg-white border border-[#BBDDC6] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] focus:border-[#46674D] focus:outline-none"
                  />
                </div>

                {/* أقرب نقطة دالة (مدرسة، جامع، تقاطع) */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <label className="block text-xs sm:text-sm font-black text-[#1E3725]">
                        {tr(
                          'أقرب نقطة دالة (مدرسة، جامع، تقاطع):',
                          'نزیکترین نیشانە (قوتابخانە، مزگەوت، چوارڕیان):',
                          'Nearest Landmark (School, Mosque, Intersection):'
                        )}
                      </label>
                    </div>
                    <FieldLimitBadge
                      value={landmark}
                      maxWords={FIELD_LIMITS.LOCATION.maxWords}
                      maxChars={FIELD_LIMITS.LOCATION.maxChars}
                    />
                  </div>
                  <input
                    type="text"
                    maxLength={FIELD_LIMITS.LOCATION.maxChars}
                    value={landmark}
                    onChange={(e) => {
                      setValidationError(null);
                      setLandmark(
                        enforceInputLimit(
                          e.target.value,
                          FIELD_LIMITS.LOCATION.maxWords,
                          FIELD_LIMITS.LOCATION.maxChars
                        )
                      );
                    }}
                    placeholder={tr(
                      'مثال: مقابل مدرسة باعدرى أو قرب الجامع أو التقاطع',
                      'نموونە: بەرامبەر قوتابخانەی باعەدرێ یان نزیک مزگەوت',
                      'Example: Opposite Baadre school or near mosque/intersection'
                    )}
                    className="w-full bg-white border border-[#BBDDC6] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E3725] focus:border-[#46674D] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                الخطوة 6: اسم المواطن الكامل • رقم الهاتف / واتساب للتنبيه
               ═══════════════════════════════════════════════════════════════════════ */}
            {step === 6 && (
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
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                الخطوة 7: مراجعة البيانات المدخلة بالتسلسل من الأول إلى الأخير
                ثم إرسال رسالة واتساب ومعها يتم حفظ البلاغ
               ═══════════════════════════════════════════════════════════════════════ */}
            {step === 7 && (
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

                  {/* 5. الحي أو القطاع • اسم الشارع • أقرب نقطة دالة */}
                  <div className="p-3 rounded-xl bg-white border border-[#E8F4EA] space-y-1">
                    <span className="font-black text-[#1E3725] block">
                      {tr(
                        '5. الحي أو القطاع • اسم الشارع • أقرب نقطة دالة:',
                        '5. گەڕەک • ناوی شەقام • نزیکترین نیشانە:',
                        '5. Neighborhood, Street & Landmark:'
                      )}
                    </span>
                    <p className="font-bold text-[#2D4833]">
                      {finalNeighborhoodVal} — {street} ({landmark})
                    </p>
                  </div>

                  {/* 6. اسم المواطن الكامل • رقم الهاتف / واتساب للتنبيه */}
                  <div className="p-3 rounded-xl bg-white border border-[#E8F4EA] flex flex-wrap items-center justify-between gap-2">
                    <span className="font-black text-[#1E3725] inline-flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#46674D]" />
                      <span>
                        {tr('6. بيانات المواطن:', '6. زانیاری هاووڵاتی:', '6. Citizen Info:')}
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
                </div>

                {/* زر إرسال رسالة واتساب ومعها يتم حفظ البلاغ */}
                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveAndSendWhatsApp}
                    className="w-full py-3.5 px-6 rounded-2xl bg-[#46674D] hover:bg-[#36593F] text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                  >
                    <MessageCircle className="w-5 h-5 stroke-[2.2]" />
                    <span>
                      {tr(
                        'إرسال رسالة واتساب وحفظ البلاغ',
                        'ناردنی پەیامی واتسئەپ و پاشەکەوتکردنی سکاڵا',
                        'Send WhatsApp Message & Save Report'
                      )}
                    </span>
                  </button>

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

          {/* Wizard Footer Controls (تم حذف زر الخطوة السابقة بناءً على الطلب) */}
          <div className="p-4 border-t border-[#E8F4EA] bg-[#F4F9F5] flex items-center justify-end">
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                disabled={isProcessingImagesOnNext}
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-xl bg-[#46674D] hover:bg-[#36593F] disabled:opacity-60 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <span>{tr('التالي', 'دواتر', 'Next')}</span>
                {isRTL ? (
                  <ArrowLeft className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>
            ) : isSent ? (
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-6 py-2.5 rounded-xl bg-[#46674D] hover:bg-[#36593F] text-white font-black text-xs transition-all cursor-pointer"
              >
                {tr('إنهاء', 'تەواوکردن', 'Done')}
              </button>
            ) : null}
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
