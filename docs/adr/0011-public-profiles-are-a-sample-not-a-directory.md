# Profiles are public, but the platform is a sample rather than a directory

An unauthenticated visitor sees real people — face, full name, department and skills — on the landing
page, and can open any one of them at a permanent shareable link. What they cannot do is **enumerate**
them: there is no public search, no filter, no pagination, no "see all", and no guessable URL. Signing
in is what turns a handful of people into all of them.

The distinction this ADR turns on is that **enumerability, not visibility, is the harm**. Twelve faces
on a landing page and a paginated searchable index of every Person are different objects under Ley
1581, and only the second is a target list.

## Why there are faces in public at all

The map's Givens already said _"public preview + authenticated full profile"_, but
`ley-1581-obligations.md` §5 and constraint 26 said the opposite — _"candidate profiles must be
authenticated, never publicly indexable"_, citing **Ley 1581 art. 4(f)**: personal data may not be
_"disponibles en Internet […] salvo que el acceso sea técnicamente controlable"_. Those two could not
both stand.

The research wins on its own terms and loses on its premises. It was written under the vacancy-centric
model, where a profile existed for an _employer_ to read against a vacancy and had no reason to face
outward. The pivot made the profile the product. Three things follow that the research never assessed:

- **Art. 4(f) exempts _información pública_, and _oficio_ is inside it.** `D.1074 art. 2.2.2.25.1.3`
  classifies _"los datos relativos […] a su profesión u oficio"_ as **dato público**. "María, costurera"
  is not what art. 4(f) restricts.
- **What art. 4(f) does reach here is the inference, not the skill list.** Encuentra is publicly framed
  as being for people who lost their income. We never collect earthquake-affected status and never badge
  it (a standing given), but a public card publishes that inference anyway about a named, photographed,
  locatable human. The sentence actually published is _"this person, here, has no income and will accept
  work from a stranger"_ — and _falsas ofertas de empleo_ is the documented recruitment modality for
  trata in Colombia. That is what #22's body meant by a trafficking-recruitment surface, and it is what
  the rules below are shaped against.
- **The SPE risk runs the other way.** `spe-authorisation.md` §2.4 puts _"A searches by skill, finds B's
  published profile, sends an offer"_ **furthest** from _remisión_, because the operator selects nobody
  for anybody. Going public is the safer posture under Ley 1636, not the riskier one. Under Ley 1581 it
  is the reverse. The two laws pull in opposite directions and this ADR sits between them deliberately.

**Instagram is not the precedent it appears to be.** The legal structure is identical — Meta's basis is
consent to Meta, ours is consent to us, and C-748 de 2011 denied _both_ of us the "they made it public
themselves" argument by striking _"manifiestamente públicos"_ from art. 6. So "Instagram does this" is a
statement about risk appetite, not about law. The difference that matters is not the photograph, it is
the caption: Instagram's population is everyone, ours is pre-selected for economic vulnerability by the
act of being here, and Instagram hands nobody a filtered set of vulnerable people with faces, locations
and stated willingness.

## The public surface, exactly

**Two walls on the landing page** — Capability Profiles and Needs — asymmetric by design, because the two
objects invert each other's risk. A Capability Profile is a person in economic distress advertising
themselves; a Need is a piece of work, authored by the side with money to spend. Under Ley 1581 the
Profile is the dangerous one. Under the SPE regime the **Need** is: UAESPE **Res. 000129 art. 5** — the
only official definition of _publicación de vacantes_ found anywhere — reads _"la difusión realizada por
**el prestador** a través de plataformas web"_, and art. 2 of the same resolution attaches a **daily
transmission duty to the SISE**. Needs are the more public object and are also the reason `noindex`
matters on the wall.

**A wall is a sample.** Bounded, rotating, no pagination, no public search, no public filter. ~~Search by
skill is the first thing an account buys, which is both the legal control and the correct funnel.~~

