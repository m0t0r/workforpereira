import type { NotificationTemplate } from "@repo/db/schema";

/**
 * What the drain tells the operator, as an injected dependency.
 *
 * Sentry is the destination in production, and this module may not import it: `@repo/notifications`
 * is tier 4 of ADR-0006's DAG, the SDK is `apps/web`'s, and a module reaching for a global reporter
 * is the same mistake as a module reaching for the pool singleton. It arrives the way the transport
 * does — as an argument.
 *
 * **Neither event carries the recipient's address.** Sentry is a processor outside ADR-0034's
 * reflective reach, and a `public_id` is enough to find the row (ADR-0003 — never the `bigint`,
 * which leaks how many notifications the platform has queued).
 */

/**
 * A row that has exhausted `attempts` and will never be claimed again.
 *
 * **Reported exactly once, at the transition** — never per attempt (ADR-0028). Sentry Developer
 * allows 5,000 errors a month and a row retried every five minutes produces 8,640, so one poison
 * row reported per attempt would hide every other error in the product. Per-attempt detail lives in
 * the row's `last_error`.
 */
export interface PoisonedNotification {
  readonly publicId: string;
  readonly template: NotificationTemplate;
  readonly attempts: number;
  readonly lastError: string | null;
}

/**
 * The send volume crossed the threshold at which ADR-0035's exit to AWS SES has to start.
 *
 * **A warning, never an error**, and deliberately so: it must not compete with the once-only poison
 * report above. One a day is about 30 a month against Sentry's 5,000.
 */
export interface SendVolumeWarning {
  readonly sentInRollingDay: number;
  readonly threshold: number;
  readonly providerDailyCap: number;
}

export interface NotificationReporter {
  poisoned(event: PoisonedNotification): void;
  approachingSendLimit(event: SendVolumeWarning): void;
}

/**
 * Resend's free tier, as a number rather than a judgement call.
 *
 * The monthly figure it advertises is a distraction: the binding limit is **100 per day**, and a
 * monthly allowance absorbs a burst where a daily one does not. Past it the next plan is $20/month
 * against the $4.46–$7.46 that remains of a $25 ceiling — three to four times the entire remaining
 * budget, so the cliff is a budget crisis rather than a bill (ADR-0035).
 */
export const PROVIDER_DAILY_SEND_CAP = 100;

/**
 * **The exit is a number, not "when we scale"** (ADR-0035). Eighty is 20% headroom, and 20% rather
 * than 5% because taking the exit is slow: SES's sandbox-exit request is quoted at ~24 hours, DNS
 * propagation at up to 72, and the adapter has to be written and verified between the two. A 5%
 * margin would put the request in flight after the refusals had already started.
 */
export const SEND_LIMIT_WARNING_THRESHOLD = 80;
