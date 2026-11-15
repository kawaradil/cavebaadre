import React, { useState } from 'react';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useBaadre } from '../context/BaadreContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { RoleManagementModal } from './RoleManagementModal';
import { AdminRecoveryCodeModal } from './AdminRecoveryCodeModal';
import { authService } from '../services/authService';
import { AdminCitizenDTO, toAdminCitizenDTO } from '../types/dto';
import { UserProfileDocument, UserRole } from '../types/auth';
import {
  CivicReport,
  SECTOR_META,
  URGENCY_META,
  ReportSector,
  MunicipalDepartment,
  isReportUrgencyConfirmed,
} from '../types/baadre';
import { OrganizationProjectsView } from './OrganizationProjectsView';
import { AnalyticsTabView } from './dashboard/AnalyticsTabView';
import { ActiveReportsTabView } from './dashboard/ActiveReportsTabView';
import { DirectoryTabView } from './dashboard/DirectoryTabView';
import { DashboardConfirmModals } from './dashboard/DashboardConfirmModals';

interface MunicipalControlDashboardProps {
  onSelectReport: (report: CivicReport) => void;
  onOpenAddProject?: () => void;
}

export const MunicipalControlDashboard: React.FC<MunicipalControlDashboardProps> = ({
  onSelectReport,
  onOpenAddProject,
}) => {
  const {
    reports,
    departments,
    citizens,
    surveys,
    surveyResponses,
    adminTab,
    deleteReport,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    toggleBlockCitizen,
    deleteCitizen,
    setEditingCitizenReport,
    setIsAddProjectOpen,
    loadMoreReports,
    hasMoreReports,
  } = useBaadre();
  const { language, isRTL } = useLanguage();
  const { currentUser, isSuperAdmin, isAdmin } = useAuth();

  const [reportToDelete, setReportToDelete] = useState<CivicReport | null>(null);
  const [citizenToDelete, setCitizenToDelete] = useState<AdminCitizenDTO | null>(null);
  const [selectedCitizenForRole, setSelectedCitizenForRole] = useState<AdminCitizenDTO | null>(null);
  const [directRoleTarget, setDirectRoleTarget] = useState<{
    cit: AdminCitizenDTO;
    role: UserRole;
  } | null>(null);
  const [selectedAdminForRecovery, setSelectedAdminForRecovery] = useState<AdminCitizenDTO | null>(
    null
  );
  const [registeredUsersList, setRegisteredUsersList] = useState<AdminCitizenDTO[]>(() => {
    try {
      const raw = localStorage.getItem('cave_baadre_persisted_registered_users_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const canAccessAdmin = Boolean(currentUser && (isAdmin || isSuperAdmin));

  React.useEffect(() => {
    if (!currentUser || !canAccessAdmin) {
      setRegisteredUsersList([]);
      return;
    }

    authService
      .fetchCitizensList(currentUser)
      .then((users) => {
        if (users && users.length > 0) {
          setRegisteredUsersList(users);
          try {
            localStorage.setItem(
              'cave_baadre_persisted_registered_users_v1',
              JSON.stringify(users.slice(0, 100))
            );
          } catch {}
        }
      })
      .catch(() => {});

    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), limit(100)),
      (snap) => {
        const liveUsers: AdminCitizenDTO[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as UserProfileDocument;
          const uid = docSnap.id;
          const isDesig = data.email?.trim().toLowerCase() === '11kattak11@gmail.com';
          const effectiveRole: UserRole = isDesig ? 'super_admin' : data.role || 'citizen';
          liveUsers.push(
            toAdminCitizenDTO(
              {
                ...data,
                uid,
                fullName: isDesig ? 'كاوار عادل طاهر' : data.fullName || 'مواطن مسجل',
                role: effectiveRole,
              },
              effectiveRole === 'admin' || effectiveRole === 'super_admin'
            )
          );
        });
        setRegisteredUsersList(liveUsers);
        try {
          localStorage.setItem(
            'cave_baadre_persisted_registered_users_v1',
            JSON.stringify(liveUsers.slice(0, 100))
          );
        } catch {}
      },
      () => {}
    );

    return () => {
      unsubUsers();
    };
  }, [currentUser?.uid, isAdmin, isSuperAdmin, canAccessAdmin]);

  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

  const getSectorLabel = (secKey: ReportSector) => {
    const sec = SECTOR_META[secKey];
    if (!sec) return secKey;
    return language === 'ku' ? sec.ku : language === 'en' ? sec.en : sec.ar;
  };

  const getUrgencyLabel = (urgKey: CivicReport['urgency']) => {
    const urg = URGENCY_META[urgKey];
    if (!urg) return urgKey;
    return language === 'ku' ? urg.ku : language === 'en' ? urg.en : urg.ar;
  };

  const getDeptDisplayName = (dept: MunicipalDepartment) => {
    if (language === 'ku') return dept.nameKu || dept.nameAr;
    if (language === 'en') return dept.nameEn || dept.nameAr;
    return dept.nameAr;
  };

  const [adminSectorFilter, setAdminSectorFilter] = useState<'ALL' | ReportSector>('ALL');
  const [adminSearch, setAdminSearch] = useState('');
  const [deptSearch, setDeptSearch] = useState('');
  const [citizenSearch, setCitizenSearch] = useState('');
  const [adminVisibleReportsCount, setAdminVisibleReportsCount] = useState<number>(12);
  const [adminVisibleCitizensCount, setAdminVisibleCitizensCount] = useState<number>(5);

  const activeIncomingReports = React.useMemo(() => {
    return reports.filter((r) => {
      if (adminSectorFilter !== 'ALL' && r.sector !== adminSectorFilter) return false;
      if (adminSearch.trim() !== '') {
        const q = adminSearch.trim().toLowerCase();
        const matchCode = r.trackingCode.toLowerCase().includes(q);
        const matchCitizen = r.citizenName.toLowerCase().includes(q);
        const matchNeighborhood = r.neighborhood.toLowerCase().includes(q);
        const matchTitle = r.title.toLowerCase().includes(q);
        if (!matchCode && !matchCitizen && !matchNeighborhood && !matchTitle) return false;
      }
      return true;
    });
  }, [reports, adminSectorFilter, adminSearch]);

  const filteredDepartments = React.useMemo(() => {
    if (!deptSearch.trim()) return departments;
    const q = deptSearch.trim().toLowerCase();
    return departments.filter(
      (d) =>
        d.nameAr.toLowerCase().includes(q) ||
        (d.nameKu && d.nameKu.toLowerCase().includes(q)) ||
        (d.nameEn && d.nameEn.toLowerCase().includes(q)) ||
        (d.engineerName && d.engineerName.toLowerCase().includes(q)) ||
        (d.engineerPhone && d.engineerPhone.includes(q)) ||
        (d.deputyName && d.deputyName.toLowerCase().includes(q)) ||
        (d.deputyPhone && d.deputyPhone.includes(q)) ||
        (d.managerName && d.managerName.toLowerCase().includes(q)) ||
        (d.managerPhone && d.managerPhone.includes(q)) ||
        d.phone.includes(q)
    );
  }, [departments, deptSearch]);

  const reportCardTotals = React.useMemo(() => {
    const total = reports.length;
    const pending = reports.filter((rep) => rep.status === 'pending').length;
    const resolved = reports.filter((rep) => rep.status === 'resolved').length;
    const rejected = reports.filter((rep) => rep.status === 'rejected').length;
    const inProgress = reports.filter(
      (rep) =>
        rep.status !== 'pending' && rep.status !== 'resolved' && rep.status !== 'rejected'
    ).length;
    const emergency = reports.filter(
      (rep) => isReportUrgencyConfirmed(rep) && rep.urgency === 'emergency'
    ).length;
    const completionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const reportingCitizens = new Set(
      reports
        .map((rep) => (rep.citizenPhone || rep.citizenName || rep.id).trim().toLowerCase())
        .filter(Boolean)
    ).size;

    return {
      total,
      pending,
      resolved,
      rejected,
      inProgress,
      emergency,
      completionRate,
      reportingCitizens,
    };
  }, [reports]);

  const generalSurveyStats = React.useMemo(() => {
    const totalSurveys = surveys.length;
    const publishedCount = surveys.filter((s) => s.isPublishedToCitizens).length;
    const totalResponses = Math.max(
      surveyResponses.length,
      surveys.reduce((acc, s) => acc + (s.totalResponses || 0), 0)
    );
    const totalQuestions = surveys.reduce((acc, s) => acc + s.questions.length, 0);
    return {
      totalSurveys,
      publishedCount,
      totalResponses,
      totalQuestions,
    };
  }, [surveys, surveyResponses]);

  const getDepartmentCompletedCount = React.useCallback(
    (dept: MunicipalDepartment) => {
      return reports.filter(
        (r) =>
          r.status === 'resolved' &&
          (r.assignedDepartmentId === dept.id ||
            r.assignedTeam === dept.nameAr ||
            r.assignedTeam === dept.fieldTeamName ||
            r.sector === dept.sector)
      ).length;
    },
    [reports]
  );

  const filteredCitizens = React.useMemo<AdminCitizenDTO[]>(() => {
    const submittedByUid: Record<string, number> = {};
    const resolvedByUid: Record<string, number> = {};

    reports.forEach((r) => {
      const owner = String(r.ownerUid || r.citizenId || '').trim();
      if (owner) {
        submittedByUid[owner] = (submittedByUid[owner] || 0) + 1;
        if (r.status === 'resolved') {
          resolvedByUid[owner] = (resolvedByUid[owner] || 0) + 1;
        }
      }
    });

    const mergedMap = new Map<string, AdminCitizenDTO>();

    registeredUsersList.forEach((ru) => {
      const cMatch = citizens.find(
        (c) => c.id === ru.uid || (ru.phone && c.phone && ru.phone === c.phone)
      );
      const isDesig = ru.email?.trim().toLowerCase() === '11kattak11@gmail.com';
      mergedMap.set(ru.uid, {
        ...ru,
        fullName: isDesig
          ? 'كاوار عادل طاهر'
          : ru.fullName || cMatch?.name || 'مواطن مسجل',
        phone: ru.phone || cMatch?.phone || '',
        neighborhood: ru.neighborhood || cMatch?.neighborhood || 'ناحية باعدرى',
        role: isDesig ? 'super_admin' : ru.role || 'citizen',
        reportsSubmittedCount: Math.max(
          ru.reportsSubmittedCount || 0,
          cMatch?.reportsSubmittedCount || 0,
          submittedByUid[ru.uid] || 0
        ),
        resolvedReportsCount: Math.max(
          ru.resolvedReportsCount || 0,
          cMatch?.resolvedReportsCount || 0,
          resolvedByUid[ru.uid] || 0
        ),
        joinedAt: ru.joinedAt || cMatch?.joinedAt || new Date().toISOString(),
        isBlocked: Boolean(ru.isBlocked ?? cMatch?.isBlocked ?? false),
      });
    });

    citizens.forEach((c) => {
      if (!mergedMap.has(c.id)) {
        const match = registeredUsersList.find(
          (u) => u.uid === c.id || (u.phone && c.phone && u.phone.includes(c.phone))
        );
        if (match && mergedMap.has(match.uid)) return;

        mergedMap.set(c.id, {
          uid: c.id,
          fullName: c.name || 'مواطن مسجل',
          email: match?.email || '',
          phone: c.phone || '',
          birthDate: match?.birthDate || '',
          role: match?.role || 'citizen',
          neighborhood: c.neighborhood || 'ناحية باعدرى',
          reportsSubmittedCount: Math.max(
            c.reportsSubmittedCount || 0,
            submittedByUid[c.id] || 0
          ),
          resolvedReportsCount: Math.max(
            c.resolvedReportsCount || 0,
            resolvedByUid[c.id] || 0
          ),
          joinedAt: c.joinedAt || new Date().toISOString(),
          isBlocked: Boolean(c.isBlocked),
          hasRecoveryCodeConfigured: match?.hasRecoveryCodeConfigured,
        });
      }
    });

    const allMerged = Array.from(mergedMap.values()).filter((c) => {
      const isSuper =
        c.role === 'super_admin' ||
        c.email?.trim().toLowerCase() === '11kattak11@gmail.com';
      if (!isSuperAdmin && isSuper) return false;
      return true;
    });

    const pinnedAdmins = allMerged
      .filter((c) => c.role === 'admin' || c.role === 'super_admin')
      .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());

    const regularCitizens = allMerged
      .filter((c) => c.role !== 'admin' && c.role !== 'super_admin')
      .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());

    const list = [...pinnedAdmins, ...regularCitizens];

    if (!citizenSearch.trim()) return list;
    const q = citizenSearch.trim().toLowerCase();
    return list.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.neighborhood.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [citizens, registeredUsersList, reports, citizenSearch, isSuperAdmin]);

  const regularCitizensList = React.useMemo(() => {
    return filteredCitizens.filter(
      (c) => c.role !== 'admin' && c.role !== 'super_admin'
    );
  }, [filteredCitizens]);

  const displayedCitizens = React.useMemo(() => {
    const pinnedAdminsList = filteredCitizens.filter(
      (c) => c.role === 'admin' || c.role === 'super_admin'
    );
    return [
      ...pinnedAdminsList,
      ...regularCitizensList.slice(0, adminVisibleCitizensCount),
    ];
  }, [filteredCitizens, regularCitizensList, adminVisibleCitizensCount]);

  const sectorDistribution = React.useMemo(() => {
    const counts: Record<ReportSector, number> = {
      roads: 0,
      sewage: 0,
      sanitation: 0,
      lighting: 0,
      water: 0,
      other: 0,
    };
    reports.forEach((r) => {
      counts[r.sector] = (counts[r.sector] || 0) + 1;
    });
    return Object.values(SECTOR_META).map((sec) => ({
      ...sec,
      count: counts[sec.key] || 0,
      percentage:
        reports.length > 0 ? Math.round(((counts[sec.key] || 0) / reports.length) * 100) : 0,
    }));
  }, [reports]);

  const weeklyAnalyticsData = React.useMemo(() => {
    const dayLabels = [
      tr('السبت', 'شەمە', 'Sat'),
      tr('الأحد', 'یەك شەم', 'Sun'),
      tr('الإثنين', 'دووشەم', 'Mon'),
      tr('الثلاثاء', 'سێ شەم', 'Tue'),
      tr('الأربعاء', 'چوار شەم', 'Wed'),
      tr('الخميس', 'بێنچ شەم', 'Thu'),
      tr('الجمعة', 'هەینی', 'Fri'),
    ];
    const counts = dayLabels.map((day) => ({ day, incoming: 0, resolved: 0 }));
    reports.forEach((r) => {
      const d = new Date(r.createdAt);
      if (!Number.isNaN(d.getTime())) {
        const idx = (d.getDay() + 1) % 7;
        counts[idx].incoming += 1;
        if (r.status === 'resolved') {
          counts[idx].resolved += 1;
        }
      }
    });
    return counts;
  }, [reports, language]);

  const localeCode = 'en-US';

  if (!canAccessAdmin) {
    return null;
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-6">
      {adminTab === 'analytics' && (
        <AnalyticsTabView
          isRTL={isRTL}
          tr={tr}
          reportCardTotals={reportCardTotals}
          departmentsCount={departments.length}
          citizensCount={citizens.length}
          generalSurveyStats={generalSurveyStats}
          weeklyAnalyticsData={weeklyAnalyticsData}
          sectorDistribution={sectorDistribution}
          getSectorLabel={getSectorLabel}
        />
      )}

      {adminTab === 'active_reports' && (
        <ActiveReportsTabView
          isRTL={isRTL}
          localeCode={localeCode}
          currentUser={currentUser}
          totalReportsCount={reports.length}
          activeIncomingReports={activeIncomingReports}
          adminSearch={adminSearch}
          setAdminSearch={setAdminSearch}
          adminSectorFilter={adminSectorFilter}
          setAdminSectorFilter={setAdminSectorFilter}
          adminVisibleReportsCount={adminVisibleReportsCount}
          setAdminVisibleReportsCount={setAdminVisibleReportsCount}
          hasMoreReports={hasMoreReports}
          loadMoreReports={loadMoreReports}
          tr={tr}
          getSectorLabel={getSectorLabel}
          getUrgencyLabel={getUrgencyLabel}
          onSelectReport={onSelectReport}
          onEditCitizenReport={(rep) => setEditingCitizenReport(rep)}
          onRequestDeleteReport={(rep) => setReportToDelete(rep)}
        />
      )}

      {adminTab === 'projects' && (
        <div className="-mx-3 sm:-mx-6 -my-5">
          <OrganizationProjectsView
            onOpenAddProject={() => {
              if (onOpenAddProject) onOpenAddProject();
              else setIsAddProjectOpen(true);
            }}
          />
        </div>
      )}

      {(adminTab === 'directory' || adminTab === 'departments_directory') && (
        <DirectoryTabView
          isRTL={isRTL}
          currentUser={currentUser}
          isAdmin={isAdmin}
          isSuperAdmin={isSuperAdmin}
          departments={departments}
          filteredDepartments={filteredDepartments}
          deptSearch={deptSearch}
          setDeptSearch={setDeptSearch}
          citizensCount={citizens.length}
          filteredCitizens={filteredCitizens}
          displayedCitizens={displayedCitizens}
          regularCitizensCount={regularCitizensList.length}
          adminVisibleCitizensCount={adminVisibleCitizensCount}
          setAdminVisibleCitizensCount={setAdminVisibleCitizensCount}
          citizenSearch={citizenSearch}
          setCitizenSearch={setCitizenSearch}
          tr={tr}
          getSectorLabel={getSectorLabel}
          getDeptDisplayName={getDeptDisplayName}
          getDepartmentCompletedCount={getDepartmentCompletedCount}
          addDepartment={addDepartment}
          updateDepartment={updateDepartment}
          deleteDepartment={deleteDepartment}
          onSelectForRole={(targetCit) => {
            setDirectRoleTarget(null);
            setSelectedCitizenForRole(targetCit);
          }}
          onGrantAdminDirect={(targetCit) => {
            setDirectRoleTarget({ cit: targetCit, role: 'admin' });
            setSelectedCitizenForRole(targetCit);
          }}
          onRevertCitizenDirect={(targetCit) => {
            setDirectRoleTarget({ cit: targetCit, role: 'citizen' });
            setSelectedCitizenForRole(targetCit);
          }}
          onSelectForRecovery={(targetCit) => {
            setSelectedAdminForRecovery(targetCit);
          }}
          onToggleBlockCitizen={(citId) => {
            toggleBlockCitizen(citId);
          }}
          onRequestDeleteCitizen={(targetCit) => {
            setCitizenToDelete(targetCit);
          }}
        />
      )}

      <DashboardConfirmModals
        isRTL={isRTL}
        tr={tr}
        reportToDelete={reportToDelete}
        onCancelDeleteReport={() => setReportToDelete(null)}
        onConfirmDeleteReport={(reportId) => {
          deleteReport(reportId);
          setReportToDelete(null);
        }}
        citizenToDelete={citizenToDelete}
        onCancelDeleteCitizen={() => setCitizenToDelete(null)}
        onConfirmDeleteCitizen={async (targetCit) => {
          const targetId = targetCit.uid || (targetCit as any).id;
          const targetMail = String(targetCit.email || '').trim().toLowerCase();
          setCitizenToDelete(null);
          if (targetId) {
            setRegisteredUsersList((prev) => {
              const next = prev.filter(
                (u) =>
                  u.uid !== targetId &&
                  (!targetMail || String(u.email || '').trim().toLowerCase() !== targetMail)
              );
              try {
                localStorage.setItem(
                  'cave_baadre_persisted_registered_users_v1',
                  JSON.stringify(next.slice(0, 100))
                );
              } catch {}
              return next;
            });
            await deleteCitizen(targetId);
          }
        }}
      />

      {selectedCitizenForRole && (
        <RoleManagementModal
          citizen={selectedCitizenForRole}
          isOpen={Boolean(selectedCitizenForRole)}
          initialTargetRole={
            directRoleTarget && directRoleTarget.cit.uid === selectedCitizenForRole.uid
              ? directRoleTarget.role
              : undefined
          }
          startWithConfirmation={Boolean(
            directRoleTarget && directRoleTarget.cit.uid === selectedCitizenForRole.uid
          )}
          onClose={() => {
            setSelectedCitizenForRole(null);
            setDirectRoleTarget(null);
          }}
          onOpenRevealCode={(adminCit) => {
            setSelectedCitizenForRole(null);
            setDirectRoleTarget(null);
            setSelectedAdminForRecovery(adminCit);
          }}
          onRoleUpdated={(newRole, uid) => {
            setRegisteredUsersList((prev) =>
              prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u))
            );
          }}
        />
      )}

      {selectedAdminForRecovery && (
        <AdminRecoveryCodeModal
          adminCitizen={selectedAdminForRecovery}
          isOpen={Boolean(selectedAdminForRecovery)}
          onClose={() => setSelectedAdminForRecovery(null)}
        />
      )}
    </div>
  );
};
