import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  writeBatch,
} from 'firebase/firestore';
import {
  db,
  auth,
  COLLECTIONS,
  generateAutoNumericId,
  isPureNumericId,
  syncNumericCounterWithItems,
  prepareDocumentWithId,
  buildCompletedWorkDocumentFromReport,
  syncReportStatusAndCompletedWorkToFirestore,
  executeCitizenReportEditTransaction,
  executeCitizenReportDeleteTransaction,
  deleteReportMediaFromStorage,
  OperationType,
  handleFirestoreError,
  maskPhoneNumber,
} from '../../lib/firebase';
import {
  triggerNewReportServerNotification,
  subscribeToForegroundReportNotifications,
  showSystemNotificationViaSW,
  requestMobileNotificationPermission,
} from '../../services/fcmService';
import {
  CivicReport,
  RegisteredCitizen,
  OrganizationProject,
  ReportSector,
  ReportStatus,
  ReportUrgency,
  SECTOR_ILLUSTRATIONS,
  isReportSentToDepartment,
  isReportUrgencyConfirmed,
  isReportOpened,
} from '../../types/baadre';
import {
  SubmitReportInput,
  BaadreMetrics,
  StatusUpdateToastPayload,
  SECTOR_DEFAULT_DEPARTMENT,
  STORAGE_MY_REPORT_IDS_KEY,
  CACHE_KEY_REPORTS,
  CACHE_KEY_PROJECTS,
} from './types';

