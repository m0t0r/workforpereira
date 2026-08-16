# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Run from the repo root (pnpm 9, Node >= 24 — the active LTS line, pinned in `.nvmrc`). Turborepo
fans tasks out to every workspace:

```sh
pnpm dev            # next dev on port 3000 (persistent, uncached)
pnpm build          # next build
pnpm lint           # oxlint --type-aware --max-warnings 0 everywhere
pnpm check-types    # next typegen + tsc --noEmit
pnpm format         # oxfmt — writes the whole repo in place
pnpm format:check   # oxfmt --check — same thing, read-only
```

`format` and `format:check` are root scripts rather than turbo tasks, and oxfmt is a root-only
devDependency: a formatter reads files, not the package graph. There is no per-workspace
`oxfmt.config.mts` to write when you add a package — the root one covers it.

Scope to one workspace with a filter, e.g. `pnpm exec turbo dev --filter=web` or
`pnpm exec turbo check-types --filter=@repo/ui`. Single-workspace scripts can also be run directly
with `pnpm --filter web <script>`.

**There is no test runner wired up yet.** ADR-0017 decides what one looks like; nothing below it is
implemented, so `pnpm test` does not exist and neither do the configs. Read the Testing section as the
spec to build against, not as a description of the repo.

### Database

From a clean clone, two steps stand up a working database (Docker must be running):

```sh
cp .env.example .env   # one file, at the root, is the single source for local config
pnpm bootstrap         # pnpm install && pnpm db:up && pnpm db:migrate
```

Named `bootstrap`, not `setup`: **`pnpm setup` is a built-in pnpm command** that creates `PNPM_HOME`
and edits your shell rc file. pnpm resolves built-ins before package scripts, so a script called
`setup` is silently unreachable — you would get a modified `~/.zshrc` and no database.

Then:

```sh
pnpm db:up          # start Postgres, blocking until its healthcheck passes
pnpm db:down        # stop it, keeping the data
pnpm db:reset       # destroy the volume and rebuild from migrations — the from-zero path
pnpm db:generate    # drizzle-kit generate (add --custom for a hand-written migration)
pnpm db:migrate     # apply pending migrations
pnpm db:studio      # drizzle-kit studio
pnpm db:psql        # psql shell in the container
```

The local container is **`postgres:18.6-trixie`**, pinned to the exact patch PlanetScale runs
(ADR-0004), UTF-8 / `en_US.UTF-8` / UTC. Debian rather than Alpine because musl has no real locale
support, which would make Spanish text sort differently locally than in production.

`DATABASE_URL` lives in the **repo-root `.env`** only. Docker Compose reads it natively;
`@repo/db` reads it by walking up to the workspace root, so there is never a second copy to drift.
In production the walk finds nothing and the value comes from the environment (Fly secrets,
ADR-0005).

**Extensions are created by migration `0000_enable_extensions.sql`, not by a container init
script** — an init script runs only on a brand-new volume and has no counterpart on PlanetScale.

**PlanetScale does not restore extensions from a backup, and `pnpm db:migrate` will not fix that**:
a restore also brings back `drizzle.__drizzle_migrations`, which already lists migration `0000` as
applied, so the runner reports nothing to do while `pg_trgm` and `unaccent` are missing. Post-restore
recovery means running those `CREATE EXTENSION` statements explicitly — a runbook step #15 owns.

**Migrations are append-only, and destructive changes take two releases** (ADR-0017; `pnpm db:check`
enforces all three, though it is not built yet):

- Never edit a migration that has been applied, and never edit `meta/_journal.json` by hand. A rebuilt
  database would get one schema and production would keep another, silently.
- `src/schema/*.ts` and `migrations/` must agree: running `drizzle-kit generate` on a clean tree must
  emit nothing.
- `DROP TABLE`, `DROP COLUMN`, `ALTER COLUMN … SET NOT NULL`, `ALTER COLUMN … TYPE`, `DROP CONSTRAINT`
  and `RENAME` are destructive. A migration containing one needs a marker naming the earlier migration
  that made it safe — `-- destructive: completes 0014_add_nullable_x` — and that migration must
  **already be on `dev`**. Under ADR-0005's rolling deploy, old and new code share one schema, so the
  expand and the contract are two releases and may not share a pull request.

