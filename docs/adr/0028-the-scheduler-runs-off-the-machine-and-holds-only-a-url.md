# The scheduler runs off the machine and holds only a URL

Issue #47 asked what runs on a schedule, where it runs given ADR-0022's one long-lived Fly machine,
and what breaks the day there are two. Four obligations were routed here rather than to #15 because
they share a question none of their parent ADRs asked.

The third question turned out to be the one worth answering, and answering it **dissolved** the other
two rather than solving them. Once the scheduler is not on the machine and the job arrives as an HTTP
request, "what happens when there are two machines" has no content: the request reaches one of them.
There is no leader election in this ADR, and that absence is the decision.

ADR-0022 owns the environments and the pipeline. ADR-0024 owns what the pipeline does to the
database. This ADR owns what runs when nobody is looking.

## The four obligations

| Obligation                  | Fixed by | What it is                                                                         |
| --------------------------- | -------- | ---------------------------------------------------------------------------------- |
| **Outbox drainer**          | ADR-0015 | Every notification is a row written inside the transaction; something must send it |
| **Deadline monitor**        | ADR-0020 | Daily: open requests due within five business days, emailed to the operator        |
| **R2 reconciliation sweep** | ADR-0010 | Lists the bucket, drops every object whose Person is gone — the net under erasure  |
| **Retention purges**        | ADR-0021 | Deletes rows past the term declared beside each table                              |

Two of the four are compliance controls rather than housekeeping. ADR-0020 is explicit that a lapsed
clock is the event that opens the SIC's door under art. 16, and ADR-0010 is explicit that the sweep is
_"what makes the guarantee real rather than hopeful"_. That is why this ADR spends more of its length
on how a failure becomes visible than on how the work gets done.

## The scheduler is trigger.dev Cloud, because every alternative lives on the machine

The candidates #47 named, each checked rather than assumed:

**In-process timers.** Production is `auto_stop_machines = "off"` with `min_machines_running = 1`, so
timers genuinely would run there — this is not the obvious non-starter it looks like. It fails on the
other two environments instead. Staging is `auto_stop_machines = "suspend"` with
`min_machines_running = 0`, so timers would **never fire in the one environment ADR-0022 keeps
specifically because ADR-0017 declines to test PlanetScale at all**. And `strategy = "bluegreen"`
brings up a second machine on every release, so every deploy double-fires every timer. A crash-restart
silently resets the interval, and nothing anywhere records that a run was missed.

**GitHub Actions `schedule`.** Free and unlimited on a public repository, adds no vendor, and runs on
the same runner that already holds the `migrator` credential — genuinely attractive. It fails on the
documented behaviour: the minimum interval is **5 minutes**, the event _"can be delayed during periods
of high loads […] some queued jobs may be dropped"_, and in a public repository **scheduled workflows
are automatically disabled after 60 days with no repository activity**. For a solo developer on a
flexible timeline a 60-day quiet spell is ordinary, and the failure is silent disarmament of a
compliance control. Dropped runs are survivable; auto-disablement is not.

**Fly scheduled Machines.** `--schedule` accepts only a _fuzzy_ `hourly`, `daily`, `weekly` or
`monthly` cycle — no cron expression — and such a Machine **cannot be started by flyctl or the API**,
so there is no way to exercise one on demand. Fuzzy is wrong for a deadline monitor and unusable for
the drainer.

**trigger.dev Cloud** is chosen because the schedule does not live on the machine at all. Everything
above fails on the same axis: the thing that remembers when to run is co-located with the thing being
deployed, suspended, restarted or duplicated. Moving it off is the whole decision, and the specific
vendor is downstream of it.

Facts, read 2026-08-17: Free is **$0/month plus $5 of monthly credits**, and _"you'll need to upgrade
to keep running tasks once the included $5 of credits is used"_. It allows **10 schedules per
project**, **1-day log retention**, and **DEV and PROD environments only**. Compute is metered — micro
at **$0.0000169/second**, run invocation at **$0.000025** — putting our five-minute backstop and four
daily jobs at roughly **$0.60–1.00/month** against the $5 grant. Schedules are declarative in code
with full IANA timezone support. Self-hosting is disclaimed by its own documentation — _"we cannot
guarantee how Trigger.dev will perform on your infrastructure. You assume all responsibility and
risk"_ — and needs Postgres, Redis and a worker fleet, so it is out at this budget.

