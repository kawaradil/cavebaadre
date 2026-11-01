import React, { useState } from 'react';
import {
  X,
  MapPin,
  CheckCircle2,
  User,
  Phone,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
  Camera,
  Upload,
  Loader2,
  Clock,
  Building2,
  Edit3,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CivicReport,
  SECTOR_META,
  URGENCY_META,
  ReportStatus,
  ReportUrgency,
  MUNICIPAL_WHATSAPP_NUMBER,
  isReportUrgencyConfirmed,
} from '../types/baadre';
import { useBaadre } from '../context/BaadreContext';
import { useLanguage } from '../context/LanguageContext';
import { playClickSound, playSuccessSound } from '../lib/sound';
import {
  compressImageFile,
  uploadImageToFirebaseStorage,
  MAX_UPLOAD_IMAGES,
} from '../lib/firebase';
import { SmartAdaptiveImage } from './SmartAdaptiveImage';
import {
  FIELD_LIMITS,
  enforceInputLimit,
  FieldLimitBadge,
} from '../lib/inputLimits';

// Helper to convert report images to files in background for direct WhatsApp chat attachment
const prepareReportImageFiles = async (
  imageUrls: string[],
  trackingCode: string
): Promise<File[]> => {
  const files: File[] = [];
  for (let idx = 0; idx < imageUrls.length; idx++) {
    const url = imageUrls[idx];
    if (!url) continue;
    try {
      if (url.startsWith('data:')) {
        const res = await fetch(url);
        const blob = await res.blob();
        const ext = blob.type.includes('png') ? 'png' : 'jpg';
        files.push(
          new File([blob], `CaveBaadre_${trackingCode}_photo_${idx + 1}.${ext}`, {
            type: blob.type || 'image/jpeg',
          })
        );
      } else {
        const res = await fetch(url, { mode: 'cors' });
        const blob = await res.blob();
        const ext = blob.type.includes('png') ? 'png' : 'jpg';
        files.push(
          new File([blob], `CaveBaadre_${trackingCode}_photo_${idx + 1}.${ext}`, {
            type: blob.type || 'image/jpeg',
          })
        );
      }
    } catch {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        const loaded = await new Promise<boolean>((resolve) => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = url;
        });
        if (loaded) {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 800;
          canvas.height = img.naturalHeight || 600;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const blob = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob(resolve, 'image/jpeg', 0.9)
            );
            if (blob) {
              files.push(
                new File([blob], `CaveBaadre_${trackingCode}_photo_${idx + 1}.jpg`, {
                  type: 'image/jpeg',
                })
              );
            }
          }
        }
      } catch {
        // continue
      }
    }
  }
  return files;
};

// Helper to trigger background download of images without storage links
const triggerBackgroundDownload = (files: File[]) => {
  files.forEach((file, index) => {
    setTimeout(() => {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 12000);
    }, index * 220);
  });
};

interface CivicReportDetailsModalProps {
  report: CivicReport | null;
  onClose: () => void;
}

type RecipientRoleKey = 'engineer' | 'deputy' | 'manager';
type TimelineActionStatus = 'in_progress' | 'resolved' | 'rejected';

