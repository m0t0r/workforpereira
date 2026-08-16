# Migrations are one transaction, applied before the deploy

Issue #15 asked how `drizzle-kit` migrations ride along with a deploy, and what happens when one
fails mid-flight. Answering the second question turned up a fact no ADR had recorded, which changes
what the first question is worth asking about.

ADR-0022 owns the environments and the pipeline. This ADR owns what the pipeline does to the
database.

## The finding: every pending migration shares one transaction

`drizzle-kit migrate` on the `pg` driver delegates to `drizzle-orm`'s migrator
(`drizzle-kit/bin.cjs:78902`), whose PostgreSQL dialect opens **one** transaction and applies **every
pending migration inside it**, committing the `drizzle.__drizzle_migrations` bookkeeping rows in the
same transaction (`drizzle-orm/pg-core/dialect.js:60-71`):

```js
await session.transaction(async (tx) => {
  for await (const migration of migrations) {
    if (!lastDbMigration || Number(lastDbMigration.created_at) < migration.folderMillis) {
      for (const stmt of migration.sql) await tx.execute(sql.raw(stmt));
      await tx.execute(sql`insert into ... values(${migration.hash}, ${migration.folderMillis})`);
    }
  }
});
```

Postgres has transactional DDL, so this actually holds. **A migration run either lands completely or
leaves the database untouched, bookkeeping included.** The `--> statement-breakpoint` splitting that
`meta/_journal.json` enables changes how statements are dispatched, not what they are wrapped in.

So the ticket's question — _"what happens when one fails mid-deploy"_ — has a smaller answer than it
expected. There is no partial application, no torn journal, no manual reconciliation, and no state a
runbook has to teach anyone to unpick. **The failure procedure is: read the error, fix forward,
run again.** That is worth writing down precisely because it is the opposite of the MySQL habit most
people bring, where every migration is its own implicit commit and half-applied is the normal
disaster.

It is not free, and the rest of this ADR is the bill.

## Migrate first, then deploy

Every release applies migrations **before** the new image is released, on the CI runner, against the
direct 5432 connection as the `migrator` role.

The two orderings are not symmetric. Old code against a new **additive** schema is correct by
construction — that is precisely what the expand/contract rule below guarantees. New code against an
old schema is the hard direction: it selects a column that does not exist and errors for the whole
window, and under ADR-0005's rolling replacement that window is unbounded if the migration then
fails. Migrating first makes the safe direction the only direction.

It also puts ADR-0022's single human approval in front of the one step in the pipeline that has no
inverse.

## What one transaction forbids

**`CREATE INDEX CONCURRENTLY` cannot run inside a transaction block** — Postgres refuses it,
SQLSTATE `25001`. So `drizzle-kit migrate` structurally cannot apply one, ever. Every index this
repository adds is a plain `CREATE INDEX`, which takes a `SHARE` lock: reads continue, **writes
block for the duration of the build**.

