# Adding a `@repo/*` module package

Ten packages under `packages/*`, in the strict dependency order ADR-0006 fixes. This is the recipe
for creating one. Following it produces a package that passes
`turbo run lint check-types test db:check check-contrast` and `turbo boundaries` with no further
edits — that is the property the recipe is written to have, and the thing to fix if it ever stops
being true.

Worked example throughout: `@repo/consent`, tier 3, depending on `db` and `people`.

## 1. The skeleton

```
packages/consent/
├── package.json
├── tsconfig.json
├── turbo.json
├── oxlint.config.mts
├── vitest.config.ts
└── src/
    ├── index.ts
    └── …
```

Nothing else. There is no `dist`, no build step and no `dependsOn: ["^build"]`: every package is
**JIT** (ADR-0006), so a consumer type-checks this package's source directly and a type error here
surfaces in `apps/web`'s `check-types`. There is also no `oxfmt.config.mts` — the formatter reads
files rather than the package graph, and the root config covers the repo.

## 2. `package.json`

```jsonc
{
  "name": "@repo/consent",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  // ADR-0006's strongest enforcement mechanism. Exactly one entry: nothing else in the package is
  // reachable, enforced by Node resolution and TypeScript, with no linter involved. `@repo/db` is
  // the one exception, and it is already spent — `./schema` and `./testing`.
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "lint": "oxlint --type-aware --max-warnings 0",
    "check-types": "tsc --noEmit",
    "test": "vitest run",
  },
  "dependencies": {
    "@repo/db": "workspace:*",
    "@repo/people": "workspace:*",
    "drizzle-orm": "^0.45.2",
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@types/node": "^22.15.3",
    "oxlint": "1.78.0",
    "oxlint-tsgolint": "7.0.2001",
    "typescript": "7.0.2",
    "vitest": "^4.1.11",
  },
}
```

`workspace:*` for every internal dependency. **Only what the tier above allows** — pnpm will not
resolve an import of a package absent from this file, which is the second enforcement mechanism.

## 3. `tsconfig.json`

