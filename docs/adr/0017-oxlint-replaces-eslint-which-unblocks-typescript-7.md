# Oxlint replaces ESLint, which is what unblocks TypeScript 7

Linting is **oxlint 1.78.0**, with type-aware rules supplied by **`oxlint-tsgolint` 7.0.2001**, and
TypeScript is pinned to **7.0.2** in every workspace. `@repo/eslint-config` is deleted, along with
`eslint` and its nine plugins. Configuration is a root `oxlint.config.mts` that each workspace's own
`oxlint.config.mts` imports into `extends`.

These read as two changes and are one. **TypeScript 7.0 ships without a stable programmatic API —
that is deferred to 7.1 — and typescript-eslint is built on that API.** It does not degrade; it
throws on import. So the repo could keep ESLint or move to TypeScript 7, and moving the linter was
the cheaper half. Facts observed 2026-08-16; TypeScript 7.0.2 was released 2026-07-08.

## Why

**The blocker is not theoretical, and it was reproduced here before anything was decided.** Bumping
TypeScript to 7.0.2 makes `pnpm install` report `unmet peer typescript@">=4.8.4 <6.1.0"` seven times
across the typescript-eslint tree, and any command that loads the flat config dies on
`Error: typescript-eslint does not support TS 7.0.` Nothing else in this repo objected. `tsc --noEmit`
passed across all three workspaces in 2.1s, `next build` passed with its TypeScript phase at 232ms,
and `drizzle-kit` was unaffected because it loads `drizzle.config.ts` through esbuild rather than the
compiler API.

**Next.js had already solved its half of this.** `next build` used to invoke the compiler through the
JS API, which is exactly what TypeScript 7 removed; Next 16.3 invokes the `tsc` binary instead, under
`experimental.useTypeScriptCli` — and that flag **defaults to `true`** in the version already
installed here. So the app needed no configuration change at all. This is worth recording because the
public advice at the time was to run TypeScript 6 and 7 side by side through `@typescript/typescript6`
and npm aliases. That workaround exists for repos whose blocker is the framework. Ours was only ever
the linter.

**Keeping ESLint had a real price and no upside.** It meant either staying on TypeScript 6 —
declining an 8–12x compiler for a linter — or carrying two TypeScript installations and an alias, a
permanent seam in a repo maintained by one person. Against that, oxlint is a straight substitution:
`@oxlint/migrate` mapped the existing config 1:1, and the removal took **157 packages out of the lock
file and added 1**.

**Type-aware linting is the part that makes this an improvement rather than a lateral move.** It is
the same engine underneath — tsgolint builds a real TypeScript 7 program — and it covers 59 of
typescript-eslint's 61 type-aware rules. Four are enabled: `no-floating-promises`,
`no-misused-promises`, `await-thenable` and `no-unnecessary-condition`. Those are the mistakes a
Drizzle data layer actually makes, and ADR-0006 has ten packages of it coming. This capability was
**unreachable under the old stack** — not slow, unavailable — because typescript-eslint cannot run on
TypeScript 7 at all. Whole-repo lint including type-aware rules is 1.9s.

**The rule set is the old one, deliberately.** oxlint's `correctness` category is a superset of what
this repo linted before, so it is switched **off** and the 115 migrated rules are listed explicitly
— 77 in the baseline, 17 more for React, 21 more for Next.js.
Changing linter and rule set at once would mean every new diagnostic arrives as an unreviewed
opinion. Adopting `correctness` is a follow-up someone should choose on purpose.

## Accepted risks

- **One rule is lost outright.** `@next/next/no-location-assign-relative-destination` has no oxlint
  implementation. It fires on `location.assign` with a relative destination, which this app does not
  do. It is the only rule oxlint reports as not yet implemented. For `apps/web`, the widest of the
  three configs, `@oxlint/migrate` skipped 9 rules in total: that one, 2 it classes as nursery
  (`no-undef`, `react/require-render-return`) and 6 it will not implement (`no-dupe-args`,
  `no-octal`, `react/jsx-uses-react` among them) — those last being rules TypeScript already enforces
  or that the modern JSX transform made dead.
- **`turbo/no-undeclared-env-vars` runs on an alpha bridge.** There is no Rust port, so oxlint loads
  the real ESLint plugin through its JS plugin support, which its own documentation calls alpha and
  **not subject to semver**. The rule is verified working. If the bridge breaks, the rule goes quiet
  and `turbo.json`'s `globalEnv` loses its guard — an undeclared env var is invisible to the cache
  key, and Turbo will replay a build made against a different value. That failure is silent, which is
  the reason it is written down here.
- **TypeScript config files are themselves an experimental oxlint feature**, loaded through Node
  rather than the Rust binary. `.oxlintrc.json` is the conservative format and the fallback if this
  proves unstable; the rule content is format-independent, so reverting is mechanical.
- **`oxlint-tsgolint` versions track TypeScript release-for-release.** TypeScript cannot move ahead of
  it. A TypeScript 7.1 bump waits for a matching tsgolint, and 7.1 is the release that restores the
  programmatic API — so it is also the release that could make this whole ADR reversible.
- **Editor integration changes for anyone cloning this.** The ESLint extension now has nothing to
  read; oxlint's own extension is the replacement. There is no in-repo signal of that beyond this
  ADR.
- **`no-unnecessary-condition` is the one type-aware rule with a history of false positives**,
  particularly around `noUncheckedIndexedAccess`, which this repo sets. It is clean on today's four
  source files, which is a weak test. If it becomes noise, drop it and keep the other three.
- **The minimum Node version rose to 24**, pinned in a new `.nvmrc`. `engines` previously said
  `>=18`, which was already wrong — Next 16 requires 20.9 and oxlint requires `^20.19 || >=22.12` —
  and TypeScript config files need Node's own type stripping, which lands properly in 22.18. Rather
  than encode that thicket, the floor is the active LTS line (Krypton, LTS until April 2028), which
  is what development already runs. Anyone on an older Node is now told so by `pnpm install` instead
  of by a confusing runtime failure. Nothing deploys yet — there is no Dockerfile and no CI — so this
  is a local-development contract for now, and whatever Fly.io image ADR-0005 eventually gets should
  be built from the same line.

## Consequence

- **`packages/eslint-config` is gone**, and lint config is no longer a workspace package. oxlint
  resolves the *nearest* config to each file, and `extends` composes objects by import, so a package
  earns nothing here. Every workspace keeps its own `oxlint.config.mts`, so per-package `turbo lint`
  and `--filter` work unchanged.
- **`packages/ui/tsconfig.json` gains `rootDir: "src"`.** tsgolint's program refuses a config where
  `outDir` leaves the output layout ambiguous. `tsc --noEmit` never had to resolve it, so this
  surfaced only once type-aware linting started loading the same file — the first thing the new
  linter found.
- **`eslint-config-prettier` is not replaced.** It existed to switch off ESLint's stylistic rules;
  none of the 119 rules kept here is a formatting rule, so there is nothing for Prettier to collide
  with. Prettier remains the formatter and `pnpm format` is unchanged.
- **New domain packages (ADR-0006) get an `oxlint.config.mts` that imports the root config**, in the
  same motion as their `tsconfig.json`. `packages/db/oxlint.config.mts` is the template for a package
  that needs nothing beyond the baseline.
- **Revisit when TypeScript 7.1 lands.** It restores the programmatic API and typescript-eslint
  support becomes possible again. That is the moment to ask whether this decision still pays — though
  by then the argument for going back is only familiarity, and the speed argument will have grown.
