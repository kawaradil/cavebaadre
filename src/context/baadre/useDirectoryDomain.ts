import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
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
  OperationType,
  handleFirestoreError,
  withAppCheckHeaders,
} from '../../lib/firebase';
import { MunicipalDepartment, RegisteredCitizen } from '../../types/baadre';
import { CACHE_KEY_DEPTS, CACHE_KEY_CITIZENS } from './types';

export function useDirectoryDomain(params: {
  canAccessAdmin: boolean;
  hasFirestoreAdminAuth: boolean;
}) {
  const { canAccessAdmin, hasFirestoreAdminAuth } = params;

  const [departments, setDepartments] = useState<MunicipalDepartment[]>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY_DEPTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [citizens, setCitizens] = useState<RegisteredCitizen[]>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY_CITIZENS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const departmentsRef = useRef(departments);
  departmentsRef.current = departments;

  useEffect(() => {
    let unsubDepts = () => {};
    let unsubCitizens = () => {};
    let unsubUsers = () => {};

    if (hasFirestoreAdminAuth) {
      const deptsQuery = query(collection(db, COLLECTIONS.DEPARTMENTS), limit(50));
      unsubDepts = onSnapshot(
        deptsQuery,
        (snapshot) => {
          const numericDocs = snapshot.docs.filter((d) => isPureNumericId(d.id));
          const remoteDepts = numericDocs.map((d) => {
            const data = d.data() as MunicipalDepartment;
            return { ...data, id: String(d.id) };
          });
          syncNumericCounterWithItems(COLLECTIONS.DEPARTMENTS, remoteDepts);
          setDepartments(remoteDepts);
          try {
            localStorage.setItem(CACHE_KEY_DEPTS, JSON.stringify(remoteDepts));
          } catch {}
        },
        () => {}
      );

      let latestCitizensDocs: Array<{ id: string; data: Record<string, any> }> = [];
      let latestUsersDocs: Array<{ id: string; data: Record<string, any> }> = [];

      const rebuildMergedCitizens = () => {
        const mergedMap = new Map<string, RegisteredCitizen>();

        for (const { id, data } of latestCitizensDocs) {
          const cleanEmail = String(data.email || '').trim().toLowerCase();
          if (isPureNumericId(id) || !cleanEmail.includes('@')) {
            continue;
          }
          const isDesig = cleanEmail === '11kattak11@gmail.com';
          mergedMap.set(id, {
            id,
            name: isDesig ? 'كاوار عادل طاهر' : data.name || data.fullName || 'مواطن مسجل',
            email: data.email || '',
            phone: data.phone || '',
            birthDate: data.birthDate || '',
            neighborhood: data.neighborhood || 'ناحية باعدرى',
            role: isDesig ? 'super_admin' : data.role || 'citizen',
            reportsSubmittedCount: Number(data.reportsSubmittedCount || 0),
            resolvedReportsCount: Number(data.resolvedReportsCount || 0),
            joinedAt: data.joinedAt || data.createdAt || new Date().toISOString(),
            lastActiveAt: data.lastActiveAt || data.updatedAt,
            avatar: data.avatar,
            verified: data.verified !== false,
            isBlocked: Boolean(data.isBlocked),
          });
        }

        for (const { id, data } of latestUsersDocs) {
          const existing = mergedMap.get(id);
          const cleanEmail = String(data.email || existing?.email || '').trim().toLowerCase();
          if (isPureNumericId(id) || !cleanEmail.includes('@')) {
            continue;
          }
          const isDesig = cleanEmail === '11kattak11@gmail.com';
          mergedMap.set(id, {
            id,
            name: isDesig
              ? 'كاوار عادل طاهر'
              : data.fullName || data.name || existing?.name || 'مواطن مسجل',
            email: data.email || existing?.email || '',
            phone: data.phone || existing?.phone || '',
            birthDate: data.birthDate || existing?.birthDate || '',
            neighborhood: data.neighborhood || existing?.neighborhood || 'ناحية باعدرى',
            role: isDesig ? 'super_admin' : data.role || existing?.role || 'citizen',
            reportsSubmittedCount: Math.max(
              Number(data.reportsSubmittedCount || 0),
              Number(existing?.reportsSubmittedCount || 0)
            ),
            resolvedReportsCount: Math.max(
              Number(data.resolvedReportsCount || 0),
              Number(existing?.resolvedReportsCount || 0)
            ),
            joinedAt:
              data.createdAt || data.joinedAt || existing?.joinedAt || new Date().toISOString(),
            lastActiveAt: data.updatedAt || existing?.lastActiveAt,
            avatar: existing?.avatar,
            verified: true,
            isBlocked: Boolean(data.isBlocked ?? existing?.isBlocked ?? false),
          });
        }

        const list = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.joinedAt || 0).getTime() - new Date(a.joinedAt || 0).getTime()
        );
        setCitizens(list);
        try {
          localStorage.setItem(CACHE_KEY_CITIZENS, JSON.stringify(list.slice(0, 100)));
        } catch {}
      };

      const citizensQuery = query(collection(db, COLLECTIONS.CITIZENS), limit(100));
      unsubCitizens = onSnapshot(
        citizensQuery,
        (snapshot) => {
          const tempDocs = snapshot.docs.filter((d) => {
            const dData = d.data() as Record<string, any>;
            const emailStr = String(dData.email || '').trim();
            return isPureNumericId(d.id) || !emailStr.includes('@');
          });
          if (tempDocs.length > 0 && hasFirestoreAdminAuth) {
            const cleanupBatch = writeBatch(db);
            tempDocs.forEach((d) => cleanupBatch.delete(d.ref));
            cleanupBatch.commit().catch(() => {});
          }

          latestCitizensDocs = snapshot.docs
            .filter((d) => {
              const dData = d.data() as Record<string, any>;
              const emailStr = String(dData.email || '').trim();
              return !isPureNumericId(d.id) && emailStr.includes('@');
            })
            .map((d) => ({
              id: String(d.id),
              data: d.data() as Record<string, any>,
            }));
          rebuildMergedCitizens();
        },
        () => {}
      );

      const usersQuery = query(collection(db, 'users'), limit(100));
      unsubUsers = onSnapshot(
        usersQuery,
        (snapshot) => {
          latestUsersDocs = snapshot.docs
            .filter((d) => {
              const dData = d.data() as Record<string, any>;
              const emailStr = String(dData.email || '').trim();
              return !isPureNumericId(d.id) && emailStr.includes('@');
            })
            .map((d) => ({
              id: String(d.id),
              data: d.data() as Record<string, any>,
            }));
          rebuildMergedCitizens();
        },
        () => {}
      );
    } else {
      setDepartments([]);
      setCitizens([]);
      try {
        localStorage.removeItem(CACHE_KEY_DEPTS);
        localStorage.removeItem(CACHE_KEY_CITIZENS);
        localStorage.removeItem('cave_baadre_persisted_registered_users_v1');
      } catch {}
    }

    return () => {
      unsubDepts();
      unsubCitizens();
      unsubUsers();
    };
  }, [hasFirestoreAdminAuth]);

  const addDepartment = useCallback(
    (dept: Omit<MunicipalDepartment, 'id'>) => {
      if (!canAccessAdmin) return;
      const numericId = generateAutoNumericId(COLLECTIONS.DEPARTMENTS, departmentsRef.current);
      const newDept = prepareDocumentWithId<MunicipalDepartment>(
        COLLECTIONS.DEPARTMENTS,
        {
          ...dept,
          id: numericId,
        },
        numericId
      );
      setDepartments((prev) => {
        const next = [newDept, ...prev];
        try {
          localStorage.setItem(CACHE_KEY_DEPTS, JSON.stringify(next));
        } catch {}
        return next;
      });
      setDoc(doc(db, COLLECTIONS.DEPARTMENTS, newDept.id), newDept).catch((err) => {
        try {
          handleFirestoreError(
            err,
            OperationType.CREATE,
            `${COLLECTIONS.DEPARTMENTS}/${newDept.id}`
          );
        } catch {}
      });
    },
    [canAccessAdmin]
  );

  const updateDepartment = useCallback(
    (deptId: string, updates: Partial<MunicipalDepartment>) => {
      if (!canAccessAdmin) return;
      setDepartments((prev) => {
        const next = prev.map((d) => (d.id === deptId ? { ...d, ...updates, id: d.id } : d));
        try {
          localStorage.setItem(CACHE_KEY_DEPTS, JSON.stringify(next));
        } catch {}
        return next;
      });
      setDoc(
        doc(db, COLLECTIONS.DEPARTMENTS, deptId),
        { ...updates, id: deptId },
        { merge: true }
      ).catch((err) => {
        try {
          handleFirestoreError(
            err,
            OperationType.UPDATE,
            `${COLLECTIONS.DEPARTMENTS}/${deptId}`
          );
        } catch {}
      });
    },
    [canAccessAdmin]
  );

  const deleteDepartment = useCallback(
    (deptId: string) => {
      if (!canAccessAdmin) return;
      setDepartments((prev) => {
        const next = prev.filter((d) => d.id !== deptId);
        try {
          localStorage.setItem(CACHE_KEY_DEPTS, JSON.stringify(next));
        } catch {}
        return next;
      });
      deleteDoc(doc(db, COLLECTIONS.DEPARTMENTS, deptId)).catch((err) => {
        try {
          handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.DEPARTMENTS}/${deptId}`);
        } catch {}
      });
    },
    [canAccessAdmin]
  );

  const toggleBlockCitizen = useCallback(
    (citizenId: string) => {
      if (!canAccessAdmin) return;
      let targetNextBlocked: boolean | undefined;
      setCitizens((prev) =>
        prev.map((c) => {
          if (c.id !== citizenId) return c;
          if (c.role === 'super_admin') return c;
          const nextBlocked = !c.isBlocked;
          targetNextBlocked = nextBlocked;
          return { ...c, id: c.id, isBlocked: nextBlocked };
        })
      );

      if (targetNextBlocked === undefined) return;
      const finalBlocked = targetNextBlocked;

      (async () => {
        try {
          const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
          const res = await fetch('/api/admin/toggle-block', {
            method: 'POST',
            headers: await withAppCheckHeaders({
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            }),
            body: JSON.stringify({ targetUid: citizenId, isBlocked: finalBlocked }),
          });
          if (!res.ok) {
            setCitizens((prev) =>
              prev.map((c) => (c.id === citizenId ? { ...c, isBlocked: !finalBlocked } : c))
            );
            return;
          }
        } catch {}

        setDoc(
          doc(db, COLLECTIONS.CITIZENS, citizenId),
          { id: citizenId, isBlocked: finalBlocked },
          { merge: true }
        ).catch(() => {});
        setDoc(
          doc(db, 'users', citizenId),
          { isBlocked: finalBlocked, updatedAt: new Date().toISOString() },
          { merge: true }
        ).catch(() => {});
      })();
    },
    [canAccessAdmin]
  );

  const updateDepartmentAvailability = useCallback(
    (deptId: string, availability: 'available' | 'on_mission' | 'standby') => {
      if (!canAccessAdmin) return;
      setDepartments((prev) =>
        prev.map((d) => {
          if (d.id !== deptId) return d;
          const updated = { ...d, id: d.id, availability };
          setDoc(
            doc(db, COLLECTIONS.DEPARTMENTS, d.id),
            { id: d.id, availability },
            { merge: true }
          ).catch((err) => {
            try {
              handleFirestoreError(
                err,
                OperationType.UPDATE,
                `${COLLECTIONS.DEPARTMENTS}/${d.id}`
              );
            } catch {}
          });
          return updated;
        })
      );
    },
    [canAccessAdmin]
  );

  return {
    rawCitizens: citizens,
    setCitizens,
    departments: canAccessAdmin ? departments : [],
    citizens: canAccessAdmin ? citizens : [],
    addDepartment,
    updateDepartment,
    deleteDepartment,
    toggleBlockCitizen,
    updateDepartmentAvailability,
  };
}
