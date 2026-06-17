type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

/**
 * Returns true if the request is allowed, false if rate-limited.
 * key     — unique identifier (e.g. IP + endpoint)
 * limit   — max requests per window
 * windowMs — window size in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}
