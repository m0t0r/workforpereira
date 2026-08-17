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
`pnpm exec turbo check-types --filter=@repo/design-system`. Single-workspace scripts can also be run directly
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
recovery means running those `CREATE EXTENSION` statements explicitly — **`docs/runbook.md` procedure
2**.

**`drizzle-kit migrate` applies every pending migration inside one transaction** (ADR-0024). A failed
run leaves the database untouched, `drizzle.__drizzle_migrations` included, so there is nothing to
unpick — read the error and fix forward. Two things follow: **`CREATE INDEX CONCURRENTLY` can never
appear in a migration** (Postgres refuses it inside a transaction block), and **a backfill over ~10,000
rows is a batched script, not a migration**. Both are out-of-band operations, and v1 has neither.

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
  expand and the contract are two releases and may not share a pull request. **Two is the floor: a
  removal that carries data needs three** — expand, then backfill-and-switch, then contract — and only
  ADR-0024 says so, because the gate cannot see it.

### Deploying

Decided in **ADR-0022** and **ADR-0024**, and **nothing is provisioned**: no Fly app, no PlanetScale
database, no secrets. `.github/workflows/deploy.yml` ships disarmed and names the one edit that arms
it; `docs/runbook.md` carries the checklist that must run first.

`dev` is the trunk. **Merging to it builds the image and deploys nothing**; **staging is deployed by
hand** (`workflow_dispatch`); production deploys **automatically** on a **fast-forward merge of `dev`
into `main`**, with no approval prompt — **the merge is the gate**. The fast-forward is load-bearing:
it keeps the `dev`-built image addressable, so **production deploys an image it did not build**. A
squash or a merge commit breaks that, which is why the merge strategy is not a preference.

**Migrate first, then deploy**, always, on the CI runner as a `migrator` role distinct from the app's.
Rolling back means redeploying a previous image digest and then `git revert` on `main` in the same
session; **the schema never rolls back**, because `drizzle-kit` has no `down` and expand/contract makes
one unnecessary. A restore is data-loss recovery, never a rollback.

**`docs/runbook.md`** holds the executable procedures — migration failure, missing extensions after a
restore, code rollback, machine OOM, health-check-passes-but-site-down, data loss and the 24-hour RPO,
reindex after a major-version move, spend check — plus the provisioning checklist.

`turbo.json` registers `test`, `db:check` and ADR-0017's `transit` node. **No package defines the first
two yet, and that is fine**: turbo errors on an unregistered task and no-ops a registered one nothing
implements, so the real gate command runs green today and needs no edit when the testing lane lands.
CI also needs `TURBO_SCM_BASE=origin/dev` — `--affected` compares against `main`/`master`, never the
configured default branch.

### Scheduled work

Decided in **ADR-0028**, not yet built. **Nothing runs on the Fly machine's own clock** — no
`setInterval`, no `node-cron`, no Fly scheduled Machine. The schedule lives on **trigger.dev Cloud**,
because production's `auto_stop_machines = "off"` hides that staging suspends and `bluegreen` briefly
runs two machines, so a timer that works in production fires never in staging and twice on every
release.

Deploy order becomes `migrate → trigger.dev deploy → flyctl deploy`, all in one job, one gate.

**Two rules that are not style preferences:**

- **No personal data ever crosses to trigger.dev.** A task passes a job name; the drainer's fast path
  passes an outbox row id. trigger.dev stores payloads and outputs for up to 14 days, so anything else
  makes it an _encargado_ needing a `2.2.2.25.5.2` _contrato de transmisión_ and a register entry
  disclosing its 27 subprocessors — two of them generative-AI vendors.
- **A task holds a URL and a secret, never a database connection.** It does
  `POST /api/jobs/<name>`; the work runs in the app. A task with its own connection would sit outside
  both of ADR-0017's testing seams, making a compliance control and the erasure net untestable by this
  repo's own rules. The endpoint does **bounded work per call and reports whether more remains**.

Five jobs, four obligations (**ADR-0015** drainer, **ADR-0020** deadline monitor, **ADR-0010** R2
sweep, **ADR-0021** retention purges) plus the drainer's backstop. Logic lives where it falls —
`@repo/db` (purges, reflective and **leaf-first** over a topological order), `@repo/people` (sweep),
`@repo/consent` (deadline), and a use case for the drainer, which is the only cross-module one.
**There is no `@repo/jobs`**: ADR-0006 already rejected that shape as a "data rights" module.

**The drainer specifically.** Claim with `FOR UPDATE SKIP LOCKED` **inside the sending transaction** —
**there is no `claimed_at` column**, so a killed machine releases its locks and recovers with no
timeout to tune. `tasks.trigger()` after commit is an optimisation; the row is the truth and a
five-minute sweep is the backstop. **The `attempts` column is the only retry authority** — trigger.dev's
own retry is off for this job and bounded-on for the other four, which keep no state of their own.

