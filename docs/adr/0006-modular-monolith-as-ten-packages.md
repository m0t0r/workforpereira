# The modular monolith is ten packages in a strict dependency order

Encuentra's domain is **ten pnpm workspace packages** under `packages/*`, ordered by a strict
dependency DAG. A module may import any module strictly below it and nothing else. Table definitions
are **central** in `@repo/db`; the **public type** that crosses a module's entry point belongs to the
module that owns it. There is no event bus: anything spanning modules upward is a use case in
`apps/web`.

## The modules

| Package | Tier | Owns | Depends on |
| --- | --- | --- | --- |
| `@repo/db` | 0 | All tables, all relations, `Db`/`Tx` types, the pool singleton, shared column helpers, `drizzle.config.ts` and migrations | — |
| `@repo/auth` | 1 | The Better Auth server instance and config; its generated `user`/`session`/`account`/`verification` tables | db |
| `@repo/catalog` | 1 | The `skill` taxonomy and `municipality` (DANE DIVIPOLA) — seeded, read-only at runtime | db |
| `@repo/people` | 2 | `person`, contact details, and the nullable `user_id` seam of ADR-0002 | db, auth |
| `@repo/consent` | 3 | `consent` records, the `Purpose` enum, aviso/política versions; answers `hasConsented()` | db, people |
| `@repo/publications` | 4 | `publication`, `capability_profile`, `need`, `publication_skill`, `commitment`, and the `status` column | db, people, catalog, consent |
| `@repo/notifications` | 4 | Email delivery and templates; enforces the consent gate itself | db, consent |
| `@repo/offers` | 5 | `offer` and its status machine, the contact-disclosure log | db, publications, people, consent |
| `@repo/safety` | 6 | `report`, `block`, moderation decisions | db, people, publications, offers |
| `@repo/matching` | 6 | Suggestions. Owns no entity | db, publications, offers, people, catalog |

Tiers are *derived* — the longest path from `db` — not chosen. No module depends on one at the same
or a higher tier, which is the acyclicity guarantee.

Two shapes were rejected as modules. **"Profiles" and "needs" are not separate modules**: ADR-0001's
domain model makes `Publication` the root that owns the person, municipality, remote flag, skills and
status, with `CapabilityProfile` and `Need` as its two kinds — splitting them gives two modules one
table. And **"data rights" is not a module**: consent *records* must be readable from low in the
graph while export and erasure must reach across all of it. One module cannot be both without a
cycle, so `@repo/consent` holds the records and rights fulfilment is a use case.

`@repo/notifications` and `@repo/safety` sit high for the same reason. Neither is called from below:
`offers` does not import `notifications`, and `publications` does not ask `safety` whether a row is
suppressed — suppression is a `status` value owned by `publications` that `safety` sets through a use
case. One column, one owner.

## Why packages rather than directories

Directories inside a single `@repo/domain` package, policed by a file-level linter, were the cheaper
option and were rejected. Packages buy enforcement from tools already in the repo rather than from a
tool added to guard a convention: pnpm will not resolve an import of a package absent from
`package.json`, and an `exports` map of exactly `{".": "./src/index.ts"}` makes everything but the
entry point unreachable at compile time, with no linter involved at all.

## Why the schema is central

Per-module `schema.ts` files were the initial recommendation, because a module that does not own its
tables is a weaker module. Drizzle's relations API defeats it in both generations. In v1
(`relations()`, what `drizzle-orm@0.45.2` ships) relations are bidirectional by convention, so
`people` would need `many(publication)` — an upward import the DAG forbids, costing the `db.query.*`
relational API entirely. In v2 (`defineRelations`, `drizzle-orm@1.0.0-beta`) a single call over the
whole schema is the documented shape. `defineRelationsPart` can split it, but that is fighting the
grain of the tool for a boundary that is enforced elsewhere.

So `@repo/db` holds every table, grouped by owner (`src/schema/publications.ts`, `src/schema/auth.ts`,
…) so ownership stays legible.