export const CivicReportDetailsModal: React.FC<CivicReportDetailsModalProps> = ({
  report,
  onClose,
}) => {
  const {
    activeRole,
    myReportIds,
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

  // لا يفتح الفورم إلا بواسطة زر "تعديل" (أو زر إضافة إذا لم يكن محفوظاً بعد)
  const [editingStep, setEditingStep] = useState<TimelineActionStatus | null>(
    null
  );
  // نافذة تنبيه التأكيد عند النقر على "لم يتم الإنجاز"
  const [isRevertConfirmOpen, setIsRevertConfirmOpen] = useState(false);

  const [statusNotes, setStatusNotes] = useState<Record<ReportStatus, string>>({
    pending: '',
    in_progress: '',
    resolved: '',
    rejected: '',
  });
  const [resolvedImages, setResolvedImages] = useState<string[]>(
    report?.resolvedImages || []
  );
  const [assignedTeam, setAssignedTeam] = useState(report?.assignedTeam || '');
  const [selectedRecipientKey, setSelectedRecipientKey] =
    useState<RecipientRoleKey>('engineer');

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
        (d) =>
          d.nameAr === report.assignedTeam ||
          d.fieldTeamName === report.assignedTeam
      );
      setAssignedTeam(
        matched?.nameAr || report.assignedTeam || departments[0]?.nameAr || ''
      );
      setEditingStep(null);
      setIsRevertConfirmOpen(false);
      setIsDeleteConfirmOpen(false);
      setActiveReportImageIdx(0);
      setUploadLimitMessage('');
    }
  }, [report?.id]);

  if (!report) return null;

  const sector = SECTOR_META[report.sector] || SECTOR_META.other;
  const urgency = URGENCY_META[selectedUrgency] || URGENCY_META.normal;

  const sectorLabel =
    language === 'ku' ? sector.ku : language === 'en' ? sector.en : sector.ar;
  const urgencyLabel =
    language === 'ku' ? urgency.ku : language === 'en' ? urgency.en : urgency.labelAr;

  const toEnglishDigits = (val: string | number): string =>
    String(val)
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const dateStr = d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const timeStr = d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return toEnglishDigits(`${dateStr} • ${timeStr}`);
    } catch {
      return '';
    }
  };

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

  const formatWaNumber = (phoneStr?: string) => {
    if (!phoneStr) return MUNICIPAL_WHATSAPP_NUMBER.replace(/\D/g, '');
    const digits = phoneStr.replace(/\D/g, '');
    if (digits.startsWith('964')) return digits;
    if (digits.startsWith('0')) return `964${digits.slice(1)}`;
    return `964${digits}`;
  };

  const engineerName =
    matchedDept?.engineerName ||
    matchedDept?.headName ||
    tr('المهندس المختص', 'ئەندازیاری تایبەتمەند', 'Specialist Engineer');
  const engineerPhone = matchedDept?.engineerPhone || matchedDept?.phone || '07504738358';

  const deputyName =
    matchedDept?.deputyName ||
    tr('معاون المدير', 'جێگری بەڕێوەبەر', 'Deputy Director');
  const deputyPhone = matchedDept?.deputyPhone || matchedDept?.phone || '07504738358';

  const managerName =
    matchedDept?.managerName ||
    matchedDept?.headName ||
    tr('مدير الدائرة', 'بەڕێوەبەری فەرمانگە', 'Department Director');
  const managerPhone =
    matchedDept?.managerPhone || matchedDept?.emergencyPhone || '07504738358';

  const recipientOptions: {
    key: RecipientRoleKey;
    roleAr: string;
    roleKu: string;
    roleEn: string;
    name: string;
    phone: string;
  }[] = [
    {
      key: 'engineer',
      roleAr: 'المهندس المختص',
      roleKu: 'ئەندازیاری تایبەتمەند',
      roleEn: 'Engineer',
      name: engineerName,
      phone: engineerPhone,
    },
    {
      key: 'deputy',
      roleAr: 'معاون المدير',
      roleKu: 'جێگری بەڕێوەبەر',
      roleEn: 'Deputy',
      name: deputyName,
      phone: deputyPhone,
    },
    {
      key: 'manager',
      roleAr: 'مدير الدائرة',
      roleKu: 'بەڕێوەبەری فەرمانگە',
      roleEn: 'Director',
      name: managerName,
      phone: managerPhone,
    },
  ];

  const activeRecipient =
    recipientOptions.find((r) => r.key === selectedRecipientKey) ||
    recipientOptions[0];

  const deptAr =
    matchedDept?.nameAr || assignedTeam || 'الدائرة الخدمية المعنية في ناحية باعدرى';
  const deptKu =
    matchedDept?.nameKu ||
    matchedDept?.nameAr ||
    assignedTeam ||
    'فەرمانگەی خزمەتگوزاری پەیوەندیدار لە باعەدرێ';

  const buildWhatsAppDispatchMessage = (adminNoteText: string) => {
    const lines: string[] = [
      `🏛️ *إحالة بلاغ رسمي - تطبيق ÇAVÊ BAADRÊ (منظمة Raba)*`,
      `🏛️ *ناردنی سکاڵای فەرمی - ئەپی ÇAVÊ BAADRÊ (ڕێکخراوی Raba)*`,
      `━━━━━━━━━━━━━━━━━━`,
      `🏢 *الدائرة:* ${deptAr}`,
      `👤 *المستلم (${activeRecipient.roleAr}):* ${activeRecipient.name}`,
      `🔖 *رمز البلاغ:* ${report.trackingCode}`,
      `📌 *عنوان البلاغ:* ${report.title}`,
      `📂 *القطاع الخدمي:* ${sector.ar}`,
      `🚨 *الأولوية:* ${urgency.labelAr}`,
      `📍 *الموقع:* ناحية باعذرة - ${report.neighborhood} (${report.street})`,
      `📝 *تفاصيل البلاغ:* ${report.description}`,
      `👤 *مقدم البلاغ:* ${report.citizenName} (${report.citizenPhone})`,
    ];

    if (adminNoteText.trim()) {
      lines.push(`📋 *ملاحظات الإدارة:* ${adminNoteText.trim()}`);
    }

    const imgCount = report.images?.length || 0;
    if (imgCount > 0) {
      lines.push(
        `📷 *الصور التوثيقية المرفقة:* (${imgCount} صور) تم تحميلها في الخلفية لإرفاقها مباشرة بالمحادثة`
      );
    }

    lines.push(
      `━━━━━━━━━━━━━━━━━━`,
      `☀️ *کوردی:*`,
      `🏢 *بۆ فەرمانگەی:* ${deptKu}`,
      `👤 *وەرگر (${activeRecipient.roleKu}):* ${activeRecipient.name}`,
      `🚨 *گرنگی:* ${urgency.ku}`,
      adminNoteText.trim() ? `📋 *تێبینی کارگێڕی:* ${adminNoteText.trim()}` : '',
      `🗺️ *GPS:* https://www.google.com/maps?q=${report.latitude},${report.longitude}`
    );

    return lines.filter(Boolean).join('\n');
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(report.trackingCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore
    }
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

  const handleResolvedImagesUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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
      const nextImages = [...resolvedImages, ...validImgs].slice(
        0,
        MAX_UPLOAD_IMAGES
      );
      setResolvedImages(nextImages);
    }
  };

  const handleRemoveResolvedImage = (index: number) => {
    setResolvedImages((prev) => prev.filter((_, idx) => idx !== index));
    setUploadLimitMessage('');
  };

  // حفظ سجل المرحلة داخل المخطط الزمني وإغلاق الفورم ليظهر كارت السجل المحفوظ مع زر التعديل فقط
  const handleSaveTimelineStep = async (
    e: React.FormEvent,
    stepStatus: TimelineActionStatus
  ) => {
    e.preventDefault();
    if (isUploadingStorage) return;

    const targetDept =
      assignedTeam.trim() ||
      report.assignedTeam ||
      departments[0]?.nameAr ||
      'مديرية بلدية باعدرى';

    const rawNoteForStatus = (statusNotes[stepStatus] || '').trim();
    const recipientFullLabel = `${activeRecipient.roleAr}: ${activeRecipient.name}`;

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
            `تم إرسال البلاغ إلى ${targetDept} (${recipientFullLabel}).`,
            `سکاڵاکە نێردرا بۆ ${targetDept} (${recipientFullLabel}).`,
            `Report sent to ${targetDept} (${recipientFullLabel}).`
          );

    const updatedNotesMap: Record<ReportStatus, string> = {
      ...statusNotes,
      [stepStatus]: finalNote,
    };
    if (stepStatus === 'resolved') {
      updatedNotesMap.rejected = '';
    }
    setStatusNotes(updatedNotesMap);

    let finalResolvedImages = resolvedImages;
    if (stepStatus === 'resolved' && resolvedImages.length > 0) {
      setIsUploadingStorage(true);
      try {
        finalResolvedImages = await Promise.all(
          resolvedImages
            .slice(0, MAX_UPLOAD_IMAGES)
            .map((img) => uploadImageToFirebaseStorage(img, 'completed_work'))
        );
        setResolvedImages(finalResolvedImages);
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
      const waMsg = buildWhatsAppDispatchMessage(rawNoteForStatus);
      const waPhone = formatWaNumber(activeRecipient.phone);
      const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(waMsg)}`;

      const reportImages = report.images || [];
      if (reportImages.length > 0) {
        // Load and download photos in background for direct chat attachment without storage links
        prepareReportImageFiles(reportImages, report.trackingCode)
          .then(async (files) => {
            if (files.length > 0) {
              // On supported browsers/devices, launch native share sheet with the photos attached
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
                } catch {
                  // User dismissed or system fallback
                }
              }

              // Background download to device so files can be dragged or attached into WhatsApp
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

  const getUrgencyColorClass = (urg: ReportUrgency = selectedUrgency) => {
    if (urg === 'emergency') return 'text-rose-600';
    if (urg === 'high') return 'text-amber-600';
    return 'text-emerald-700';
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
        text: report.assignedTeam
          ? `${baseResolved} — ${report.assignedTeam}`
          : baseResolved,
        colorClass: 'text-emerald-600',
        dotClass: 'bg-emerald-600',
        timestamp:
          report.statusTimestamps?.resolved || report.resolvedAt || report.updatedAt,
      };
    }
    if (report.status === 'rejected') {
      const baseRej = tr('تم الرفض', 'ڕەتکرایەوە', 'Rejected');
      return {
        text: report.officialNote
          ? `${baseRej} — ${report.officialNote}`
          : baseRej,
        colorClass: 'text-slate-600',
        dotClass: 'bg-slate-600',
        timestamp: report.statusTimestamps?.rejected || report.updatedAt,
      };
    }
    const dept =
      report.assignedTeam ||
      tr('دائرة بلدية باعدرى', 'شارەوانی باعەدرێ', 'Baadre Municipality');
    return {
      text: `${tr('تم الإرسال إلى', 'نێردرا بۆ', 'Sent to')} ${dept}`,
      colorClass: 'text-blue-600',
      dotClass: 'bg-blue-600',
      timestamp: report.statusTimestamps?.in_progress || report.updatedAt,
    };
  };

  const statusStep = getStatusStepDisplay();

  // هل يوجد سجل محفوظ لكل مرحلة من مراحل الخط الزمني؟
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

  const savedInProgressTime = formatDateTime(
    report.statusTimestamps?.in_progress ||
      (report.status === 'in_progress' ? report.updatedAt : undefined)
  );
  const savedResolvedTime = formatDateTime(
    report.statusTimestamps?.resolved ||
      report.resolvedAt ||
      (report.status === 'resolved' ? report.updatedAt : undefined)
  );
  const savedRejectedTime = formatDateTime(
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

  // قائمة جميع الأشخاص الذين تم إرسال البلاغ إليهم بالترتيب (الأول ثم من بعده)
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

  // تنفيذ حذف صور وملاحظات الإنجاز وإزالته من الأعمال المنجزة بعد تأكيد الرسالة التحذيرية
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
      {/* Full-Screen Details View — z-[100] */}
      <motion.div
        dir={dir}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        className={`fixed inset-0 z-[100] w-full h-full bg-white overflow-y-auto flex flex-col ${
          isRTL ? 'text-right' : 'text-left'
        }`}
      >
        {/* Sticky Full-Screen Top Bar */}
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

        {/* Main Full-Screen Container */}
        <div
          className={`max-w-3xl w-full mx-auto pb-16 ${
            isRTL ? 'text-right' : 'text-left'
          }`}
          dir={dir}
        >
          {/* Smart Report Image (Opens Full-Screen Lightbox on Click) */}
          <div className="w-full space-y-2">
            <div className="w-full aspect-video bg-[#1E3725] overflow-hidden relative group">
              <SmartAdaptiveImage
                src={report.images[activeReportImageIdx] || report.images[0]}
                alt={report.title}
                gallery={report.images}
                initialIndex={activeReportImageIdx}
              />
            </div>
            {report.images && report.images.length > 1 && (
              <div className="px-4 sm:px-8 flex items-center gap-2 overflow-x-auto pb-1">
                {report.images.slice(0, MAX_UPLOAD_IMAGES).map((imgUrl, idx) => (
                  <button
                    key={`rep-main-thumb-${idx}`}
                    type="button"
                    onClick={() => setActiveReportImageIdx(idx)}
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
            {/* عنوان البلاغ */}
            <div>
              <h1 className="text-lg sm:text-xl font-black text-[#1E3725] leading-snug">
                {report.title}
              </h1>
            </div>

            {/* ════════════════════════════════════════════════════════════════════════
                المخطط الزمني للبلاغ (4 مراحل مرتبة عمودياً فوق بعض بدون أسهم):
                1. تم الاستلام (تفاصيل البلاغ الموجودة)
                2. تحديد الأولوية
                3. تم الإرسال
                4. تم الإنجاز / تم الرفض
               ════════════════════════════════════════════════════════════════════════ */}
            <div className="p-4 sm:p-5 rounded-3xl bg-[#F4F9F5] border border-[#BBDDC6] space-y-4">
              <div className="relative space-y-5">
                {/* الخط العمودي الرابط بين المراحل الـ 4 */}
                <div
                  className={`absolute top-5 bottom-5 w-0.5 bg-[#BBDDC6] ${
                    isRTL ? 'right-4' : 'left-4'
                  }`}
                />

                {/* ────────────────────────────────────────────────────────────────────
                    المرحلة 1: تم الاستلام (يظهر في كارته تفاصيل البلاغ الموجودة)
                   ──────────────────────────────────────────────────────────────────── */}
                <div className="relative flex items-start gap-3">
                  <div className="relative z-10 w-8 h-8 rounded-full bg-[#46674D] text-white border-2 border-[#46674D] flex items-center justify-center shrink-0 text-xs font-black shadow-xs">
                    1
                  </div>

                  <div className="flex-1 min-w-0 space-y-2.5">
                    {/* شريط المرحلة 1 بدون سهم */}
                    <div className="w-full px-4 py-2.5 rounded-xl bg-[#46674D] text-white text-xs font-black flex flex-wrap items-center justify-between gap-2 shadow-xs">
                      <div className="flex items-center gap-2">
                        <span>📥</span>
                        <span>
                          {tr('تم الاستلام', 'وەرگیرا', 'Received')}
                        </span>
                      </div>
                      <span
                        dir="ltr"
                        className="text-[11px] font-mono font-bold bg-white/15 px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1 tabular-nums"
                      >
                        <Clock className="w-3 h-3" />
                        <span>{formatDateTime(report.createdAt)}</span>
                      </span>
                    </div>

                    {/* كارت تفاصيل البلاغ الموجودة داخل مرحلة "تم الاستلام" */}
                    <div className="p-4 rounded-2xl bg-white border border-[#BBDDC6] shadow-xs space-y-3 text-xs sm:text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E8F4EA]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#46674D]">
                            {tr('رمز البلاغ:', 'کۆدی سکاڵا:', 'Code:')}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyCode}
                            dir="ltr"
                            className="inline-flex items-center gap-1.5 font-mono font-black text-[#1E3725] hover:text-[#46674D] cursor-pointer tabular-nums"
                          >
                            <span>{toEnglishDigits(report.trackingCode)}</span>
                            {copiedCode ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-[#46674D]" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#46674D]">
                            {tr('القطاع:', 'کەرت:', 'Sector:')}
                          </span>
                          <span className="font-black text-[#1E3725]">
                            {sector.badgeEmoji} {sectorLabel}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-start gap-2">
                        <span className="text-xs font-bold text-[#46674D]">
                          {tr('الحالة الحالية:', 'دۆخی ئێستا:', 'Current Status:')}
                        </span>
                        <span
                          className={`font-black inline-flex items-center gap-1.5 ${statusStep.colorClass}`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${statusStep.dotClass}`}
                          />
                          <span>{statusStep.text}</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-start gap-4">
                        <div className="inline-flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#46674D]" />
                          <span className="text-xs font-bold text-[#46674D]">
                            {tr('المبلّغ:', 'سکاڵاکار:', 'Reporter:')}
                          </span>
                          <span className="font-black text-[#1E3725]">
                            {report.citizenName}
                          </span>
                        </div>

                        <div className="inline-flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-[#46674D]" />
                          <span
                            className="font-mono font-black text-[#1E3725]"
                            dir="ltr"
                          >
                            {report.citizenPhone}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#46674D]" />
                          <span className="font-bold text-[#1E3725]">
                            {report.neighborhood} — {report.street}
                            {report.landmark ? ` (${report.landmark})` : ''}
                          </span>
                        </div>

                        <a
                          href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-black text-[#46674D] hover:text-[#1E3725] inline-flex items-center gap-1 underline underline-offset-4"
                        >
                          <span>{tr('موقع GPS', 'شوێنی GPS', 'GPS Map')}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="pt-2.5 border-t border-[#E8F4EA] space-y-1">
                        <span className="text-xs font-bold text-[#46674D]">
                          {tr('تفاصيل البلاغ:', 'وردەکاری سکاڵا:', 'Report Details:')}
                        </span>
                        <p className="text-xs sm:text-sm text-[#2D4833] leading-relaxed font-medium bg-[#F4F9F5] p-2.5 rounded-xl border border-[#E8F4EA]">
                          {report.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ────────────────────────────────────────────────────────────────────
                    المرحلة 2: تحديد الأولوية
                    - غير محددة (رمادي خفيف) إلا بعد فتح البلاغ وتحديدها من الإدارة
                    - في تتبع بلاغاتي (للمواطن): يظهر أنه تم فتح البلاغ وتحديد الأولوية دون إظهار نوع الأولوية
                   ──────────────────────────────────────────────────────────────────── */}
                <div className="relative flex items-start gap-3">
                  <div
                    className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 text-xs font-black transition-all ${
                      isUrgencyConfirmed
                        ? 'bg-[#46674D] text-white border-[#46674D] shadow-xs'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}
                  >
                    2
                  </div>

                  <div className="flex-1 min-w-0 space-y-2.5">
                    {activeRole === 'admin' ? (
                      <>
                        <div
                          className={`w-full px-4 py-2.5 rounded-xl border text-xs font-black flex items-center justify-between gap-2 ${
                            isUrgencyConfirmed
                              ? 'bg-white border-[#BBDDC6] text-[#1E3725] shadow-2xs'
                              : 'bg-slate-100 border-slate-200 text-slate-500'
                          }`}
                        >
                          <span>
                            {tr('تحديد الأولوية', 'دیاریکردنی گرنگی', 'Set Priority')}
                          </span>
                          {isUrgencyConfirmed ? (
                            <span className={`font-black ${getUrgencyColorClass()}`}>
                              ● {urgencyLabel}
                              {urgencySavedToast
                                ? ` (${tr('تم الحفظ', 'پاشەکەوتکرا', 'Saved')})`
                                : ''}
                            </span>
                          ) : (
                            <span className="font-bold text-slate-400">
                              ● {tr('غير محددة', 'دیارینەکراوە', 'Unset')}
                            </span>
                          )}
                        </div>

                        <div className="p-3 rounded-2xl bg-white border border-[#BBDDC6] grid grid-cols-3 gap-2 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleSelectUrgency('normal')}
                            className={`py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              isUrgencyConfirmed && selectedUrgency === 'normal'
                                ? 'bg-[#46674D] text-white border-[#46674D] shadow-xs'
                                : 'bg-[#F4F9F5] text-[#2D4833] border-[#BBDDC6] hover:border-[#46674D]'
                            }`}
                          >
                            <span>🟢</span>
                            <span>{tr('اعتيادي', 'ئاسایی', 'Normal')}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectUrgency('high')}
                            className={`py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              isUrgencyConfirmed && selectedUrgency === 'high'
                                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                : 'bg-[#F4F9F5] text-amber-700 border-amber-300 hover:border-amber-500'
                            }`}
                          >
                            <span>🟠</span>
                            <span>{tr('مهم', 'گرنگ', 'High')}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectUrgency('emergency')}
                            className={`py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              isUrgencyConfirmed && selectedUrgency === 'emergency'
                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                : 'bg-[#F4F9F5] text-rose-700 border-rose-300 hover:border-rose-500'
                            }`}
                          >
                            <span>🔴</span>
                            <span>{tr('طارئ', 'بەپەلە', 'Emergency')}</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      /* في تتبع بلاغاتي (للمواطن): يظهر أنه فتح البلاغ وتحديد الأولوية بدون إظهار نوع الأولوية */
                      <div
                        className={`w-full px-4 py-2.5 rounded-xl border text-xs font-black flex flex-wrap items-center justify-between gap-2 ${
                          isUrgencyConfirmed
                            ? 'bg-white border-[#BBDDC6] text-[#1E3725] shadow-2xs'
                            : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              isUrgencyConfirmed ? 'bg-[#46674D]' : 'bg-slate-400'
                            }`}
                          />
                          <span>
                            {isUrgencyConfirmed
                              ? tr(
                                  'تم فتح البلاغ وتحديد الأولوية',
                                  'سکاڵاکە کرایەوە و گرنگی دیاریکرا',
                                  'Report Opened & Priority Set'
                                )
                              : tr(
                                  'تحديد الأولوية',
                                  'دیاریکردنی گرنگی',
                                  'Set Priority'
                                )}
                          </span>
                        </div>
                        {isUrgencyConfirmed ? (
                          report.urgencySetAt ? (
                            <span
                              dir="ltr"
                              className="text-[11px] font-mono font-bold text-[#46674D] bg-[#F4F9F5] px-2 py-0.5 rounded-lg inline-flex items-center gap-1 tabular-nums"
                            >
                              <Clock className="w-3 h-3" />
                              <span>{formatDateTime(report.urgencySetAt)}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8F4EA] text-[#2D4833] font-black">
                              {tr('تم التحديد ✓', 'دیاریکرا ✓', 'Set ✓')}
                            </span>
                          )
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400">
                            {tr('غير محددة', 'دیارینەکراوە', 'Unset')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ────────────────────────────────────────────────────────────────────
                    المرحلة 3: تم الإرسال (رمادي خفيف إذا لم يتم الإرسال، وأزرق عند الإرسال)
                   ──────────────────────────────────────────────────────────────────── */}
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
                    {/* شريط المرحلة 3: رمادي خفيف لغير المرسلة، وأزرق عند الإرسال */}
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
                        <span>
                          {tr('تم الإرسال', 'نێردرا بۆ فەرمانگە', 'Sent to Department')}
                        </span>
                      </div>

                      {!hasInProgressRecord &&
                        activeRole === 'admin' &&
                        editingStep !== 'in_progress' && (
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

                    {/* كارت السجل المحفوظ لـ "تم الإرسال" — يظهر فيه أسماء الذين تم الإرسال إليهم وزر تعديل بدون نص */}
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
                            {activeRole === 'admin' && (
                              <button
                                type="button"
                                onClick={() => {
                                  playClickSound();
                                  setEditingStep('in_progress');
                                }}
                                title={tr('تعديل', 'دەستکاری', 'Edit')}
                                aria-label={tr('تعديل', 'دەستکاری', 'Edit')}
                                className="w-7 h-7 rounded-lg bg-blue-50/80 hover:bg-blue-100 text-blue-600 flex items-center justify-center cursor-pointer transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {recipientsHistoryList.length > 0 && (
                          <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 space-y-1.5">
                            <p className="text-[11px] font-black text-blue-800 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>
                                {tr(
                                  'تم الإرسال إلى:',
                                  'نێردراوە بۆ:',
                                  'Sent to:'
                                )}
                              </span>
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

                    {/* الفورم المضمن لـ "تم الإرسال" (يفتح عند النقر على زر تعديل أو إرسال البلاغ) */}
                    {activeRole === 'admin' && editingStep === 'in_progress' && (
                      <motion.form
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        onSubmit={(e) => handleSaveTimelineStep(e, 'in_progress')}
                        className="p-4 rounded-2xl bg-white border-2 border-blue-300 shadow-sm space-y-3.5"
                      >
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
                            onChange={(e) => setAssignedTeam(e.target.value)}
                            className="w-full bg-[#F4F9F5] border border-blue-200 focus:border-blue-600 rounded-xl px-3 py-2 text-xs font-black text-[#1E3725] focus:outline-none"
                          >
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

                        <div className="space-y-1.5">
                          <label className="block text-xs font-black text-blue-900">
                            {tr(
                              'اختيار الاسم في الدائرة:',
                              'هەڵبژاردنی ناو لە فەرمانگە:',
                              'Select Recipient:'
                            )}
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {recipientOptions.map((rec) => {
                              const isSelected = selectedRecipientKey === rec.key;
                              const roleTitle =
                                language === 'ku'
                                  ? rec.roleKu
                                  : language === 'en'
                                  ? rec.roleEn
                                  : rec.roleAr;
                              return (
                                <button
                                  key={rec.key}
                                  type="button"
                                  onClick={() => {
                                    playClickSound();
                                    setSelectedRecipientKey(rec.key);
                                  }}
                                  className={`p-2 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-0.5 ${
                                    isSelected
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                      : 'bg-[#F4F9F5] text-[#1E3725] border-blue-200 hover:border-blue-400'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span
                                      className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                        isSelected
                                          ? 'bg-white/20 text-white'
                                          : 'bg-blue-100 text-blue-800'
                                      }`}
                                    >
                                      {roleTitle}
                                    </span>
                                    {isSelected && <Check className="w-3 h-3" />}
                                  </div>
                                  <p className="text-xs font-black truncate mt-0.5">
                                    {rec.name}
                                  </p>
                                  <p
                                    className={`text-[10px] font-mono ${
                                      isSelected
                                        ? 'text-white/90'
                                        : 'text-slate-500'
                                    }`}
                                    dir="ltr"
                                  >
                                    {rec.phone}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        </div>

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
                              value={statusNotes.in_progress || ''}
                              maxWords={FIELD_LIMITS.DESCRIPTION.maxWords}
                              maxChars={FIELD_LIMITS.DESCRIPTION.maxChars}
                            />
                          </div>
                          <textarea
                            rows={2}
                            maxLength={FIELD_LIMITS.DESCRIPTION.maxChars}
                            value={statusNotes.in_progress || ''}
                            onChange={(e) =>
                              updateNoteForStep('in_progress', e.target.value)
                            }
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
                            <span>
                              {tr('حفظ وإرسال', 'پاشەکەوت و ناردن', 'Save & Send')}
                            </span>
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

                {/* ────────────────────────────────────────────────────────────────────
                    المرحلة 4: تم الإنجاز / تم الرفض
                    - في تتبع بلاغاتي: إذا تم الإنجاز يظهر باللون الأخضر، وقبل الإنجاز رمادية خفيفة
                    - لا تظهر حالة الرفض للمواطن إلا إذا كان البلاغ مرفوضاً
                    - زر التعديل على الكروت لطيف بدون نص (أيقونة فقط)
                   ──────────────────────────────────────────────────────────────────── */}
                <div className="relative flex items-start gap-3">
                  <div
                    dir="ltr"
                    className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 text-xs font-mono font-black transition-all ${
                      hasResolvedRecord
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : hasRejectedRecord
                        ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    4
                  </div>

                  <div className="flex-1 min-w-0 space-y-3">
                    {/* أ. قسم تم الإنجاز (يظهر باللون الأخضر إذا تم الإنجاز، ورمادي خفيف قبل الإنجاز) */}
                    {!(activeRole !== 'admin' && hasRejectedRecord) && (
                      <div className="space-y-2.5">
                        {/* شريط تم الإنجاز */}
                        <div
                          className={`w-full px-4 py-2.5 rounded-xl border text-xs font-black flex items-center justify-between gap-2 ${
                            hasResolvedRecord
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                hasResolvedRecord ? 'bg-white' : 'bg-slate-400'
                              }`}
                            />
                            <span>
                              {tr('تم الإنجاز', 'ئەنجامدرا', 'Completed')}
                            </span>
                          </div>

                          {!hasResolvedRecord &&
                            activeRole === 'admin' &&
                            editingStep !== 'resolved' && (
                              <button
                                type="button"
                                onClick={() => {
                                  playClickSound();
                                  setIsRevertConfirmOpen(false);
                                  setEditingStep('resolved');
                                }}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black cursor-pointer transition-colors"
                              >
                                {tr('تحديد تم الإنجاز', 'دیاریکردنی ئەنجامدان', 'Mark Completed')}
                              </button>
                            )}

                          {hasResolvedRecord && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-white/20 text-white">
                              {tr('تم الإنجاز ✓', 'ئەنجامدرا ✓', 'Completed ✓')}
                            </span>
                          )}
                        </div>

                        {/* كارت السجل المحفوظ لـ "تم الإنجاز" — زر التعديل لطيف بدون نص */}
                        {hasResolvedRecord && editingStep !== 'resolved' && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3.5 rounded-2xl bg-white border border-emerald-200 shadow-xs space-y-2.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-black text-emerald-800">
                                {tr(
                                  'سجل الإنجاز المحفوظ',
                                  'تۆماری ئەنجامدان',
                                  'Saved Completion Record'
                                )}
                              </span>

                              <div className="flex items-center gap-2">
                                {savedResolvedTime && (
                                  <span
                                    dir="ltr"
                                    className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg inline-flex items-center gap-1 tabular-nums text-emerald-700 bg-emerald-50"
                                  >
                                    <Clock className="w-3 h-3" />
                                    <span>{savedResolvedTime}</span>
                                  </span>
                                )}
                                {activeRole === 'admin' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      playClickSound();
                                      setIsRevertConfirmOpen(false);
                                      setEditingStep('resolved');
                                    }}
                                    title={tr('تعديل', 'دەستکاری', 'Edit')}
                                    aria-label={tr('تعديل', 'دەستکاری', 'Edit')}
                                    className="w-7 h-7 rounded-lg bg-emerald-50/80 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center cursor-pointer transition-colors"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                          {savedResolvedNote && (
                            <p className="text-xs text-[#1E3725] font-medium bg-[#F4F9F5] p-2.5 rounded-xl border border-[#E8F4EA]">
                              {savedResolvedNote}
                            </p>
                          )}

                          {report.resolvedImages &&
                            report.resolvedImages.length > 0 && (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {report.resolvedImages.map((imgUrl, idx) => (
                                  <div
                                    key={`saved-res-img-${idx}`}
                                    className="rounded-xl overflow-hidden border border-emerald-200 bg-[#1E3725] aspect-video"
                                  >
                                    <SmartAdaptiveImage
                                      src={imgUrl}
                                      alt={`Completed ${idx + 1}`}
                                      gallery={report.resolvedImages}
                                      initialIndex={idx}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                        </motion.div>
                      )}

                      {/* الفورم المضمن لـ "تم الإنجاز" */}
                      {activeRole === 'admin' && editingStep === 'resolved' && (
                        <motion.form
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          onSubmit={(e) => handleSaveTimelineStep(e, 'resolved')}
                          className="p-4 rounded-2xl bg-white border-2 border-emerald-300 shadow-sm space-y-3.5"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="block text-xs font-black text-emerald-800">
                                {tr(
                                  'إدراج صور الإنجاز:',
                                  'زیادکردنی وێنەکانی ئەنجامدان:',
                                  'Completion Photos:'
                                )}
                              </label>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black">
                                {resolvedImages.length} / {MAX_UPLOAD_IMAGES}
                              </span>
                            </div>

                            {resolvedImages.length < MAX_UPLOAD_IMAGES && (
                              <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-emerald-400 bg-[#F4F9F5] hover:bg-emerald-50 transition-all cursor-pointer">
                                <Upload className="w-4 h-4 text-emerald-600" />
                                <span className="text-xs font-black text-[#1E3725]">
                                  {tr(
                                    'اختيار صور الإنجاز',
                                    'هەڵبژاردنی وێنەی ئەنجامدان',
                                    'Select Photos'
                                  )}
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={handleResolvedImagesUpload}
                                  className="hidden"
                                />
                              </label>
                            )}

                            {uploadLimitMessage && (
                              <p className="text-[11px] font-black text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
                                {uploadLimitMessage}
                              </p>
                            )}

                            {resolvedImages.length > 0 && (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {resolvedImages.map((imgUrl, idx) => (
                                  <div
                                    key={`resolved-upload-${idx}`}
                                    className="relative group rounded-xl overflow-hidden border border-emerald-300 aspect-video bg-[#1E3725]"
                                  >
                                    <SmartAdaptiveImage
                                      src={imgUrl}
                                      alt={`Completion ${idx + 1}`}
                                      gallery={resolvedImages}
                                      initialIndex={idx}
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveResolvedImage(idx);
                                      }}
                                      className="absolute top-1.5 left-1.5 z-20 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md hover:bg-rose-700 cursor-pointer"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                    <span className="absolute bottom-1 right-1 z-20 px-1.5 py-0.5 rounded bg-emerald-700/90 text-white text-[9px] font-bold flex items-center gap-1 pointer-events-none">
                                      <Camera className="w-2.5 h-2.5" />
                                      <span>#{idx + 1}</span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <label className="block text-xs font-black text-emerald-800">
                                {tr('الملاحظات:', 'تێبینییەکان:', 'Notes:')}
                              </label>
                              <FieldLimitBadge
                                value={statusNotes.resolved || ''}
                                maxWords={FIELD_LIMITS.DESCRIPTION.maxWords}
                                maxChars={FIELD_LIMITS.DESCRIPTION.maxChars}
                              />
                            </div>
                            <textarea
                              rows={2}
                              maxLength={FIELD_LIMITS.DESCRIPTION.maxChars}
                              value={statusNotes.resolved || ''}
                              onChange={(e) =>
                                updateNoteForStep('resolved', e.target.value)
                              }
                              placeholder={tr(
                                'اكتب ملاحظات وتفاصيل الإنجاز...',
                                'تێبینی و وردەکاری ئەنجامدان بنووسە...',
                                'Write completion notes...'
                              )}
                              className="w-full bg-[#F4F9F5] border border-emerald-200 focus:border-emerald-600 focus:bg-white rounded-xl p-2.5 text-xs font-bold text-[#1E3725] focus:outline-none"
                            />
                          </div>

                          {/* رسالة تنبيه التأكيد عند النقر على "لم يتم الإنجاز" */}
                          {isRevertConfirmOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 space-y-2.5"
                            >
                              <div className="flex items-start gap-2 text-xs font-black text-amber-900">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <span>
                                  {tr(
                                    'تنبيه: سيتم حذف صور وملاحظات الإنجاز وإزالة البلاغ من قسم الأعمال المنجزة، هل أنت متأكد؟',
                                    'ئاگاداری: وێنە و تێبینییەکانی ئەنجامدان دەسڕدرێنەوە و لە کارە ئەنجامدراوەکان لادەبرێت، ئایا دڵنیایت؟',
                                    'Warning: Completion photos and notes will be deleted and removed from Completed Works. Are you sure?'
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={handleConfirmRevertResolution}
                                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer"
                                >
                                  {tr(
                                    'نعم، متأكد (احذف الإنجاز)',
                                    'بەڵێ، دڵنیام',
                                    'Yes, Delete Completion'
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsRevertConfirmOpen(false)}
                                  className="px-3.5 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 font-black text-xs cursor-pointer"
                                >
                                  {tr('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
                                </button>
                              </div>
                            </motion.div>
                          )}

                          {/* أزرار الحفظ / لم يتم الإنجاز / الإغلاق */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex items-center gap-2">
                              <button
                                type="submit"
                                disabled={isUploadingStorage}
                                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                              >
                                {isUploadingStorage ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>
                                      {tr('جاري الحفظ...', 'پاشەکەوتکردن...', 'Saving...')}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{tr('حفظ', 'پاشەکەوتکردن', 'Save')}</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsRevertConfirmOpen(false);
                                  setEditingStep(null);
                                }}
                                className="px-3.5 py-2 rounded-xl bg-[#F4F9F5] hover:bg-[#E8F4EA] text-[#2D4833] font-bold text-xs cursor-pointer"
                              >
                                {tr('إغلاق', 'داخستن', 'Close')}
                              </button>
                            </div>

                            {hasResolvedRecord && !isRevertConfirmOpen && (
                              <button
                                type="button"
                                onClick={() => {
                                  playClickSound();
                                  setIsRevertConfirmOpen(true);
                                }}
                                className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-black text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>
                                  {tr(
                                    'لم يتم الإنجاز',
                                    'ئەنجام نەدراوە',
                                    'Not Completed'
                                  )}
                                </span>
                              </button>
                            )}
                          </div>
                        </motion.form>
                      )}
                      </div>
                    )}

                    {/* ب. قسم تم الرفض (لا يظهر في تتبع بلاغاتي إلا إذا كان مرفوضاً، ويختفي إذا تم الإنجاز) */}
                    {!hasResolvedRecord && (activeRole === 'admin' || hasRejectedRecord) && (
                      <div className="space-y-2.5">
                        <div
                          className={`w-full px-4 py-2.5 rounded-xl border text-xs font-black flex items-center justify-between gap-2 ${
                            hasRejectedRecord
                              ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>⚫</span>
                            <span>
                              {tr('تم الرفض (مرفوض)', 'ڕەتکرایەوە', 'Rejected')}
                            </span>
                          </div>

                          {!hasRejectedRecord &&
                            activeRole === 'admin' &&
                            editingStep !== 'rejected' && (
                              <button
                                type="button"
                                onClick={() => {
                                  playClickSound();
                                  setEditingStep('rejected');
                                }}
                                className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-[11px] font-black cursor-pointer transition-colors"
                              >
                                {tr('تحديد مرفوض', 'دیاریکردنی ڕەتکردنەوە', 'Mark Rejected')}
                              </button>
                            )}

                          {hasRejectedRecord && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-black">
                              {tr('تم الحفظ ✓', 'پاشەکەوتکرا ✓', 'Saved ✓')}
                            </span>
                          )}
                        </div>

                        {/* كارت السجل المحفوظ لـ "تم الرفض" — زر التعديل لطيف بدون نص */}
                        {hasRejectedRecord && editingStep !== 'rejected' && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3.5 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-black text-rose-800">
                                {tr(
                                  'سجل الرفض المحفوظ',
                                  'تۆماری ڕەتکردنەوە',
                                  'Saved Rejection Record'
                                )}
                              </span>

                              <div className="flex items-center gap-2">
                                {savedRejectedTime && (
                                  <span
                                    dir="ltr"
                                    className="text-[11px] font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg inline-flex items-center gap-1 tabular-nums"
                                  >
                                    <Clock className="w-3 h-3" />
                                    <span>{savedRejectedTime}</span>
                                  </span>
                                )}
                                {activeRole === 'admin' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      playClickSound();
                                      setEditingStep('rejected');
                                    }}
                                    title={tr('تعديل', 'دەستکاری', 'Edit')}
                                    aria-label={tr('تعديل', 'دەستکاری', 'Edit')}
                                    className="w-7 h-7 rounded-lg bg-rose-50/80 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer transition-colors"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {savedRejectedNote && (
                              <p className="text-xs text-[#1E3725] font-medium bg-[#F4F9F5] p-2.5 rounded-xl border border-[#E8F4EA]">
                                {savedRejectedNote}
                              </p>
                            )}
                          </motion.div>
                        )}

                        {/* الفورم المضمن لـ "تم الرفض" */}
                        {activeRole === 'admin' && editingStep === 'rejected' && (
                          <motion.form
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            onSubmit={(e) => handleSaveTimelineStep(e, 'rejected')}
                            className="p-4 rounded-2xl bg-white border-2 border-rose-300 shadow-sm space-y-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <label className="block text-xs font-black text-rose-800">
                                  {tr(
                                    'ملاحظة وسبب الرفض:',
                                    'تێبینی و هۆکاری ڕەتکردنەوە:',
                                    'Rejection Note:'
                                  )}
                                </label>
                                <FieldLimitBadge
                                  value={statusNotes.rejected || ''}
                                  maxWords={FIELD_LIMITS.DESCRIPTION.maxWords}
                                  maxChars={FIELD_LIMITS.DESCRIPTION.maxChars}
                                />
                              </div>
                              <textarea
                                rows={2}
                                required
                                maxLength={FIELD_LIMITS.DESCRIPTION.maxChars}
                                value={statusNotes.rejected || ''}
                                onChange={(e) =>
                                  updateNoteForStep('rejected', e.target.value)
                                }
                                placeholder={tr(
                                  'اكتب سبب وملاحظة رفض البلاغ...',
                                  'هۆکار و تێبینی ڕەتکردنەوەی سکاڵا بنووسە...',
                                  'Write rejection note...'
                                )}
                                className="w-full bg-[#F4F9F5] border border-rose-200 focus:border-rose-600 focus:bg-white rounded-xl p-2.5 text-xs font-bold text-[#1E3725] focus:outline-none"
                              />
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="submit"
                                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-black text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{tr('حفظ', 'پاشەکەوتکردن', 'Save')}</span>
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
                    )}
                  </div>
                </div>
              </div>

              {/* زر تعديل البلاغ أمام زر حذف البلاغ — لا يظهران لحساب المواطن عند تحديد "تم الإرسال" */}
              {(activeRole === 'admin' || (!hasInProgressRecord && !hasResolvedRecord)) && (
                <div className="pt-3 border-t border-[#E8F4EA] flex items-center justify-center gap-5">
                  {activeRole !== 'admin' && !hasInProgressRecord && !hasResolvedRecord && (
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
                </div>
              )}
            </div>
          </div>
        </div>

        {/* نافذة تنبيه على الشاشة عند نقر حذف البلاغ */}
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
