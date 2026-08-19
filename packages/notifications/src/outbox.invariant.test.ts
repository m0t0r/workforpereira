/**
 * **Invariant Test — ADR-0028 and ADR-0035.** The three decisions that make this outbox survivable,
 * each of which fails *quietly* if it regresses.
 *
 * - The row has no `claimed_at` and no stored poison flag, so an interrupted drain recovers with no
 *   timeout and a poison row can never be claimed twice.
 * - Sentry hears about a failed send **exactly once**, at the transition to poison. The failure
 *   mode of a regression here is *more* reporting, which looks like nothing until one poison row's
 *   8,640 monthly errors have hidden every other error in the product.
 * - A provider rate-limit refusal spends no attempt and ends the pass. Without it a busy Tuesday
 *   walks the whole queue to poison — ADR-0020's deadline-monitor email, the alarm on a statutory
 *   clock, included.
 *
 * Never weakened without amending ADR-0028 or ADR-0035.
 */

import { notificationOutbox } from "@repo/db/schema";
import { withRollback } from "@repo/db/testing";
import { getTableColumns } from "drizzle-orm";

import { fixedClock, readOutboxRow, recordingReporter, scriptedSender } from "./fixtures";
import { drainOutbox, enqueueNotification } from "./outbox";
import { MAX_ATTEMPTS, retryDelayMs } from "./retry";
import { SEND_LIMIT_WARNING_THRESHOLD } from "./reporting";

/**
 * The instant the tests drive from. A queued row's `next_attempt_at` defaults to the **database's**
 * `now()`, so a clock injected from the past would find nothing claimable — this starts a minute
 * ahead of real time, and each test moves it forward from there.
 */
const START = new Date(Date.now() + 60_000);

describe("the row is the claim, and the row is the retry authority", () => {
  it("has exactly these columns", () => {
    // One assertion guarding two absences. `claimed_at` would reintroduce the timeout ADR-0028
    // removed — a stored claim needs a write to set it and a write to clear it, and a machine
    // killed mid-drain misses the second, stranding the row forever. `body`, `subject` or `params`
    // would reintroduce ADR-0015's Contact Details risk by giving one somewhere to sit.
    expect(Object.keys(getTableColumns(notificationOutbox)).sort()).toEqual([
      "attempts",
      "createdAt",
      "id",
      "lastError",
      "nextAttemptAt",
      "publicId",
      "recipientEmail",
      "sentAt",
      "template",
      "updatedAt",
    ]);
  });
});

describe("a row exhausting its attempts", () => {
  /**
   * The full retry sequence, walked attempt by attempt. This is the acceptance criterion #69 calls
   * the one most likely to regress silently, and the reason it is driven end to end rather than by
   * asserting on a helper: nothing about "exactly once" is observable from a single attempt.
   */
  it(
    "reports to Sentry exactly once, and not before",
    withRollback(async (tx) => {
      const { publicId } = await enqueueNotification(tx, {
        recipientEmail: "yeimy@example.test",
        template: "offer_received",
      });
      const report = recordingReporter();
      const clock = fixedClock(START);
      const send = scriptedSender({ status: "failed", reason: "resend 422 refused: bad address" });

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const result = await drainOutbox(tx, { send, report, now: clock.now });

        expect(result.failed).toBe(1);
        if (attempt < MAX_ATTEMPTS) {
          // Earlier failures report zero times. Their detail lives in `last_error`, which costs no
          // Sentry quota and outlives trigger.dev's one-day free-tier log retention.
          expect(report.poisonReports).toEqual([]);
          expect((await readOutboxRow(tx, publicId)).lastError).toContain("bad address");
        }
        clock.advance(retryDelayMs(attempt) + 1000);
      }

      expect(report.poisonReports).toEqual([
        {
          publicId,
          template: "offer_received",
          attempts: MAX_ATTEMPTS,
          lastError: "resend 422 refused: bad address",
        },
      ]);

      // And the row is now beyond the claim query's reach, which is *why* it cannot be reported
      // twice — the guarantee is structural, not a flag anyone has to remember to check.
      const after = await drainOutbox(tx, { send, report, now: clock.now });
      expect(after).toMatchObject({ sent: 0, failed: 0, hasMore: false });
      expect(report.poisonReports).toHaveLength(1);
    }),
  );

  it(
    "never carries the recipient's address into the report",
    withRollback(async (tx) => {
      await enqueueNotification(tx, {
        recipientEmail: "yeimy@example.test",
        template: "offer_received",
      });
      const report = recordingReporter();
      const clock = fixedClock(START);
      const send = scriptedSender({ status: "failed", reason: "refused" });

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        await drainOutbox(tx, { send, report, now: clock.now });
        clock.advance(retryDelayMs(attempt) + 1000);
      }

      // Sentry is a processor outside ADR-0034's reflective reach; the `public_id` is enough to
      // find the row (ADR-0003 — and never the `bigint`, which leaks the platform's send volume).
      expect(JSON.stringify(report.poisonReports)).not.toContain("yeimy@example.test");
    }),
  );
});