> **Amended by ADR-0014 — the boundary is asymmetric, because this ADR's own two objects are.** Search
> by skill is the first thing an account buys **for Capability Profiles only**. Searching **Needs** is
> public and needs no account: a Need is barely personal data, its author's Public View is already
> public, and nobody is pre-selected for economic vulnerability by wanting work done. Its risk is SPE,
> and this ADR already accepted that exposure by putting Needs on a public wall. The walls themselves are
> unchanged — a wall still answers no query.

**Fields.** The public tier — wall card and public profile page alike, one view at one URL whether reached
from the wall or from a shared link:

| Public                     | Requires a session                                                    |
| -------------------------- | --------------------------------------------------------------------- |
| Full name                  | Exact municipality                                                    |
| Photo, if opted in (below) | Availability                                                          |
| Department (_Risaralda_)   | Full experience and skill detail                                      |
| Skills                     | Need detail                                                           |
| Remote or local            | Search and filtering by skill _(Capability Profiles only — ADR-0014)_ |

Contact Details are on neither tier. They are released only by a **Contact Exchange**, unchanged.

Full name is public and exact municipality is not, because **face + full name + precise municipality** is
the combination that turns a card into an address, and municipality is the cheapest of the three to
withhold — a visitor judging whether this platform is real does not need to know someone lives in
Dosquebradas rather than Pereira. The full name is kept because a profile is meant to be **shared**: the
act this design most wants to enable is a neighbour posting _"hire her"_ into a Facebook group, and
"María C." undercuts it.

> **Scoped by ADR-0030 — this table is a _Person's_ tiers, and a Need's place is not in it.** Every
> row above still holds. What ADR-0030 adds is that a **Need's** exact Municipality **is** public: for
> four of ADR-0013's five Work Settings it is where work happens and says nothing about where its
> author lives, so this table never reached it. For `hirer_home` — the one setting where a Need's place
> **is** its author's home municipality — the field held back is the **author's name**, which leaves
> the public tier rather than the place. ADR-0030 also records that the reason given above for keeping
> the full name public is specific to a Capability Profile: nobody shares _"hire this household."_

## Two consents, defaulting in opposite directions

- **The card defaults on.** Appearing on the wall rides on the existing `publish` Purpose — no ninth
  Purpose — because the public tier is close to _dato público_. A Person may leave the wall from their
  settings, staying published inside Encuentra, without touching consent. Default-on because default-off
  empties the wall on day one and the wall is the acquisition strategy.
- **The photo defaults off.** ADR-0010 gave a Photo one binary; a public wall needs a second axis, so
  there are now three states: **no photo · visible to signed-in Persons · public**. The third is its own
  unticked control carrying its own art. 6 wording. Someone may be entirely willing to show their face to
  a person considering hiring them and entirely unwilling to have it on the open internet.

**The asymmetry is the point.** Art. 6 forbids nudging on sensitive data and permits it here.

What `publish`'s disclosure must now say, which it did not when ADR-0007 wrote it: that **both** public
surfaces exist — the wall and a shareable public link. And at the public-photo control, in plain Spanish
rather than buried in the _política_: _your photo will be visible to anyone on the internet, and we cannot
know who has seen it._ That sentence is what keeps this consent informed, which is what ADR-0010's art.
6(a) basis actually rests on.

## Unguessable, unindexed, rotatable — three controls, not one

A public profile lives at its **UUIDv7 `public_id`** from ADR-0003, which chose that identifier for this
exact reason: _"exposing that sequential key would leak row counts and invite enumeration"_. Q6's
sample-not-index property is therefore enforced by the identifier scheme, not merely by the absence of a
"see all" button.

**Unguessable is necessary and not sufficient.** A random URL stops someone walking the id space. It does
nothing once the URL is _linked_ — the wall links to every card, so a crawler reaches it from the landing
page; a shared link in a public group is indexed from there; referrers leak. _Nobody can guess it_ and
_nobody can find it_ are different claims and only the first is true. So:

1. **Unguessable id** — defeats enumeration.
2. **`noindex` on the profile route** — defeats the crawler. Licensed as a _distribution_ control, never
   a privacy one (below). Landing page and authored skill/municipality content pages stay indexable and
   are what ranks; profile pages of unknown individuals would rank on nothing anyway.
