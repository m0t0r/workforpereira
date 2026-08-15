# Postgres host for staging and production under $25/month

Research for [#4](https://github.com/m0t0r/workforpereira/issues/4). Part of the
[Encuentra architecture map (#1)](https://github.com/m0t0r/workforpereira/issues/1).

**Status:** research only — this is a set of facts, not a decision. A human reviews before #4 closes.

**All prices in this document were observed on 2026-08-15.** Every provider here changes pricing
on a scale of months; Neon restructured its entire pricing model twice in the twelve months before
this was written. Re-verify before committing.

---

## The question

Which Postgres host fits **two environments** (staging + production) inside a **total
infrastructure budget of under $25/month**, shared with Fly.io app hosting, email, and error
tracking?

### Constraints taken as given (from #1, not re-derived here)

- **us-east-1 / Virginia is the target region.** Colombian traffic routes north over submarine
  cable, so `iad` beats São Paulo and Bogotá. Hosts are scored on us-east availability, not on
  physical proximity to Colombia.
- **Drizzle ORM**, drizzle-kit for migrations, PGlite for integration tests.
- **Next.js 16 App Router on Fly.io** — a long-lived Node server process, *not* an edge or
  serverless runtime. This materially changes which driver is correct (see
  [Pooling and drivers](#pooling-and-drivers)).
- **Solo developer.** Backup and restore must be operable by one person under pressure.
- **Budget ceiling is for the whole stack**, not just the database.

---

## Summary table

Two environments (staging + production), us-east-1, observed 2026-08-15.

| | **PlanetScale Postgres** | **Neon** | **Supabase** | **Fly.io Managed Postgres** | **Self-managed on Fly volume** |
|---|---|---|---|---|---|
| **Two-env monthly cost** | **$10.00** fixed | **~$8–16** variable | **~$34.62** (or $25 with a free-org staging) | **$81.60** ($40.80 for one) | **~$9.38–14.40** |
| **Cost model** | Fixed per cluster | Usage-based, no minimum | Fixed org fee + per-project compute | Fixed plan + $0.28/GB storage | Machine + volume |
| **Cheapest production unit** | PS-5 single node, $5/mo | Launch, ~$7–15/mo | Pro $25/mo org + $9.81 Micro | Basic $38/mo + storage | 512 MB machine $3.19 + volume |
| **Storage included** | 10 GB, then $0.125/GB | Metered $0.35/GB-mo | 8 GB/project, then $0.125/GB | None — $0.28/GB provisioned | $0.15/GB provisioned |
| **Egress included** | 100 GB/mo per prod branch | 500 GB/mo per project | — | Same-region free | Same-region free |
| **Pooler** | PgBouncer included free, port 6432 | PgBouncer included, `-pooler` host | Supavisor, ports 5432/6543 | PgBouncer included | **You run it** |
| **Backups** | Every 12 h, 2-day retention, free | Instant restore + scheduled backups | Pro: 7-day daily | Daily + 6-hourly + hourly | Daily volume snapshots, 5-day default |
| **PITR** | **Yes, included** (WAL archiving) | **Yes** — 7 d on Launch, 30 d on Scale | **Paid add-on, ~$100/mo** | Yes, `--pitr-time`; window undocumented | Only if you enable WAL backups to Tigris |
| **HA / failover** | No (single node at $5) | Managed service | Managed service | **Included on all plans** | **No** — single NVMe, no replication |
| **Branching** | Yes, $5/branch/mo, no free branch | Yes, **10 free branches/project** | Yes, ~$9.81/branch/mo continuous | v2 beta only, cost unpublished | No |
| **us-east-1** | Yes, and it is the default region | Yes (`aws-us-east-1`) | Yes | `iad` | `iad` |
| **Drizzle** | Documented dialect | Documented dialect | Documented dialect | Standard `pg` | Standard `pg` |
| **Fits the budget?** | **Yes, with $15 left over** | **Yes, with ~$9–17 left over** | **No** | **No — one cluster exceeds it** | Yes, but Fly calls it **unsupported** |

---

## 1. PlanetScale Postgres

Verified against the **live PlanetScale API via MCP tools** on 2026-08-15, not from memory or a
blog post, then cross-checked against the docs.

### The reported $5/month tier is real — verified

The repo owner's report was correct, and the live API confirms the mechanism.

`planetscale_list_cluster_sizes(organization: tkachenko-vitaly-job, engine: postgresql)` returned
17 tiers. The tool's own contract explains the two rate columns:

> The `rate` field is for an HA cluster with 2 replicas; `replica_rate` is for a single instance.
> **Single instance databases are only available for Postgres.**

So the `replica_rate` column *is* the single-node price. Live values:

| SKU | vCPU | RAM | HA rate (ARM / x86) | **Single-instance rate (ARM / x86)** |
|---|---|---|---|---|
| PS-DEV | 1/16 | 512 MB | $15/mo | `null` — dev branches only |
| **PS-5** | 1/16 | 512 MB | $15/mo | **$5 / $5** |
| PS-10 | 1/8 | 1 GB | $30 / $39 | $10 / $13 |
| PS-20 | 1/4 | 2 GB | $50 / $59 | $17 / $20 |
| PS-40 | 1/2 | 4 GB | $83 / $99 | $28 / $33 |
| PS-80 | 1 | 8 GB | $148 / $179 | $50 / $60 |
| M-10 (Metal, NVMe) | 1/8 | 1 GB | $50 / $60 | $17 / $20 |

The docs agree: [PlanetScale Postgres pricing](https://planetscale.com/docs/postgres/pricing)
states the cheapest option is a **PS-5 Single Node at $5/month** with network-attached storage.

The launch post, [*$5 PlanetScale is live*](https://planetscale.com/blog/5-dollar-planetscale-is-here)
(published **2025-11-14**), describes these as "production-ready" single-node Postgres databases,
Postgres only — not MySQL — and explicitly **non-HA with no automatic failover**. The same post
cut development branches from $10 to $5/month.

**What $5/month actually includes**, per
[the pricing docs](https://planetscale.com/docs/postgres/pricing):

- 1/16 vCPU, 512 MB RAM, single node, **no replica, no automatic failover**
- **10 GB storage included**; beyond that, $0.125/GB/month in AWS us-east-1
- **Backup storage equal to 2× disk size included free**; overage $0.023/GB/month
- **100 GB/month public egress included** on production branches; then $0.060/GB in us-east-1
- Query Insights, schema recommendations, metrics, branching

There is **no free tier**. [PlanetScale plans](https://planetscale.com/docs/planetscale-plans):
"PlanetScale does not offer a free plan, previously known as the 'Developer' or 'Hobby' plan."
Plans are now **Base** (self-serve, formerly Scaler Pro) and **Enterprise**. No separate
per-organization subscription fee was found; SSO is a $199/month add-on and is irrelevant here.

### Backups and PITR

[Backup docs](https://planetscale.com/docs/postgres/backups):

- **Automatic backups every 12 hours**, on production *and* development branches, at no extra cost
- **Default retention: 2 days**
- **Point-in-time recovery via WAL archiving** — restore to any moment inside the retention
  window, up to 5 minutes before now
- Restore path for a solo dev: Backups page → select backup → **Restore to new branch** → name it,
  pick a cluster size → Restore. Straightforward, no CLI gymnastics.
- Caveat: **database extensions are not restored** and must be reinstalled
- Custom schedules (hourly/daily/weekly/monthly) and longer retention cost extra

The 2-day default retention is the sharp edge. It is enough to recover from "I broke it this
morning" and not enough for "nobody noticed for a week."

### Branching

[Branching docs](https://planetscale.com/docs/postgres/branching): branches are **completely
isolated databases** with separate storage and no data replication between them — this is *not*
Neon-style copy-on-write, so a branch does not share the parent's storage bill.

- **No free branches.** Every branch is billed.
- Development branches run on `PS-DEV` and start at **$5/month**, billed only while they exist
- Maximum 100 development branches per database
- Region is fixed at branch creation

### Pooling

[PSBouncer docs](https://planetscale.com/docs/postgres/connecting/psbouncer): **every PlanetScale
Postgres database includes a local PgBouncer at no additional cost**, on the same node as the
primary. Port **6432** pooled, **5432** direct.

Transaction pooling mode only. Not available on the pooled port: prepared statements persisting
across transactions (protocol-level ones work with `max_prepared_statements`), temporary tables,
`LISTEN`/`NOTIFY`, session-level advisory locks, `SET` persisting beyond a transaction.

The bundled [`postgres` skill's PlanetScale guidance](https://raw.githubusercontent.com/planetscale/database-skills/main/skills/postgres/references/ps-connection-pooling.md)
is direct about the split: use **port 6432 for all OLTP application workloads** — web apps, APIs —
and reserve **port 5432 for schema migrations**, analytics, batch jobs, and anything needing
session state. That maps cleanly onto: app gets the pooled URL, `drizzle-kit` gets the direct URL.

Dedicated PgBouncers are a **paid add-on**, unnecessary at this scale.

### Region

`planetscale_list_regions_for_organization` (live, 2026-08-15) returned **AWS us-east-1
(N. Virginia), slug `us-east`, `postgresql_supported: true`, and `current_default: true`** — it is
the default region for the organization. Also available in us-east: GCP us-east4 (Ashburn,
Virginia), GCP us-east1 (Moncks Corner, South Carolina), AWS us-east-2 (Ohio). AWS sa-east-1
(São Paulo) exists but is explicitly *not* what we want.

### Two-environment cost

| Item | Cost |
|---|---|
| Production — PS-5 single node, us-east-1, 10 GB storage | $5.00 |
| Staging — PS-5 single node, us-east-1, 10 GB storage | $5.00 |
| Backups + PITR | $0.00 (included) |
| Egress (100 GB/mo included per production branch) | $0.00 at this scale |
| **Total** | **$10.00/month** |

Staging as a **$5/month development branch** of production instead of a second database costs the
same $5. A separate database is cleaner for an environment that should outlive any one branch.

---

## 2. Neon

Neon's paid plans are now **purely usage-based with no monthly minimum and no base fee**, which is
a recent and significant change. Sources: [neon.com/pricing](https://neon.com/pricing) and
[plans docs](https://neon.com/docs/introduction/plans), observed 2026-08-15.

Three self-serve tiers: **Free**, **Launch**, **Scale**.

| | Free | Launch | Scale |
|---|---|---|---|
| Monthly price | $0 | **Usage-based, no minimum** | Usage-based, no minimum |
| Pricing page "typical spend" | — | **$15/mo** | $701/mo |
| Compute | 100 CU-hours/project included | **$0.106/CU-hour** | $0.222/CU-hour |
| Storage | 0.5 GB/project | **$0.35/GB-month** | $0.35/GB-month |
| Projects | 100 | **100** | 1,000 |
| Branches included per project | 10 | **10** | 25 |
| Extra branches | not allowed | $0.002/branch-hour (~$1.50/mo) | $0.002/branch-hour |
| PITR window | 6 hours | **7 days** | 30 days |
| PITR storage | free | $0.20/GB-month | $0.20/GB-month |
| Egress | 5 GB | **500 GB/project** | 500 GB/project |
| Scale to zero | after 5 min, **cannot disable** | after 5 min, **can disable** | 1 min → always-on |

### Neon does not charge per project

This is the fact that decides the two-environment question. Launch includes **100 projects** at no
per-project fee, and billing is aggregated per account. **One paid plan covers both environments.**

Recommended topology: **one project, two branches** — `main` as production (root branch),
`staging` as a child branch. Child branches are copy-on-write and store **only the delta from the
parent** ([usage calculations](https://neon.com/docs/introduction/usage-calculations)), so staging
costs nearly nothing in storage until it diverges. Both branches still run their own compute
endpoint and accrue CU-hours independently. Two *separate projects* would instead pay full
$0.35/GB-month storage twice, since projects do not share copy-on-write storage.

### The scale-to-zero trap

Neon publishes the always-on floor on its pricing page: with scale-to-zero disabled, the minimum
is **187.5 CU-hours/month** (750 h × 0.25 CU minimum) = **$19.88/month at Launch rates** for
production alone. That does not fit under $25 alongside Fly.

**Scale-to-zero must stay enabled.** Cold start is quoted as **350 ms** on the pricing page FAQ and
"a few hundred milliseconds" in the docs. Suspension is after 5 minutes of inactivity; on Launch
the only choices are "5 minutes" or "disabled" — intermediate values require Scale.

Worked costs at Launch rates, 744-hour billing period:

| Scenario | Compute | Storage | Total |
|---|---|---|---|
| Prod always-on (scale-to-zero off) | 186 CU-h = $19.72 | +$0.35/GB | **~$20+** — breaks budget |
| Prod, scale-to-zero on, Neon's reference intermittent load | 140 CU-h = $14.84 | $0.35 | $15.19 |
| Prod, scale-to-zero on, awake ~8 h/day @ 0.25 CU | 62 CU-h = $6.57 | $0.35 | ~$6.92 |
| Staging, awake ~1 h/day @ 0.25 CU | 7.75 CU-h = $0.82 | delta only | ~$0.87 |
| **Both, one project, scale-to-zero on** | | | **~$8–16/month** |

### Free tier is not a production home

[Free plan limits](https://neon.com/faqs/free-plan-limits-and-quotas): 100 CU-hours/month per
project, and on exhaustion "the project's compute is suspended until the next billing period or
until you upgrade. Existing connections drop and new ones can't open." That is a **full outage
until the calendar rolls over**. Storage exhaustion at 0.5 GB makes the app effectively read-only.
PITR is 6 hours. Fine for staging; not defensible for production.

Note Neon itself takes **no published position** on Free-plan production suitability — that verdict
is inferred from the documented failure modes.

### Backups, PITR, branching, region

- **Instant restore** = Neon's PITR, built on WAL + branching. Launch gives **7 days** (the paid
  default is 1 day — you must raise it manually). Restore replaces the branch wholesale, but Neon
  **moves the compute and renames the branch so the connection string does not change**, and keeps
  the pre-restore state as `{branch}_old_{timestamp}` for rollback. One CLI command:
  `neon branches restore <target> <source@timestamp>`. This is genuinely solo-dev-operable — the
  lowest-ceremony PITR of the five.
  ([branch restore docs](https://neon.com/docs/introduction/branch-restore))
- **Scheduled backups** daily/weekly/monthly at $0.09/GB-month cover the gap past 7 days.
- **Branching is free within the 10-branch allowance**, on every tier including Free, with
  "zero load or performance impact" on the parent and delta-only storage. Marking production
  protected auto-generates new credentials for child branches.
  ([branching docs](https://neon.com/docs/introduction/branching))
- **Region: AWS us-east-1 (N. Virginia)**, ID `aws-us-east-1`, confirmed available
  ([regions docs](https://neon.com/docs/introduction/regions)). A project's region **cannot be
  changed after creation**. Azure regions are deprecated.

### Pooling and driver

PgBouncer in transaction mode, fixed config (`max_client_conn=10000`,
`default_pool_size = 0.9 × max_connections`, `max_prepared_statements=1000`). Pooled vs direct is a
hostname difference — add `-pooler` to the endpoint ID. Protocol-level prepared statements **do**
work through the pooler (PgBouncer ≥ 1.22).
([connection pooling docs](https://neon.com/docs/connect/connection-pooling))

`max_connections` by compute size: 0.25 CU → **104**, 0.5 CU → 209, 1 CU → 419, 2 CU → 839.

---

## 3. Supabase

Sources: [supabase.com/pricing](https://supabase.com/pricing) and Supabase docs, observed
2026-08-15. Evaluated purely as a Postgres host — this project uses Better Auth, not Supabase Auth.

### Supabase bills per organization *and* per project

This is what breaks the budget. **Pro is $25/month per organization** and includes **$10/month of
compute credits**, which covers exactly one Micro instance. Compute is billed **per project and is
additive**:

- Micro: **$0.01344/hour ≈ $9.81/month**, 1 GB RAM, 60 direct connections / 200 pooler clients
- 8 GB disk per project included, then $0.125/GB

Two Micro projects in one Pro org:

```
$25.00 (Pro org) + $9.81 (prod Micro) + $9.81 (staging Micro) − $10.00 (credits) = $34.62/month
```

Supabase's own pricing page works this example and rounds it to **$35/month**. That is **$10 over
the entire stack budget**, before Fly.io, email, or error tracking.

### The free-staging workaround, and why it still fails

Free plan: $0, 500 MB database, 2 active projects, **paused after 7 days of inactivity**, and
**no backups at all**. Critically, **plans cannot be mixed within one organization** — a free
staging project requires a **separate free organization**.

That configuration costs **$25.00/month exactly** — the entire budget, with **$0 left** for Fly.io
app hosting, email, and error tracking. It also means staging pauses after a week of not being
touched, which for a solo developer's staging environment is most weeks.

### PITR is a $100/month add-on

- Free: **no backups**
- Pro: **7 days of daily backups**
- Team: 14 days
- **PITR is a paid add-on at $0.137/hour ≈ $100/month** for a 7-day window, and it **requires at
  least a Small compute instance** ($15/month), not Micro

So PITR on Supabase costs roughly ten times the entire infrastructure budget. Daily backups only,
on Pro, is the realistic posture.

### Branching, pooling, region

- **Branching** (preview and persistent branches) is **$0.01344/branch/hour ≈ $9.81/month** if left
  running, and **compute credits do not apply to branching compute**. Branches start with no data.
- **Supavisor** is the pooler. Direct connection on 5432 is **IPv6-only** (IPv4 is a $4/month
  add-on); session mode on 5432 has IPv4 and supports prepared statements; transaction mode on
  6543 does not. Docs recommend direct or session mode for long-lived servers like a Fly machine.
  With Drizzle over `postgres-js` in transaction mode you must pass `postgres(url, { prepare: false })`.
- **Region:** AWS us-east-1, "East US (North Virginia)", confirmed available.

---

## 4. Fly.io Managed Postgres (MPG)

Sources: [MPG docs](https://fly.io/docs/mpg/), [client configuration](https://fly.io/docs/mpg/client-configuration/),
[cluster configuration](https://fly.io/docs/mpg/cluster-configuration/), observed 2026-08-15.

### Pricing rules it out on its own

| Plan | CPU | Memory | Monthly |
|---|---|---|---|
| **Basic** | Shared-2x | 1 GB | **$38.00** |
| Starter | Shared-2x | 2 GB | $72.00 |
| Launch | Performance-2x | 8 GB | $282.00 |
| Scale | Performance-4x | 32 GB | $962.00 |

CPU and memory are bundled into the plan price — there is no à-la-carte sizing. **Storage is
$0.28 per provisioned GB per 30-day month**, billed separately. The CLI default volume is 10 GB
(`fly mpg create --volume-size` defaults to 10).

```
$38.00 (Basic) + 10 GB × $0.28 = $40.80/month for ONE cluster
```

**One cluster is already 63% over the entire $25 stack budget.** Two clusters is **$81.60/month**.
MPG clusters do support multiple databases on one cluster (`fly mpg databases create`), so staging
and production could share a single $40.80 cluster — still over budget, and it collapses both
environments into one blast radius and one restore timeline.

There is **no MPG free tier**. The general [Fly free trial](https://fly.io/docs/about/free-trial/)
is compute-scoped (2 VM hours / 7 days) and does not mention Managed Postgres at all.

### What the money would buy, for the record

This is a genuinely good product; it is simply priced for a different budget.

- **HA is included on every plan** — "All plans include a primary and replica, pg bouncers, and
  backups", with automatic failover. This is the main thing MPG has that self-managed does not.
- **PgBouncer included**, with separate pooled (`pgbouncer.<cluster>.flympg.net`) and direct
  (`direct.<cluster>.flympg.net`) hostnames. The docs give exactly the guidance this project needs:
  "Set up a direct URL for migrations. Most frameworks run migrations on deploy. Migrations use
  advisory locks and other session-scoped features that require the direct URL, not the pooled one."
- Basic allows **200 client connections / 50 database connections** through the pooler.
- **PITR is self-service**: `fly mpg restore <CLUSTER_ID> --pitr-time <RFC3339>` restores to a new
  cluster, "leaving the source cluster unchanged". Backups run daily full at 01:00 UTC, differential
  every 6 h, incremental hourly (confirmed by a Fly staff post, 2025-06-17).
- **`iad` is supported** for both MPG v1 and v2, per the
  [regions reference](https://fly.io/docs/reference/regions/), which has a dedicated MPG column.
- **Private networking only** — "Because your MPG Cluster runs within your Fly.io private network,
  it's not accessible over the public internet." App in `iad` + cluster in `iad` means same-region
  transfer at **$0** and single-digit-millisecond latency.
- **Forking exists but only on MPG v2, in beta, dashboard-only.** Its cost is not published.

### Maturity caveat worth noting even though cost already rules it out

The MPG docs carry a "What's not there yet" section listing **"Security patches and version
upgrades"** as still under development. **MPG v2 is explicitly in beta** as of a Fly staff post
dated 2026-05-19. Even at a higher budget this would deserve a second look before carrying
production data.

Fly's own billing warning is worth carrying forward regardless of choice: "Managed Postgres lives
outside your apps. Deleting an app won't delete its database."

---

## 5. Self-managed Postgres on a Fly volume

This is the cheapest option on paper and the most expensive in operator time.

### Cost in `iad` (observed 2026-08-15, [Fly pricing](https://fly.io/docs/about/pricing/))

`shared-cpu-1x` in `iad`: 256 MB **$1.94**, 512 MB **$3.19**, 1 GB **$5.70**, 2 GB $10.70/month.
**Fly Volumes: $0.15/GB/month of provisioned capacity** (charged whether or not the machine is
running). **Volume snapshots: $0.08/GB/month, first 10 GB free each month** per organization.

| Configuration | Machine | Volume | Total |
|---|---|---|---|
| Two × 512 MB, 10 GB volumes | $6.38 | $3.00 | **$9.38/mo** |
| Prod 1 GB + 10 GB, staging 256 MB + 3 GB | $7.64 | $1.95 | **$9.59/mo** |
| Two × 1 GB, 10 GB volumes | $11.40 | $3.00 | **$14.40/mo** |

So roughly **$9–14/month for both environments** — nominally competitive with PlanetScale's $10.

### Fly classifies this as an unsupported product

This is the decisive fact, and it comes from Fly themselves. On the pricing page, under a top-level
heading literally titled **"Unsupported Products"**:

> **Unmanaged Fly Postgres (Unsupported)** — Fly Postgres is a PostgreSQL database that you create
> and then manage yourself.

Every page under [fly.io/docs/postgres/](https://fly.io/docs/postgres/) carries a banner:

> **Important:** We are not able to provide support or guidance for unmanaged Postgres.

And there is a page titled
[**"This Is Not Managed Postgres"**](https://fly.io/docs/postgres/getting-started/what-you-should-know/):

> This is not a managed database. If Postgres crashes because it ran out of memory or disk space,
> you'll need to do a little work to get it back.

The operator's documented responsibilities include: provisioning, scaling storage and memory,
**upgrading Postgres versions and security patches**, developing a backup and restoration plan,
monitoring and alerts, recovering from outages, and configuration tuning.

`fly postgres create` is **not formally deprecated** — the command and docs still work — but it is
supported-by-you, tolerated-by-Fly.

### Durability caveats, in Fly's own words

From the [Volumes overview](https://fly.io/docs/volumes/overview/):

> A Fly Volume is a slice of an NVMe drive on the same physical server as the Machine on which it's
> mounted and it's tied to that hardware.

> Fly.io does not automatically replicate data among the volumes on an app.

> **If your app needs a volume to function, and the NVMe drive hosting your volume fails, then that
> instance of your app goes down. There's no way around that.**

> **Always provision at least two volumes per app.**

Single-node self-managed Postgres on Fly therefore means: one NVMe drive, no replication, host
failure equals outage plus data loss back to the last snapshot, and downtime on every deploy of the
database app. Fly's own figure for a real 3-node HA cluster is **$82–164/month** — there is no cheap
path to durability here.

### Backups and PITR

Fly [automatically snapshots volumes daily](https://fly.io/docs/volumes/snapshots/), retained
**5 days by default**, configurable 1–60 days via `fly volumes update <id> --snapshot-retention <days>`.
Restore is not in-place — you create a **new volume** from a snapshot and reattach.

Fly warns explicitly that this is not a backup strategy:

> Daily automatic snapshots may not have your latest data. You should still implement your own
> backup plan for important data.

PITR is possible but **off by default**: `fly postgres backup enable` "creat[es] a Tigris bucket for
storage", after which `fly postgres backup restore --restore-target-time <RFC3339>` performs a
WAL-based restore into a new cluster. That adds a **third-party Tigris storage bill** and lives
under the same "we cannot support this" umbrella.

**Pooling is entirely yours.** PgBouncer ships with MPG only. On a self-managed node you either run
PgBouncer as a second machine — more cost, more ops — or point Drizzle straight at Postgres and hand-
size `max_connections` against your `pg.Pool`, which on a 256–512 MB machine will be tight.

### Verdict

It fits the budget and fails the "solo developer must be able to operate it" test. For $9.38/month
you accept: no HA, no replication, no automatic patching, no pooler, no PITR unless you build it,
snapshots that Fly says are not a backup, and a vendor who has told you in writing they will not
help when it breaks. PlanetScale costs **$0.62/month more** and removes every one of those
obligations. That is not a close call.

One thing from Fly's client guide applies **whichever host wins**, because it is about Fly's proxy,
not about Fly's database: set **max connection lifetime 600 s** and **idle timeout 300 s** on the
`pg.Pool`, or you will see `ECONNRESET` / `tcp recv (idle): closed` when the proxy recycles idle
connections.


---

## Pooling and drivers

The app is a **long-lived Node server on Fly.io**, not an edge or serverless runtime. This is the
single most consequential fact for driver choice, and it is easy to get wrong by copying serverless
tutorials.

**Use `drizzle-orm/node-postgres` with a `pg.Pool`.** Drizzle's own
[Neon connection docs](https://orm.drizzle.team/docs/connect-neon) say it plainly: "To use Neon
from a serverful environment, you can use the node-postgres or Postgres.js drivers." The
`neon-http` and `neon-serverless` drivers exist to tunnel Postgres over HTTP or WebSockets, solving
a problem that only exists where TCP sockets are unavailable. On Fly they add round-trip overhead
and, in the case of `neon-http`, remove interactive transactions entirely.

The pattern that applies to **every** host evaluated here:

1. **Runtime → pooled connection string.** PlanetScale port 6432, Neon `-pooler` hostname,
   Supabase Supavisor. Keep the client-side `pg.Pool` small (`max: 10` or so); the server-side
   pooler is doing the real multiplexing. Raise `connectionTimeoutMillis` if the host scales to
   zero.
2. **Migrations → direct connection string.** `drizzle-kit` needs session state and DDL that
   transaction-mode pooling does not support. Neon's Drizzle guide warns that "using a pooled
   connection string for migrations can lead to errors"; PlanetScale's guidance reserves port 5432
   for schema modifications.

3. **Recycle connections, whatever the host.** Fly's proxy has a 10-minute shutdown timeout, and
   Fly's own client guide requires **max connection lifetime 600 s** and **idle timeout 300 s** to
   avoid `ECONNRESET` / `tcp recv (idle): closed`. This is a property of running *on Fly*, not of
   running Fly's database, so it applies to PlanetScale and Neon too. For `pg`:
   `max: 10, idleTimeoutMillis: 300_000, maxLifetimeSeconds: 600, connectionTimeoutMillis: 5_000`
   (`maxLifetimeSeconds` needs `pg` 8.8+).

All transaction-mode poolers here share the same restrictions: no cross-transaction `PREPARE`, no
temporary tables, no `LISTEN`/`NOTIFY`, no session-level advisory locks, no `SET` outliving a
transaction. Worth knowing before the domain layer reaches for any of them.

**Drizzle compatibility is a non-differentiator.** [Drizzle documents](https://orm.drizzle.team/docs/get-started-postgresql)
dedicated connection guides for PlanetScale Postgres, Neon, and Supabase, plus the generic
`node-postgres` and `postgres.js` drivers that cover Fly MPG and self-managed. Every option scores
full marks; this criterion does not separate them.

---

## What the budget leaves over

Indicative only — email and error tracking are [#6](https://github.com/m0t0r/workforpereira/issues/6)'s
scope, not this ticket's, and these figures are not deeply sourced.

| Line item | PlanetScale | Neon | Supabase | Fly MPG | Self-managed |
|---|---|---|---|---|---|
| Database, two environments | $10.00 | ~$8–16 | ~$34.62 | $81.60 | ~$9.38 |
| **Remaining under $25** | **$15.00** | **~$9–17** | **−$9.62 (over)** | **−$56.60 (over)** | $15.62, minus your own time |

Both viable options leave room, because email and error tracking have real free tiers at this
scale: [Resend](https://resend.com/pricing) offers 3,000 emails/month free (100/day, one domain),
and [Sentry](https://sentry.io/pricing/) has a free Developer plan. The headroom is therefore
mostly for **Fly.io machines** — one app machine per environment, plus whatever a staging machine
costs when it is not scaled to zero.

---

## Recommendation

**PlanetScale Postgres — two PS-5 single-node databases in AWS us-east-1, $10.00/month total.**

### Why

1. **It is the only option with a fixed, predictable price that fits.** $5 + $5 = $10/month,
   invariant. Neon can be cheaper but it is *usage-based with no natural ceiling* — the bill
   depends on how awake the compute is, and one runaway cron job or crawler turns a $9 month into a
   $25 month. For a solo developer on a hard $25 ceiling for the entire stack, a number that cannot
   move is worth more than a number that is sometimes lower. This is a budget-certainty argument,
   not a cost-minimisation one.
2. **PITR is included, not an add-on.** WAL-based point-in-time recovery inside the retention
   window at no extra cost, with a three-click restore-to-new-branch flow. On Supabase the same
   capability costs ~$100/month and requires a compute upgrade. For a job marketplace holding real
   candidates' personal data under Ley 1581 obligations
   ([#5](https://github.com/m0t0r/workforpereira/issues/5)), PITR should not be the thing that gets
   cut for budget.
3. **No scale-to-zero, so no cold starts.** Both viable options fit the budget, but Neon only fits
   *because* scale-to-zero stays on — turning it off costs $19.88/month for production alone. That
   makes a ~350 ms cold start a permanent architectural feature of the cheap configuration. For a
   job board whose promise is a low-friction route back to work, a consistently warm database at a
   fixed $10 is the better trade.
4. **us-east-1 is the default region**, confirmed live via the API with
   `postgresql_supported: true`.
5. **The pooler is included and free**, with clear documented guidance on the 6432/5432 split that
   maps directly onto app-versus-`drizzle-kit`.
6. **$15/month of headroom** for Fly machines, email, and error tracking — the most of any option.

### What this trades away

Be clear about the costs of this choice:

- **No high availability.** PS-5 single node has no replica and no automatic failover. Node loss
  means downtime until PlanetScale recovers it. HA costs $15/month per environment ($30 total), so
  it does not fit today. This is an accepted risk for launch, revisited when the service has users
  who would notice.
- **2-day default backup retention** is the shortest window of the viable options (Neon's Launch
  gives 7 days). Longer retention costs extra. Worth pricing a custom daily schedule before launch
  and deciding the real RPO in
  [#15](https://github.com/m0t0r/workforpereira/issues/15).
- **Branching is not free.** Every PlanetScale branch is a fully isolated database at $5/month,
  where Neon gives 10 copy-on-write branches per project at no charge. If the workflow turns out to
  want a database per pull request, Neon's economics are strictly better and this decision should
  be revisited.
- **512 MB RAM and 1/16 vCPU is genuinely small.** Fine for launch traffic on a regional job board;
  PS-10 at $10/month single-node is the next step up and still leaves headroom.

### Runner-up

**Neon Launch, one project, two branches, scale-to-zero enabled — ~$8–16/month.** Choose this
instead if free database branching per feature or pull request turns out to matter more than price
predictability, or if a 7-day PITR window is required from day one. It is a legitimate alternative,
not a distant second. Set an organization **spending limit with 80%/100% alerts** if you take it —
usage-based billing has no ceiling by default.

### Why the other three are out

**Supabase — ruled out on cost**, not on quality. $34.62/month for two Pro-org environments is
$9.62 over the entire stack budget, and the $25/month workaround (Pro production + a separate free
organization for staging) consumes the whole budget while leaving staging to pause every week and
production without PITR unless you find another $100/month.

**Fly.io Managed Postgres — ruled out on arithmetic.** The cheapest possible configuration, Basic
plus the default 10 GB volume, is **$40.80/month for a single cluster** — 63% over the entire stack
budget before the Next.js machine exists. Two clusters is $81.60. Even the one-cluster-two-databases
trick lands at $40.80. This is a shame, because MPG includes exactly the things the $5 PlanetScale
tier lacks: a replica with automatic failover, and richer backup cadence. Revisit if the budget ever
clears ~$45/month. Note also that MPG's docs list "security patches and version upgrades" as still
under development and MPG v2 is in beta.

**Self-managed on a Fly volume — ruled out on operability.** At ~$9.38/month for two environments it
is nominally $0.62 *cheaper* than PlanetScale, and that $0.62 buys nothing that matters. Fly lists it
under **"Unsupported Products"** and states in writing "We are not able to provide support or
guidance for unmanaged Postgres." The operator owns version upgrades and security patches, backups,
monitoring, outage recovery, and the pooler. Fly's own volume docs say host NVMe failure means the
app goes down with "no way around that," and that daily snapshots "may not have your latest data."
For a solo developer holding real candidates' personal data, paying $0.62 to hand all of that to
someone else is the easiest trade in this document.

---

## What could not be verified

Stated rather than estimated, per the terms of this ticket.

**Tooling failure worth recording:** the **`planetscale_search_documentation` MCP tool is broken**.
Every call returned `{"code": -32602, "message": "Tool SearchPlanetScale not found"}`. The
PlanetScale findings above therefore come from the *working* MCP endpoints
(`list_organizations`, `list_cluster_sizes`, `list_regions_for_organization`, `list_databases`)
plus direct fetches of planetscale.com docs. The cluster pricing and region facts — the load-
bearing ones — are from the live API, not from documentation.

**PlanetScale**

- **`max_connections` for PS-5 is not publicly documented.** The docs say it "varies by cluster
  size" and direct you to the Parameters tab in the dashboard. The organization currently has
  **0 databases** (`planetscale_list_databases` returned empty), so it could not be read live. At
  512 MB RAM it will be low; the included PgBouncer is what makes this workable, but the actual
  number should be checked once a database exists.
- **API/docs discrepancy on PS-DEV.** The API reports PS-DEV at `$15/mo` with `replica_rate: null`,
  while the docs and the launch blog say development branches are **$5/month single-node**. The $15
  appears to be the HA-cluster rate, which dev branches cannot use. Treat a dev branch as $5/month,
  but confirm at branch-creation time — the docs say the price is shown then.
- **Development-branch egress rates.** Docs note dev branches have "different egress rates" without
  publishing the value.

**Neon**

- Whether `max_connections` under autoscaling derives from the **minimum** or **maximum** configured
  CU is undocumented. Plan for the minimum-CU number (104 at 0.25 CU).
- Cold-start figures are **inconsistent across Neon's own pages** — "350ms" on the pricing FAQ,
  "a few hundred milliseconds" in the docs. Treat ~350–500 ms as a working range, not a contract.
- The **1-day default PITR window on paid plans** is second-hand; the 7-day *maximum* on Launch is
  solid. Verify in the console.
- Neon publishes **no project-versus-branch cost comparison**; the conclusion that separate projects
  duplicate root-branch storage is derived from the metering documentation.
- Neon takes **no published position** on Free-tier production suitability.

**Supabase**

- Whether branching is available on the Free plan.
- Paused-project data retention: docs say 1 year, a changelog entry says 90 days.
- Whether Fly.io machines have outbound IPv6 to reach Supabase's IPv6-only direct endpoint without
  the $4/month IPv4 add-on.

**Fly.io Managed Postgres**

- **The PITR / backup retention window length is not documented anywhere** — not in the MPG docs,
  not in any `flyctl` reference page. A community thread discusses 10 days, but it contains **no Fly
  staff replies**, so it is user-report only. Do not plan an RPO around it.
- Whether the Fly free trial covers MPG at all — the trial page never mentions Managed Postgres.
- **The cost of an MPG v2 fork.** The beta announcement publishes no price. Do not assume cheap
  copy-on-write branching.
- Whether MPG storage can be provisioned below the 10 GB CLI default (no documented minimum).
- Whether MPG plan prices carry per-region markups the way Machine prices do — the MPG table has no
  region selector.
- Whether a new cluster in `iad` provisions as v1 or v2 today, and whether that is selectable.

**Self-managed on Fly**

- Default values for `fly postgres backup config` `--recovery-window`, `--full-backup-frequency`,
  and `--archive-timeout`. The flags are documented; their defaults are not.
- Ongoing Tigris object-storage cost for WAL backups — Fly says you pay Tigris list prices via your
  Fly bill, but that is a third-party pricing page.

**Cross-cutting**

- The email and error-tracking figures in [What the budget leaves over](#what-the-budget-leaves-over)
  are indicative. Sourcing them properly is
  [#6](https://github.com/m0t0r/workforpereira/issues/6)'s job.
- **No option was load-tested.** Every performance characteristic here is a vendor claim.

---

## Sources

Fetched 2026-08-15 unless otherwise noted.

**PlanetScale** — live MCP API (`planetscale_list_organizations`, `planetscale_list_cluster_sizes`,
`planetscale_list_regions_for_organization`, `planetscale_list_databases`) ·
[Postgres pricing](https://planetscale.com/docs/postgres/pricing) ·
[Backups](https://planetscale.com/docs/postgres/backups) ·
[Branching](https://planetscale.com/docs/postgres/branching) ·
[PSBouncer](https://planetscale.com/docs/postgres/connecting/psbouncer) ·
[Plans](https://planetscale.com/docs/planetscale-plans) ·
[$5 PlanetScale is live](https://planetscale.com/blog/5-dollar-planetscale-is-here) (2025-11-14)

**Neon** — [Pricing](https://neon.com/pricing) ·
[Plans](https://neon.com/docs/introduction/plans) ·
[Usage calculations](https://neon.com/docs/introduction/usage-calculations) ·
[Free plan limits](https://neon.com/faqs/free-plan-limits-and-quotas) ·
[Connection pooling](https://neon.com/docs/connect/connection-pooling) ·
[Branch restore](https://neon.com/docs/introduction/branch-restore) ·
[Branching](https://neon.com/docs/introduction/branching) ·
[Regions](https://neon.com/docs/introduction/regions) ·
[Scale to zero](https://neon.com/docs/introduction/scale-to-zero) ·
[Drizzle guide](https://neon.com/docs/guides/drizzle) ·
[Usage-based pricing](https://neon.com/blog/new-usage-based-pricing) (2025-08-14) ·
[Compute price reduction](https://neon.com/blog/major-compute-price-reduction-on-neon) (2025-11-03)

**Supabase** — [Pricing](https://supabase.com/pricing) · Supabase docs (compute add-ons, Supavisor,
backups/PITR, branching, regions)

**Fly.io** — [Managed Postgres docs](https://fly.io/docs/mpg/) ·
[MPG client configuration](https://fly.io/docs/mpg/client-configuration/) ·
[MPG cluster configuration](https://fly.io/docs/mpg/cluster-configuration/) ·
[MPG create and connect](https://fly.io/docs/mpg/create-and-connect/) ·
[Pricing](https://fly.io/docs/about/pricing/) ·
[Regions reference](https://fly.io/docs/reference/regions/) ·
[Free trial](https://fly.io/docs/about/free-trial/) ·
[Volumes overview](https://fly.io/docs/volumes/overview/) ·
[Volume snapshots](https://fly.io/docs/volumes/snapshots/) ·
[Unmanaged Postgres: "This Is Not Managed Postgres"](https://fly.io/docs/postgres/getting-started/what-you-should-know/) ·
[`fly postgres backup`](https://fly.io/docs/flyctl/postgres-backup/) ·
[`fly mpg restore`](https://fly.io/docs/flyctl/mpg-restore/) ·
Fly staff posts on community.fly.io re: MPG backup schedule (2025-06-17), MPG v2 beta (2026-05-19),
v2 regions (2026-06-30), v2 forking beta (2026-07-16)

**Drizzle** — [Get started with PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql) ·
[Connect Neon](https://orm.drizzle.team/docs/connect-neon)

**Other** — [Resend pricing](https://resend.com/pricing) · [Sentry pricing](https://sentry.io/pricing/)
