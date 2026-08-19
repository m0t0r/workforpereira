/**
 * `@repo/notifications` — tier 4 of ADR-0006's DAG. Email delivery and templates.
 *
 * **This entry point is the seam.** ADR-0006's `exports` map admits exactly this file, so nothing
 * else in the package is reachable, enforced by Node resolution and TypeScript with no linter
 * involved — and ADR-0017 allows a test at a module function exported from here and nowhere else
 * inside the package.
 *
 * Three decisions are worth knowing before reading further, because each is load-bearing and none
 * is obvious from the code:
 *
 * - **The row is the truth.** An email leaves because a row exists (ADR-0015). `tasks.trigger()`
 *   after commit is latency, never the mechanism.
 * - **`attempts` is the only retry authority**, there is no `claimed_at`, and Sentry hears about a
 *   failure exactly once (ADR-0028).
 * - **A rate-limit refusal is a deferral, not an attempt**, and it ends the pass (ADR-0035).
 */

export {
  DEFAULT_BATCH_SIZE,
  drainOutbox,
  enqueueNotification,
  type DrainOptions,
  type DrainResult,
  type EnqueueNotificationInput,
  type QueuedNotification,
} from "./outbox";

export { resendSender, type ResendClient, type ResendOptions } from "./providers/resend";

// `SEND_LIMIT_WARNING_THRESHOLD` and `PROVIDER_DAILY_SEND_CAP` are deliberately **not** exported.
// They are the drain's own arithmetic, and the one consumer they could have — the Sentry reporter
// ADR-0028's scheduler ticket writes — is handed both of them in `SendVolumeWarning` as `threshold`
// and `providerDailyCap`. Exporting them as well would put a second way to learn the same number on
// a public surface ADR-0006 keeps to exactly what callers need.
export {
  type NotificationReporter,
  type PoisonedNotification,
  type SendVolumeWarning,
} from "./reporting";

export { isPoison, MAX_ATTEMPTS, nextAttemptAfter, retryDelayMs } from "./retry";

export type { EmailMessage, EmailSender, SendOutcome } from "./sending";

export {
  isTokenBearing,
  NOTIFICATION_TEMPLATE_NAMES,
  renderNotification,
  type NotificationMessage,
  type ParameterlessTemplate,
  type RenderedMessage,
} from "./templates";
