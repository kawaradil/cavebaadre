import { CivicReport, SECTOR_META, URGENCY_META, ReportUrgency } from '../../types/baadre';

export type RecipientRoleKey = 'phone1' | 'phone2' | 'engineer' | 'deputy' | 'manager';
export type TimelineActionStatus = 'in_progress' | 'resolved' | 'rejected';

export interface RecipientOption {
  key: RecipientRoleKey;
  roleAr: string;
  roleKu: string;
  roleEn: string;
  name: string;
  phone: string;
}

export const toEnglishDigits = (val: string | number): string =>
  String(val)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));

export const formatReportDateTime = (isoString?: string): string => {
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

export const prepareReportImageFiles = async (
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

export const triggerBackgroundDownload = (files: File[]) => {
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

export const buildDepartmentWhatsAppMessage = (params: {
  report: CivicReport;
  adminNoteText: string;
  activeRecipient: RecipientOption;
  deptAr: string;
  deptKu: string;
  selectedUrgency: ReportUrgency;
  tr: (ar: string, ku: string, en: string) => string;
}): string => {
  const { report, adminNoteText, activeRecipient, deptAr, deptKu, selectedUrgency, tr } = params;
  const sector = SECTOR_META[report.sector] || SECTOR_META.other;
  const urgency = URGENCY_META[selectedUrgency] || URGENCY_META.normal;
  const cleanAdminNote = adminNoteText.trim();
  const recipientName =
    activeRecipient.name || tr('المسؤول المعني', 'بەرپرسی پەیوەندیدار', 'Officer in charge');
  const recipientPhone = activeRecipient.phone || '';
  const reportCode = toEnglishDigits(report.trackingCode);
  const locationKu = `ناحیەی باعەدرێ - ${report.neighborhood}${
    report.street ? ` - ${report.street}` : ''
  }${report.landmark ? ` (نزیک: ${report.landmark})` : ''}`;
  const locationAr = `ناحية باعدرى - ${report.neighborhood}${
    report.street ? ` - ${report.street}` : ''
  }${report.landmark ? ` (أقرب نقطة: ${report.landmark})` : ''}`;
  const latVal = report.latitude ?? report.lat;
  const lngVal = report.longitude ?? report.lng;
  const gpsLink = latVal && lngVal ? `https://www.google.com/maps?q=${latVal},${lngVal}` : '';

  const lines: string[] = [
    `🏛️ *ناردنی فەرمی سکاڵا - ئەپی چاڤێ باعەدرێ (ÇAVÊ BAADRÊ)*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `بۆ بەڕێز: ${recipientName} (${recipientPhone})`,
    `فەرمانگە: ${deptKu}`,
    ``,
  ];

  if (cleanAdminNote) {
    lines.push(`📋 *تێبینی و ڕێنماییەکانی ناردن:*`, `${cleanAdminNote}`, ``);
  }

  lines.push(
    `📝 *وردەکارییەکانی سکاڵا:*`,
    `• کۆدی سکاڵا: #${reportCode}`,
    `• ناونیشانی سکاڵا: ${report.title}`,
    `• کەرتی خزمەتگوزاری: ${sector.ku}`,
    `• شوێن: ${locationKu}`,
    `• ئاستی گرنگی: ${urgency.ku}`,
    `• ڕوونکردنەوەی کێشە: ${report.description}`
  );

  if (gpsLink) {
    lines.push(`• نەخشەی شوێن (GPS): ${gpsLink}`);
  }

  lines.push(
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🏛️ *إحالة بلاغ رسمي - تطبيق عين باعدرى (ÇAVÊ BAADRÊ)*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `إلى المحترم: ${recipientName} (${recipientPhone})`,
    `الدائرة: ${deptAr}`,
    ``
  );

  if (cleanAdminNote) {
    lines.push(`📋 *ملاحظات وتوجيهات الإرسال:*`, `${cleanAdminNote}`, ``);
  }

  lines.push(
    `📝 *تفاصيل البلاغ:*`,
    `• رمز البلاغ: #${reportCode}`,
    `• عنوان البلاغ: ${report.title}`,
    `• القطاع الخدمي: ${sector.ar}`,
    `• الموقع: ${locationAr}`,
    `• الأولوية: ${urgency.labelAr}`,
    `• تفاصيل المشكلة: ${report.description}`
  );

  if (gpsLink) {
    lines.push(`• خريطة الموقع (GPS): ${gpsLink}`);
  }

  return lines.join('\n');
};
