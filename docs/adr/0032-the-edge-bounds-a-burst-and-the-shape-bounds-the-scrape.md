# The edge bounds a burst, and the shape bounds the scrape

The production edge is **one Cloudflare rate-limiting rule on `/search/work`**, a **static-assets-only
cache**, and **an origin that refuses every request not arriving through it**. Bot Fight Mode is off
and named as a lever. Everything else — the credential limiter, a new per-account failed-sign-in
counter, and the authenticated search counter — lives at the origin in **Postgres**. **Redis does not
enter the stack**, closing a question ADR-0013, ADR-0016 and ADR-0028 each deferred here.

The ticket asked for a TTL, a purge trigger, two limiters' keys and windows, and a Redis-versus-`"database"`
price. Three of those five dissolved on contact with what the Free plan actually gives us, and the
price turned out not to be the deciding argument on either side.

What did not dissolve is a sentence in ADR-0011 that everything downstream has been resting on:
_"without a rate limit, sample-not-index is a claim rather than a control."_ It is not true at $0, it
was probably never true, and the control it names is not the control that has been doing the work.

## What Cloudflare Free actually gives us

Read off the plan tables rather than assumed, because every parent ADR that specified an edge mechanism
specified it as _"Cloudflare edge, $0"_ and stopped there.

| Capability                | Free plan                                                                    |
| ------------------------- | ---------------------------------------------------------------------------- |
| Rate-limiting rules       | **1**                                                                        |
| Counting characteristic   | **IP only** — no custom counting expression                                  |
| Counting period           | **10 s** — no other value                                                    |
| Mitigation timeout        | **10 s**                                                                     |
| Fields in the expression  | **Path, Verified Bot** — nothing else                                        |
| Challenge with a duration | Not available; challenge actions become **request throttling** (timeout `0`) |
| Cache rules               | 10                                                                           |
| WAF custom rules          | 5, all actions except Log                                                    |
| Transform rules           | 10                                                                           |
| Purge by URL              | 800 URLs/s                                                                   |
| Purge by tag/prefix/host  | **5 requests per minute, per account**                                       |

Two of these are worth stating as findings rather than parameters.

**All purge methods reached all plans on 1 April 2025.** Every parent ADR was written while tag purge
was Enterprise-only, so a design resting on cache tags was quietly available and nobody knew. It turns
out not to matter, because of the next section — but the 5/minute account-wide ceiling on tag purge
against 800/second for URL purge would have decided it anyway.

**One rule means one threshold.** The rule can match several paths, but they then share a per-IP
counter, and the right limit for public search and the right limit for a sign-in form are an order of
magnitude apart. This is a single choice about which surface gets defended, not a configuration detail.

## ADR-0011's launch requirement is not the control it says it is

ADR-0014 established the axis: someone who wants the whole population _"does not page deep — they
iterate ~300 Skills × 33 departments and take the top of each"_, so **query volume is the axis** and
depth is not.

A 10-second counting period bounds **burst** and nothing else. A scraper at one request per second
never trips any threshold at or above ten, and finishes ADR-0014's full enumeration in under three
hours. There is no window setting that fixes this, because 10 seconds is the only window Free has.

So the edge limiter cannot be what makes _sample-not-index_ true, and the honest statement is that it
never was. What has actually been doing that work is the **shape of the surface**, built across three
ADRs before anyone reached for a limiter: bounded and rotating Walls with no pagination (ADR-0011),
no public skill search, a 200-result cap that _"is only fair because of the rotation"_, no facet counts
and no per-search log (ADR-0014), and unguessable, rotatable, never-reissued `public_id`s that 404
rather than 403 (ADR-0011 via ADR-0003).

That is a real set of controls and it does not depend on Cloudflare. The rate limiter is a burst bound
in front of it, worth having and worth not overstating. **ADR-0011's sentence is amended to say so**,
because a future reader who believes the limiter is the control will make the wrong trade the first
time it costs something.

## Nothing but static assets is cached, and leaving becomes immediate

