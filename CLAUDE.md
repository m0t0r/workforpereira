# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Run from the repo root (pnpm 9, Node >= 18). Turborepo fans tasks out to every workspace:

```sh
pnpm dev            # next dev on port 3000 (persistent, uncached)
pnpm build          # next build
pnpm lint           # eslint --max-warnings 0 everywhere
pnpm check-types    # next typegen + tsc --noEmit
pnpm format         # prettier --write "**/*.{ts,tsx,md}"
```

Scope to one workspace with a filter, e.g. `pnpm exec turbo dev --filter=web` or
`pnpm exec turbo check-types --filter=@repo/ui`. Single-workspace scripts can also be run directly
with `pnpm --filter web <script>`.

There is no test runner configured in this repo yet.

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
- `packages/eslint-config` (`@repo/eslint-config`) — flat ESLint configs exported as `./base`,
  `./next-js`, `./react-internal`. Each workspace's `eslint.config.*` just re-exports one of these.
- `packages/typescript-config` (`@repo/typescript-config`) — `base.json` plus `nextjs.json` /
  `react-library.json`, which each workspace `extends`.

Cross-workspace deps use `workspace:*`. Because `@repo/ui` ships source rather than a `dist`,
consumers type-check its code directly — a type error in `packages/ui` surfaces in `apps/web`'s
`check-types`, and `build`/`lint`/`check-types` all declare `dependsOn: ["^..."]` so upstream
packages run first.

## Conventions worth knowing

- `eslint-plugin-only-warn` downgrades every rule to a warning, but scripts run with
  `--max-warnings 0`, so warnings still fail the task.
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
