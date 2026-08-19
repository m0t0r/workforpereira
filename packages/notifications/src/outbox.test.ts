import { withRollback } from "@repo/db/testing";
import { notificationOutbox } from "@repo/db/schema";
import { asc } from "drizzle-orm";

import { fixedClock, readOutboxRow, recordingReporter, scriptedSender } from "./fixtures";
import { drainOutbox, enqueueNotification } from "./outbox";
import { retryDelayMs } from "./retry";

/**
 * `drainOutbox` and `enqueueNotification` take a `Db | Tx`, so ADR-0017 makes these integration
 * tests against the real schema on PGlite. **The database is never mocked.**
 *
 * Two limits are inherent (ADR-0017): nothing here may assert on a generated `bigint` id, because
 * identity sequences do not roll back with the savepoint; and nothing concurrent is observable,
 * because PGlite is single-connection — which is why ADR-0028's `SKIP LOCKED` claim is verified by
 * hand against the docker Postgres and recorded in the pull request instead.
 */

/**
 * The instant the tests drive from. A queued row's `next_attempt_at` defaults to the **database's**
 * `now()`, so a clock injected from the past would find nothing claimable — this starts a minute
 * ahead of real time, and each test moves it forward from there.
 */
const START = new Date(Date.now() + 60_000);

describe("enqueueing a notification", () => {
  it(
    "writes a pending row that names a message and carries no body",
    withRollback(async (tx) => {
      const queued = await enqueueNotification(tx, {
        recipientEmail: "yeimy@example.test",
        template: "offer_received",
      });

      expect(queued.template).toBe("offer_received");
      expect(queued.recipientEmail).toBe("yeimy@example.test");
      expect(queued.attempts).toBe(0);
      expect(queued.sentAt).toBeNull();
      expect(queued.lastError).toBeNull();
      expect(queued.publicId).toMatch(/^[0-9a-f-]{36}$/);
    }),
  );

  it(
    "does not hand the caller the internal bigint key",
    withRollback(async (tx) => {
      const queued = await enqueueNotification(tx, {
        recipientEmail: "a@example.test",
        template: "offer_accepted",
      });

      // ADR-0003: a sequential key leaks row counts and invites enumeration, so it never crosses
      // the module boundary. `Omit<…, "id">` makes that a compile error; this is the runtime half.
      expect(Object.keys(queued)).not.toContain("id");
    }),
  );
});

