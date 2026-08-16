# Testing at two seams, against a real Postgres

Issue #16 asked what we test, with what, and where it runs. The repo has no test runner at all, and
nothing to test — `packages/db` holds one migration and an empty `src/schema/index.ts`, and `apps/web`
is still the `create-turbo` scaffold. Every convention here is written for packages that do not exist,
which makes it the cheapest it will ever be to get right and the most expensive to change later.

Three things arrive already decided and are recorded here only so nobody re-opens them. ADR-0006 put
orchestration in `apps/web/src/use-cases/` as plain `(db, actorPersonId, input)` functions and made
every module function take a `Db | Tx` as its first argument — which is the injection this ADR spends.
ADR-0008 requires an integration test that erasure completes, the only automated guard on a statutory
clock in the product. ADR-0016 requires a test that suggestions never surface a Paused, Suspended or
Blocked Person. This ADR decides the machinery those three need.

**One premise of the ticket is void.** It asked how this runs in CI "without blowing the Actions free
tier". The repository is public, so GitHub Actions is free with unlimited minutes on standard runners.
Nothing here is constrained by CI cost; the constraints are wall-clock and, far more, what a solo
developer will keep doing.

## Two seams, and nothing else

A test may only be written at one of two places:

1. **A module function** exported from a `@repo/*` package's `index.ts`, signature `(db | tx, …)`.
2. **A use case** in `apps/web/src/use-cases/`, signature `(db, actorPersonId, input)`.

Everything else is not a seam: Server Action adapters, React components, module internals, anything
importing `next/*`. ADR-0006 already made the Server Action a four-line adapter — auth, parse, call,
`revalidatePath`, inside `Sentry.withServerActionInstrumentation()` — so a test of it is a test of
Next.js.

The use case is the **primary** seam, because a multi-table legal invariant is only observable there.
`acceptOffer` writing the status and the contact exchange atomically, erasure walking its sequence,
consent recorded inside the same transaction as the thing it authorises — none of these are visible
from inside a single module. The module function is tested where its own logic is non-trivial, not
reflexively.

## The database is never mocked, and the signature says which kind of test it is

**If a function takes a `Db | Tx`, it gets an integration test. If it does not, it gets a unit test.**

This is mechanical on purpose. "Is this unit or integration?" is otherwise a judgement call made afresh
every time, and the answer drifts. Here it is a property of the signature, readable without thinking.

The consequence worth stating: **the unit-testable surface is small**, and that is correct rather than a
gap. After ADR-0006 almost every domain function's behaviour _is_ SQL, and unit-testing it would mean
mocking the database — which produces a test that passes while production fails, the anti-pattern the
`tdd` skill names first. What remains genuinely pure is ADR-0014's banding and within-band shuffle seed,
ADR-0007's re-consent staleness comparison, ADR-0003's UUIDv7 generation, ADR-0013's phone-number
refusal, and the `drizzle-zod` parse boundaries.

## PGlite behind the Postgres wire protocol

Integration tests run on **PGlite**, reached through **`@electric-sql/pglite-socket`** over TCP, with
`pg.Pool({ max: 1 })` and `drizzle-orm/node-postgres` in front of it.

The direct route — `drizzle-orm/pglite` — does not type-check against ADR-0006. `PgliteDatabase<T>`
extends `PgDatabase<PgliteQueryResultHKT, T>` while `NodePgDatabase<T>` extends
`PgDatabase<NodePgQueryResultHKT, T>`; they are not assignable, so no module function could accept a
PGlite handle. The cheap fix is widening `Db` to the common `PgDatabase` base, which makes the
production type vaguer for a test-only reason.

The socket route needs no amendment to ADR-0006 at all — `Db` stays exactly `NodePgDatabase<typeof
schema>` — and it runs tests through the _same driver_ as production, so `pg`'s connection handling,
prepared statements and error mapping are exercised rather than approximated.

**This was measured, not assumed.** The same probe was run through the same drizzle + `pg` stack
against both lanes:

| observation                                  | PGlite + socket                 | Postgres 18.6 (docker) |
| -------------------------------------------- | ------------------------------- | ---------------------- |
| JS types returned by `execute()`             | all `String`, arrays as `Array` | identical              |
| `RESTRICT` violation                         | `23001`, constraint named       | identical              |
| nested transaction, outer rollback           | savepoint; both discarded       | identical              |
| `unaccent('atención')`                       | `atencion`                      | identical              |
| `similarity('mesero','mesera')`              | `0.5555556`                     | identical              |
| PG18 marker (`enable_self_join_elimination`) | present                         | identical              |
| version                                      | **18.3**                        | **18.6**               |

