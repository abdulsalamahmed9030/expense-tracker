// src/lib/rate-limit.ts

/**
 * Tiny in-memory token-bucket rate limiter.
 * Keyed by userId + actionName.
 * Good enough for single-instance demo/dev. (Not distributed.)
 */

type Bucket = {
  tokens: number;
  lastRefill: number; // ms
};

const buckets = new Map<string, Bucket>();

export type RateLimitOptions = {
  capacity: number;     // max tokens
  refillPerMs: number;  // tokens added per ms (capacity per window)
};

/**
 * Consume one token from the bucket. If not enough tokens, returns retryAfterMs.
 */
export function consumeRateLimit(
  key: string,
  opts: RateLimitOptions
): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: opts.capacity, lastRefill: now };

  // Refill
  const elapsed = now - b.lastRefill;
  if (elapsed > 0) {
    const refill = elapsed * opts.refillPerMs;
    b.tokens = Math.min(opts.capacity, b.tokens + refill);
    b.lastRefill = now;
  }

  // Try to consume
  if (b.tokens >= 1) {
    b.tokens -= 1;
    buckets.set(key, b);
    return { ok: true };
  }

  // Compute wait time until 1 token available
  const deficit = 1 - b.tokens;
  const retryAfterMs = Math.ceil(deficit / opts.refillPerMs);
  buckets.set(key, b);
  return { ok: false, retryAfterMs };
}

/**
 * Helpers: presets for common patterns.
 * Example: 8 requests per minute:
 *   capacity=8, refillPerMs = 8 / 60000
 */
export const perMinute = (n: number): RateLimitOptions => ({
  capacity: n,
  refillPerMs: n / 60000,
});