3. **Rotatable on demand** — the revocation mechanism. ADR-0010's precedent for photo bytes was a
   presigned, _time-limited_ URL, but a share link that expires is useless for the thing it exists for.
   Rotation keeps it permanent and lets the Person mint a new one, dead-ending every copy in circulation.
   It is the answer to _"I posted it in the wrong group"_ and it costs one column write.

**A retired `public_id` is never reissued**, and every absent profile **404s rather than 403s** — paused,
rotated and hard-deleted are indistinguishable from outside, because a 403 confirms someone exists at that
id.

**`robots.txt` and `noindex` are never treated as privacy controls.** Art. 4(f) asks for access that is
_técnicamente controlable_; authentication is such a control and a crawler directive is not, since
scrapers, most AI crawlers and anyone building a lead list ignore it. The standing rule: **anything
reachable without a session is permanently public and assumed scraped, and no privacy argument may rest
on a crawler directive.** One recorded cost — `docs/research/observability.md` notes CrUX field data
requires indexable pages, so `noindex` routes yield no real-user Core Web Vitals; #18's Cloudflare Web
Analytics is unaffected.

**Recorded honestly**: a UUIDv7 is time-ordered, so a profile URL discloses roughly when that Person
registered. Low harm, accepted, written down rather than discovered.

## Pausing is not deleting

A Person may **pause**: every Publication becomes invisible and unaddressable, they leave matching and
suggestions entirely, and pending Offers to them are **frozen** rather than declined. Consent is
untouched — a pause is not a Revocation and must never be mistaken for one, because CONTEXT.md already
says revoking a constitutive Purpose _is_ an erasure request.

The state belongs to the **Person**, not the Publication. Someone with one Capability Profile and three
Needs should not unpublish four things one at a time, and unpublishing does not stop the thing they
actually want stopped, which is Offers already sent to them.

> **Extended by ADR-0033 — a per-Need unpublish control exists, and it is not Pause.** The sentence
> above is an argument for Pause existing, never an argument against a Need-level control, and the two
> answer different questions: _I am not available at all_ versus _this particular job is filled_.
> `publications.status` already carried `unpublished` (ADR-0008); ADR-0033 puts the control on the
> compose-and-edit screen. Pause is untouched, and remains the only one of the two that freezes
> pending Offers.

Offers freeze rather than decline because declining on someone's behalf destroys information and puts
words in their mouth. On return they surface as a **reviewable list, not as live Offers** — what arrived,
how long ago, answer or dismiss. A month-old Offer answered _sí_ is a worse first interaction than none.

Erasure is **not** decided here; it stays with #27.

## How fast leaving takes effect

Three surfaces, three honest answers:

- **Database and every authenticated view** — immediate.
- **The public wall and profile pages** — short CDN TTL, purged on the way out, genuinely under a minute
  because the wall is one page rather than N.

  > **Amended by ADR-0032 — immediate, because nothing carrying a Person is cached.** The reason given
  > here reaches the Wall and was extended to profile pages without an argument. ADR-0032 caches
  > **nothing that names, depicts or reveals a Person** at the edge — static assets and the landing
  > _shell_, never a Wall — which deletes the TTL, the purge and the missed-purge question together and
  > makes leaving take effect **immediately** on every public surface. The case that would have bitten
  > is `public_id` rotation: a cached `200` at a retired id is the opposite of _"dead-ending every copy
  > in circulation"_ for the length of the TTL. The twelve faces this ADR puts on the landing page are
  > what force that page to split — a cached shell and an uncached Wall strip — and `stale-while-revalidate`
  > is refused on the strip specifically, because with no purge there is no way to cut a stale copy
  > short, and what it would extend is the window in which a Paused or Suspended Person is still on the
  > front page.

- **Anything already crawled or scraped** — never, and the _política_ says so plainly instead of promising
  otherwise: we remove our copy and stop showing you, and we cannot retrieve what a third party already
  took. The wall being a sample is what makes that sentence survivable — a sample leaks a handful of
  cards, an index leaks everyone.

## No profile-view log in v1

