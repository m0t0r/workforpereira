# Two environments, one artifact, one human gate

Issue #15 asked how code gets from a pull request to production. Most of the mechanism was already
fixed elsewhere and is recorded here only so nobody reopens it: ADR-0005 puts a long-lived Node
server on Fly.io in `iad` and states in its consequences that **`drizzle-kit` migrations run on a CI
runner against the direct 5432 connection string** — the same answer on both candidate hosts, so
settled independently of the host choice. ADR-0004 bought two PS-5 Postgres databases in
`us-east-1`. ADR-0017 fixed the pull-request gate as `turbo run lint check-types test db:check` and
built the destructive-migration check, leaving the workflow file and the deploy gates here. The
migration half of this ticket is ADR-0024; this ADR is the environments and the pipeline around it.

Nothing is deployed and nothing is provisioned. The `workforpereira` PlanetScale organisation was
created on 2026-08-16 and holds **zero databases**, with no payment method. `apps/web` is still the
`create-turbo` scaffold. So every decision here is written for an application that does not exist —
cheap now, expensive later, exactly as ADR-0017 said of the testing conventions.

## `dev` is the trunk, `main` is what is running

`dev` is the default branch. Merging to it **builds the image and deploys nothing**. **Staging is
deployed by hand**, from that image, whenever someone wants to rehearse against it. Production is a
**fast-forward merge of `dev` into `main`**, and `main` deploys **automatically**.

The alternative was release tags. `main` already exists and does nothing, and a branch buys one
thing a tag does not: _what is in production_ becomes a git ref you can `git log`, diff and revert,
rather than a deploy history you must open a vendor dashboard to read. For a solo developer with no
second pair of eyes, the environment that can be inspected with the tool already open wins.

**The fast-forward is load-bearing, not stylistic.** Because `main` only ever advances to a commit
that already exists on `dev`, the image built when that commit merged to `dev` is still addressable
when it merges to `main`. So production **deploys an image it did not build**, with no rebuild —
the same one staging ran, if staging was run at all. "It worked on staging" stops being a claim
about a build and becomes a statement about the same bytes. A merge commit, a squash, or a
cherry-pick all break this by producing a SHA that was never built, which is why the merge strategy
is part of the decision rather than a preference.

**This is also why merging to `dev` still builds.** Nothing is deployed by that merge, and building
an image for an environment nobody may deploy looks like waste — but it is what keeps the promotion
property true once staging is manual. Building on `main` instead would mean production compiled its
own artifact, and the guarantee would quietly become a claim about a Dockerfile rather than about
bytes. Actions is free on a public repository, so the build costs wall-clock and nothing else.

## The merge is the gate

Staging is deployed by hand and gated by nobody. Production deploys automatically on merge to
`main`, and `environment: production` exists for secret scoping and the deployment record rather
than for a pause.

`planetscale-postgres-safety-review` asks for _"an explicit human-approved deployment step"_ before
production DDL, and this satisfies it — **the fast-forward merge into `main` is that step.** Nothing
advances `main` by accident: it is a deliberate act, taken by the one person who would also have
clicked the approval, on a change they wrote. Layering a reviewer prompt in front of it would ask
the same human to confirm a decision they had just made thirty seconds earlier, which is the shape
of gate that gets clicked without reading — and a gate that is always approved is worse than no
gate, because the record says a human considered it.

The position still matters, and is unchanged: ADR-0024 applies migrations **before** the deploy, and
a migration is the only step in this pipeline that cannot be undone by redeploying something. The
deliberate act therefore sits in front of the one action with no inverse.

**The honest cost is that the window between deciding and deploying is now zero**, so a merge to
`main` made in error reaches production before it can be reconsidered. That is survivable only
because rolling back is cheap and well-drilled — a previous image digest plus a revert, runbook
procedure 3 — and because ADR-0024 means the schema does not move when it happens. If either of
those stops being true, this is the first decision to reopen; attaching a required reviewer to the
`production` environment is a one-setting change and needs no ADR to undo.