ADR-0011 specified the public surfaces as _"short CDN TTL, purged on the way out, genuinely under a
minute **because the wall is one page rather than N**."_ The reason only reaches the Wall. A Public
View is one URL per Person and a Need page is one per Need, and the justification was never extended
to them — it was written once and applied to a list.

**Only `/_next/static/*` and the like are cached at the edge. No HTML is cached anywhere in v1.**

This is the smaller decision and also the better one, which is why it is not a compromise. It deletes
the TTL, the purge trigger, the purge API token, the missed-purge semantics and the cache-tag question
in one move — and it **improves ADR-0011's promise rather than trading it away**. Leaving stops being
_"genuinely under a minute"_ and becomes **immediate**, because there is no stale copy anywhere to
outlive a Pause, a Suspension, an unpublish, an erasure or a `public_id` rotation.

That last one is the case worth naming, because it is the one that would have bitten. ADR-0011 gives
rotation a specific job — _"dead-ending every copy in circulation"_ — and a cached 200 at a retired
`public_id` does the exact opposite of that for the length of the TTL.

Two things follow. A results page is **never** cached: caching `/search/work` would serve enumeration
from the edge without the origin ever seeing it, which is an accelerator for the one activity the rule
above exists to slow. And one long-lived Fly machine serving a bounded rotating sample to launch
traffic needs no help; **caching is revisited when there is traffic to point at**, not before.

## The one rule, and why a challenge beats a block here

| Field  | Value                      |
| ------ | -------------------------- |
| Path   | `/search/work`             |
| Limit  | 20 requests / 10 s, per IP |
| Action | **Managed Challenge**      |

`/search/work` rather than the Walls: a Wall is one page showing a rotating sample, so hammering it
returns the same handful of cards, while `/search/work` is the query-shaped surface that multiplies.
Typeahead costs nothing here — ADR-0014 ships Skills and Municipalities to the client as static JSON,
so a search session is one request per submitted query.

**The action is a Managed Challenge and never `block`, and Free's restriction is what makes that
work.** On Free a challenge cannot carry a duration, so it degrades to request throttling: only
requests over the limit are challenged, and **a client that passes has its counter set to zero**. A
person in an internet café or behind a Colombian ISP's CGNAT — which is the normal case here, not the
edge case — solves one challenge and continues. `block` would refuse everyone behind that address
indiscriminately.

Written down as a product rule rather than a dashboard value, because it will be re-derived otherwise:
**on this platform the false positive is refusing the platform to the person it exists for.** The cost
is stated too — a Managed Challenge needs JavaScript, so it is a barrier to a client that has none.

**20 is not enshrined**, the same way ADR-0014 declined to enshrine its 200: it is a dashboard field
that changes in seconds, and it moves when real traffic disagrees.

## Bot Fight Mode is off, and it is the lever rather than the default

Bot Fight Mode is the only real anti-automation product at $0, and it is refused at launch for two
documented reasons and one about this audience.

**It cannot be excepted.** It does not run on the Ruleset Engine, so _"you cannot bypass or skip Bot
Fight Mode using WAF custom rules or Page Rules"_, and Cloudflare's own answer to _"I need an exception
for my own API clients"_ is to upgrade to Super Bot Fight Mode on Pro. ADR-0028 put trigger.dev's
`/api/jobs/*` callback on this origin: a non-browser client with no JavaScript, carrying five scheduled
jobs of which one is ADR-0020's statutory deadline monitor. Enabling Bot Fight Mode challenges it with
no way to make an exception — which is precisely the _silently disarmed compliance control_ failure
ADR-0028 rejected GitHub Actions cron over.

**It is aggressive by design.** Cloudflare's own troubleshooting page says so: _"Bot Fight Mode and
Super Bot Fight Mode are aggressive by design, and false positives are expected."_ It cannot be tuned,
scored, or run in a logging-only mode on Free.

**And its challenge is CPU-intensive JavaScript**, mandatorily paired with JavaScript Detections. The
cost of a false positive lands on a cheap Android phone on a bad connection in Risaralda, and the
person gets no explanation — they get a spinner.

