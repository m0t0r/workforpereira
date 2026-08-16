# Reporting, moderation and anti-fraud between individuals

The pivot changed the risk entirely. The old model's danger was a fake company posting a fake
vacancy, and ADR-0008's predecessor tickets answered it with employer verification. Now
**individuals contact individuals** — some across borders, some for in-person work inside someone's
home — with no company registry to check anyone against and no money trail to audit, because
ADR-0005's platform deliberately moves no money.

This ADR decides what can be reported, what happens next, how much of it runs on its own, and what
the platform admits it cannot do. It is **report-driven, not detective**; its one instant power
belongs to the person in danger rather than to the operator; and it refuses every automatic
state transition, for the same reason ADR-0010 refused them on photographs.

## The posture: reactive, with deterministic limits

v1 ships **no pattern detection**. No classifier over offer text, no fraud score, no heuristics.

With zero users at launch a detector has nothing to tune against, and a solo operator has no capacity
to triage its false positives — the false positive here is refusing income to someone who lost
theirs. What v1 ships instead is **hard deterministic limits** (below) and a **logging shape chosen
so the patterns are answerable by SQL later**. That second half is the load-bearing part: detection
is cheap to add and impossible to backfill, so the columns must exist now even though nothing reads
them yet.

Detection returns as its own decision when there is traffic to tune against. ADR-0010's rule that a
safety classifier *may* pre-filter a queue but may **never** be the sole approver governs it when it
does.

## What a Report is

A **Report is about a Person**, always, with a nullable pointer to the **Publication or Offer** that
prompted it. Never a Photo.

Object-rooted reports scatter the only signal that matters. Three reports against one Person, arising
from three different Offers, is a pattern; three unrelated rows about three objects is noise. The
pointer still tells the operator what to look at, and it is what makes a *targeted* suppression
possible instead of an all-or-nothing suspension.

A Photo is not reportable because ADR-0010 pre-moderates every image: a visible Photo has already
passed an operator, so "this photo is wrong" is a complaint about the **Person** (someone else's
face, a fabricated identity) or about our own review — neither of which is a third object.

**Self-description is reached through the Publication pointer, and is not pre-moderated.** ADR-0012
put free prose on every Publication, shown to anyone who can see it. Photographs are pre-moderated
and text is not, which is a deliberate asymmetry rather than an oversight: ADR-0010 accepted a review
queue because the harm from a visible image is done the instant it appears and a takedown does not
undo it, and it accepted that queue for an object most Persons upload **once**. Prose is edited
freely and repeatedly; pre-moderating it would mean an operator gating every edit, which is the
backlog ADR-0010 warned would destroy the control it exists for.

**The reporter supplies a reason code and, optionally, prose.** The codes:

| Code | Meaning |
| --- | --- |
| `advance_fee` | Asked me for money to get the work — uniform, training, materials, *trámites* |
| `off_platform` | Pushed me off the platform before accepting |
| `impersonation` | Not who they say they are, or someone else's face |
| `not_real_work` | No real work — a recruitment pitch, MLM, or bait |
| `harassment` | Sexual, threatening or abusive contact |
| `discrimination` | Refused or targeted on a protected ground |
| `illegal_or_unsafe_work` | The work itself is unlawful or unsafe |
| `underage` | Appears to be under 18 |
| `spam` | Mass identical Offers, or advertising |
| `other` | The free text carries it |

`underage` earns its place because v1 being 18+ is only a rule if it has an enforcement path.

**Free text is permitted, capped, and never shown to the reported Person.** This is a deliberate
asymmetry with ADR-0010, which forbids operator prose about a person's face. The cases are not alike:
an operator writing prose about a face is *us* creating a record about someone, while a reporter
describing what happened to them **is the complaint**. *"Me pidió $50.000 por el uniforme antes de
empezar"* is the entire evidence, and a reason code alone leaves the queue undecidable.

**Only signed-in Persons may report in-product.** The Wall is public under ADR-0011, so someone
without an account may well see something wrong — for them, the data-protection contact address
D.1377 art. 13 already forces us to publish is the catch-all. In-product anonymous reporting is an
unauthenticated flooding vector aimed at the one resource that cannot scale.

The lawful basis for all of it is the `safety` Purpose, which ADR-0007 made **required** precisely
because Colombia has no legitimate-interest basis and there is no lawful route to moderating a Person
who refused it.

## Block: the only instant safety power

A Person may **Block** another. It takes effect immediately, needs no operator, and the blocked
Person is never told. Both leave each other's matching and suggestions, and no Offer can pass in
either direction.

