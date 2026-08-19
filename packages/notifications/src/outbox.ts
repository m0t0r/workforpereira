import type { Db, Tx } from "@repo/db";
import { notificationOutbox, type NotificationTemplate } from "@repo/db/schema";
import { and, asc, count, eq, gte, isNull, lt, lte } from "drizzle-orm";

import {
  SEND_LIMIT_WARNING_THRESHOLD,
  PROVIDER_DAILY_SEND_CAP,
  type NotificationReporter,
} from "./reporting";
import { isPoison, MAX_ATTEMPTS, nextAttemptAfter } from "./retry";
import type { EmailMessage, EmailSender, SendOutcome } from "./sending";
import { renderNotification } from "./templates";

/**
 * The outbox: **an email leaves this platform because a row exists, not because a function was
 * called.**
 *
 * ADR-0015 puts the row inside the transaction that caused it, so a rollback takes the notification
 * with it and a crash after commit still sends. ADR-0028 makes the row the only retry authority and
 * refuses it a `claimed_at` column. ADR-0035 adds the one rule that makes a free tier survivable: a
 * rate-limit refusal is a deferral, not an attempt.
 */

/**
 * The row as anything outside this module sees it — **without the `bigint` primary key**, so
 * ADR-0003's "nothing outside the database uses it" is a compile error rather than a review note.
 *
 * `docs/module-package-recipe.md` derives this with `drizzle-zod`. A plain `Omit` is used instead
 * and the departure is deliberate: the recipe's stated purpose is exactly the compile error above,
 * which this delivers, and the runtime half of `drizzle-zod` earns its dependency at the first
 * adapter that parses untrusted input — which this ticket does not ship. The first one that does
 * should add it and rewrite this line.
 */
export type QueuedNotification = Omit<typeof notificationOutbox.$inferSelect, "id">;

export interface EnqueueNotificationInput {
  readonly recipientEmail: string;
  /** Which message. There is no body to pass — see `templates.ts`. */
  readonly template: NotificationTemplate;
}

/**
 * Queue a notification. **Call this inside the transaction that caused it** — that is the whole
 * point of the row, and why this takes the handle rather than reaching for the pool singleton.
 *
 * **Named gap: the consent gate is not enforced here yet.** ADR-0006 charges this module with
 * enforcing it itself, and the send is what a `transactional_messages` consent covers. Neither
 * `@repo/consent` nor `persons` exists, so there is nothing to ask; the check belongs in this
 * function and lands with that package. Until then the caller is the only thing standing between a
 * withdrawn consent and a send.
 */
export async function enqueueNotification(
  db: Db | Tx,
  input: EnqueueNotificationInput,
): Promise<QueuedNotification> {
  const [row] = await db
    .insert(notificationOutbox)
    .values({ recipientEmail: input.recipientEmail, template: input.template })
    .returning();

  // `returning()` on a single-row insert yields exactly one row; the check is for
  // `noUncheckedIndexedAccess` rather than for a case that happens.
  if (!row) throw new Error("notification_outbox insert returned no row");

  const { id: _internalId, ...queued } = row;
  return queued;
}

export interface DrainOptions {
  /** The provider adapter, with its transport already bound (ADR-0035). */
  readonly send: EmailSender;
  /** Where a poison row and an approaching send limit are announced. */
  readonly report: NotificationReporter;
  /** Injected so a test can drive the rolling-day window and the backoff. */
  readonly now?: () => Date;
  /**
   * The bound on one pass. ADR-0028 requires the callback to do **bounded work per invocation and
   * report whether more remains**, so a busy outbox cannot outlive an HTTP timeout.
   */
  readonly batchSize?: number;
}