describe("a provider rate-limit refusal", () => {
  it(
    "leaves attempts unchanged and the row exactly as it was found",
    withRollback(async (tx) => {
      const { publicId } = await enqueueNotification(tx, {
        recipientEmail: "a@example.test",
        template: "offer_received",
      });
      const before = await readOutboxRow(tx, publicId);

      const result = await drainOutbox(tx, {
        send: scriptedSender({ status: "deferred", reason: "resend 429 rate limited" }),
        report: recordingReporter(),
        now: fixedClock(START).now,
      });

      expect(result).toMatchObject({ sent: 0, failed: 0, poisoned: 0, deferred: true });

      const after = await readOutboxRow(tx, publicId);
      expect(after.attempts).toBe(before.attempts);
      expect(after.lastError).toBeNull();
      expect(after.sentAt).toBeNull();
      expect(after.nextAttemptAt).toEqual(before.nextAttemptAt);
    }),
  );

  it(
    "ends the pass rather than trying the next row",
    withRollback(async (tx) => {
      for (const to of ["a@example.test", "b@example.test", "c@example.test"]) {
        await enqueueNotification(tx, { recipientEmail: to, template: "offer_received" });
      }
      const send = scriptedSender({ status: "deferred", reason: "resend 429 rate limited" });

      const result = await drainOutbox(tx, {
        send,
        report: recordingReporter(),
        now: fixedClock(START).now,
      });

      // Every queued row is behind the same daily cap, so continuing would convert one refusal into
      // a spin against the provider. The five-minute sweep is what tries again.
      expect(send.sent).toHaveLength(1);
      expect(result).toMatchObject({ deferred: true, hasMore: true });
    }),
  );

  /**
   * The deferral's shape is the dangerous one: an exception unwinds the claiming transaction
   * exactly as a deferral does, restoring the row with `attempts` untouched. A deferral is bounded
   * by the pass ending; a throw would not be, so the drain would reclaim the same row forever and
   * spend nothing. **Only a documented rate-limit refusal is free.**
   */
  it(
    "is the only free pass — a sender that throws still spends an attempt",
    withRollback(async (tx) => {
      const { publicId } = await enqueueNotification(tx, {
        recipientEmail: "a@example.test",
        template: "offer_received",
      });

      const result = await drainOutbox(tx, {
        send: () => Promise.reject(new Error("adapter is broken")),
        report: recordingReporter(),
        now: fixedClock(START).now,
      });

      expect(result).toMatchObject({ sent: 0, failed: 1, deferred: false });

      const row = await readOutboxRow(tx, publicId);
      expect(row.attempts).toBe(1);
      expect(row.lastError).toContain("adapter is broken");
    }),
  );

  it(
    "does not stop a row that fails for a real reason from spending its attempt",
    withRollback(async (tx) => {
      const { publicId } = await enqueueNotification(tx, {
        recipientEmail: "a@example.test",
        template: "offer_received",
      });

      await drainOutbox(tx, {
        send: scriptedSender({ status: "failed", reason: "resend 422 refused" }),
        report: recordingReporter(),
        now: fixedClock(START).now,
      });

      expect((await readOutboxRow(tx, publicId)).attempts).toBe(1);
    }),
  );
});

describe("the exit to SES is a number", () => {
  /** Seeds rows already sent inside the rolling window, so the crossing can be driven exactly. */
  async function seedSent(tx: Parameters<Parameters<typeof withRollback>[0]>[0], howMany: number) {
    if (howMany === 0) return;
    await tx.insert(notificationOutbox).values(
      Array.from({ length: howMany }, (_, i) => ({
        recipientEmail: `sent-${i}@example.test`,
        template: "offer_received" as const,
        sentAt: new Date(START.getTime() - 60 * 60 * 1000),
      })),
    );
  }

  it(
    "warns once when a send crosses the threshold, and stays quiet after",
    withRollback(async (tx) => {
      await seedSent(tx, SEND_LIMIT_WARNING_THRESHOLD - 1);
      await enqueueNotification(tx, {
        recipientEmail: "a@example.test",
        template: "offer_received",
      });
      await enqueueNotification(tx, {
        recipientEmail: "b@example.test",
        template: "offer_received",
      });
      const report = recordingReporter();

      await drainOutbox(tx, {
        send: scriptedSender({ status: "sent" }),
        report,
        now: fixedClock(START).now,
      });

      // The 80th send warns; the 81st does not. Nothing is stored, so nothing has to be reset when
      // the rolling day rolls on — only the send that *crosses* sees equality.
      expect(report.limitWarnings).toEqual([
        {
          sentInRollingDay: SEND_LIMIT_WARNING_THRESHOLD,
          threshold: SEND_LIMIT_WARNING_THRESHOLD,
          providerDailyCap: 100,
        },
      ]);
      // A warning, never an error: it must not compete with the once-only poison report.
      expect(report.poisonReports).toEqual([]);
    }),
  );

  it(
    "stays quiet below the threshold",
    withRollback(async (tx) => {
      await seedSent(tx, SEND_LIMIT_WARNING_THRESHOLD - 2);
      await enqueueNotification(tx, {
        recipientEmail: "a@example.test",
        template: "offer_received",
      });
      const report = recordingReporter();

      await drainOutbox(tx, {
        send: scriptedSender({ status: "sent" }),
        report,
        now: fixedClock(START).now,
      });

      expect(report.limitWarnings).toEqual([]);
    }),
  );

  it(
    "counts a rolling day, not a calendar one",
    withRollback(async (tx) => {
      // One send more than the threshold, but a day and a half ago — outside the window, so the
      // crossing below is driven by the recent ones alone.
      await tx.insert(notificationOutbox).values(
        Array.from({ length: 5 }, (_, i) => ({
          recipientEmail: `old-${i}@example.test`,
          template: "offer_received" as const,
          sentAt: new Date(START.getTime() - 36 * 60 * 60 * 1000),
        })),
      );
      await seedSent(tx, SEND_LIMIT_WARNING_THRESHOLD - 2);
      await enqueueNotification(tx, {
        recipientEmail: "a@example.test",
        template: "offer_received",
      });
      const report = recordingReporter();

      await drainOutbox(tx, {
        send: scriptedSender({ status: "sent" }),
        report,
        now: fixedClock(START).now,
      });

      expect(report.limitWarnings).toEqual([]);
    }),
  );
});
