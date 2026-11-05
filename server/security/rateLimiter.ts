import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../.data');
const RATE_LIMIT_FILE = path.join(DATA_DIR, 'rate_limits.json');

export interface RateLimitRecord {
  count: number;
  firstAttemptAt: number;
  blockedUntil?: number;
  updatedAt?: string;
}

let storeCache: Map<string, RateLimitRecord> | null = null;

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {}
}

function loadPersistentStore(): Map<string, RateLimitRecord> {
  const store = new Map<string, RateLimitRecord>();
  ensureDataDir();

  try {
    if (fs.existsSync(RATE_LIMIT_FILE)) {
      const raw = fs.readFileSync(RATE_LIMIT_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      const now = Date.now();

      if (parsed && typeof parsed === 'object') {
        for (const [key, item] of Object.entries(parsed)) {
          if (item && typeof item === 'object') {
            const rec = item as RateLimitRecord;
            // Retain active blocks or attempts within 24 hours
            if (rec.blockedUntil && rec.blockedUntil > now) {
              store.set(key, rec);
            } else if (now - rec.firstAttemptAt < 24 * 60 * 60 * 1000) {
              store.set(key, rec);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[RateLimiter] Warning loading rate_limits.json:', err);
  }

  return store;
}

function savePersistentStore(store: Map<string, RateLimitRecord>): void {
  ensureDataDir();
  try {
    const obj: Record<string, RateLimitRecord> = {};
    const now = Date.now();
    for (const [key, val] of store.entries()) {
      if (val.blockedUntil && val.blockedUntil > now) {
        obj[key] = val;
      } else if (now - val.firstAttemptAt < 24 * 60 * 60 * 1000) {
        obj[key] = val;
      }
    }
    const tempFile = `${RATE_LIMIT_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(obj, null, 2), 'utf8');
    fs.renameSync(tempFile, RATE_LIMIT_FILE);
  } catch (err) {
    console.warn('[RateLimiter] Warning saving rate_limits.json:', err);
  }
}

function getStore(): Map<string, RateLimitRecord> {
  if (!storeCache) {
    storeCache = loadPersistentStore();
  }
  return storeCache;
}

/**
 * Persistent sliding-window rate limiter
 * Protects against brute-force attempts and preserves counter state across server & Cloud Run restarts.
 * Default maxAttempts is 6 (6 محاولات).
 */
export function checkRateLimit(
  key: string,
  maxAttempts = 6, // 6 محاولات افتراضياً
  windowMs = 15 * 60 * 1000, // 15 minutes
  blockDurationMs = 30 * 60 * 1000 // 30 minutes block
): { allowed: boolean; remainingAttempts: number; retryAfterSeconds?: number } {
  const store = getStore();
  const now = Date.now();
  const record = store.get(key);

  if (!record) {
    const newRecord: RateLimitRecord = {
      count: 1,
      firstAttemptAt: now,
      updatedAt: new Date(now).toISOString(),
    };
    store.set(key, newRecord);
    savePersistentStore(store);
    return { allowed: true, remainingAttempts: Math.max(0, maxAttempts - 1) };
  }

  // Check if currently blocked
  if (record.blockedUntil && record.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  // Check if window has expired
  if (now - record.firstAttemptAt > windowMs) {
    const freshRecord: RateLimitRecord = {
      count: 1,
      firstAttemptAt: now,
      updatedAt: new Date(now).toISOString(),
    };
    store.set(key, freshRecord);
    savePersistentStore(store);
    return { allowed: true, remainingAttempts: Math.max(0, maxAttempts - 1) };
  }

  // Increment within window
  record.count += 1;
  record.updatedAt = new Date(now).toISOString();

  if (record.count > maxAttempts) {
    record.blockedUntil = now + blockDurationMs;
    savePersistentStore(store);
    const retryAfterSeconds = Math.ceil(blockDurationMs / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  savePersistentStore(store);
  return { allowed: true, remainingAttempts: Math.max(0, maxAttempts - record.count) };
}

export function resetRateLimit(key: string): void {
  const store = getStore();
  if (store.has(key)) {
    store.delete(key);
    savePersistentStore(store);
  }
}

export function getRateLimitStatus(key: string): RateLimitRecord | undefined {
  const store = getStore();
  return store.get(key);
}
