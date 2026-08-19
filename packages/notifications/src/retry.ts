/**
 * The retry decisions, with no database handle — so ADR-0017 makes these unit tests.
 *
 * ADR-0028: **`attempts` is the only retry authority.** trigger.dev's own retry is switched off for
 * the drainer, because two counters for one send is two sources of truth — the same argument
 * ADR-0015 used refusing a `notifications` table.
 */

/**
 * How many attempts a row gets before it is poison.
 *
 * Bounded for three reasons that happen to coincide (ADR-0028): trigger.dev's $5 monthly credit,
 * whose exhaustion silently disarms the deadline monitor; Sentry Developer's 5,000 errors/month,
 * against which one row retried every five minutes is 8,640; and one operator's attention, which
 * an unbounded loop trains to ignore the channel a compliance control uses.
 *
 * The constant lives here rather than in the index predicate on `notification_outbox`, so tuning
 * it is an edit rather than a destructive migration.
 */
export const MAX_ATTEMPTS = 5;

/** The first backoff step. Rounded up in practice by the five-minute sweep. */
const FIRST_DELAY_MS = 5 * 60 * 1000;

/** Each step triples the last. Five attempts spend roughly three and a half hours. */
const BACKOFF_FACTOR = 3;

/**
 * Is a row that has recorded this many attempts beyond saving?
 *
 * **Derived, never stored.** There is no `is_poison` column for the same reason ADR-0028 refused a
 * `claimed_at` one: a stored flag needs a write to set it and a write to clear it, and the write
 * that goes missing is silent. Deriving it is also what makes "Sentry is told exactly once" true by
 * construction — the claim query excludes poison rows, so the attempt that crosses this bound is
 * the last one the drain can ever see.
 */
export function isPoison(attempts: number): boolean {
  return attempts >= MAX_ATTEMPTS;
}

/** How long to wait after a failure that leaves the row with this many attempts. */
export function retryDelayMs(attempts: number): number {
  const step = Math.max(attempts - 1, 0);
  return FIRST_DELAY_MS * BACKOFF_FACTOR ** step;
}

/** When a row that has just recorded its `attempts`th failure may be claimed again. */
export function nextAttemptAfter(now: Date, attempts: number): Date {
  return new Date(now.getTime() + retryDelayMs(attempts));
}
