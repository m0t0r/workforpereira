# Suggestions are a search you did not type

ADR-0014 decided what a search _is_ — who may run one, what it accepts, what comes back and in what
order. This ADR decides the other half of #20: the surface where **the platform** chooses, with nobody
typing a query.

**Most of #20's body is already answered, and is recorded here only so that nobody re-opens it.** It
asked whether the algorithm should be deterministic rules, scored ranking or embeddings, and whether the
technical layer should be full-text Spanish, `pg_trgm` or an external service. ADR-0012 made a Skill the
only matching key; ADR-0014 settled the ranking as `(location tier, Skill Overlap)` bands with a daily
seeded shuffle, and settled that no text index appears in the search path at all. What remained was
narrower and harder: what a suggestion runs on when nobody has stated a query, what the surface shows
when the corpus is empty, and whether the platform pushes.

One more thing arrives already decided. ADR-0007's revocation table says refusing `suggestions` means
_"sends stop. Nothing else."_ The in-app surface is therefore **not gated on that Purpose** — it rides
`account`. That is inheritance, not a decision made here.

## A suggestion is a search whose query is your own Publication

**There is no second engine.** A suggestion is ADR-0014's search with the query _derived_ from the
viewer's own Publication — its Skills, its Municipality, its remote flag — instead of typed into a box.
Same `OR` over Skill ids, same Skill Overlap, same `(tier, overlap)` bands, same daily seeded shuffle,
same btree, same absence rules.

A bespoke scorer and embeddings were the alternatives. Both fail #20's own requirement that the answer to
_"why was I shown this?"_ be a sentence, and ADR-0012 made the vocabulary flat precisely so that pull and
push run on one key — a second engine would duplicate that key and then have to be kept agreeing with it.

The framing matters more than the mechanism: **a Need is a standing search, and a Capability Profile is
the standing search that runs against it.** Everything below follows from taking that literally.

## The completeness bias, and where it actually lives

In a search the query is at most 5 hand-picked Skills, so Skill Overlap lands in [1, 5] and claiming
twenty Skills buys very little. A _derived_ query is a stored set of up to twenty, and ranking by absolute
overlap against it systematically favours whoever claimed the most — the failure #20 named, and the
sentence ADR-0012 already called intolerable.

**The first fix considered was capping the derived query at five Skills, rotated daily.** It is rejected,
and the reason is worth recording because it looks like the obvious answer. It does not remove the bias —
a padded twenty-Skill Need still intersects today's five more often than a focused one does — and it pays
for that non-fix with a real cost: a Need matching eight of your Skills becomes **invisible** on any day
whose five miss it. In a cold corpus that is the best match in the product, hidden. It is also silent
machinery on the one surface whose entire defence is that it can be explained.

Splitting the two directions shows where the bias really sits:

| Surface                         | Query                | Overlap bounded by  | Verdict                               |
| ------------------------------- | -------------------- | ------------------- | ------------------------------------- |
| A Need's suggestions (Profiles) | the Need's Skills    | the **Need's** size | Structurally identical to search      |
| A Profile's suggestions (Needs) | the Profile's Skills | **20**              | Rewards Needs that ask for everything |

So the asymmetry is not in the query. It is in a cap that was never argued for. **ADR-0012 set twenty per
_Publication_ and justified it only for the person grain** — _"the receptionist who also cooks, drives,
sells and minds children is honestly at fifteen"_. It made no argument at all about a Need, and a single
piece of paid work requiring twenty distinct capabilities is not one job.

> **A Need carries at most five Skills.** This amends ADR-0012.

Five, taking ADR-0014's own reason verbatim: it capped a search query at five because _"past that the
overlap score stops discriminating and the query returns everyone."_ A Need is a standing search, so it
takes the same number for the same reason. With that, overlap lands in [1, 5] on both surfaces, absolute
count works unmodified, and nothing is sampled behind anyone's back.

ADR-0012 warned that its cap is **asymmetric** — raising it is one line, lowering it means telling
published people to delete Skills. That warning is why this change has to happen now: there are no
published Needs, so lowering is free exactly once.

## Per Publication, and the person who has none

