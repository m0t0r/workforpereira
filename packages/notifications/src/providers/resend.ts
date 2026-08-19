import type { EmailMessage, EmailSender, HttpTransport, SendOutcome } from "../sending";

/**
 * The Resend adapter — **the only file in this repository allowed to know a vendor's vocabulary**
 * (ADR-0035). `text` rather than `body`, `Bearer` rather than a signature, a status code rather
 * than a category: all of it stops here, and the outbox above sees only `SendOutcome`.
 *
 * The transport is injected, so everything below is exercisable with no account, no verified domain
 * and no DNS. What that does **not** buy is fidelity: ADR-0035 records that no HTTP fake has any,
 * so a green suite here proves the outbox honours the classification, not that the classification
 * is right. Proving the second is #103's job, against the live API.
 */

const ENDPOINT = "https://api.resend.com/emails";

export interface ResendOptions {
  readonly apiKey: string;
  /** The verified sender, e.g. `Encuentra <no-responder@…>`. Provisioning owns the address. */
  readonly from: string;
  readonly endpoint?: string;
}

/**
 * Resend answers `429` for both of its rate limits — the daily send cap and the per-second request
 * rate — and ADR-0035 treats either as a **deferral**: the row is left exactly as it was found, its
 * `attempts` untouched, because every row queued behind it is behind the same cap.
 *
 * Everything else is a failure that spends an attempt. That includes `5xx`: a server error may well
 * be transient, but `attempts` is the only retry authority (ADR-0028) and the backoff is what
 * retries it. Giving `5xx` the deferral's free pass would make an outage an infinite pass instead.
 */
export function resendSender(transport: HttpTransport, options: ResendOptions): EmailSender {
  const endpoint = options.endpoint ?? ENDPOINT;

  return async (message: EmailMessage): Promise<SendOutcome> => {
    let response;
    try {
      response = await transport(endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${options.apiKey}`,
          "content-type": "application/json",
        },
        // `text` is Resend's name for a plain-text body. Nothing above this line uses the word.
        body: JSON.stringify({
          from: options.from,
          to: [message.to],
          subject: message.subject,
          text: message.body,
        }),
      });
    } catch (error) {
      // A transport that throws — DNS, TLS, a socket closed mid-flight. Not a refusal, so not a
      // deferral: nothing suggests the provider would refuse the next row too.
      return { status: "failed", reason: describe(error) };
    }

    if (response.status === 429) {
      return { status: "deferred", reason: await refusal(response, "rate limited") };
    }
    if (response.status >= 200 && response.status < 300) {
      return { status: "sent" };
    }
    return { status: "failed", reason: await refusal(response, "refused") };
  };
}

/**
 * The provider's own words, for `last_error`, bounded so a stray HTML error page cannot write a
 * megabyte into a row that will be retried four more times.
 */
async function refusal(response: HttpResponseLike, label: string): Promise<string> {
  let detail: string;
  try {
    detail = (await response.text()).slice(0, 500);
  } catch {
    detail = "";
  }
  return detail
    ? `resend ${response.status} ${label}: ${detail}`
    : `resend ${response.status} ${label}`;
}

interface HttpResponseLike {
  readonly status: number;
  text(): Promise<string>;
}

function describe(error: unknown): string {
  return error instanceof Error
    ? `resend transport error: ${error.message}`
    : `resend transport error`;
}