**Report a failed send to Sentry once**, when the row exhausts its retries — never per attempt. Sentry
Developer allows 5,000 errors/month and a row retried every five minutes produces 8,640, so one poison
row would hide every other error in the product. Per-attempt detail goes in `last_error`.

**Every job pings Healthchecks.io; only the deadline monitor escalates** (Pushover Emergency). Sentry
answers _why did it break_, Healthchecks.io answers _did it run at all_ — Sentry cannot see a job that
never started — and UptimeRobot answers _is the site up_. A watchdog must never share a failure mode
with the alarm it guards, which is why the operator email rides the outbox and the switch does not.

### The public edge

Decided in **ADR-0032**, not yet built, and **production-only** — staging has no Cloudflare zone, so
none of this exists there. It all waits on ADR-0022's custom-domain launch gate.

**Nothing that names, depicts or reveals a Person is cached at the edge** — the rule is about what a
response contains, not what kind of file it is. In practice that means static assets, fonts and the
**landing shell**, and nothing else: never a Wall, never a Public View, and never a `/search/work`
results page, which would serve enumeration without the origin seeing it. That is why leaving takes
effect **immediately** rather than ADR-0011's original "under a minute" — there is no stale copy to
outlive a Pause, an erasure or a `public_id` rotation, and nothing edge-cached can ever need purging.