## The payload is an id, and that is what keeps trigger.dev out of the register

**No payload, argument or return value crossing to trigger.dev may contain personal data.** Jobs pass
a job name; the drainer's fast path passes an outbox row id. Nothing else, ever.

This is a rule rather than a preference because the alternative is expensive. trigger.dev **stores
payloads and outputs** — offloaded to object storage above 512KB, with a hard 14-day run TTL — so a
drainer payload carrying an email address and Offer terms would put personal data at rest with a new
processor. That processor would need a _contrato de transmisión_ under `2.2.2.25.5.2` and an entry in
the `docs/legal/` register, and **its published subprocessor list runs to 27 entries** including AWS,
ClickHouse, Axiom, PostHog, Vercel, WorkOS and — for _"generative AI services"_ — **OpenAI and
Anthropic**. Disclosing that accurately in a register aimed at people who have just lost their income
is a materially different act from disclosing Cloudflare R2.

It also collides with three decisions already taken. ADR-0010 bought R2 specifically because it _"adds
no new processor"_. ADR-0014 rejected external search on **ADR-0008 grounds first** — a second copy of
personal data outside the constraint system, with an N+1 erasure adapter. And ADR-0017's reflective
erasure invariant finds tables by their foreign key to `persons`, so it can never enumerate a copy
sitting in another company's object storage; that is the `verifications` hole ADR-0021 found, relocated
off-platform where not even an explicit assertion can reach it.

With the rule, trigger.dev holds a string and a `bigint`. It is a **scheduler, not an _encargado_**,
and the register is unchanged.

## The task holds a URL and a secret, not a connection

A scheduled task does one thing: `POST /api/jobs/<name>` against the Fly app, authenticated by a
shared secret compared in constant time. The work runs in the app, on the pool it already has.

The alternative — giving trigger.dev a `DATABASE_URL` and letting the task do the work — was rejected
on four independent grounds, of which the first is decisive:

1. **It would put the jobs outside every testable seam.** ADR-0017 permits tests at exactly two
   seams: a module function exported from a `@repo/*` package's `index.ts`, and a use case in
   `apps/web/src/use-cases/`. A trigger.dev task holding its own connection is neither, so the
   deadline monitor and the erasure net — a compliance control and a legal guarantee — would be
   **untestable by the repository's own rules**. As a callback, all four are exercised at seams that
   already exist, on PGlite, today.
2. **It would be a third home for a production database credential.** ADR-0022 already states that
   _"CI necessarily holds a production credential"_ and makes it tolerable only through `app` /
   `migrator` role separation. A third holder needs a fourth role and a third rotation path.
3. **PS-5's connection ceiling is unread.** ADR-0022 lists it as an open item; `observability.md` notes
   connection exhaustion has **no PlanetScale webhook**, so _"the only defence is not causing it"_.
   Every trigger.dev run is a fresh process and therefore a fresh connection, against a pool of 5 and
   an unknown ceiling.
4. **It would lose Sentry.** `observability.md` establishes that Server Actions are _"the one place the
   integration is not automatic"_ — route handlers are instrumented by the SDK. A task running outside
   the Next runtime reports to Sentry not at all.

The callback buys one more thing that reads as an accident and is not. Staging's machine is suspended
with `min_machines_running = 0`, but `auto_start_machines = true`, so **the HTTP request wakes it** — a
direct-DB task would have run happily against staging's database while the application slept, never
exercising the path that runs in production.

Costs, stated: the endpoint must do **bounded work per invocation and report whether more remains**, so
a large R2 sweep cannot outlive an HTTP timeout; and it is a privileged endpoint, whose rate limiting
belongs to #48 with the other two limiters.

> **Decided by ADR-0032: no rate limiter, and the absence is the decision.** A legitimate caller is one
> known client on a schedule, so the failure mode of limiting it is a **silently disarmed compliance
> control** — the exact failure this ADR rejected GitHub Actions cron over — while the failure mode of
> not limiting it is an attacker who already holds the shared secret, against whom a quota is a
> consolation rather than a defence. The controls stay the constant-time compare, the bounded work per
> invocation above, and ADR-0032's origin lockdown. One addition: **a bad secret returns 404, not
> 401**, per ADR-0011's rule. ADR-0032 also keeps **Bot Fight Mode off** partly for this endpoint's
> sake — it cannot be excepted on any plan below Pro, and it challenges exactly this kind of caller.