export interface DrainResult {
  readonly sent: number;
  /** Attempts that spent a retry, poison included. */
  readonly failed: number;
  /** Rows that crossed `MAX_ATTEMPTS` in this pass, and were reported once each. */
  readonly poisoned: number;
  /** The pass ended early on a provider rate-limit refusal (ADR-0035). */
  readonly deferred: boolean;
  /** ADR-0028: whether the caller should come back before the next sweep. */
  readonly hasMore: boolean;
}

export const DEFAULT_BATCH_SIZE = 20;

/**
 * Drain the outbox, one row at a time, until the batch is spent or there is nothing due.
 *
 * **One row per transaction, not ADR-0028's `LIMIT 20`, and the reason is ADR-0035's deferral
 * rule.** That ADR arrived after ADR-0028 and requires a rate-limit refusal to leave the row
 * exactly as it was found, which the row lock already does for free — rolling back is the same
 * recovery path a killed machine takes. But rolling back a transaction that had already sent
 * nineteen other messages would also un-write their `sent_at`, and the next pass would send all
 * nineteen again. Claiming one row at a time keeps ADR-0028's claim exactly as written (the lock
 * *is* the claim, held inside the sending transaction, with no `claimed_at` and no timeout to
 * tune), keeps its bound on the pass, and shortens rather than lengthens how long a provider call
 * holds a lock.
 *
 * **A deferral ends the pass rather than moving to the next row** (ADR-0035). Every queued row is
 * behind the same daily cap, so continuing converts one refusal into a spin against the provider.
 * The five-minute sweep is what tries again.
 */
export async function drainOutbox(db: Db | Tx, options: DrainOptions): Promise<DrainResult> {
  const now = options.now ?? (() => new Date());
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;

  let sent = 0;
  let failed = 0;
  let poisoned = 0;

  for (let i = 0; i < batchSize; i++) {
    const pass = await sendOneClaimedRow(db, options.send, now);

    if (pass.kind === "empty") {
      return { sent, failed, poisoned, deferred: false, hasMore: false };
    }

    if (pass.kind === "deferred") {
      return { sent, failed, poisoned, deferred: true, hasMore: true };
    }

    // Reporting happens **after** the transaction commits, never inside it: a report is not
    // transactional, and a rollback would leave Sentry holding an event about something that never
    // happened.
    if (pass.kind === "sent") {
      sent++;
      // Exactly-once by arithmetic. The count is taken inside the sending transaction, so it
      // includes the row just sent, and only the send that *crosses* the threshold sees equality.
      // Nothing is stored, so nothing has to be reset when the rolling day rolls on.
      if (pass.sentInRollingDay === SEND_LIMIT_WARNING_THRESHOLD) {
        options.report.approachingSendLimit({
          sentInRollingDay: pass.sentInRollingDay,
          threshold: SEND_LIMIT_WARNING_THRESHOLD,
          providerDailyCap: PROVIDER_DAILY_SEND_CAP,
        });
      }
      continue;
    }

    failed++;
    if (pass.kind === "poisoned") {
      poisoned++;
      options.report.poisoned({
        publicId: pass.publicId,
        template: pass.template,
        attempts: pass.attempts,
        lastError: pass.lastError,
      });
    }
  }

  return { sent, failed, poisoned, deferred: false, hasMore: await hasClaimableRow(db, now()) };
}

type PassOutcome =
  | { kind: "empty" }
  | { kind: "deferred" }
  | { kind: "sent"; sentInRollingDay: number }
  | { kind: "failed" }
  | {
      kind: "poisoned";
      publicId: string;
      template: NotificationTemplate;
      attempts: number;
      lastError: string;
    };

/** Thrown to roll a deferral back to exactly the state it found. Never escapes this module. */
class Deferral extends Error {}

