import crypto from 'crypto';
import { EncryptedVaultEntry } from '../../src/types/auth';

// 256-bit encryption key for AES-256-GCM
// Stored in environment or derived securely from system secret
const DEFAULT_SYSTEM_SEED = 'RABA_CAVE_BAADRE_CIVIC_SECURE_VAULT_KEY_2026';
const RAW_KEY = process.env.RECOVERY_ENCRYPTION_KEY || DEFAULT_SYSTEM_SEED;
const ENCRYPTION_KEY = crypto.createHash('sha256').update(RAW_KEY).digest(); // Exactly 32 bytes

/**
 * Generate a cryptographically secure random recovery code
 * Format: RC-XXXX-XXXX-XXXX-XXXX (uppercase alphanumeric)
 */
export function generateSecureRecoveryCode(): string {
  const bytes = crypto.randomBytes(16);
  const hex = bytes.toString('hex').toUpperCase();
  const chunks = [
    hex.slice(0, 4),
    hex.slice(4, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
  ];
  return `RC-${chunks.join('-')}`;
}

/**
 * Encrypt recovery code using AES-256-GCM (Authenticated Encryption with Associated Data)
 */
export function encryptRecoveryCode(
  plaintextCode: string,
  role: 'admin' | 'super_admin'
): EncryptedVaultEntry {
  const iv = crypto.randomBytes(12); // Recommended 12 bytes for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(plaintextCode.trim(), 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  return {
    encryptedData: encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    algorithm: 'aes-256-gcm',
    createdAt: new Date().toISOString(),
    role,
  };
}

/**
 * Decrypt recovery code using AES-256-GCM
 */
export function decryptRecoveryCode(entry: EncryptedVaultEntry): string {
  const iv = Buffer.from(entry.iv, 'base64');
  const authTag = Buffer.from(entry.authTag, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(entry.encryptedData, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted.trim();
}

/**
 * Deterministic recovery code generator based on HMAC-SHA256 with the system secret key.
 * Format: RC-XXXX-XXXX-XXXX-XXXX
 * Guaranteed to generate the exact same code for the user across container restarts,
 * enabling stateless verification even when the user is logged out and Firestore
 * cannot be accessed unauthenticated.
 */
export function generateDeterministicRecoveryCode(identifier: string): string {
  const clean = identifier.trim().toLowerCase();
  const hmac = crypto.createHmac('sha256', ENCRYPTION_KEY).update(clean).digest('hex').toUpperCase();
  const chunks = [
    hmac.slice(0, 4),
    hmac.slice(4, 8),
    hmac.slice(8, 12),
    hmac.slice(12, 16),
  ];
  return `RC-${chunks.join('-')}`;
}

/**
 * Constant-time safe string comparison to prevent timing attacks
 */
export function timingSafeMatch(a: string, b: string): boolean {
  const normA = a.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const normB = b.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!normA || !normB || normA.length !== normB.length) return false;
  const bufA = Buffer.from(normA);
  const bufB = Buffer.from(normB);
  return crypto.timingSafeEqual(bufA, bufB);
}

