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

## Architecture

pnpm workspace + Turborepo monorepo (`apps/*`, `packages/*`), currently the `create-turbo` scaffold
with the `docs` app removed — the README still describes it, so ignore that part.

- `apps/web` — Next.js 16 App Router app (React 19, Turbopack dev, CSS Modules + `app/globals.css`,
  local Geist fonts under `app/fonts/`). The only app.
- `packages/ui` (`@repo/ui`) — shared React components consumed as raw TypeScript source, not built.
  Its `exports` map is `"./*": "./src/*.tsx"`, so `packages/ui/src/button.tsx` imports as
  `@repo/ui/button`. Adding a component file is all that's needed to make it importable; there is no
  index barrel and no build step. `turbo gen react-component` scaffolds one.
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
- TS is strict with `noUncheckedIndexedAccess` and `module`/`moduleResolution: NodeNext`; relative
  imports in non-Next packages need explicit extensions where NodeNext requires them.
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