### Testing

Decided in **ADR-0017**, not yet built. Vitest 4, one `vitest.config.ts` per package, registered as a
turbo `test` task. The pull-request gate is `turbo run lint check-types test db:check`.

**A test may only be written at two seams**: a module function exported from a `@repo/*` package's
`index.ts`, or a use case in `apps/web/src/use-cases/`. Server Action adapters, React components,
module internals and anything importing `next/*` are not seams.

**The signature decides the kind of test.** Takes a `Db | Tx` → integration test on a real database.
Takes no handle → unit test. **The database is never mocked.**

Integration tests run on **PGlite behind `pglite-socket`** over TCP, with `pg.Pool({ max: 1 })` and
`drizzle-orm/node-postgres` — so `Db` stays `NodePgDatabase<typeof schema>` and tests use the same
driver as production. The harness is `@repo/db/testing`; `pglite`/`pglite-socket` are devDependencies
there. CI needs no database service container. **There is no shared fixtures package and cannot be** —
it would invert ADR-0006's DAG — so fixtures are duplicated per package on purpose.

The schema comes from **replaying the migrations**, never from `src/schema/*.ts`: migrated once per run
in `globalSetup` (~1.0s), dumped, then `loadDataDir` per worker (~120ms). Pass `pg_trgm` and `unaccent`
via `extensions` at **both** create sites or migration `0000` fails. Isolation is a **savepoint rolled
back per test**, one PGlite per worker — so **never assert on a generated `bigint` id**, because
identity sequences do not roll back.

An **Invariant Test** guards a decision rather than a feature. It exists because an ADR requires it,
is named `<name>.invariant.test.ts`, is colocated with the code it guards, names its ADR in a header
comment, and is never weakened without amending that ADR. `grep` is the index. **Adding a table with a
foreign key to `persons` requires declaring its erasure classification** beside the table definition —
the erasure invariant enumerates tables reflectively and fails on any that has not.

Tests are colocated as `src/**/*.test.ts`, in scope for lint and type-check, `globals: true`
(so each tsconfig needs `"types": ["vitest/globals", "node"]` — naming `node` is required, because
setting `types` at all disables automatic `@types/*` inclusion). `environment: "node"` everywhere; no
jsdom. Coverage is reported on pull requests and **never gated**.

Test-first is **mandatory for Invariant Tests and use cases**, free choice for module functions.

**Not tested in v1, deliberately**: React components, Server Action adapters, async Server Components
(Vitest cannot render them at all), visual regression, accessibility (manual WCAG 2.2 AA), anything
concurrent (PGlite is single-connection), and **all browser end-to-end testing including Playwright** —
which leaves the signup consent-evidence path with no automated guard, named in ADR-0017 as the first
gap to close after v1.

## Architecture

pnpm workspace + Turborepo monorepo (`apps/*`, `packages/*`), currently the `create-turbo` scaffold
with the `docs` app removed — the README still describes it, so ignore that part.

- `apps/web` — Next.js 16 App Router app (React 19, Turbopack dev, CSS Modules + `app/globals.css`,
  local Geist fonts under `app/fonts/`). The only app.
- `packages/ui` (`@repo/ui`) — shared React components consumed as raw TypeScript source, not built.
  Its `exports` map is `"./*": "./src/*.tsx"`, so `packages/ui/src/button.tsx` imports as
  `@repo/ui/button`. Adding a component file is all that's needed to make it importable; there is no
  index barrel and no build step. `turbo gen react-component` scaffolds one.
- `packages/db` (`@repo/db`) — tier 0 of the ADR-0006 module DAG: every table, the pool singleton,
  the `Db`/`Tx` types, `drizzle.config.ts` and the migrations. drizzle-kit is the sole owner of
  migrations. `src/schema/index.ts` is deliberately empty — no table has been designed yet.