So it is **off, and recorded as the named escalation**: one toggle, pulled when there is evidence of
scraping rather than in anticipation of it, and pulled knowing that `/api/jobs/*` must move first. That
is the same posture ADR-0013 already took on detection — _report-driven, not detective_, because zero
users means nothing to tune against.

## Redis does not enter the stack, and the budget is not why

Three ADRs deferred this here, all three flagging cost as the open item — ADR-0013 noted the Better
Auth audit _"lists Redis/KV as an implied cost but never priced it"_, and ADR-0028 restated that #48
owns whether Redis enters the stack at all.

**Priced, it is a non-argument.** Upstash Redis Free is 256 MB, 500K commands/month and one database;
Pay-as-you-go is $0.20 per 100K with a settable budget cap. Better Auth's `storage: "database"` costs
one table. At v1 volume both are $0, so cost decides nothing and the question has to be decided on
something real.

The strongest case for Redis was not the limiter at all. It was **sessions**: ADR-0009 refused
`cookieCache.refreshCache` because _"a session we cannot revoke within the 5-minute cache window is not
one we can honestly promise to revoke"_, which **guarantees a database read on every authenticated
request**, and Better Auth's `secondaryStorage` is the only way to remove that read without weakening
revocation. It is refused, on what it would actually relieve:

1. **It relieves the wrong resource.** ADR-0028 named the risk as PS-5's unread **connection** ceiling,
   with _"the only defence is not causing it"_ and no PlanetScale webhook for exhaustion — and
   ADR-0006's singleton `pg.Pool` already caps connections at 5. Session lookups add **queries**, not
   connections, and a primary-key read is the cheapest thing Postgres does. It is not latency either:
   Fly `iad` and PlanetScale `us-east-1` are the same region.
2. **It puts the highest-frequency read in the product on a meter.** 500K commands/month is roughly one
   `GET` per server request, or **about 500 daily-active users** before it is metered. ADR-0004 chose
   PlanetScale explicitly _"for budget certainty over lowest expected cost"_, and ADR-0005 rejected
   Workers partly because _"Cloudflare bills seven metered products… where a slow React render costs
   money rather than latency"_. Sessions in Redis reverses both decisions on the busiest path in the
   product.
3. **It makes a fifth vendor a hard dependency for being signed in at all.** Today that list is Fly and
   PlanetScale.
4. **Session rows hold `ipAddress` and `userAgent`**, so it moves personal data outside ADR-0021's
   one-transaction erasure and needs ADR-0010's photo ordering — commit, then delete, then a
   reconciliation sweep — as a second such adapter.

**One objection was checked and withdrawn.** `secondaryStorage` looked like a lightly-travelled code
path: seventeen Better Auth issues name it, spanning November 2024 to May 2026. **Every one of them is
closed**, so "it is buggy" is not available as an argument and is not made here. Two are worth knowing
anyway because of where they sit — `state_mismatch` with Redis enabled, and
`account.storeStateStrategy` defaulting wrongly under `secondaryStorage` — both on OAuth `state`, which
is where ADR-0009's Pending Signup design lives. If this is ever revisited, that is the seam to test
first, and the version to write is `secondaryStorage` **with `storeSessionInDatabase: true`**, never
without: keeping the durable row is what preserves the erasure transaction and ADR-0017's reflective
invariant.

The general principle the refusal rests on, stated once so it does not have to be rediscovered:

> **A limiter at the origin is a limiter an attacker gets to make us pay for.** Every request it counts
> already cost a Fly CPU cycle and a database write. The edge limiter is the only one an attacker
> cannot bill us for, because it drops the request before it arrives. That is why the unauthenticated
> surface is defended at the edge and the origin limiters sit behind an account.

Redis is not banned by this ADR; it is refused for the uses that exist, and it would have to earn a
different argument than cost to arrive later.

## ADR-0014 against itself: what was searched, versus how many times