## The outbox row is the claim, so an interrupted job needs no timeout

The drainer claims work with `FOR UPDATE SKIP LOCKED` **inside the sending transaction**, and there is
no `claimed_at` column.

```sql
SELECT * FROM notification_outbox
WHERE sent_at IS NULL AND next_attempt_at <= now()
ORDER BY created_at
FOR UPDATE SKIP LOCKED LIMIT 20;
```

`SKIP LOCKED` is required regardless of topology, because the fast path and the backstop race **by
design** and because blue-green briefly runs two app processes. Dropping `claimed_at` is the part worth
arguing: a deploy that kills a machine mid-drain would leave a stored claim set and `sent_at` never
written, stranding rows permanently — the poison-row failure arriving through the door nobody guarded.
Letting the transaction be the claim makes recovery automatic, because a killed process releases its
locks on disconnect, and it leaves no timeout constant to tune wrongly.

This is the same instinct ADR-0015 used deriving `frozen` from `persons.status` and ADR-0020 used
deriving the `reclamo en trámite` legend: **a stored flag needs a write to set it and a write to clear
it, either of which can be missed or lost on a restore.** The accepted cost is that the send happens
inside the transaction holding the lock, so a slow provider call holds row locks — bounded by
`LIMIT 20` and acceptable at this volume. A claim timeout is the named escape hatch if it ever is not.

**The wake-up path is two mechanisms with one authority.** The use case calls `tasks.trigger()` after
commit for latency, and a **five-minute scheduled sweep** catches rows whose trigger call failed. The
trigger is an optimisation; the row is the truth. That keeps ADR-0015's guarantee exactly as written —
a network call after commit can fail, which is why the row exists — and gives the sweep a second job
as the poison-row detector.

## trigger.dev may retry a job that keeps no record of itself, and never one that does

- **Drainer: trigger.dev retries off.** The `attempts` and `next_attempt_at` columns are the only
  retry authority. Two retry counters for one send is two sources of truth, which is the argument
  ADR-0015 used refusing a `notifications` table and ADR-0013 used refusing a Redis counter.
- **The three scheduled jobs: bounded retries on**, three attempts with backoff. They hold no state of
  their own, so a single failed callback means the job silently does not run until Healthchecks.io
  reports it — a slow alarm for a statutory deadline.

## One retry loop can drain three separate budgets

This is the finding that most changed the design, and none of the parent ADRs could have seen it
because each budget belongs to a different vendor.

| Budget              | Limit                         | What an unbounded retry does                                                            |
| ------------------- | ----------------------------- | --------------------------------------------------------------------------------------- |
| trigger.dev credits | **$5/month**, then tasks stop | Exhausts the grant and **silently disarms the deadline monitor**                        |
| Sentry errors       | **5,000/month**               | One poison row retried every 5 minutes is **8,640 errors/month** — 1.7× the whole quota |
| Operator attention  | one person                    | Trains them to ignore the channel the compliance control uses                           |

So retries are bounded for three reasons that happen to coincide, and two rules follow:

- **A failed attempt is recorded in `last_error`. Sentry is told exactly once**, at the transition to
  poison — never per attempt. Our own column costs no quota, and it outlives trigger.dev's one-day
  free-tier log retention, which is also why that retention limit does not bind us.
- **Concurrency is capped explicitly**, so a storm cannot reach $5 before anyone notices.

ADR-0004 chose PlanetScale for _"budget certainty over lowest expected cost"_. A metered credit that
stops the platform is the opposite shape, and this ADR accepts it **as a named, monitored exception**
with a $10/month Hobby plan as the escape hatch — not as a surprise anybody discovers during an
incident. It is the first vendor in this stack whose failure mode is billing.

## Rejected: Redis Pub/Sub

Raised while working the ticket, and rejected on architecture rather than cost.

It cannot be the durability story: Pub/Sub has **no persistence**, so publishing with no subscriber
connected loses the message permanently — precisely the failure ADR-0015 wrote the outbox row to
survive. So it could only replace the _poll_, which is the role `tasks.trigger()` already fills for
free. In that role it is worse three ways:

1. **It needs a long-lived TCP subscriber.** Pub/Sub is excluded from Upstash's REST and GraphQL
   interfaces because those are request-based rather than connection-based. That subscriber lives on
   the Fly machine — so the wake-up mechanism moves straight back onto the machine this ADR exists to
   get off, dying under staging's `suspend` and doubling under blue-green.