A Person holds at most one Capability Profile and any number of Needs. The query is a Publication, so the
suggestions are **per Publication**: your Profile suggests Needs, and _each_ Need separately suggests
Profiles. A Person with a Profile and three Needs is looking at four derived lists, because those are four
genuinely different questions.

**They are never merged into one feed.** Merging needs a rule for how four lists share one column, and any
such rule is a second ranking system with no justification behind it. Home shows **one list at a time**,
chosen by a selector over your Publications — which also means the cost of the surface does not grow with
how many Needs you happen to have published. At launch almost everyone holds exactly one Publication, so
the selector is invisible in the common case.

**A Person with no Publication gets no suggestions**, because there is no query to derive. They get the
Wall and the one action that changes their situation. Suggestions are what publishing buys, which is the
right incentive to build.

## Cold start is a supply problem, and it is asymmetric

#20 called the empty engine _"the single biggest early risk to the product"_. Half of that framing is
wrong in a way that changes where the launch effort goes.

At launch the scarce side is **Needs**. Workers are the supply, so the **hirer's** surface — a Need
suggesting Capability Profiles — works from the first day. The empty surface is the **worker's**, and no
ranking change fixes an empty corpus.

So the engine does not pretend. Widening is already exhausted: ADR-0014 made location a _band_ rather than
a filter, so the only thing left to relax is the Skill requirement, and relaxing it means showing someone
work they cannot do. Padding with the Wall's sample is worse — an unexplainable row on the surface whose
defence is explainability.

**What ships is ADR-0014's empty state, unchanged**: other Skills in the same Skill Group, _publish a Need
so people come to you_, and a Skill Suggestion when the term could not be found at all. It is written
there for search and extends here without modification.

The consequence to act on is not a matching decision at all: the first Needs are worth more than any
ranking work, and that is product ops, past this map's destination.

## Rotation is the whole of fairness, and the real fix is elsewhere

#20 asked what counters ranking that disadvantages people with the least digital literacy. Under
`(tier, overlap)` bands, a Profile holding one of a Need's five Skills sits permanently below one holding
four, and the daily shuffle reaches only _within_ a band.

**That is accepted, and no counterweight is added.** Overlap is the only signal, and unlike a photograph
or a completeness score it is **honestly actionable**: _you match fewer of the things this person asked
for_ is true, and it is fixable by the person it describes.

- **An exposure counter that lifts under-surfaced Persons is rejected.** It is new behavioural personal
  data serving no consented _finalidad_ — the reasoning ADR-0014 used to refuse `last_active_at`, arriving
  here from a second direction.
- **A recency lift for new Publications is rejected** for the same reason plus a worse one: it would punish
  the person who published once and cannot afford the data to come back, which is the population the
  fairness clause exists to protect.

**The counter to the digital-literacy problem lives in the picker, not in the ranking.** Someone who
selects two Skills because the picker defeated them is a picker bug, and a thumb on the ranking hides that
bug rather than fixing it. #30 owns it, and ADR-0012's minimum-of-one is the floor beneath it.

## Twenty is a display default; two hundred is the safety bound

The surface shows **20**, extends by an explicit action, and hard-stops at **200 per source Publication** —
ADR-0014's cap. The ADR states plainly which of those two numbers is load-bearing, because they look alike
and are not.

**Twenty is presentation.** It is not a cost control: producing a ranked top-20 requires ranking the entire
candidate set anyway, so the per-row shuffle hash runs over every match regardless of what is displayed. A
`LIMIT` buys a top-N heapsort rather than a full sort — memory, not work. And it is not a fairness control
either; if anything, letting people go deeper is what gets the tail seen.

**Two hundred is the bound that matters, and it is inherited rather than invented.** Suggestions must not
be a wider door than search. `/search/people` stops at 200, and an indefinitely scrolling suggestion list
would let anyone publish a deliberately broad Need and scroll their suggestions instead of searching,
which makes the search cap decorative. Parity between the two surfaces is the control; ADR-0011's
enumeration argument is the reason behind it.

As in ADR-0014, the cap is only fair because the rotation makes it a different 200 tomorrow. The two remain
load-bearing on each other.

