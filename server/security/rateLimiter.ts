interface RateLimitRecord {
  count: number;
  firstAttemptAt: number;
  blockedUntil?: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

/**
 * In-memory sliding window rate limiter
 * Cleans up records older than windowMs
 */
export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000, // 15 minutes
  blockDurationMs = 30 * 60 * 1000 // 30 minutes block
): { allowed: boolean; remainingAttempts: number; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record) {
    memoryStore.set(key, { count: 1, firstAttemptAt: now });
    return { allowed: true, remainingAttempts: maxAttempts - 1 };
  }

  // Check if currently blocked
  if (record.blockedUntil && record.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  // Check if window has expired
  if (now - record.firstAttemptAt > windowMs) {
    memoryStore.set(key, { count: 1, firstAttemptAt: now });
    return { allowed: true, remainingAttempts: maxAttempts - 1 };
  }

  // Increment within window
  record.count += 1;
  if (record.count > maxAttempts) {
    record.blockedUntil = now + blockDurationMs;
    const retryAfterSeconds = Math.ceil(blockDurationMs / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  return { allowed: true, remainingAttempts: maxAttempts - record.count };
}

export function resetRateLimit(key: string): void {
  memoryStore.delete(key);
}
