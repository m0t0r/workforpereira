# Runbook

Operational procedures, written for an agent to execute. Every procedure ends on a **verification**
step whose output tells you it worked. Run the verification; a procedure without its verification is
not finished.

Decisions behind these procedures live in [ADR-0022](adr/0022-two-environments-one-artifact-one-human-gate.md)
(environments, pipeline) and [ADR-0024](adr/0024-migrations-are-one-transaction-applied-before-the-deploy.md)
(migrations, rollback, recovery). Read the ADR when a procedure looks wrong; edit the ADR before
editing a procedure.

Commands assume the repository root and a `flyctl` authenticated against the `workforpereira`
organisation. App names are `encuentra` (production) and `encuentra-staging`.

---

## 1. A migration failed

**Fires when** the `migrate` step of `deploy.yml` exits non-zero.

`drizzle-kit migrate` applies every pending migration inside **one** transaction (ADR-0024). A
failure leaves the database exactly as it was, `drizzle.__drizzle_migrations` included.

1. Read the Postgres error in the job log. It names the failing statement.
2. Fix the migration on a branch, open a pull request, merge.
3. Re-run the deploy.

**Verification.** `pnpm --filter @repo/db exec drizzle-kit check` passes, and the deploy job's
migrate step exits zero.

**The database needed no repair.** Reach for a restore only under procedure 6. If the migrate step
_succeeded_ and the deploy then failed, that is procedure 9 instead — a different state entirely.

---

## 2. Extensions are missing after a restore

**Fires when** queries fail with `function unaccent(text) does not exist` or
`operator does not exist: text %> text`, on a database that was restored from a backup.

PlanetScale does not restore extensions. Re-running migrations **does not fix this**: the restore
also brings back `drizzle.__drizzle_migrations`, which already records `0000_enable_extensions` as
applied, so `drizzle-kit migrate` reports nothing to do while `pg_trgm` and `unaccent` are absent.
Run the statements directly.