/**
 * Calls the sender, and treats a **thrown** error as a failure rather than letting it escape.
 *
 * This is the one place the deferral's shape is dangerous. An exception unwinds the claiming
 * transaction exactly as a deferral does — restoring the row with its `attempts` untouched — but a
 * deferral is *bounded* by the pass ending and a throw would not be: the drain would claim the same
 * row on the next sweep, forever, spending nothing. **Only a documented provider rate-limit refusal
 * is free** (ADR-0035); a broken adapter, a bug in a caller's sender, anything else, spends an
 * attempt and lands in `last_error` like any other failure.
 *
 * `resendSender` already catches its own transport errors, so in production this is a backstop
 * rather than a path. It exists because the sender is an injected parameter and its contract cannot
 * be enforced at the type level.
 */
async function attempt(send: EmailSender, message: EmailMessage): Promise<SendOutcome> {
  try {
    return await send(message);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { status: "failed", reason: `sender threw: ${reason}` };
  }
}

async function sendOneClaimedRow(
  db: Db | Tx,
  send: EmailSender,
  now: () => Date,
): Promise<PassOutcome> {
  try {
    return await db.transaction(async (tx): Promise<PassOutcome> => {
      const at = now();

      // ADR-0028's claim, one row at a time. `SKIP LOCKED` is required regardless of topology,
      // because the `tasks.trigger()` fast path and the five-minute sweep race **by design**, and
      // because a blue-green deploy briefly runs two app processes.
      const [row] = await tx
        .select()
        .from(notificationOutbox)
        .where(claimable(at))
        .orderBy(asc(notificationOutbox.createdAt))
        .limit(1)
        .for("update", { skipLocked: true });

      if (!row) return { kind: "empty" };

      const outcome = await attempt(send, {
        to: row.recipientEmail,
        ...renderNotification(row.template),
      });

      if (outcome.status === "deferred") {
        // ADR-0035: not an attempt. Unwinding restores the row untouched and drops the lock, which
        // needs no new state because it is already the recovery path for a killed machine.
        throw new Deferral(outcome.reason);
      }

      if (outcome.status === "sent") {
        await tx
          .update(notificationOutbox)
          .set({ sentAt: at, lastError: null })
          .where(eq(notificationOutbox.id, row.id));

        return { kind: "sent", sentInRollingDay: await countSentInRollingDay(tx, at) };
      }

      const attempts = row.attempts + 1;
      await tx
        .update(notificationOutbox)
        .set({ attempts, lastError: outcome.reason, nextAttemptAt: nextAttemptAfter(at, attempts) })
        .where(eq(notificationOutbox.id, row.id));

      if (!isPoison(attempts)) return { kind: "failed" };

      return {
        kind: "poisoned",
        publicId: row.publicId,
        template: row.template,
        attempts,
        lastError: outcome.reason,
      };
    });
  } catch (error) {
    if (error instanceof Deferral) return { kind: "deferred" };
    throw error;
  }
}

/**
 * Pending, due, and not yet poison.
 *
 * The third clause is what makes ADR-0028's once-only Sentry report structural: a row at
 * `MAX_ATTEMPTS` can never be claimed again, so it can never be reported twice.
 */
function claimable(at: Date) {
  return and(
    isNull(notificationOutbox.sentAt),
    lt(notificationOutbox.attempts, MAX_ATTEMPTS),
    lte(notificationOutbox.nextAttemptAt, at),
  );
}

async function hasClaimableRow(db: Db | Tx, at: Date): Promise<boolean> {
  const rows = await db
    .select({ publicId: notificationOutbox.publicId })
    .from(notificationOutbox)
    .where(claimable(at))
    .limit(1);
  return rows.length > 0;
}

const ROLLING_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Sends in the last 24 hours — a **rolling** day rather than a calendar one, because Resend's cap
 * is what it is regardless of where midnight falls.
 */
async function countSentInRollingDay(tx: Tx, at: Date): Promise<number> {
  const [row] = await tx
    .select({ sends: count() })
    .from(notificationOutbox)
    .where(gte(notificationOutbox.sentAt, new Date(at.getTime() - ROLLING_DAY_MS)));
  return row?.sends ?? 0;
}