> **Amended by ADR-0014 — a Block reaches search too.** This ADR named matching and suggestions and
> not search, which read literally would let a blocked Person still *find* their target and merely be
> unable to send an Offer. That is not what anyone blocking someone believes they bought. A Block is
> symmetric across every discovery surface, and the absence is indistinguishable from "nobody here
> holds that skill" — no hidden-result count, for the same reason ADR-0011 404s rather than 403s.

This is treated as load-bearing rather than a convenience, and it is what earns the right to refuse
every automatic moderation action below. Without it, every day the queue is backed up is a day
someone stays reachable by whoever frightened them; with it, the person gets relief in the same
second and the Report becomes an unhurried question about whether *the platform* should act.

**A Block reaches forward only.** It does nothing to an already-accepted Offer or to Contact Details
already exchanged, and the UI says so at the moment of blocking — *"ya no podrá contactarte por
Encuentra"*, which is true, rather than a promise of erasure that is not. A Block that destroyed
shared history would also let someone delete the record of an arrangement they later dispute.

## The operator's actions

Four, and no more: `dismiss`, `suppress_publication`, `suspend_person`, `escalate_incident`.

Suppression follows ADR-0006's established route — `publications.status` is owned by
`@repo/publications` and set by a `@repo/safety` use case, never by `publications` asking `safety`
anything. Suspension is the same shape one level up: a `status` on `persons`, owned by `@repo/people`,
set by a safety use case. Together with ADR-0011's Pause that makes `persons.status` a three-valued
vocabulary — active, paused, suspended — under ADR-0008's `text({ enum })` + `check()` rule.

**There is no `warn` action.** For a solo operator the real choice is dismiss-or-suspend; a warning
is a design cycle spent on a notification with no teeth, and its practical effect on a fraudster is a
heads-up to move faster.

**Suspension is indefinite and operator-reversible, never timed.** A timed ban implies a
rehabilitation process that nobody is staffed to run, and an expiry date is a promise the platform
would keep automatically without anyone having looked.

### Accumulation never acts on its own

**N reports do not auto-suppress anything.** Accumulation reorders the queue and does nothing else.

This is the decision most likely to be revisited by someone who has not thought it through, so the
reasoning is recorded plainly: auto-suppression at a threshold is a **brigading weapon**. Three
coordinated accounts could strip an earthquake-affected person's only income surface for as long as
the queue takes, and that failure is categorically worse than a slow queue — it is the platform
inflicting the exact harm it exists to repair, on the exact person it exists to serve. Block already
gives every individual reporter immediate relief, which is what makes refusing this affordable.

It is also what ADR-0010 already decided about photographs, for a compatible reason: a person's
standing on this platform never changes without a human having looked.

## Suspension, and what it cannot reach

**Pending Offers sent by a suspended Person are voided, not frozen.** ADR-0011 freezes Offers on a
Pause because a Pause means *"I expect to come back"*. A suspension means the opposite, and leaving
an Offer pending against an account that will never answer strands the recipient.

**Contact Details already released by a Contact Exchange are gone, and this ADR says so rather than
implying a reach the platform does not have.** Suspension stops future exchanges; it cannot retrieve
a phone number someone already wrote down. This is the direct, unavoidable cost of moving no money
and stopping at the introduction, and **no copy shown to a reporter may suggest otherwise** — telling
someone we "removed" a person who already has their number is a false assurance about their safety.

## In-person work in a stranger's home

The risk of cleaning a stranger's house is not the risk of remote data entry, and v1 acknowledges the
difference in the domain rather than in a banner.

A Need carries a **Work Setting**: `hirer_home`, `worker_home`, `business_premises`,
`public_or_varied`, `remote`. `public_or_varied` exists because errands and deliveries are common
informal work here and folding them into "business premises" would misprioritise the queue.

It does two things. It **selects the safety guidance** shown at the Contact Exchange, and it **raises
queue priority** — `hirer_home` reports and `underage` reports are triaged ahead of the rest, because
those are the two classes where a slow queue is indefensible.

Undifferentiated safety copy on every Contact Exchange was rejected: shown on all of them it is
wallpaper, and wallpaper is not read on the one occasion it matters.

**The honest risk in the field itself**: a modelled Work Setting can read as though the platform
vets home visits. It does not, and the copy attached to it must not drift into implying it.

## Rate limits are not the auth limiter

Two mechanisms that share a name and share nothing else.