2. **The outbox table is already the durable queue.** `FOR UPDATE SKIP LOCKED` over Postgres is a
   queue. Redis in front of it is a queue in front of a queue, and a Redis Streams version is worse
   still — a second durable record of one pending send.
3. **#48 owns whether Redis enters the stack at all**, including the Redis-versus-`"database"` cost
   ADR-0013 flagged as never priced. Deciding it here pre-empts a live ticket.

Two things stated in Redis's favour, so the record is honest. Cost is **not** the objection — Upstash
Free is 500K commands/month. And **ADR-0016's refusal does not reach this case**: that argument was
about a _cached list_ surfacing a Paused, Suspended or Blocked Person, and a channel carrying a row id
caches nothing. Redis is not banned by this ADR; it was refused for a different use and is refused here
for a third reason.

> **Answered by ADR-0032: no, Redis does not enter the stack.** Item 3's deferral is discharged, and
> the price was confirmed to be the non-argument this ADR suspected — both options are $0 at v1
> volume. It is refused for the credential limiter, the search counter and, examined hardest,
> **sessions**: `secondaryStorage` is the only way to remove the per-request database read ADR-0009
> guaranteed by refusing `cookieCache.refreshCache`, and it relieves **queries** rather than the
> **connection** ceiling item 3 of the direct-connection rejection above names as the unread risk —
> which ADR-0006's singleton pool already caps at 5.

## The dead man's switch generalises. The escalation does not.

**Every scheduled job pings Healthchecks.io** — the four obligations and the drainer's backstop sweep,
which is the job whose silence is otherwise completely invisible. The app pings on success and pings
`/fail` on a caught error. Free tier is 20 checks, so count is not a constraint.

**Only the deadline monitor escalates to Pushover Emergency.** The rest notify by email. ADR-0020 made
the switch load-bearing for that job specifically, and a watchdog that pages for a sweep nobody depends
on trains the operator to ignore the one that matters. Same mechanism, graded consequence.

The division of labour, which no ADR had written down:

| Question             | Tool                | Why nothing else answers it                                                                                               |
| -------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| _Why did it break?_  | **Sentry**          | Sees only what reaches the app                                                                                            |
| _Did it run at all?_ | **Healthchecks.io** | Sentry is **structurally blind** here — credits exhausted, schedule deleted, vendor down: no code ran, so no error exists |
| _Is the app up?_     | **UptimeRobot**     | ADR-0022: Fly health checks _"do not notify anyone"_                                                                      |

The middle row is why the switch is not redundant with Sentry, and it is the answer ADR-0020 implied
without stating.

**And the switch must not share a failure mode with what it watches.** The deadline monitor's output is
an email to the operator, riding the same outbox as everything else — one send path, no second mailer.
A watchdog that also alerted by email would mean a single mail-path failure took out both the alarm and
the thing the alarm watches. Pushover is a different vendor and a different channel; that independence
is the entire property being bought.

## Sentry Crons is not enough, and the reason is the price of the second monitor

Worth recording because it is the obvious consolidation and it fails on numbers rather than taste.

Sentry Developer includes **1 cron monitor and 1 uptime monitor**. We need five heartbeats in
production and roughly ten across both environments. The trap is how more are obtained: additional
monitors cost **$0.78 each, but pay-as-you-go is a Team/Business feature** — so the real price of cron
monitor number two is **$26/month for Team**, which exceeds the entire $25 infrastructure budget.
Developer also alerts _"via email"_ only; webhooks, Slack and Pushover start at Team. So even for the
single most important check, Sentry cannot deliver the escalation ADR-0020's compliance control needs,
and cannot satisfy the independence requirement above.

**The one included monitor is spare capacity and gets used.** Point Sentry Crons at the **deadline
monitor** as a redundant second watchdog — Healthchecks.io to Pushover Emergency, Sentry to email — on
the one job where two vendors watching costs nothing and the stakes justify it.

Noted and not acted on: Sentry's included **uptime** monitor could cover production if UptimeRobot ever
becomes a problem. That is #18 and ADR-0022's decision, not this one's.

## Two trigger.dev projects, because Free has no staging environment

