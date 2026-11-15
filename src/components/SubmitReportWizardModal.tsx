import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowLeft,
  ArrowRight,
  MessageCircle,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ReportSector,
  SECTOR_META,
  BAADRE_CENTER_COORDS,
  MUNICIPAL_WHATSAPP_NUMBER,
  CivicReport,
  SECTOR_ILLUSTRATIONS,
  formatWhatsAppReportMessage,
  isReportSentToDepartment,
} from '../types/baadre';
import { toWhatsAppIntlNumber } from '../constants/officialContact';
import { useBaadre } from '../context/BaadreContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { playClickSound, playSuccessSound } from '../lib/sound';
import {
  compressImageFile,
  uploadImageToFirebaseStorage,
  MAX_UPLOAD_IMAGES,
} from '../lib/firebase';
import { FullScreenGoogleMapPickerModal } from './FullScreenGoogleMapPickerModal';
import {
  SMART_SECTOR_SUGGESTIONS,
  SelectedPhotoItem,
  WizardStep,
  TOTAL_STEPS,
  getWizardStepTitle,
} from './report-wizard/wizardSuggestions';
import type { SmartSectorSuggestion } from './report-wizard/wizardSuggestions';
import { WizardStepsContentEarly } from './report-wizard/WizardStepsContentEarly';
import { WizardStepsLocation } from './report-wizard/WizardStepsLocation';
import { WizardStepsFinal } from './report-wizard/WizardStepsFinal';
import { WizardHelperModals } from './report-wizard/WizardHelperModals';

export { SMART_SECTOR_SUGGESTIONS };
export type { SmartSectorSuggestion };

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

  // Step 1: Photos
  const [photoItems, setPhotoItems] = useState<SelectedPhotoItem[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isProcessingImagesOnNext, setIsProcessingImagesOnNext] = useState(false);
  const [maxLimitNotice, setMaxLimitNotice] = useState(false);

  // Step 2: Sector
  const [sector, setSector] = useState<ReportSector>('roads');
  const [customSector, setCustomSector] = useState('');
  const [sectorInfoModal, setSectorInfoModal] = useState<ReportSector | null>(null);

  // Step 3: Title & Description
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [smartModalType, setSmartModalType] = useState<'title' | 'description' | null>(null);

  // Step 4: GPS Location
  const [latitude, setLatitude] = useState<number>(BAADRE_CENTER_COORDS.lat);
  const [longitude, setLongitude] = useState<number>(BAADRE_CENTER_COORDS.lng);
  const [isFullScreenMapOpen, setIsFullScreenMapOpen] = useState(false);

  // Steps 5–7: Neighborhood + Street + Landmark
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

  // Step 8: Citizen Name + Phone
  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');

  // Step 9: Review & Dispatch
  const [createdReport, setCreatedReport] = useState<CivicReport | null>(null);
  const [isSent, setIsSent] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingReport) {
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
      const targetWa = toWhatsAppIntlNumber(
        contactSettings.whatsappReportsNumber || MUNICIPAL_WHATSAPP_NUMBER
      );
      const url = `https://wa.me/${targetWa}?text=${encodeURIComponent(msg)}`;
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
      playClickSound();
      setStep(8);
    } else if (step === 8) {
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
            className="relative w-full max-w-md bg-white border border-[#BBDDC6] rounded-3xl shadow-2xl p-6 z-10 text-center space-y-4"
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
                {getWizardStepTitle(step, tr)}
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
            {step <= 4 && (
              <WizardStepsContentEarly
                step={step}
                language={language}
                isRTL={isRTL}
                tr={tr}
                setValidationError={setValidationError}
                photoItems={photoItems}
                maxLimitNotice={maxLimitNotice}
                previewGalleryUrls={previewGalleryUrls}
                onImageSelect={handleImageSelect}
                onRemoveImage={handleRemoveImage}
                sector={sector}
                setSector={setSector}
                customSector={customSector}
                setCustomSector={setCustomSector}
                setSectorInfoModal={setSectorInfoModal}
                title={title}
                setTitle={setTitle}
                description={description}
                setDescription={setDescription}
                selectedSectorLabel={selectedSectorLabel}
                setSmartModalType={setSmartModalType}
                latitude={latitude}
                longitude={longitude}
                onSelectLocation={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
                onOpenFullScreenMap={() => setIsFullScreenMapOpen(true)}
              />
            )}

            {step >= 5 && step <= 7 && (
              <WizardStepsLocation
                step={step}
                language={language}
                tr={tr}
                setValidationError={setValidationError}
                neighborhood={neighborhood}
                setNeighborhood={setNeighborhood}
                isOtherNeighborhood={isOtherNeighborhood}
                setIsOtherNeighborhood={setIsOtherNeighborhood}
                customNeighborhood={customNeighborhood}
                setCustomNeighborhood={setCustomNeighborhood}
                showNeighborhoodSuggestions={showNeighborhoodSuggestions}
                setShowNeighborhoodSuggestions={setShowNeighborhoodSuggestions}
                showAllNeighborhoods={showAllNeighborhoods}
                setShowAllNeighborhoods={setShowAllNeighborhoods}
                street={street}
                setStreet={setStreet}
                showAllStreets={showAllStreets}
                setShowAllStreets={setShowAllStreets}
                showStreetSuggestions={showStreetSuggestions}
                setShowStreetSuggestions={setShowStreetSuggestions}
                landmark={landmark}
                setLandmark={setLandmark}
                showAllLandmarks={showAllLandmarks}
                setShowAllLandmarks={setShowAllLandmarks}
                showLandmarkSuggestions={showLandmarkSuggestions}
                setShowLandmarkSuggestions={setShowLandmarkSuggestions}
              />
            )}

            {step >= 8 && (
              <WizardStepsFinal
                step={step}
                isRTL={isRTL}
                tr={tr}
                setValidationError={setValidationError}
                citizenName={citizenName}
                setCitizenName={setCitizenName}
                citizenPhone={citizenPhone}
                setCitizenPhone={setCitizenPhone}
                previewGalleryUrls={previewGalleryUrls}
                sector={sector}
                selectedSectorLabel={selectedSectorLabel}
                title={title}
                description={description}
                latitude={latitude}
                longitude={longitude}
                finalNeighborhoodVal={finalNeighborhoodVal}
                street={street}
                landmark={landmark}
                isSent={isSent}
              />
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
                    <span>
                      {tr('جاري التجهيز السريع...', 'ئامادەکردنی خێرا...', 'Processing quickly...')}
                    </span>
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

        <WizardHelperModals
          dir={dir}
          language={language}
          isRTL={isRTL}
          tr={tr}
          sectorInfoModal={sectorInfoModal}
          setSectorInfoModal={setSectorInfoModal}
          onSelectSectorFromModal={(sec) => setSector(sec)}
          smartModalType={smartModalType}
          setSmartModalType={setSmartModalType}
          currentSectorSuggestions={currentSectorSuggestions}
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          setValidationError={setValidationError}
        />

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
