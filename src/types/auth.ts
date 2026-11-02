export type UserRole = 'citizen' | 'admin' | 'super_admin';

export interface UserCustomClaims {
  role: UserRole;
  isSuperAdmin?: boolean;
  isAdmin?: boolean;
}

export interface UserProfileDocument {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  role: UserRole;
  neighborhood?: string;
  reportsSubmittedCount?: number;
  resolvedReportsCount?: number;
  isBlocked?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface EncryptedVaultEntry {
  encryptedData: string; // Base64 ciphertext
  iv: string; // Base64 IV (12 bytes for GCM)
  authTag: string; // Base64 auth tag (16 bytes for GCM)
  algorithm: 'aes-256-gcm';
  createdAt: string;
  role: 'admin' | 'super_admin';
}

export interface AuditLogDocument {
  id: string;
  action:
    | 'SYSTEM_BOOTSTRAP_SUPER_ADMIN'
    | 'ROLE_CHANGED'
    | 'RECOVERY_CODE_GENERATED'
    | 'RECOVERY_CODE_REVEALED'
    | 'RECOVERY_CODE_REVEAL_ATTEMPT_DENIED'
    | 'ADMIN_RECOVERY_VERIFIED'
    | 'ADMIN_RECOVERY_FAILED'
    | 'PASSWORD_RESET_REQUESTED'
    | 'SESSION_REVOKED';
  actorUid: string;
  actorEmail?: string;
  actorRole?: UserRole;
  targetUid?: string;
  targetEmail?: string;
  targetRole?: UserRole;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface SystemBootstrapConfig {
  isBootstrapped: boolean;
  bootstrappedAt: string;
  superAdminUid: string;
  superAdminEmail: string;
}
