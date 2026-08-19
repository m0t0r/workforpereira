/**
 * The provider seam (ADR-0035). **Designed against two providers and implemented for one.**
 *
 * Resend is what sends email today; AWS SES is the named exit, taken when the outbox crosses 80
 * sends in a rolling day against Resend's 100/day cap. The exit is slow — a sandbox-exit request,
 * DNS propagation, a domain verified per region — and none of that is bought down by writing a
 * second adapter now, so only one exists.
 *
 * What this file must therefore never learn is a vendor's vocabulary. Resend's `tags`, its
 * idempotency key and its batch endpoint all have SES equivalents with different names,
 * cardinality and semantics; every one of them would have to be unlearned. **The interface carries
 * the message — recipient, subject, body — and nothing else.**
 */

/** One message, in the only terms both providers share. */
export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly body: string;
}

/**
 * What the provider did with it, in the three categories the outbox can act on.
 *
 * The **`deferred`** case is the one that is not obvious, and it is ADR-0035's central rule. A
 * documented rate-limit refusal is _not_ a failed attempt: on the 101st send of a day Resend's
 * `429` looks exactly like a bad address, so the row would burn a retry — and so would every row
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

/** A provider adapter, with its transport already bound. */
export type EmailSender = (message: EmailMessage) => Promise<SendOutcome>;

/** The subset of a `fetch` response an adapter reads. */
export interface HttpResponse {
  readonly status: number;
  text(): Promise<string>;
}

/**
 * **The transport is a parameter** (ADR-0035), not a global and not a service locator.
 *
 * That is ADR-0006's shape rather than a testing trick — every module function in this repository
 * already takes its `Db | Tx` as an argument — and it is what makes the hard acceptance criteria
 * reachable with no account, no domain and no DNS: a transport that throws drives a full retry
 * sequence, and one that answers `429` drives the deferral rule above.
 *
 * Structurally narrow rather than `typeof fetch`, so a test can pass a two-line function and
 * `globalThis.fetch` still satisfies it.
 */
export type HttpTransport = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<HttpResponse>;