The patch version is the only divergence. One argument made for the socket while deciding was **wrong
and is corrected here**: it was claimed that `pg` and PGlite parse values differently, so raw results
would diverge. Drizzle overrides `pg`'s type parsers with its own, so both lanes return strings and the
column mappers convert. The socket is still right, on the two reasons that survived — no ADR-0006
amendment, and exact driver semantics — but not on that one.

Operationally: **TCP on port 0**, never a Unix socket, because the path limit is ~104 characters and
temporary directories exceed it routinely. `PGLiteSocketServer.getServerConn()` returns `host:port`,
not a URL. `maxConnections` defaults to 1, which matches PGlite being single-connection; the multiplexer
its README warns about is never engaged.

Verified on macOS arm64 and on Linux x64 / Node 24 from a clean install. **PGlite is WASM and
`pglite-socket` is pure `net`, so CI needs no service container, no docker, and no native build.**

**Documented fallback**, if `pglite-socket` (at 0.2.8) churns: switch to `drizzle-orm/pglite` and widen
`Db` to `PgDatabase<PgQueryResultHKT, typeof schema>`. Contained, and reversible.

## The migrations are the schema, and the template is the speed

A test database is built by **replaying `packages/db/migrations`** with the production
`drizzle-orm/node-postgres/migrator` — never by generating DDL from `src/schema/*.ts`.

Two things follow. The migration chain is under test on every run, which is issue #16's "are migrations
tested" answered with no separate mechanism. And the erasure invariant becomes meaningful: it asserts
`RESTRICT` behaviour, which lives in migration DDL and not in TypeScript, so a schema-derived database
would test a constraint set that has never existed anywhere.

Replaying is slow enough to matter — about **1.0s** — so it happens **once per run**, in Vitest
`globalSetup`: migrate one PGlite, `dumpDataDir()`, `provide()` the path. Each worker then boots with
`loadDataDir`, at about **120ms**. `pg_trgm` and `unaccent` must be passed via `extensions` at **both**
create sites or migration `0000` fails.

The honest limit: migrations are applied exactly once per run, so this catches a broken migration but
never a non-idempotent one.

## Isolation is a savepoint

Each test receives a transaction handle and everything it does is rolled back. ADR-0006 built the
`Db | Tx` seam for legal reasons; this is the second thing it buys. A use case's own `db.transaction()`
degrades to a nested savepoint, which drizzle supports and which the differential probe confirmed
behaves identically on both lanes.

One PGlite instance **per Vitest worker**, held as a module-level singleton — `setupFiles` runs per test
file, so without the singleton the ~120ms restore is paid per file instead of per worker.

That reuse has a consequence that must be written down: **no test may assert on a generated `bigint`
id.** Identity sequences do not roll back, so those values depend on file execution order. ADR-0003
already made app-side UUIDv7 the identifier anything outside the database uses, so nothing legitimate
needs them.

Two limits are inherent, not chosen. A test that rolls back cannot observe anything requiring a real
commit — nothing in v1 does, and the rule needs to exist before something tries. And PGlite is
single-connection, so **nothing concurrency- or lock-shaped is testable at all**.

Per-file restore is the documented fallback if leakage ever appears.

## The harness lives in `@repo/db`, and there is no fixtures package

`@repo/db` gains a third subpath export, **`./testing`**, joining `.` and `./schema` — the exception
ADR-0006 already carves for this package. `pglite` and `pglite-socket` are **devDependencies**, so
nothing WASM-shaped enters the production image.

The obvious alternative — a shared `@repo/testing` holding the harness _and_ fixture builders — is
impossible, and the reason should be recorded before someone proposes it again. A builder for an Offer
row would make the harness depend on `@repo/offers` at tier 5, while `@repo/offers`'s own tests depend
on the harness: a package cycle that inverts ADR-0006's DAG and that `turbo boundaries` would reject.

So **the harness is data-agnostic**. It hands out a migrated, isolated handle and knows nothing about
domain rows. Its only dependency is `@repo/db`, which is also exactly what it is. **Fixtures live per
package and are duplicated**, deliberately, forever.

## Invariant Tests

