/**
 * FinMax Statement Parser — Duplicate Detector
 *
 * Uses a deterministic fingerprint (SHA-256 via Web Crypto) per row.
 * Compares against existing expense fingerprints fetched from Supabase.
 *
 * Fingerprint input: userId|isoDate|amount|title_lowercase_trimmed
 */

/**
 * Compute a SHA-256 hex digest of a string using the Web Crypto API.
 * Runs entirely in the browser — no server calls.
 */
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Build a fingerprint for a single preview row.
 * NOTE: userId is included to prevent cross-user collisions (even though
 *       each user can only see their own data via RLS, belt-and-suspenders).
 */
export async function buildFingerprint(
  userId: string,
  isoDate: string,
  amount: number,
  title: string,
): Promise<string> {
  // Truncate date to day-level (ignore time component)
  const dayDate = isoDate.slice(0, 10);
  const input = `${userId}|${dayDate}|${amount.toFixed(2)}|${title.toLowerCase().trim()}`;
  return sha256(input);
}

/**
 * Build a set of fingerprints from existing Supabase expense records.
 * This is used to check newly imported rows against what is already stored.
 */
export async function buildExistingFingerprintSet(
  userId: string,
  existingExpenses: Array<{ date: string; amount: number; title: string }>,
): Promise<Set<string>> {
  const set = new Set<string>();
  for (const exp of existingExpenses) {
    const fp = await buildFingerprint(userId, exp.date, exp.amount, exp.title);
    set.add(fp);
  }
  return set;
}