describe("draining the outbox", () => {
  it(
    "sends a pending row and marks it sent",
    withRollback(async (tx) => {
      const { publicId } = await enqueueNotification(tx, {
        recipientEmail: "yeimy@example.test",
        template: "offer_received",
      });
      const send = scriptedSender({ status: "sent" });
      const clock = fixedClock(START);

      const result = await drainOutbox(tx, {
        send,
        report: recordingReporter(),
        now: clock.now,
      });

      expect(result).toMatchObject({ sent: 1, failed: 0, deferred: false, hasMore: false });
      expect(send.sent).toEqual([
        {
          to: "yeimy@example.test",
          subject: "Recibiste una propuesta en Encuentra",
          body: expect.stringContaining("Inicia sesión en Encuentra"),
        },
      ]);
      expect((await readOutboxRow(tx, publicId)).sentAt).toEqual(START);
    }),
  );

  it(
    "never claims a row it has already sent",
    withRollback(async (tx) => {
      await enqueueNotification(tx, {
        recipientEmail: "a@example.test",
        template: "offer_expired",
      });
      const clock = fixedClock(START);
      const options = { report: recordingReporter(), now: clock.now };

      await drainOutbox(tx, { ...options, send: scriptedSender({ status: "sent" }) });
      const second = scriptedSender({ status: "sent" });
      const result = await drainOutbox(tx, { ...options, send: second });

      expect(second.sent).toEqual([]);
      expect(result).toMatchObject({ sent: 0, hasMore: false });
    }),
  );

  it(
    "reports nothing to send on an empty outbox",
    withRollback(async (tx) => {
      const send = scriptedSender({ status: "sent" });
      const result = await drainOutbox(tx, { send, report: recordingReporter() });

      expect(send.sent).toEqual([]);
      expect(result).toMatchObject({ sent: 0, failed: 0, hasMore: false });
    }),
  );

  it(
    "records a failure on the row and leaves it pending",
    withRollback(async (tx) => {
      const { publicId } = await enqueueNotification(tx, {
        recipientEmail: "a@example.test",
        template: "offer_declined",
      });
      const clock = fixedClock(START);

      const result = await drainOutbox(tx, {
        send: scriptedSender({ status: "failed", reason: "resend 422 refused: bad address" }),
        report: recordingReporter(),
        now: clock.now,
      });

      expect(result).toMatchObject({ sent: 0, failed: 1, poisoned: 0 });

      const row = await readOutboxRow(tx, publicId);
      expect(row.attempts).toBe(1);
      expect(row.sentAt).toBeNull();
      expect(row.lastError).toContain("bad address");
      // ADR-0028: per-attempt detail goes in the column, and the backoff moves the row out of reach.
      expect(row.nextAttemptAt.getTime()).toBe(START.getTime() + retryDelayMs(1));
    }),
  );

  it(
    "does not claim a row whose backoff has not elapsed",
    withRollback(async (tx) => {
      await enqueueNotification(tx, {
        recipientEmail: "a@example.test",
        template: "offer_declined",
      });
      const clock = fixedClock(START);
      const options = { report: recordingReporter(), now: clock.now };

      await drainOutbox(tx, {
        ...options,
        send: scriptedSender({ status: "failed", reason: "x" }),
      });

      clock.advance(retryDelayMs(1) - 1000);
      const second = scriptedSender({ status: "sent" });
      const result = await drainOutbox(tx, { ...options, send: second });

      expect(second.sent).toEqual([]);
      // `hasMore` is "is there work due *now*", not "is the outbox empty". The row is owed a send
      // and is not due, so this pass has nothing to come back for — the five-minute sweep is what
      // picks it up once the backoff has elapsed.
      expect(result.hasMore).toBe(false);

      clock.advance(2000);
      await drainOutbox(tx, { ...options, send: second });
      expect(second.sent).toHaveLength(1);
    }),
  );

  it(
    "drains oldest first",
    withRollback(async (tx) => {
      await enqueueNotification(tx, {
        recipientEmail: "first@example.test",
        template: "offer_received",
      });
      await enqueueNotification(tx, {
        recipientEmail: "second@example.test",
        template: "offer_received",
      });
      const send = scriptedSender({ status: "sent" });

      await drainOutbox(tx, { send, report: recordingReporter(), now: fixedClock(START).now });

      expect(send.sent.map((m) => m.to)).toEqual(["first@example.test", "second@example.test"]);
    }),
  );

  it(
    "bounds the work it does in one pass and says more remains",
    withRollback(async (tx) => {
      for (const to of ["a@example.test", "b@example.test", "c@example.test"]) {
        await enqueueNotification(tx, { recipientEmail: to, template: "offer_received" });
      }
      const send = scriptedSender({ status: "sent" });

      const result = await drainOutbox(tx, {
        send,
        report: recordingReporter(),
        now: fixedClock(START).now,
        batchSize: 2,
      });

      // ADR-0028: the endpoint does bounded work per invocation and reports whether more remains,
      // so a large outbox cannot outlive an HTTP timeout.
      expect(send.sent).toHaveLength(2);
      expect(result).toMatchObject({ sent: 2, hasMore: true });

      const rows = await tx
        .select({ sentAt: notificationOutbox.sentAt })
        .from(notificationOutbox)
        .orderBy(asc(notificationOutbox.createdAt));
      expect(rows.filter((r) => r.sentAt !== null)).toHaveLength(2);
    }),
  );
});