An **Invariant Test** guards a decision rather than a feature. It exists because an ADR requires it, and
it is the mechanism by which that ADR's constraint survives contact with code written months later by
someone who never read it.

- Named `<name>.invariant.test.ts`.
- Colocated with the code it guards, never in a central directory — a central directory rots.
- The requiring ADR is named in a header comment.
- Never deleted or weakened without amending that ADR.

**The index is `grep`, not a maintained list.** A table of Invariant Tests is one more thing to forget,
and forgetting it is silent. As of this ADR there are two, from ADR-0008 (erasure completeness) and
ADR-0016 (suggestions exclude a Paused, Suspended or Blocked Person); that enumeration is
**not authoritative** and will be stale.

## The erasure invariant makes tables declare themselves

This is the most load-bearing thing in this ADR.

ADR-0008 chose `RESTRICT` everywhere, so erasure is a hand-written sequence and the hazard is a new
table referencing `persons` that nobody adds to it. Nothing breaks in development; erasure then fails in
production against #26's 15-business-day clock.

A test that walks a **hand-written list** of tables does not close this. Adding a table means remembering
to update the list — the same forgetting, moved one file across.

So the test **enumerates tables reflectively from the drizzle schema**: every table with a foreign key to
`persons`, discovered by reading the schema object. A new table joins the test the day it is written,
by nobody's effort.

That forces a second decision the codebase does not currently record. After erasure, some tables must be
**empty** — that was the subject's data — while others must **still hold rows**: ADR-0008 keeps consent
evidence deliberately, because it is the proof that processing was authorised, and #31 adds a bounded
blocklist. "Everything is gone" is therefore the wrong assertion.

**Every table carries an erasure classification, declared where the table is defined**, in `@repo/db`'s
column helpers (ADR-0008 already ships conventions as spreadable helpers in `src/columns.ts`). The
invariant reads it. **A table referencing `persons` with no classification fails the test.**

The effect is the point: you cannot add a table referencing a Person without deciding, at that moment,
what erasure does to it — while you still have the context. The alternative is discovering it when a
titular's lawyer is waiting.

## Migration safety is enforced, not documented

Schema-versus-migration divergence reaches production; PGlite-versus-Postgres divergence mostly does not.
Three checks, as a `db:check` script in `@repo/db` with its own turbo task — not Vitest, because they
shell out to the CLI and to git.

**Drift.** CI runs `drizzle-kit generate` and fails if it emits anything. A schema edit whose migration
was never generated is caught at the pull request rather than at deploy.

**Integrity.** `drizzle-kit check` for collisions, plus a git check that no _existing_ `migrations/*.sql`
file or `meta/_journal.json` entry was **modified** against the base branch — only appended. An edited
applied migration is the purest source of environment divergence there is: a database rebuilt from zero
gets one schema, production keeps another, and nothing ever announces it.

**Destructive changes are two releases.** Each new migration is scanned for `DROP TABLE`, `DROP COLUMN`,
`ALTER COLUMN … SET NOT NULL`, `ALTER COLUMN … TYPE`, `DROP CONSTRAINT` and `RENAME`. A match is a **hard
failure** unless the migration carries a marker naming the earlier migration that made it safe:

```sql
-- destructive: completes 0014_add_nullable_x
```

A warning would be an unread line of CI output. The marker costs one comment and makes the author state
which expand step preceded this contract step, which is the thinking the rule exists to force.

**The two steps may not share a pull request.** Under ADR-0005's Fly rolling deploy, old and new code run
against one schema simultaneously, so expand and contract are two _releases_. The check enforces this
without inspecting deploy logs: the marker must name a migration **already present on `dev`**.

**This is the enforcement, not the policy.** Issue #15 owns the expand/contract choreography, deploy
ordering and mid-deploy failure handling, and inherits a working gate rather than a blank page.

## Coverage is measured and never gated

`@vitest/coverage-v8`, reported as a comment on every pull request, **with no threshold and nothing
blocked**.

A gate would be actively harmful here. The seams are restricted by decision and the unit/integration
split is a property of the signature, so a coverage number can only be raised by testing things this ADR
has decided not to test. The number is a trend to look at, not a bar to clear.

No external coverage service. This map has priced vendor count carefully everywhere, and coverage is not
worth the first exception: the report is posted by a GitHub Action from the `json-summary` artifact.

