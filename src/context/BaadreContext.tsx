import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useAuth } from './AuthContext';
import { AdminSectionTab, CitizenNavTab } from '../types/baadre';
import {
  CreateSurveyInput,
  SubmitReportInput,
  BaadreMetrics,
  CloudContactSettings,
  BaadreContextType,
  STORAGE_ROLE_KEY,
} from './baadre/types';
import { useContactSettingsState } from './baadre/useContactSettingsState';
import { useDirectoryDomain } from './baadre/useDirectoryDomain';
import { useProjectsDomain } from './baadre/useProjectsDomain';
import { useReportsDomain } from './baadre/useReportsDomain';
import { useSurveysDomain } from './baadre/useSurveysDomain';

export type {
  CreateSurveyInput,
  SubmitReportInput,
  BaadreMetrics,
  CloudContactSettings,
  BaadreContextType,
};

const BaadreContext = createContext<BaadreContextType | undefined>(undefined);

export const BaadreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, isSuperAdmin, isCitizen, role, currentUser } = useAuth();
  const canAccessAdmin = Boolean(
    currentUser &&
      !isCitizen &&
      (isAdmin || isSuperAdmin) &&
      (role === 'admin' || role === 'super_admin')
  );

  const [activeRole, setActiveRoleState] = useState<'citizen' | 'admin'>('citizen');
  const [citizenTabState, setCitizenTabState] = useState<CitizenNavTab>('works');
  const [adminTabState, setAdminTabState] = useState<AdminSectionTab>('analytics');
  const [isSurveysViewOpenState, setIsSurveysViewOpenState] = useState<boolean>(false);
  const [isStartScreenActive, setIsStartScreenActive] = useState<boolean>(true);

  const dismissStartScreen = useCallback(() => {
    setIsStartScreenActive(false);
  }, []);

  const setIsSurveysViewOpen = useCallback(
    (open: boolean) => {
      if (open) {
        setIsStartScreenActive(false);
      }
      if (open && (!canAccessAdmin || activeRole !== 'admin')) {
        setIsSurveysViewOpenState(false);
        return;
      }
      setIsSurveysViewOpenState(open);
    },
    [canAccessAdmin, activeRole]
  );

  const isSurveysViewOpen =
    canAccessAdmin && activeRole === 'admin' ? isSurveysViewOpenState : false;

  const setCitizenTab = useCallback((tab: CitizenNavTab) => {
    setIsStartScreenActive(false);
    setCitizenTabState(tab);
    setIsSurveysViewOpenState(false);
  }, []);

  const setAdminTab = useCallback(
    (tab: AdminSectionTab) => {
      setIsStartScreenActive(false);
      if (!canAccessAdmin) {
        setActiveRoleState('citizen');
        setCitizenTabState('works');
        setIsSurveysViewOpenState(false);
        return;
      }
      setAdminTabState(tab);
      setIsSurveysViewOpenState(false);
    },
    [canAccessAdmin]
  );

  const citizenTab = citizenTabState;
  const adminTab = canAccessAdmin ? adminTabState : 'analytics';

  // Clean up legacy mock keys once on mount
  useEffect(() => {
    try {
      const legacyMockKeys = [
        'cave_baadre_reports_v5',
        'cave_baadre_reports_v6',
        'cave_baadre_departments_v3',
        'cave_baadre_departments_v4',
        'cave_baadre_citizens_v3',
        'cave_baadre_citizens_v4',
        'cave_baadre_projects_v4',
        'cave_baadre_completed_work_v1',
        'cave_baadre_surveys_v1',
        'cave_baadre_surveys_v2',
        'cave_baadre_survey_responses_v1',
        'cave_baadre_answered_surveys_v3',
      ];
      legacyMockKeys.forEach((k) => localStorage.removeItem(k));
    } catch {}
  }, []);

  useEffect(() => {
    if (activeRole === 'admin') {
      setAdminTabState('analytics');
      setIsSurveysViewOpenState(false);
    } else {
      setCitizenTabState('works');
      setIsSurveysViewOpenState(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser && (isSuperAdmin || isAdmin)) {
      setActiveRoleState('admin');
      try {
        localStorage.setItem(STORAGE_ROLE_KEY, 'admin');
      } catch {}
    } else {
      setActiveRoleState('citizen');
      setIsSurveysViewOpenState(false);
      if (!currentUser) {
        setCitizenTabState('works');
      }
      try {
        localStorage.setItem(STORAGE_ROLE_KEY, 'citizen');
      } catch {}
    }
  }, [isSuperAdmin, isAdmin, currentUser]);

  const setActiveRole = useCallback(
    (nextRole: 'citizen' | 'admin') => {
      setIsStartScreenActive(false);
      if (nextRole === 'admin' && !canAccessAdmin) {
        setActiveRoleState('citizen');
        setCitizenTabState('works');
        setIsSurveysViewOpenState(false);
        return;
      }
      setActiveRoleState(nextRole);
      if (nextRole === 'admin') {
        setAdminTabState('analytics');
        setIsSurveysViewOpenState(false);
      } else if (nextRole === 'citizen') {
        setCitizenTabState('works');
        setIsSurveysViewOpenState(false);
      }
      try {
        localStorage.setItem(STORAGE_ROLE_KEY, nextRole);
      } catch {}
    },
    [canAccessAdmin]
  );

  const toggleRole = useCallback(() => {
    setIsStartScreenActive(false);
    if (!canAccessAdmin) {
      setActiveRoleState('citizen');
      setCitizenTabState('works');
      setIsSurveysViewOpenState(false);
      return;
    }
    setActiveRoleState((prev) => {
      const next = prev === 'citizen' ? 'admin' : 'citizen';
      if (next === 'admin') {
        setAdminTabState('analytics');
        setIsSurveysViewOpenState(false);
      } else {
        setCitizenTabState('works');
        setIsSurveysViewOpenState(false);
      }
      try {
        localStorage.setItem(STORAGE_ROLE_KEY, next);
      } catch {}
      return next;
    });
  }, [canAccessAdmin]);

  // Compose modular domain hooks
  const { contactSettings, updateContactSettings } = useContactSettingsState(canAccessAdmin);

  const directoryDomain = useDirectoryDomain({
    canAccessAdmin,
    isAdmin,
    isSuperAdmin,
    currentUserUid: currentUser?.uid,
  });

  const projectsDomain = useProjectsDomain({
    canAccessAdmin,
    isAdmin,
    isSuperAdmin,
    currentUserUid: currentUser?.uid,
  });

  const reportsDomain = useReportsDomain({
    activeRole,
    setActiveRoleDirect: setActiveRoleState,
    setIsSurveysViewOpen,
    isAdmin,
    isSuperAdmin,
    currentUser,
    projects: projectsDomain.projects,
    setProjects: projectsDomain.setProjects,
    rawCitizens: directoryDomain.rawCitizens,
    setCitizens: directoryDomain.setCitizens,
  });

  projectsDomain.useSyncNonResolvedProjectsCleanup(reportsDomain.reports);

  const surveysDomain = useSurveysDomain({
    canAccessAdmin,
    isAdmin,
    isSuperAdmin,
    currentUserUid: currentUser?.uid,
  });

  const value: BaadreContextType = useMemo(
    () => ({
      activeRole,
      setActiveRole,
      toggleRole,
      citizenTab,
      setCitizenTab,
      adminTab,
      setAdminTab,
      isSurveysViewOpen,
      setIsSurveysViewOpen,
      isStartScreenActive,
      dismissStartScreen,
      contactSettings,
      updateContactSettings,
      projects: projectsDomain.projects,
      addProject: projectsDomain.addProject,
      departments: directoryDomain.departments,
      citizens: directoryDomain.citizens,
      addDepartment: directoryDomain.addDepartment,
      updateDepartment: directoryDomain.updateDepartment,
      deleteDepartment: directoryDomain.deleteDepartment,
      toggleBlockCitizen: directoryDomain.toggleBlockCitizen,
      deleteCitizen: directoryDomain.deleteCitizen,
      updateDepartmentAvailability: directoryDomain.updateDepartmentAvailability,
      ...reportsDomain,
      ...surveysDomain,
    }),
    [
      activeRole,
      setActiveRole,
      toggleRole,
      citizenTab,
      setCitizenTab,
      adminTab,
      setAdminTab,
      isSurveysViewOpen,
      setIsSurveysViewOpen,
      isStartScreenActive,
      dismissStartScreen,
      contactSettings,
      updateContactSettings,
      projectsDomain.projects,
      projectsDomain.addProject,
      directoryDomain,
      reportsDomain,
      surveysDomain,
    ]
  );

  return <BaadreContext.Provider value={value}>{children}</BaadreContext.Provider>;
};

export const useBaadre = (): BaadreContextType => {
  const ctx = useContext(BaadreContext);
  if (!ctx) {
    throw new Error('useBaadre must be used within a BaadreProvider');
  }
  return ctx;
};
