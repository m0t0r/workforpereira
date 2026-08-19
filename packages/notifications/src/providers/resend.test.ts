import type { EmailMessage, HttpTransport } from "../sending";
import { resendSender } from "./resend";

/**
 * The adapter takes no database handle, so ADR-0017 makes these unit tests — and it takes its
 * transport as an argument (ADR-0035), so they need no account, no verified domain and no DNS.
 *
 * **What they do not prove**, stated because ADR-0035 says it plainly: no HTTP fake has real API
 * fidelity. A green run here means the adapter classifies the responses *we believe* Resend
 * returns. Proving that belief is #103's job, against the live API.
 */

const message: EmailMessage = { to: "yeimy@example.test", subject: "Asunto", body: "Cuerpo" };

function respond(status: number, text = ""): HttpTransport {
  return () => Promise.resolve({ status, text: () => Promise.resolve(text) });
}

describe("the request the adapter shapes", () => {
  it("posts the message to Resend with the key on the Authorization header", async () => {
    const calls: Parameters<HttpTransport>[] = [];
    const transport: HttpTransport = (url, init) => {
      calls.push([url, init]);
      return Promise.resolve({ status: 200, text: () => Promise.resolve("{}") });
    };

    await resendSender(transport, { apiKey: "re_test", from: "Encuentra <no@enc.test>" })(message);

    const [url, init] = calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers["authorization"]).toBe("Bearer re_test");
    expect(init.headers["content-type"]).toBe("application/json");
  });

  it("maps the interface's `body` onto the vendor's `text`, and never leaks the other way", () => {
    let sentBody = "";
    const transport: HttpTransport = (_url, init) => {
      sentBody = init.body;
      return Promise.resolve({ status: 200, text: () => Promise.resolve("{}") });
    };

    return resendSender(transport, { apiKey: "k", from: "f" })(message).then(() => {
      expect(JSON.parse(sentBody)).toEqual({
        from: "f",
        to: ["yeimy@example.test"],
        subject: "Asunto",
        text: "Cuerpo",
      });
    });
  });
});

describe("how the adapter classifies a refusal", () => {
  const send = (transport: HttpTransport) =>
    resendSender(transport, { apiKey: "k", from: "f" })(message);

  it("calls a 200 sent", async () => {
    expect(await send(respond(200, '{"id":"x"}'))).toEqual({ status: "sent" });
  });

  /**
   * ADR-0035's central rule. A `429` is the daily cap or the per-second rate — either way every row
   * queued behind it is behind the same limit, so it may not spend an attempt.
   */
  it("calls a 429 a deferral, not a failure", async () => {
    const outcome = await send(respond(429, '{"message":"Too many requests"}'));
    expect(outcome.status).toBe("deferred");
  });

  /** The other half of the same rule: a bad address is a real failure and must spend an attempt. */
  it("calls a 422 a failure", async () => {
    const outcome = await send(respond(422, '{"message":"Invalid `to` field"}'));
    expect(outcome.status).toBe("failed");
  });

  it("calls a 5xx a failure, so an outage cannot become an infinite free pass", async () => {
    expect((await send(respond(503, "unavailable"))).status).toBe("failed");
  });

  it("calls a transport that throws a failure", async () => {
    const outcome = await send(() => Promise.reject(new Error("ECONNRESET")));
    expect(outcome).toEqual({ status: "failed", reason: expect.stringContaining("ECONNRESET") });
  });

  it("puts the provider's own words in the reason, for `last_error`", async () => {
    const outcome = await send(respond(422, "Invalid `to` field"));
    expect(outcome.status === "failed" && outcome.reason).toContain("Invalid `to` field");
  });

  it("bounds the reason, so an HTML error page cannot fill the column", async () => {
    const outcome = await send(respond(500, "x".repeat(50_000)));
    expect(outcome.status === "failed" && outcome.reason.length).toBeLessThan(600);
  });

  it("survives a body it cannot read", async () => {
    const outcome = await send(() =>
      Promise.resolve({ status: 500, text: () => Promise.reject(new Error("aborted")) }),
    );
    expect(outcome.status).toBe("failed");
  });
});
