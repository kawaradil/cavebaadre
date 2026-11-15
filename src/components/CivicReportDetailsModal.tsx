import React, { useState } from 'react';
import { X, ArrowRight, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CivicReport,
  SECTOR_META,
  URGENCY_META,
  ReportStatus,
  ReportUrgency,
  isReportUrgencyConfirmed,
} from '../types/baadre';
import { OFFICIAL_PHONE_LOCAL, toWhatsAppIntlNumber } from '../constants/officialContact';
import { useBaadre } from '../context/BaadreContext';
import { useLanguage } from '../context/LanguageContext';
import { playClickSound, playSuccessSound } from '../lib/sound';
import {
  compressImageFile,
  uploadImageToFirebaseStorage,
  MAX_UPLOAD_IMAGES,
} from '../lib/firebase';
import { SmartAdaptiveImage } from './SmartAdaptiveImage';
import { FIELD_LIMITS, enforceInputLimit } from '../lib/inputLimits';
import {
  RecipientRoleKey,
  TimelineActionStatus,
  RecipientOption,
  toEnglishDigits,
  formatReportDateTime,
  prepareReportImageFiles,
  triggerBackgroundDownload,
  buildDepartmentWhatsAppMessage,
} from './report-details/reportShareHelpers';
import { ReportReceivedAndPrioritySteps } from './report-details/ReportReceivedAndPrioritySteps';
import { ReportDispatchStep } from './report-details/ReportDispatchStep';
import { ReportResolutionAndRejectionStep } from './report-details/ReportResolutionAndRejectionStep';

interface CivicReportDetailsModalProps {
  report: CivicReport | null;
  onClose: () => void;
}