Because `turbo run test` fans out per package, coverage arrives as N summaries. **A separate root
`coverage` task runs Vitest once across all packages** for the report only, while `turbo run test`
stays per-package and cached for the actual gate.

## What v1 does not test, deliberately

React components. Server Action adapters. Async Server Components — ADR-0006 recorded that Vitest
**cannot render them at all**. Visual regression. Accessibility, which stays the handoff's manual WCAG
2.2 AA bar. PlanetScale-specific behaviour: Traffic Control, its extension set, its backup semantics.
Anything concurrent, which PGlite makes impossible rather than merely unfunded.

**And browser end-to-end testing, including Playwright.** This was reconsidered during #16 specifically
for the signup flow, where ADR-0007's four consent boxes become art. 9 evidence and ADR-0009 layered a
server-side Pending Signup and an OAuth redirect underneath — the one path where a silent breakage is a
compliance failure rather than a bug, and the one path Vitest structurally cannot reach. It is still out
of v1. **The gap is named rather than left silent: the consent-evidence path has no automated guard**,
and browser testing is the first thing to add when v1 is standing.

There is no `jsdom` anywhere. `environment: "node"` in every configuration, because nothing above needs
anything else.

## Red-green where a spec already exists

Test-first is **mandatory for Invariant Tests and use cases**, and free choice for module functions.

The asymmetry is real. For an Invariant Test the ADR _is_ the failing test's specification, already
written down; for most use cases the ADR describes the behaviour before any code exists. For a module
function the specification often does not exist until the SQL does, and writing the test first means
inventing a shape to be refactored an hour later.

Mandating red-green everywhere on a solo repository produces compliance theatre. Mandating it where a
written specification already exists costs nothing.

## Wiring

Vitest 4, **one `vitest.config.ts` per package** with a `test` script, registered as a turbo task —
package tasks, not a root task, so each package's result caches independently. A single root
configuration would grow a single cache key across ADR-0006's ten packages and re-run everything on
every change.

`test` uses the **transit node** pattern rather than `dependsOn: ["^build"]`. All packages are JIT
(ADR-0006), so tests read dependency _source_ and there is no build output to wait for — but a change in
`@repo/db` must still invalidate `@repo/offers`'s cached test result. `dependsOn: []` would be fast and
silently wrong.

Tests are **colocated** as `src/**/*.test.ts`, in scope for lint and type-check — an untyped test is how
a test starts asserting the wrong thing. `globals: true`, so `describe`/`it`/`expect` are not imported;
each package's tsconfig therefore needs `"types": ["vitest/globals", "node"]`, and listing `node`
explicitly is required because setting `types` at all disables automatic `@types/*` inclusion.

The pull-request gate is `turbo run lint check-types test db:check`. **Issue #15 owns the workflow file
itself**, the deploy gates and the migration ride-along.

## Consequences

- **`CLAUDE.md`** gains the testing conventions and the _Invariant Test_ rule. It is **not** in
  `CONTEXT.md`: that file is the product's glossary and holds no engineering vocabulary, and #16's
  session agreed the term before that distinction was weighed.
- **ADR-0006 is not amended.** The socket exists so that `Db` stays `NodePgDatabase<typeof schema>`.
  Its `exports`-map rule gains one more entry for the package that already had the exception.
- **ADR-0008 is completed, not amended.** Its required erasure test now has a mechanism, and it gains a
  requirement it did not state: every table declares an erasure classification beside its definition.
  That belongs in `src/columns.ts` alongside its other spreadable helpers.
- **#15 inherits** the destructive-migration gate as built, and owns the expand/contract policy behind
  it; also the pull-request gate command, the coverage-report action, and the fact that CI needs no
  database service container.
- **#27 inherits** the erasure classification as a decision it must make per table, and the reflective
  invariant as the thing that will refuse to pass until it does.
- **Every future ADR that requires a test** says so in its consequences and names the file, because
  `grep` over `*.invariant.test.ts` is the only index.
- **PGlite is at Postgres 18.3 against a production 18.6.** #17 handed this ticket a parity gap on the
  belief that PGlite was on 17.4; PGlite 0.5.0 moved to Postgres 18.3, so **the gap is closed** and the
  residue is a patch version. The `pglite` skill installed in this repo still documents 17.4 and is
  stale.
- **ADR-0014's `pg_upgrade` collation caveat is untestable here** and stays #15's to handle.
- **A decision that depends on concurrent transactions cannot be tested in v1** and must say so in its
  own ADR.
