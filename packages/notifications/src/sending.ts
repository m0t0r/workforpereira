/**
 * The provider seam (ADR-0035). **Designed against two providers and implemented for one.**
 *
 * Resend is what sends email today; AWS SES is the named exit, taken when the outbox crosses 80
 * sends in a rolling day against Resend's 100/day cap. The exit is slow — a sandbox-exit request,
 * DNS propagation, a domain verified per region — and none of that is bought down by writing a
 * second adapter now, so only one exists.
 *
 * What this file must never learn is a vendor's vocabulary. Resend's `tags`, its batch endpoint and
 * the *name* of its idempotency mechanism all have SES equivalents with different names,
 * cardinality and semantics; every one of them would have to be unlearned.
 */

/**
 * One message, in the only terms both providers share.
 *
 * **`id` extends the interface ADR-0035 sketched, deliberately.** That ADR says the interface
 * "carries the message — recipient, subject, body", and lists Resend's idempotency key among the
 * vocabulary that must not reach it. The *name* stays out; the *concept* has to come in, because
 * without it this outbox has a duplicate-send hole that no amount of care in the drain can close: a
 * send can succeed at the provider and still fail to record `sent_at` — a lost connection between
 * the API call and the commit — and the next pass then sends a second real email. A stable message
 * identity lets the provider recognise the retry and return the original result instead of sending
 * again. Both candidates have a mechanism for it; only the spelling differs, which is exactly the
 * kind of difference this interface exists to absorb.
 */
export interface EmailMessage {
  /** Stable across every retry of the same message, and unique across messages. */
  readonly id: string;
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

/**
 * What the provider did with it, in the three categories the outbox can act on.
 *
 * The **`deferred`** case is the one that is not obvious, and it is ADR-0035's central rule. A
 * documented rate-limit refusal is _not_ a failed attempt: on the 101st send of a day Resend's
 * refusal looks exactly like a bad address, so the row would burn a retry — and so would every row
 * queued behind it, because they are all behind the same daily cap. Within one day's retry budget
 * the whole batch reaches poison, including ADR-0020's deadline-monitor email, which rides this
 * outbox and is the alarm on a statutory clock.
 *
 * **Classifying belongs to the adapter, honouring it belongs to the outbox.** The adapter knows its
 * own provider's refusals; the split is what lets the rule survive the move to SES, which throttles
 * on its own terms.
 */
export type SendOutcome =
  | { readonly status: "sent" }
  | { readonly status: "deferred"; readonly reason: string }
  | { readonly status: "failed"; readonly reason: string };

/** A provider adapter, with its client already bound. */
export type EmailSender = (message: EmailMessage) => Promise<SendOutcome>;