export const CivicReportDetailsModal: React.FC<CivicReportDetailsModalProps> = ({
  report,
  onClose,
}) => {
  const {
    activeRole,
    setEditingCitizenReport,
    updateReportStatus,
    revertReportResolution,
    updateReportUrgency,
    deleteReport,
    departments,
  } = useBaadre();
  const { language, dir, isRTL } = useLanguage();
  const [copiedCode, setCopiedCode] = useState(false);

  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

  const [selectedUrgency, setSelectedUrgency] = useState<ReportUrgency>(
    report?.urgency || 'normal'
  );
  const [isUrgencyConfirmed, setIsUrgencyConfirmed] = useState<boolean>(
    report ? isReportUrgencyConfirmed(report) : false
  );
  const [urgencySavedToast, setUrgencySavedToast] = useState(false);

  const [editingStep, setEditingStep] = useState<TimelineActionStatus | null>(null);
  const [isRevertConfirmOpen, setIsRevertConfirmOpen] = useState(false);
  const [departmentSelectError, setDepartmentSelectError] = useState<string | null>(null);

  const [statusNotes, setStatusNotes] = useState<Record<ReportStatus, string>>({
    pending: '',
    in_progress: '',
    resolved: '',
    rejected: '',
  });
  const [resolvedImages, setResolvedImages] = useState<string[]>(report?.resolvedImages || []);
  const [assignedTeam, setAssignedTeam] = useState(report?.assignedTeam || '');
  const [selectedRecipientKey, setSelectedRecipientKey] = useState<RecipientRoleKey>('phone1');

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [activeReportImageIdx, setActiveReportImageIdx] = useState<number>(0);
  const [isUploadingStorage, setIsUploadingStorage] = useState<boolean>(false);
  const [uploadLimitMessage, setUploadLimitMessage] = useState<string>('');

  React.useEffect(() => {
    if (report) {
      setSelectedUrgency(report.urgency || 'normal');
      setIsUrgencyConfirmed(isReportUrgencyConfirmed(report));
      setUrgencySavedToast(false);

      const savedNotes = report.statusNotes || {};
      const fallbackCurrentNote = report.officialNote || report.adminNotes || '';
      setStatusNotes({
        pending:
          savedNotes.pending !== undefined
            ? savedNotes.pending
            : report.status === 'pending'
            ? fallbackCurrentNote
            : '',
        in_progress:
          savedNotes.in_progress !== undefined
            ? savedNotes.in_progress
            : report.status === 'in_progress'
            ? fallbackCurrentNote
            : '',
        resolved:
          savedNotes.resolved !== undefined
            ? savedNotes.resolved
            : report.status === 'resolved'
            ? fallbackCurrentNote
            : '',
        rejected:
          savedNotes.rejected !== undefined
            ? savedNotes.rejected
            : report.status === 'rejected'
            ? fallbackCurrentNote
            : '',
      });
      setResolvedImages(report.resolvedImages || []);
      const matched = departments.find(
        (d) => d.nameAr === report.assignedTeam || d.fieldTeamName === report.assignedTeam
      );
      setAssignedTeam(matched?.nameAr || report.assignedTeam || '');
      setEditingStep(null);
      setDepartmentSelectError(null);
      setIsRevertConfirmOpen(false);
      setIsDeleteConfirmOpen(false);
      setActiveReportImageIdx(0);
      setUploadLimitMessage('');
    }
  }, [report?.id]);

  if (!report) return null;

  const sector = SECTOR_META[report.sector] || SECTOR_META.other;
  const urgency = URGENCY_META[selectedUrgency] || URGENCY_META.normal;

  const sectorLabel = language === 'ku' ? sector.ku : language === 'en' ? sector.en : sector.ar;
  const urgencyLabel =
    language === 'ku' ? urgency.ku : language === 'en' ? urgency.en : urgency.labelAr;

  const handleSelectUrgency = (newUrgency: ReportUrgency) => {
    playClickSound();
    setSelectedUrgency(newUrgency);
    setIsUrgencyConfirmed(true);
    updateReportUrgency(report.id, newUrgency);
    setUrgencySavedToast(true);
    setTimeout(() => setUrgencySavedToast(false), 2000);
  };

  const matchedDept = departments.find(
    (d) => d.nameAr === assignedTeam || d.fieldTeamName === assignedTeam
  );

  const phone1 =
    matchedDept?.phone1 ||
    matchedDept?.engineerPhone ||
    matchedDept?.phone ||
    OFFICIAL_PHONE_LOCAL;
  const owner1 =
    matchedDept?.phone1Owner ||
    matchedDept?.engineerName ||
    matchedDept?.headName ||
    tr('مسؤول التواصل', 'بەرپرسی پەیوەندی', 'Contact Officer');

  const phone2 =
    matchedDept?.phone2 || matchedDept?.managerPhone || matchedDept?.deputyPhone || '';
  const owner2 =
    matchedDept?.phone2Owner ||
    matchedDept?.managerName ||
    matchedDept?.deputyName ||
    tr('مسؤول إضافي', 'بەرپرسی تر', 'Secondary Officer');

  const recipientOptions: RecipientOption[] = [
    {
      key: 'phone1',
      roleAr: tr('المسؤول', 'بەرپرس', 'Officer in charge'),
      roleKu: 'بەرپرس',
      roleEn: 'Officer in charge',
      name: owner1,
      phone: phone1,
    },
    ...(phone2
      ? [
          {
            key: 'phone2' as RecipientRoleKey,
            roleAr: tr('رقم إضافي', 'ژمارەی تر', 'Secondary Contact'),
            roleKu: 'ژمارەی تر',
            roleEn: 'Secondary Contact',
            name: owner2,
            phone: phone2,
          },
        ]
      : []),
  ];

  const activeRecipient =
    recipientOptions.find((r) => r.key === selectedRecipientKey) || recipientOptions[0];

  const deptAr =
    matchedDept?.nameAr || assignedTeam || 'الدائرة الخدمية المعنية في ناحية باعدرى';
  const deptKu =
    matchedDept?.nameKu ||
    matchedDept?.nameAr ||
    assignedTeam ||
    'فەرمانگەی خزمەتگوزاری پەیوەندیدار لە باعەدرێ';

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(report.trackingCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {}
  };

  const updateNoteForStep = (stepKey: TimelineActionStatus, value: string) => {
    const safeValue = enforceInputLimit(
      value,
      FIELD_LIMITS.DESCRIPTION.maxWords,
      FIELD_LIMITS.DESCRIPTION.maxChars
    );
    setStatusNotes((prev) => ({
      ...prev,
      [stepKey]: safeValue,
    }));
  };

  const handleResolvedImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList: File[] = Array.from(files);
    e.target.value = '';

    const remainingSlots = MAX_UPLOAD_IMAGES - resolvedImages.length;
    if (remainingSlots <= 0) {
      setUploadLimitMessage(
        tr(
          `الحد الأقصى المسموح به هو ${MAX_UPLOAD_IMAGES} صور فقط.`,
          `تەنها ${MAX_UPLOAD_IMAGES} وێنە ڕێگەپێدراوە.`,
          `Maximum allowed is ${MAX_UPLOAD_IMAGES} photos only.`
        )
      );
      return;
    }

    const filesToProcess = fileList.slice(0, remainingSlots);
    if (fileList.length > remainingSlots) {
      setUploadLimitMessage(
        tr(
          `تم اختيار أول ${remainingSlots} صور فقط (الحد الأقصى ${MAX_UPLOAD_IMAGES} صور).`,
          `تەنها ${remainingSlots} وێنە وەرگیرا (زۆرترین سنوور ${MAX_UPLOAD_IMAGES} وێنەیە).`,
          `Only ${remainingSlots} photos added (Maximum limit is ${MAX_UPLOAD_IMAGES} photos).`
        )
      );
    } else {
      setUploadLimitMessage('');
    }

    const compressedList = await Promise.all(
      filesToProcess.map((file: File) => compressImageFile(file))
    );
    const validImgs = compressedList.filter(Boolean);
    if (validImgs.length > 0) {
      const nextImages = [...resolvedImages, ...validImgs].slice(0, MAX_UPLOAD_IMAGES);
      setResolvedImages(nextImages);
    }
  };

  const handleRemoveResolvedImage = (index: number) => {
    setResolvedImages((prev) => prev.filter((_, idx) => idx !== index));
    setUploadLimitMessage('');
  };

  const handleSaveTimelineStep = async (
    e: React.FormEvent,
    stepStatus: TimelineActionStatus
  ) => {
    e.preventDefault();
    if (isUploadingStorage) return;

    if (stepStatus === 'in_progress' && !assignedTeam.trim()) {
      setDepartmentSelectError(
        tr(
          'الرجاء اختيار الدائرة الخدمية المعنية من القائمة أولاً',
          'تکایە سەرەتا فەرمانگەی پێوەندیدار هەڵبژێرە',
          'Please select a department first'
        )
      );
      return;
    }
    setDepartmentSelectError(null);

    const targetDept = assignedTeam.trim() || report.assignedTeam || 'مديرية بلدية باعدرى';
    const rawNoteForStatus = (statusNotes[stepStatus] || '').trim();

    const recipientFullLabel = activeRecipient.name
      ? `${activeRecipient.name} (${activeRecipient.phone})`
      : targetDept;

    const finalNote =
      stepStatus === 'rejected'
        ? rawNoteForStatus || tr('تم رفض البلاغ', 'ڕەتکرایەوە', 'Rejected')
        : stepStatus === 'resolved'
        ? rawNoteForStatus ||
          tr(
            `تم إنجاز ومعالجة البلاغ الميداني من قبل ${targetDept} بنجاح.`,
            `سکاڵاکە بە سەرکەوتوویی لەلایەن ${targetDept} ئەنجامدرا.`,
            `Report resolved and completed successfully by ${targetDept}.`
          )
        : rawNoteForStatus ||
          tr(
            `تم إرسال البلاغ إلى ${targetDept} (المسؤول: ${activeRecipient.name}).`,
            `سکاڵاکە نێردرا بۆ ${deptKu} (بەرپرس: ${activeRecipient.name}).`,
            `Report sent to ${targetDept} (Contact: ${activeRecipient.name}).`
          );

    const updatedNotesMap: Record<ReportStatus, string> = {
      ...statusNotes,
      [stepStatus]: finalNote,
    };
    if (stepStatus === 'resolved') {
      updatedNotesMap.rejected = '';
    }
    setStatusNotes(updatedNotesMap);

    let finalResolvedImages = resolvedImages.filter((img) => !img.startsWith('data:'));

    if (stepStatus === 'resolved') {
      setIsUploadingStorage(true);
      try {
        if (resolvedImages.length > 0) {
          const uploaded = await Promise.all(
            resolvedImages
              .slice(0, MAX_UPLOAD_IMAGES)
              .map((img) => uploadImageToFirebaseStorage(img, 'completed_work'))
          );
          finalResolvedImages = uploaded.filter(
            (url): url is string => Boolean(url && !url.startsWith('data:'))
          );
          setResolvedImages(finalResolvedImages);
        }
      } finally {
        setIsUploadingStorage(false);
      }
    }

    playSuccessSound();
    setIsUrgencyConfirmed(true);

    updateReportStatus(
      report.id,
      stepStatus,
      finalNote,
      targetDept,
      stepStatus === 'resolved' ? finalResolvedImages : undefined,
      updatedNotesMap,
      selectedUrgency,
      stepStatus === 'in_progress' ? recipientFullLabel : report.assignedRecipient
    );

    if (stepStatus === 'in_progress') {
      const waMsg = buildDepartmentWhatsAppMessage({
        report,
        adminNoteText: rawNoteForStatus,
        activeRecipient,
        deptAr,
        deptKu,
        selectedUrgency,
        tr,
      });
      const waPhone = toWhatsAppIntlNumber(activeRecipient.phone);
      const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(waMsg)}`;

      const reportImages = report.images || [];
      if (reportImages.length > 0) {
        prepareReportImageFiles(reportImages, report.trackingCode)
          .then(async (files) => {
            if (files.length > 0) {
              if (
                typeof navigator !== 'undefined' &&
                navigator.share &&
                navigator.canShare &&
                navigator.canShare({ files })
              ) {
                try {
                  await navigator.share({
                    title: `ÇAVÊ BAADRÊ - ${report.title}`,
                    text: waMsg,
                    files,
                  });
                  return;
                } catch {}
              }
              triggerBackgroundDownload(files);
            }
          })
          .catch(() => {})
          .finally(() => {
            window.open(waUrl, '_blank', 'noopener,noreferrer');
          });
      } else {
        window.open(waUrl, '_blank', 'noopener,noreferrer');
      }
    }

    setEditingStep(null);
    setIsRevertConfirmOpen(false);
  };

  const getStatusStepDisplay = () => {
    if (report.status === 'pending') {
      return {
        text: tr('تم الاستلام', 'وەرگیرا', 'Received'),
        colorClass: 'text-[#46674D]',
        dotClass: 'bg-[#46674D]',
        timestamp: report.createdAt,
      };
    }
    if (report.status === 'resolved') {
      const baseResolved = tr('تم الإنجاز', 'ئەنجامدرا', 'Completed');
      return {
        text: report.assignedTeam ? `${baseResolved} — ${report.assignedTeam}` : baseResolved,
        colorClass: 'text-emerald-600',
        dotClass: 'bg-emerald-600',
        timestamp: report.statusTimestamps?.resolved || report.resolvedAt || report.updatedAt,
      };
    }
    if (report.status === 'rejected') {
      const baseRej = tr('تم الرفض', 'ڕەتکرایەوە', 'Rejected');
      return {
        text: report.officialNote ? `${baseRej} — ${report.officialNote}` : baseRej,
        colorClass: 'text-slate-600',
        dotClass: 'bg-slate-600',
        timestamp: report.statusTimestamps?.rejected || report.updatedAt,
      };
    }
    const dept =
      report.assignedTeam || tr('دائرة بلدية باعدرى', 'شارەوانی باعەدرێ', 'Baadre Municipality');
    return {
      text: `${tr('تم الإرسال إلى', 'نێردرا بۆ', 'Sent to')} ${dept}`,
      colorClass: 'text-blue-600',
      dotClass: 'bg-blue-600',
      timestamp: report.statusTimestamps?.in_progress || report.updatedAt,
    };
  };

  const statusStep = getStatusStepDisplay();

  const hasInProgressRecord =
    Boolean(report.statusTimestamps?.in_progress) ||
    Boolean(report.statusNotes?.in_progress) ||
    report.status === 'in_progress';
  const hasResolvedRecord =
    Boolean(report.statusTimestamps?.resolved) ||
    Boolean(report.statusNotes?.resolved) ||
    report.status === 'resolved';
  const hasRejectedRecord =
    !hasResolvedRecord &&
    (Boolean(report.statusTimestamps?.rejected) ||
      Boolean(report.statusNotes?.rejected) ||
      report.status === 'rejected');

  const savedInProgressTime = formatReportDateTime(
    report.statusTimestamps?.in_progress ||
      (report.status === 'in_progress' ? report.updatedAt : undefined)
  );
  const savedResolvedTime = formatReportDateTime(
    report.statusTimestamps?.resolved ||
      report.resolvedAt ||
      (report.status === 'resolved' ? report.updatedAt : undefined)
  );
  const savedRejectedTime = formatReportDateTime(
    report.statusTimestamps?.rejected ||
      (report.status === 'rejected' ? report.updatedAt : undefined)
  );

  const savedInProgressNote =
    report.statusNotes?.in_progress ||
    (report.status === 'in_progress' ? report.officialNote || report.adminNotes : '');
  const savedResolvedNote =
    report.statusNotes?.resolved ||
    (report.status === 'resolved' ? report.officialNote || report.adminNotes : '');
  const savedRejectedNote =
    report.statusNotes?.rejected ||
    (report.status === 'rejected' ? report.officialNote || report.adminNotes : '');

  const recipientsHistoryList: string[] =
    Array.isArray(report.assignedRecipients) && report.assignedRecipients.length > 0
      ? report.assignedRecipients
      : report.assignedRecipient && report.assignedRecipient.trim()
      ? report.assignedRecipient
          .split(' ، ثم: ')
          .map((s) => s.trim())
          .filter(Boolean)
      : hasInProgressRecord
      ? [`${recipientOptions[0].roleAr}: ${recipientOptions[0].name}`]
      : [];

  const handleConfirmRevertResolution = () => {
    playClickSound();
    revertReportResolution(report.id);
    setResolvedImages([]);
    setStatusNotes((prev) => ({
      ...prev,
      resolved: '',
    }));
    setIsRevertConfirmOpen(false);
    setEditingStep(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        dir={dir}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        className={`fixed inset-0 z-[100] w-full h-full bg-white overflow-y-auto flex flex-col ${
          isRTL ? 'text-right' : 'text-left'
        }`}
      >
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#E8F4EA] px-4 sm:px-8 py-3 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-[#1E3725] hover:text-[#46674D] transition-colors cursor-pointer"
          >
            <ArrowRight className={`w-4 h-4 ${!isRTL ? 'rotate-180' : ''}`} />
            <span>{tr('رجوع', 'گەڕانەوە', 'Back')}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              aria-label={tr('إغلاق', 'داخستن', 'Close')}
              className="w-8 h-8 rounded-full hover:bg-[#F4F9F5] text-[#1E3725] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          className={`max-w-3xl w-full mx-auto pb-16 ${isRTL ? 'text-right' : 'text-left'}`}
          dir={dir}
        >
          <div className="w-full space-y-2">
            <div className="w-full aspect-video bg-[#1E3725] overflow-hidden relative group">
              <div className="w-full h-full relative">
                <SmartAdaptiveImage
                  src={report.images[activeReportImageIdx] || report.images[0]}
                  alt={report.title}
                  gallery={report.images}
                  initialIndex={activeReportImageIdx}
                />
              </div>
            </div>

            {report.images && report.images.length > 1 && (
              <div className="px-4 sm:px-8 flex items-center gap-2 overflow-x-auto pb-1">
                {report.images.slice(0, MAX_UPLOAD_IMAGES).map((imgUrl, idx) => (
                  <button
                    key={`rep-main-thumb-${idx}`}
                    type="button"
                    onClick={() => {
                      setActiveReportImageIdx(idx);
                    }}
                    className={`relative w-16 h-11 rounded-xl overflow-hidden border-2 shrink-0 cursor-pointer transition-all ${
                      activeReportImageIdx === idx
                        ? 'border-[#46674D] ring-2 ring-[#46674D]/30'
                        : 'border-[#BBDDC6] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <SmartAdaptiveImage
                      src={imgUrl}
                      alt={`${report.title} ${idx + 1}`}
                      disableLightbox
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="px-4 sm:px-8 py-5 space-y-5">
            <div>
              <h1 className="text-lg sm:text-xl font-black text-[#1E3725] leading-snug">
                {report.title}
              </h1>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-[#F4F9F5] border border-[#BBDDC6] space-y-4">
              <div className="relative space-y-5">
                <div
                  className={`absolute top-5 bottom-5 w-0.5 bg-[#BBDDC6] ${
                    isRTL ? 'right-4' : 'left-4'
                  }`}
                />

                <ReportReceivedAndPrioritySteps
                  report={report}
                  activeRole={activeRole}
                  sectorLabel={sectorLabel}
                  urgencyLabel={urgencyLabel}
                  selectedUrgency={selectedUrgency}
                  isUrgencyConfirmed={isUrgencyConfirmed}
                  urgencySavedToast={urgencySavedToast}
                  copiedCode={copiedCode}
                  onCopyCode={handleCopyCode}
                  onSelectUrgency={handleSelectUrgency}
                  statusStep={statusStep}
                  tr={tr}
                />

                <ReportDispatchStep
                  report={report}
                  language={language}
                  activeRole={activeRole}
                  hasInProgressRecord={hasInProgressRecord}
                  editingStep={editingStep}
                  setEditingStep={(step) => {
                    setDepartmentSelectError(null);
                    setEditingStep(step);
                  }}
                  savedInProgressTime={savedInProgressTime}
                  savedInProgressNote={savedInProgressNote || ''}
                  recipientsHistoryList={recipientsHistoryList}
                  departments={departments}
                  assignedTeam={assignedTeam}
                  setAssignedTeam={(val) => {
                    setDepartmentSelectError(null);
                    setAssignedTeam(val);
                  }}
                  recipientOptions={recipientOptions}
                  selectedRecipientKey={selectedRecipientKey}
                  setSelectedRecipientKey={setSelectedRecipientKey}
                  inProgressNoteValue={statusNotes.in_progress || ''}
                  onChangeInProgressNote={(val) => updateNoteForStep('in_progress', val)}
                  departmentSelectError={departmentSelectError}
                  onSaveDispatch={(e) => handleSaveTimelineStep(e, 'in_progress')}
                  tr={tr}
                />

                <ReportResolutionAndRejectionStep
                  report={report}
                  activeRole={activeRole}
                  hasResolvedRecord={hasResolvedRecord}
                  hasRejectedRecord={hasRejectedRecord}
                  editingStep={editingStep}
                  setEditingStep={setEditingStep}
                  savedResolvedTime={savedResolvedTime}
                  savedResolvedNote={savedResolvedNote || ''}
                  savedRejectedTime={savedRejectedTime}
                  savedRejectedNote={savedRejectedNote || ''}
                  resolvedImages={resolvedImages}
                  uploadLimitMessage={uploadLimitMessage}
                  onResolvedImagesUpload={handleResolvedImagesUpload}
                  onRemoveResolvedImage={handleRemoveResolvedImage}
                  resolvedNoteValue={statusNotes.resolved || ''}
                  onChangeResolvedNote={(val) => updateNoteForStep('resolved', val)}
                  rejectedNoteValue={statusNotes.rejected || ''}
                  onChangeRejectedNote={(val) => updateNoteForStep('rejected', val)}
                  isUploadingStorage={isUploadingStorage}
                  isRevertConfirmOpen={isRevertConfirmOpen}
                  setIsRevertConfirmOpen={setIsRevertConfirmOpen}
                  onConfirmRevertResolution={handleConfirmRevertResolution}
                  onSaveResolved={(e) => handleSaveTimelineStep(e, 'resolved')}
                  onSaveRejected={(e) => handleSaveTimelineStep(e, 'rejected')}
                  tr={tr}
                />
              </div>

              {(activeRole === 'admin' ||
                (!hasInProgressRecord && !hasResolvedRecord && report.status === 'pending')) && (
                <div className="pt-3 border-t border-[#E8F4EA] flex items-center justify-center gap-5">
                  {activeRole !== 'admin' &&
                    !hasInProgressRecord &&
                    !hasResolvedRecord &&
                    report.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setEditingCitizenReport(report);
                        }}
                        className="text-xs font-bold text-[#46674D] hover:text-[#1E3725] transition-colors cursor-pointer"
                      >
                        {tr('تعديل البلاغ', 'دەستکاری سکاڵا', 'Edit Report')}
                      </button>
                    )}

                  {(activeRole === 'admin' ||
                    (!hasInProgressRecord &&
                      !hasResolvedRecord &&
                      report.status === 'pending')) && (
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setIsDeleteConfirmOpen(true);
                      }}
                      className="text-xs font-bold text-rose-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      {tr('حذف البلاغ', 'سڕینەوەی سکاڵا', 'Delete Report')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {isDeleteConfirmOpen && (
          <div
            dir={dir}
            onClick={() => setIsDeleteConfirmOpen(false)}
            className="fixed inset-0 z-[150] bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-white border border-rose-200 shadow-2xl p-6 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-base font-black text-[#1E3725]">
                  {tr('تنبيه حذف البلاغ', 'ئاگاداری سڕینەوەی سکاڵا', 'Delete Report Alert')}
                </h4>
                <p className="text-xs font-bold text-[#46674D] leading-relaxed">
                  {tr(
                    'هل أنت متأكد من حذف هذا البلاغ نهائياً؟ لا يمكن التراجع عن هذا الإجراء.',
                    'ئایا دڵنیایت لە سڕینەوەی ئەم سکاڵایە بە تەواوی؟ ناتوانرێت بگەڕێنرێتەوە.',
                    'Are you sure you want to permanently delete this report?'
                  )}
                </p>
                <p className="text-xs font-mono font-black text-rose-600" dir="ltr">
                  {toEnglishDigits(report.trackingCode)}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    deleteReport(report.id);
                    setIsDeleteConfirmOpen(false);
                    onClose();
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer transition-colors shadow-xs"
                >
                  {tr('نعم، حذف البلاغ', 'بەڵێ، سڕینەوە', 'Yes, Delete')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                >
                  {tr('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