**Auth limiting** — IP-keyed, sub-minute, protecting sign-in from brute force — is ADR-0009's
deferred flag and belongs to #15. Losing its state on a deploy is annoying, not incorrect, which is
why a cache is a legitimate home for it. #15 also inherits an unverified assumption worth checking:
the Better Auth audit lists Redis/KV as an implied cost but **never priced it**, and its `"database"`
backend costs one table and $0 against #18's real remainder of $4.46–$7.46/month.

**Safety counters are not rate limiting at all.** "Has this Person sent more than N Offers this week,
to more than M distinct people?" is a business rule evaluated over durable domain data — the `offers`
rows are already the authoritative record. It is a `SELECT count(*)` with an index on
`(sender_person_id, created_at)`, and it is **never** a cache. A counter in Redis is a second source
of truth that can drift, can be evicted, and cannot be audited, against an ADR-0008 posture that
evidence must survive.

Three counters, all durable, all refusing with honest copy rather than dropping silently:

| Counter | Guards against |
| --- | --- |
| Offers sent per day | Volume |
| **Distinct recipients per rolling week** | The blast pattern |
| Reports filed per reporter per day | Queue flooding |

**Blocks are never limited.** A safety action does not get a quota.

## What the offer flow must record

Requirements handed to #9, so that the patterns deferred above are answerable later:

1. **Offer text stored verbatim and immutably.** An advance-fee claim cannot be investigated against
   text the sender rewrote afterwards.
2. **Every send recorded, including sends refused by a rate limit.** The refused attempts *are* the
   blast signal; dropping them discards the evidence of the thing the limit exists to catch.
3. **The Contact Exchange timestamp.** *"They pushed me to WhatsApp before accepting"* is only
   checkable against a known acceptance time.
4. **Pay direction fixed by the schema**, so an Offer is structurally incapable of expressing *"the
   worker pays"*.

The fourth is the strongest anti-fraud control here and costs nothing. It does not stop anyone
*asking* for money in prose — free text must exist, because the work cannot be described without it,
which is exactly why it is the vector. What it stops is the platform ever **rendering that ask as a
legitimate field**, which is what makes advance-fee scams look official.

## Contact details in free prose

ADR-0012 put a **Self-description** on every Publication, shown to anyone who can see it — which
under ADR-0011 includes the public Wall, with no account required. Set beside the map's given that
*contact details are exchanged only when an Offer is accepted*, that is a hole in the platform's
central control: **a phone number typed into a Self-description walks straight around the Offer
mechanic**, publicly, before any Offer exists. It also destroys the timestamp the third recording
requirement above depends on — *"they pushed me off-platform before accepting"* is unfalsifiable when
the number was on the profile all along.

Neither ADR-0012 nor ADR-0011 had reason to notice this; it appears only where the two meet.

**Two controls, in this order.** First a **hint shown before anyone types** — at the
Self-description field, saying plainly that contact details are shared when an Offer is accepted and
do not belong in the text. Then a **deterministic refusal on save** for phone-like and email-like
strings, with copy that repeats the same reason.

The hint carries most of the weight and is the reason the refusal is tolerable. Prevention costs a
sentence; correction costs someone their draft, and lands hardest on the people with the least
patience for a form that rejects them without explanation.

This is a **format rule, not detection**, so it does not reopen the posture above — no classifier, no
score, no model. And it is honestly a speed bump rather than a wall: it is evadable by anyone writing
*tres cero cero*, and it will misfire on street numbers. It is worth shipping anyway, because the
person it stops is mostly the person who did not know the mechanic existed, and the refusal is the
moment that teaches it.

Copy says *"tus datos se comparten cuando aceptas una propuesta"* — never *"formato inválido"*.

## What each side is told

**The reporter gets an acknowledgement and never an outcome.** Telling them we suspended someone both
discloses a third party's personal data and invites retaliation by proxy.

**The reported Person is never told a Report exists**, and is told plainly when an action lands on
them — the category, never the reporter's identity and never their words.

**No response-time commitment is displayed on Reports.** ADR-0010 shows *menos de 3 días* for the
photo queue; this queue shows nothing, because a clock nobody is staffed to keep is worse than
silence. An internal alert on queue age replaces it, and the honest answer to *"what happens when it
backs up"* is that **Block holds the line** — which is only a true answer because Block is instant.

**The safety queue is another list inside the operator surface #28 builds**, sharing its
authentication, layout and operator access log. There are now **three** queues, not two — ADR-0012
added Skill Suggestions, which are explicitly *"a message to the operator"* — so #28 is building the
one internal surface this product has rather than a photo tool. A solo developer maintaining three
internal applications maintains none of them.

## Escalation outside the platform

