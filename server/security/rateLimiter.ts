export interface RateLimitRecord {
  count: number;
  firstAttemptAt: number;
  blockedUntil?: number;
  updatedAt?: string;
}

const storeCache = new Map<string, RateLimitRecord>();

/**
 * Sliding-window rate limiter (in-memory for stateless cloud containers).
 * Default maxAttempts is 6 (6 محاولات).
 */
export function checkRateLimit(
  key: string,
  maxAttempts = 6,
  windowMs = 15 * 60 * 1000,
  blockDurationMs = 30 * 60 * 1000
): { allowed: boolean; remainingAttempts: number; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = storeCache.get(key);

  if (!record) {
    const newRecord: RateLimitRecord = {
      count: 1,
      firstAttemptAt: now,
      updatedAt: new Date(now).toISOString(),
    };
    storeCache.set(key, newRecord);
    return { allowed: true, remainingAttempts: Math.max(0, maxAttempts - 1) };
  }

  if (record.blockedUntil && record.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  if (now - record.firstAttemptAt > windowMs) {
    const freshRecord: RateLimitRecord = {
      count: 1,
      firstAttemptAt: now,
      updatedAt: new Date(now).toISOString(),
    };
    storeCache.set(key, freshRecord);
    return { allowed: true, remainingAttempts: Math.max(0, maxAttempts - 1) };
  }

  record.count += 1;
  record.updatedAt = new Date(now).toISOString();

  if (record.count > maxAttempts) {
    record.blockedUntil = now + blockDurationMs;
    const retryAfterSeconds = Math.ceil(blockDurationMs / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  return { allowed: true, remainingAttempts: Math.max(0, maxAttempts - record.count) };
}

export function resetRateLimit(key: string): void {
  storeCache.delete(key);
}

export function getRateLimitStatus(key: string): RateLimitRecord | undefined {
  return storeCache.get(key);
}
