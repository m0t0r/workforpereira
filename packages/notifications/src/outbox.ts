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

  /**
   * The provider's own words for that refusal, when there was one.
   *
   * **It is here because a deferral is the one outcome nothing else records.** It spends no
   * attempt, so it never poisons; it never reaches Sentry; and ADR-0035 requires the row to be left
   * exactly as found, so it may not be written to `last_error` either. That is fine for the case
   * the rule was designed around — a busy day, cleared by tomorrow — and not fine for a *sticky*
   * `429`: a month's quota gone, a flagged account, a suspended sending domain. Then the outbox
   * stalls indefinitely, **ADR-0020's deadline-monitor email never leaves**, and the Healthchecks
   * ping still says the job ran, because it did.
   *
   * So the reason comes back to the caller, whose job it is to log it. **Escalating a run of
   * deferrals is not solved here and is not solvable here**: it needs state across passes, and the
   * thing that has that is ADR-0028's scheduled callback. Named for the scheduler ticket rather
   * than left to be discovered.
   */
  readonly deferredReason?: string;
  /**
   * ADR-0028: whether the caller should come back before the next sweep.
   *
   * "Is there work due **now**", not "is the outbox empty". A row waiting out its backoff is owed a
   * send and does not count; neither does one another drain holds a lock on, which `SKIP LOCKED`
   * hides on purpose.
   */
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
 *
 * **Pass the `Db`, not a `Tx`.** The union is here because ADR-0006 gives every module function the
 * same signature and because ADR-0017's harness hands tests a `Tx` — it is not an invitation. Given
 * a `Tx`, each send's `db.transaction()` degrades to a savepoint, so `sent_at` is not durable until
 * the *outer* transaction commits: an outer rollback would un-write sends whose emails have already
 * left, and the next pass would send them again. That is the exact failure ADR-0015 wrote the
 * outbox row to prevent, one level up. The drain belongs *after* a commit, never inside one.
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
      // **`hasMore: false`, and that is the whole point of the deferral.** There *is* work — this
      // row and every row behind it — but ADR-0035 says the pass ends and the five-minute sweep is
      // what tries again, and `hasMore` is the flag the caller comes straight back on. Saying
      // `true` here would turn one refusal into exactly the spin against the provider the rule
      // exists to prevent. `deferred` is how a caller learns why the pass was short.
      return {
        sent,
        failed,
        poisoned,
        deferred: true,
        deferredReason: pass.reason,
        hasMore: false,
      };
    }

    // Reporting happens **after** the transaction commits, never inside it: a report is not
    // transactional, and a rollback would leave Sentry holding an event about something that never
    // happened.
    if (pass.kind === "sent") {
      sent++;
      const sentInRollingDay = await countSentInRollingDay(db, pass.at);
      // Once per *upward crossing*, by arithmetic: the count includes the row just committed, it
      // moves one at a time, and only the send that lands exactly on the threshold reports. Nothing
      // is stored, so nothing has to be reset when the rolling day rolls on.
      //
      // **Weaker than the poison report, and the difference is worth knowing.** That one is
      // structural — a poison row leaves the claim query forever. This one is not, and it can
      // repeat twice over: two concurrent drains can each count 79 before their own row and both
      // report; and a count that falls back under the threshold as sends age out of the rolling
      // window reports again on the way back up. Both are bounded and both are cheap — this is a
      // *warning*, budgeted by ADR-0035 at ~30/month against Sentry's 5,000, and the alternative is
      // stored state that a purge or a restore can desynchronise, for a signal whose only job is
      // "start the move to SES". Making it exact would cost more than being wrong about it does.
      if (sentInRollingDay === SEND_LIMIT_WARNING_THRESHOLD) {
        options.report.approachingSendLimit({
          sentInRollingDay,
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
  | { kind: "deferred"; reason: string }
  | { kind: "sent"; at: Date }
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
 * Strips addresses out of provider text **on its way out of this module**.
 *
 * `reporting.ts` promises, unqualified, that no event carries the recipient's address — and until
 * this existed nothing enforced it. A refusal reason is up to 500 bytes of a third party's HTTP
 * response body copied verbatim, and the refusals that survive five attempts to poison a row are
 * overwhelmingly *address* failures: a bad mailbox, a blocked recipient, an unverified domain. Those
 * are exactly the responses that quote the address back at us. So the one field in the report that
 * could carry personal data was the one most likely to.
 *
 * It matters where it does not look like it matters. Sentry is a processor sitting outside
 * ADR-0034's reflective enumeration, so an ADR-0021 erasure deletes the row and leaves the event
 * standing — personal data in a place this repository's own erasure can never reach.
 *
 * **The column is left verbatim on purpose.** ADR-0028 puts per-attempt detail in `last_error`,
 * `notification_outbox` is inside the erasure net, and an operator debugging a delivery needs the
 * provider's actual words. Redacting at the boundary rather than at the source keeps both.
 */
function withoutAddresses(text: string): string {
  return text.replace(/[^\s<>(),;:"]+@[^\s<>(),;:"]+/g, "[address]");
}

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
        // `id` is a tiebreaker, not decoration. `created_at` defaults to Postgres `now()`, which is
        // the **transaction** timestamp, so every row queued inside one transaction carries the
        // identical value — both sides of an accepted Offer, say — and FIFO between them would
        // otherwise be whatever the plan happened to do. Matches the index.
        .orderBy(asc(notificationOutbox.createdAt), asc(notificationOutbox.id))
        .limit(1)
        .for("update", { skipLocked: true });

      if (!row) return { kind: "empty" };

      const outcome = await attempt(send, {
        // The message's identity, stable across every retry of this row and unique across rows —
        // which is what lets the provider recognise a retry and not send a second real email
        // (`sending.ts`). Shaped `<event-type>/<entity-id>`, and never the `bigint`: ADR-0003 keeps
        // that inside the database, and this string reaches a third party.
        id: `${row.template}/${row.publicId}`,
        to: row.recipientEmail,
        ...(await renderNotification(row.template)),
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

        // The rolling-day count is taken **after** this commits, not here. Inside, a failed
        // `COUNT(*)` — a statement timeout, a lock wait, a connection blip — would roll back a
        // transaction whose email the provider has already accepted, un-writing `sent_at` so the
        // next pass sends it again. A telemetry query for a warning must not sit inside the window
        // where a duplicate send is the failure mode.
        return { kind: "sent", at };
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
        // Redacted here, not in the `UPDATE` above: the column keeps the provider's exact words
        // and lives inside the erasure net; the report does not.
        lastError: withoutAddresses(outcome.reason),
      };
    });
  } catch (error) {
    // Same redaction as the poison report, and for the same reason: `deferredReason` leaves the
    // module too — the drain prints it, and ADR-0028's route handler will log it.
    if (error instanceof Deferral)
      return { kind: "deferred", reason: withoutAddresses(error.message) };
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

/**
 * Is there a row this drain could claim right now?
 *
 * `SKIP LOCKED` here too, so the answer means what `hasMore` says it means: a row another drain
 * holds is not work *this* caller should come back for. Without it, a blue-green overlap or the
 * `tasks.trigger()` fast path racing the five-minute sweep would have whichever drain finished
 * first count the other's locked rows and earn an extra empty pass.
 *
 * The lock is taken and released immediately — this runs outside a transaction, so the implicit one
 * commits with the statement.
 */
async function hasClaimableRow(db: Db | Tx, at: Date): Promise<boolean> {
  const rows = await db
    .select({ publicId: notificationOutbox.publicId })
    .from(notificationOutbox)
    .where(claimable(at))
    .limit(1)
    .for("update", { skipLocked: true });
  return rows.length > 0;
}

const ROLLING_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Sends in the last 24 hours — a **rolling** day rather than a calendar one, because Resend's cap
 * is what it is regardless of where midnight falls.
 */
async function countSentInRollingDay(tx: Db | Tx, at: Date): Promise<number> {
  const [row] = await tx
    .select({ sends: count() })
    .from(notificationOutbox)
    .where(gte(notificationOutbox.sentAt, new Date(at.getTime() - ROLLING_DAY_MS)));
  return row?.sends ?? 0;
}