Free provides **DEV and PROD only** — _"staging deploys are only available on the Hobby and Pro
plans"_. That matters more than it sounds, because ADR-0022 keeps staging precisely since ADR-0017
declines to test PlanetScale at all, making it the only place these jobs meet a real managed Postgres.

So: **two projects in one organization**, `encuentra-staging` and `encuentra-production`, each using its
own PROD environment. Schedules and concurrency are per project; plan and credits are per organization,
so the $5 is shared. Two deploy invocations, which mirrors the `fly.toml` / `fly.staging.toml` split
already in the repository.

Two things said plainly rather than left as cleverness. This **sits beside a paywall**, and it is
exactly the shape of thing a vendor closes; **Hobby at $10/month is the named fallback**, and taking it
would be a budget decision, not an architectural one. And because the $5 is shared, **staging's
schedules run daily rather than five-minutely**, so the environment that does not matter cannot starve
the compliance control in the one that does.

## Where the code lives: there is no eleventh package

A `@repo/jobs` package was considered and rejected, because **ADR-0006 already rejected this package
under another name.** Its refusal of a _"data rights"_ module reads: _"consent records must be readable
from low in the graph while export and erasure must reach across all of it. One module cannot be both
without a cycle."_ A jobs package has that same shape — its purpose is reaching across the graph, from
inside the graph. ADR-0020 recorded the answer this repository already uses: _"fulfilment stays a use
case in `apps/web` exactly as ADR-0006 designed."_

And three of the four already have homes that fall out of decisions taken elsewhere:

| Job              | Home                          | Tier | Why there                                                                                                    |
| ---------------- | ----------------------------- | ---- | ------------------------------------------------------------------------------------------------------------ |
| Retention purges | **`@repo/db`**                | 0    | ADR-0021 puts the term beside ADR-0017's erasure classification in `src/columns.ts`, enumerated reflectively |
| R2 sweep         | **`@repo/people`**            | 2    | ADR-0010 puts the Photo on the Person, with keys _"derived from the person identifier"_                      |
| Deadline monitor | **`@repo/consent`**           | 3    | ADR-0020 widened this charter for `data_requests` and put the _festivos_ constant beside the clock           |
| Outbox drainer   | **`apps/web/src/use-cases/`** | —    | The only cross-module one: the outbox is tier 4, but rendering an Offer notification needs tier 5            |

So the package would have held **one** function, which ADR-0006 has already housed. The route handler
and the trigger.dev task file are both adapters in `apps/web` — the Server-Action shape with a
different caller — so **ADR-0006 needs no amendment and the DAG gains no edge**. The first three are
module functions exported from an `index.ts`, which is ADR-0017's first seam.

**The revisit trigger, because the question is a fair one.** `@repo/jobs` buys portability off
`apps/web`. The day the callback is replaced by a real worker process — a self-hosted trigger.dev, or a
direct-DB task — these functions must run without Next.js, and that is when a package earns its place.

One wrinkle recorded here because it is easy to get wrong: a reflective purge must delete **leaf-first**
under ADR-0008's `RESTRICT` default and explicit-ordering rule, so the reflection needs a topological
order over the foreign keys, not merely a list of tables.

## Schedules are declarative, and exactly one of them has a timezone

Schedules can be declared in code or created imperatively through the SDK or dashboard. **Declarative
only.** An imperative schedule is infrastructure with no code review and no way to remove it by
deleting code — the same objection ADR-0022 raised to hiding an irreversible step behind a deploy.

| Job                     | Production      | Staging | Timezone             |
| ----------------------- | --------------- | ------- | -------------------- |
| Drainer backstop sweep  | every 5 minutes | daily   | UTC                  |
| Deadline monitor        | daily           | daily   | **`America/Bogota`** |
| Retention purges        | daily           | daily   | UTC                  |
| R2 reconciliation sweep | daily           | daily   | UTC                  |

The deadline monitor's timezone is not cosmetic. A UTC midnight run is 7pm the previous day in Bogotá,
so a business-day boundary computed in UTC is off by one for part of every day — against a statutory
clock where being off by one is the whole failure. Colombia has no DST (ADR-0008), so the offset is
fixed, but the date boundary still has to be the right one.

## Deploy ordering: a third participant that knows no schema

`trigger.dev deploy` builds and ships its **own** bundle to their cloud, with no digest relationship to
the Fly image. That is a second artifact against ADR-0022's spine, whose whole argument is that the
fast-forward merge keeps the `dev`-built digest addressable so _"production deploys the identical
digest staging ran"_.