**A Report is not a SIC security incident.** A fraudster operating on the platform is not a
*violación a los códigos de seguridad*; the Circular Única duty attaches to breaches of our own
security. The incident record stays **separate** from `reports`, reachable by one explicit
`escalate_incident` action for the single overlapping class — a Report that reveals personal data was
leaked or scraped.

That action starts the **15 días hábiles** clock (Circ. Única Tít. V, num. 2.1 f)(ii)), and the
mechanics are worth stating rather than pretending: the clock runs from detection **and** escalation
to the designated person or area, who is the same solo developer. Those two moments **collapse into
one**. There is no second step to wait for, and any design that implies one is fiction.

**Police, SIC as a criminal matter, and the ICBF: no obligation, no automated path, and the operator
may.** Recorded as a decision rather than an omission, with the note that v1 being 18+ and
`hirer_home` childcare being in scope is exactly where an ICBF question would arrive.

## What this ADR deliberately does not decide

Two questions surfaced here turn on a reading of Ley 1581 that engineering should not invent. Both
are the same class — *how does the statute treat the moderation record* — and both go to a single
research ticket:

1. **Erasure versus ban.** ADR-0008 handed this ticket the problem: hard-delete a fraudster and they
   re-register tomorrow, because nothing survived to recognise them by. Suspension-as-retained-state
   answers it *until* the suspended Person exercises their art. 15 right and asks to be erased. Do we
   comply and lose the ban?
2. **Art. 8(a) against the report record.** A suspended Person files a *consulta* asking what data we
   hold. **The Reports are their personal data.** The position this ADR recommends — disclose the
   category, date and action; withhold the reporter's identity and free text — is a recommendation,
   not a finding.

Until that ticket resolves, build to the recommended positions and do not treat them as settled.

## Consequences

- **`CONTEXT.md`** gains **Report**, **Block**, **Suspension**, **Work Setting** and **Safety
  Incident**. **Pause** is amended to point at Suspension as the named thing it is not.
- **`persons.status`** becomes a three-valued vocabulary — active, paused, suspended — jointly owned
  by ADR-0011 and this ADR, written under ADR-0008's `text({ enum })` + `check()` rule.
- **#28 is now downstream of this ADR** and inherits the safety queue as a second list in the surface
  it was already building, plus the two priority classes (`hirer_home`, `underage`).
- **#9 inherits** the four recording requirements above, and **pay direction fixed by the schema** as
  a constraint on its field design rather than a suggestion.
- **#9 and #19 inherit Work Setting** as a Need property with a fixed vocabulary.
- **#15 inherits** the auth-limiter decision *and* the unverified Redis-versus-`"database"` question,
  explicitly separated from safety counters so nobody wires one mechanism for both.
- **#27 inherits** a retention limit it must set and publish under D.1377 art. 13(6): **dismissed
  Reports persist** — deleting them destroys the only accumulation signal this ADR left standing —
  but they are a retained accusation one Person wrote about another, so "forever" is not the answer.
- **#26 and #27 are blocked** by the research ticket above.
- **ADR-0011's parked question is answered and retired**: see Rejected.
- **ADR-0010's photo-rejection reason codes stay a separate vocabulary** from the report reason codes
  here. Different authors, different lifecycles, different consequences.

## Rejected

**A profile-view log for abuse investigation.** ADR-0011 declined one for compliance and parked the
remaining question — *does abuse investigation need a viewer trail that compliance does not?* — to
graduate with this ticket. It does not. With detection deferred and Reports rooted on a Person, a view
log answers almost nothing a Report raises: the fraud happens **inside the Offer**, which is already
stored verbatim and immutably. What it would be is a large, permanent, always-on record of who looked
at whom, kept against a hypothetical, over a population whose faces ADR-0010 treats as sensitive —
precisely the aggregation risk ADR-0011 built the enumerability line to prevent. **The fog patch is
retired, not deferred again.**

**Auto-suppression at a report threshold.** Covered above: a brigading weapon aimed at the income of
the people this platform exists for.

**Detection in v1.** Covered above: no signal to tune against, no capacity to triage, and cheap to add
later provided the logging shape exists now.

**A `warn` action, and timed suspensions.** Covered above.

**Anonymous in-product reporting.** An unauthenticated flooding vector against the only unscalable
resource. The published data-protection contact address carries the genuine case.

**Reports rooted on the reported object rather than the Person.** Scatters the accumulation signal
that, with detection deferred, is the only pattern-level signal v1 has.

**Redis for safety counters.** A second source of truth for a count already held authoritatively in
`offers`, which can drift, be evicted, and cannot be audited.