ADR-0014 specifies a **_"durable per-Person counter… attributable and auditable… never a cache"_** for
authenticated Profile search, and four sections later refuses **_"No per-search log. Who searched for
what is the searcher's own personal data, serves no consented finalidad."_** Both cannot stand as
written, and no ADR noticed.

They are resolved by the distinction the second sentence already contains: the refusal is about **what
was searched**. A counter holding `(person_id, window, count)` and **no query** records only **how
many**, which is a quota and not a log.

`search_quotas` therefore holds a Person, a day and an integer, and is **schema-incapable of holding a
query** — the same move ADR-0013 made fixing pay direction in the schema so an Offer cannot express
_"the worker pays"_. **200 searches per Person per day**, in **`@repo/matching`** where ADR-0014 put
search, so it is read and written inside a function taking `Db | Tx` and is therefore an ADR-0017
integration seam, testable on PGlite today.

Two things stated rather than implied. ADR-0013 refused a Redis counter because it would be _"a second
source of truth that can drift"_ against durable domain data; here there **is** no durable domain data
to count, because ADR-0014 refused the log — so this table is the **only** source of truth, and
ADR-0013's argument arrives in a form it never faced and points the same way. And ADR-0014 said the
counter must be able to _"feed Suspension"_: it does so **only by being visible to an operator who is
already looking**, never automatically. ADR-0013's refusal of accumulation-triggers-action is not
weakened by a number an operator can read.

At 200/day, ADR-0014's full enumeration run takes about **fifty days** on an account that is
suspendable throughout. That is the whole argument for putting Capability Profile search behind an
account, finally expressed as a number.

## The counter ADR-0009 left unbuilt

ADR-0009 recorded that _"there is no account lockout for password sign-in at all"_ and accepted it,
because lockout is dangerous for an audience it had just refused a recovery desk. It then deferred the
IP limiter here.

**IP-keyed limiting is not a defence against credential stuffing.** An attacker rotating addresses
defeats it completely, and rotating addresses is the attack. So one account can currently be guessed at
without bound, and the IP limiter's honest job is stopping a naive attacker and absorbing accidents.

This ADR adds the missing half, and it is affordable because Q10 already put durable counters in
Postgres. **A per-email failed-sign-in counter**: ten failures inside an hour opens a **fifteen-minute
refusal window**, cleared by any successful sign-in and expiring on its own.

Three properties make it not the lockout ADR-0009 refused:

- **Nobody has to be recovered.** ADR-0009's objection was specifically to a manual identity check —
  _"we cannot tell the honest person from an attacker"_ — and a window that clears itself never sends
  anyone to one.
- **It refuses sign-in and never refuses recovery.** Password reset is untouched. A window that also
  blocked `/forget-password` would be a lockout wearing a different word.
- **It is keyed on an HMAC of the submitted email**, reusing ADR-0021's `subject_key` derivation, so
  the table holds no address in plaintext — and, more importantly, it behaves **identically for an
  address that has an account and one that does not**. Keying on `users.id` would have made the
  presence of a refusal window a signal that the account exists, which is the enumeration ADR-0009
  hardened signup against, arriving through the sign-in form instead.

It lives in **`@repo/auth`** (ADR-0006 tier 1), reachable from ADR-0017's module-function seam. It is
one more consumer of the HMAC key ADR-0021 says can never be rotated — noted because the map's fog on
backup and recovery is tracking exactly that secret.

## `/api/jobs/*` gets no limiter, and that is the decision

ADR-0028 handed this over asking that it be decided rather than inherited. **The decision is no rate
limiter**, and it is a decision because the default was to add one.

A legitimate caller is one known client on a schedule. The failure mode of limiting it is a **silently
disarmed compliance control**, which is the specific failure ADR-0028 spent the ticket avoiding. The
failure mode of not limiting it is an attacker who **already holds the shared secret** — at which point
a quota is a consolation, not a defence.

