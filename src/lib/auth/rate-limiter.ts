interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const loginAttempts = new Map<string, RateLimitRecord>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000; // 1 minute

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetInSeconds: number;
  message?: string;
}

/**
 * In-memory sliding window rate limiter for login attempts.
 */
export function checkLoginRateLimit(identifier: string): RateLimitResult {
  const now = Date.now();
  const record = loginAttempts.get(identifier);

  if (!record || now > record.resetAt) {
    loginAttempts.set(identifier, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS - 1,
      resetInSeconds: Math.ceil(WINDOW_MS / 1000),
    };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const resetInSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return {
      allowed: false,
      remainingAttempts: 0,
      resetInSeconds,
      message: `Too many login attempts. For security, please wait ${resetInSeconds} second(s) before trying again.`,
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - record.count,
    resetInSeconds: Math.ceil((record.resetAt - now) / 1000),
  };
}

export function resetLoginRateLimit(identifier: string): void {
  loginAttempts.delete(identifier);
}