export function useReportsAndProjectsDomain(params: {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  canAccessAdmin: boolean;
  hasFirestoreAdminAuth: boolean;
  activeRole: 'citizen' | 'admin';
  currentUserUid?: string;
  rawCitizens: RegisteredCitizen[];
  setCitizens: React.Dispatch<React.SetStateAction<RegisteredCitizen[]>>;
  onActivateAdminView: () => void;
}) {
  const {
    isAdmin,
    isSuperAdmin,
    canAccessAdmin,
    hasFirestoreAdminAuth,
    activeRole,
    currentUserUid,
    rawCitizens,
    setCitizens,
    onActivateAdminView,
  } = params;

  const [reports, setReports] = useState<CivicReport[]>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY_REPORTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [reportsLimitCount, setReportsLimitCount] = useState<number>(80);
  const [hasMoreReports, setHasMoreReports] = useState<boolean>(true);

  const loadMoreReports = useCallback(() => {
    setReportsLimitCount((prev) => prev + 40);
  }, []);

  const [projects, setProjects] = useState<OrganizationProject[]>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY_PROJECTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [myReportIds, setMyReportIds] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_MY_REPORT_IDS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed.filter((id) => isPureNumericId(id));
      }
    } catch {}
    return [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<'all' | 'ALL' | ReportSector>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'ALL' | ReportStatus>('ALL');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('all');

  const [selectedReport, setSelectedReportState] = useState<CivicReport | null>(null);
  const [editingCitizenReport, setEditingCitizenReport] = useState<CivicReport | null>(null);
  const [isAddReportOpen, setIsAddReportOpen] = useState(false);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [statusUpdateToast, setStatusUpdateToast] = useState<StatusUpdateToastPayload | null>(null);
  const [newAdminReportAlert, setNewAdminReportAlert] = useState<CivicReport | null>(null);

  // Refs for referentially stable callbacks
  const reportsRef = useRef(reports);
  reportsRef.current = reports;
  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  const citizensRef = useRef(rawCitizens);
  citizensRef.current = rawCitizens;
  const selectedReportRef = useRef(selectedReport);
  selectedReportRef.current = selectedReport;
  const editingCitizenReportRef = useRef(editingCitizenReport);
  editingCitizenReportRef.current = editingCitizenReport;

  const hasLoadedInitialReportsRef = useRef<boolean>(false);
  const knownReportIdsRef = useRef<Set<string>>(new Set());
  const dismissedNewReportIdsRef = useRef<Set<string>>(
    (() => {
      try {
        const raw = localStorage.getItem('cave_baadre_opened_report_alerts_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return new Set<string>(parsed.map(String));
        }
      } catch {}
      return new Set<string>();
    })()
  );

  const persistDismissedAlertId = useCallback((reportId: string) => {
    dismissedNewReportIdsRef.current.add(String(reportId));
    try {
      localStorage.setItem(
        'cave_baadre_opened_report_alerts_v1',
        JSON.stringify(Array.from(dismissedNewReportIdsRef.current).slice(-300))
      );
    } catch {}
  }, []);

  const setSelectedReport = useCallback(
    (rep: CivicReport | null) => {
      if (!rep) {
        setSelectedReportState(null);
        return;
      }
      persistDismissedAlertId(rep.id);
      setNewAdminReportAlert((curr) => (curr && curr.id === rep.id ? null : curr));

      if (!isReportOpened(rep) && (activeRole === 'admin' || isAdmin || isSuperAdmin)) {
        const now = new Date().toISOString();
        const openedReport: CivicReport = {
          ...rep,
          id: rep.id,
          isOpened: true,
          openedAt: now,
        };
        setReports((prev) => prev.map((r) => (r.id === rep.id ? openedReport : r)));
        setSelectedReportState(openedReport);
        if (auth.currentUser && (isAdmin || isSuperAdmin)) {
          setDoc(
            doc(db, COLLECTIONS.REPORTS, rep.id),
            { id: rep.id, isOpened: true, openedAt: now },
            { merge: true }
          ).catch(() => {});
        }
      } else {
        setSelectedReportState(rep);
      }
    },
    [activeRole, isAdmin, isSuperAdmin, persistDismissedAlertId]
  );

  const dismissNewAdminReportAlert = useCallback(() => {
    setNewAdminReportAlert((curr) => {
      if (curr) {
        persistDismissedAlertId(curr.id);
        if (!isReportOpened(curr) && auth.currentUser && (isAdmin || isSuperAdmin)) {
          const now = new Date().toISOString();
          setReports((prev) =>
            prev.map((r) => (r.id === curr.id ? { ...r, isOpened: true, openedAt: now } : r))
          );
          setDoc(
            doc(db, COLLECTIONS.REPORTS, curr.id),
            { id: curr.id, isOpened: true, openedAt: now },
            { merge: true }
          ).catch(() => {});
        }
      }
      return null;
    });
  }, [isAdmin, isSuperAdmin, persistDismissedAlertId]);

  const clearStatusUpdateToast = useCallback(() => {
    setStatusUpdateToast(null);
  }, []);

  useEffect(() => {
    if (!statusUpdateToast) return;
    const timer = setTimeout(() => {
      setStatusUpdateToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [statusUpdateToast]);

  // Firestore listeners for reports and CompletedWork
  useEffect(() => {
    const reportsQuery = query(
      collection(db, COLLECTIONS.REPORTS),
      orderBy('createdAt', 'desc'),
      limit(reportsLimitCount)
    );
    const unsubReports = onSnapshot(
      reportsQuery,
      (snapshot) => {
        const nonNumericDocs = snapshot.docs.filter((d) => !isPureNumericId(d.id));
        const numericDocs = snapshot.docs.filter((d) => isPureNumericId(d.id));

        if (nonNumericDocs.length > 0 && hasFirestoreAdminAuth) {
          const cleanupBatch = writeBatch(db);
          nonNumericDocs.forEach((d) => cleanupBatch.delete(d.ref));
          cleanupBatch.commit().catch(() => {});
        }

        setHasMoreReports(snapshot.docs.length >= reportsLimitCount);

        const remoteReports = numericDocs.map((d) => {
          const data = d.data() as CivicReport;
          const isOwner = Boolean(
            currentUserUid &&
              ((data.ownerUid && data.ownerUid === currentUserUid) ||
                (data.citizenId && data.citizenId === currentUserUid))
          );
          const shouldMaskPhone = !hasFirestoreAdminAuth && !isOwner;
          return {
            ...data,
            id: String(d.id),
            citizenPhone: shouldMaskPhone ? maskPhoneNumber(data.citizenPhone) : data.citizenPhone,
            citizenWhatsapp: shouldMaskPhone
              ? maskPhoneNumber(data.citizenWhatsapp)
              : data.citizenWhatsapp,
          };
        });
        syncNumericCounterWithItems(COLLECTIONS.REPORTS, remoteReports);

        if (!hasLoadedInitialReportsRef.current) {
          remoteReports.forEach((r) => knownReportIdsRef.current.add(r.id));
          hasLoadedInitialReportsRef.current = true;
          const latestUnopened = remoteReports.find(
            (r) =>
              !isReportOpened(r) &&
              !isReportSentToDepartment(r) &&
              r.status === 'pending' &&
              !dismissedNewReportIdsRef.current.has(r.id)
          );
          if (latestUnopened) {
            setNewAdminReportAlert(latestUnopened);
          }
        } else {
          const newlyArrivedUnsent = remoteReports.find(
            (r) =>
              !knownReportIdsRef.current.has(r.id) &&
              !isReportOpened(r) &&
              !isReportSentToDepartment(r) &&
              !dismissedNewReportIdsRef.current.has(r.id)
          );
          remoteReports.forEach((r) => knownReportIdsRef.current.add(r.id));
          if (newlyArrivedUnsent) {
            setNewAdminReportAlert(newlyArrivedUnsent);
            if (hasFirestoreAdminAuth) {
              showSystemNotificationViaSW(
                `🔔 بلاغ جديد وارد (${newlyArrivedUnsent.trackingCode})`,
                `${newlyArrivedUnsent.title} • ${newlyArrivedUnsent.neighborhood}`,
                {
                  reportId: newlyArrivedUnsent.id,
                  trackingCode: newlyArrivedUnsent.trackingCode,
                  url: `/?reportId=${encodeURIComponent(newlyArrivedUnsent.id)}`,
                }
              ).catch(() => {});
            }
          }
        }

        setNewAdminReportAlert((curr) => {
          if (!curr) return null;
          const match = remoteReports.find((r) => r.id === curr.id);
          if (
            !match ||
            isReportOpened(match) ||
            isReportSentToDepartment(match) ||
            dismissedNewReportIdsRef.current.has(match.id)
          ) {
            return null;
          }
          return match;
        });

        setReports(remoteReports);
        try {
          localStorage.setItem(CACHE_KEY_REPORTS, JSON.stringify(remoteReports.slice(0, 100)));
        } catch {}

        setSelectedReportState((curr) => {
          if (!curr) return null;
          const fresh = remoteReports.find((r) => r.id === curr.id);
          return fresh ? fresh : curr;
        });
      },
      () => {}
    );

    const completedWorkQuery = query(collection(db, COLLECTIONS.COMPLETED_WORK), limit(100));
    const unsubCompletedWork = onSnapshot(
      completedWorkQuery,
      (snapshot) => {
        const nonNumericDocs = snapshot.docs.filter((d) => !isPureNumericId(d.id));
        const numericDocs = snapshot.docs.filter((d) => isPureNumericId(d.id));

        const seenReportKeys = new Set<string>();
        const duplicateDocs: typeof numericDocs = [];
        const uniqueRemoteWorks: OrganizationProject[] = [];

        for (const d of numericDocs) {
          const data = d.data() as OrganizationProject;
          const workItem: OrganizationProject = { ...data, id: String(d.id) };
          const reportKey = workItem.reportId
            ? `rep:${String(workItem.reportId)}`
            : workItem.trackingCode
            ? `code:${workItem.trackingCode}`
            : null;

          if (reportKey) {
            if (seenReportKeys.has(reportKey)) {
              duplicateDocs.push(d);
              continue;
            }
            seenReportKeys.add(reportKey);
          }

          uniqueRemoteWorks.push(workItem);
        }

        if ((nonNumericDocs.length > 0 || duplicateDocs.length > 0) && hasFirestoreAdminAuth) {
          const cleanupBatch = writeBatch(db);
          nonNumericDocs.forEach((d) => cleanupBatch.delete(d.ref));
          duplicateDocs.forEach((d) => cleanupBatch.delete(d.ref));
          cleanupBatch.commit().catch(() => {});
        }

        syncNumericCounterWithItems(COLLECTIONS.COMPLETED_WORK, uniqueRemoteWorks);
        setProjects(uniqueRemoteWorks);
        try {
          localStorage.setItem(CACHE_KEY_PROJECTS, JSON.stringify(uniqueRemoteWorks.slice(0, 100)));
        } catch {}
      },
      () => {}
    );

    return () => {
      unsubReports();
      unsubCompletedWork();
    };
  }, [hasFirestoreAdminAuth, currentUserUid, reportsLimitCount]);

  // Automatic cleanup of non-resolved works from CompletedWork
  useEffect(() => {
    if (!hasFirestoreAdminAuth || reports.length === 0 || projects.length === 0) return;

    const nonResolvedWorks = projects.filter((p) => {
      if (!p.reportId && !p.trackingCode) return false;
      const linkedReport = reports.find(
        (r) =>
          (p.reportId && String(r.id) === String(p.reportId)) ||
          (p.trackingCode && r.trackingCode === p.trackingCode)
      );
      return linkedReport && linkedReport.status !== 'resolved';
    });

    if (nonResolvedWorks.length === 0) return;

    const removeIds = new Set(nonResolvedWorks.map((w) => w.id));
    setProjects((prev) => prev.filter((p) => !removeIds.has(p.id)));

    const batch = writeBatch(db);
    nonResolvedWorks.forEach((w) => {
      batch.delete(doc(db, COLLECTIONS.COMPLETED_WORK, w.id));
    });
    batch.commit().catch(() => {});
  }, [reports, projects, hasFirestoreAdminAuth]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MY_REPORT_IDS_KEY, JSON.stringify(myReportIds));
    } catch {}
  }, [myReportIds]);

  const openReportDetailsForVerifiedAdmin = useCallback(
    async (targetReportId: string, trackingCode?: string) => {
      if (!isAdmin && !isSuperAdmin) {
        return;
      }

      const cleanId = String(targetReportId || '').trim();
      if (!cleanId) return;

      onActivateAdminView();

      const existing = reportsRef.current.find(
        (r) => String(r.id) === cleanId || (trackingCode && r.trackingCode === trackingCode)
      );
      if (existing) {
        setSelectedReport(existing);
        return;
      }

      try {
        const snap = await getDoc(doc(db, COLLECTIONS.REPORTS, cleanId));
        if (snap.exists()) {
          const data = snap.data() as CivicReport;
          setSelectedReport({ ...data, id: String(snap.id) });
        }
      } catch {}
    },
    [isAdmin, isSuperAdmin, onActivateAdminView, setSelectedReport]
  );

  useEffect(() => {
    if (!isAdmin && !isSuperAdmin) return;

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlReportId = params.get('reportId');
      if (urlReportId) {
        openReportDetailsForVerifiedAdmin(urlReportId);
        try {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        } catch {}
      }
    }

    const unsubscribeFcm = subscribeToForegroundReportNotifications({
      onNotificationClickOpenReport: (reportId, trackingCode) => {
        openReportDetailsForVerifiedAdmin(reportId, trackingCode);
      },
      onForegroundReportNotification: (payload) => {
        const match = reportsRef.current.find((r) => String(r.id) === String(payload.reportId));
        if (match && !isReportSentToDepartment(match)) {
          setNewAdminReportAlert(match);
        }
        showSystemNotificationViaSW(
          `🔔 بلاغ جديد (${payload.trackingCode})`,
          `${payload.title} • ${payload.sectorLabelAr}`,
          {
            reportId: payload.reportId,
            trackingCode: payload.trackingCode,
            url: payload.clickUrl,
          }
        ).catch(() => {});
      },
    });

    return () => {
      unsubscribeFcm();
    };
  }, [isAdmin, isSuperAdmin, openReportDetailsForVerifiedAdmin]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'default') return;

    const handleFirstUserGesture = () => {
      requestMobileNotificationPermission().catch(() => {});
      window.removeEventListener('click', handleFirstUserGesture);
    };

    window.addEventListener('click', handleFirstUserGesture, { once: true });
    return () => {
      window.removeEventListener('click', handleFirstUserGesture);
    };
  }, []);

  const myReports = useMemo(() => {
    if (!currentUserUid) return [];
    return reports.filter(
      (r) =>
        myReportIds.includes(r.id) ||
        r.citizenId === currentUserUid ||
        r.ownerUid === currentUserUid
    );
  }, [reports, myReportIds, currentUserUid]);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedSector('ALL');
    setSelectedStatus('ALL');
    setSelectedNeighborhood('all');
  }, []);

  const metrics: BaadreMetrics = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter((r) => r.status === 'pending').length;
    const inProgress = reports.filter((r) => r.status === 'in_progress').length;
    const resolved = reports.filter((r) => r.status === 'resolved').length;
    const rejected = reports.filter((r) => r.status === 'rejected').length;
    const emergencyCount = reports.filter(
      (r) => isReportUrgencyConfirmed(r) && r.urgency === 'emergency'
    ).length;
    const completionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const resolvedWithHours = reports.filter((r) => r.responseTimeHours !== undefined);
    const avgResponseHours =
      resolvedWithHours.length > 0
        ? Number(
            (
              resolvedWithHours.reduce((acc, r) => acc + (r.responseTimeHours || 0), 0) /
              resolvedWithHours.length
            ).toFixed(1)
          )
        : 0;

    return {
      total,
      pending,
      inProgress,
      resolved,
      rejected,
      emergencyCount,
      completionRate,
      avgResponseHours,
    };
  }, [reports]);

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reports.filter((r) => {
      if (selectedSector !== 'all' && selectedSector !== 'ALL' && r.sector !== selectedSector) {
        return false;
      }
      if (selectedStatus !== 'all' && selectedStatus !== 'ALL' && r.status !== selectedStatus) {
        return false;
      }
      if (
        selectedNeighborhood !== 'all' &&
        selectedNeighborhood !== 'الكل' &&
        r.neighborhood !== selectedNeighborhood
      ) {
        return false;
      }

      if (q) {
        const matchesCode = r.trackingCode.toLowerCase().includes(q);
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesDesc = r.description.toLowerCase().includes(q);
        const matchesNeighborhood = r.neighborhood.toLowerCase().includes(q);
        const matchesCitizen =
          r.citizenName.toLowerCase().includes(q) || r.citizenPhone.includes(q);
        if (
          !matchesCode &&
          !matchesTitle &&
          !matchesDesc &&
          !matchesNeighborhood &&
          !matchesCitizen
        ) {
          return false;
        }
      }
      return true;
    });
  }, [reports, searchQuery, selectedSector, selectedStatus, selectedNeighborhood]);

  const submitReport = useCallback(
    (input: SubmitReportInput): CivicReport => {
      if (!auth.currentUser?.uid) {
        throw new Error('يرجى تسجيل الدخول.');
      }
      const resolvedOwnerUid = auth.currentUser.uid;
      const currentReports = reportsRef.current;

      if (!isAdmin && !isSuperAdmin) {
        const todayStr = new Date().toDateString();
        const todayCitizenReportsCount = currentReports.filter((r) => {
          if (r.ownerUid !== resolvedOwnerUid && r.citizenId !== resolvedOwnerUid) return false;
          if (!r.createdAt) return false;
          const reportDate = new Date(r.createdAt);
          return !Number.isNaN(reportDate.getTime()) && reportDate.toDateString() === todayStr;
        }).length;
        if (todayCitizenReportsCount >= 3) {
          throw new Error('الحد الأقصى اليومي 3 بلاغات لكل مواطن.');
        }
      }

      const reportNumericId = generateAutoNumericId(COLLECTIONS.REPORTS, currentReports);
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const trackingCode = `BDR-2026-${randomNum}`;
      const now = new Date().toISOString();
      const nonBase64Images = (input.images || []).filter((img) => !img.startsWith('data:'));
      const validImages =
        nonBase64Images.length > 0
          ? nonBase64Images.slice(0, 10)
          : [SECTOR_ILLUSTRATIONS[input.sector] || SECTOR_ILLUSTRATIONS.other];
      const latVal = input.latitude ?? input.lat ?? 36.7186;
      const lngVal = input.longitude ?? input.lng ?? 43.2614;
      const targetDepartment =
        SECTOR_DEFAULT_DEPARTMENT[input.sector] || 'مديرية بلدية باعدرى - الدائرة الخدمية المعنية';

      const newReport = prepareDocumentWithId<CivicReport>(
        COLLECTIONS.REPORTS,
        {
          id: reportNumericId,
          trackingCode,
          title: input.title.trim().slice(0, 300),
          description: input.description.trim().slice(0, 5000),
          sector: input.sector,
          status: 'pending',
          urgency: input.urgency || 'normal',
          neighborhood: input.neighborhood.slice(0, 200),
          street: (input.street.trim() || input.neighborhood).slice(0, 300),
          landmark: input.landmark.trim().slice(0, 300),
          lat: latVal,
          lng: lngVal,
          latitude: latVal,
          longitude: lngVal,
          images: validImages,
          videoUrl: input.videoUrl || '',
          videoThumbnail: input.videoThumbnail || '',
          videoDurationSeconds: input.videoDurationSeconds || 0,
          citizenId: resolvedOwnerUid,
          ownerUid: resolvedOwnerUid,
          citizenName: (input.citizenName.trim() || 'مواطن من باعدرى').slice(0, 200),
          citizenPhone: (input.citizenPhone.trim() || '07500000000').slice(0, 40),
          citizenWhatsapp: (input.citizenPhone.trim() || '07500000000').slice(0, 40),
          createdAt: now,
          updatedAt: now,
          assignedTeam: targetDepartment.slice(0, 300),
          adminNotes: '',
          officialNote: '',
          isUrgencySet: false,
          urgencySetAt: '',
          isOpened: false,
          openedAt: '',
          upvotesCount: 1,
          upvotes: 1,
          viewsCount: 1,
        },
        reportNumericId
      );

      knownReportIdsRef.current.add(newReport.id);
      setReports((prev) => [newReport, ...prev]);
      if (auth.currentUser) {
        setMyReportIds((prev) => [newReport.id, ...prev.filter((id) => id !== newReport.id)]);
      }
      setNewAdminReportAlert(newReport);

      setDoc(doc(db, COLLECTIONS.REPORTS, newReport.id), newReport)
        .then(() => {
          triggerNewReportServerNotification(newReport.id).catch(() => {});
        })
        .catch((err) => {
          try {
            handleFirestoreError(
              err,
              OperationType.CREATE,
              `${COLLECTIONS.REPORTS}/${newReport.id}`
            );
          } catch {}
        });

      if (auth.currentUser?.uid && auth.currentUser?.email) {
        const authUid = auth.currentUser.uid;
        const nextSubmittedCount =
          currentReports.filter((r) => r.ownerUid === authUid || r.citizenId === authUid).length +
          1;
        setDoc(
          doc(db, 'users', authUid),
          {
            uid: authUid,
            reportsSubmittedCount: nextSubmittedCount,
            updatedAt: now,
          },
          { merge: true }
        ).catch(() => {});
      }

      return newReport;
    },
    [isAdmin, isSuperAdmin]
  );

  const updateCitizenReport = useCallback(
    (reportId: string, input: SubmitReportInput): CivicReport | undefined => {
      const currentReports = reportsRef.current;
      const currentSelected = selectedReportRef.current;
      const currentEditing = editingCitizenReportRef.current;

      const targetReport =
        currentReports.find((r) => r.id === reportId) ||
        (currentSelected && currentSelected.id === reportId ? currentSelected : undefined) ||
        (currentEditing && currentEditing.id === reportId ? currentEditing : undefined);

      if (!targetReport) return undefined;

      if (
        targetReport.status !== 'pending' ||
        isReportSentToDepartment(targetReport) ||
        isReportUrgencyConfirmed(targetReport)
      ) {
        return undefined;
      }

      const now = new Date().toISOString();
      const nonBase64Images = (input.images || []).filter((img) => !img.startsWith('data:'));
      const validImages =
        nonBase64Images.length > 0
          ? nonBase64Images.slice(0, 10)
          : targetReport.images.filter((img) => !img.startsWith('data:'));
      const latVal = input.latitude ?? input.lat ?? targetReport.latitude;
      const lngVal = input.longitude ?? input.lng ?? targetReport.longitude;

      const allowedUpdates: Partial<CivicReport> = {
        title: input.title.trim().slice(0, 300),
        description: input.description.trim().slice(0, 5000),
        sector: input.sector,
        neighborhood: input.neighborhood.slice(0, 200),
        street: (input.street.trim() || input.neighborhood).slice(0, 300),
        landmark: input.landmark.trim().slice(0, 300),
        lat: latVal,
        lng: lngVal,
        latitude: latVal,
        longitude: lngVal,
        images: validImages,
        videoUrl: input.videoUrl !== undefined ? input.videoUrl : targetReport.videoUrl,
        videoThumbnail:
          input.videoThumbnail !== undefined ? input.videoThumbnail : targetReport.videoThumbnail,
        videoDurationSeconds:
          input.videoDurationSeconds !== undefined
            ? input.videoDurationSeconds
            : targetReport.videoDurationSeconds,
        citizenName: (input.citizenName.trim() || targetReport.citizenName).slice(0, 200),
        citizenPhone: (input.citizenPhone.trim() || targetReport.citizenPhone).slice(0, 40),
        citizenWhatsapp: (input.citizenPhone.trim() || targetReport.citizenPhone).slice(0, 40),
        updatedAt: now,
      };

      const updatedReport = prepareDocumentWithId<CivicReport>(
        COLLECTIONS.REPORTS,
        {
          ...targetReport,
          ...allowedUpdates,
          id: targetReport.id,
          status: 'pending',
          ownerUid: targetReport.ownerUid || targetReport.citizenId,
          citizenId: targetReport.citizenId || targetReport.ownerUid,
        },
        targetReport.id
      );

      setReports((prev) => {
        const next = prev.map((r) => (r.id === reportId ? updatedReport : r));
        try {
          localStorage.setItem(CACHE_KEY_REPORTS, JSON.stringify(next.slice(0, 100)));
        } catch {}
        return next;
      });
      setSelectedReportState(updatedReport);
      setNewAdminReportAlert((curr) => (curr && curr.id === reportId ? updatedReport : curr));

      executeCitizenReportEditTransaction(
        updatedReport.id,
        allowedUpdates,
        auth.currentUser?.uid
      ).catch((err) => {
        setReports((prev) => prev.map((r) => (r.id === reportId ? targetReport : r)));
        setSelectedReportState((curr) => (curr && curr.id === reportId ? targetReport : curr));
        try {
          handleFirestoreError(
            err,
            OperationType.UPDATE,
            `${COLLECTIONS.REPORTS}/${updatedReport.id}`
          );
        } catch {}
      });

      return updatedReport;
    },
    []
  );

  const findReportByTrackingCode = useCallback((code: string): CivicReport | undefined => {
    const normalized = code.trim().toUpperCase();
    return reportsRef.current.find((r) => r.trackingCode.toUpperCase() === normalized);
  }, []);

  const claimReportByTrackingCode = useCallback(
    (code: string): CivicReport | undefined => {
      const found = findReportByTrackingCode(code);
      if (found) {
        setMyReportIds((prev) => (prev.includes(found.id) ? prev : [found.id, ...prev]));
      }
      return found;
    },
    [findReportByTrackingCode]
  );

  const updateReportStatus = useCallback(
    (
      reportId: string,
      status: ReportStatus,
      adminNotes?: string,
      assignedTeam?: string,
      resolvedImages?: string[],
      customStatusNotes?: Partial<Record<ReportStatus, string>>,
      urgency?: ReportUrgency,
      assignedRecipient?: string
    ) => {
      const now = new Date().toISOString();
      const currentReports = reportsRef.current;
      const currentProjects = projectsRef.current;
      const currentCitizens = citizensRef.current;
      const currentSelected = selectedReportRef.current;

      const targetReport =
        currentReports.find((r) => r.id === reportId) ||
        (currentSelected && currentSelected.id === reportId ? currentSelected : undefined);

      if (!targetReport) return;

      const previousStatus = targetReport.status;
      const wasAlreadyResolved = previousStatus === 'resolved';
      const hoursDiff = Math.max(
        1,
        Number(((Date.now() - new Date(targetReport.createdAt).getTime()) / 3600000).toFixed(1))
      );

      const mergedStatusNotes: Partial<Record<ReportStatus, string>> = {
        ...(targetReport.statusNotes || {}),
        ...(customStatusNotes || {}),
      };

      const noteVal =
        adminNotes !== undefined
          ? adminNotes.trim()
          : mergedStatusNotes[status] !== undefined
          ? (mergedStatusNotes[status] || '').trim()
          : targetReport.officialNote || targetReport.adminNotes || '';

      mergedStatusNotes[status] = noteVal;

      const mergedStatusTimestamps: Partial<Record<ReportStatus, string>> = {
        ...(targetReport.statusTimestamps || {}),
        [status]: now,
      };

      if (status === 'resolved') {
        mergedStatusNotes.rejected = '';
        mergedStatusTimestamps.rejected = '';
      }

      const existingRecipientsList: string[] =
        Array.isArray(targetReport.assignedRecipients) &&
        targetReport.assignedRecipients.length > 0
          ? [...targetReport.assignedRecipients]
          : targetReport.assignedRecipient
          ? targetReport.assignedRecipient
              .split(' ، ثم: ')
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

      if (status === 'in_progress' && assignedRecipient && assignedRecipient.trim()) {
        const cleanRec = assignedRecipient.trim();
        if (!existingRecipientsList.includes(cleanRec)) {
          existingRecipientsList.push(cleanRec);
        }
      }

      const combinedRecipientsText =
        existingRecipientsList.length > 0
          ? existingRecipientsList.join(' ، ثم: ')
          : assignedRecipient !== undefined
          ? assignedRecipient
          : targetReport.assignedRecipient || '';

      const finalTeam =
        assignedTeam !== undefined && assignedTeam.trim()
          ? assignedTeam.trim()
          : targetReport.assignedTeam ||
            SECTOR_DEFAULT_DEPARTMENT[targetReport.sector] ||
            'مديرية بلدية باعدرى';
      const cleanResolved = (resolvedImages || []).filter((img) => !img.startsWith('data:'));
      const finalResolvedImgs =
        cleanResolved.length > 0
          ? cleanResolved
          : targetReport.resolvedImages && targetReport.resolvedImages.length > 0
          ? targetReport.resolvedImages.filter((img) => !img.startsWith('data:'))
          : status === 'resolved'
          ? targetReport.images && targetReport.images.length > 0
            ? targetReport.images.filter((img) => !img.startsWith('data:')).slice(0, 1)
            : [SECTOR_ILLUSTRATIONS[targetReport.sector] || SECTOR_ILLUSTRATIONS.other]
          : targetReport.resolvedImages;

      const matchingWorks = currentProjects.filter(
        (p) =>
          (targetReport.completedWorkId && String(p.id) === String(targetReport.completedWorkId)) ||
          (p.reportId && String(p.reportId) === String(targetReport.id)) ||
          (p.trackingCode && p.trackingCode === targetReport.trackingCode)
      );

      const deterministicWorkId =
        matchingWorks.length > 0
          ? matchingWorks[0].id
          : targetReport.completedWorkId && isPureNumericId(targetReport.completedWorkId)
          ? String(targetReport.completedWorkId)
          : status === 'resolved'
          ? generateAutoNumericId(COLLECTIONS.COMPLETED_WORK, currentProjects)
          : targetReport.completedWorkId;

      const updatedReport = prepareDocumentWithId<CivicReport>(
        COLLECTIONS.REPORTS,
        {
          ...targetReport,
          id: targetReport.id,
          status,
          urgency: urgency || targetReport.urgency || 'normal',
          isUrgencySet: true,
          urgencySetAt: targetReport.urgencySetAt || now,
          updatedAt: now,
          resolvedAt: status === 'resolved' ? now : targetReport.resolvedAt,
          responseTimeHours:
            status === 'resolved'
              ? targetReport.responseTimeHours || hoursDiff
              : targetReport.responseTimeHours,
          adminNotes: noteVal,
          officialNote: noteVal,
          statusNotes: mergedStatusNotes,
          statusTimestamps: mergedStatusTimestamps,
          completedWorkId: deterministicWorkId,
          assignedTeam: finalTeam,
          assignedRecipient: combinedRecipientsText,
          assignedRecipients: existingRecipientsList,
          resolvedImages: finalResolvedImgs,
        },
        targetReport.id
      );

      setReports((prev) => {
        const next = prev.map((r) => (r.id === reportId ? updatedReport : r));
        try {
          localStorage.setItem(CACHE_KEY_REPORTS, JSON.stringify(next.slice(0, 100)));
        } catch {}
        return next;
      });

      setSelectedReportState(updatedReport);

      if (isReportSentToDepartment(updatedReport)) {
        dismissedNewReportIdsRef.current.add(reportId);
        setNewAdminReportAlert((curr) => (curr && curr.id === reportId ? null : curr));
      }

      setStatusUpdateToast({
        reportId: updatedReport.id,
        trackingCode: updatedReport.trackingCode,
        reportTitle: updatedReport.title,
        fromStatus: previousStatus,
        toStatus: status,
        assignedTeam: finalTeam,
        note: noteVal,
      });

      let completedWorkDoc: OrganizationProject | null = null;
      const removedCompletedWorkIds: string[] = [];

      if (status === 'resolved' && deterministicWorkId) {
        completedWorkDoc = buildCompletedWorkDocumentFromReport(
          updatedReport,
          deterministicWorkId
        );

        matchingWorks.forEach((w) => {
          if (w.id !== deterministicWorkId) {
            removedCompletedWorkIds.push(w.id);
          }
        });

        setProjects((prevProjs) => {
          const withoutCurrentReport = prevProjs.filter(
            (p) =>
              p.id !== completedWorkDoc!.id &&
              (!p.reportId || String(p.reportId) !== String(updatedReport.id)) &&
              (!p.trackingCode || p.trackingCode !== updatedReport.trackingCode)
          );
          const next = [completedWorkDoc!, ...withoutCurrentReport];
          try {
            localStorage.setItem(CACHE_KEY_PROJECTS, JSON.stringify(next.slice(0, 100)));
          } catch {}
          return next;
        });
      } else {
        matchingWorks.forEach((w) => removedCompletedWorkIds.push(w.id));
        if (
          targetReport.completedWorkId &&
          !removedCompletedWorkIds.includes(targetReport.completedWorkId)
        ) {
          removedCompletedWorkIds.push(targetReport.completedWorkId);
        }

        if (removedCompletedWorkIds.length > 0) {
          setProjects((prevProjs) => {
            const next = prevProjs.filter(
              (p) =>
                !removedCompletedWorkIds.includes(p.id) &&
                (!p.reportId || String(p.reportId) !== String(targetReport.id)) &&
                (!p.trackingCode || p.trackingCode !== targetReport.trackingCode)
            );
            try {
              localStorage.setItem(CACHE_KEY_PROJECTS, JSON.stringify(next.slice(0, 100)));
            } catch {}
            return next;
          });
        }
      }

      let updatedCitizenDoc: RegisteredCitizen | null = null;
      if (status === 'resolved' && !wasAlreadyResolved) {
        const targetCitizen = currentCitizens.find(
          (c) =>
            (targetReport.citizenId && c.id === targetReport.citizenId) ||
            c.phone.replace(/\D/g, '') === (targetReport.citizenPhone || '').replace(/\D/g, '')
        );
        if (targetCitizen) {
          updatedCitizenDoc = prepareDocumentWithId<RegisteredCitizen>(
            COLLECTIONS.CITIZENS,
            {
              ...targetCitizen,
              id: targetCitizen.id,
              resolvedReportsCount: (targetCitizen.resolvedReportsCount || 0) + 1,
              lastActiveAt: now,
            },
            targetCitizen.id
          );
          setCitizens((prev) =>
            prev.map((c) => (c.id === updatedCitizenDoc!.id ? updatedCitizenDoc! : c))
          );
        }
      }

      syncReportStatusAndCompletedWorkToFirestore({
        updatedReport,
        completedWorkDoc,
        removedCompletedWorkIds,
        updatedCitizenDoc,
      }).catch(() => {});
    },
    [setCitizens]
  );

  const revertReportResolution = useCallback((reportId: string) => {
    const now = new Date().toISOString();
    const currentReports = reportsRef.current;
    const currentProjects = projectsRef.current;
    const currentSelected = selectedReportRef.current;

    const targetReport =
      currentReports.find((r) => r.id === reportId) ||
      (currentSelected && currentSelected.id === reportId ? currentSelected : undefined);

    if (!targetReport) return;

    const nextStatusNotes: Partial<Record<ReportStatus, string>> = {
      ...(targetReport.statusNotes || {}),
      resolved: '',
    };

    const nextStatusTimestamps: Partial<Record<ReportStatus, string>> = {
      ...(targetReport.statusTimestamps || {}),
      resolved: '',
    };

    const fallbackStatus: ReportStatus =
      nextStatusTimestamps.in_progress || nextStatusNotes.in_progress
        ? 'in_progress'
        : 'pending';

    const fallbackNote =
      fallbackStatus === 'in_progress' ? nextStatusNotes.in_progress || '' : '';

    const matchingWorks = currentProjects.filter(
      (p) =>
        (targetReport.completedWorkId && String(p.id) === String(targetReport.completedWorkId)) ||
        (p.reportId && String(p.reportId) === String(targetReport.id)) ||
        (p.trackingCode && p.trackingCode === targetReport.trackingCode)
    );

    const removedCompletedWorkIds: string[] = matchingWorks.map((w) => w.id);
    if (
      targetReport.completedWorkId &&
      !removedCompletedWorkIds.includes(targetReport.completedWorkId)
    ) {
      removedCompletedWorkIds.push(targetReport.completedWorkId);
    }

    const updatedReport = prepareDocumentWithId<CivicReport>(
      COLLECTIONS.REPORTS,
      {
        ...targetReport,
        id: targetReport.id,
        status: fallbackStatus,
        updatedAt: now,
        resolvedAt: '',
        completedWorkId: '',
        adminNotes: fallbackNote,
        officialNote: fallbackNote,
        statusNotes: nextStatusNotes,
        statusTimestamps: nextStatusTimestamps,
        resolvedImages: [],
      },
      targetReport.id
    );

    setReports((prev) => {
      const next = prev.map((r) => (r.id === reportId ? updatedReport : r));
      try {
        localStorage.setItem(CACHE_KEY_REPORTS, JSON.stringify(next.slice(0, 100)));
      } catch {}
      return next;
    });
    setSelectedReportState(updatedReport);

    if (removedCompletedWorkIds.length > 0) {
      setProjects((prevProjs) => {
        const next = prevProjs.filter(
          (p) =>
            !removedCompletedWorkIds.includes(p.id) &&
            (!p.reportId || String(p.reportId) !== String(targetReport.id)) &&
            (!p.trackingCode || p.trackingCode !== targetReport.trackingCode)
        );
        try {
          localStorage.setItem(CACHE_KEY_PROJECTS, JSON.stringify(next.slice(0, 100)));
        } catch {}
        return next;
      });
    }

    syncReportStatusAndCompletedWorkToFirestore({
      updatedReport,
      completedWorkDoc: null,
      removedCompletedWorkIds,
      updatedCitizenDoc: null,
    }).catch(() => {});
  }, []);

  const updateReportUrgency = useCallback((reportId: string, urgency: ReportUrgency) => {
    const now = new Date().toISOString();
    const currentReports = reportsRef.current;
    const currentSelected = selectedReportRef.current;

    const targetReport =
      currentReports.find((r) => r.id === reportId) ||
      (currentSelected && currentSelected.id === reportId ? currentSelected : undefined);

    if (!targetReport) return;

    const updatedReport = prepareDocumentWithId<CivicReport>(
      COLLECTIONS.REPORTS,
      {
        ...targetReport,
        id: targetReport.id,
        urgency,
        isUrgencySet: true,
        urgencySetAt: now,
        updatedAt: now,
      },
      targetReport.id
    );

    setReports((prev) => {
      const next = prev.map((r) => (r.id === reportId ? updatedReport : r));
      try {
        localStorage.setItem(CACHE_KEY_REPORTS, JSON.stringify(next.slice(0, 100)));
      } catch {}
      return next;
    });
    setSelectedReportState(updatedReport);

    setDoc(doc(db, COLLECTIONS.REPORTS, updatedReport.id), updatedReport, { merge: true }).catch(
      (err) => {
        try {
          handleFirestoreError(
            err,
            OperationType.UPDATE,
            `${COLLECTIONS.REPORTS}/${updatedReport.id}`
          );
        } catch {}
      }
    );
  }, []);

  const deleteReport = useCallback(
    (reportId: string) => {
      const currentReports = reportsRef.current;
      const currentProjects = projectsRef.current;
      const targetReport = currentReports.find((r) => r.id === reportId);
      const hasAdminPrivileges = isAdmin || isSuperAdmin || activeRole === 'admin';

      if (
        !hasAdminPrivileges &&
        targetReport &&
        (targetReport.status !== 'pending' || isReportSentToDepartment(targetReport))
      ) {
        return;
      }

      const linkedWorks = currentProjects.filter(
        (p) =>
          (p.reportId && String(p.reportId) === String(reportId)) ||
          (targetReport?.completedWorkId && String(p.id) === String(targetReport.completedWorkId)) ||
          (targetReport?.trackingCode && p.trackingCode === targetReport.trackingCode)
      );
      setReports((prev) => {
        const next = prev.filter((r) => r.id !== reportId);
        try {
          localStorage.setItem(CACHE_KEY_REPORTS, JSON.stringify(next.slice(0, 100)));
        } catch {}
        return next;
      });
      setMyReportIds((prev) => prev.filter((id) => id !== reportId));
      setSelectedReportState((curr) => (curr?.id === reportId ? null : curr));
      setNewAdminReportAlert((curr) => (curr?.id === reportId ? null : curr));
      if (linkedWorks.length > 0 && hasAdminPrivileges) {
        const linkedIds = new Set(linkedWorks.map((w) => w.id));
        setProjects((prev) => {
          const next = prev.filter((p) => !linkedIds.has(p.id));
          try {
            localStorage.setItem(CACHE_KEY_PROJECTS, JSON.stringify(next.slice(0, 100)));
          } catch {}
          return next;
        });
      }

      executeCitizenReportDeleteTransaction(
        reportId,
        auth.currentUser?.uid,
        hasAdminPrivileges
      )
        .then(() => {
          if (hasAdminPrivileges && (linkedWorks.length > 0 || targetReport?.completedWorkId)) {
            const batch = writeBatch(db);
            linkedWorks.forEach((w) => {
              batch.delete(doc(db, COLLECTIONS.COMPLETED_WORK, w.id));
            });
            if (targetReport?.completedWorkId) {
              batch.delete(doc(db, COLLECTIONS.COMPLETED_WORK, targetReport.completedWorkId));
            }
            batch.commit().catch(() => {});
          }
          // حذف جميع صور وفيديوهات البلاغ من ستوريج أيضاً
          if (targetReport) {
            deleteReportMediaFromStorage(targetReport).catch(() => {});
          }
        })
        .catch((err) => {
          if (targetReport) {
            setReports((prev) => [targetReport, ...prev.filter((r) => r.id !== reportId)]);
          }
          try {
            handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.REPORTS}/${reportId}`);
          } catch {}
        });
    },
    [isAdmin, isSuperAdmin, activeRole]
  );

  const upvoteReport = useCallback((reportId: string) => {
    setReports((prev) =>
      prev.map((r) => {
        if (r.id !== reportId) return r;
        const nextCount = (r.upvotes ?? r.upvotesCount ?? 0) + 1;
        const now = new Date().toISOString();
        const updated = {
          ...r,
          id: r.id,
          upvotesCount: nextCount,
          upvotes: nextCount,
          updatedAt: now,
        };
        setDoc(
          doc(db, COLLECTIONS.REPORTS, r.id),
          { id: r.id, upvotesCount: nextCount, upvotes: nextCount, updatedAt: now },
          { merge: true }
        ).catch((err) => {
          try {
            handleFirestoreError(err, OperationType.UPDATE, `${COLLECTIONS.REPORTS}/${r.id}`);
          } catch {}
        });
        return updated;
      })
    );
    setSelectedReportState((curr) => {
      if (!curr || curr.id !== reportId) return curr;
      const nextCount = (curr.upvotes ?? curr.upvotesCount ?? 0) + 1;
      return { ...curr, upvotesCount: nextCount, upvotes: nextCount };
    });
  }, []);

  const addProject = useCallback(
    (proj: Omit<OrganizationProject, 'id'>) => {
      if (!canAccessAdmin) return;
      const numericId = generateAutoNumericId(COLLECTIONS.COMPLETED_WORK, projectsRef.current);
      const newProj = prepareDocumentWithId<OrganizationProject>(
        COLLECTIONS.COMPLETED_WORK,
        {
          ...proj,
          id: numericId,
        },
        numericId
      );
      setProjects((prev) => [newProj, ...prev]);
      setDoc(doc(db, COLLECTIONS.COMPLETED_WORK, newProj.id), newProj).catch((err) => {
        try {
          handleFirestoreError(
            err,
            OperationType.CREATE,
            `${COLLECTIONS.COMPLETED_WORK}/${newProj.id}`
          );
        } catch {}
      });
    },
    [canAccessAdmin]
  );

  return {
    reports,
    myReports,
    myReportIds,
    reportsLimitCount,
    loadMoreReports,
    hasMoreReports,
    projects,
    metrics,
    searchQuery,
    setSearchQuery,
    selectedSector,
    setSelectedSector,
    selectedStatus,
    setSelectedStatus,
    selectedNeighborhood,
    setSelectedNeighborhood,
    filteredReports,
    resetFilters,
    selectedReport,
    setSelectedReport,
    editingCitizenReport,
    setEditingCitizenReport,
    isAddReportOpen,
    setIsAddReportOpen,
    isAddProjectOpen,
    setIsAddProjectOpen,
    statusUpdateToast,
    clearStatusUpdateToast,
    newAdminReportAlert,
    dismissNewAdminReportAlert,
    submitReport,
    submitNewReport: submitReport,
    updateCitizenReport,
    findReportByTrackingCode,
    claimReportByTrackingCode,
    updateReportStatus,
    revertReportResolution,
    updateReportUrgency,
    deleteReport,
    upvoteReport,
    addProject,
  };
}