The controls are the constant-time secret compare, the origin lockdown below, and ADR-0028's own rule
that the endpoint does bounded work per invocation and reports whether more remains. One addition: **a
bad secret returns 404, not 401.** ADR-0011 set that pattern for absent profiles and this repo has now
used it three times; a 401 confirms that the path is real and that a correct secret exists.

## Until the origin refuses non-edge traffic, none of the above exists

Everything decided here is optional for anyone who requests the `.fly.dev` hostname directly: the
rate-limiting rule, the challenge, the WAF, the cache. Worse than optional in one case — Better Auth
determines the client address from a header, so a request that bypasses Cloudflare can **choose its own
rate-limit key**, which does not weaken the credential limiter so much as delete it.

**The origin requires a shared secret header, set by a Cloudflare Transform Rule, and returns 404 to
anything without it.** Free allows ten transform rules; this needs one. The check lives in Next 16's
`proxy.ts`.

Two honest qualifications. ADR-0005 recorded that Next's own documentation calls Proxy _"a last
resort"_ and says _"always verify authentication and authorization inside each Server Function rather
than relying on Proxy alone"_ — that guidance stands and is not contradicted here, because this is a
**transport gate and not an authorisation boundary**. Data is protected by the session checks inside
each Server Function, exactly as ADR-0005 says; the lockdown protects the _edge controls_, and its
failure mode is losing them rather than losing the data. Second, the header is a static secret, so it
is a control against arbitrary internet traffic and not against someone who has read our Cloudflare
configuration.

The rejected alternative is worth naming because it is the tempting one. **Accepting direct origin
access on the grounds that the `.fly.dev` hostname is not published** is security by an unpublished
name, which is the same species of claim as ADR-0011's standing rule that _"`robots.txt` and `noindex`
are never privacy controls… anything reachable without a session is permanently public and assumed
scraped."_ This repo refused that reasoning once; refusing it consistently costs one transform rule.

Cloudflare Tunnel would remove the public origin outright and was rejected for adding a `cloudflared`
process to ADR-0005's single machine, for a gate a header already closes.

**This is what makes ADR-0022's custom domain a launch gate**, and gives it a sharper reason than the
one it recorded: not merely that the CDN and the limiter have nowhere to live, but that **the origin
must begin refusing non-edge traffic on the same day it begins holding personal data.**

## Staging has no edge, and that is safe only because it is empty

ADR-0022 makes the CDN production-only. This extends to all of it: staging has no zone, no rate-limit
rule, no challenge and **no lockdown header** — enabling one would make staging reject every request it
receives, since nothing is in front of it.

Staging is therefore protected by exactly one thing, and it is the thing ADR-0022 already identified as
the control rather than the hygiene: **production personal data never leaves production**, so staging
has none. That rule was promoted once already; this ADR is the second decision resting on it.

One consequence for the client-address configuration: `cf-connecting-ip` does not exist in staging, so
the header list is `["cf-connecting-ip", "fly-client-ip"]` and staging keys its limiters on the second.
In production that ordering is trustworthy **only because of the lockdown** — the two are load-bearing
on each other, and neither is safe to remove alone.

## The numbers, in one place

| Control                   | Where             | Key                     | Window | Limit | On breach                        |
| ------------------------- | ----------------- | ----------------------- | ------ | ----- | -------------------------------- |
| Public Need search        | Cloudflare edge   | IP                      | 10 s   | 20    | Managed Challenge (throttling)   |
| Sign-in, per address      | `@repo/auth`      | HMAC of submitted email | 1 h    | 10    | 15-minute refusal, self-clearing |
| Better Auth global        | `rateLimit` table | IP (/64 for IPv6)       | 60 s   | 100   | 429 with `X-Retry-After`         |
| `/forget-password`        | `rateLimit` table | IP                      | 1 h    | 5     | 429                              |
| `/sign-up/email`          | `rateLimit` table | IP                      | 1 h    | 10    | 429                              |
| Capability Profile search | `@repo/matching`  | `person_id`             | 1 day  | 200   | Refusal in Spanish, nothing else |
| `/api/jobs/*`             | —                 | —                       | —      | —     | Not limited, by decision         |

