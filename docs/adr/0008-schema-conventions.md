# Schema conventions: plural tables, hard deletes, and `RESTRICT` by default

ADR-0003 settled primary keys and left the rest of the schema without an owner. This settles it, once,
so every implementation ticket inherits the conventions rather than re-deciding them: naming,
timestamps, constrained vocabularies, deletion, indexes and nullability.

The starting point is the host's own guidance — `.claude/skills/postgres/references/schema-design.md`
and `indexing.md`. Where we depart from it, the departure is argued below.

This is not a schema. It is the set of rules the schema must satisfy, and the helpers in `@repo/db`
that make satisfying them the path of least resistance.

## Naming

**Tables are plural, columns are singular**, both snake_case, both English per ADR-0001:
`persons`, `publications`, `capability_profiles`, `publication_skills`, `consents`,
`document_versions`, `data_requests`, `offers`.

This **departs from the host guidance**, which says singular. Plural is the more widely held
convention, it is what Drizzle's own documentation uses throughout, and it costs nothing to adopt
before a single table exists. The guidance is a house style, not a Postgres constraint. Join tables
pluralise the last noun only: `publication_skills`.

> **One table departs, recorded here rather than only at its own definition:
> `notification_outbox`** (#69). Two reasons, and the second is the binding one. Its head noun is a
> **container** — the table _is_ one outbox and a row is one message in it — so pluralising reads as
> several outboxes rather than several messages. And **ADR-0028 already named it**, inside the claim
> query that ADR specifies. Renaming would leave a decision record's example SQL naming a table that
> does not exist, which is worse than an inconsistent plural: an implementation quietly overriding an
> ADR is the exact shape ADR-0035 was written to complain about.
>
> This is an **exception, not a softening**. The rule above stays unconditional for every other
> table; a second departure needs its own paragraph here, and a container noun is the only argument
> that has been accepted for one.

**The Better Auth tables are remapped to match**: `users`, `sessions`, `accounts`, `verifications`,
via `schema.<model>.modelName` in the Better Auth config — configuration, not hand-written DDL, so
ADR-0003's refusal to own their schema through upgrades still holds. A mixed-plurality database is
worse than either convention, and the rename dodges a real annoyance for free: `user` is a **reserved
word** in Postgres and must be quoted everywhere, where `users` need not be.

**`casing: 'snake_case'` is set once in the Drizzle config.** TypeScript reads `personId`, Postgres
reads `person_id`, and the name is written exactly once. Spelling both at every column
(`bigint('person_id')`) is a second place to drift.

**Booleans take an `is_` or `has_` prefix and are always phrased positively** — `is_remote`, never
`is_not_remote`. A negated boolean turns every read into a double negative.

## Timestamps

**`created_at timestamptz NOT NULL DEFAULT now()` on every table.**

**`updated_at` only on tables whose rows change.** On an append-only table — `consents`,
`document_versions`, the contact-exchange log — an `updated_at` column is a lie that invites an
`UPDATE`. Its **absence is the marker** of an append-only table, which is why `columns.ts` below
exposes `timestamps()` and `createdAt()` as two helpers rather than one with a flag: choosing
append-only is a visible act at the table definition.

**`updated_at` is maintained by Drizzle's `$onUpdate()`, not a Postgres trigger.** A trigger is
genuinely stronger — it survives hand-written SQL — but drizzle-kit does not manage triggers, so each
one is hand-written SQL inside a migration, cutting against drizzle-kit as sole owner of migrations
(ADR-0004). Every write goes through Drizzle by convention; that convention is cheaper to hold than
a parallel migration mechanism.

**A domain timestamp is never collapsed into `created_at`.** `consents.granted_at`,
`data_requests.received_at`, `document_versions.effective_from` are separate columns even where they
are usually equal to the row's insert time. A backfilled or admin-created row makes them diverge, and
that divergence is precisely what an audit wants to see.

## Types

**`timestamptz` for every instant.** Never bare `timestamp`.

**`date` for genuine calendar dates.** A birthday is not a moment in time: `persons.date_of_birth`
(ADR-0007) is a `date`. Stored as `timestamptz` it shifts across a timezone boundary and the 18+ gate
is wrong by a day for someone born near midnight.

**The database session timezone is UTC and is never relied upon.** Every `America/Bogota`-relative
computation is explicit in application code — never an `AT TIME ZONE` scattered through queries.

One fact recorded here so #26 inherits it rather than rediscovering it: **Colombia has no DST.**
`America/Bogota` is a fixed UTC−5 all year. The hard part of the business-day clock is the _festivos_,
including the movable ones under Ley 51 de 1983 — not offset arithmetic.

## Constrained vocabularies are `text` + `CHECK`, never `pgEnum`

A column with a fixed set of values is declared as **Drizzle's `text({ enum: [...] })` with an
explicit `check()` constraint**:

```ts
// @repo/db/src/schema/publications.ts
export const PUBLICATION_STATUS = ["draft", "published", "unpublished"] as const;

export const publications = pgTable(
  "publications",
  {
    status: text({ enum: PUBLICATION_STATUS }).notNull(),
    // …
  },
  (t) => [
    check("publications_status_check", sql`${t.status} in ('draft', 'published', 'unpublished')`),
  ],
);
```

This is the host guidance's preference for `CHECK` over enums — `ALTER TYPE` can add a value but
renaming or removing one is a multi-step dance, and drizzle-kit's enum diffs are not always cleanly
applicable — **without** the cost that made `pgEnum` attractive in the first place. A raw `text` +
`CHECK` column derives as `z.string()` under `drizzle-zod`, so the constraint would exist in the
database and vanish from the types, defeating ADR-0006's whole type strategy. `text({ enum })` emits
a plain `text` column while giving TypeScript the union _and_ letting `drizzle-zod` derive
`z.enum([...])`.

Three enforcement points — database, TypeScript, Zod — from one `as const` literal.

**This supersedes ADR-0007**, which declares `consents.purpose` a closed `pgEnum`, and **amends
ADR-0006**, whose "`pgEnum` declarations live beside their tables" now reads _the `as const` literal
lives beside its table_. Nothing else about either decision changes; `drizzle-zod` still derives, and
the derived type is still exported by the owning module rather than by `@repo/db`.

**The literal must live in `@repo/db`**, not in the owning module. `@repo/db` is tier 0 and cannot
import from `@repo/publications` — that is an upward edge the ADR-0006 DAG forbids. The table shape
is `db`'s; the domain type derived from it is the module's.

Verify at implementation: that `drizzle-zod` reads the `enum` option off a `text` column. It is
documented to, and it is a five-minute check.

## Deletion is hard, and there is no `deleted_at`

**Rows are deleted. No table carries a `deleted_at`, and none gets one without amending this ADR to
name the retention rule it implements.**

A reflexive soft-delete habit quietly breaks Ley 1581 erasure — a tombstoned row is a row we still
hold — and it taxes every query in the codebase with a `WHERE deleted_at IS NULL` that one of them
will eventually forget.

Rows that must outlive their subject are **deliberately designed evidentiary tables** — `consents`,
the contact-exchange log, `data_requests` — not tombstoned domain rows. The distinction matters: an
evidentiary row is one we are _obliged_ to keep and can point at an article for; a tombstone is one we
failed to decide about.

The one genuine driver for soft delete here is not sentiment: an accepted `offer` references a
`publication`, and hard-deleting the publication destroys the record of what was offered. That is
handled by the FK action below, not by a tombstone. **Unpublishing is a status** — ADR-0006 already
gives `publications` a `status` column with `unpublished` among its values — and a status is not a
deletion.

## `RESTRICT` is the default FK action

| Action     | When                                                               | Examples                                                                                                |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `RESTRICT` | **Default.** Everything not covered below                          | every reference to `persons`; `offers` → `publications`; `publication_skills` → `skills`                |
| `CASCADE`  | Only _within an aggregate_ — rows meaningless without their parent | `capability_profiles` → `publications`, `needs` → `publications`, `publication_skills` → `publications` |
| `SET NULL` | Only at ADR-0002's seam                                            | `persons.user_id` → `users.id`                                                                          |

ADR-0006 left this open — _"cascades within the domain are entirely ours to choose"_ — and
hard-delete-by-default makes it load-bearing, because with no tombstones the FK action is now the only
thing deciding what survives.

**`CASCADE` as a default would destroy consent evidence.** A single `DELETE FROM persons` would take
that Person's `consents` rows with it, and Ley 1581 arts. 9 and 17(b) require us to _conserve proof of
the authorization_. That is exactly the failure ADR-0002 built the `user`/`person` seam to prevent,
reintroduced one foreign key further down. `RESTRICT` does not forbid the delete; it forbids doing it
**by accident**, with no line of code anywhere saying that is what happens.

**Never deferrable.** `NO ACTION` marked `DEFERRABLE INITIALLY DEFERRED` would make the erasure
sequence's ordering irrelevant, checking the whole graph at `COMMIT` instead. Rejected: a deferred
violation surfaces at commit time naming a constraint, rather than at the statement that forgot a
table, which is materially worse to debug. The explicit leaf-first ordering is also _documentation of
what erasure touches_ — an asset, not a chore. (Drizzle's `onDelete` option is well documented;
first-class deferrability is not, which is a second reason not to depend on it.)

### What this hands to #27

`RESTRICT` **does not pre-empt** the erasure design. Both of #27's options survive:

- **Redact `persons` in place** — the row stays, every FK stays valid, `RESTRICT` never fires.
- **Hard-delete the `persons` row, keep the consent proof** — delete or detach the dependents first,
  explicitly.

One constraint falls out and belongs to #27: **if it chooses hard delete, `consents.person_id` cannot
stay `NOT NULL`** — the evidence must survive its subject, which means a nullable FK or a different
anchor. It stays `NOT NULL` for now, because widening a column speculatively for an undecided option
is exactly what the nullability rule below forbids. Pre-launch, that migration is nearly free.

## Erasure is one implementation with many callers

**There is exactly one erasure implementation** — a use case in `apps/web/src/use-cases/` per
ADR-0006, signature `(db, actorPersonId, input)`. `/my-data` is one adapter over it. An internal admin
surface, if one is ever built, is a second adapter over the _same function_. It never reimplements the
delete sequence.

**No caller bypasses a constraint.** `SET session_replication_role = replica`, dropping a constraint
to force a delete through, or any equivalent, is prohibited — it converts the loud failure this ADR
designs for back into the silent evidence destruction `CASCADE` would have given us.

**An integration test is required, not optional.** `RESTRICT` creates one hazard `CASCADE` would have
hidden: a new table referencing `persons` that nobody adds to the erasure sequence makes erasure start
**failing in production**, against the 15-business-day statutory clock in #26. The closing mechanism is
a PGlite integration test (#16) that creates a Person with a row in _every_ table referencing
`persons`, runs erasure, and asserts it completes. A forgotten table then fails CI instead of failing a
titular's deletion request.

## Indexes

**Every foreign key column is indexed, unless it is already the leftmost column of an existing
index.**

The unconditional half is the host guidance's Core Rule 1 — Postgres does not auto-create these, and
an unindexed FK makes every parent delete a sequential scan on the child. The exception is that same
document's own composite-index rule (_"a composite index on `(a, b)` supports queries on `a` + `b` and
`a` alone"_) composed with Core Rule 3 (_"don't over-index"_): `publication_skills (publication_id,
skill_id)` already indexes `publication_id` through its composite primary key, and a second index on
it is pure write overhead.

**A deliberately absent index must carry a comment at the table.** Absent-because-redundant and
absent-because-forgotten look identical, and the host's duplicate-index audit query **will not catch
this** — it matches only identical definitions after name normalisation, never prefix-redundancy. This
is caught at design time or not at all.

**A join table's composite primary key column order decides which FK gets the free index**, so it is
chosen by query pattern, not alphabetically. The other column needs its own index.

Naming: `{table}_{column}_idx`, composite `{table}_{col_a}_{col_b}_idx`, unique constraints
`{table}_{column}_unique` (Drizzle's own default shape — no reason to fight the generator), check
constraints `{table}_{column}_check`.

Watch the host's index-count thresholds: more than 10 indexes on a table requires an audit.

## Nullability

**`NOT NULL` unless nullability carries meaning**, and **every nullable column carries a comment
naming what its null means.**

Today's justified nullables are `persons.user_id` (ADR-0002's seam, and the person-before-user window
in ADR-0007) and `consents.subject_kind` / `subject_public_id` (only scoped consents have a subject).

**No sentinel empty strings, ever.** `NOT NULL DEFAULT ''` is a null wearing a disguise, and it makes
"not provided" and "provided as blank" indistinguishable — which matters directly for the
field-justification register ADR-0007 requires, whose job is to state what we actually hold.

`CHECK (length(trim(col)) > 0)` on load-bearing free-text columns only. Universally it is noise.

**Those comments live in TypeScript, in the schema file — not as `COMMENT ON COLUMN`.** drizzle-kit
does not generate `COMMENT ON`, so each would be hand-written SQL in a migration, cutting against
drizzle-kit as sole owner of migrations and drifting the first time someone forgets. The schema file
is what developers and agents actually read, and a comment there cannot drift from the definition it
sits on. Personal-data columns _additionally_ get their row in ADR-0007's field-justification register
in `docs/legal/` — a legal artefact with a different audience, not a duplicate.

## The conventions ship as code

An ADR nobody re-reads is a convention that decays. ADR-0006 gestures at "shared column helpers" in
`@repo/db`; this is what they are. `packages/db/src/columns.ts` exports spreadable helpers so that
violating a convention requires **deliberately not using one**:

```ts
export const id = () => bigint({ mode: 'bigint' }).generatedAlwaysAsIdentity().primaryKey()
export const publicId = () => uuid().notNull().unique().$defaultFn(uuidv7)
export const timestamps = () => ({ createdAt: …, updatedAt: ….$onUpdate(() => new Date()) })
export const createdAt = () => ({ createdAt: … })          // append-only tables
export const personRef = () => bigint(…).notNull().references(() => persons.id, { onDelete: 'restrict' })
```

The ADR is the rationale; `columns.ts` is the rule.

**What is not enforceable, stated plainly rather than pretended:** the FK-index "unless leftmost"
exception, the nullable-column comments, the "only the owning module writes to its own tables"
convention from ADR-0006, and the prohibition on bypassing constraints. These are review conventions.
Only the erasure completeness test above is automated, because only it guards a legal obligation.

## Consequences

- **ADR-0002, ADR-0003, ADR-0006, ADR-0007** are swept for the plural rename. No decision in any of
  them changes; only the table names they cite.
- **ADR-0007's `pgEnum`** for `consents.purpose` is superseded by `text({ enum })` + `check()`.
  **ADR-0006's** "`pgEnum` declarations live beside their tables" is amended to the `as const` literal.
- **#16 (testing)** inherits the erasure completeness test as a required case.
- **#27 (`/my-data`)** inherits the `consents.person_id` nullability constraint above.
- **#13 (safety) and #27 (retention)** inherit a constraint neither currently states: **erasure-on-
  request and ban-and-purge are different operations wearing the same verb.** Deleting a Person
  because they asked is _supresión_. Deleting a fraudster on our own initiative is not — and if it is a
  true hard delete, they re-register tomorrow with the same details, because nothing survived to
  recognise them by. That collides with the `safety` purpose ADR-0007 made _required_ precisely so
  moderation would have a lawful basis. Something must outlive a banned Person; what, and for how
  long, is a retention decision between those two tickets.
- **#9 (offers)** and **#2's publication states** inherit `text({ enum })` + `check()` for their status
  columns.
- **#26** inherits the no-DST fact and the `date`-vs-`timestamptz` rule for its deadline columns.

## Rejected

**Singular table names**, the host guidance's own recommendation. It was the standing de-facto
convention across four ADRs, and consistency would have been the argument for keeping it — but no
table exists yet, the sweep is roughly thirty references across four documents and three issues, and
plural is the more standard convention to hand an implementer.

**A `deleted_at` convention.** Covered above: it breaks erasure quietly and taxes every query.

**`CASCADE` as the default FK action.** Covered above: it destroys consent evidence with no code
saying so.

**Deferrable `NO ACTION`.** Covered above: relocates the failure to `COMMIT` and discards the
ordering as documentation.

**Postgres triggers for `updated_at`.** Stronger, but requires hand-written SQL in migrations that
drizzle-kit is meant to own alone.

**`COMMENT ON COLUMN` for the nullability rationale.** drizzle-kit does not generate it; it would
drift.