1. Connect to the restored database as the `migrator` role.
2. Execute:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
```

**Verification.**

```sql
SELECT extname, extversion FROM pg_extension WHERE extname IN ('pg_trgm', 'unaccent');
```

Returns two rows: `pg_trgm 1.6` and `unaccent 1.1`. A different version is a finding — record it,
because `0000_enable_extensions.sql` pins those numbers against PlanetScale's documented set.

---

## 3. Roll back production code

**Fires when** a release is bad and the fix is not immediate.

The image is addressable by digest and the schema does not move (ADR-0024), so this is a swap, not a
migration.

1. `flyctl releases --app encuentra` — note the digest of the last known-good release.
2. `flyctl deploy --app encuentra --image <digest>`.
3. **In the same session**, `git revert` the offending commit on `main` and push.

**Verification.** `flyctl status --app encuentra` shows the machine running the intended digest,
**and** `git log -1 origin/main` describes the code that is now running. Both, because step 3 is
what stops `main` from lying about production — it is not optional cleanup.

---

## 4. The machine is out of memory or will not start

**Fires when** `flyctl status` shows restarts, or logs contain OOM kills.

1. `flyctl logs --app encuentra` — confirm the cause is memory rather than a crash on boot.
2. Open the memory graph: `flyctl dashboard metrics --app encuentra` (Fly's managed Grafana, free,
   ~15 days of retention).
3. Raise `memory` under `[[vm]]` in `fly.toml` to the next size and redeploy — the key is `memory`, not `memory_mb`.

**Verification.** `flyctl status --app encuentra` shows one machine `started` with no restarts for
ten minutes, and the memory graph plateaus below the new ceiling.

**Record the number.** ADR-0022 chose 512 MB against an application that did not exist and named
this as the measurement that replaces the guess. Amend the ADR with what you observed.

---

## 5. Health checks pass but the site is down

**Fires when** UptimeRobot alerts and Fly reports the app healthy.

Fly health checks **gate routing and notify nobody** — they are a readiness probe, not a monitor,
and the health endpoint deliberately does not touch the database (ADR-0022). So a healthy Fly app
with a broken site means the failure is below the probe.

1. `flyctl logs --app encuentra` — look for database connection errors first.
2. Check PlanetScale for the branch's status and any active anomaly.
3. If the database is the cause, treat it as an incident against the RPO in procedure 6 rather than
   as a deploy problem.

**Verification.** UptimeRobot returns to `up` and the log stream is free of connection errors for
five minutes.

---

## 6. Data loss, and the restore

**Fires when** rows are gone and no forward fix recovers them.

**The promise, stated so it is not inferred: RPO is 24 hours and RTO is hours, not minutes**
(ADR-0024). A single-node PS-5 with two-day retention can lose up to a day of profiles,
publications and offers. Confirm the loss is real before spending it.

A restore is **data-loss recovery only**. Using it to undo a schema change discards every row
written since the restore point; a wrong migration is superseded by a new forward migration
(ADR-0024).

1. Restore to a **new branch**, never over the live one.
2. Run procedure 2 against the restored branch — the extensions will be missing.
3. Verify the data is present and the application connects.
4. Cut over by pointing `DATABASE_URL` at the restored branch: `flyctl secrets set` on the app, then
   update the `PRODUCTION_DATABASE_URL` **environment secret** so CI migrates the same database.

**Verification.** Both `DATABASE_URL` values — the Fly secret and the environment secret — name the
restored branch. A cutover that updates one of the two leaves the next deploy migrating the
abandoned database.

---

## 7. Reindex after a major-version move

**Fires when** the database moves between Postgres majors. PlanetScale has no in-place major
upgrade, so this arrives as a migration into a new database rather than as an upgrade.

PG18 reads full-text and `pg_trgm` dictionaries through the cluster's default collation provider
rather than always libc, and recommends reindexing those indexes afterwards (ADR-0014, ADR-0024).

1. Complete the data move.
2. `REINDEX INDEX CONCURRENTLY <name>;` for every `pg_trgm` and full-text index.

**Verification.** `SELECT indexrelid::regclass, indisvalid FROM pg_index WHERE indisvalid = false;`
returns no rows.

**`REINDEX … CONCURRENTLY` runs outside a migration**, by hand. `drizzle-kit migrate` wraps
everything in one transaction and Postgres refuses concurrent index operations there (ADR-0024).

---

## 8. Check spend

**Fires** monthly, and after any traffic event.

Neither vendor offers a hard cap. Fly's documentation says plainly that billing alerts are not
supported, so the Fly figure is a manual read; PlanetScale carries an invoice budget with alerts,
which is the only automatic signal in the stack.

1. `flyctl dashboard billing` — read the month-to-date figure.
2. Read PlanetScale's usage for the `workforpereira` organisation.
3. Compare against the ceiling: **$25/month total**, with committed spend and the current remainder
   recorded in ADR-0022.

**Verification.** PlanetScale's `invoice_budget_amount` is `25.0` with alerts **enabled**. It ships
at `$0.00` with alerts off, which is the state that lets a bill grow unobserved.

---

## 9. The migration applied but the deploy did not

**Fires when** the `Migrate` step succeeded and the `Deploy` step failed.

**This is the one asymmetric state in the pipeline**: production is carrying a new schema while the
old image is still serving. It is safe rather than urgent — ADR-0024's expand/contract rule means
the schema change is additive and the running code tolerates it by construction — which is exactly
why that rule is not ceremony.

The image is resolved before the migration runs, so the common cause of this state is gone; what is
left is an infrastructure failure between the two steps.

1. Read the failure. A missing image is impossible here — the resolve step runs first — so the cause
   is Fly-side.
2. Re-run the failed job. It is idempotent: the migration will find nothing pending, and the deploy
   will resolve the same digest.
3. If Fly is unavailable, leave it. The old image against the new schema is a correct state, not a
   degraded one.

**Verification.** `flyctl status --app encuentra` shows the intended digest, and `pnpm db:migrate`
against that database reports nothing to apply.

**Do not roll the schema back.** There is no `down` migration and none is needed (ADR-0024).

---

## Provisioning checklist

Nothing below has been done. The `workforpereira` PlanetScale organisation holds zero databases and
no payment method; no Fly app exists. Work top to bottom — later steps need the earlier ones.

1. **PlanetScale**: add a payment method; set the organisation invoice budget to `25.0` and enable
   alerts.
2. **PlanetScale**: create `encuentra-production` and `encuentra-staging` — PS-5, `us-east-1`,
   **Postgres 18**. There is no in-place major upgrade, so the version is chosen once, here.
3. **PlanetScale**: create two roles per database — `app` (DML) and `migrator` (DDL). The
   application never connects as the default role (ADR-0022). **`migrator` also needs `INSERT`,
   `UPDATE` and `DELETE` on `@repo/catalog`'s five tables** — `skill_groups`, `skills`,
   `denominations`, `denomination_skills`, `municipalities` — because the deploy runs `pnpm db:seed`
   as that role between migrating and deploying. Reference data only; it never touches a table with
   a person behind it.
4. **PlanetScale**: enable `pg_strict` in warn mode on staging. Production stays unenforced until
   real queries exist.
5. **Fly**: create `encuentra` and `encuentra-staging` in `iad`, 512 MB `shared-cpu-1x`, staging with
   `min_machines_running = 0`.
6. **Fly**: `flyctl secrets set DATABASE_URL=…` on each app, using the `app` role.
7. **Fly**: create **two app-scoped deploy tokens**, not one org token —
   `flyctl tokens create deploy --app encuentra` and `--app encuentra-staging`. An org token would
   let the `staging` job, which is dispatchable from any branch, deploy or destroy production.
8. **GitHub**: create the `staging` and `production` environments first, **neither with a required
   reviewer**. They record deployments and scope the secrets in step 9; the human gate is the
   fast-forward merge into `main` itself (ADR-0022).
9. **GitHub**: add these as **environment secrets, never repository secrets** — a repository secret
   is readable by every job in every workflow on every branch, which would make the `environment:`
   key in `deploy.yml` scope nothing:

   | Environment  | Secrets                                                           |
   | ------------ | ----------------------------------------------------------------- |
   | `staging`    | `FLY_STAGING_TOKEN`, `STAGING_DATABASE_URL` (the `migrator` role) |
   | `production` | `FLY_PRODUCTION_TOKEN`, `PRODUCTION_DATABASE_URL` (`migrator`)    |

   **`FLY_PRODUCTION_TOKEN` also needs to reach the `build` job**, which has no environment because
   it deploys nothing — so it is additionally a repository secret. That is the one credential this
   design cannot scope down: Fly's registry is namespaced per app, so pushing
   `registry.fly.io/encuentra:…` requires the production app's token. Recorded as an accepted risk
   in ADR-0022 rather than hidden.

10. **trigger.dev** (ADR-0028): create one organisation on the **Free** plan, then **two projects** —
    `encuentra-staging` and `encuentra-production`. Each uses its own **PROD** environment, because
    Free provides DEV and PROD only and staging deploys need Hobby. Schedules and concurrency are per
    project; the **$5 monthly credit is shared across the organisation**, which is why staging's
    schedules run daily and production's backstop runs every five minutes.
11. **trigger.dev**: set a **concurrency cap** on each project and confirm bounded retries in
    `trigger.config.ts`. Running out of credit stops tasks, and one of the tasks is a compliance
    control — this is the only thing standing between a retry storm and a silently disarmed deadline
    monitor.
12. **Healthchecks.io**: create one check per job per environment (five each, ten total) on the Free
    plan's 20. Route **only the production deadline monitor** to Pushover with **Emergency** priority;
    everything else to email. A ping carries no personal data, so this vendor needs no
    _contrato de transmisión_.
13. **Sentry**: point the single included **cron monitor** at the production deadline monitor, as the
    redundant second watchdog ADR-0028 specifies. The included **uptime** monitor stays unused and
    available.
14. **Secrets**: `TRIGGER_SECRET_KEY` per project into GitHub environment secrets (for
    `trigger.dev deploy`), and a shared **`JOBS_CALLBACK_SECRET`** into both Fly apps _and_ both
    trigger.dev projects. **ADR-0032 decided that `/api/jobs/*` gets no rate limit**, so the callback
    secret plus the origin lockdown in step 19 are the whole control — rotate the secret if it is ever
    exposed rather than expecting a quota to absorb the damage.
15. **Cloudflare — the zone.** Buy the domain and add it to a **Free** zone, proxied. Everything from
    here to step 20 is **production only**; staging keeps its `*.fly.dev` hostname and gets none of
    it. This is ADR-0022's launch gate, and ADR-0032 gives it its sharper reason: the origin has to
    start refusing non-edge traffic on the day it starts holding personal data.
16. **Cloudflare — cache rules.** One rule making **static assets** eligible for cache, and at most one
    more for the **landing shell** if it is served on its own path. **Nothing that names, depicts or
    reveals a Person may be made cache-eligible** — not a Wall, not a Public View, not `/search/work`.
    Set no `stale-while-revalidate` anywhere: Cloudflare honours it on Free, and ADR-0032 declines it
    on both halves for different reasons. Anything cache-eligible here must be safe to serve **stale
    forever**, because there is no purge in this design.
17. **Cloudflare — the one rate-limiting rule.** Free allows exactly one:

    | Field  | Value                      |
    | ------ | -------------------------- |
    | Path   | `/search/work`             |
    | Limit  | 20 requests / 10 s, per IP |
    | Action | **Managed Challenge**      |

    Not `block` — on Free a challenge becomes request throttling and passing it zeroes the counter,
    which is what lets a real person behind CGNAT through.

18. **Cloudflare — leave Bot Fight Mode OFF.** It cannot be excepted below Pro and would challenge
    trigger.dev's `/api/jobs/*` callback with no way to exclude it, silently disarming ADR-0020's
    deadline monitor. It is the escalation lever if scraping actually happens; `/api/jobs/*` moves
    first.
19. **Cloudflare — origin lockdown.** One **request header transform rule** setting a static secret
    header on every request into the origin (Free allows ten rules). Set the same value as a Fly
    secret on the production app only; `proxy.ts` returns **404** to any request lacking it. Staging
    must **not** have the check enabled — nothing is in front of it, so it would reject everything.
20. **Verify the lockdown by trying to bypass it.** `curl https://encuentra.fly.dev/` must 404 while
    the proxied hostname serves normally. Until that is true, `cf-connecting-ip` is attacker-chosen
    and the credential limiter does not exist.
21. **Arm `deploy.yml`** — one edit, named in the file.
22. **Run the restore drill** (procedures 6 and 2 against a throwaway branch) and record the result
    here. ADR-0024 treats this as a launch requirement, because the recovery commands above are
    written from documentation rather than from having done it once.