## 512 MB, which ADR-0005 could not have known

Both machines are **512 MB `shared-cpu-1x`** with a Fly swap file, staging autostopped
(`min_machines_running = 0`).

ADR-0005 costed Fly at $6.50–9.50/month for the pair and recorded, as an accepted risk, that the
1 GB machine size behind those numbers was **an unverified assumption** — _"at 512 MB Fly is cheaper
than Cloudflare and at 2 GB clearly worse, so the margin is sensitive to a number we have not
measured."_ It still is unmeasured, because there is no application. What has changed is that the
image is built in GitHub Actions and pushed to Fly's registry, so **the machine never compiles
anything** and its memory ceiling is a runtime question about a Next.js Node server rather than a
build question. At `observability.md`'s own $3.19/machine in `iad`, the pair lands near $3.70–4.20
against the $6.50–9.50 assumed, which _creates_ headroom against #18's real remainder of
$4.46–$7.46 rather than spending it.

This is deliberately the reversible direction. Resizing up is a `fly.toml` line and a redeploy;
Fly's free managed Prometheus already exposes the memory graph that would justify it. Starting at
1 GB and never revisiting is the failure mode that costs money silently for a year.

## Staging exists, and it is not a luxury

Staging is the cheapest half of the pair — a suspended machine and a database ADR-0004 already
bought — and the temptation for a solo developer is to skip it.

It stays because **it is the only place PlanetScale-specific behaviour is exercised at all.**
ADR-0017 lists what v1 deliberately does not test and names PlanetScale explicitly: _"Traffic
Control, its extension set, its backup semantics."_ PGlite cannot reach any of them, and the local
Docker Postgres is an ordinary `postgres:18.6-trixie` with no vendor behaviour in it. Without
staging, the first contact between this application and its actual production database vendor would
be production. The restore drill in ADR-0024 and the extension hazard in
`0000_enable_extensions.sql` both need somewhere to be rehearsed, and this is it.

## No preview environments, and the reason is not only money

Pull requests get no ephemeral environment.

Three things stack. PlanetScale branching is **paid**, which ADR-0004 accepted as a named risk, so a
preview needs either a billed branch or a database that is not the real thing. A preview app is a
third billed Machine. And ADR-0017 already gives every pull request a real Postgres through
PGlite-over-socket, which is the part that catches defects.

What is left that a preview URL adds is a human looking at a rendered page — and the human who would
look is the author, who has `pnpm dev`. Revisit when there is a second person; the reason will have
changed, and so should the answer.

## Three holders of secrets, and the one that is uncomfortable

- **Local** — the repo-root `.env`, gitignored, holding only the throwaway credentials of a
  container bound to loopback. Unchanged from #17.
- **Runtime** — `fly secrets`, the only place a real credential lives at rest.
- **CI** — GitHub Actions secrets, holding exactly three values: `FLY_API_TOKEN`, and a staging and
  a production `DATABASE_URL`.

That third holder is the consequence worth stating plainly rather than discovering: **because
migrations run on the CI runner, GitHub necessarily holds a production database credential.** No
arrangement of this pipeline avoids it while ADR-0005's consequence stands.

What makes it tolerable is **two roles per database rather than one**. The application connects as
`app` with DML rights; CI connects as `migrator` with DDL rights. The credential CI holds cannot
read a profile; the credential the application holds cannot drop a table. This is the least-privilege
point `planetscale-postgres-safety-review` raises against the default role, and it pays a second
time: rotating the application credential does not break CI, and revoking CI's does not take the
site down.

## Staging is public, and one earlier decision is what makes that safe

Staging serves the same public Wall as production, on a `*.fly.dev` hostname, with `noindex` and a
`robots.txt` and nothing else in front of it.

