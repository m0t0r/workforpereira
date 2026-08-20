import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * `HMAC-SHA256(secret, lowercase(trim(email)))` — the anchor a `consents` row keeps after its
 * Titular has been erased (ADR-0021).
 *
 * **Keyed rather than a plain digest.** `docs/research/moderation-record.md` argued for an HMAC
 * because a plain SHA of a _cédula_ is brute-forceable; ADR-0021 kept the argument and corrected its
 * input, since this platform never collects a _cédula_ — signup is a name, a date of birth and a
 * credential. An email is a small enough space that a bare digest is a lookup table, so the key is
 * what makes the surviving row unlinkable to anyone who does not hold it.
 *
 * **The key can never be rotated.** Re-hashing needs plaintext we no longer hold. One long-lived
 * secret in Fly secrets, and losing it makes every surviving proof unverifiable — the same class of
 * problem as a backup that restores the database without the extensions.
 *
 * **The secret is a parameter, never read from the environment here.** ADR-0006 keeps a module free
 * of ambient configuration for the same reason it keeps the pool singleton out: a function that
 * reaches for `process.env` cannot be tested at the seam ADR-0017 allows, and this one has to be.
 */

/**
 * Below this a "secret" is decoration. Not a cryptographic threshold — HMAC-SHA256 tolerates a short
 * key — but a guard against the failure that actually happens: a placeholder committed to `.env`,
 * shipped, and only noticed when the evidence it was supposed to protect is needed.
 */
const MINIMUM_SECRET_LENGTH = 32;

/**
 * The configured secret is too short to be one.
 *
 * It can never be rotated (ADR-0021) — re-hashing would need plaintext we no longer hold — so a
 * placeholder that reaches production is not fixable later. Generate one with
 * `openssl rand -base64 48`.
 */
export class WeakSubjectKeySecretError extends Error {
  readonly code = "SUBJECT_KEY_SECRET_TOO_SHORT";

  constructor(readonly length: number) {
    super(
      `the subject-key secret must be at least ${String(MINIMUM_SECRET_LENGTH)} characters, got ${String(length)}`,
    );
    this.name = "WeakSubjectKeySecretError";
  }
}

/**
 * The normalisation, separated because **it is the thing that has to stay identical forever**.
 *
 * Change it and every row written before the change stops being findable by the address that wrote
 * it — silently, because the lookup simply returns nothing. Lowercasing and trimming are the two
 * safe normalisations: the local part of an address is technically case-sensitive, but no provider
 * this product will meet treats it so, and a Person typing their address into a recovery form types
 * it however their phone capitalised it.
 */
function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function subjectKey(secret: string, email: string): string {
  if (secret.length < MINIMUM_SECRET_LENGTH) throw new WeakSubjectKeySecretError(secret.length);
  return createHmac("sha256", secret).update(normaliseEmail(email)).digest("hex");
}

/**
 * Does this address produce this key?
 *
 * Constant-time, because the caller is a Titular handing us an address and asking what we hold —
 * and the comparison should not become an oracle for guessing at addresses one character at a time.
 */
export function subjectKeyMatches(secret: string, email: string, key: string): boolean {
  const expected = Buffer.from(subjectKey(secret, email), "hex");
  const actual = Buffer.from(key, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
