# Email leaves through Resend, and the exit is a number

Transactional email sends through **Resend** on its free tier. **AWS SES is the named exit**, taken
when the outbox crosses **80 sends in a day** against Resend's 100/day cap. The SES adapter is
**not** built now. The provider sits behind an interface designed against both, and the transport is
a **parameter**, not a global.

## The choice was absorbed, never made

#6 was a `wayfinder:research` ticket and its own note says so in the second line: _"This is a
research note, not a decision."_ It priced five providers and stopped. No decision session ever
followed it.

The answer nevertheless became "AWS SES", twice, sideways. ADR-0005 — an ADR about **where the app
is hosted** — carries `Email stays on AWS SES (#6, unchanged)` in its Consequence list, where the
live question was Cloudflare Workers versus Fly.io and email was a footnote to it. ADR-0009 then
priced the password path at _"SES Essentials at $0.16/1,000 (#6)"_, which reads as a decision
downstream of a decision that had not been taken. The map's Out-of-scope compounded it: _"The vendors
are already chosen (#4, #6, #25)"_ — true of the database host and the app host, and never true of
this.

This ADR is the first place the question is the subject rather than the aside. It also means the
change here is small in engineering terms and worth writing down anyway: **an absorbed choice is
indistinguishable from a decided one six months later**, and the next person reading ADR-0005 line
106 would have had no way to tell that nobody had ever argued it.

## Cost decides nothing, so the developer's time decides

At this project's volume the invoice is noise. #6's own figures, observed 2026-08-15: SES is
**$0.03/month** at ~200 emails; Resend free is **$0.00**. Three cents is not an argument, and neither
is zero.

What differs is the friction to first email. SES needs a **sandbox-exit request** — until it is
approved you may send only to addresses you have verified — plus **3–5 DNS records**, duplicated per
region, taking up to 72 hours to propagate, and **sandbox status and identity verification are
per-region**, so verifying in `us-east-1` and later moving to `sa-east-1` means redoing both. It has
no delivery log or template UI. Resend needs an account and a verified domain, and #6 recorded it as
having the **best DX** of the set.

For a solo developer with a $25/month ceiling, the scarce resource is attention, not dollars. This
ADR spends the three cents.

**This is not a deliverability argument and must not be read as one.** #6 found that **no provider's
primary sources say anything about Colombian ISPs, LatAm deliverability or Colombia-specific
blocklisting**, and that dedicated IPs are gated out of reach at every provider and would hurt us
anyway — you cannot warm an IP on 200 emails/month. Both providers put us on a shared pool. SPF, DKIM
and DMARC `p=none` are set up either way.

## The cliff is a day, not a month

Resend's free tier is quoted as 3,000/month, and that number is a distraction. The binding limit is
**100 per day**, with **1 domain**. A monthly figure absorbs a burst; a daily one does not. A batch
of photo reviews clearing, or a single press mention, spends a day's allowance while the monthly
figure is barely touched.

The step past it is **$20/month**. #18 found that **$4.46–$7.46** actually remains of the $25
ceiling, so Resend Pro is **three to four times the entire remaining budget**. The cliff is therefore
not a bill we absorb; it is a budget crisis. **A cliff you cannot afford to fall off has to be seen
coming**, which is what the rest of this ADR is for.

SES has no cliff at any volume this platform will reach — ~$24/month at 150,000 emails. That is
exactly why it is the exit and not the entrance.

## A rate-limit refusal is a deferral, not an attempt

This is the finding that makes the free tier survivable, and it is a correctness rule rather than a
preference.

ADR-0028 makes **`attempts` the only retry authority** and reports a row to Sentry **once**, at the
transition to poison. That machinery cannot tell a refusal apart from a failure. So on the 101st send
of a day, Resend's `429` looks exactly like a bad address: the row burns a retry, and so does every
other row queued behind it, because they are all behind the same daily cap. Within one day's retry
budget the whole batch reaches poison, and what surfaces is one Sentry report about a single row
while the rest died in silence.

**ADR-0020's deadline-monitor email rides the outbox.** It is the alarm on the business-day clock
that Ley 1581 forces to exist. A design in which a busy Tuesday can silently discard a compliance
control is not acceptable, and the fix is one rule:

> A documented provider rate-limit refusal — `429`, or the provider's equivalent — **does not
> increment `attempts` and does not count as a failure.** The row is left exactly as it was found.

Two consequences follow, and the second is easy to miss:

- Because ADR-0028's claim is a row lock inside the sending transaction and there is **no
  `claimed_at` column**, a deferral needs no new state. Rolling back leaves the row unclaimed with
  its `attempts` untouched, which is already the recovery path for a killed machine.
- **The drain must end the pass, not move to the next row.** Every queued row is behind the same
  daily cap, so retrying the next one immediately converts one refusal into a spin against the
  provider. The pass stops and the five-minute sweep is what tries again — which is the backstop
  ADR-0028 already built.

This rule is written here because it is **caused by the free tier**, and it must survive the move to
SES anyway: SES has its own per-second send rate, and the same reasoning applies to a throttling
response there.

## The exit is 80 sends in a day

Not "when we scale". A number, because the alternative is a judgement call nobody makes until the
cliff has already been fallen off.

**At 80 sends in a rolling day the drain reports once, to Sentry, as a warning.** Eighty is 20%
headroom on the 100 cap, and 20% rather than 5% because **the exit is slow**: SES's sandbox-exit
request is quoted at ~24 hours, DNS propagation at up to 72, and the adapter has to be written and
verified between the two. A 5% margin would put the request in flight after the refusals had started.

Sentry is the right channel and the only one that needs no new vendor. One warning a day is ~30/month
against Sentry Developer's 5,000, and it is a warning rather than an error precisely so that it does
not compete with ADR-0028's once-only poison report.

Taking the exit means: write the SES adapter behind the existing interface, request sandbox exit,
verify the domain in the chosen region, cut over, and amend this ADR. It is days of wall-clock and
almost none of it is code.

## The interface is designed against both, and only one is implemented

**Building the SES adapter now is refused.**

The tempting argument is that two adapters make the switch instant. They do not, because the switch
is not code. The switching cost is the sandbox-exit request, the DNS records and the domain
re-verification — the wall-clock above — and a pre-built adapter buys none of that down. Meanwhile it
is code with no account behind it, so it cannot be run, so it cannot be known to work, and by the day
it is needed it will be rewritten against whatever the API looks like then. ADR-0016 set this
precedent when it **named** the in-process LRU as an escape hatch and built nothing.

What is built now is the **interface**, and its one job is to not encode Resend-isms. The shape of
the mistake to avoid: Resend's `tags`, its idempotency key and its batch endpoint all have SES
equivalents with different names, different cardinality and different semantics. The interface
carries the message — recipient, subject, body — and the provider adapter is the only place a
vendor's vocabulary is allowed to appear.

**The `attempts`-preserving deferral above is part of the interface, not part of the Resend
adapter.** The adapter's job is to classify its provider's refusal; the outbox's job is to honour the
classification.

## The transport is a parameter, because that is how everything else here works

The provider adapter takes its HTTP transport as an **argument**, injected by the caller.

This is not a testing trick, it is ADR-0006's shape. Every module function in this repo takes
`Db | Tx` as its first parameter; there is no DI container and no service locator, and the handle is
always passed in. A sender is the same kind of dependency and gets the same treatment.

It also keeps **ADR-0017's binary intact with nothing to amend**: the adapter takes no database
handle, so it is a unit test, exactly as #69 already specified. And it makes #69's hardest acceptance
criterion reachable — _"a row exhausting `attempts` reports to Sentry exactly once"_, which #69 calls
the criterion most likely to regress silently. Driving a full retry sequence needs a transport that
throws on demand, and now there is one. The 429-deferral rule above is testable by the same means.

**Refused for v1: `emulate` and MSW.** Both are a round trip over HTTP against a fake, which is a
**third category** ADR-0017's signature rule does not have, so either would need that ADR amended.
Neither is worth it here:

- Neither gives real API fidelity. A green test against a fake and a `422` from the live API are
  perfectly compatible, because the fake encodes its author's reading of the API, not the API.
- `emulate` does list Resend among its services, but **not SES**, and it has **no Sentry plugin at
  all** — so it does not touch the criterion above. Its Resend support is also absent from its
  architecture list, its seed-config documentation and its environment-variable documentation, which
  is three of three, so the support is unverified as well as unnecessary.
- MSW's genuine strength is faking HTTP for code whose wiring we **do not own** — Better Auth's
  OAuth token exchange, the S3 client for R2. Both already sit outside ADR-0017's two seams, and the
  OAuth one is the gap ADR-0017 names by hand. MSW handlers are also fixtures, and ADR-0017 records
  that there **cannot** be a shared fixtures package without inverting ADR-0006's DAG, so they would
  be duplicated per package forever.

**This ADR decides the email transport and nothing wider.** The general question — how this repo
tests any code that talks to a third party — is ADR-0017's silent hole and belongs to its own
session, so that the answer is recorded once instead of re-argued per vendor.

## Register and residency change nothing, with one thing to capture

Both candidates are new processors in the United States, so both need a `2.2.2.25.5.2` _contrato de
transmisión_ and a row in the register `docs/legal/` will hold. #6 records Resend as storing _"all
account data, including email metadata, logs, and API records"_ in the US; SES is US too. The #5
international-transfer analysis is unchanged in either direction, and Brevo — the one option that
would have changed it, hosting in France and Germany — is not chosen.

**One item is genuinely open and belongs to provisioning, not here: Resend is a layer, so its own
subprocessors have to be read and disclosed** in the register entry, the way ADR-0028 forced the
disclosure of trigger.dev's 27. Their identity is **not verified by this ADR** and must be captured
when the account is created.

## Cost

**$0.00/month** at launch, against the **$4.46–$7.46/month** #18 found remains of the $25 ceiling.

The cost is not the invoice, and it should be stated plainly: **this ADR buys developer time with a
hard ceiling.** SES would have cost $0.03/month with no ceiling at all. What is bought is a same-day
setup instead of a multi-day one; what is sold is 100 sends per day, monitored at 80, past which the
next option costs 3–4× the entire remaining budget and the alternative takes days to stand up.

Every figure here is #6's, observed **2026-08-15**, re-read on **2026-08-19**. Prices move; re-check
before provisioning.

## Consequences

- **ADR-0005 is amended.** Its `Email stays on AWS SES (#6, unchanged)` consequence is superseded.
  The reasoning it gave — that Cloudflare Email Sending is public beta and reachable over REST from
  Fly anyway — is untouched and Cloudflare Email Service remains unchosen.
- **ADR-0009's Cost section is amended.** The password path costs **$0.00** on Resend free rather
  than $0.16/1,000 on SES. Its conclusion is unchanged and strengthened: auth messaging is a rounding
  error, and this holds **only** because phone OTP was declined — #6's verified SMS rate to +57 still
  makes 1,000 signups $50.87, eight times the remaining budget.
- **#69 gains the deferral rule and the injected transport**, and stays provider-agnostic. Its
  acceptance criterion _"delivers a real email through the chosen provider"_ now has a named
  provider, and gains a blocker on the account existing.
- **Provisioning is a human ticket that did not exist.** #73 provisions Fly, PlanetScale and
  observability and has **no email step at all** — a gap that was there under SES too. The account,
  the verified domain, SPF/DKIM/DMARC `p=none`, the API key in both environments' Fly secrets, and
  the subprocessor list for the register all belong to it.
- **The 1-domain limit meets ADR-0022's two environments.** Staging and production share one Resend
  account on the free tier. Staging holds no personal data by decision, and its mail must not be sent
  to real addresses; the provisioning ticket owns how that is arranged.
- **ADR-0017 is not amended, and that is the point.** The third-party testing question is handed to
  its own session with `emulate`, MSW and injected transport as the candidates and the full vendor
  list — Resend, Better Auth's OAuth, R2, trigger.dev, Sentry — as the surface.
- **ADR-0028 is unamended and unchallenged.** `attempts` remains the only retry authority; the
  deferral rule is about what counts as an attempt, not about who counts them.