This is not hypothetical. ADR-0008 requires an index on every foreign key unless it is already a
leftmost prefix, and ADR-0014's search is _"a btree on `publication_skills (skill_id,
publication_id)`"_ which _is_ the inverted index. Indexes will be added.

**Two controls, and one named escape hatch.**

First, the migration connection sets `lock_timeout` and `statement_timeout`. Without `lock_timeout`,
a migration that queues behind a long-running query does not merely wait — every query arriving
afterwards queues **behind the migration**, because Postgres lock requests are ordered. That is how a
routine index build becomes a total outage, and it is the single most common way a healthy database
is taken down by a deploy. A short `lock_timeout` converts it into a failed deploy, which under the
paragraph above costs nothing.

Second, a concurrent index is an **out-of-band operation**: the statement is run by hand against the
direct connection and its migration file is recorded in the journal afterwards. **v1 defers this
entirely**, because no table will be large enough for a plain `CREATE INDEX` to be perceptible.
The threshold at which that stops being true is roughly **100,000 rows** in the table being indexed
— below it the build is sub-second, above it the write-block is long enough for a user to notice.
Reaching that number is the trigger to build a real out-of-band lane, not to improvise one during an
incident.

The alternative considered was a second migration directory applied by a bespoke runner outside the
transaction. It was rejected as machinery for a problem this application does not yet have, and it
would give drizzle-kit a second owner of migrations, which ADR-0004 and ADR-0006 both refuse.

## A backfill over ~10,000 rows is not a migration

It is a batched one-off script, run outside `drizzle-kit migrate`.

Inside the migration it would sit in that same single transaction, holding row locks and generating
dead tuples for its whole duration — the identical failure mode as the index above, approached from
the other end. The transaction that makes failure clean is the transaction that makes a long
operation dangerous, and both escape hatches exist for the same reason.

## Expand and contract: two releases is the floor, three is the shape

ADR-0017 built the **gate**: every new migration is scanned for `DROP TABLE`, `DROP COLUMN`,
`ALTER COLUMN … SET NOT NULL`, `ALTER COLUMN … TYPE`, `DROP CONSTRAINT` and `RENAME`, and a match
hard-fails unless the migration carries a marker naming an earlier migration **already present on
`dev`**:

```sql
-- destructive: completes 0014_add_nullable_x
```

ADR-0017 left the **policy** here, and there is one thing in it the gate cannot enforce. The gate
proves the two steps are at least one release apart. It cannot prove that _one_ intervening release
is enough — and for a column removal that carries data, it is not:

1. **Expand.** Add the new column, nullable. Deploy code that writes both and reads the old one.
2. **Migrate and switch.** Backfill (out of band, per above). Deploy code that reads the new column
   and still writes both.
3. **Contract.** Deploy code that writes only the new column. Then drop the old one, with the
   marker.

Compressing this to two puts the read-switch and the drop in the same release, so the rollback of
step 2 lands on a schema that no longer has the column it reads. **Two releases is what the gate
enforces; three is what a backfill needs**, and only this document says so.

Under ADR-0005's rolling deploy old and new code share one schema, so this is not ceremony — it is
the reason the expand step exists at all.

## Code rolls back. The schema does not.

**`drizzle-kit` has no `down` command.** Its commands are `generate migrate introspect push up check
drop export`, and `drop` only removes an un-applied file from the folder. There is no reverse
migration and there will not be one.

That is affordable only because of everything above. A code rollback never requires the schema to
move, because the schema change was additive and the old code tolerates it by construction. So:

- **Code rollback** is `fly deploy --image <previous digest>` — seconds, no rebuild — followed by
  `git revert` on `main` in the same session. The image swap is the incident action; the revert is
  what stops `main` from lying about what is running, which is the whole reason ADR-0022 made `main`
  the production ref.
- **A wrong migration is superseded by a new forward migration.** There is no other path.

**A restore is not a rollback mechanism.** `planetscale-postgres-safety-review` says this in its own
words — _"use PITR/backup restore branches for incident recovery, not as an automatic rollback
mechanism"_ — and it needs stating because it is exactly what a frightened operator reaches for.
Restoring to undo a schema change discards every row written since the restore point. It is
data-loss recovery, it costs the full RPO below, and it is never the answer to "the migration was
wrong".

## RPO is 24 hours, and someone has to say so

ADR-0004 accepted 2-day backup retention and no HA as named risks and left the number here: _"the
real RPO is issue #15's to set."_

**RPO: 24 hours. RTO: hours, not minutes.** A single-node PS-5 with two days of retention means a
bad day loses up to a day of profiles, publications and offers, and recovery is measured in the time
it takes one person to notice, restore, re-create the extensions and cut over.

That is survivable for a platform that moves no money and stores no transaction anyone is owed. It
is also the one place where "it is free" has a real cost, and leaving it implied would be dishonest
to the people whose profiles those are. It goes in the runbook as a stated promise, not as an
inference from a retention setting.

**One restore drill runs before launch**, to a fresh branch. Its purpose is specific: to watch
`pg_trgm` and `unaccent` come back **missing** exactly as `0000_enable_extensions.sql` predicts,
because the restore also brings back `drizzle.__drizzle_migrations` with migration `0000` already
recorded as applied — so the runner reports nothing to do while every query needing those
extensions fails at runtime. The drill is what turns that comment into a tested procedure with a
verified command in the runbook.

## Accepted risks

- **No concurrent index path exists.** Adding an index to a table past ~100,000 rows blocks writes,
  and the remedy is an out-of-band procedure that has never been performed.
- **`lock_timeout` and `statement_timeout` values are unmeasured.** They are set to fail fast on an
  application with no traffic; the right numbers are a function of traffic that does not exist.
- **The three-release choreography is enforced by prose.** ADR-0017's gate proves one release of
  separation, not two, and nothing detects a compressed backfill except review.
- **A 24-hour RPO is a policy, not a mechanism.** Nothing enforces it and PlanetScale's retention is
  what it is; the number describes the loss we have agreed to accept.
- **The restore drill has not been run**, so the recovery commands in the runbook are written from
  documentation rather than from having done it once.
- **The single-transaction behaviour is a property of `drizzle-orm@0.45.2` and `drizzle-kit@0.31.10`
  as read**, not a documented guarantee. A future version could batch differently, and everything in
  this ADR downstream of it would need re-reading.

## Consequences

- **The runbook's migration-failure entry is three lines**, because there is nothing to unpick.
- **`packages/db` gains no rollback tooling**, and any proposal for a `down` lane should be read
  against this ADR first.
- **ADR-0017's destructive gate is unchanged**; this ADR supplies the policy behind it and adds the
  case the gate cannot see.
- **ADR-0004's RPO placeholder is filled.**
- **ADR-0014's `pg_upgrade` collation caveat lands in the runbook** rather than in a test. ADR-0017
  recorded it as untestable and left it here: PG18 reads full-text and `pg_trgm` dictionaries via
  the cluster's default collation provider rather than always libc, and recommends reindexing those
  indexes after a `pg_upgrade`. PlanetScale has no in-place major upgrade, so this reaches us only
  through a migration between databases — which is precisely when nobody remembers it.
- **The ~100,000-row and ~10,000-row thresholds are named so they can be argued with.** Both are
  order-of-magnitude judgements, not measurements, and either is worth revising the first time a
  real table gets close.
