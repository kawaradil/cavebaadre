import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  authService,
  RegisterCitizenInput,
  UpdateAccountInput,
} from '../services/authService';
import {
  registerAdminDeviceFcmToken,
  cleanupDeviceTokenOnLogout,
} from '../services/fcmService';
import { AuthUserDTO, CitizenProfileDTO, AdminCitizenDTO } from '../types/dto';
import { UserRole } from '../types/auth';

interface AuthContextType {
  currentUser: User | null;
  authUser: AuthUserDTO | null;
  profile: CitizenProfileDTO | AdminCitizenDTO | null;
  role: UserRole;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isCitizen: boolean;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;

  // Modal Control
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'login' | 'register' | 'recovery';
  setAuthModalMode: (mode: 'login' | 'register' | 'recovery') => void;
  openAuthModal: (mode?: 'login' | 'register' | 'recovery') => void;
  closeAuthModal: () => void;

  // Operations
  login: (email: string, pass: string) => Promise<void>;
  register: (input: RegisterCitizenInput) => Promise<void>;
  updateAccount: (input: UpdateAccountInput) => Promise<void>;
  deleteAccountWithoutData: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>('citizen');
  const [profile, setProfile] = useState<CitizenProfileDTO | AdminCitizenDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'recovery'>('login');

  const openAuthModal = useCallback((mode: 'login' | 'register' | 'recovery' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
    setError(null);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setError(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) {
      setProfile(null);
      setRole('citizen');
      return;
    }

    try {
      const { profile: fetchedProfile, role: fetchedRole } =
        await authService.fetchCurrentProfile(auth.currentUser);
      setProfile(fetchedProfile);
      setRole(fetchedRole);

      if (fetchedRole === 'admin' || fetchedRole === 'super_admin') {
        registerAdminDeviceFcmToken(fetchedRole).catch(() => {});
      }
    } catch (err: any) {
      if (err?.message === 'تم حظر هذا الحساب.') {
        setCurrentUser(null);
        setProfile(null);
        setRole('citizen');
        setError('تم حظر هذا الحساب.');
        throw err;
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          await refreshProfile();
        } catch {}
      } else {
        setProfile(null);
        setRole('citizen');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [refreshProfile]);

  const login = useCallback(async (email: string, pass: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await authService.login(email, pass);
      setCurrentUser(user);
      await refreshProfile();
      closeAuthModal();
    } catch (err: any) {
      setError(err?.message === 'تم حظر هذا الحساب.' ? 'تم حظر هذا الحساب.' : 'بيانات الدخول غير صحيحة.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [closeAuthModal, refreshProfile]);

  const register = useCallback(
    async (input: RegisterCitizenInput) => {
      setIsLoading(true);
      setError(null);
      try {
        const { user, profile: newProfile, role: resolvedRole } =
          await authService.registerCitizen(input);
        setCurrentUser(user);
        setProfile(newProfile);
        setRole(resolvedRole);
        if (resolvedRole === 'admin' || resolvedRole === 'super_admin') {
          registerAdminDeviceFcmToken(resolvedRole).catch(() => {});
        }
        closeAuthModal();
      } catch (err: any) {
        setError('تعذر إنشاء الحساب.');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [closeAuthModal]
  );

  const updateAccount = useCallback(
    async (input: UpdateAccountInput) => {
      if (!auth.currentUser) throw new Error('يرجى تسجيل الدخول.');
      const res = await authService.updateUserAccount(auth.currentUser, input);
      setProfile(res.profile);
      setRole(res.role);
    },
    []
  );

  const deleteAccountWithoutData = useCallback(async () => {
    if (!auth.currentUser) return;
    await cleanupDeviceTokenOnLogout().catch(() => {});
    await authService.deleteUserAccountKeepData(auth.currentUser);
    setCurrentUser(null);
    setProfile(null);
    setRole('citizen');
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await cleanupDeviceTokenOnLogout().catch(() => {});
      await authService.logout();
      setCurrentUser(null);
      setProfile(null);
      setRole('citizen');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin' || isSuperAdmin;
  const isCitizen = role === 'citizen';
  const isLoggedIn = Boolean(currentUser);

  const authUser: AuthUserDTO | null = useMemo(() => {
    if (!currentUser) return null;
    return {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName,
      phone: currentUser.phoneNumber || profile?.phone,
      role,
      isSuperAdmin,
      isAdmin,
      isCitizen,
    };
  }, [currentUser, profile, role, isSuperAdmin, isAdmin, isCitizen]);

  const value = useMemo(
    () => ({
      currentUser,
      authUser,
      profile,
      role,
      isSuperAdmin,
      isAdmin,
      isCitizen,
      isLoggedIn,
      isLoading,
      error,
      isAuthModalOpen,
      setIsAuthModalOpen,
      authModalMode,
      setAuthModalMode,
      openAuthModal,
      closeAuthModal,
      login,
      register,
      updateAccount,
      deleteAccountWithoutData,
      logout,
      refreshProfile,
    }),
    [
      currentUser,
      authUser,
      profile,
      role,
      isSuperAdmin,
      isAdmin,
      isCitizen,
      isLoggedIn,
      isLoading,
      error,
      isAuthModalOpen,
      authModalMode,
      openAuthModal,
      closeAuthModal,
      login,
      register,
      updateAccount,
      deleteAccountWithoutData,
      logout,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
