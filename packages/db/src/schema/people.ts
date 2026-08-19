import { sql } from "drizzle-orm";
import { bigint, check, date, pgTable, text } from "drizzle-orm/pg-core";

import { id, publicId, timestamps } from "../columns";
import { users } from "./auth";

/**
 * A **Person** — a human being with an account. The only account type: there are no company or
 * employer accounts (`CONTEXT.md`).
 *
 * This table is ADR-0002's seam. Every other domain table references `persons.id` and **never**
 * `users.id`, so the domain touches Better Auth in exactly one column — the nullable `user_id`
 * below — and deleting an authentication account stays a different operation from erasing a
 * Titular, which Ley 1581 arts. 9 and 17(b) force us to keep distinct.
 */
export const persons = pgTable(
  "persons",
  {
    id: id(),

    /** ADR-0003: a Person is addressed from outside the database constantly. */
    publicId: publicId(),

    /**
     * **The seam** (ADR-0002), and the only `SET NULL` in the schema.
     *
     * `text` rather than this repository's `bigint`, matching Better Auth's default id type,
     * because this is a *foreign identifier we store* rather than one of our keys — and it should
     * look like theirs at the one place the two systems meet (ADR-0003).
     *
     * **Null means: this Person has no authentication account.** Two states wear that null and both
     * are designed rather than accidental. During signup it is the window ADR-0007 opens on
     * purpose — our transaction writes this row and its `consents` rows *before* calling Better
     * Auth, so that a crash leaves personal data **with** its consent record (deletable, and
     * re-linkable by email on retry) rather than a `users` row with no authorisation behind it at
     * all. After a `deleteUser` it is the seam behaving as designed: the account is gone, the
     * Titular and their consent evidence are not, and erasure remains something we perform
     * deliberately rather than something a library call causes.
     *
     * `SET NULL` rather than `CASCADE` is the whole of ADR-0002 in one clause: a cascade would let
     * Better Auth reach into our data and destroy the proof of authorisation we are obliged to
     * conserve.
     *
     * Unique, because a `users` row is one human. The unique constraint is also this column's
     * index, which is why ADR-0008's "every foreign key column is indexed" needs nothing further
     * here.
     */
    userId: text()
      .unique()
      .references(() => users.id, { onDelete: "set null" }),

    /**
     * **Always authored by the person** — never taken from a provider profile (ADR-0009).
     *
     * When social login lands (#71) the same rule holds and is the reason `/signup` renders its
     * form *before* the redirect: prefilling from a Google or Facebook profile would mean holding
     * that profile pending consent, which is itself _tratamiento_. A Facebook display name is
     * frequently a nickname, and this is the string a stranger reads on an Offer.
     *
     * Justified in `docs/legal/field-justification.md`, as every column holding personal data must
     * be (ADR-0007).
     */
    fullName: text().notNull(),

    /**
     * The 18+ gate, stored rather than attested (ADR-0007).
     *
     * **`date`, not `timestamptz`**, and ADR-0008 spells out why: a birthday is not a moment in
     * time, and stored as an instant it shifts across a timezone boundary — making the age gate
     * wrong by a day for someone born near midnight. `mode: "string"` keeps it a calendar date all
     * the way to the application, with no `Date` in the middle to reintroduce an offset.
     *
     * **Never displayed, never on a public type, never a search filter**, because age is a
     * discrimination vector. The minimisation argument for an attestation checkbox instead was
     * considered twice — ADR-0007 and again in ADR-0009 — and rejected both times: it is worth
     * nothing the day a 16-year-old signs up and we have to show what we asked, and it is the same
     * _conducta inequívoca_ the SIC rejects for anything load-bearing.
     */
    dateOfBirth: date({ mode: "string" }).notNull(),

    ...timestamps(),
  },
  (t) => [
    /**
     * ADR-0008 puts a `CHECK (length(trim(col)) > 0)` on load-bearing free-text columns only. This
     * is one: a blank name is a null wearing a disguise, and the name is what identifies this
     * person to a stranger deciding whether to work with them.
     */
    check("persons_full_name_check", sql`length(trim(${t.fullName})) > 0`),
  ],
);

/**
 * ADR-0008's default reference to a Person: `NOT NULL`, `ON DELETE RESTRICT`.
 *
 * `RESTRICT` does not forbid deleting a Person; it forbids doing it **by accident**, with no line of
 * code anywhere saying that is what happens. `CASCADE` as a default would take that Person's
 * `consents` rows with them — the Ley 1581 arts. 9 / 17(b) failure ADR-0002 built the `user`/`person`
 * seam to prevent, reintroduced one foreign key further down.
 *
 * **Here rather than in `columns.ts`**, where ADR-0008 and the module recipe both put it, because
 * that file is imported by every table and importing `persons` back into it makes a cycle that
 * drizzle-kit's bundler cannot evaluate. `columns.ts` carries the finding.
 *
 * **Not every reference to `persons` uses this**, and the exception is designed rather than sloppy:
 * `consents.person_id` and `data_requests.person_id` are **nullable**, because ADR-0021 nulls them at
 * erasure so the evidence outlives its subject on `subject_key`. Those two spell the column out at
 * their own table, so departing from the convention is visible where it happens.
 */
export const personRef = () =>
  bigint({ mode: "bigint" })
    .notNull()
    .references(() => persons.id, { onDelete: "restrict" });