```jsonc
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    // Overrides base.json's NodeNext. Every domain package is resolved by a *bundler* — Turbopack
    // for `apps/web` — and **Turbopack does not rewrite `.js` to `.ts`**, so a NodeNext-style
    // `import "./client.js"` type-checks here and then fails `next build` with
    // "Can't resolve ./client.js".
    "module": "Preserve",
    "moduleResolution": "Bundler",
    "noEmit": true,
    // `globals: true` in the Vitest config. Setting `types` at all disables automatic `@types/*`
    // inclusion, which is why `node` is named explicitly rather than inherited.
    "types": ["vitest/globals", "node"],
  },
  // `vitest.config.ts` is included so it is type-checked too — a config that imports the harness
  // is exactly where a resolution mistake hides, and `check-types` is what would otherwise miss it.
  "include": ["src", "vitest.config.ts"],
  "exclude": ["node_modules"],
}
```

## 4. `turbo.json`

```jsonc
{
  "$schema": "https://turborepo.dev/schema.json",
  "extends": ["//"],
  // One tag per package, and the root config's `boundaries.tags` gives it an exact allow list.
  "tags": ["consent"],
  // Not optional, and not decorative. `eslint-plugin-turbo` — which oxlint runs through its JS
  // plugin bridge for `turbo/no-undeclared-env-vars` — reads the *nearest* turbo.json and calls
  // `Object.entries()` on its `tasks`. Without this, `pnpm lint` fails to start in this package.
  "tasks": {},
}
```

Then add the tag to the root `turbo.json`:

```jsonc
"consent": { "dependencies": { "allow": ["config", "db", "people"] } }
```

…and to the allow list of everything above it, `app` included. `pnpm boundaries` fails until both
sides agree, which is the point: a new module names what it may reach on the day it is created.

## 5. `oxlint.config.mts`

```ts
import { defineConfig } from "oxlint";

import baseConfig from "../../oxlint.config.mts";

export default defineConfig({ extends: [baseConfig] });
```

The file exists even when it adds nothing, because oxlint resolves the **nearest** config to each
file: without it the package rides silently on the root config, and the day it needs a rule of its
own there is nowhere obvious to put it. Add React only for a package that renders (ADR-0018).

## 6. `vitest.config.ts`

```ts
import { globalSetupPath } from "@repo/db/testing/config";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    globalSetup: [globalSetupPath],
  },
});
```

**`@repo/db/testing/config`, not `@repo/db/testing`**, and the difference is not cosmetic. Vite
_externalises_ a workspace import in a config file, so Node resolves it rather than a bundler — and
the extensionless relative imports every JIT package uses do not resolve there. `…/testing/config`
imports nothing but `node:url` for that reason. `@repo/db/testing` is what a **test file** imports,
where Vite's transform applies and bundler resolution holds.

One config per package, never one at the root: a single root configuration would grow one cache key
across every package and re-run everything on every change. `environment: "node"` everywhere — there
is no jsdom in this repo.

`globalSetup` replays the migrations into one PGlite per run and dumps it; each worker restores that
dump in about 120ms. Omit it only if the package has no function taking a `Db | Tx`, which for a
domain module means almost never.

## 7. The table, and the line it obliges you to write

Tables live in `@repo/db`, grouped by owner — `packages/db/src/schema/consent.ts`, re-exported from
`src/schema/index.ts` (ADR-0006: the schema is central because Drizzle's relations API defeats the
split). Use ADR-0008's spreadable helpers from `packages/db/src/columns.ts` — `id()`, `seededId()`,
`publicId()`, `timestamps()`, `createdAt()` — so that violating a convention takes deliberately not
using one. `publicId()` mints ADR-0003's UUIDv7 through the `uuid` package rather than a Postgres
extension, so the value is identical in Postgres, in PGlite and in a test with no database. `personRef()` is deliberately absent until the `persons` table exists, because a helper
referencing a table that does not exist cannot be written.

**Then add a line to `packages/db/src/lifecycle.ts`.** Every table, not only those with a foreign key
to `persons` (ADR-0034):

```ts
consents: { erasure: "evidence", term: "5 years from account closure" },
```

`lifecycle.invariant.test.ts` enumerates the schema reflectively and turns the build red for any
table with no entry. The classifications are `with-person`, `links-severed`, `evidence`,
`impersonal` and `expires` — the last meaning _personal data erasure cannot reach, bounded only by
its own term_, which is how an IP-keyed counter gets written down honestly instead of not at all.
The `term` string is read by a data subject: ADR-0021 generates the published _política_'s retention
schedule from these declarations, so write it for them.

Then `pnpm db:generate` and commit the migration. `pnpm db:check` fails on a schema edit whose
migration was never generated, on an edited applied migration, on a hand-edited journal, on an
unmarked destructive statement, on any `CONCURRENTLY`, and on a journal whose timestamps do not
strictly increase.

That last one is the one to know about before it fires. If another branch merged a migration while
yours was open, yours is now stamped _earlier_ than one already applied — and drizzle-orm skips such
a migration silently, forever. **Rebase and run `pnpm db:generate` again** so it is stamped last.

## 8. What the module exports, and what it never does

Every module function takes the handle as its **first argument** — `(db: Db | Tx, …)` — and no
module imports the pool singleton. ADR-0006 built that seam for a legal reason: a module holding the
singleton would write outside its caller's transaction, and a rollback would leave contact details
disclosed for an offer that was never accepted.

The **public type** crossing the entry point is derived with `drizzle-zod` and omits the internal
`bigint` key, so ADR-0003 is a compile error rather than a review note:

```ts
export const Consent = createSelectSchema(consents).omit({ id: true, personId: true });
```

Only the owning module writes to its own tables. Cross-module _reads_ are fine and often wanted —
`matching` joins across four modules' tables to avoid N+1 — and this half is a review convention,
because the DAG constrains logic and not SQL.

## 9. Where a test may be written

**Two seams and nothing else** (ADR-0017): a module function exported from this package's
`index.ts`, and a use case in `apps/web/src/use-cases/`. Server Action adapters, React components,
module internals and anything importing `next/*` are not seams.

**The signature decides the kind of test.** Takes a `Db | Tx` → integration, against the harness.
Takes no handle → unit. **The database is never mocked.**

```ts
import { withRollback } from "@repo/db/testing";

it(
  "records the consent",
  withRollback(async (tx) => {
    await grantConsent(tx, personId, "safety");
    expect(await hasConsented(tx, personId, "safety")).toBe(true);
  }),
);
```

Tests are colocated as `src/**/*.test.ts` and are in scope for lint and type-check. Fixtures live in
this package and are duplicated from every other package's, deliberately and forever — a shared
fixtures package would make the harness depend on the modules whose tests depend on the harness,
inverting the DAG.

Three rules that are not style preferences:

- **Never assert on a generated `bigint` id.** Identity sequences do not roll back with the
  savepoint, so those values depend on file execution order. ADR-0003 already made the app-side
  UUIDv7 `public_id` the identifier anything outside the database uses.
- **Nothing concurrent is testable.** PGlite is single-connection. A decision that depends on
  concurrent transactions says so in its own ADR rather than pretending otherwise.
- **Nothing requiring a real commit is observable.** The test rolls back.

Test-first is **mandatory for Invariant Tests and use cases**, and free choice for module functions.
An **Invariant Test** guards a decision rather than a feature: named `<name>.invariant.test.ts`,
colocated with the code it guards, naming its ADR in a header comment, never weakened without
amending that ADR. `grep` is the index.

## 10. The use case, and the adapter over it

Orchestration is a plain function in `apps/web/src/use-cases/`, signature
`(db, actorPersonId, input)`, importing nothing from `next/*`. That is where the transaction
boundary sits, and it is the **primary** seam — a multi-table legal invariant is only observable
there.

The Server Action is a four-line adapter: **auth → parse → call → `revalidatePath`**, inside
`Sentry.withServerActionInstrumentation()`.

```ts
"use server";

export async function recordConsent(input: unknown) {
  return Sentry.withServerActionInstrumentation("recordConsent", async () => {
    const actor = await requireActor();
    const parsed = RecordConsentInput.parse(input);
    const result = await recordConsentUseCase(getDb(), actor.personId, parsed);
    revalidatePath("/mi-cuenta");
    return result;
  });
}
```

**The wrapper is not automatic and is not optional.** Sentry instruments Server Components through
`onRequestError` in `instrumentation.ts`, but a Server Action reports nothing unless it is wrapped
per action. Because the adapter is the only route to a use case, an unwrapped action makes that use
case invisible in production — which is why this belongs to the convention rather than being decided
one action at a time.

Adapters are not tested (ADR-0017). The use case underneath them is.