ADR-0011 set a standing rule that reads like a prohibition on this: _"anything reachable without a
session is permanently public and assumed scraped"_, and that `robots.txt`/`noindex` are **never**
privacy controls. That rule is about **personal data**, and staging has none — this ticket made
"production personal data never leaves production" a hard rule, so staging is seeded from a
generator and holds no `Person` who exists.

The coupling is the point. **Staging's openness is safe only because of the seeding rule**, and the
two must be read together. Restoring a production dump into staging to reproduce a bug would be a
breach in the same instant, and after ADR-0010 that dump carries **photographs**, which are art. 5
sensitive data. There is also no _finalidad_ covering a copy of production into a second
environment. So the seeding rule is not hygiene; it is the control, and it is why staging needs no
gate of its own.

The residue — a second surface that looks like _publicación de vacantes_ for #23's SPE question — is
what `noindex` and `robots.txt` are actually for here: distribution, which is the only job ADR-0011
ever gave them.

## Temporary URLs, and a launch gate that was not visible before

Both environments use their `*.fly.dev` hostnames. There is no custom domain and no Cloudflare zone.

That is right for a repository with no application in it, and it moves something that should be
recorded rather than absorbed. **Two decisions taken elsewhere are specified as Cloudflare edge
mechanisms and have nowhere to live until a zone exists:**

- ADR-0005's _"put Cloudflare's free CDN in front of the Fly origin"_ — the one portable finding #25
  produced.
- ADR-0011's anti-scraping requirement and ADR-0014's rate limiter for public Need search. ADR-0011
  calls this a **launch requirement** in terms that leave no room: _"without a rate limit,
  sample-not-index is a claim rather than a control"_, and its whole Ley 1581 posture rests on that
  control being real.

So **the custom domain is a launch gate, not a cosmetic step.** No zone, no edge; no edge, no
anti-scraping control; no control, and ADR-0011's central argument is unbacked. Naming it here is
cheaper than rediscovering it the week before launch.

The CDN is **production-only** when it arrives. Staging is a test environment kept at the lowest
cost that works, and caching it would add a variable to the one place whose job is to have fewer of
them.

## The developer loop stays in CI

**No Husky, no lint-staged, no pre-commit hook.** The gate is ADR-0017's and it belongs where it
cannot be bypassed with `--no-verify`. A hook running type-check and tests across ADR-0006's ten
packages is slow enough that it will be bypassed, and lint-staged's real value — running the
formatter over staged files only — evaporated with ADR-0019, since oxfmt formats the entire
repository in well under a second.

**The turbo cache is `actions/cache` on `.turbo`, not Vercel Remote Cache.** CI runners are always
cold, so caching genuinely pays; but this map has priced vendor count carefully in every other
decision, and a GitHub-native cache gets the same benefit with no account, no token and no row in
the §6.3 processor register.

## What this ticket found while answering

- **`turbo --affected` compares against `main`/`master`, not the repository's configured default
  branch.** The trunk here is `dev`, so every CI run needs `TURBO_SCM_BASE=origin/dev`. Without it
  `--affected` diffs against a stale `main` and skips nearly everything, silently and green.
- **Turbo errors on tasks that are not registered in `turbo.json`, and no-ops on registered tasks no
  package defines.** So ADR-0017's gate command `turbo run lint check-types test db:check` fails
  today for the wrong reason — `test` and `db:check` are unregistered, not merely unimplemented.
  Registering them, with ADR-0017's `transit` node, makes the real gate command run green now and
  need no edit when the test lane lands. Verified: six tasks, six successful.
- **PlanetScale has invoice budget alerts, and this organisation's are off.** ADR-0005 and
  `observability.md` are right that neither vendor offers a hard spend _cap_ — Fly's own docs say
  _"we don't support billing alerts (yet)"_ — but PlanetScale carries an `invoice_budget_amount`
  with alerts, set to `$20` on this account's two other organisations and to **`$0.00` with alerts
  disabled** on `workforpereira`. It is free and it is the only spend signal either vendor gives.