**The landing page is two cache units, not one — and they need two URLs before that is true at the
edge.** The shell (hero, ADR-0026's three mechanism facts, chrome) holds no personal data and is what
a **long edge TTL** is for. The **Wall strip** holds real people and is **never** edge-cached. But
Cloudflare caches whole responses keyed by URL, so while both are served from `/` they are one entry
and a `<Suspense>` boundary does not divide them: **the shell's TTL waits on the Wall moving to its
own URL, and until then a Cache Rule on `/` would edge-cache real people with no purge behind it.** `stale-while-revalidate` is supported on Free and deliberately used nowhere: the
shell does not need it (it changes only on deploy), and on the Wall it is the specific thing that must
not happen, because with no purge there is no way to cut a stale copy short and what it would extend is
the window in which a Paused, Suspended or Blocked Person is still on the front page.

**If the Wall ever needs help, it is cached at the origin, not the edge** — Next 16 `"use cache"` with a
short `cacheLife` and `revalidateTag()` on Pause, Suspension, Block, unpublish and erasure. The standing
rule: **a cache the application can invalidate may hold a Person; a cache it cannot invalidate may
not.** Next's cache is per-machine, so a blue-green overlap can miss a `revalidateTag` for the drain
window.

**Cloudflare Free gives exactly one rate-limiting rule**, keyed on IP, with a **10-second** counting
period and only `Path` available in its expression. It goes on `/search/work` at **20 requests / 10 s**,
action **Managed Challenge — never `block`**, because Colombian CGNAT makes the shared address normal
and a challenge lets a real person through while a block refuses everyone behind it. **The edge rule
bounds a burst and cannot bound volume**; what makes the public surface a sample rather than an index is
its shape (ADR-0011, ADR-0014), not this rule.

**Bot Fight Mode is deliberately off.** It cannot be excepted on any plan below Pro, so it would
challenge ADR-0028's `/api/jobs/*` callback with no way out, and Cloudflare's own docs call it
aggressive by design. It is the named escalation if scraping actually happens — and `/api/jobs/*` has to
move first.

**The origin refuses anything that did not come through Cloudflare**, on a shared secret header set by a
transform rule and checked in `proxy.ts`, returning **404**. Without it a direct request to the
`.fly.dev` host can pick its own `cf-connecting-ip` and the credential limiter stops existing. It is a
transport gate, not an authorisation boundary — session checks still belong in each Server Function.

**Rate-limit state lives in Postgres. Redis is not in the stack** — refused for the credential limiter,
the search counter and sessions alike, and the reason is not cost (both are $0 at v1 volume). Better
Auth uses `storage: "database"` with `window` **set explicitly**, because its own docs disagree about
the default. `advanced.ipAddress.ipAddressHeaders` is `["cf-connecting-ip", "fly-client-ip"]`.

Two counters are ours rather than Better Auth's: **a per-address failed-sign-in counter** in
`@repo/auth` (10/hour → a self-clearing 15-minute refusal, keyed on an HMAC of the _submitted_ address
so it leaks nothing about whether the account exists, and it **never blocks password reset**), and
**`search_quotas`** in `@repo/matching` (200 searches per Person per day). The second one **may never
record what was searched** — ADR-0014 refuses a search log, and the quota is how many, not what.

**`/api/jobs/*` is not rate limited, by decision** — limiting a scheduled job risks silently disarming
ADR-0020's deadline monitor.

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

pnpm workspace + Turborepo monorepo (`apps/*`, `packages/*`). What is left of the `create-turbo`
scaffold is the Turborepo tooling: its `docs` app is gone, `apps/landing/` is gone, and the README
now describes the repo rather than the starter.

- `apps/web` — Next.js 16 App Router app (React 19, Turbopack dev, Tailwind v4). The only app, and
  it holds the landing page: `app/page.tsx` composes `app/_landing/*`. ADR-0032 makes that page
  **two cache units** — a shell holding no personal data, and a Wall strip holding real people that
  may never be cached where the application cannot invalidate it. The `<Suspense>` boundary in
  `page.tsx` is a **render** boundary and is explicitly _not_ that split: one URL is one edge cache
  entry, so the two units need two URLs (see The public edge above). **Nothing enforces it yet**:
  ADR-0032 is production-only with no zone provisioned, and `app/_landing/wall.ts` returns
  **nothing in production** — and `app/_landing/wall-fixtures.ts` outside it, gated on `NODE_ENV`
  and announced on screen by `WallFixtureNotice`, so the page can be judged as a page without
  fictional people ever reaching a build. The real reader moves into
  `@repo/matching` with the public Need projection (ADR-0030) when that package exists, and takes
  the Wall's bound and its daily rotation with it. It
  owns no stylesheet of its own: `app/layout.tsx` imports `@repo/design-system/globals.css`, and
  `postcss.config.mjs` re-exports the design system's. Fonts are Inter (body), Figtree (headings)
  and Geist Mono, all via `next/font/google`, which self-hosts them at build time — nothing is
  fetched from Google at runtime. **The pairing is a decision recorded in ADR-0029, not an
  inheritance**: `shadcn info` reports the preset as `font: "inter"` with `fontHeading: "inherit"`,
  so the preset never specified a heading face. **There is no dark mode** (ADR-0029) — `next-themes`
  is gone and a `.dark` block fails the contrast gate.
- `packages/design-system` (`@repo/design-system`) — shadcn/ui components as raw TypeScript source,
  not built. **Base UI underneath, not Radix** (the preset's `vega` style), so custom triggers use
  `render`, never `asChild` — and **`render` with anything that is not a `<button>` needs
  `nativeButton={false}` beside it**. Base UI defaults that prop to `true`, which merges
  `type="button"` onto whatever it renders and logs a console error on every dev page load;
  `<Button render={<Link href="/x" />} nativeButton={false}>` in `apps/web/app/_landing/` is the
  shape to copy. Its `exports` map is shadcn's monorepo convention, so
  `src/components/button.tsx` imports as `@repo/design-system/components/button`. There is no index
  barrel and no build step. **Add components with the CLI, scoped to this workspace** — `pnpm dlx
shadcn@latest add <name> -c packages/design-system` — rather than by hand: it owns the registry,
  the import rewriting and the CSS diffing. **`packages/design-system/README.md` is the design
  reference** — the token layer, the accessibility bar, motion and layout rules, and the surviving
  half of the deleted `apps/landing/NEXTJS_HANDOFF.md`, which it superseded. Its token rules are
  ADR-0029's:
  `--brand-*` is a private ramp and the semantic names are the seam, `--border` and `--input` are
  different jobs and must never be collapsed into one value, and after any edit to `globals.css`
  run `pnpm --filter @repo/design-system check-contrast` — it parses the real file and is in the
  pull-request gate.
- `packages/db` (`@repo/db`) — tier 0 of the ADR-0006 module DAG: every table, the pool singleton,
  the `Db`/`Tx` types, `drizzle.config.ts` and the migrations. drizzle-kit is the sole owner of
  migrations. `src/schema/index.ts` is deliberately empty — no table has been designed yet.
- `packages/typescript-config` (`@repo/typescript-config`) — `base.json` plus `nextjs.json` /
  `react-library.json`, which each workspace `extends`.

There is no lint-config package (ADR-0018). The root `oxlint.config.mts` holds the baseline and each
workspace's own `oxlint.config.mts` imports it into `extends`, adding only what that workspace needs
— React for `packages/design-system`, React and Next.js for `apps/web`, nothing for `packages/db`.

Cross-workspace deps use `workspace:*`. Because `@repo/design-system` ships source rather than a
`dist`, consumers type-check its code directly — a type error there surfaces in `apps/web`'s
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
  are already listed there — `packages/db/migrations/**`, `.agents/**`, `pnpm-lock.yaml`. Anything
  else drizzle-kit, a tool, or a lock file owns belongs there too.
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
- Components in `packages/design-system` that use hooks or handlers need the `"use client"`
  directive since `apps/web` renders on the server by default. shadcn adds it where required; the
  `button` does not need it.

## Agent skills

### Issue tracker

Issues live as GitHub issues on `m0t0r/workforpereira`, managed via the `gh` CLI. See
`docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See
`docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