**Better Auth's `window` is set explicitly rather than inherited**, because its own documentation
disagrees with itself: the concepts page states a 60-second default and the options reference states 10. Pinning it costs one line and removes the question.

`storage: "database"` with the generated `rateLimit(id, key, count, lastRequest)` schema, unmodified.
Two things about that table are recorded rather than fixed: Better Auth ships **no cleanup** for it, so
it joins ADR-0028's reflective purge in `@repo/db`; and it holds an IP with **no foreign key to
`persons`**, so ADR-0017's reflective erasure invariant cannot enumerate it — the same hole ADR-0021
found in `verifications` and could not close. Widening that invariant to enumerate every table was
considered here and **deliberately not taken**: it is a change to a guard that exists for a different
purpose, and a short-lived IP counter is not the case that justifies making it.

## Consequences

- **ADR-0011 amended in two places.** _"Without a rate limit, sample-not-index is a claim rather than a
  control"_ is corrected: the edge rule bounds burst, and the controls that make the claim true are the
  bounded rotating Walls, the absence of public skill search and pagination, the result cap and the
  rotatable `public_id` — all of which ADR-0011 and ADR-0014 already built. Its _"short CDN TTL, purged
  on the way out, genuinely under a minute"_ becomes **immediate**, with no HTML cached; the promise
  improves. Its standing rule on crawler directives is load-bearing in the origin-lockdown section, not
  merely cited.
- **ADR-0014 amended.** Its two-limiter table is filled in with mechanisms and numbers, and its internal
  contradiction — a durable per-Person counter against _"no per-search log"_ — is resolved on the record
  as **how many, never what**. Its `noindex` results page gains a rule: it is never edge-cached.
- **ADR-0009's deferred flag is discharged**, and its accepted risk is narrowed rather than merely
  inherited: `storage: "database"` fixes the per-instance no-op it warned about under blue-green, and the
  per-address counter closes the distributed-guessing gap that IP limiting never covered. Its refusal of
  a recovery desk is untouched, because nothing here creates one.
- **ADR-0013's deferred question is answered.** Redis is refused for the auth limiter too, on grounds it
  did not have; its distinction between auth limiting and safety counters survives intact, and safety
  counters remain a `SELECT count(*)` over `offers`.
- **ADR-0016's Redis refusal is generalised, carefully.** It refused a cached _list_ on safety grounds;
  this refuses Redis for counters and sessions on cost-shape and dependency grounds. Neither is a general
  ban and this ADR says so, so that a future case is argued rather than assumed closed.
- **ADR-0028's handover is discharged.** `/api/jobs/*` is decided as **not limited**, with the reason; its
  reflective purge in `@repo/db` gains the `rateLimit` table; and its statement that _"#48 owns whether
  Redis enters the stack at all"_ is answered no.
- **ADR-0022's launch gate is sharpened.** The custom domain is a launch gate not only because the CDN and
  limiter have nowhere to live, but because the origin must refuse non-edge traffic from the day it holds
  personal data. Its production-only CDN rule extends to the lockdown header, and its seeding rule becomes
  the sole protection for staging for a second time.
- **ADR-0017 gains no invariant here**, deliberately. Every rule in this ADR is a configuration value or a
  quota, and neither is the kind of decision an Invariant Test guards.
- **`CLAUDE.md`** gains a **Public edge** section: what is cached, the one rule, the lockdown header, and
  the rule that no HTML is edge-cached.
- **`docs/runbook.md`** gains the zone provisioning steps — cache rule, rate-limiting rule, transform rule
  and origin secret, Bot Fight Mode explicitly left off — and they belong to the launch gate, not to a
  routine deploy.
- **No `CONTEXT.md` change.** An edge, a cache and a limiter are engineering vocabulary, which ADR-0017
  settled belongs in `CLAUDE.md` rather than the product glossary.
- **Whoever implements search inherits** two counters, one at each seam, and the rule that the
  authenticated one may never learn what was searched.