The cost is smaller than it first appears, and the reason is the callback. Because a task file contains
nothing but a `fetch()`, **the trigger.dev bundle imports no domain code and no schema** — so the
"two artifacts must agree about the schema" problem largely does not arise. The third participant has
no schema knowledge to be stale about, and ADR-0024's expand/contract choreography is unaffected: still
two releases, still the same two things that must agree.

Ordering stays in one job for consistency rather than correctness:
`migrate → trigger.dev deploy → flyctl deploy`, with the trigger.dev step failing the job like any
other. One gate, three steps, in the order ADR-0024 established.

## Accepted risks

- **The credit grant is a cliff, and what falls off it is a compliance control.** $5/month with
  bounded retries and a capped concurrency should not reach it; Healthchecks.io is what notices if it
  does. Nothing prevents it.
- **The two-project arrangement sits beside a paywall** and could be closed by the vendor at any time.
  Hobby at $10/month is the fallback, and it does not fit the remaining budget comfortably.
- **The shared secret on `/api/jobs/*` is the only thing protecting privileged work.** Rate limiting is
  #48's, so until that lands the endpoint's sole defence is the secret.
- **Sending inside the claiming transaction holds row locks for the duration of a provider call.**
  Bounded by `LIMIT 20` and untested under load, because there is no load.
- **The credit estimate is arithmetic, not a measurement.** $0.60–1.00/month assumes short runs and no
  retry storms, against an application with no traffic.
- **trigger.dev's free-tier concurrency is unverified** — the pricing page read 2026-08-17 says 20
  concurrent runs, secondary sources say 10. Nothing here depends on which, but the figure should be
  confirmed before anything does.
- **No job has ever run.** Every schedule, ping, secret and endpoint in this ADR is unprovisioned, like
  everything else in ADR-0022's pipeline.

## Consequences

- **#47's headline question is answered by dissolution.** There is no leader election, no advisory
  lock and no double-fire guard, because one HTTP request reaches one machine. If a future design puts
  a scheduler back on the machine, all of that returns with it.
- **ADR-0015 is completed.** _"Who drains it belongs to #15"_ now has an answer: a use case in
  `apps/web`, woken by `tasks.trigger()` after commit and swept every five minutes, with the outbox row
  as the sole retry authority. The `claimed_at` column its outbox implied is **not** built.
- **ADR-0020 is completed.** The deadline job is scheduled, pinned to `America/Bogota`, escalating to
  Pushover Emergency, and watched by a second vendor. Its dead man's switch gains a requirement
  ADR-0020 did not state: **it may not share a failure mode with the alarm it guards**, which is why the
  operator email rides the outbox and the switch does not.
- **ADR-0021 is completed.** The purge jobs are scheduled, and the reflective enumeration it shares with
  ADR-0017 needs a **topological order**, not a table list.
- **ADR-0010's sweep has an owner** — `@repo/people`, daily, pinged.
- **ADR-0022 gains a third deploy participant** and keeps its single gate. Its `fly.toml` files are
  unchanged; nothing here depends on `auto_stop_machines` except by being immune to it.
- **ADR-0006 and ADR-0017 need no amendment**, which is the point of the callback. The jobs are
  adapters over existing seams, so all four are integration-testable on PGlite from the day they are
  written.
- **`@repo/db`, `@repo/people` and `@repo/consent` each gain one exported function**; `apps/web` gains
  `src/trigger/` and `src/app/api/jobs/`. No new package, no new DAG edge.
- **#18's stack is unchanged and now has three named roles** rather than three tools. Sentry's spare
  cron monitor is spent; its spare uptime monitor is recorded as available.
- **#48 inherits the rate limit on `/api/jobs/*`** alongside its two limiters, and inherits the Redis
  question undecided — this ADR refuses Redis for the drainer only, and says so on grounds that do not
  generalise.
- **A new secret exists in every environment** (`TRIGGER_SECRET_KEY` and the callback secret), joining
  ADR-0021's un-rotatable `subject_key` in whatever the map's backup-and-recovery fog eventually
  decides.
- **Nothing about this is provisioned**, and `docs/runbook.md`'s provisioning checklist gains the
  trigger.dev organization, two projects, five schedules and five Healthchecks.io checks.
