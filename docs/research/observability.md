# Observability and analytics inside the budget

Research for [#18](https://github.com/m0t0r/workforpereira/issues/18). Part of the
[Encuentra architecture map (#1)](https://github.com/m0t0r/workforpereira/issues/1).

**Status:** research only — this is a set of facts and a costed recommendation, not a decision. A
human reviews before #18 closes.

**All prices and free-tier limits in this document were observed on 2026-08-16.** Free tiers are the
most volatile thing a vendor publishes; several of the numbers below changed within the twelve months
before this was written. Re-verify before committing, and re-verify again before the first bill.

---

## The question

How do we know the platform is broken, and what may we lawfully measure about the people using it?

The operating reality is the constraint that matters: **one developer, asleep at 2am, with no
dashboard being watched.** Every tool below is scored on whether it converts a failure into a push
notification on a phone without a human looking for it, and on what it costs to do so.

### Constraints taken as given (not re-litigated here)

- **App host: Fly.io**, one Next.js 16 App Router app (`next@16.3.0`), long-lived Node server, region
  `iad` / us-east-1, with Cloudflare's free CDN in front of the origin
  ([ADR-0005](../adr/0005-flyio-remains-the-app-host.md)).
- **Database: PlanetScale Postgres**, two PS-5 single-node databases in us-east-1, **$10.00/month
  fixed**, no HA, 2-day backup retention ([ADR-0004](../adr/0004-planetscale-postgres-as-the-database-host.md)).
- **Total infrastructure budget under $25/month**, staging *and* production.
- **Ley 1581 applies in full** ([`ley-1581-obligations.md`](ley-1581-obligations.md)). Consent is
  per-*finalidad* and the seven *finalidades* are fixed vocabulary in [`CONTEXT.md`](../../CONTEXT.md).
- Users are in Colombia, largely on mobile networks, many with low digital literacy. Spanish only.
- **SMS to +57 is expensive** — $0.05087/message (AWS End User Messaging), $0.0592 (Twilio)
  ([`messaging-providers.md`](messaging-providers.md) §5). Any alerting design that leans on SMS pays
  for it.

---

## What the budget actually leaves — and it is not $15

The map records "**$15 of the $25 budget remains**" after ADR-0004. That figure is correct as far as
it goes — it is $25 minus PlanetScale — but it is **the remainder before the app host is paid for**,
and ADR-0005 then spends most of it.

Assembling every already-decided line item:

| Line item | Decided in | Monthly cost |
|---|---|---|
| PlanetScale Postgres, 2 × PS-5 single node, us-east-1 | ADR-0004 (#4) | **$10.00** |
| Fly.io Machines, prod + staging (1 GB `shared-cpu-1x`, `iad`) | ADR-0005 (#25) | **$6.50–$9.50** |
| Object storage — Cloudflare R2 or Tigris, documents only | [#11](https://github.com/m0t0r/workforpereira/issues/11) | **~$0.00** (inside both free tiers) |
| Fly egress to object storage, $0.02/GB | ADR-0005 / [`object-storage.md`](object-storage.md) §2 | **~$0.01** |
| Transactional email — AWS SES at ~200 emails/month | [#6](https://github.com/m0t0r/workforpereira/issues/6) | **$0.03** |
| Domain (registration, amortised) | not ticketed | ~$1.00 |
| **Committed subtotal** | | **$17.54–$20.54** |
| **Remaining for observability and analytics** | | **$4.46–$7.46** |

Two notes on the range.

- **The Fly figure is a range because staging can autostop.** `app-host.md` §4 costed Fly at ≈$6.50
  with an autostopped staging Machine and ≈$9.50 with staging always on. ADR-0005 records that the
  1 GB machine size behind those numbers is **an unverified assumption** — at 512 MB the pair is
  materially cheaper ($3.19/machine in `iad`), at 2 GB materially worse.
- **Neither Fly nor PlanetScale offers a hard spend cap.** Fly, verbatim: *"We don't support billing
  alerts (yet), so budget accordingly"* (ADR-0005). PlanetScale does — see §4.

> **Working figure for the rest of this document: roughly $5/month, and realistically nearer $0.**
> Anything that costs money has to displace something already in the table. Every recommendation below
> is therefore a free tier or a self-hosted thing that fits on hardware already being paid for — and
> the honest answer is that **the recommended stack costs $0.00/month**, which is the only number that
> comfortably fits.

---

## 1. Error tracking

### Summary table

Free tiers and first paid prices observed 2026-08-16. "Steady state" is the recurring monthly cost
after any promotional period lapses — the only number that belongs in a recurring budget.

| | **Free tier, exactly** | **Retention** | **First paid** | **Steady state here** | **Next 16 App Router** |
|---|---|---|---|---|---|
| **Sentry Developer** | 5k errors, 5M spans, 50 replays, 5 GB logs, 1 cron monitor, 1 uptime monitor, 1 GB attachments, **1 user**, unlimited projects | **30 days** | Team **$26/mo** (annual) | **$0.00** | **Best in class** — see below |
| Sentry via the Fly.io extension | **Discontinued** — see §1.3 | — | — | **n/a** | — |
| **Rollbar Free** | 5,000 events, 1,000 session replays, unlimited users and projects | 30 days | Essentials **from $9/mo** (10k events) | $0.00 | No first-party Next.js RSC story found |
| **Honeybadger Developer** | 5,000 errors, 50 MB/day log ingest, 1 uptime monitor, 1 status page, **1 user** | **15 days** | Team **$26/mo** | $0.00 | Not verified |
| **GlitchTip hosted Free** | **1,000 events/mo** — and uptime pings count against it | 90 days | Small **$15/mo** (100k) | $0.00 | Sentry-API compatible |
| **GlitchTip self-hosted** | unlimited, MIT licensed | yours | — | **≈$7.88/mo on Fly** | Sentry-API compatible |
| **Bugsink self-hosted** | unlimited, PolyForm Shield (source-available, **not OSI**) | yours | hosted from $16/mo | **≈$3.64–7.20/mo on Fly** | Errors only — **no tracing** |
| **LaunchDarkly Developer** (Highlight's successor) | 5k session replays, 5k errors, 10M logs, 10M traces, **unlimited seats** | not verified | Foundation $10/service connection/mo | $0.00 | Unverified |
| **Highlight.io** | **Dead** — services deprecated **2026-02-28** | — | — | — | — |
| **Sentry self-hosted** | **16 GB RAM + 16 GB swap, 4 cores, 20 GB disk** minimum | yours | — | **~$80+/mo on Fly, RAM alone** | — |

### 1.1 Sentry Developer is the only option that is both free and genuinely good on Next.js 16

Quotas from [sentry.io/pricing](https://sentry.io/pricing/), read 2026-08-16: **5k errors/month, 5M
spans/month, 50 session replays/month, 5 GB logs/month, 1 cron monitor, 1 uptime monitor, 1 GB
attachments, 10 custom dashboards, unlimited projects, one user, 30-day lookback.**

The Next.js integration is the reason to pick it, and it was checked against the SDK source rather
than the marketing page:

- `@sentry/nextjs` **10.67.0**, MIT licensed, with **Next.js 16 as an explicit peer dependency**
  (changelog entry `chore(nextjs): Add Next.js 16 peer dependency (#17925)`,
  [sentry-javascript CHANGELOG](https://github.com/getsentry/sentry-javascript/blob/develop/CHANGELOG.md)).
  Minimum supported Next.js is 14.0.0.
- **Server Components are instrumented via `instrumentation.ts`.** `export const onRequestError =
  Sentry.captureRequestError;` — the docs say the hook captures errors from *"Server Components,
  middleware, and proxies"*, and Sentry has adapted to Next 16's `middleware` → `proxy` rename
  ([Next.js manual setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/)).
- **Server Actions are instrumented, but opt-in per action** — *"Wrap your Server Actions with
  `Sentry.withServerActionInstrumentation()`"*. This is the one place the integration is not
  automatic, and it matters because ADR-0006 makes Server Actions the adapter layer over every use
  case. **A Server Action that is not wrapped reports nothing.** It should be part of the use-case
  adapter convention, not a per-action decision.
- **Turbopack is first-class** — the manual-setup guide is written for *"Next.js 15+ with Turbopack
  and App Router"*, with Turbopack source-map upload and native debug IDs.
- `withSentryConfig` wrapping `next.config.ts` is **required**, for source-map upload and for the
  tunnel route that gets past ad blockers.

**The catch, and it is a real one: the free plan alerts by email only.** The
[pricing comparison table](https://sentry.io/pricing/) gives Developer *"Alerts and notifications via
email"*; *"Alerts and notifications via integrated tools"* and *"Third-party integrations"* start at
**Team ($26/month)**. Slack, Discord and webhooks are therefore not available on the free tier.
⚠️ This was readable only in the pricing comparison table — the Slack and Discord integration doc
pages carry no plan badge in fetched HTML. See [What could not be verified](#what-could-not-be-verified).

**There is also no usable Sentry mobile app.** The only official one,
[getsentry/sentry-mobile-release-health-app](https://github.com/getsentry/sentry-mobile-release-health-app),
states verbatim: *"Note: Please be aware that this project is currently not actively maintained."* It
was a release-health viewer, not an alerting app. Do not plan a 2am path around it.

§3 deals with what to do about that. The short version: **email is not a dead end**, because a
phone's mail client pushes.

### 1.2 Sentry Logs deserves separate billing attention

Sentry's free plan includes **5 GB of logs per month**, and
[Sentry Logs for Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/logs/) supports
`enableLogs: true`, a `consoleLoggingIntegration` that captures `console.log/warn/error` as
structured logs, `Sentry.pinoIntegration()` (SDK 10.18.0+), a Winston transport, and structured
attributes via `Sentry.logger.info("message", { … })`. Overage is PAYG at **$0.50/GB**
([docs.sentry.io/pricing](https://docs.sentry.io/pricing/)).

This collapses §2 into §1: **the logging destination and the error tracker can be the same free
account**, with no log-shipper Machine to run and pay for. It is the single largest cost avoidance in
this document.

### 1.3 The Fly.io ↔ Sentry offer — **discontinued, and it was a cliff anyway**

This was raised as a live lead. It is not live.

[Fly's own Sentry page](https://fly.io/docs/monitoring/sentry/), read 2026-08-16, states verbatim:

> **"Provisioning new Sentry projects through Fly.io (`fly ext sentry create`) is no longer
> available."**

The page is retained for existing users. What the partnership granted, verbatim from the same page:

> "Your organization received **one year** of Sentry's Team plan, which includes monthly: 50k errors,
> 100k performance units, 500 session replays, 1GB attachments."

and on expiry:

> "At the end of the promotional period, your Sentry organization will no longer have access to the
> sponsored Team plan."

Fly's stated remedy is to sign up with Sentry directly and set `SENTRY_DSN` as an app secret.

**Three findings worth keeping even though the offer is gone.**

1. **The flyctl reference pages are stale and will mislead.**
   [`fly extensions sentry create`](https://fly.io/docs/flyctl/extensions-sentry-create/) still
   renders as a live command — *"Provision a Sentry project for a Fly.io app"* — with **no deprecation
   notice anywhere on the page**, while the narrative doc says provisioning is unavailable. Anyone
   reading the CLI reference alone would conclude the offer exists. Trust the narrative page.
2. **Even if it had been available, it would have been the wrong shape for this budget.** The grant
   was **one year of Team**, and Team's list price is **$26/month billed annually**
   ([sentry.io/pricing](https://sentry.io/pricing/)) — more than the *entire* $25 infrastructure
   ceiling and roughly 5× the ~$5 this ticket actually has. Year 1: $0. **Year 2: either $26/month, or
   a downgrade to exactly the free Developer plan recommended below.** A recurring monthly ceiling
   cannot absorb a year-2 cliff, so the correct planning number was always the free tier. This is the
   same reasoning ADR-0004 used to prefer PlanetScale's flat $10 over a lower variable bill.
3. **Lock-in was not the risk.** Fly states: *"No migration steps are needed. Your existing Sentry
   organization, project, data, alerts, and SDK configuration remain intact."* The Sentry org survives
   independently of Fly; only the sponsorship ends. So the risk was purely the price cliff, not
   portability.

**Verdict: plan on Sentry Developer (free) from day one.** Nothing is lost by the offer's absence
except a year of higher quotas that this project's volume does not need — 5k errors/month is already
generous for a regional platform at launch, and the Team plan's *spans, logs, cron and uptime quotas
are identical to the free plan's* anyway.

### 1.4 Why not the alternatives

- **GlitchTip hosted free is unusable at 1,000 events/month**, and its own docs note that uptime
  monitor requests *"count as event for your organization's subscription"* — the monitoring eats the
  quota. **Self-hosted GlitchTip is the strongest paid alternative**: MIT licensed (verified against
  the [LICENSE file](https://gitlab.com/glitchtip/glitchtip-backend/-/raw/master/LICENSE)),
  Sentry-API compatible so `@sentry/nextjs` works unchanged, and it has tracing, logs and heartbeat
  monitors. It needs Postgres 14+ and *"512 MB RAM"* recommended, which on Fly is an app Machine plus
  a Postgres Machine plus a volume ≈ **$7.88/month** — more than the entire remaining budget, to
  replace something free.
- **Bugsink** is the cheapest self-host (single container, SQLite, no message queue,
  ≈**$3.64/month** at 512 MB + a 3 GB volume) and the licence is **PolyForm Shield 1.0.0** — source
  available, *not* OSI open source. It has **no tracing at all**, which forfeits the Web Vitals and
  slow-endpoint story in §6. ⚠️ Bugsink publishes no minimum RAM (`/docs/requirements/` 404s), so the
  512 MB figure is an extrapolation.
- **Sentry self-hosted is arithmetically impossible**: [develop.sentry.dev/self-hosted](https://develop.sentry.dev/self-hosted/)
  states minimums of **4 CPU cores, 16 GB RAM + 16 GB swap, 20 GB disk**. At Fly's *"about $5 per 30
  days per GB"* of RAM that is **~$80/month in memory alone**, over 3× the whole budget.
- **Highlight.io is dead.** Verbatim from
  [its own migration post](https://www.highlight.io/blog/launchdarkly-migration): *"Highlight.io will
  be deprecating services on February 28, 2026"* — five and a half months before this was written.
  ⚠️ **Its pricing page still renders live-looking tiers**; those numbers are dead. Its successor,
  the **LaunchDarkly Developer** plan, is genuinely generous (5k session replays, 5k errors, 10M logs,
  10M traces, unlimited seats — confirmed on
  [launchdarkly.com/pricing](https://launchdarkly.com/pricing/)) but it is a feature-flag vendor's
  observability side-product with no verified Next.js 16 RSC story, and adopting it would add a
  processor to the Ley 1581 register (§5) for capabilities Sentry already gives free.
- **Rollbar Free** (5,000 events, 1,000 replays, unlimited users, 30 days) and **Honeybadger
  Developer** (5,000 errors, 1 uptime monitor, 15-day retention) are both credible free tiers; neither
  has a first-party Next.js 16 App Router integration on the level of `@sentry/nextjs`, and both would
  lose Sentry's `onRequestError` RSC hook.

### 1.5 Ley 1581 configuration that is not optional

Error tracking is the one tool in this document that will see personal data by accident. §6.3 of
[`ley-1581-obligations.md`](ley-1581-obligations.md) names *"error tracking"* explicitly as needing a
*contrato de transmisión*, and art. 17(h) is stricter still: we may hand an *Encargado* *"únicamente
datos cuyo Tratamiento esté previamente autorizado"*. None of the seven *finalidades* in
[`CONTEXT.md`](../../CONTEXT.md) is "diagnose faults using your data".

The cheapest compliant posture is to make the question not arise:

| Setting | Value | Why |
|---|---|---|
| `sendDefaultPii` | **`false`** | This is already the [SDK default](https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/), but the setup wizard writes its own config — check what it generated. `true` *"behaves like enabling all `dataCollection` categories"*: IP address, cookies, HTTP request and response bodies, URL query parameters. Every one of those can carry a Titular's data. |
| Session Replay | **`replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 0`** | See §7. This is a product commitment, not a config default. |
| `Sentry.setUser` | **pseudonymous only** — the `person` public identifier from ADR-0003, never email, phone or name | Keeps issue-to-person correlation possible without shipping contact details abroad. |
| `beforeSend` / `beforeSendTransaction` | **scrub free-text and known PII field names** | §8 of the Ley research establishes free text as the place sensitive data actually arrives. A validation error that echoes the submitted value is the realistic leak. |
| Query strings and route parameters | **strip** | Municipality-plus-skill filters are not sensitive; a search string typed by a person can be anything. |
| Processor register | **add Functional Software, Inc. d/b/a Sentry**, 45 Fremont St, San Francisco | [Sentry's DPA](https://sentry.io/legal/dpa/) is self-serve, names GDPR/CCPA/UK/Swiss law, includes SCCs, and — like Cloudflare's and Fly's — **does not mention Colombia or Ley 1581**. Same shape defect already recorded in `app-host.md` §1 and `object-storage.md` §4; no new problem, one more row in the §6.3 register. |

---

## 2. Structured logging on Fly.io

### What Fly gives you for nothing

All read 2026-08-16.

| Surface | What it is | Retention | Cost |
|---|---|---|---|
| **Live tail** — `fly logs` / dashboard | Streaming | **~7 days** — the [Logs API page](https://fly.io/docs/monitoring/logs-api-options/) says the HTTP API mirroring `fly logs` gives *"access to historical logs going back to the current retention window (about 7 days)"* | $0 |
| **Log search** ([docs](https://fly.io/docs/monitoring/search-logs/)) | *"our own instance of VictoriaLogs … exposed through a Grafana interface"* | **"We currently retain logs for 7 days."** | **"During the beta period, log search is free."** |
| **Metrics** ([docs](https://fly.io/docs/monitoring/metrics/)) | Managed Prometheus + managed Grafana, built-in app metrics plus custom app-exposed metrics | *"approximately 15 days … intended for operational monitoring"* | *"There's currently no additional charge for the managed Prometheus and Grafana."* |
| **NATS log stream** ([docs](https://fly.io/docs/monitoring/exporting-logs/)) | *"Fly.io ships logs through a NATS stream … available to all of your apps via `nats://[fdaa::3]:4223`"* | **none** — *"NATS only streams logs from starting from the moment you connect"* | $0 |
| **Health checks** ([docs](https://fly.io/docs/reference/health-checks/)) | TCP/HTTP checks that gate routing | n/a | $0 |

Four things follow, and two of them are traps.

1. **Seven days of searchable logs, free, is genuinely enough for a solo developer** — and it beats the
   7-day window on either paid platform considered in `app-host.md`. It is *behind a beta label*,
   which is the risk: *"During the beta period, log search is free"* implies a period that ends.
2. **~15 days of free Prometheus metrics with a managed Grafana is a real gift**, and it is where CPU,
   memory and machine restarts live. Fly also lets an app expose custom metrics, so an
   application-level counter (offers accepted, consent records written) can land there without a
   vendor.
3. **⚠️ Fly has no alerting on any of it.** Verbatim: *"Fly.io doesn't include built-in alerting on
   metrics, so you'll need to set up alerting yourself against the Prometheus endpoint."* Grafana
   alerting or a self-run Alertmanager are the documented options — the first is plausible on Fly's
   managed Grafana, the second is another Machine.
4. **⚠️ Fly health checks do not notify anyone.** Verbatim: *"A failing health check can prevent
   request routing to your Machine. However your Machines won't automatically restart or stop due to
   failing their health checks, this needs to be done manually."* A health check is a routing control,
   **not** a monitor. This is the single most misleading thing in Fly's observability surface: the app
   can be fully down, the check red, and nobody told.

**Net: Fly gives you good retrospective visibility and zero proactive notification.** Everything in §3
exists to fill that.

**None of it is plan-gated, because Fly has no plans.** Verbatim from
[the pricing page](https://fly.io/docs/about/pricing/): *"Plans get complicated, so we just charge
based on usage."* The only tiers are support packages — Standard $29/month, Premium $199/month,
Enterprise from $2,500/month — plus HIPAA compliance at $99/month. There is **no free compute
allowance**; the only free items are the first 10 single-hostname certificates, the first 10 GB/month
of volume snapshots, shared IPv4 addresses and all inbound transfer. So metrics and 7-day log search
are free to everyone, including us.

### What shipping logs elsewhere costs

The mechanism is `fly-log-shipper` — a Machine running **Vector**, which *"hooks into Fly.io's internal
log stream"* and forwards to a Vector sink. It is an ordinary app, so it is an ordinary bill: at
`shared-cpu-1x` 256 MB in `iad` that is **$1.94/month**, 512 MB **$3.19/month**
([Fly pricing](https://fly.io/docs/about/pricing/), `iad` confirmed by `app-host.md` as Fly's baseline
cheapest region). Against ~$5 of headroom, **the shipper Machine alone is 39–64% of the entire
observability budget before a destination is chosen.**

**So the recommendation is not to run one.** Log to `stdout` in JSON (Pino), read it in Fly's free
7-day Grafana search, and send the subset that matters — warnings, errors, and deliberate
`Sentry.logger.*` calls — **directly from the application process** to Sentry Logs (§1.2), which is
free up to 5 GB/month on the same account that already holds the errors. No shipper, no second
destination bill, no Vector configuration, and structured attributes are queryable next to the
stack traces that caused them.

`Sentry.pinoIntegration()` (SDK 10.18.0+) makes this a few lines. **Do not enable
`consoleLoggingIntegration` indiscriminately** — capturing every `console.log` as a structured log is
how 5 GB/month gets spent, and it is also how an unscrubbed value reaches a processor.

### The audit log is not a log, and it must not live in any of the above

Handed over to this ticket from [#21](https://github.com/m0t0r/workforpereira/issues/21), via §5 of
[`ley-1581-obligations.md`](ley-1581-obligations.md): art. 4(g) and art. 17(d) require personal data to
be held *"bajo las condiciones de seguridad necesarias para impedir su adulteración, pérdida, consulta,
uso o acceso no autorizado o fraudulento"*, and **"acceso no autorizado" has to be *detectable* for any
of that to mean anything.** That implies audit logging of access to a Titular's data.

**It is a different artefact from everything else in this section, and conflating them is the mistake
to avoid:**

| | Diagnostic logs | **Audit log** |
|---|---|---|
| Purpose | debugging | evidencing lawful access |
| Home | stdout → Fly search / Sentry | **a Postgres table in `@repo/db`** |
| Retention | 7 days | **as long as the retention schedule says** (D.1377 art. 11) |
| Mutable? | irrelevant | **append-only, never `UPDATE`** |
| Leaves the country? | yes, to a processor | **no** |
| Ley 1581 status | incidental | an obligation |

Three consequences:

- **Seven-day log retention is fine for diagnostics and disqualifying for an audit trail.** The audit
  log is a table, not a log stream, and it is subject to the same append-only discipline §2 of the Ley
  research imposes on the consent log.
- **It must not be shipped to Sentry, Axiom or anywhere else.** Art. 17(h) — an *Encargado* may receive
  *"únicamente datos cuyo Tratamiento esté previamente autorizado"* — and a record of who read whose
  profile is exactly the kind of thing that should not leave.
- **The incident record with `escalated_at` belongs beside it.** §5 makes the **15-*días hábiles***
  SIC reporting clock start from detection *and escalation to the designated person or area*
  (`2.2.2.25.4.4`), not from the breach and not from a log line. That timestamp has to be captured
  deliberately by the runbook; it cannot be inferred afterwards. ⚠️ Note the citation caveat in §12 of
  the Ley research before quoting the deadline's source externally — art. 17(n) itself states no
  deadline; the 15 días hábiles come from the SIC's own instructions.

Scope belongs to [#21](https://github.com/m0t0r/workforpereira/issues/21) and
[#13](https://github.com/m0t0r/workforpereira/issues/13) — *which* accesses are audited is a
product decision, not an observability one. What this ticket settles is that **it is a table, it is
append-only, and it does not go to a vendor.**

### Free log destinations, if 7 days ever proves too short

Costed here so the option is priced rather than guessed at. Every one of these has a first-class sink
in `fly-log-shipper`'s [25 supported destinations](https://github.com/superfly/fly-log-shipper), so the
only question is the free allowance — and the ~$1.94/month shipper Machine on top of it.

| Destination | Free ingest | Free retention | Seats | First paid |
|---|---|---|---|---|
| **Axiom** (Personal) | **500 GB/month**, 25 GB storage | **30 days** | 1 | usage-based |
| **New Relic** | **100 GB/month** | ~8 days default | 1 full user | $0.40/GB over |
| **Grafana Cloud** | **50 GB logs** + 10k metric series + 50 GB traces + 50 GB profiles | **14 days** | 3 | Pro **$19/mo** platform fee + usage |
| **Sentry Logs** | **5 GB/month** | **7-day query window on Developer** (see below) | 1 | Team $26/mo |
| Better Stack | 3 GB/month | **3 days** | unlimited | Nano **$30/mo** |
| SigNoz Cloud | trial only | — | — | from $49/mo |

**Axiom's 500 GB at 30 days is the largest free allowance in this document by an order of magnitude**,
and it is the right upgrade if log retention ever becomes the binding constraint. But it costs
$1.94/month for the shipper — 39% of the observability budget — to solve a problem that does not exist
yet.

⚠️ **A Sentry inconsistency worth carrying:** the pricing page advertises a **30-day lookback** for the
Developer plan generally, while the [Logs docs](https://docs.sentry.io/product/explore/logs/) specify a
**7-day query window for Developer** (14 on Team, 30 on Business). Treat **7 days** as the operative
figure for *logs* and 30 days for *errors* until proven otherwise. That makes Sentry Logs exactly as
deep as Fly's own free log search — which is another reason not to pay for a shipper.

---

## 3. Uptime monitoring, and how an alert reaches a phone at 2am

**This is the section the ticket actually turns on**, and researching it produced the most
counter-intuitive finding in the document.

### The finding: the pager is the phone's operating system, not the monitor

Only two mechanisms reliably break through iOS Do Not Disturb / Focus without the user having
pre-whitelisted a contact: **Apple's critical-alert entitlement**, and **a phone call**. Telegram,
Discord, Slack, ordinary push and email all sit silently until morning unless the user has manually
added a per-app Focus exception.

**So "point a webhook at a Telegram bot" — the obvious cheap answer — is a morning-after notification
wearing a pager costume.** It is still worth having; it is not a 2am path on its own.

Three vendors hold the iOS critical-alert entitlement in their own apps (Better Stack, UptimeRobot,
Grafana), and one product turns the capability into a $4.99 one-time purchase that every other tool can
target.

### Summary table

Observed 2026-08-16.

| | **Free monitors** | **Free interval** | **Free alert channels** | **Phone-breaking alert?** | **First paid** |
|---|---|---|---|---|---|
| **UptimeRobot** | **50** | **5 min** | only **5 integrations**; Slack/Teams/webhook excluded | **Yes** — free iOS/Android app with *"critical-alert mode overriding Do Not Disturb"* | Solo **$9/mo** (60-sec, Slack/webhook) |
| **Better Stack** | 10 monitors + 10 heartbeats | ⚠️ **30 sec or 3 min — its own pages disagree** | email, push, Slack, Teams | ⚠️ **Disputed** — pricing page says unlimited SMS + calls free; other pages tie them to a **$29/mo Responder seat** | $25/mo (annual $21) |
| **Grafana Cloud Synthetics** | **100k API executions/mo** (≈2 probes at 1-min, continuously) | 10–3600 sec | full Grafana Alerting → Telegram, Pushover, webhook | Grafana mobile app; ⚠️ IRM escalation is a **paid add-on** | Pro $19/mo platform fee |
| **Healthchecks.io** | **20 cron/heartbeat jobs** | cron | **27 integrations, all free** | via Pushover **Emergency priority** | Business $20/mo |
| **Sentry** | **1 uptime + 1 cron monitor** | 1/5/10/20/30 min or 1 h | Sentry alert rules — **email only on Developer** | **No** | Team $26/mo |
| **StatusCake** | 10 uptime + 1 SSL + 1 domain | 5 min | integrations | **75 SMS credits/month free** | $24.49/mo |
| **Cronitor** | 5 monitors | 5 min | **email + Slack only** | No | $2/monitor/mo |
| **Hyperping** | 20 | 5 min | — | — | $29/mo |
| **OpenStatus** | 1 | 10 min | — | — | $30/mo |
| **Uptime Kuma** (self-host) | unlimited, **MIT**, **100 notification providers** | any | Telegram, ntfy, Gotify, Pushover, Signal, webhook… | via Pushover | **≈$2.09/mo on Fly** |
| **Pushover** | — | — | — | **Yes — Emergency priority retries until acknowledged** | **$4.99 one-time per platform**, then $0/mo, **10,000 messages/month free** |
| **ntfy.sh** | — | — | — | Push, but **no critical-alert entitlement** | free: **250 messages/day**, 5 emails/day, 0 phone calls |
| Cloudflare Free | **0 health checks** | — | **no origin-down notification exists on Free** | No | Health Checks require **Pro+** |
| Fly.io | health checks that **notify nobody** | — | none | No | n/a |

### Why an external monitor, and why not Sentry or Uptime Kuma

**Sentry cannot be the uptime pager, for a structural reason rather than a pricing one.** If the Fly
Machine is hard down it emits no errors, so there is nothing for Sentry to alert on. Its free plan does
include **1 uptime monitor** (configurable 1-minute to 1-hour interval, checked round-robin from
multiple regions, an issue raised only after **three consecutive failures**), which is worth pointing at
production — but on the free plan the alert arrives **by email only**, and there is no usable Sentry
mobile app. Sentry is the *diagnostic* tool; it is not the pager.

**Uptime Kuma is the cheapest and most capable option and the worst fit for its own purpose.** MIT
licensed, version 2.5.0 (2026-08-01), **100 notification providers** including Telegram, ntfy, Gotify,
Pushover and Signal, and about **$2.09/month** on Fly (`shared-cpu-1x` 256 MB at $1.94 + a 1 GB volume
at $0.15). But **a monitor running as a Fly Machine in `iad` shares a failure domain with the app it
watches.** A regional incident, a platform outage or a billing suspension takes down both at once and
**no alert is ever sent** — which is precisely the scenario it was bought for. ⚠️ Its RAM requirements
are also genuinely undocumented ([open issue #5884](https://github.com/louislam/uptime-kuma/issues/5884)),
so the 256 MB figure is unproven. Run it off Fly or treat it as a dashboard, never as the sole pager.

**Cloudflare, already in the stack, contributes nothing here.** The Free plan gets **0 health checks**
(Pro 10, Business 50), and the
[available notifications list](https://developers.cloudflare.com/notifications/notification-available/)
gives Free only Cloudflare Status incidents and maintenance, HTTP DDoS alerts, Security Center
insights, and a Web Analytics weekly summary. **Health Check notifications require Pro or higher and
webhooks require any paid plan.** One thing it does offer: **5 Cron Triggers per account on the Workers
Free plan** (100,000 requests/day), which is a viable DIY external prober if one is ever wanted.

### The recommended path, and what it costs

| Layer | Choice | Cost |
|---|---|---|
| External uptime probe | **UptimeRobot Free** — 50 monitors, 5-minute interval | **$0.00** |
| Phone-breaking alert | **UptimeRobot's free mobile app**, iOS critical-alert mode on | **$0.00** |
| Vendor-independent escalation | **Pushover**, Emergency priority | **$4.99 once**, then $0/month |
| Cron / heartbeat ("the nightly job did not run") | **Healthchecks.io Free** — 20 jobs, all 27 integrations free, supports Pushover Emergency | **$0.00** |
| Database events | **PlanetScale webhooks → a tiny route handler → Pushover/Telegram** (§4) | **$0.00** |
| Errors | **Sentry Developer**, email → the phone's mail app (§1) | **$0.00** |
| **Recurring total** | | **$0.00/month** |

**UptimeRobot over Better Stack, on the free tier, for one reason: its free tier is unambiguous.**
50 monitors at a 5-minute interval, and a free app that Uptime Robot's own
[mobile page](https://uptimerobot.com/mobile-app/) describes as having iOS critical-alert mode that
overrides Do Not Disturb. ⚠️ **Better Stack's free tier could not be pinned down** — its
[pricing page](https://betterstack.com/pricing) says *"Up to 30 seconds check frequency"*, *"Unlimited
phone call alerts"* and *"Unlimited SMS"* on Free, while its
[uptime marketing page](https://betterstack.com/uptime) says *"10 monitors, 10 heartbeats and a status
page with 3-minute checks totally free"* and lists voice calls as premium, and its comparison content
ties unlimited calls/SMS to a **$29/month Responder licence**. Two readings are defensible and the
Responder reading is more consistent with the rest of their model. **Do not build a 2am plan on a
contradiction** — verify in-app first, and if it holds, Better Stack's 30-second interval and free
phone calls would be the better product.

**Pushover is the best value in this document.** **$4.99 one-time per platform**, no subscription,
**10,000 messages/month free per application token**, and **Emergency priority retries until
acknowledged** — which is the actual 2am wake-up primitive. It is natively supported by Uptime Kuma,
Healthchecks.io (whose docs call out *"the Emergency priority"* specifically), UptimeRobot, Grafana and
Sentry, so it is **vendor-independent**: every monitoring decision above can be reversed without
changing how the phone rings. It is the one place where spending $4.99 once is obviously correct, and it
is a one-time capital cost, not a recurring line — so it does not consume the monthly budget at all.

### SMS to +57, costed, since #6 flagged it

[Twilio Colombia pricing](https://www.twilio.com/en-us/sms/pricing/co): **$0.0592 per outbound
message**, matching `messaging-providers.md` §5. At that rate **the entire ~$5/month observability
budget buys 84 messages**, and *one flapping monitor alerting every five minutes exhausts it in about
seven hours.*

The regulatory friction is worse than the price. Twilio's
[Colombia guidelines](https://www.twilio.com/en-us/guidelines/co/sms) record that **alphanumeric sender
IDs are "Not Supported"**, domestic long codes are unavailable, an international long code *"will be
overwritten with a short code"*, and short codes take **4–10 weeks** to provision. There is no sender
registration a solo developer can realistically complete.

**And email-to-SMS gateways for Colombian carriers should be treated as non-existent.** No official
documentation from Claro, Movistar, Tigo/UNE or WOM Colombia confirms a public gateway; the circulating
address formats are crowd-sourced, and Movistar's own community forum records the mobile-email service
being discontinued. Even where such gateways survive elsewhere they are unauthenticated, silently rate
limited and spam filtered — the opposite of what a page requires.

> **Conclusion: SMS is an escalation channel of last resort, never a primary one — and given
> Pushover's Emergency priority costs $4.99 once and does the same job better, it is not needed at
> all.**

### The honourable mention: Grafana Cloud

Worth recording because it is the one coherent single-account alternative to the assembled stack above:
**50 GB logs (14-day retention), 10k metric series, 50 GB traces, 100k synthetic check executions/month,
Grafana Alerting to Telegram or Pushover, and an official mobile app** — all free, 3 users. Its synthetic
probes include **São Paulo**, the only South American vantage point found anywhere in this research and
a materially better proxy for the Colombian network path than a US-East probe measuring the short hop.

Three reasons it is not the recommendation: the free tier's **14-day log retention is shorter than
Axiom's 30**, **IRM escalation and on-call rotation are a paid add-on**, and adopting it means one more
processor in the §6.3 register plus a `fly-log-shipper` Machine at ~$1.94/month to feed Loki. **Revisit
it if the Fly log-search beta ends and starts charging** — at that point Grafana Cloud becomes the
obvious consolidation.

---

## 4. Database monitoring — price PlanetScale's own surface first

The ticket asks for this explicitly, and the answer is that **PlanetScale's built-in observability
covers slow queries and disk, partly covers connections, and costs $0 on top of the $10 already
committed.** Nothing else should be bought for the database.

### What was actually verifiable, and what was not

The PlanetScale MCP tools were exercised live on 2026-08-16 against the project's organization.

`planetscale_list_organizations` returned `tkachenko-vitaly-job`, and the load-bearing fact is that
**`database_count` is `0`.** There is no database yet. Consequently:

- `planetscale_get_insights(organization: tkachenko-vitaly-job, database: encuentra, branch: main)`
  → `Insights not found` (404).
- `planetscale_list_schema_recommendations` → `not_found`.
- `planetscale_get_database` → `not_found`.
- `planetscale_list_databases` → **`forbidden`** — a separate finding from the empty database list;
  the token appears not to carry that scope for this organization.

**So Insights could not be observed in operation.** Everything below comes from the docs plus two
live organization-level facts, and that limitation is repeated in
[What could not be verified](#what-could-not-be-verified).

Two live organization fields are worth recording anyway, because one of them answers a question
ADR-0005 leaves open:

- `invoice_budget_amount: "20.0"`, `invoice_budget_alerts: true` — **PlanetScale has budget alerts and
  they are already switched on at $20.** Fly.io has none at all (ADR-0005, verbatim: *"We don't
  support billing alerts (yet)"*). PlanetScale's is currently the only spend alarm in the stack, and
  it is watching the flat, predictable half of the bill. Lower it to something that means something,
  or accept that the variable half is unwatched.
- `features: { insights: false, insights_collect_queries: true }` on a `plan: "developer"`
  organization with `has_card: false` and no databases. The `insights: false` flag is **most likely an
  artefact of having no paid database yet** — the [$5 launch post](https://planetscale.com/blog/5-dollar-planetscale-is-here)
  and `postgres-host.md` both list Query Insights as included at PS-5 — but that could not be proven
  from the API. Re-check the flag once the first database exists.

### Query Insights — what it gives you

[Query Insights docs](https://planetscale.com/docs/postgres/monitoring/query-insights), read
2026-08-16:

- **Per-pattern aggregation.** *"Queries are listed with literals replaced by ordinal placeholder
  values (e.g. `$1`). Normalizing queries in this way allows them to be grouped together into
  patterns."* Each pattern carries a fingerprint you can drill into — including from the MCP tool, by
  passing `fingerprint` + `keyspace` (`postgres.public` for Postgres).
- **Latency percentiles** p50/p95/p99/p99.9, queries per second, rows read/written per second.
- **Per-query CPU time and I/O time** for Postgres, plus rows read / returned / affected, block-cache
  metrics and bytes returned. ⚠️ **I/O timing requires the Postgres `track_io_timing` setting** — a
  configuration action, not a default.
- **Notable queries**, defined verbatim as those *"that took longer than 1s, read more than 10,000
  rows, or produced an error."* That is the slow-query log, already built and already paid for.
- **An Anomalies page**: *"We will also alert you of any active issues your database may be having in
  the Anomalies page. This feature flags queries that are running significantly slower than
  expected."*
- **Retention: 7 days.** *"You can click the dates listed above the graph to scroll through the past
  seven days."* Default view is the last 24 hours.

### Metrics — disk, memory, connections

[Metrics docs](https://planetscale.com/docs/postgres/monitoring/metrics), read 2026-08-16: CPU and
memory (primary and per-replica), **storage usage in absolute MB/GB**, read and write IOPS,
**connection counts split into active / idle / idle-in-transaction plus PgBouncer client and server
pool counts**, replication lag, transaction rate, and WAL archival success/failure, archive age and
storage consumption.

That is the whole of what #18 asked for — slow queries, connection exhaustion, disk — in one place, on
the $5 tier, at no extra charge. **The gap is not visibility, it is notification:** the page gives no
metrics retention figure and describes no alerting.

### Webhooks are the alerting mechanism, and they are the important find

[Webhook events reference](https://planetscale.com/docs/reference/webhook-events), read 2026-08-16.
PlanetScale posts an HTTPS callback on organization events. Four matter here, quoted verbatim:

| Event | Meaning |
|---|---|
| `cluster.storage` | *"A storage threshold (60%, 75%, 85%, 90%, 95%) has been crossed"* |
| `branch.out_of_memory` | *"A Postgres database experienced an out of memory (OOM) event"* |
| `branch.anomaly` | *"The branch has a new anomaly event in PlanetScale Insights"* |
| `branch.start_maintenance` | *"A production branch is about to start maintenance"* |

Mechanics from the [webhooks docs](https://planetscale.com/docs/api/webhooks): **up to 5 webhooks per
database**, HTTPS only, signed with an `X-PlanetScale-Signature` SHA-256 HMAC, a **2-second response
timeout** before the delivery is marked failed, and `pscale webhook list/create/show/update/test/delete`
from the CLI.

**This is the 2am path for the database, and it is free.** `cluster.storage` crossing 85% of a 10 GB
allowance and `branch.out_of_memory` on a 512 MB single node with no failover are precisely the two
ways ADR-0004's accepted risks turn into an outage. Point them at a Telegram bot or an ntfy topic (§3)
and the phone buzzes.

**The gap `cluster.storage` does not close: connection exhaustion.** There is no
`connections.exhausted` event. On PS-5 the pooled port 6432 fronts an `max_connections` that
`postgres-host.md` already records as **not publicly documented**, and the failure mode surfaces as
application-side connection errors, not a PlanetScale event. **That one has to be caught in error
tracking (§1) and prevented in the `pg.Pool` configuration** — `max: 10`, `idleTimeoutMillis: 300_000`,
`maxLifetimeSeconds: 600`, `connectionTimeoutMillis: 5_000`, which `postgres-host.md` already fixed for
a different reason (Fly's proxy recycling idle connections).

### Schema recommendations

[Schema recommendations docs](https://planetscale.com/docs/postgres/monitoring/schema-recommendations),
read 2026-08-16. Seven categories delivered as DDL: indexes for inefficient queries, redundant indexes,
primary-key ID exhaustion, unused tables (untouched four weeks), unused indexes (four weeks), bloated
tables, bloated indexes. *"Schema recommendations that depend on your database traffic run once per
day. Recommendations that depend only on database schema are run whenever the schema of your default
branch is modified."*

Two consequences here:

- **The traffic-derived ones are worthless until there is traffic**, and the unused-table/index ones
  need *four weeks* of it. Expect nothing useful before launch + one month. This is an argument for
  sequencing (§9), not against the feature.
- Triage belongs to the `planetscale-schema-recommendations-agent-loop` skill's shape — into a branch
  and a reviewed migration, never applied straight to production. That is a CI/CD concern
  ([#15](https://github.com/m0t0r/workforpereira/issues/15)).

### Query tags — how a slow query gets traced back to the code that issued it

This is what turns Insights from *"this query pattern is slow"* into *"this use case is slow"*, and it
is why the `planetscale-codebase-sqlcommenter-instrumentation` skill is on the ticket.

**PlanetScale's format is SQLCommenter.** From the
[query tags docs](https://planetscale.com/docs/postgres/monitoring/query-tags), read 2026-08-16: tags
are *"key-value pairs embedded in SQL comments written into each statement to the database"*, written
`/*key='value'*/`, values URL-encoded and single-quoted, comma-separated. Insights then shows them —
*"If any of the selected queries have query tags attached, you'll see the key-value pairs in the table
under `Tags`"* — and they also drive Database Traffic Control rules.

**Drizzle supports it natively, which resolves a conflict between two of this project's own sources.**
PlanetScale's docs say *"Drizzle and Prisma support SQLCommenter natively"*, while the bundled
`planetscale-codebase-sqlcommenter-instrumentation` skill files Drizzle under *"no maintained
SQLCommenter package — recommend manual tagging at the database client boundary"*. **The docs are
current and the skill is stale on this point.** Drizzle ships a
[`.comment()` method](https://orm.drizzle.team/docs/sql-comments) on `select`, `insert`, `update` and
`delete`, taking a bare string or an object:

```ts
db.select().from(publications)
  .comment({ usecase: 'publish_capability_profile', release: RELEASE_SHA });
// select … from "publications" /*usecase='publish_capability_profile',release='abc1234'*/
```

Three caveats, all verified:

1. **Placement.** PlanetScale is explicit: *"Tags must appear **before** the semicolon that ends the
   SQL statement. Tags placed after the semicolon are not recognized by PlanetScale."* Drizzle appends
   the comment at the end of the statement and emits no trailing semicolon, so this should be
   compatible — but **it was not exercised** (there is no database). Verify against a real Insights
   view before relying on it.
2. **Prepared statements.** Verbatim from Drizzle: *"You can't use `.comment()` after the statement has
   been prepared."* Not a practical problem: the pooled port 6432 runs PgBouncer in transaction mode,
   which rules out cross-transaction prepared statements anyway (`postgres-host.md`).
3. **`.comment()` is a Drizzle v1 feature.** The repo has no Drizzle dependency yet, so this is a
   constraint on the version pinned in [#24](https://github.com/m0t0r/workforpereira/issues/24), not a
   fact about the current tree.

**Proposed tag schema**, following the skill's standard policy and ADR-0006's layering:

| Tag | Value | Cardinality |
|---|---|---|
| `app` | `encuentra` | 1 |
| `env` | `production` \| `staging` | 2 |
| `usecase` | the function name in `apps/web/src/use-cases/` | tens |
| `module` | the owning `@repo/*` package | ten (ADR-0006) |
| `release` | short git SHA | bounded by deploy rate |
| `source` | `web` \| `migration` \| `job` \| `agent` | 4 |

`usecase` is the load-bearing one. ADR-0006 makes orchestration a plain
`(db, actorPersonId, input)` function in `apps/web/src/use-cases/`, so there is exactly one natural
injection point and it maps one-to-one onto a user-visible action.

**The Ley 1581 constraint on tags is hard, and belongs in the same breath.** The skill's own policy —
*"Do not include secrets, PII, user IDs, request IDs, raw tenant IDs, or raw URLs"* — is not merely
hygiene here. `actorPersonId` identifies a Titular, and a query tag is a comment that lands in
PlanetScale's telemetry and, via Insights, in a vendor's UI. **Never tag with `personId`, `userId`, an
email, or a raw request path.** Low cardinality and no personal data are the same rule arriving from
two directions.

### Database monitoring: costed

| Item | Cost |
|---|---|
| Query Insights — 7-day retention, notable queries, anomalies, per-query CPU/IO | **$0.00** — inside the $10 |
| Metrics — storage, memory, connections, PgBouncer pools, WAL archival | **$0.00** — inside the $10 |
| Schema recommendations — 7 categories, daily | **$0.00** — inside the $10 |
| Webhooks — 5/database, incl. `cluster.storage`, `branch.out_of_memory`, `branch.anomaly` | **$0.00** — inside the $10 |
| Query tags via Drizzle `.comment()` | **$0.00** — a code convention |
| Invoice budget alerts | **$0.00** — already on at $20 |
| **Buy nothing else for the database** | **$0.00** |

---

## 5. Product analytics compatible with Ley 1581

### The legal test comes first, because it eliminates most of the market

Under Ley 1581 the question is not *"is this tool GDPR-friendly"*. It is narrower and harder:

1. **Does the tool process *datos personales*?** An IP address, a device fingerprint, a persistent
   client-side identifier and a cross-visit user ID all are.
2. **If yes, under which *finalidad*?** Consent is per-*finalidad*, and
   [`CONTEXT.md`](../../CONTEXT.md) fixes the vocabulary at exactly seven: *hold an account and
   profile; publish; disclose contact details; send transactional messages; send suggestions; send
   news; keep the platform safe*. **None of them is "measure how the product is used."** Inventing an
   eighth is possible, but D.1377 art. 5 requires it to be disclosed at or before collection with its
   own separately selectable checkbox, and the SIC's 2022 *Formatos modelo* is explicit that *"cada
   finalidad […] debe contar con un mecanismo que le permita al Titular seleccionar por separado."*
3. **What does an eighth checkbox actually cost?** It is not free. It is one more decision on a
   signup screen for an audience the map describes as having low digital literacy, on a product whose
   proposition is dignity rather than data. And it is *worse than useless*: analytics gathered only
   from people who opted in is biased precisely against the users hardest to serve.

> **Therefore the requirement is not "analytics with a consent banner". It is analytics that never
> processes personal data, so that no *finalidad* and no checkbox are needed at all.**
> Colombia has no separate cookie statute — §3 of [`ley-1581-obligations.md`](ley-1581-obligations.md)
> records that the general consent rules are what apply — so *cookieless* is not a legal formality
> here; it is the whole mechanism by which the tool stays out of scope.

That single test decides the section.

### Summary table

Observed 2026-08-16.

| | **Free tier** | **Cookies / client state** | **IP** | **Consent needed here?** | **New processor?** | **Cost** |
|---|---|---|---|---|---|---|
| **Cloudflare Web Analytics** | **Free on all plans**; ~10 sites soft limit | **None** — *"does not rely on client-side state like cookies or localStorage"* | *"we don't 'fingerprint' individuals via their IP address, User Agent string, or any other data"* — ⚠️ but no statement about *storage* | **No** | **No** — Cloudflare is already the CDN (ADR-0005) | **$0.00** |
| **Umami self-hosted** | unlimited, **MIT**; Postgres ≥12.14, Node ≥18.18 | **Cookieless** — *"Umami does not use any cookies in the tracking code"* | yours to control | **No** | **No** — you are the processor | **≈$3.19/mo** (one 512 MB Fly Machine, reusing PlanetScale) |
| Umami Cloud (Hobby) | ⚠️ reportedly 100k events/mo, 3 sites, 6-month retention — **not verifiable**; `umami.is/pricing` is a client-rendered SPA that returns no readable content | Cookieless | ⚠️ not documented | Probably not | Yes | $0.00 |
| **Plausible Cloud** | **No free tier** — 30-day trial only | Cookieless; *"we don't generate persistent identifiers"* | Raw IP **never persisted**; daily rotating salted hash, salt deleted every 24 h | Probably not | Yes | **$9/mo** (Starter, 10k pageviews) |
| Plausible Community Edition | unlimited, **AGPLv3** | Cookieless | yours | No | No | **≈$17.80/mo on Fly** — needs Postgres **and** ClickHouse (*"At least 2 GB of RAM is recommended for running ClickHouse"*) |
| **PostHog Cloud** | 1M events, 5k replays, 1M flag requests, 1,500 surveys, 100k exceptions, 1M warehouse rows — **no card** | **Cookie by default** — `persistence: "localStorage+cookie"`, `ph_<key>_posthog`, **365-day expiry**. Cookieless via `persistence: "memory"` | **On by default**; *"automatically disabled by default for all new projects"* on **Cloud EU** only | **Yes, as shipped** — PostHog itself says so | Yes | $0.00 |
| Fathom | **No free tier** — 7-day trial | Cookieless; EU isolation on by default, EU IPs *stripped* | stripped/anonymised | Probably not | Yes | **$45/mo** minimum |
| GoatCounter | free for *"reasonable public usage"* — **no published numeric limit**, commercial terms undocumented | Cookieless; IPs processed but *"not stored in the database"* | not stored | Weakest legal footing of the set — its own GDPR page leans partly on legitimate interest and says *"I'm not a lawyer"* | Yes | $0.00 |
| Matomo Cloud | trial only | — | — | — | Yes | **€29/mo** (50k hits) |

### Cloudflare Web Analytics wins, and not narrowly

Sources: [product page](https://www.cloudflare.com/web-analytics/),
[developer docs](https://developers.cloudflare.com/web-analytics/), all read 2026-08-16.

- **Free.** *"Privacy-first, lightweight, accurate web analytics—for free"*, and the docs list it as
  *"Available on all plans"*.
- **No client-side state, verbatim:** *"Cloudflare Web Analytics does not use any client-side state,
  such as cookies or localStorage, to collect usage metrics. We also don't 'fingerprint' individuals
  via their IP address, User Agent string, or any other data for the purpose of displaying
  analytics."* That is the sentence that keeps it outside the *finalidad* question entirely.
- **No proxy required:** *"Privacy-first analytics for your website without changing DNS or using
  Cloudflare proxy."* It is a JS beacon, so it works regardless of how the CDN is configured.
- **No new processor.** ADR-0005 already puts Cloudflare's CDN in front of the Fly origin, so
  Cloudflare is already in the §6.3 register. Picking Plausible, Umami Cloud, Fathom or PostHog
  instead means **one more contracting entity, one more DPA, one more register row** — for a capability
  Cloudflare gives away.

**Its four real limits, stated up front so nobody is surprised later**
([FAQ](https://developers.cloudflare.com/web-analytics/faq/)):

1. **Sampling.** Verbatim: *"We retain unsampled beacon data for the past 7 days, after this point
   data is aggregated down to around 10%."* Ingest itself is complete — *"The data ingestion pipeline
   does not apply sampling — every received beacon will be recorded"* — it is the *history* that is
   decimated. Total accessible retention is **6 months**. Fine at launch volume; not a tool for
   precise long-run cohort analysis, and it must not be sold internally as one.
2. **No custom events and no UTM tracking**, and query strings are not logged. So "did this campaign
   work" and "did this button get clicked" are simply not answerable. Given §7, most of what you would
   want custom events *for* is refused anyway — but a launch-campaign attribution question has no
   answer here.
3. **Core Web Vitals are Chromium-only** — Safari and Firefox are listed as *"coming soon"*. On
   Colombian Android traffic that is good coverage; **iOS users contribute no performance data at
   all**, which biases the numbers toward the cheaper devices. That is arguably the right bias for
   this audience, but it should be known rather than discovered.
4. **~10 sites per account** soft limit (raisable via support). Irrelevant at two environments.

⚠️ **One honesty caveat about the compliance story.** Cloudflare states clearly that it uses no
cookies or `localStorage` and does not fingerprint via IP or User-Agent. It does **not** publish an
explicit statement about whether the beacon's source IP is stored or discarded server-side, and it
makes **no explicit "no consent banner required" claim** the way Plausible and Fathom do. The
cookieless part is documented; the IP-handling part is an absence, not a denial. Recorded in
[What could not be verified](#what-could-not-be-verified), and worth one support question before the
*política de tratamiento* asserts anything specific about it.

**PostHog is the tempting wrong answer.** Its free tier is by far the most generous of any tool in
this document (1M events/month, plus flags, surveys and error tracking on top). But
[PostHog's own GDPR page](https://posthog.com/docs/privacy/gdpr-compliance) says the quiet part
out loud: *"Since PostHog automatically captures data which can be personal data, you must provide a
mechanism for the consensual capturing of that data"*, and *"If you use PostHog with cookies on your
website (for logged out users), you should also use a cookie banner."* IP capture is on by default
except on EU Cloud, where *"IP data capture is automatically disabled by default for all new
projects."* Making PostHog compliant here means an eighth *finalidad*, an eighth checkbox, EU Cloud,
person-profiles off, and replay off — at which point it is Cloudflare Web Analytics with more
configuration surface and one more processor. **Revisit only if feature flags become a genuine need**;
that is a different problem with a different answer.

**Plausible has no free tier.** [plausible.io](https://plausible.io/#pricing): 30-day trial, then
**$9/month** for the Starter plan at 10k monthly pageviews. That is roughly **twice the entire
remaining observability budget** for something Cloudflare does for nothing. Self-hosting the AGPLv3
Community Edition is worse, not better: it needs Postgres **and** ClickHouse, and Plausible's own
[deployment guide](https://github.com/plausible/community-edition) says *"At least 2 GB of RAM is
recommended for running ClickHouse and Plausible without fear of OOMs."* On Fly that is a 2 GB Machine
($10.70) plus an app Machine ($3.19) plus Postgres ($1.94) plus volumes ≈ **$17.80/month** — over three
times the entire remaining budget.

**Umami self-hosted is the genuine runner-up, and it is close.** MIT licensed, verbatim cookieless
(*"Umami does not use any cookies in the tracking code"*), it needs only **Postgres ≥ 12.14 and Node
≥ 18.18** — no ClickHouse, no message queue — so it is **one 512 MB Fly Machine at $3.19/month**, and
it can point at a database we already pay for. Crucially it also ships **native Core Web Vitals since
v3.1.0** (LCP, INP, CLS, FCP **and TTFB**, enabled with `data-performance="true"`), which is a
*superset* of what Cloudflare collects and is not restricted to Chromium. Two reasons it still loses:
it costs **$3.19 of a ~$5 budget** where Cloudflare costs nothing, and self-hosting means we own its
uptime, its upgrades and its backups — which is the opposite of the problem this ticket exists to
solve. ⚠️ Umami *Cloud*'s Hobby tier could not be verified at all: **`umami.is/pricing` is a
client-rendered SPA that returns no readable content**, and the "100k events, 3 sites, 6-month
retention" figures are third-party.

> **Take Umami if Cloudflare's Chromium-only vitals or missing custom events turn out to bite.** It is
> the pre-costed escape hatch, and $3.19/month still fits.

### What we actually measure, and it is deliberately little

With Cloudflare Web Analytics the available dimensions are page path, referrer, country, browser,
operating system and device type, plus the Core Web Vitals in §6. The product questions worth asking
of that, at launch, are few:

- Do people reach `/registro` and finish it? (path funnel, aggregate counts only)
- Which entry points bring people who publish something?
- Is the site usable on the devices Colombians actually arrive on — which is an OS/browser
  distribution question, and directly actionable for the accessibility bar in the handoff.
- Where does the mobile experience fall over? (§6)

Anything beyond that — per-person timelines, cohorts, behavioural segments — is refused in §7, not
merely unbuilt.

**One thing analytics must never be used for: counting Titulares.** How many people hold an account,
how many published, how many offers were accepted — those are **database queries against data we hold
under an existing *finalidad***, not analytics events. Keeping that boundary sharp is what stops the
analytics tool from quietly acquiring an identity graph.

---

## 6. Real-user performance: Core Web Vitals on Colombian mobile

### Field data versus synthetic — the distinction that matters here

**Synthetic** means a machine loads the page on a schedule from a known location and reports what it
saw. **Field data (RUM)** means real devices on real networks report what real people experienced.
They answer different questions, and for this audience they diverge more than usual: the users are on
Colombian mobile networks, on mid- and low-range Android devices, at a Virginia origin behind a CDN.
A synthetic run from a US datacentre on a fast machine will tell you almost nothing about that.

### The bad news: CrUX will almost certainly not cover this site

[CrUX methodology](https://developer.chrome.com/docs/crux/methodology), read 2026-08-16, gives two
eligibility criteria: the page must be **publicly discoverable** (HTTP 200, no `noindex`, indexable)
and **sufficiently popular** — *"A page is determined to be sufficiently popular if it has a minimum
number of visitors"*, and, verbatim, *"An exact number is not disclosed, but it has been chosen to
ensure that we have enough samples to be confident in the statistical distributions for included
pages."*

Two independent reasons this project will not be in CrUX at launch:

1. **Traffic.** A new regional platform in Risaralda will not clear an undisclosed popularity
   threshold set for global web-scale statistics.
2. **Indexability.** §5 of [`ley-1581-obligations.md`](ley-1581-obligations.md) records art. 4(f):
   personal data must not be *"disponibles en Internet […] salvo que el acceso sea técnicamente
   controlable"* — candidate profiles must be authenticated, never publicly indexable. The
   authenticated surface is therefore **structurally ineligible** for CrUX no matter how popular it
   becomes.

Two further CrUX exclusions bite here specifically: **Chrome on iOS contributes no data**, and neither
do other Chromium browsers such as Edge ([methodology](https://developer.chrome.com/docs/crux/methodology)).

**Consequence: everything downstream of CrUX is also empty.** The Google
[Search Console Core Web Vitals report](https://support.google.com/webmasters/answer/9205520) states
*"The data for the Core Web Vitals report comes from the CrUX report"*, and omits any URL group without
*"a minimum amount of reporting data"*. The "field data" panel in PageSpeed Insights, the
[CrUX API](https://developer.chrome.com/docs/crux/api) (free, **150 queries/minute** per Google Cloud
project, no documented daily cap), the
[CrUX History API](https://developer.chrome.com/docs/crux/history-api) (**40 weeks**, same quota,
*"it is not possible to pay for an increased quota"*) and the
[CrUX BigQuery dataset](https://developer.chrome.com/docs/crux/bigquery) (monthly, with per-country
tables, inside BigQuery's 1 TB/month free tier) all read the same source. **Every one is free, and
every one will be empty. Plan as if CrUX does not exist**, and treat it as a pleasant surprise if the
origin ever qualifies.

### The good news: the RUM you need is already free and already chosen

[Cloudflare Web Analytics Core Web Vitals](https://developers.cloudflare.com/web-analytics/data-metrics/core-web-vitals/),
read 2026-08-16, collects **LCP, INP and CLS** as real-user field data — *"Web Analytics uses its
lightweight JavaScript beacon to collect the information Vitals Explorer uses"* — supplemented by First
Paint and First Contentful Paint, and filterable *"by URL, Browser, Operating System, Country, and
Element"*. Country and OS filtering is exactly the cut this project needs: **LCP in Colombia, on
Android, on the pages that matter.**

So the same free beacon chosen in §5 for product analytics is also the RUM tool. **$0.00, one script,
no cookies, no new processor.** That coincidence is the single strongest argument in this document.

**And there is a second free RUM source already in the stack.** Sentry's
[automatic browser instrumentation](https://docs.sentry.io/platforms/javascript/tracing/instrumentation/automatic-instrumentation/)
collects **LCP, CLS, TTFB and INP** as spans via `browserTracingIntegration()` — FID was removed in SDK
10.0.0 — and the free Developer plan includes **5M spans/month**. So Web Vitals arrive on the error
tracker too, attached to the transaction that produced them, which is the cut Cloudflare cannot give
you: *this page was slow, and here is the server work behind it.* Set a **low `tracesSampleRate`**
(0.1 or less) so the span quota is not the thing that runs out, and note that this is the one place
where performance data and personal data can meet — the same `beforeSendTransaction` scrubbing from
§1.5 applies.

The three sources are complementary, not redundant:

| Source | Answers | Cost |
|---|---|---|
| Cloudflare Web Analytics | *Is it slow, for whom, in which country, on which OS?* | $0 |
| Sentry tracing spans | *Which server work made this page slow?* | $0 |
| `web-perf` + Chrome DevTools MCP | *Why, in this specific render?* | $0 |

**Fallback if a metric is ever needed that Cloudflare does not expose:** Next.js ships
[`useReportWebVitals`](https://nextjs.org/docs/app/api-reference/functions/use-report-web-vitals)
from `next/web-vitals` (docs at Next 16.3.1). It reports **TTFB, FCP, LCP, FID, CLS and INP** with
`value`, `delta`, `rating` and `navigationType`, requires a `'use client'` component — best isolated in
a leaf component imported by the root layout so the client boundary stays small — and the documented
transport is `navigator.sendBeacon(url, body)` with a `fetch(…, { keepalive: true })` fallback. That
would post to our own route handler. **It is deliberately not the recommendation**: it means building
and operating an ingest endpoint, a store and a chart, and Ley 1581 then makes *us* the party that must
justify what the beacon carries. Take it only when Cloudflare demonstrably falls short, and if taken,
send the metric, the `rating`, the normalised route and nothing else — never the raw URL.

### Synthetic, for the things RUM cannot tell you

RUM tells you the page is slow. It does not tell you *why*, and it cannot run before launch when there
are no users at all. Three free synthetic paths, in order of usefulness here:

1. **The `web-perf` skill over the Chrome DevTools MCP** — on-demand measurement of LCP, INP, CLS plus
   render-blocking resources, network dependency chains, layout shifts and caching gaps, run from the
   developer's machine against a local or staging build. **Free, and the only one of the three that
   explains a regression rather than just detecting it.** This is the right tool for "the offer page
   got slow"; use it with CPU and network throttling so the profile resembles a mid-range Android on
   mobile data, not a laptop on fibre.
2. **Lighthouse CI in GitHub Actions.** `m0t0r/workforpereira` is a **public** repository, and GitHub's
   billing docs state standard GitHub-hosted runners are **free in public repositories** (private repos
   on the Free plan get 2,000 minutes/month). So a per-PR Lighthouse budget check costs **$0.00** and
   catches regressions at review time rather than in production. This belongs to
   [#15](https://github.com/m0t0r/workforpereira/issues/15)'s pipeline, but it is named here because it
   is the cheapest performance guardrail available.
3. **PageSpeed Insights** — free, and its *lab* half (a Lighthouse run) still works with zero traffic.
   Only its *field* half depends on CrUX and will be blank. ⚠️ Its API quota is **not published in the
   public docs**; the widely-quoted 25,000/day figure appears only in Cloud Console screens and
   third-party writeups.

**Yes, free synthetic tooling can simulate a slow mobile connection.** Lighthouse's default mobile
profile — inherited by PageSpeed Insights, Lighthouse CI and Unlighthouse — is
[documented](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md) as **"Slow 4G":
150 ms RTT, 1,638 Kbps down, 750 Kbps up, with a constant 4× CPU slowdown**. That is a reasonable
stand-in for a mid-range Android on Colombian mobile data, and it costs nothing.

**And one free tool can test from South America.** WebPageTest's **Starter tier is free with 150 test
runs/month** ([Catchpoint pricing](https://www.catchpoint.com/webpagetest-pricing)), and its
**São Paulo** location is available on Starter. There is no Colombia location anywhere in this research;
São Paulo is the closest free vantage point found. ⚠️ Deeper WebPageTest detail could not be read —
`webpagetest.org` returns 403 to non-browser clients and `product.webpagetest.org` has an expired TLS
certificate.

**Grafana Cloud's free synthetic monitoring also probes from São Paulo** (§3), which is the same
capability arriving from a different vendor. If a Colombia-path measurement ever becomes a standing
need rather than a spot check, that is the cheaper home for it.

---

## 7. What we deliberately do not track

This is a product commitment, and it should be written into the *política de tratamiento* in the same
words. It is short enough to be honoured and specific enough to be falsifiable — which is the point.
Each line names the thing, and the reason it is refused rather than merely deferred.

**1. No session replay. Ever.**
Sentry's free plan includes 50 replays/month; LaunchDarkly's includes 5,000; Rollbar's includes 1,000.
All three stay at zero. A session replay records what a person types into a form. §8 of
[`ley-1581-obligations.md`](ley-1581-obligations.md) establishes that **free text is exactly where
*datos sensibles* actually arrive** — *"salí por incapacidad médica"*, *"trabajé en la parroquia"*,
*"fui delegado sindical"* — and that C-748/2011 struck the *"manifiestamente públicos"* exception, so
a person typing it does not authorise our use of it. Replay would capture health, union, religious and
political data with no lawful basis and no way to pre-classify it, and **art. 23(d) allows the SIC to
order the immediate and definitive closure of an operation involving *datos sensibles*.** No feature is
worth that. Config: `replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 0`, and the
`replayIntegration` left out of the bundle entirely so it cannot be switched on by accident.

**2. No cross-site tracking, no advertising pixels, no third-party marketing tags.**
No Meta Pixel, no Google Ads tag, no LinkedIn Insight Tag, no TikTok pixel — including "just for
launch". Each would be a new *Encargado* receiving a Titular's browsing behaviour with no matching
*finalidad*, and the platform's proposition is dignity and agency, not audience building.

**3. No behavioural profiling of individuals, and no per-person analytics timeline.**
Aggregate counts only. We do not build "what did person X look at" — not in analytics, not in the
database, not in a log. The seven *finalidades* include *send suggestions*, and matching runs on
**skill and municipality**, which are declared data a person deliberately published. Suggestions are
also **pull-first** (map #1). Nothing in that requires a behavioural profile, and building one would
quietly convert a declared-data product into an inferred-data one.

**4. No IP address retention in analytics.**
An IP is personal data and, at Colombian municipality granularity, a location inference nobody
consented to. Analytics must either never receive it or discard it at the edge without writing it to
storage. This is the single criterion that decides §5.

**5. No content of free-text fields in any telemetry.**
Not in error reports, not in logs, not in query tags, not in analytics event properties. The
`beforeSend` scrubber in §1.5 and the tag policy in §4 are the two enforcement points. A validation
error that echoes the rejected value is the realistic leak, and it is a code-review item.

**6. No `personId`, email, phone, cédula or name in query tags, logs or metrics labels.**
Only the ADR-0003 public identifier, and only where correlating an error to a person is genuinely
required to answer that person's own support request.

**7. Nothing that could reconstruct earthquake-affected status.**
Map #1 makes this a given: *"earthquake-affected status is never collected"*. It must not be
reintroduced through the back door either — no municipality-plus-signup-date cohort dashboards, no
"affected zone" segment, no campaign parameter that encodes it. §8 of the Ley research is explicit
that this is precisely the class of attribute whose misuse invites discrimination.

**8. No A/B testing on people without a lawful basis, and no experimentation on the consent flow.**
Splitting traffic to see which consent wording converts better is manufacturing consent, which
D.1377 art. 4 forbids by way of *"medios engañosos o fraudulentos"*. If experimentation is ever wanted
elsewhere, it needs its own *finalidad* and its own checkbox.

**9. No `Sentry.setUser` with contact details, and no telemetry from the consent flow itself.**
The consent step is the one screen where every keystroke is legally loaded. Instrument it with
counters — *shown*, *submitted*, *abandoned* — and nothing else.

**A note on how this is kept honest.** Every item above is a default that a future integration can
silently undo — a wizard that writes `sendDefaultPii: true`, an analytics snippet whose default is
cookies, a replay integration pulled in by an SDK upgrade. The commitment is only real if the
*política de tratamiento* states it and something in CI notices when it changes. That belongs to
[#21](https://github.com/m0t0r/workforpereira/issues/21) and
[#15](https://github.com/m0t0r/workforpereira/issues/15), not here, but it is the difference between a
policy and a paragraph.

---

## 8. The costed recommendation

### The stack

| # | Concern | Tool | Free-tier limit, exactly | Monthly |
|---|---|---|---|---|
| 1 | **Errors** | **Sentry Developer** | 5k errors, 5M spans, 5 GB logs, 50 replays (unused), 1 cron monitor, 1 uptime monitor, 1 GB attachments, **1 user**, **30-day** error lookback | **$0.00** |
| 2 | **Structured logs** | **Pino → stdout → Fly log search**, plus `Sentry.pinoIntegration()` for warn/error | Fly: **7 days**, searchable, *"free during the beta period"*. Sentry: 5 GB/mo, **7-day** query window on Developer | **$0.00** |
| 3 | **Infra metrics** | **Fly managed Prometheus + Grafana** | *"approximately 15 days"*; *"no additional charge"* | **$0.00** |
| 4 | **Uptime probe** | **UptimeRobot Free** | **50 monitors, 5-minute interval**, 5 integrations, 1 basic status page | **$0.00** |
| 5 | **The 2am path** | **UptimeRobot mobile app** (iOS critical-alert mode) **+ Pushover Emergency priority** | Pushover: **10,000 messages/month**, **$4.99 one-time per platform** | **$0.00** (+$4.99 once) |
| 6 | **Cron / heartbeat** | **Healthchecks.io Free** | **20 jobs**, 100 log entries each, **all 27 integrations free**, supports Pushover Emergency | **$0.00** |
| 7 | **Database** | **PlanetScale Insights + Metrics + schema recommendations + webhooks**, and Drizzle `.comment()` query tags | included in the $10 already committed; Insights **7-day** history; **5 webhooks/database** | **$0.00** |
| 8 | **Spend alarm** | **PlanetScale invoice budget alerts** (already on at $20) + a manual monthly check of the Fly invoice | Fly has **no billing alerts at all** | **$0.00** |
| 9 | **Product analytics** | **Cloudflare Web Analytics** | Free on all plans; ~10 sites; unsampled **7 days** then ~10%, **6-month** total retention | **$0.00** |
| 10 | **Real-user Core Web Vitals** | **Cloudflare Web Analytics** (LCP/INP/CLS, Chromium-only) + **Sentry tracing spans** (LCP/CLS/TTFB/INP) | inside 9 and 1 | **$0.00** |
| 11 | **Synthetic performance** | **`web-perf` + Chrome DevTools MCP** on demand; **Lighthouse CI in GitHub Actions** | Actions is **free on public repositories**, and this repo is public | **$0.00** |
| | **Total recurring** | | | **$0.00/month** |
| | **One-time** | Pushover, one platform | | **$4.99** |

### The running total against the budget

| Line item | Monthly |
|---|---|
| PlanetScale Postgres, 2 × PS-5 (ADR-0004) | $10.00 |
| Fly.io Machines, prod + staging (ADR-0005) | $6.50–$9.50 |
| Object storage (#11) + Fly egress | ~$0.01 |
| AWS SES (#6) | $0.03 |
| Domain, amortised | ~$1.00 |
| **Everything in this document** | **$0.00** |
| **Total** | **$17.54–$20.54** |
| **Budget** | **< $25.00** |
| **Headroom remaining** | **$4.46–$7.46** |

**The recommendation deliberately spends none of the remaining budget**, and that is the point rather
than a boast. The headroom is $4.46–$7.46, the Fly machine size behind it is an unverified assumption
(ADR-0005), and **neither Fly nor PlanetScale offers a hard spend cap**. Committing $3–8/month of
recurring observability spend would leave the project with no absorptive capacity for the two things
most likely to actually move the bill: a larger Fly Machine, or a database that outgrows PS-5.

**Two pre-costed upgrade paths, if a free tier fails:**

| Trigger | Response | Monthly |
|---|---|---|
| Fly's log-search beta ends and starts charging | `fly-log-shipper` → **Axiom Personal** (500 GB/mo, 30-day) or **Grafana Cloud** (50 GB, 14-day) | **+$1.94** (the shipper Machine) |
| Cloudflare's Chromium-only vitals or missing custom events bite | **Umami self-hosted** — MIT, Postgres-only, native LCP/INP/CLS/FCP/TTFB | **+$3.19** |
| 5k errors/month is exceeded | **GlitchTip self-hosted** (MIT, Sentry-API compatible, keeps `@sentry/nextjs`) | **+$7.88** — at which point something else must give |

### What this trades away

Stated plainly, in the manner of ADR-0004:

- **Sentry's free tier alerts by email only.** No Slack, no Discord, no webhooks until $26/month. The
  mitigation — a phone's mail client pushes — is real but weaker than a purpose-built pager, and it
  means error alerts and uptime alerts arrive through different channels.
- **One Sentry uptime monitor and one cron monitor.** Production gets them; staging does not.
- **One Sentry user.** There is one developer, so this costs nothing today and blocks the first
  collaborator.
- **A 5-minute UptimeRobot interval** means up to five minutes of undetected downtime before the first
  failed check, plus the confirmation delay. A 60-second interval costs $9/month.
- **Cloudflare Web Analytics gives no custom events and no UTM tracking**, so campaign attribution and
  in-page interaction measurement are simply unavailable. §7 refuses most of what those would be used
  for, but not all.
- **Core Web Vitals are Chromium-only** from Cloudflare, so iOS Safari users contribute no performance
  data.
- **Fly's log search is a beta whose free status is explicitly time-bounded**, and Fly's metrics are
  *"approximately 15 days"* with **no alerting whatsoever**.
- **Nothing in this stack watches Fly's bill.** ADR-0005 already accepted that; this document does not
  fix it, and the monthly manual invoice check is a standing chore.

---

## 9. Sequencing — what must exist before real users, and what can wait

This is the most useful part of the answer for a solo developer, so it is stated as three lists rather
than prose.

### Tier 1 — before the first real user (all $0, roughly a day's work)

Ordered by what breaks worst if it is missing.

1. **An external uptime monitor on production, with a phone-breaking alert.** UptimeRobot free +
   its mobile app with critical alerts on, and Pushover as the second target. **Without this, "the site
   is down" is discovered by a user telling you, if they bother.** This is the single highest-value
   item in the document and it takes twenty minutes.
2. **Sentry, with `sendDefaultPii: false`, replay off, `beforeSend` scrubbing, and the `onRequestError`
   hook wired in `instrumentation.ts`.** Errors that nobody sees are indistinguishable from errors that
   do not exist. The scrubbing is Tier 1 *because it is a Ley 1581 obligation, not a nicety* — turning
   it on later does not un-send what was already sent.
3. **`Sentry.withServerActionInstrumentation()` in the Server Action adapter convention.** Do it once,
   in the pattern, before there are fifty actions to retrofit.
4. **Structured JSON logging via Pino**, with a request/use-case correlation id. Retrofitting log
   structure after an incident is the worst possible time to do it.
5. **PlanetScale webhooks for `cluster.storage`, `branch.out_of_memory` and `branch.anomaly`**, pointed
   at a route handler that forwards to Pushover. ADR-0004 accepted no HA and 2-day retention; these
   three events are how those accepted risks announce themselves.
6. **Query tags via Drizzle `.comment()`**, at least `app`, `env`, `usecase` and `release`. Cheap now,
   invasive later, and it is the difference between "some query is slow" and "the offer-acceptance
   path is slow".
7. **The incident record with an `escalated_at` field.** §5 of
   [`ley-1581-obligations.md`](ley-1581-obligations.md) makes the **15-*días hábiles*** SIC reporting
   clock start when an incident is *detected and escalated to the designated person* — so the
   escalation timestamp is a legal artefact, not a log line. It must exist before the first incident,
   because there is no way to reconstruct it afterwards.
8. **An append-only audit-log table for access to a Titular's personal data**, in `@repo/db`, never
   shipped to a processor (§2). *What* is audited is [#21](https://github.com/m0t0r/workforpereira/issues/21)'s
   and [#13](https://github.com/m0t0r/workforpereira/issues/13)'s call; *that it exists and where it
   lives* is settled here, and retrofitting it means the pre-retrofit period is simply unevidenced.
9. **A written decision that session replay and behavioural profiling are never enabled** (§7), in the
   *política de tratamiento*. It is a launch document either way.
10. **Cloudflare Web Analytics turned on.** Trivial, free, and it needs to be collecting *before*
    launch so there is a baseline to compare the launch against.
11. **The `pg.Pool` settings from `postgres-host.md`** — `max: 10`, `idleTimeoutMillis: 300_000`,
    `maxLifetimeSeconds: 600`. Connection exhaustion has **no PlanetScale webhook**; the only defence
    is not causing it.

### Tier 2 — the first month, once there is traffic

- **Healthchecks.io heartbeats** for whatever background work exists by then — the outbox drain that
  #1 lists as unspecified is the obvious first customer.
- **A Sentry alert rule that actually fires on the right thing**, rather than on everything. Tune once
  real error volume exists; before that you are guessing.
- **Read the PlanetScale schema recommendations.** The traffic-derived ones need a day of traffic; the
  unused-index and unused-table ones need **four weeks**. There is nothing to read before then.
- **Re-check `features.insights` on the PlanetScale organization** once the first paid database exists,
  and confirm query tags actually appear in the Insights `Tags` column — the one load-bearing thing
  this research could not exercise.
- **Enable `track_io_timing`** so Insights I/O columns are populated.
- **Look at Core Web Vitals by country and OS** in Cloudflare, and act on it. This is the first moment
  the Colombian-mobile question has a real answer.
- **Lighthouse CI in the GitHub Actions pipeline** (#15), so performance regressions are caught in
  review rather than in production.

### Tier 3 — deliberately deferred, with the trigger that un-defers it

| Deferred | Trigger to revisit |
|---|---|
| Shipping logs to Axiom or Grafana Cloud (+$1.94/mo) | Fly's log-search beta starts charging, or 7 days proves too short during a real incident |
| Umami self-hosted (+$3.19/mo) | Cloudflare's Chromium-only vitals or missing custom events block a real question |
| Sentry Team ($26/mo) | Never at this budget. Self-hosted GlitchTip is the cheaper answer if 5k errors/month is exceeded |
| UptimeRobot Solo ($9/mo, 60-second interval) | Downtime detected 5 minutes late causes a real problem |
| Better Stack | Its free tier's contradictory pages get resolved in the generous direction |
| PostHog / feature flags | A genuine need for flags or experiments, which brings its own *finalidad* question |
| A status page for users | There are enough users that "is it me or is it the site?" is being asked |
| Grafana Cloud consolidation | Two or more of the above trigger at once |
| **CrUX / Search Console CWV** | **Never, realistically** — the authenticated surface is structurally ineligible |

### The one-line version

> **Before launch: an external uptime monitor that can wake you, Sentry with PII scrubbing on,
> structured logs, PlanetScale webhooks, query tags, the append-only audit-log table, and the incident
> record with `escalated_at`. Everything else waits for traffic that does not exist yet.**

---

## What could not be verified

Stated rather than estimated, per the terms of this ticket.

### The load-bearing gap

**PlanetScale Insights was never observed in operation.** The organization
`tkachenko-vitaly-job` has **`database_count: 0`**, so `planetscale_get_insights`,
`planetscale_list_schema_recommendations` and `planetscale_get_database` all returned 404/not-found, and
`planetscale_list_databases` returned **`forbidden`** — a token-scope problem distinct from the empty
list. Every claim in §4 about what Insights shows is documentary. The **7-day history**, the
**notable-query thresholds**, the **anomalies page** and the **`Tags` column** should all be confirmed
against a live database in the first week.

### PlanetScale

- **`features: { insights: false }`** on the organization. Most likely an artefact of `plan: "developer"`
  with no card and no database — the [$5 launch post](https://planetscale.com/blog/5-dollar-planetscale-is-here)
  and `postgres-host.md` both list Insights as included at PS-5 — but **not provable from the API**.
- **The Postgres pricing docs page does not state which observability features are included at PS-5.**
  The inclusion claim rests on the launch blog post and the marketing page, not the pricing doc.
- **Metrics retention is undocumented.** The metrics page gives no window at all.
- **Whether Drizzle's `.comment()` output satisfies PlanetScale's "before the semicolon" rule.** Drizzle
  emits no trailing semicolon so it should, but this was **not exercised**.
- **PS-5 `max_connections`** — still undocumented, carried forward unchanged from `postgres-host.md`.
- **No webhook event for connection exhaustion** exists; whether one is planned is unknown.

### Sentry

- **Team and Business month-to-month prices.** The pricing page is JS-driven and rendered the same
  "$26/mo" and "$80/mo" under both billing toggles. Assume the monthly figure is higher.
- **Free-plan profile hours** — no line item for Developer on the pricing page.
- **Plan-gating of Slack / Discord / webhook alerting** is readable **only** in the pricing comparison
  table. The Slack, Discord and integrations-index doc pages carry **no plan badge** in fetched HTML.
  This is the single most consequential unverified fact in §1.
- **Log retention on Developer** — the pricing page says 30-day lookback generally, the
  [Logs docs](https://docs.sentry.io/product/explore/logs/) say a **7-day query window** for Developer.
  Treated as 7 days for logs here.
- **Whether the `@sentry/nextjs` setup wizard writes `sendDefaultPii: true`** into the generated config.
  The **SDK default is `false`**; what the wizard generates was not verified. Check the generated files.
- **Whether any current Sentry mobile app exists.** The only official repo is unmaintained;
  `play.google.com/store/apps/details?id=io.sentry.mobile` returns 404.

### Uptime and alerting

- **Better Stack's free tier is self-contradictory** and was not resolved. Pricing page: *"Up to 30
  seconds check frequency"*, *"Unlimited phone call alerts"*, *"Unlimited SMS"*. Marketing page:
  *"3-minute checks totally free"* with voice calls listed as premium. Comparison content ties
  unlimited calls/SMS to a **$29/month Responder licence**. Verify in-app before depending on it.
- **Whether Better Stack's mobile push requires a paid plan** — the docs page states neither way, and
  the app is named "Better Stack On-Call".
- **Whether Grafana Cloud's free tier permits mobile push specifically.**
- **Pingdom pricing** — `pingdom.com/pricing/` returns **HTTP 403**.
- **Uptime Kuma's minimum RAM/CPU** — genuinely undocumented, confirmed by
  [open issue #5884](https://github.com/louislam/uptime-kuma/issues/5884). The $2.09/month figure
  assumes 256 MB and is unproven.
- **Telegram's reliability from Colombia** — no primary source either way. The only signal is that
  MinTIC operates an official Telegram channel.
- **ntfy's free reserved-topic count (0)** — inferred from the pricing table's structure, not stated.
  The 250 messages/day, 5 emails/day and 2 MB attachment figures **are** primary-sourced.
- **Email-to-SMS gateways for Claro / Movistar / Tigo-UNE / WOM Colombia** — **no official carrier
  documentation exists for any of the four.** Circulating address formats are crowd-sourced. Treated
  as non-existent.
- **AWS SNS / End User Messaging per-message price to Colombia** — published only in a downloadable
  CSV, not inline. `messaging-providers.md` §5 records $0.05087 from that CSV.
- **Cloudflare Health Checks intervals and delivery options** — plan availability is documented,
  the specifics are not.

### Analytics and performance

- **Cloudflare Web Analytics: no published statement on whether the beacon's source IP is stored or
  discarded server-side**, and **no explicit "no consent banner required" claim**. The cookieless and
  no-fingerprinting statements *are* verbatim. Worth one support question before the *política de
  tratamiento* asserts anything specific.
- **Cloudflare Web Analytics data residency** — not documented.
- **Umami Cloud's Hobby-tier limits** — `umami.is/pricing` is a client-rendered SPA returning no
  readable content to any fetcher. The "100k events / 3 sites / 6 months" figures are third-party.
- **Umami's IP handling** — not stated in the docs FAQ; its privacy page is equally unreadable.
- **Umami's minimum RAM**, and whether it can safely share the PlanetScale instance — the latter is an
  inference from its single `DATABASE_URL` Prisma setup, not a vendor statement.
- **Plausible's prices above 10k pageviews** — the slider is client-rendered.
- **Whether PostHog bills Web Vitals events as analytics events.**
- **Fathom's tier prices other than the $45/500k point.**
- **GoatCounter's actual free-tier limit and commercial terms** — `/help/pricing`, `/help/free` and
  `/help/index` all 404. Its legal argument is also the weakest of the set; its own GDPR page says
  *"I'm not a lawyer"* and leans partly on legitimate interest, which fits Ley 1581's
  consent-per-*finalidad* model badly.
- **The CrUX popularity threshold** — Google documents that one exists and, verbatim, *"An exact number
  is not disclosed."* Any specific figure in circulation is not from Google.
- **PageSpeed Insights API quota** — not published in the public docs.
- **WebPageTest beyond the pricing page** — `webpagetest.org` returns 403 and
  `product.webpagetest.org` has an expired TLS certificate.
- **`web-vitals` library exact bundle size** — the README says *"a tiny (~3K, brotli'd), modular
  library"*; per-build figures are not stated.

### Cross-cutting

- **Fly's log-search beta has no published end date and no published post-beta price.** *"During the
  beta period, log search is free"* is the whole statement. The $0.00 in §8 depends on it.
- **Fly's metrics retention is Fly's own approximation** — *"approximately 15 days"*.
- **`fly-log-shipper`'s recommended Machine size** is not published; the $1.94/month figure assumes
  256 MB.
- **Fly's DPA text remains unread** (login-gated, `fly.io/legal/dpa/` 404s) — carried forward unchanged
  from ADR-0005.
- **Nothing here was load-tested or run.** No Sentry project was created, no monitor was configured,
  no beacon was installed, no query tag reached an Insights view. Every operational claim is a vendor
  claim.

---

## Sources

Fetched 2026-08-16 unless otherwise noted.

**PlanetScale** — live MCP API (`planetscale_list_organizations`, `planetscale_get_insights`,
`planetscale_list_schema_recommendations`, `planetscale_get_database`, `planetscale_list_databases`) ·
[Query Insights](https://planetscale.com/docs/postgres/monitoring/query-insights) ·
[Metrics](https://planetscale.com/docs/postgres/monitoring/metrics) ·
[Schema recommendations](https://planetscale.com/docs/postgres/monitoring/schema-recommendations) ·
[Query tags](https://planetscale.com/docs/postgres/monitoring/query-tags) ·
[Webhooks](https://planetscale.com/docs/api/webhooks) ·
[Webhook events reference](https://planetscale.com/docs/reference/webhook-events) ·
[Postgres pricing](https://planetscale.com/docs/postgres/pricing) ·
[$5 PlanetScale is live](https://planetscale.com/blog/5-dollar-planetscale-is-here) (2025-11-14)

**Sentry** — [Pricing](https://sentry.io/pricing/) · [Pricing docs](https://docs.sentry.io/pricing/) ·
[Next.js guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/) ·
[Next.js manual setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/) ·
[Next.js logs](https://docs.sentry.io/platforms/javascript/guides/nextjs/logs/) ·
[Configuration options](https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/) ·
[Automatic instrumentation](https://docs.sentry.io/platforms/javascript/tracing/instrumentation/automatic-instrumentation/) ·
[Logs product](https://docs.sentry.io/product/explore/logs/) ·
[Uptime monitoring](https://docs.sentry.io/product/monitors-and-alerts/monitors/uptime-monitoring/) ·
[Alerts](https://docs.sentry.io/product/alerts/) · [DPA](https://sentry.io/legal/dpa/) ·
[Self-hosted requirements](https://develop.sentry.dev/self-hosted/) ·
[`sentry-javascript` CHANGELOG and `packages/nextjs`](https://github.com/getsentry/sentry-javascript) ·
[sentry-mobile-release-health-app](https://github.com/getsentry/sentry-mobile-release-health-app)

**Fly.io** — [Pricing](https://fly.io/docs/about/pricing/) · [Plans](https://fly.io/plans) ·
[Monitoring index](https://fly.io/docs/monitoring/) ·
[Metrics](https://fly.io/docs/monitoring/metrics/) ·
[Logging overview](https://fly.io/docs/monitoring/logging-overview/) ·
[Search logs](https://fly.io/docs/monitoring/search-logs/) ·
[Logs API options](https://fly.io/docs/monitoring/logs-api-options/) ·
[Exporting logs](https://fly.io/docs/monitoring/exporting-logs/) ·
[Sentry integration](https://fly.io/docs/monitoring/sentry/) ·
[`fly extensions sentry create`](https://fly.io/docs/flyctl/extensions-sentry-create/) ·
[Health checks](https://fly.io/docs/reference/health-checks/) ·
[superfly/fly-log-shipper](https://github.com/superfly/fly-log-shipper)

**Error-tracking alternatives** — [GlitchTip pricing](https://glitchtip.com/pricing) ·
[GlitchTip install](https://glitchtip.com/documentation/install) ·
[GlitchTip LICENSE (MIT)](https://gitlab.com/glitchtip/glitchtip-backend/-/raw/master/LICENSE) ·
[Bugsink](https://www.bugsink.com/) ·
[Bugsink LICENSE (PolyForm Shield 1.0.0)](https://raw.githubusercontent.com/bugsink/bugsink/main/LICENSE) ·
[Rollbar pricing](https://rollbar.com/pricing) · [Honeybadger plans](https://www.honeybadger.io/plans/) ·
[Highlight → LaunchDarkly migration](https://www.highlight.io/blog/launchdarkly-migration) ·
[LaunchDarkly pricing](https://launchdarkly.com/pricing/)

**Uptime, alerting and logging destinations** — [UptimeRobot pricing](https://uptimerobot.com/pricing/) ·
[UptimeRobot mobile app](https://uptimerobot.com/mobile-app/) ·
[UptimeRobot integrations](https://uptimerobot.com/integrations/) ·
[Better Stack pricing](https://betterstack.com/pricing) · [Better Stack uptime](https://betterstack.com/uptime) ·
[Better Stack mobile apps](https://betterstack.com/docs/uptime/ios-and-android-mobile-apps/) ·
[Healthchecks.io pricing](https://healthchecks.io/pricing/) ·
[Healthchecks.io notifications](https://healthchecks.io/docs/configuring_notifications/) ·
[Cronitor pricing](https://cronitor.io/pricing) · [StatusCake pricing](https://www.statuscake.com/pricing/) ·
[Hyperping pricing](https://hyperping.com/pricing) · [OpenStatus pricing](https://www.openstatus.dev/pricing) ·
[Uptime Kuma](https://github.com/louislam/uptime-kuma) ·
[Pushover pricing](https://pushover.net/pricing) · [ntfy](https://ntfy.sh) ·
[ntfy limits](https://docs.ntfy.sh/publish/#limitations) ·
[ntfy iOS instant notifications](https://docs.ntfy.sh/config/#ios-instant-notifications) ·
[Telegram Bot Platform](https://core.telegram.org/bots) ·
[Axiom limits](https://axiom.co/docs/reference/limits) · [Grafana Cloud pricing](https://grafana.com/pricing/) ·
[Grafana synthetic public probes](https://grafana.com/docs/grafana-cloud/testing/synthetic-monitoring/create-checks/public-probes/) ·
[Grafana mobile app](https://grafana.com/docs/grafana-cloud/platform/mobile-app/) ·
[New Relic pricing](https://newrelic.com/pricing) · [SigNoz pricing](https://signoz.io/pricing/) ·
[Twilio Colombia SMS pricing](https://www.twilio.com/en-us/sms/pricing/co) ·
[Twilio Colombia guidelines](https://www.twilio.com/en-us/guidelines/co/sms)

**Analytics and performance** — [Cloudflare Web Analytics](https://www.cloudflare.com/web-analytics/) ·
[CF Web Analytics docs](https://developers.cloudflare.com/web-analytics/) ·
[CF Core Web Vitals](https://developers.cloudflare.com/web-analytics/data-metrics/core-web-vitals/) ·
[CF Web Analytics FAQ](https://developers.cloudflare.com/web-analytics/faq/) ·
[CF Notifications available](https://developers.cloudflare.com/notifications/notification-available/) ·
[CF Health Checks](https://developers.cloudflare.com/health-checks/) ·
[CF Workers limits](https://developers.cloudflare.com/workers/platform/limits/) ·
[Plausible pricing](https://plausible.io/#pricing) · [Plausible data policy](https://plausible.io/data-policy) ·
[Plausible Community Edition](https://github.com/plausible/community-edition) ·
[Umami docs](https://docs.umami.is/docs/faq) · [Umami performance](https://docs.umami.is/docs/performance) ·
[PostHog pricing](https://posthog.com/pricing) ·
[PostHog GDPR](https://posthog.com/docs/privacy/gdpr-compliance) ·
[PostHog persistence](https://posthog.com/docs/libraries/js/persistence) ·
[PostHog self-host](https://posthog.com/docs/self-host) ·
[Fathom pricing](https://usefathom.com/pricing) · [GoatCounter](https://www.goatcounter.com/) ·
[Matomo pricing](https://matomo.org/pricing/) ·
[CrUX methodology](https://developer.chrome.com/docs/crux/methodology) ·
[CrUX API](https://developer.chrome.com/docs/crux/api) ·
[CrUX History API](https://developer.chrome.com/docs/crux/history-api) ·
[CrUX BigQuery](https://developer.chrome.com/docs/crux/bigquery) ·
[Search Console Core Web Vitals](https://support.google.com/webmasters/answer/9205520) ·
[Lighthouse throttling](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md) ·
[WebPageTest pricing](https://www.catchpoint.com/webpagetest-pricing) ·
[web-vitals](https://github.com/GoogleChrome/web-vitals)

**Next.js and Drizzle** —
[`useReportWebVitals`](https://nextjs.org/docs/app/api-reference/functions/use-report-web-vitals) ·
[Drizzle SQL comments](https://orm.drizzle.team/docs/sql-comments)

**GitHub** — [Billing for GitHub Actions](https://docs.github.com/en/billing/managing-billing-for-your-products/about-billing-for-github-actions)

**Internal** — [`postgres-host.md`](postgres-host.md) · [`app-host.md`](app-host.md) ·
[`object-storage.md`](object-storage.md) · [`messaging-providers.md`](messaging-providers.md) ·
[`ley-1581-obligations.md`](ley-1581-obligations.md) · [`CONTEXT.md`](../../CONTEXT.md) ·
[ADR-0004](../adr/0004-planetscale-postgres-as-the-database-host.md) ·
[ADR-0005](../adr/0005-flyio-remains-the-app-host.md) ·
[ADR-0006](../adr/0006-modular-monolith-as-ten-packages.md)

