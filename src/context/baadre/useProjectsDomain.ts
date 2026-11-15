import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  limit,
  writeBatch,
} from 'firebase/firestore';
import {
  db,
  COLLECTIONS,
  generateAutoNumericId,
  isPureNumericId,
  syncNumericCounterWithItems,
  prepareDocumentWithId,
  OperationType,
  handleFirestoreError,
} from '../../lib/firebase';
import { CivicReport, OrganizationProject } from '../../types/baadre';
import { CACHE_KEY_PROJECTS } from './types';

interface UseProjectsDomainParams {
  canAccessAdmin: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  currentUserUid?: string;
}

export function useProjectsDomain({
  canAccessAdmin,
  isAdmin,
  isSuperAdmin,
  currentUserUid,
}: UseProjectsDomainParams) {
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

  useEffect(() => {
    const hasFirestoreAdminAuth = Boolean(currentUserUid && (isAdmin || isSuperAdmin));
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
      unsubCompletedWork();
    };
  }, [currentUserUid, isAdmin, isSuperAdmin]);

  const addProject = useCallback(
    (proj: Omit<OrganizationProject, 'id'>) => {
      if (!canAccessAdmin) return;
      const numericId = generateAutoNumericId(COLLECTIONS.COMPLETED_WORK, projects);
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
    [projects, canAccessAdmin]
  );

  /**
   * Keeps CompletedWork in sync when a report's status changes away from 'resolved'.
   */
  const useSyncNonResolvedProjectsCleanup = (reports: CivicReport[]) => {
    useEffect(() => {
      const hasFirestoreAdminAuth = Boolean(currentUserUid && (isAdmin || isSuperAdmin));
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
    }, [reports]);
  };

  return {
    projects,
    setProjects,
    addProject,
    useSyncNonResolvedProjectsCleanup,
  };
}