**Rendering is left open.** Twenty rows extending to at most 200 does not need virtualisation, and how a
bounded list paints is #12's decision, not an architectural one this map owes an implementer.

## The explanation is always on the card

ADR-0014's sentence — _"3 of your 4 skills, in your municipality"_ — is inherited, with one addition: it
must name the **source Publication**, because a Person looking at four derived lists needs to know which
question produced this answer. _"Pide 3 de las 5 habilidades de tu perfil · Risaralda"_.

**It is shown unprompted on every card, never behind a disclosure control.** An explanation you have to ask
for is an explanation for nobody, and this is the one surface where the platform rather than the Person
chose what to show — which is precisely when it owes the sentence without being asked.

## No push in v1

The map's given was that push is opt-in and promotional under Ley 2300 from day one. **v1 sends nothing.**

#5's research is unambiguous about what a suggestions digest would be: art. 5 extends Ley 2300 to
_mensajes publicitarios_ over email and app messaging, and a _"nuevos empleos para ti"_ send is squarely
that, inheriting sending windows in `America/Bogotá`, a _festivo_ calendar, one-contact-per-day and
not-across-channels-in-a-week caps, and a one-click unsubscribe. ADR-0015 separately declined a
notification system on the ground that every v1 notification is 1:1 with an Offer row; a digest is the
first thing that is not.

**And at launch there is nothing to send** — the section above says the worker-facing corpus is the empty
one, and a digest of nothing is the worst possible first impression of a channel someone opted into.

**The cost of this decision is real and is not hidden:** pull-only means a worker learns that matching work
appeared only by coming back to look, and this audience rations mobile data. That is the strongest argument
against, it is not answered here, and it is what the successor ticket exists for.

**`suggestions` is therefore dropped from the v1 Purpose set** — four unticked boxes at `/signup`, not
five. Consenting to a _finalidad_ nobody pursues means a Disclosure describing a fiction, and #14 already
flagged that the single signup form is a lot of screen before anyone has seen the product. ADR-0008 dropped
`pgEnum` so that a Purpose can appear later without an `ALTER TYPE`; it needs none. The honest cost is that
v1.1 needs a new Disclosure version and a re-consent prompt for everyone who signed up before it.

## Live queries, and no cache

Suggestions run as **live Postgres queries on ADR-0014's existing indexes**. No materialised view, no
background job, no per-Person suggestion table.

**Redis is refused, and cost is the weakest of three reasons.**

1. **Staleness has a safety direction here.** A cached list can surface a Person who has since Paused, been
   Suspended, or Blocked the viewer. ADR-0011, ADR-0013 and ADR-0014 all treat absence as a safety
   property — ADR-0014 goes as far as making absence indistinguishable from _"nobody holds that skill"_
   because the negative space is itself a disclosure. A cache that lags on a Block is a safety bug.
2. **It is a second copy of personal data outside the constraint system.** A key holding _"these people are
   suggested to Person X"_ is the N+1 erasure adapter ADR-0008 forbids and ADR-0014 rejected an external
   search index over. ADR-0013 already refused Redis once, for safety counters, because a Redis counter is
   a second source of truth that drifts and cannot be audited — the same objection with a larger blast
   radius.
3. **It is a new processor**, needing a _contrato de transmisión_ in #21's register, against #18's
   $4.46–$7.46 remainder — which that audit listed as an implied cost and never actually priced.

**What caching is fine is stated so nobody reads this as an anti-caching rule.** ADR-0014's static Skill
and Municipality JSON stays, indefinitely cacheable, and it is the caching that actually matters for
someone on a bad connection. Route-level caching of non-personalised surfaces — the Wall, the authored
`/skills/<slug>` pages — is fine for the same reason: nothing is keyed to a Person.

**The escape hatch is named rather than left to be discovered.** If measurement later says the shuffle
hurts, ADR-0005's single long-lived Fly machine makes an in-process LRU available with no new vendor, no
new processor and no register entry — which is exactly what ADR-0009 chose for the rate limiter. That is
the thing to reach for before reaching for Redis.