There is no log of who viewed whose profile, and `/my-data` makes no claim to one.

`ley-1581-obligations.md` cites that log to **arts. 4(g)/17(d)** — security, _preventing "consulta, uso o
acceso no autorizado"_ — not to art. 8(c), and it was written for the vacancy model where an employer
_received_ a candidate's data as a genuine transmission. A signed-in Person reading a profile its owner
deliberately published is an **authorised** access, so the security articles do not reach it. Art. 8(c)
asks what _use_ we made of the data; _"we published it, as you authorised"_ is a truthful answer without a
per-view table. With profiles public the itemised answer was never available anyway — hence the sentence
at the photo control above, which is the honest disclosure rather than a log we cannot build.

**ADR-0010's operator log is not affected and still exists.** That ADR said operator views of _pending_
photos _"feed #22's art. 8(c) log"_; with no such log, it owns its own, and it moves to #28. It is a
different act — an operator opening an unpublished sensitive image is precisely the _consulta no
autorizada_ arts. 4(g)/17(d) target, and it is one row per review.

## Consequences

- **ADR-0010 amended** — a third photo state (`public`), with its own art. 6 control and disclosure; its
  operator-access log now belongs to #28 rather than feeding a log here.
- **ADR-0007 amended** — `publish`'s disclosure wording must name both public surfaces. No ninth Purpose.
- **ADR-0003 is load-bearing here**, not merely followed: `public_id` is now a security control, and
  retirement-without-reissue is a new obligation on it.
- **`CONTEXT.md`** gains **Public Profile**, **Wall** and **Pause**.
- **#15 inherits a launch requirement.** Anti-scraping and rate limiting move out of the map's fog and
  become a named constraint, satisfied at the **Cloudflare edge** (already in the stack per ADR-0005, $0)
  rather than in the app — because the limiter ADR-0009 specified is _"in-memory per-instance, off in dev,
  a no-op behind a second Fly machine"_ and cannot defend a public surface. Without it, sample-not-index
  is a claim rather than a control.

  > **Corrected by ADR-0032 — the limiter was never that control.** Cloudflare's free plan gives **one
  > rule, keyed on IP, with a 10-second counting period and no other**, so it bounds a burst and cannot
  > bound volume — and ADR-0014 established that **query volume is the axis** a scraper works on. What
  > actually makes _sample-not-index_ true is the **shape** of the surface: bounded rotating Walls, no
  > public skill search, no pagination, the 200-result cap, no facet counts, and the rotatable
  > `public_id`. Those are this ADR's and ADR-0014's own work and they do not depend on Cloudflare. The
  > edge rule is a burst bound in front of them, worth having and not worth overstating.

- **#9 inherits** the requirement that _frozen_ is expressible in the Offer status vocabulary; whether an
  Offer also expires on its own clock is its call.

  > **Amended by ADR-0015 — expressible, but derived rather than stored.** _Frozen_ is read off the
  > recipient's `persons.status`, not held as a sixth value on the Offer: a stored copy of "is this
  > Person paused" can drift from the original and needs a sweep on pause _and_ unpause instead of one
  > on return. The intent is untouched — a returning Person still meets a reviewable list rather than
  > live Offers. ADR-0015 also took the second half: an Offer **does** expire on its own clock, at 14
  > days, and that clock stops while the recipient is Paused.

- ~~**#10 inherits** that search is authenticated-only — it is the first thing an account buys.~~
  **Amended by ADR-0014**: authenticated-only for Capability Profiles; Need search is public. #15's edge
  rate limiting gains that public surface as a second thing it must defend.
- **#20 inherits** that a paused Person leaves matching and suggestions entirely.
- **#12 inherits** the wall itself, and ADR-0010's rule that a profile without a photograph must never
  render second-class now applies on a public surface where the contrast is most visible.

  > **Amended by ADR-0030** — the public Need card carries one branch on Work Setting, and it lives in
  > the projection rather than in the component.

- **#27 inherits** that a pause is not an erasure, and the "we cannot retrieve what was scraped" sentence.
- **Access logging returns to the fog**, graduating with #13 if abuse investigation ever needs it.
