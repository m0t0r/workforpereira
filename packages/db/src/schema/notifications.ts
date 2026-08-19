import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { id, publicId, timestamps } from "../columns";

/**
 * Every message this platform can send, as a closed vocabulary (ADR-0008: `text({ enum })` plus an
 * explicit `check()`, never `pgEnum`; the `as const` literal lives in `@repo/db` beside its table,
 * because tier 0 cannot import from the module that owns the domain type).
 *
 * The five values are ADR-0015's five terminal ends of an Offer. They are the whole list on
 * purpose — see the note on the missing body column below.
 */
export const NOTIFICATION_TEMPLATES = [
  "offer_received",
  "offer_accepted",
  "offer_declined",
  "offer_withdrawn",
  "offer_expired",
] as const;

export type NotificationTemplate = (typeof NOTIFICATION_TEMPLATES)[number];

/**
 * The `CHECK` list, **derived from the array above rather than retyped under it.**
 *
 * ADR-0008's worked example writes the values out twice, and the second copy is the one that rots:
 * adding a sixth template would type-check everywhere, pass every test — nothing ties
 * `NOTIFICATION_MESSAGES` to the constraint — and then fail at runtime with a check violation
 * inside whatever business transaction called `enqueueNotification`. Deriving it means adding a
 * template changes the generated SQL, and `pnpm db:check`'s drift rule fails the pull request that
 * forgot to generate the migration.
 *
 * `sql.raw` is safe here and only here: every value is a compile-time literal from an `as const`,
 * so there is no input to inject. A check constraint has to reach drizzle-kit as literal SQL —
 * bound parameters would render as `$1` in the migration.
 */
const TEMPLATE_CHECK_LIST = NOTIFICATION_TEMPLATES.map((template) => `'${template}'`).join(", ");

/**
 * The outbox. **An email leaves the platform because a row exists here, not because a function was
 * called** — ADR-0015 writes the row inside the transaction that caused it, so a rollback takes the
 * notification with it and a crash after commit still sends.
 *
 * Singular where ADR-0008 says plural, and the departure is deliberate rather than missed: this
 * table *is* one outbox and a row is one message in it, and ADR-0028 already wrote the name into
 * its claim query. Renaming would leave that ADR's example SQL naming a table that does not exist.
 *
 * **There is no `claimed_at` column** (ADR-0028). The claim is `FOR UPDATE SKIP LOCKED` inside the
 * sending transaction, so a machine killed mid-drain releases its locks on disconnect and the row
 * is claimable again with no timeout to tune. A stored claim would need a write to set it and a
 * write to clear it, and the one that goes missing strands the row permanently.
 *
 * **There is no `is_poison` column either.** Poison is derived — `sent_at IS NULL AND attempts >=
 * MAX_ATTEMPTS` — which is what makes ADR-0028's "Sentry is told exactly once" true by
 * construction rather than by remembering: the attempt that crosses the bound is the last one the
 * claim query can ever return.
 */
export const notificationOutbox = pgTable(
  "notification_outbox",
  {
    id: id(),

    /**
     * ADR-0003: the identifier anything outside the database uses. This row is addressed from
     * outside twice — a Sentry report at the transition to poison, and ADR-0028's `tasks.trigger()`
     * fast path, whose payload may hold an outbox row id and nothing else. Neither may carry the
     * `bigint`, which leaks how many notifications this platform has ever queued.
     */
    publicId: publicId(),

    /**
     * Where the message goes. Personal data, and the reason this table's lifecycle is
     * `with-person`.
     *
     * **Unindexed, deliberately, and this is the column ADR-0021's erasure has to reach these rows
     * by** — there is no `person_id` here, because `persons` does not exist yet. An index is not
     * added now because the column is not the long-term path: when `persons` lands this table
     * should gain a `personRef()` and erasure should go through it, at which point ADR-0008's
     * "every foreign key column is indexed" applies and an index on the address would be pure
     * write overhead. Until then a scan over a table the retention purge keeps to about a month of
     * rows is the accepted cost.
     */
    recipientEmail: text().notNull(),

    /**
     * Which message. **The row carries no subject and no body**, and that absence is ADR-0015's
     * "no Contact Details in any notification" made structural: a template takes no parameters, so
     * there is no slot a phone number could occupy and nothing for a caller to interpolate. Adding
     * a `body` column, or a `params` column, breaks `templates.invariant.test.ts` in
     * `@repo/notifications` and needs ADR-0015 amended first.
     */
    template: text({ enum: NOTIFICATION_TEMPLATES }).notNull(),

    /**
     * ADR-0028: **the only retry authority.** trigger.dev's own retry is off for this job, because
     * two counters for one send is two sources of truth.
     *
     * ADR-0035 narrows what counts: a documented provider rate-limit refusal is a *deferral* and
     * leaves this untouched, because every row queued behind it is behind the same daily cap.
     */
    attempts: integer().notNull().default(0),

    /** Not before this instant. Pushed forward by the backoff after each failed attempt. */
    nextAttemptAt: timestamp({ withTimezone: true }).notNull().defaultNow(),

    /** Null until the provider has accepted the message. Null is *not yet sent*. */
    sentAt: timestamp({ withTimezone: true }),

    /**
     * The most recent failure, in the provider's own words. Null means no attempt has failed.
     *
     * ADR-0028: per-attempt detail lives here rather than in Sentry, because a row retried every
     * five minutes would produce 8,640 errors a month against a 5,000 quota — one poison row
     * hiding every other error in the product. Our own column costs no quota and outlives
     * trigger.dev's one-day free-tier log retention.
     */
    lastError: text(),

    ...timestamps(),
  },
  (t) => [
    check(
      "notification_outbox_template_check",
      sql`${t.template} in (${sql.raw(TEMPLATE_CHECK_LIST)})`,
    ),
    check("notification_outbox_attempts_check", sql`${t.attempts} >= 0`),

    /**
     * The claim query, in index form: pending rows in FIFO order.
     *
     * **Keyed on `(created_at, id)` rather than on `next_attempt_at`**, which is the column the
     * claim filters by, and that is the point. ADR-0028 orders the claim `created_at` first, and
     * `next_attempt_at <= now()` is a *range* predicate — leading with it would leave Postgres
     * unable to use the index for the ordering, so every claim would scan all due rows and sort
     * them. Leading with the sort key instead walks the index in the order the query wants and
     * stops at the first row that is due.
     *
     * `id` is the tiebreaker, and it is not decorative: `created_at` defaults to Postgres `now()`,
     * which is the **transaction** timestamp, so every row queued inside one transaction — both
     * sides of an accepted Offer, say — carries the identical value and FIFO between them would
     * otherwise be whatever the plan happened to do.
     *
     * Partial on `sent_at IS NULL` alone. `attempts < MAX_ATTEMPTS` is the other half of the claim
     * predicate and is deliberately *not* here — the bound is a constant in `@repo/notifications`,
     * and baking it into an index predicate would make tuning it a destructive migration.
     */
    index("notification_outbox_created_at_id_idx")
      .on(t.createdAt, t.id)
      .where(sql`${t.sentAt} is null`),

    /** ADR-0035's rolling-day count, which every successful send runs. */
    index("notification_outbox_sent_at_idx").on(t.sentAt),
  ],
);