## Accepted risks

- **A production database credential lives in GitHub Actions secrets**, mitigated by the `migrator`
  role and not eliminated. A compromised Actions token is a DDL-capable connection to production.
- **Blue-green deployment on a single-machine app is unverified.** It briefly runs two machines,
  which is correct for expand/contract and which also means ADR-0009's in-memory rate limiter is a
  no-op for the duration of a deploy. `immediate` is the fallback if it fights
  `min_machines_running = 0`.
- **512 MB is a guess against an application that does not exist**, in the direction that is cheap
  to correct.
- **Staging has no gate**, and its safety is entirely inherited from the seeding rule. That is one
  rule between an open surface and a breach.
- **There is no pause between deciding to ship and shipping.** A merge to `main` reaches production
  with nothing in between, so a mistaken merge is a production deploy. Mitigated by cheap, drilled
  rollback and by the schema never moving, not removed.
- **Staging can go stale, and nothing says so.** Deploying it is now a choice, which means the
  default is that nobody makes it — so the rehearsal surface this ADR argues is not a luxury is the
  one thing most likely to be skipped. A staging that has not been deployed in weeks proves nothing
  about the release it was meant to de-risk.
- **The custom domain is a launch gate with no owner and no date.** It blocks a control ADR-0011
  calls a launch requirement.
- **PS-5's connection ceiling was never read.** The application connects direct on 5432 with a pool
  of 5, which is the right shape for one long-lived Node server, but the ceiling is unverified.

## Consequences

- **`turbo.json` registers `test`, `db:check` and ADR-0017's `transit` node.** This is implementing a
  closed decision rather than making a new one, and it is what lets `ci.yml` carry the real gate
  command from its first run.
- **`.github/workflows/ci.yml` ships green.** `deploy.yml` ships **disarmed** — its `push` triggers
  commented out — because nothing is provisioned. Arming it is one documented edit, named in the
  file. Its three jobs are asymmetric on purpose: `build` on merge to `dev`, `staging` on manual
  dispatch only, `production` on merge to `main`.
- **The `production` GitHub Environment carries no required reviewer.** It exists for secret scoping
  and the deployment record. Adding a reviewer is a one-setting change if the no-pause risk above
  ever bites.
- **`next.config.ts` gains `output: "standalone"`**, without which the Dockerfile cannot be built.
- **ADR-0004's "$15 remaining" was already corrected by #18 to $4.46–$7.46; this ADR moves it up
  again**, to roughly $7.30–11.30, by halving the machine size. Nothing should be spent against that
  until a real machine has been measured.
- **#18's observability stack is unchanged and now has somewhere to run.** UptimeRobot is the actual
  monitor: `observability.md` records that Fly health checks _"do not notify anyone"_ and only gate
  routing, so the Fly check is a readiness probe and a database-dependent one would convert a
  database blip into a restart loop that alerts nobody.
- **Two tickets are graduated**, both blocked by this one: scheduled work on a single machine
  (ADR-0015's outbox drainer, ADR-0020's deadline job and its dead-man's switch, ADR-0010's
  reconciliation sweep), and the production public edge (CDN, ADR-0011's Wall cache and purge,
  ADR-0014's edge limiter, and ADR-0009's persisted credential limiter with the Redis-versus-
  `"database"` cost ADR-0013 flagged as never priced).
- **`docs/runbook.md` exists and `CLAUDE.md` points at it.** It is written for an agent to execute.
- **The art. 17(k) _manual interno_ stays out of the runbook, deliberately.** ADR-0020 observed that
  _"#27 owns the retention schedule, #15 owns the runbook, neither owns this"_. It is a legal
  procedure for handling _consultas_ and _reclamos_, not an operations document, ADR-0020 already
  wrote its specification, and absorbing it into the runbook because the words sound alike would
  bury it. It belongs in `docs/legal/` before launch — and it is no longer homeless: **#43 owns it**,
  filed concurrently with this session.
