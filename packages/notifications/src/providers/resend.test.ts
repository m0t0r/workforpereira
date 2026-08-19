import type { EmailMessage } from "../sending";
import { resendSender, type ResendClient } from "./resend";

/**
 * The adapter takes no database handle, so ADR-0017 makes these unit tests — and it takes its
 * client as an argument (ADR-0035's "the dependency is a parameter"), so they need no account, no
 * verified domain and no DNS. **No HTTP is faked**, which is what keeps `emulate` and MSW refused.
 *
 * **What they do not prove**, stated because ADR-0035 says it plainly: no fake has real API
 * fidelity. A green run here means the adapter classifies the outcomes *we believe* Resend returns.
 * Proving that belief is #103's job, against the live API.
 */

const message: EmailMessage = {
  id: "offer_received/01a01bb3-e69b-701f-bdb6-bc063a67a800",
  to: "yeimy@example.test",
  subject: "Asunto",
  html: "<p>Cuerpo</p>",
  text: "Cuerpo",
};

type SendCall = Parameters<ResendClient["emails"]["send"]>;

/** A client that answers the same way every time and remembers what it was asked. */
function client(answer: {
  data: { id: string } | null;
  error: { name: string; message: string } | null;
}): ResendClient & { readonly calls: SendCall[] } {
  const calls: SendCall[] = [];
  return {
    calls,
    emails: {
      send: (payload, options) => {
        calls.push([payload, options]);
        return Promise.resolve(answer);
      },
    },
  };
}

const ok = { data: { id: "re_123" }, error: null };
const refusal = (name: string, msg = "nope") => ({ data: null, error: { name, message: msg } });

describe("the request the adapter shapes", () => {
  it("sends both parts, from the configured sender, to one recipient", async () => {
    const resend = client(ok);

    await resendSender(resend, { from: "Encuentra <no@enc.test>" })(message);

    const [payload] = resend.calls[0]!;
    expect(payload).toEqual({
      from: "Encuentra <no@enc.test>",
      to: ["yeimy@example.test"],
      subject: "Asunto",
      html: "<p>Cuerpo</p>",
      text: "Cuerpo",
    });
  });

  /**
   * The message identity, spelled the vendor's way. It is what makes a retry of a send that
   * succeeded-but-was-not-recorded return the original result instead of delivering twice.
   */
  it("passes the message's identity as the idempotency key", async () => {
    const resend = client(ok);

    await resendSender(resend, { from: "f" })(message);

    expect(resend.calls[0]![1]).toEqual({ idempotencyKey: message.id });
  });

  it("keeps the key inside the provider's 256-character bound", () => {
    expect(message.id.length).toBeLessThanOrEqual(256);
  });
});

describe("how the adapter classifies an outcome", () => {
  const send = (answer: Parameters<typeof client>[0]) =>
    resendSender(client(answer), { from: "f" })(message);

  it("calls a clean response sent", async () => {
    expect(await send(ok)).toEqual({ status: "sent" });
  });

  /**
   * ADR-0035's central rule, and the case it was actually written for: Resend free is 100 sends a
   * day, and every row queued behind this one is behind the same cap, so none of them may spend an
   * attempt.
   */
  it("calls a spent daily quota a deferral, not a failure", async () => {
    const outcome = await send(refusal("daily_quota_exceeded", "You can only send 100 emails/day"));
    expect(outcome.status).toBe("deferred");
  });

  it("calls a rate limit a deferral", async () => {
    expect((await send(refusal("rate_limit_exceeded"))).status).toBe("deferred");
  });

  it("calls a spent monthly quota a deferral", async () => {
    expect((await send(refusal("monthly_quota_exceeded"))).status).toBe("deferred");
  });

  /** Another send of *this same message* is already in flight; waiting is the documented action. */
  it("calls a concurrent idempotent request a deferral", async () => {
    expect((await send(refusal("concurrent_idempotent_requests"))).status).toBe("deferred");
  });

  /** The other half of the rule: a bad address is a real failure and must spend an attempt. */
  it("calls a validation error a failure", async () => {
    const outcome = await send(refusal("validation_error", "Invalid `to` field"));
    expect(outcome.status).toBe("failed");
  });

  it("calls an unverified domain a failure, so it poisons rather than stalling forever", async () => {
    // A 403 is sticky — it will not clear on its own — so treating it as a deferral would hang the
    // outbox silently, ADR-0020's deadline-monitor email included.
    expect((await send(refusal("invalid_from_address"))).status).toBe("failed");
  });

  it("calls a server error a failure, so an outage cannot become an infinite free pass", async () => {
    expect((await send(refusal("internal_server_error"))).status).toBe("failed");
  });

  it("calls an unrecognised code a failure rather than assuming it is safe", async () => {
    expect((await send(refusal("something_new_resend_added"))).status).toBe("failed");
  });

  it("puts the provider's own words in the reason, for `last_error`", async () => {
    const outcome = await send(refusal("validation_error", "Invalid `to` field"));
    expect(outcome.status === "failed" && outcome.reason).toContain("Invalid `to` field");
    expect(outcome.status === "failed" && outcome.reason).toContain("validation_error");
  });

  it("bounds the reason, so a huge provider message cannot fill the column", async () => {
    const outcome = await send(refusal("validation_error", "x".repeat(50_000)));
    expect(outcome.status === "failed" && outcome.reason.length).toBeLessThanOrEqual(500);
  });

  /**
   * The SDK reports API refusals through `error` and does not throw, so a thrown exception is the
   * transport underneath it. Treating it as a failure is what stops a broken network from being an
   * unbounded free pass.
   */
  it("calls a client that throws a failure", async () => {
    const throwing: ResendClient = {
      emails: { send: () => Promise.reject(new Error("ECONNRESET")) },
    };
    const outcome = await resendSender(throwing, { from: "f" })(message);
    expect(outcome).toEqual({ status: "failed", reason: expect.stringContaining("ECONNRESET") });
  });
});