- `packages/typescript-config` (`@repo/typescript-config`) — `base.json` plus `nextjs.json` /
  `react-library.json`, which each workspace `extends`.

There is no lint-config package (ADR-0018). The root `oxlint.config.mts` holds the baseline and each
workspace's own `oxlint.config.mts` imports it into `extends`, adding only what that workspace needs
— React for `packages/ui`, React and Next.js for `apps/web`, nothing for `packages/db`.

Cross-workspace deps use `workspace:*`. Because `@repo/ui` ships source rather than a `dist`,
consumers type-check its code directly — a type error in `packages/ui` surfaces in `apps/web`'s
`check-types`, and `build`/`lint`/`check-types` all declare `dependsOn: ["^..."]` so upstream
packages run first.

## Conventions worth knowing

- **English everywhere except UI copy** (ADR-0001). Code, columns, routes, file names and enum values
  are English; Spanish is confined to what a user reads. **A prototype's own controls are chrome, not
  UI copy, so they are English too** — variant switchers, toggles, state readouts, banners, and the
  search-param values behind them. Only the surface being prototyped speaks Spanish. Same rule for
  seed scripts, CLI output, log messages and test names. Worked example:
  `docs/design/skill-picker-prototype/`.
- **Oxlint is the linter and TypeScript is 7.x — the two are one decision** (ADR-0018). TypeScript 7
  ships no stable programmatic API until 7.1, and typescript-eslint is built on that API and throws
  on sight of TS 7, so the linter had to go before the compiler could move. Don't reintroduce an
  ESLint dependency without reading that ADR: it pins the repo back to TypeScript 6.
- Some rules are `warn` and some `error`, but every script runs with `--max-warnings 0`, so a warning
  fails the task exactly as it did under `eslint-plugin-only-warn`.
- **Oxfmt is the formatter and Prettier is gone** (ADR-0019). It formats every language it recognises
  — TS, JSX, JSON, CSS, Markdown — rather than a glob, so `printWidth` is **100**, `package.json` keys
  are sorted, and `oxfmt.config.mts` carries an ignore list and nothing else. Markdown is still
  Prettier underneath, vendored inside oxfmt. Pinned exact because it is pre-1.0: a formatter that
  changes output in a patch release rewrites the repo.
- **Add a path to `ignorePatterns` before it gets formatted, not after.** Generated or vendored files
  are already listed there — `packages/db/migrations/**`, `.agents/**`, the `apps/landing/` prototype.
  Anything else drizzle-kit, a tool, or a lock file owns belongs there too.
- **Type-aware rules need `--type-aware`**, which hands the files to tsgolint and its own TypeScript
  7 program built from that package's `tsconfig.json`. That program is stricter than
  `tsc --noEmit` about the config itself — an `outDir` with no `rootDir` is an error there and silent
  under `tsc`. `oxlint-tsgolint` tracks TypeScript release-for-release, so bumping TypeScript means
  bumping it in step.
- TS is strict with `noUncheckedIndexedAccess`. `@repo/typescript-config/base.json` sets
  `module`/`moduleResolution: NodeNext`, which requires explicit `.js` extensions on relative
  imports.
- **JIT packages override that to `moduleResolution: Bundler` and drop the extensions** — see
  `packages/db/tsconfig.json`. ADR-0006 makes every domain package raw TypeScript resolved by a
  bundler (Turbopack for `apps/web`, esbuild for drizzle-kit's config loader), and **Turbopack does
  not rewrite `.js` to `.ts`**: a NodeNext-style `import "./client.js"` type-checks and then fails
  `next build` with `Can't resolve ./client.js`. Bundler resolution is also what `apps/web` already
  uses via `nextjs.json`, so this makes a package agree with its only consumer. Apply it to each new
  domain package.
- Components in `packages/ui` that use hooks or handlers need the `"use client"` directive (see
  `packages/ui/src/button.tsx`) since `apps/web` renders on the server by default.

## Agent skills

### Issue tracker

Issues live as GitHub issues on `m0t0r/workforpereira`, managed via the `gh` CLI. See
`docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See
`docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