The known cost is recorded: unlike search, this surface runs on **every signed-in home page view**, and the
seeded shuffle is a per-row hash no index can serve. It is the first place a scale target will bite.

## Where it lives, and what it is called

**`@repo/matching`**, whose charter ADR-0014 already widened to _search and suggestions_. Same package,
same flat key, same reads of `blocks` direct from `@repo/db`.

**The signed-in home _is_ the suggestions surface.** For someone who lost their income, the first thing
after signing in should be work that matches them, not a dashboard they must navigate out of. A separate
`/suggestions` route would make the product's central mechanic something you have to find. `/search/work`
and `/search/people` remain the deep surfaces you go to deliberately.

**The Wall shares the seeded-shuffle helper and nothing else.** `CONTEXT.md` says a Wall _"is still never a
search result: it answers no query"_, and the moment it borrows band-and-rank it becomes the public ranked
index ADR-0011 built two Walls to avoid being.

**In code the term is `Suggestion`.** In Spanish the surface is _**coincidencias**_, **not** _sugerencias_
— `CONTEXT.md` already spends that word on **Skill Suggestion**, which is a suggestion made _to us_ and has
the better claim on it. One Spanish word naming two unrelated things is exactly the collision ADR-0001's
naming rule exists to prevent.

**Suggestions are not reciprocal.** A Profile's suggestions are Needs and a Need's are Profiles — two
different corpora — so A appearing in B's list implies nothing about B appearing in A's. Stated out loud so
that nobody builds a mutual-match concept, which `CONTEXT.md` bars by name on **Contact Exchange** anyway.

## Who is absent, and what disappears once you have acted

Absence is ADR-0014's, unchanged: only active Publications of active Persons, so Paused and Suspended
Persons and draft, unpublished and suppressed Publications are gone, a Block hides both parties in both
directions, and absence is never signposted. Your own Publications never appear in your own lists.

One case is new here, because a suggestion is an invitation to act where a search result is not:

**A suggestion you are forbidden to act on is hidden.** Pairs closed by ADR-0015's per-pair rule — the
90-day close after a second decline — and by a Block disappear. Offering someone work they will be refused
from sending is noise dressed as an opportunity.

**A Publication you have a _pending_ Offer against keeps appearing, with its status.** Removing it would
make home disagree with _Propuestas enviadas_, which reads off the same `offers` row.

**Nothing is hidden merely because you looked at it.** That would need the profile-view log ADR-0011 and
ADR-0014 both refused.

## Consequences

- **ADR-0012 amended.** The twenty-Skill cap is per Capability Profile; a **Need carries at most five**.
  Lowering it is free only because no Need has been published — this is the one moment the asymmetry that
  ADR named allows it.
- **ADR-0007 amended.** `suggestions` leaves the v1 Purpose set: **four** unticked boxes at `/signup`, not
  five. Its revocation-table row goes with it. The mechanism is untouched — ADR-0008's `text({ enum })`
  needs no migration to add it back.
- **ADR-0014 extended, not amended.** Its query shape, bands, shuffle, 200-cap, indexes, absence rules and
  empty state are all inherited verbatim; suggestions add a derived query and a display default in front of
  them.
- **`CONTEXT.md`** gains **Suggestion**; **Purpose** loses _send suggestions_ from its enumeration.
- **#12 inherits** the rendering decision this ADR deliberately leaves open, the always-visible explanation
  line as a copy obligation, and the Publication selector for a Person holding more than one Publication.
- **#30 inherits** a sharper reason to exist: this ADR refuses to correct ranking fairness and names the
  picker as the place the correction belongs.
- **#15 inherits** nothing new. There is no scheduler, no _festivo_ calendar and no digest to drain, because
  v1 pushes nothing.
- **#16 inherits** a required test that suggestions never surface a Paused, Suspended or Blocked
  counterparty — the property a cache would have broken, now guaranteed only by the queries being live.
- **The cold-start half of #20 leaves this map.** The matching-surface question is answered; supplying the
  first Needs is product ops, past the destination.
- **A successor ticket owns push**: reinstating the `suggestions` Purpose and designing the digest under
  Ley 2300, with the pull-only cost above as its opening argument.