**What this knowingly gives up.** The DAG constrains logic but not SQL: `offers` can import the
`publication` table and read it directly, and `turbo boundaries` will see a legal `offers → db` edge
and pass. The guard is a convention — **only the owning module writes to its own tables** — plus
review. Cross-module *reads* are fine and often wanted; `matching` and search (issues #10, #20) need
joins across four modules' tables to avoid N+1.

If that convention proves insufficient, the fix is **dependency-cruiser** with path-glob rules on
`@repo/db/schema/*` subpath imports — the one rule none of the three current mechanisms can express.
It is named here as the designated remedy with that trigger, and deliberately not adopted now: three
overlapping enforcement tools before any application code exists would mean two copies of this DAG,
which drift.

## Types, and where the internal key stops

`@repo/db` exports the table and its row type (`PublicationRow` = `$inferSelect`), which carries the
internal `bigint` key. The **owning module** exports the public type, derived with `drizzle-zod`:

```ts
// @repo/publications
export const Publication = createSelectSchema(publication).omit({ id: true, personId: true })…
```

This makes ADR-0003 — the internal key never crosses the boundary, the domain speaks public
identifiers only — a compile error rather than a review note. Internal `bigint`s stay legal inside a
module and inside a downward join; they simply cannot appear on a public entry point. `pgEnum`
declarations live beside their tables and `drizzle-zod` derives them.

`drizzle-zod@0.8.3` peers `zod: ^3.25.0 || ^4.0.0` and `drizzle-orm >= 0.36.0`, so Zod 4 needs no
pinning.

**`createInsertSchema` is a table shape, not a form shape.** TanStack Form will want confirm-password
fields, string→number coercion, and fields the user never sets. Derive and then `.extend()`/`.omit()`
per form; never use a raw insert schema as a form schema, or the UI inherits the table layout.

## The connection is a singleton; the handle is an argument

`@repo/db` owns one pool, constructed once at module scope — Next.js will otherwise open a pool per
HMR reload. But **every module function takes the handle as its first argument**
(`Db = NodePgDatabase | PgTransaction`), and modules never import the singleton themselves.

The failure this avoids is concrete and legal, not aesthetic. `acceptOffer` must write the offer
status and the contact-disclosure log atomically. `db.transaction(cb)` yields a `tx` that is a
*different object*; a module holding the singleton would write outside the caller's transaction, and
a rollback would leave contact details disclosed for an offer that was never accepted — a Ley 1581
problem. Injection is also what lets issue #16's PGlite tests hand a module a throwaway database with
no mocking.

`AsyncLocalStorage` with an ambient transaction was considered and rejected: it works on Fly.io's Node
runtime (ADR-0005), but it makes "which connection am I on" invisible at every call site and requires
every test to enter the same scope.

## Use cases live in `apps/web`

A framework-agnostic `@repo/use-cases` package was proposed and rejected. Next.js's Vitest guide and
current practice confirm Server Actions are plain async functions to Vitest and `next/headers` is
mockable from `vitest.setup.ts`, so the testability objection does not hold. A separate package with
exactly one consumer would be a pass-through layer.

The convention instead: orchestration is a **plain function** in `apps/web/src/use-cases/`, signature
`(db, actorPersonId, input)`, importing nothing from `next/*` — this is where the transaction boundary
sits. The Server Action is an adapter: auth → parse → call → `revalidatePath`. Vitest and PGlite test
the function directly with no mocks. Extraction to a package, if a second consumer ever appears, is a
`git mv`.

One limitation for issue #16 to record: **Vitest cannot render async Server Components at all**, so
those need Playwright regardless.

## Enforcement

Three mechanisms, in descending strength:

1. **The `exports` map.** Domain packages export exactly `{".": "./src/index.ts"}` — nothing else in
   the package is reachable, enforced by Node resolution and TypeScript. `@repo/db` additionally
   exports `"./schema"`. `@repo/design-system` keeps a wildcard (`"./*": "./src/*.tsx"`), because
   per-component imports *are* its interface and shadcn's CLI expects that shape.
2. **pnpm.** An import of a package not declared in `package.json` does not resolve.
3. **`turbo boundaries`**, one tag per package with an exact `allow` list, run in CI via a root
   `"boundaries": "turbo boundaries"` script — one of the few legitimate root tasks, since it invokes
   turbo itself. It catches the case where the dependency *was* declared and should not have been.
   `@repo/design-system` is tagged `ui` and denied any dependency on `domain`.

`turbo boundaries` is experimental; if it churns, (1) and (2) still hold. Whether its `allow` lists
also filter external npm dependencies is unverified — if they do, fall back to tier tags rather than
per-package tags.

## Packaging

All packages are **JIT** — raw TypeScript through the `exports` map, no build step, no `dist`, no
`dependsOn: ["^build"]`. This is Turborepo's own guidance for internal packages and it is why a type
error in a package already surfaces in `apps/web`'s `check-types`. Compiling is a mechanical change
to make later, when `next build` measurably hurts.

Packages sit **flat in `packages/*`** — the existing glob needs no change and thirteen entries do not
justify a second level. Domain modules are distinguished from tooling by Turborepo `tags`, not by
directory nesting or a second npm scope.

## Consequences for existing code

- **`packages/ui` is deleted.** Its three `create-turbo` scaffold components and the
  `turbo gen react-component` generator go with it, and `@repo/design-system` is created fresh around
  shadcn. Its Tailwind config and path aliases must agree with `apps/web` — configuration work that
  lands on this package.
- **`apps/landing` stops being an app.** It has no `package.json`, so pnpm and Turborepo already
  ignore it; it is a static POC. It moves to `docs/design/landing-prototype/` and is deleted once the
  public landing page is rebuilt as a route in `apps/web`. **`NEXTJS_HANDOFF.md` must survive that
  deletion** — it is the only binding source for design tokens, motion rules, content rules and the
  WCAG 2.2 AA bar, and its superseded half (the information architecture, the `Job`/`Application`
  contracts, the four-stage timeline, "Empresas verificadas") should be marked as such in place.
- `drizzle-kit` remains sole owner of migrations, now rooted in `packages/db`.

## Rejected: an event bus

Domain events were considered for the inverted edges — offer-accepted reaching notifications,
moderation reaching publications — and rejected. One database, one process, one developer: a bus buys
decoupling that nothing here needs and costs every stack trace. The orchestrator calls both.

## Open, and deliberately not settled here

**Sending email inside a transaction is a bug waiting to happen** — the send survives a rollback. The
clean fix is an outbox row written in-transaction and drained after commit. It touches the offer
lifecycle (#9) and CI/deployment (#15) and belongs to whichever settles first.
