# App host: Cloudflare Workers vs Fly.io for the Next.js app

Research for [#25](https://github.com/m0t0r/workforpereira/issues/25). Part of the
[Encuentra architecture map (#1)](https://github.com/m0t0r/workforpereira/issues/1).

**Status:** research only — this is a set of facts, not a decision. A human reviews before #25 closes.

**All prices and version facts in this document were observed on 2026-08-15 and 2026-08-16**, dated
per claim below. Both platforms change pricing and capabilities on a scale of weeks:
`@opennextjs/cloudflare` shipped 130 releases in 22 months, and three bugs naming our exact Next.js
version were opened in the week this was written. Re-verify anything load-bearing before committing.

---

## The question

The map records **Fly.io** under *Technical → Givens*. #25 reopened it: is consolidating onto
**Cloudflare Workers** worth doing before #15 (environments/CI-CD), #17 (local dev) and #18
(observability) commit to a shape?

This is the **app** host only. [#4](https://github.com/m0t0r/workforpereira/issues/4) decided the
**database** host — PlanetScale Postgres, `us-east-1`, $10/month — and that stands either way. The
question is what runs the Next.js app in front of it, with **~$15/month of the budget remaining**.

### Constraints taken as given (from #1, not re-derived here)

- **Next.js 16 App Router** (currently `16.3.0`), React 19, Turborepo + pnpm monorepo.
- **Drizzle ORM**; `drizzle-kit` is the sole owner of migrations.
- **Better Auth**, one `user` table.
- **PGlite** for integration tests.
- **us-east-1 / `iad` either way.** Colombian traffic routes north over submarine cable, so the app
  is not scored on physical proximity to Colombia.
- **Budget under $25/month** total, staging + production. PlanetScale takes $10.
- **Solo developer**, real users, low volume, flexible timeline.

### The three arguments that prompted the ticket

The ticket asked for three specific arguments to be tested against primary sources, as hard as
possible. **None of the three survives as a reason to move.** They are answered in §1 (DPA
consolidation), §5 (Bogotá POP) and §4 (flat pricing).

---

## Summary table

Two environments (staging + production), observed 2026-08-16.

| | **Cloudflare Workers** (`@opennextjs/cloudflare`) | **Fly.io** (`iad`, Node server) |
|---|---|---|
| **Realistic monthly cost** | **≈ $5.00** | **≈ $6.50** (autostopped staging) / **≈ $9.50** (always-on) |
| **Staging** | **Free** — same account, same $5, `wrangler --env staging` | A second billed Machine |
| **Fits the ~$15?** | Yes, ~$10 headroom | Yes, ~$5.50–8.50 headroom |
| **Metered products** | **7** (Workers, KV, R2, DO, D1, Logs, Builds) | **3** (compute-seconds, egress, volumes) |
| **Can a code bug inflate the bill?** | **Yes** — slow render → CPU-ms; leaky DO → GB-s | **No** — the bill is the box |
| **Billing alerts** | **Yes**, default $10 alert; no hard cap | **None at all**; no hard cap |
| **Next 16 `proxy.ts` (middleware)** | 🟠 **Not supported, and declined by maintainers** — but the practical loss here is an optimistic redirect, see §2.1 | ✅ Works |
| **Next.js version risk** | Adapter lags a Next **major** by ~3–6 months; we are 1 minor ahead of it today | None — `next` upgrades are yours to schedule |
| **Better Auth** | ⚠️ Runs; community territory, 5 required non-default changes, 1 open isolate-poisoning bug | ✅ The documented, mainstream path |
| **Reaches PlanetScale** | ✅ Via Hyperdrive, **$0**, PlanetScale publishes the tutorial | ✅ Direct, `pg.Pool` |
| **DB latency once configured** | Equal — **needs a placement hint** | Equal — inherent |
| **DB latency if misconfigured** | ~76 ms **per query** | n/a |
| **Default correctness risk** | **Query cache ON, never invalidated by writes** (≤75 s stale) | None |
| **Where `drizzle-kit` runs** | CI runner, direct 5432 | CI runner, direct 5432 — **identical** |
| **Local Postgres** | docker compose | docker compose — **identical** |
| **Vitest configs needed** | **2** (adds `@cloudflare/vitest-pool-workers`) | 1 |
| **Observability** | Sentry free; spans render **`0ms`** by design | Sentry free + managed Prometheus/Grafana, ~15-day retention |
| **Processor agreements** | 4 (CF, PlanetScale, AWS, Sentry) | 5 (adds Fly.io) |
| **Sub-processors in the §6.3 register** | ~50–60 | ~130+ |

---

## 1. "Fewer processors means fewer DPAs" — oversold

*Observed 2026-08-15. Full analysis: this is the argument the ticket leaned on hardest.*

**The honest headline number: consolidating removes exactly one processor agreement — Fly.io's.**

The strict comparison (Fly + PlanetScale + R2 + SES + Sentry, 5 agreements → Cloudflare + PlanetScale
+ Sentry, 3) requires putting production auth email on Cloudflare Email Sending, which §6 argues you
must not do. In the configuration you would realistically ship — SES stays — it is **5 → 4**. In
operator labour that one agreement is worth **one login and one countersignature** at
[fly.io/documents/](https://fly.io/documents/), which is pre-signed by Fly and activates on signing.

**Two findings cut against Cloudflare here, and both were surprises.**

**(a) Cloudflare's self-serve DPA has a trigger AWS's does not.** The
[Self-Serve Subscription Agreement](https://www.cloudflare.com/terms/) §6.1 incorporates the
[DPA](https://www.cloudflare.com/cloudflare-customer-dpa/) (v6.4, effective 2026-04-03) only *"if
Customer Content includes the personal data of **European data subjects** … and all data defined as
'personal information' under the **CCPA**"*. Encuentra's users are Colombian. On a strict reading, a
Colombia-only user base does not trip the condition and the DPA is **not incorporated**. No
self-serve path to execute it independently of §6.1 was found. By contrast the
[AWS Service Terms](https://aws.amazon.com/service-terms/) §1.14.1 incorporate the AWS DPA
unconditionally, *"when you use AWS Services to process Customer Data"*. **On the narrow question
"is my DPA reliably in force for Colombian candidate data", AWS is on stronger ground than
Cloudflare.**

**(b) Consolidating inherits Google and Oracle.** Cloudflare's
[sub-processor list](https://www.cloudflare.com/gdpr/subprocessors/cloudflare-services/) (updated
2025-10-01) names **Google LLC** and **Oracle America** as sub-processors of the *Cloudflare
Developer Platform* — i.e. of Workers and R2 themselves. Neither "R2" nor "Email Service" is named
anywhere on the list; their position is covered only by the generic Developer Platform row. That is
thinner disclosure than the Ley 1581 §6.3 register duty ideally wants.

**What the reduction genuinely buys.** Dropping Fly removes **30 sub-processors** from the §6.3
inventory — including five third-party metal providers (CacheNetworks, DataPacket, Latitude,
NetActuate, AWS/Google), two LLM vendors processing support and log content (Anthropic, OpenAI), and
two signup-risk-scoring data brokers (PeopleDataLabs, IPinfo). For a controller who must tell the SIC
*who holds candidate data, where, and under which contract*, **30 fewer rows is a real reduction in a
register a solo developer maintains by hand.** That is a stronger argument than the DPA-count one the
ticket actually made.

**What it does not buy, on either side.** *"Colombia"* appears **0 times** in the Cloudflare DPA and
**0 times** in the PlanetScale DPA (full-text search, 2026-08-15). All these instruments are
GDPR/SCC-shaped. Going from five to four does not change whether **any** of them satisfies a Ley 1581
`2.2.2.25.5.2` *contrato de transmisión*, and no self-serve vendor will negotiate a Colombia addendum
with a solo developer. **The compliance gate is the same shape on either side of this decision**, and
whether a GDPR DPA + SCCs discharges the duty is a question for Colombian counsel that this research
does not resolve.

> **Verdict:** directionally true, materially oversold. Worth one signature and 30 register rows.
> **This should not be the argument that decides the host.**

---

## 2. Runtime viability — the one genuinely decisive area

*Observed 2026-08-16.* Can *this* app — Next 16.3.0, Better Auth, Drizzle — actually run on Workers?
**Probably, but not as currently designed.**

### 2.1 🔴 The hard blocker: `proxy.ts`

Next.js 16 renamed `middleware` → `proxy` and made it **Node-runtime-only with no edge opt-out**.
From the [Next.js proxy docs](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
(page version 16.3.1, 2026-08-16), verbatim:

> *"Proxy defaults to using the Node.js runtime. The `runtime` config option is **not available** in
> Proxy files. Setting the `runtime` config option in Proxy will **throw an error**."*

`@opennextjs/cloudflare` supports **edge middleware only**. The build fails with `Node.js middleware
is not currently supported` (issue
[#1277](https://github.com/opennextjs/opennextjs-cloudflare/issues/1277), open since 2026-06-05).
Cloudflare's own [Next.js framework guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
confirms it — *"Node.js in Middleware: Not yet supported"* — the page simply has not been reworded for
Next 16, where that now means **no middleware at all**.

**The maintainers have declined to fix it.** PR #1320 (a working implementation, 2026-08-01) was
**closed unmerged**:

> @conico974, 2026-08-02: *"For my position on merging node middleware here… **I have absolutely no
> intention on supporting it** or making it something else than experimental, with a big warning that
> I and probably other maintainer won't support it at all."*
>
> @james-elicx, 2026-08-02: *"**I don't think we should be shipping a feature we're not intending to
> support.**"*

The feature request ([#617](https://github.com/opennextjs/opennextjs-cloudflare/issues/617)) has been
open since 2025-04-30; the duplicate bug has 33 👍. The PR author's own rebuttal describes our stack
almost word for word: *"My own production app uses **better-auth route protection in middleware** …
Right now, **Next 16 apps with any auth-gated routes simply fail to build on Cloudflare.**"*

**This directly falsifies a load-bearing line in `better-auth-audit.md` §8**, which reads: *"Middleware
on Next.js 16 can do full database validation… Since we are on 16.3.0 this constraint does not bite
us."* Under Workers it bites, and harder than before, because Next 16 removed the edge escape hatch
too. Every session check must move into layouts, Server Components, Route Handlers and Server Actions.

**How much this actually costs us — added on review, and it is less than the above implies.** The
same Next.js page steers users away from the feature entirely:

> *"We recommend users avoid relying on Middleware unless no other options exist."*
> *"Middleware is highly capable, so it may encourage the usage; however, **this feature is
> recommended to be used as a last resort**."*
> *"**Always verify authentication and authorization inside each Server Function** rather than
> relying on Proxy alone."*

Better Auth says the same thing from its side: `getSessionCookie()` is optimistic only and never a
security boundary. Walking the usual reasons to reach for middleware against this app: **auth gating**
must be re-validated server-side regardless, so what is lost is an early redirect, not a security
property; **i18n routing** does not apply (Spanish-only, no i18n in v1); **headers and redirects**
belong in `next.config`, which runs *before* proxy in the documented execution order; **bot and rate
limiting** belong at the CDN, which §5 recommends putting in front regardless.

**Net loss to Encuentra: an optimistic cookie-check redirect** that avoids rendering a protected
layout before bouncing an anonymous user. Worth having; not architectural. It does falsify
`better-auth-audit.md` §8 — which assumed Node middleware could do full DB session validation — but
that was a convenience the audit chose, not a requirement.

**Unverified, and it matters:** whether the deprecated `middleware.ts` convention still works on Next
16 under the adapter's edge-middleware support. Next's docs mark it deprecated with a codemod but
never say it is removed. **If it works, even the optimistic redirect survives.**

> **Weighting:** this is a real constraint and a genuine signal about the adapter's direction — the
> maintainers declining a working PR is the durable part. But **it should not be quoted as the reason
> to reject Workers.** §2.2 and §2.3 carry that weight.

### 2.2 We would be one version ahead of the adapter, today

Latest adapter **1.20.2 (2026-07-21)** predates **`next@16.3.0` (2026-08-03)**. Its peer range
(`>=15.5.21 <16 || >=16.2.11`) admits 16.3.0, so **npm installs cleanly and issues no warning** —
which is precisely the trap. Three bugs naming 16.3.0 were open and less than a week old on 2026-08-16:

| Issue | Opened | What it is |
|---|---|---|
| [#1342](https://github.com/opennextjs/opennextjs-cloudflare/issues/1342) | 2026-08-14 | WASM loader patch **silently no-ops** on 16.3.0 — build succeeds, Worker throws at runtime. Hits Prisma; **Drizzle + `pg` likely dodges it**, but the failure *mode* is the point |
| [#1335](https://github.com/opennextjs/opennextjs-cloudflare/issues/1335) | 2026-08-11 | Same root cause, independently reported |
| [#1334](https://github.com/opennextjs/opennextjs-cloudflare/issues/1334) | 2026-08-10 | **Unbounded RSC prefetch loop** — *"1,910 `Next-Router-Prefetch: 1` requests in 30 seconds"* (~64 req/s). Control on 16.2.12: **0**. On a request-billed platform with $15 of headroom this is a **budget event, not just a bug** |

**Responsiveness, measured both ways.** Minor versions lately are good — 16.2 support landed in **5
days**. A Next **major** is not: 16.0.0 GA → "supported" was **91 days**, and → a peer range you can
trust was **~180 days**. The adapter has also **retroactively withdrawn** support it had claimed
(1.19.2's changelog: *"exclude unsupported Next.js 16 releases from peer dependencies"*).

**For a solo developer that is the crux: on Fly.io, `next` upgrades are yours to schedule. On Workers
you inherit a second upgrade gate, and historically that gate has been shut for months at each major.**

### 2.3 Better Auth under `workerd` — runs, but is community territory

First-party documentation is **three lines on the Hono integration page** (add `nodejs_compat`).
`docs/integrations/next.mdx` — the page we would follow — says **nothing about Cloudflare**. There is
no Workers deployment guide. Confirmed consequences:

| | What breaks | Required change |
|---|---|---|
| 🔴 | Module-scope `auth` + eager `drizzleAdapter(db)` collides with OpenNext's **mandatory per-request DB client** — *"you don't want to have a global client… will cause subsequent requests to fail"* | An undocumented `getAuth()` factory pattern; diverges from every Better Auth Next example |
| 🔴 | The Better Auth **CLI cannot load a Workers-bound config** (`getCloudflareContext` unavailable) | A **base / server / cli three-file config split** — the community answer, not a fix |
| 🔴 | The **Argon2id escape hatch is closed** — `@node-rs/argon2` is a native N-API addon; Cloudflare lists `argon2` as unsupported | None. Pure-JS/WASM argon2 is untested |
| ⚠️ | `scrypt` **is synchronous on workerd.** Verified in workerd source: the "async" `scrypt` wraps a sync call in a Promise executor, which runs synchronously — where Node dispatches to the libuv threadpool. **Measured ≈59 ms/hash**, ~33.5 MB of a 128 MB isolate per in-flight hash, on **every sign-in including failed ones** | Nothing available; it is billed CPU on a CPU-metered platform |
| ⚠️ | Rate-limit **memory backend is unusable** — isolates are unbounded and not under our control (Better Auth's own docs: *"may not be suitable… particularly in serverless environments"*) | The `"database"` backend becomes **mandatory**, adding a Postgres round trip to every `/sign-in` |
| ⚠️ | Un-awaited background work is **cancelled when the response returns** (verification email on sign-in, enumeration-flattening dummy work) | `advanced.backgroundTasks.handler = ctx.waitUntil` — required, non-default. Whether it covers *library-internal* fire-and-forget is **unverified** |

**And one open availability bug with no Fly.io equivalent.**
[better-auth#10315](https://github.com/better-auth/better-auth/issues/10315) (opened 2026-07-05,
**still open** 2026-08-16): a client abort during lazy init leaves a cached cross-request promise
permanently unsettled, and *"every later better-auth API call in that isolate awaits a permanently
pending cached promise and **hangs forever** (no error, no timeout). The isolate never recovers until
it is recycled… **that user sees a full outage**"*. The reporter's workaround reaches into a
`Symbol.for` global — not a supported API. This is a *class* of hazard created by workerd's
request-scoped I/O context that does not exist on a long-lived Node server.

**What survives intact:** `drizzle-kit` as sole migration owner (reinforced — Better Auth's
`getMigrations` does not support Drizzle either), cookies and sessions, token generation and HMAC
signing, telemetry-off, the i18n dictionary, and every item on the audit's §11 "we build" list.

### 2.4 What is *not* a problem

`nodejs_compat` is fine — `node:crypto`, `buffer`, `stream`, `net` (outbound), `async_hooks`/ALS and a
virtual `fs` are all supported, and from compatibility date `2026-08-04` the flag is on by default.
**The problems are architectural (request-scoped I/O, no long-lived process), not API coverage.**

Limits worth knowing: **30 s CPU default** (raisable to 5 min via `limits.cpu_ms`), **128 MB isolate**
(not configurable on any tier), **10 MB compressed bundle**, 10,000 subrequests. CPU overrun is a hard
kill (Error 1102), and `wrangler dev` will not reproduce it — *"These limits are enforced only when
deployed to Cloudflare's network."*

Also gone or degraded: **`next/image` optimization** needs a paid Cloudflare product or a custom
loader; **PPR/`cacheComponents`** has two open prod-only failures and should be treated as unusable;
**ISR/SSG** needs R2 *or* KV *plus* Durable Objects *plus* a self-reference binding — though *"SSR
route will work out of the box without any caching config"*, and an SSR-only logged-in job board may
legitimately need none of it.

---

## 3. The database path — close to neutral

*Observed 2026-08-16.* **Nothing in the database path rules out either host.**

**Yes, a Worker reaches PlanetScale Postgres, and PlanetScale publishes a tutorial for exactly this
stack** ([planetscale-postgres-cloudflare-workers](https://planetscale.com/docs/postgres/tutorials/planetscale-postgres-cloudflare-workers)).
The prescribed path is `pg` behind **Hyperdrive**, not raw sockets: PlanetScale's connections overview
says *"For Cloudflare Workers, prefer Hyperdrive with `pg` over the serverless driver."*

**Hyperdrive costs $0** — unlimited queries on Workers Paid, no egress charge. It is not a hidden
budget line. Stacking it on PlanetScale's PgBouncer is **same-mode-on-same-mode** (both transaction
pooling), so it removes nothing the project does not already lose on Fly's port 6432. Note, though,
that **no vendor documents the stacked configuration** — six Cloudflare pages and three PlanetScale
pages were checked, and PlanetScale's own Workers tutorial never mentions ports or pooling at all.
That is the largest unverified assumption in this area.

**The one real correctness trap: Hyperdrive query caching is ON by default**, `max_age` 60 s + 15 s
SWR, and Cloudflare states plainly that *"Hyperdrive does not purge or invalidate cached read query
results when your application writes."* That is **up to 75 seconds of stale reads after a user submits
something** — unacceptable for the offer lifecycle. Fixable with `--caching-disabled`, but **invisible
locally**, because `wrangler dev` bypasses Hyperdrive entirely.

**The port split from #4 survives with a layer inserted:** Worker → Hyperdrive binding (no PlanetScale
URL in the Worker at all); Hyperdrive origin → **6432**; `drizzle-kit` → **5432 direct**, unchanged.

**`drizzle-kit` cannot run in a Worker** — no filesystem, no CLI, and migrations need session advisory
locks. With no long-lived container the mechanism is a **CI runner holding the direct 5432 URL as a
secret**. That is **identical on Fly**, so #15 gets the same answer either way.

**Latency: the edge advantage cancels out once configured.** Hyperdrive removes **7 connection-setup
round trips** (TCP 1×, TLS 3×, auth 3×) but explicitly still needs *"a single round trip across
regions"* per uncached query. Measured RTTs (WonderNetwork, 2026-08-16 — no cloud vendor publishes a
Bogotá figure): **Bogotá↔Washington DC 75.6 ms**, Bogotá↔Miami 57.3 ms, Miami↔Washington DC 27.7 ms.
An N=3 SSR page from an *unhinted* Bogotá Worker is **~228 ms of DB time alone**.

**Smart Placement is the wrong tool** — it needs 15 minutes and *"consistent traffic from multiple
locations"*, which a low-volume solo job board may never supply. **Placement Hints is the right one**,
and both vendors publish the same config: `{"placement": {"region": "aws:us-east-1"}}`, taking
20–30 ms/query down to 1–3 ms. **With the hint, the Workers topology converges exactly on Fly's** —
compute in Virginia, database in Virginia, user in Bogotá paying one ~76 ms crossing.

So Workers costs one configuration line, one disabled default, and one undocumented assumption; Fly
costs pool tuning (`maxLifetimeSeconds: 600`, idle 300 s, to survive Fly's proxy) that a Worker does
not need because it holds no pool. Neither is decisive.

---

## 4. Cost and predictability — both fit, and #4's logic does not transfer

*Observed 2026-08-16.* See the summary table for the side-by-side. **Cloudflare ≈ $5.00/month for
prod + staging; Fly ≈ $6.50 (autostopped staging) to ≈ $9.50 (always-on).** The gap is
**$1.50–$4.50/month** — real, but not decisive at this budget.

**Cloudflare's clearest win is staging.** The Workers Paid minimum is worded *"$5 USD per month for an
**account**"*, and `wrangler --env staging` deploys a second Worker on the same account sharing one
allowance pool. On Fly, staging is a second billed Machine.

**The "hidden" Cloudflare line items are real but all price at $0 at this volume** — R2 for the ISR
cache (the OpenNext docs actively steer away from KV), Durable Objects for time-based revalidation
(*"A queue must be setup"*), D1 or sharded DOs for the tag cache, Workers Builds (6,000 min), Static
Assets (*"free and unlimited"*), Hyperdrive. **The cost is configuration, not dollars**: bindings are
non-inheritable and every one must be declared and provisioned twice.

Fly's `iad` is its **baseline cheapest region** (`regionMarkups` map: `"iad": 1`). shared-cpu-1x with
1 GB is **$5.70/month**; 512 MB is $3.19. Egress $0.02/GB in NA. No plan fee, no free tier, and **no
stated minimum charge** was found.

### Predictability does not repeat #4's reasoning

This is the property that decided #4 — PlanetScale's flat $10 beat Neon's usage-based pricing — so it
deserves more than a footnote. **Here the two halves of that argument come apart.**

- **Fly is structurally safer.** The bill is `machines × seconds + GB`. There is exactly one uncapped
  input (egress), and spending an unplanned $15 there would take **750 GB/month**, which this app will
  not do and which Cloudflare's free CDN in front would absorb anyway. **A code bug cannot inflate the
  bill — a slow render just makes the box slower.**
- **Cloudflare has seven metered products and one dangerous line.** CPU time is **$0.02/million
  CPU-ms** past 30M, billed on *actual CPU*, and **React server rendering is CPU-heavy**. At 30 ms
  CPU/render that is a comfortable 1M renders/month; at 200 ms/render it is **150,000 renders/month**.
  **On Fly a slow render costs latency; on Workers it costs money.** Durable Objects duration
  ($12.50/million GB-s) is the least predictable line on either platform — one DO with a stuck alarm
  eats most of the monthly allowance.
- **But only Cloudflare will tell you.** Fly, verbatim: *"We don't support billing alerts (yet), so
  budget accordingly."* Cloudflare ships a **default $10 budget alert** on eligible pay-as-you-go
  accounts, though *"Budget alerts are informational only. They do not pause or cap usage."*

> **Neither platform offers a hard spend cap**, so on both the true worst case is "unbounded until a
> human notices". Cloudflare is cheaper in the expected case and shortens "until a human notices" from
> a month to hours; Fly is flatter in the bad case but you find out on the invoice. **That is the
> mirror image of #4, where the flat-fee option was also the predictable one. Here there is tension.**

---

## 5. The Bogotá POP — a red herring

*Observed 2026-08-15.* The POP is **real**: [cloudflare.com/network/](https://www.cloudflare.com/network/)
lists **Bogotá, Medellín, Cali and Barranquilla**, all "Operational" on
[cloudflarestatus.com](https://www.cloudflarestatus.com/locations). Fly.io has **one** South American
region, `gru` (São Paulo) — and no `bog`.

**It is still not an argument for hosting the app on Workers**, for three verified reasons:

1. **Cloudflare's CDN caches static assets from all 348 cities, on the Free plan, in front of any
   origin.** The [default cache behaviour](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/)
   list covers CSS, JS, WOFF/WOFF2, SVG, PNG, JPEG, WEBP, AVIF and more — Next's `/_next/static/*` is
   entirely inside it. **Nothing about this requires the origin to be Cloudflare.**
2. **Cloudflare does not cache HTML by default**, so what Workers adds over CDN-in-front-of-Fly is edge
   execution of the *dynamic* path — not the static path the argument was about.
3. **For the dynamic path, Cloudflare's own docs say run next to the database.**
   [Smart Placement](https://developers.cloudflare.com/workers/configuration/smart-placement/):
   *"If your Worker makes requests to back-end infrastructure such as databases or APIs, it may be more
   performant to run that Worker closer to your back-end than the end user."* With a single-region
   PlanetScale in `us-east-1`, that means **giving up the Bogotá proximity for exactly the requests
   where it would have mattered.**

Fly's LatAm absence is irrelevant because the map already fixes the app in `iad`.

> **Verdict: this argument should carry zero weight in the host decision.** The one thing worth taking
> from it is that **putting Cloudflare's free CDN in front of a Fly origin is worth doing regardless.**

---

## 6. Email and object storage — both orthogonal to the host

**Cloudflare Email Service is not a host argument.** Its
[REST API docs](https://developers.cloudflare.com/email-service/api/send-emails/rest-api/) state
verbatim that **"no Cloudflare Workers binding is required"** — it is usable *"from any backend"*, so
a Fly Node process can call it. The $5 Workers Paid charge is a **billing prerequisite, not an
architectural one**.

Separately, it should not carry auth mail at all right now. **Email Sending is still public beta** as
of 2026-08-15, four months after entering beta, with no GA entry and an **unpublished starting daily
quota**. The [Self-Serve Agreement](https://www.cloudflare.com/terms/) §5 is explicit: Beta Services
are *"intended for testing purposes only"*, Cloudflare is *"not obligated to provide you with
support"*, may *"discontinue, suspend, or remove"* them at any time, and *"will have no liability for
any harm or damage"*. For a channel whose failure mode is "nobody can sign in", that is a hard read.
**[#6](https://github.com/m0t0r/workforpereira/issues/6)'s conclusion stands unchanged: AWS SES**, at
~$0.03/month versus a $5/month floor.

**Object storage is technically orthogonal too.** R2 is reachable over the plain S3 API from any host
at `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` — the Workers binding is optional — and presigned
URLs work on both sides. **Storage scores for neither host.** Three findings are still worth carrying
into [#11](https://github.com/m0t0r/workforpereira/issues/11):

- **Fly.io object storage is Tigris, operated by Tigris Data Inc. — a separate company.** Fly's own
  [pricing page](https://fly.io/docs/about/pricing/): *"When you provision their services, you become
  their customer."* Tigris is **not** owned by Fly ($25M Series A led by Spark Capital, 2025-10-08,
  now running on its own infrastructure). So "Fly + storage" is **two** processors.
- **The entanglement runs both ways.** Tigris's DPA Appendix C names **Fly.io**, Equinix and Oracle
  Cloud as *its* sub-processors, and Fly's list names Tigris. **Choosing Tigris keeps Fly.io in the
  register even if you leave Fly.io** — making "Workers + Tigris" the worst of the four combinations.
- **An inversion on residency.** Tigris single-region buckets give *"full control over data
  residency"* (`iad` available); **R2 has only best-effort location hints and two jurisdictions, `eu`
  and `fedramp` — no `us`.** For the §6.3 "in which country" duty, **Tigris is documentable and R2 is
  not.** (Caveat: Tigris's *default* — Global, traffic-driven migration — is the worst option of all.)

R2's free tier is a **permanent** monthly allowance, and ToS §2.8's non-HTML-media restriction was
removed in 2023 with R2-hosted media explicitly permitted on the CDN. Both stores cost ~$0 at this
workload; #5 ruled out profile photos, so the need is documents only.

---

## 7. What this binds in other tickets

**Three tickets turn out to be host-independent, which is the most useful operational result here.**

| Ticket | Effect of this research |
|---|---|
| **[#15](https://github.com/m0t0r/workforpereira/issues/15) Environments & CI/CD** | `drizzle-kit` runs on a **CI runner against the direct 5432 URL** on both hosts. Cloudflare adds: every binding declared and provisioned **twice**, and Workers Builds can host migrations but documents **no ordering or rollback guarantees**. |
| **[#16](https://github.com/m0t0r/workforpereira/issues/16) Testing** | **Host-independent for PGlite** — it runs in Node either way. But Cloudflare adds a **second Vitest project** (`@cloudflare/vitest-pool-workers` peers Vitest ^4.1, pins Wrangler 4.123.0 and an **alpha** Miniflare, kills V8 coverage, and its known-issues page names Postgres.js as failing in global setup). |
| **[#17](https://github.com/m0t0r/workforpereira/issues/17) Local dev** | **Host-independent. `docker compose` stays either way** — Wrangler simulates KV/R2/D1/DO but **never Postgres** — and `next dev` remains the inner loop under OpenNext, with workerd as an outer verification loop. |
| **[#18](https://github.com/m0t0r/workforpereira/issues/18) Observability** | **$0 on both.** Sentry Developer (free, 1 user, **30-day** retention) beats both platforms' 7-day logs. Fly adds free managed Prometheus + Grafana (~15-day retention, custom metrics). On Workers, **Sentry spans render `0ms` by design** — the metric that drives the Workers bill is the one Sentry cannot time. |
| **[#5](https://github.com/m0t0r/workforpereira/issues/5) Ley 1581** | The §6.3 register records **~130+ sub-processors** with Fly, **~50–60** without. Record the open question about Cloudflare's §6.1 trigger either way. |
| **[#6](https://github.com/m0t0r/workforpereira/issues/6) Messaging** | **Unchanged — SES.** Cloudflare Email is beta and reachable from Fly anyway. |
| **[#11](https://github.com/m0t0r/workforpereira/issues/11) Documents** | Pick the store **independently of the host**. Avoid the Tigris+Workers combination; note R2 cannot document a US region. |
| **[#3](https://github.com/m0t0r/workforpereira/issues/3) Better Auth audit** | §8's middleware conclusion is **false under Workers**; §5.2's Argon2 escape hatch is **closed**; the module-scope `auth` singleton **breaks**. Capability findings survive intact. |

---

## What could not be verified

| Claim | Status |
|---|---|
| **Fly.io's realistic machine size** | **Assumed 1 GB RAM, unverified.** This is the single load-bearing assumption in the cost column: at 256 MB Fly is **$1.94 and cheaper than Cloudflare**; at 2 GB it is $10.70 and clearly worse. |
| An actual `opennextjs-cloudflare build` of this repo | **Never run.** Nothing here was built or deployed — this is documentary research only. It is the cheapest next step available. |
| Hyperdrive → PlanetScale port 6432 | **Inferred, not documented by either vendor.** |
| Hyperdrive TLS mode | Unresolved conflict: Hyperdrive defaults to `sslmode=require`, but PlanetScale's tutorial passes `verify-full` with no CA upload step. |
| PS-5's `max_connections` | Still publicly undocumented (same gap #4 recorded). Needed to judge Hyperdrive's ~100 origin connections. |
| Fly cold-start latency and autostop idle timeout | **No published number.** |
| Fly.io DPA text — SCCs, version, whether it names Colombia | **Could not read.** `fly.io/legal/dpa/` 404s, `fly.io/legal/` 403s, `fly.io/documents/` requires sign-in. |
| Whether Better Auth's `backgroundTasks` covers *library-internal* fire-and-forget | **Unverified** — documented for hooks we write. |
| Whether a GDPR DPA + SCCs satisfies Ley 1581 `2.2.2.25.5.2` | **Not resolved — a question for Colombian counsel.** |
| Cloudflare Email Sending starting daily quota / SLA | **Still unpublished**, unchanged since #6. |
| PGlite under workerd | Untested (not required — tests run in Node). |

---

## Where this leaves the decision

Facts, not a recommendation. The ticket asked for the three arguments that prompted it to be tested,
and then for the runtime and cost questions to decide it. Both halves are now answered.

**The three prompting arguments did not survive.** DPA consolidation is worth one signature and 30
register rows, with Cloudflare's own DPA trigger arguably weaker for Colombian-only data than AWS's
(§1). The Bogotá POP is delivered identically by putting Cloudflare's free CDN in front of a Fly
origin, and Cloudflare's own docs say the dynamic path belongs in Virginia (§5). Flat pricing splits:
Cloudflare is $1.50–$4.50/month cheaper and Fly is structurally more predictable, but only Cloudflare
ships an alert (§4).

**The areas that were supposed to decide it came back close to neutral or negative.** The database
path is a wash once a placement hint is set (§3). Local dev, testing and observability are
host-independent or slightly worse on Workers (§7). Object storage and email are orthogonal (§6).

**What is left is the runtime, and it is the one clearly asymmetric area (§2)** — though the weight
sits in the *pace of the adapter*, not in any single missing feature. Being one Next minor ahead of
the adapter *today* with three open version-specific bugs, one of which is a billing hazard; a
historical 3–6 month lag at each Next major with support retroactively withdrawn once; and Better
Auth as community territory on `workerd` — five required non-default changes plus an open,
production-reproduced bug that takes a single user fully offline until their isolate recycles.

**The `proxy.ts` blocker is real but should not be the quoted reason** (§2.1). Next's own docs call
Proxy *"a last resort"* and tell you to verify auth in each Server Function anyway, so for this app
the practical loss is an optimistic redirect rather than an architecture.

**The honest summary is that the move costs a solo developer a second upgrade gate and a set of
Better Auth workarounds, to save ~$1.50–$4.50/month and 30 rows in a compliance register.** Staying
on Fly.io costs one DPA signature and a slightly higher bill.

**Two things are worth doing regardless of the outcome:** put Cloudflare's free CDN in front of
whichever origin is chosen (§5), and keep email on SES (§6).

**If the decision is to stay on Fly.io**, #15, #17 and #18 unblock immediately with the shapes already
assumed, and the map's Technical given reverts from *UNDER REVIEW* to settled.

**If the decision is to move**, the cheapest way to falsify this document is to run an actual
`opennextjs-cloudflare build` of this repo — which nobody has yet done — and to settle the middleware
redesign **before** #15, #17 and #18 commit.
