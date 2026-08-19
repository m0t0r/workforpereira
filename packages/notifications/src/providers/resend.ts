import type { EmailMessage, EmailSender, SendOutcome } from "../sending";

/**
 * The Resend adapter — **the only file in this repository allowed to know a vendor's vocabulary**
 * (ADR-0035). The SDK's `{ data, error }` contract, its error-code names, `idempotencyKey`: all of
 * it stops here, and the outbox above sees only `SendOutcome`.
 *
 * It goes through the **official `resend` package**, not a hand-rolled `fetch`. What that buys is
 * not tidiness — it is the two things below, both of which a hand-written HTTP call got wrong:
 *
 * - **The SDK does not throw.** It returns `{ data, error }`. Code written around a rejected
 *   promise silently treats every refusal as a success.
 * - **The refusals are named, not inferred from a status code.** `daily_quota_exceeded` is
 *   precisely the case ADR-0035 wrote the deferral rule for, and it arrives as a typed literal
 *   rather than as an assumption about which status Resend attaches to a spent quota.
 *
 * The client is injected, so everything below is exercisable with no account, no verified domain
 * and no DNS — ADR-0035's "the dependency is a parameter" with the parameter moved up one level,
 * from the HTTP transport to the SDK client. That keeps ADR-0017's binary intact: the adapter takes
 * no database handle, so it is a unit test, and no HTTP is faked (`emulate` and MSW stay refused).
 *
 * What it does **not** buy is fidelity. ADR-0035 records that no fake has any, so a green suite
 * here proves the outbox honours the classification, not that the classification is right. Proving
 * the second is #103's job, against the live API.
 */

/**
 * The slice of the Resend client this adapter uses.
 *
 * Structural and narrow rather than `Resend` itself, so a test can pass an object literal instead
 * of standing up the whole SDK surface — and so this module imports no value from the vendor at
 * all, only a shape.
 *
 * That a real `Resend` satisfies it is checked where a real one is constructed: `scripts/drain.ts`
 * hands `new Resend(...)` straight to `resendSender`, so an SDK upgrade that changes the shape
 * fails `check-types` rather than production.
 */
export interface ResendClient {
  readonly emails: {
    send(
      payload: {
        from: string;
        to: string[];
        subject: string;
        html: string;
        text: string;
      },
      options?: { idempotencyKey?: string },
    ): Promise<{
      data: { id: string } | null;
      error: { name: string; message: string } | null;
    }>;
  };
}

export interface ResendOptions {
  /** The verified sender, e.g. `Encuentra <no-responder@…>`. Provisioning owns the address. */
  readonly from: string;
}

/**
 * The refusals that are **deferrals**: the provider is telling us to come back later, and every row
 * queued behind this one is behind the same limit (ADR-0035). None of them spends an attempt.
 *
 * `daily_quota_exceeded` is the one the rule exists for — Resend free is 100 sends a day, and
 * ADR-0035's whole design is that hitting it must not walk the queue to poison.
 * `concurrent_idempotent_requests` is here because it means another send of *this same message* is
 * already in flight: waiting is the documented action, and burning a retry for it would punish the
 * row for our own concurrency.
 */
const DEFERRALS = new Set([
  "rate_limit_exceeded",
  "daily_quota_exceeded",
  "monthly_quota_exceeded",
  "concurrent_idempotent_requests",
]);

export function resendSender(client: ResendClient, options: ResendOptions): EmailSender {
  return async (message: EmailMessage): Promise<SendOutcome> => {
    let result;
    try {
      result = await client.emails.send(
        {
          from: options.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        },
        // The message's own identity, spelled the way this vendor spells it. Resend holds the key
        // for 24 hours and answers a repeat with the original result rather than sending again —
        // which is what closes the gap between "the provider accepted it" and "we wrote `sent_at`".
        // A row poisons in well under 24 hours, so every retry of a given message is covered.
        { idempotencyKey: message.id },
      );
    } catch (error) {
      // The SDK reports API refusals through `error`, so a *thrown* exception is the transport
      // underneath it — DNS, TLS, a socket closed mid-flight. Not a refusal, so not a deferral:
      // nothing suggests the provider would refuse the next row too.
      return { status: "failed", reason: describeError(error) };
    }

    if (result.error) {
      const reason = `resend ${result.error.name}: ${result.error.message}`.slice(0, 500);
      return DEFERRALS.has(result.error.name)
        ? { status: "deferred", reason }
        : { status: "failed", reason };
    }

    return { status: "sent" };
  };
}

// `describeError` rather than `describe` — this package sets `globals: true`, so a bare `describe`
// at module scope shadows Vitest's own.
function describeError(error: unknown): string {
  return error instanceof Error
    ? `resend transport error: ${error.message}`.slice(0, 500)
    : "resend transport error";
}
