# The matching key is an authored vocabulary of capabilities, not an imported occupation standard

Search is by skill and matching runs on skill plus location, so the vocabulary *is* the product's index:
a person who cannot find themselves in it cannot be found by anyone else. #19 asked whether to seed that
vocabulary from SENA's CNO or from ESCO, or to author one.

**We author roughly 300 flat capability terms**, informed by both and imported from neither, and every
other decision here follows from the grain of that list.

## A capability, never an occupation

The founding insight is that a hotel receptionist can do many things she was never employed to do. A
vocabulary of *occupations* records only the job she has lost, and this product exists precisely because
that job is gone.

So a term names something you **do** — `atención al cliente`, `manejo de caja`, `conducción de
motocicleta`, `cuidado de niños`, `carga y descarga` — and the list is **flat**.

Two levels were the obvious alternative and #19's own body suspected they would be needed: an occupation
with capabilities beneath it. We rejected it, because with both present *matching must decide which level
wins*, and whichever way that resolves, the occupation tier quietly reimports the "what were you employed
as" framing the whole product is built to escape. Flat keeps exactly **one matching key**, which is also
the only shape #20 can explain to someone asking *"why was I shown this?"*.

The two things a hierarchy would have bought are bought separately and more cheaply:

- **Skill Groups** are browsing scaffolding — a label on the flat list, never stored on a Publication and
  never an input to anything. Each Skill sits in exactly one. Multi-membership was rejected: it is a
  hierarchy in disguise, and it makes one term appear twice in the picker, which reads as two skills.
- **Denominations** — `mesero`, `niñera`, `domiciliario` — are a way *into* the vocabulary. Typing one
  offers the Skills that title usually implies, which the Person then edits. Occupations survive here and
  only here, as a search aid rather than as a claim about anyone.

## The link asserts willingness, and nothing about experience

A Skill on a Capability Profile means *I am willing to do this*. It carries no level, no years, and no
flag for having been paid to do it before.

The alternatives all failed the same way. Once experience is recordable it becomes the thing hirers
filter on, the profile collapses back into the hoja de vida **ADR-0010 already threw out** — on the
grounds that it "defeats #10" and "is a barrier to people who have no CV" — and the display splits into
tiers where *willing but inexperienced* renders visibly second-class. ADR-0010 ruled on exactly that
failure mode for photographs: a profile without one "must never render second-class". The same reasoning
binds here.

**The cost is real and accepted:** a hirer gets weaker signal, and `dispuesta a cocinar` from someone who
has never cooked for pay is noise on a chef role. We take it because **the platform stops at the
introduction**. It is not a hiring-decision instrument and does not have to carry enough signal to hire
on; vetting happens in the conversation an accepted Offer starts. `CONTEXT.md` already forbade a
self-assessed level — this extends the same principle from *how well* to *whether at all*.

## Twenty skills, minimum one

Because the link is cheap to assert, the rational move for someone desperate for income is to tick
everything — and uncapped, #20 degrades to noise while the honest person who chose six is buried under
the person who chose two hundred.

**Maximum 20 per Publication, minimum 1.**

The cap belongs at the data layer so that #10 and #20 inherit it rather than each re-solving it. Handling
it in ranking instead was rejected against #20's own requirement that the algorithm be explainable:
*"you were shown to fewer people because you claimed too much"* is an intolerable thing to have to tell
this user. A "primary skills" subset was rejected as the same second-tier trap as a hierarchy.

Twenty rather than a lower number because the capability grain legitimately produces more terms per
person than an occupation grain would — the receptionist who also cooks, drives, sells and minds children
is honestly at fifteen, and a cap of ten would punish exactly the versatility this product exists to
reveal. Twenty rather than twenty-five because **the cap is asymmetric**: raising it later is a one-line
change, lowering it means telling people who already published that they must now delete skills.

**Minimum one is forced**, not chosen — see the next section. With no searchable free text, a Publication
carrying no Skill is not merely hard to find, it is unreachable by every surface.

## The self-description is shown and never queried

#19's body and #10's both assumed a free-text self-description that is *searchable but secondary*. **That
steer is overridden here.** The self-description exists, is displayed, and is **never indexed, never
filterable, and never an input to matching**.

Indexing unconstrained prose *is* building a filter over it. This audience will write `madre cabeza de
familia`, `tengo una discapacidad`, `soy desplazado por la violencia`, `perdí mi casa en el terremoto` —
and a hirer could then search `sin hijos` or `joven`. That is art. 5 discrimination delivered by our own
query, against a standing given that earthquake-affected status is *never collected*: we would be
indexing, at scale, the very field where people volunteer it unprompted.

ADR-0010 set the precedent for the Photo and it is inherited verbatim — **shown, never searchable, never
filterable**. Removing the prose altogether was rejected: displaying volunteered data is lawful where
filtering it is not, and prose is how a person sounds like themselves.

It hangs on the **Publication**, not the Person, because a Need wants prose describing the work as much as
a Capability Profile wants prose describing the person.

The consequence is that **the controlled vocabulary carries the entire search burden**, which is what
makes the next two sections load-bearing rather than housekeeping.

## What happens when a skill is missing

ADR-0006 declares `@repo/catalog` *seeded, read-only at runtime*, so no term is created by a user, ever.
An unmatched string is captured as a **Skill Suggestion** in a separate table — never in `skills` — the
operator reads it, and the term it argues for may be authored into a later release. Meanwhile the Person
picks the nearest existing term.

Free-text skills alongside controlled ones were the tempting escape hatch and are the most important
rejection in this document. They reintroduce the self-description problem through a side door — someone
*will* type `madre cabeza de familia` into a searchable skill field — and they shatter the matching key
into five spellings of `atención al cliente`, which is the exact failure #19 opens with.

The capture is not a consolation prize. It converts an invisible gap into a measured one, and a list of
what people could not find is the only honest evidence of how good 300 terms actually are. A Suggestion is
personal data typed by a Person; it rides the existing `publish` Purpose and keeps the person link only as
long as needed to tell them it landed.

This gives the operator a **second review queue** alongside ADR-0010's Photo Review. Unlike that one it
**blocks nothing** — no Publication and no Offer waits on it.

## The rule that keeps proxies out

#5 bars any sensitive field *or proxy* from being searchable or filterable. Because the vocabulary is now
the entire filter set, **every term is a filter**, and the rule must be settled before authoring rather
than after — it is the sieve the seed passes through. ADR-0011 raises the stakes again by putting Skills
on the **public** tier, visible without an account.

> **A term names something you do, never something you are.**

With one tie-breaker for the hard cases: *could a person **without** the protected attribute plausibly
hold this?*

That test admits `lengua de señas` — hearing interpreters and CODAs hold it — and `intérprete de lengua
emberá`, which is a language like any other. It excludes `pastor` and `catequista`, which cannot be held
without the religion, and `líder sindical`, since art. 5 names union membership outright.

Case-by-case adjudication at authoring time was considered and rejected for two reasons. The Skill
Suggestion queue **abolishes "seed time"** — term-adding is continuous, and a rule that lives only in one
afternoon's judgement has nothing to say to the fiftieth suggestion next year. And Ley 1581 puts the
burden on the Responsable to *demonstrate* compliance: a written rule plus a term list is demonstrable,
"we used our judgement on each one" is not.

## Why we author rather than import

#19 named CNO. **CNO is no longer the referent.** Decreto 654 de 2021 and Resolución 771 de 2021 make the
**CUOC** (DANE) *"el referente único para la identificación y uso de las ocupaciones"*; SENA still
publishes CNO and DANE publishes CUOC, but the mandated one is CUOC. The SPE publishes no taxonomy of its
own — it uses CUOC.

That correction matters mostly because of licensing. **CUOC is open** — DANE authorises *"uso,
aprovechamiento, transformación y análisis"* with attribution. **CNO is not**: SENA's terms permit
download for personal, informative, non-commercial use and prohibit commercial use absent written
authorisation. *(Recorded honestly: the SENA clause sits on a JavaScript-rendered page the research could
not fetch directly; the wording comes from two agreeing extractions of that URL, not a verbatim read. It
does not change the outcome — we import no CNO content.)*

Neither Colombian classification carries a usable skills vocabulary. Their *habilidades/destrezas* layer
is **40 concepts shared across all 680 occupations** — `Comunicación asertiva`, `Trabajo en equipo` —
which as a matching key matches everyone. The real granularity lives in **funciones**, 7,319 of them, but
those are sentences rather than terms: *"Exhibir, pregonar, ofrecer y vender mercancías en calles, aceras,
vías, puerta a puerta o en eventos públicos."*

**ESCO fits the grain and misses the market.** 13,960 skills, 100% Spanish coverage, free commercial reuse
under 2011/833/EU, a working keyless API, and labels at exactly the right resolution — `vigilar a los
niños`, `ayudar a los niños con los deberes`. But it is European Spanish, and the gaps fall in our exact
economy: **`cocina casera` has no match at all**, gig food delivery has none, and `conductor de motocicleta
de reparto` is mail-and-parcel framed — *ensure the integrity of mail*, *differentiate types of packages*.
The ESCO Handbook uses the word "informal" **zero times in 73 pages**, and its stated scope is expressly
*"only the occupations that are relevant for the European labour market"*.

Importing 13,960 terms also fails on two counts of our own making: it is two orders of magnitude past the
flat 200–400 this design wants, it arrives structured **by occupation** (41.5 skills each) and so drags in
the tier we rejected, and the proxy rule above must be applied term by term — an afternoon over 300
authored terms, impossible over 13,960.

**Two imports we do take**, both from CUOC under DANE attribution:

- **The 14,462 *denominaciones*** become the Denomination layer. `Niñera`, `Aya`, `Empleada doméstica
  interna`, `Vendedor ambulante`, `Repartidor domicilios`, `Ayudante de albañilería` — real job titles in
  Colombian Spanish, openly licensed, which we would otherwise have had to invent.
- **The *funciones* as authoring prompts.** 7,319 sentences describing what Colombians are actually paid to
  do is the best available raw material for drafting the term list, even though none ships verbatim.

ESCO is **consulted and not copied** — a coverage checklist while authoring. Consulting incurs no
attribution and no share-alike exposure; copying labels invokes both, including the CC BY-SA component
behind its transversal skills.

**Target: ~250–350 terms in 12–15 Groups of roughly 20.** Against a cap of 20 a person selects about 5% —
enough to feel represented, few enough to browse. Below ~150 people will not find themselves and the
Suggestion queue floods on day one; above ~500 the proxy audit gets heavy and near-duplicates creep back
in, fragmenting the matching key.

## Identity, and what happens to a retired term

ADR-0003 already settled that `skills` rows carry no `public_id` and are identified by their **taxonomy
slug**. Two things it did not settle:

**The slug is ours.** Spanish, unaccented, kebab-case — `atencion-al-cliente`. Any CUOC or ESCO code rides
along as a nullable mapping column, never as the identity. Binding identity to an external standard turns
their renumbering into our migration across every Publication, and we will author terms no standard has.

*This is not a violation of ADR-0001 as amended by #21.* That amendment requires **routes** and
**identifiers in code** to be English, and it stands: the route is `/skills/atencion-al-cliente`, English
segment, Spanish slug. The slug is *seeded reference data* — the same category as a municipality being
named `PEREIRA` rather than translated. Making it English would mean authoring 300 translations no one
ever reads, in a product with no i18n, and would defeat the point of a stable opaque key. Under ADR-0011
these slugs become public URL segments on indexable skill pages, where Spanish is also the only thing that
could rank.

**A retired term is never deleted** — a `retired` flag plus an optional `superseded_by` pointer. Existing
links keep resolving, retired terms leave the picker but not history. Deleting would silently strip skills
from published profiles, which under the rules above means silently making people **less findable** — the
worst possible thing to fail at quietly.

This is not the soft delete ADR-0008 bans. `skills` is a seeded reference table, not an entity with a
Titular behind it; `retired` is vocabulary lifecycle, and ADR-0008's `RESTRICT` default would otherwise
make retiring any referenced term impossible.

## Location: three tiers over DIVIPOLA, and no Google

ADR-0002's model stands — a Publication carries a Municipality by DANE DIVIPOLA code plus a separate
remote flag. Matching widens in **three tiers: same municipality → same department → anywhere**, with
`remote` orthogonal to all three.

A real radius over centroids was rejected. Risaralda is mountainous, so road distance and straight-line
distance diverge badly and a radius is simply the wrong measure; it also hands a solo developer a
distance-tuning problem and a spatial dependency. The department tier gets the real commuting geography
for free — Risaralda has 14 municipalities and Pereira–Dosquebradas is functionally one labour market
inside it. The tiers also line up with ADR-0011's public boundary, which publishes department and withholds
exact municipality.

**Seed all 1,122 municipalities and 33 departments** from DANE's open data, not just Risaralda's 14: the
destination says hirers are "anyone, anywhere". Take the **centroids** while we are there — they ship in the
same dataset at no cost, and they keep a radius available later without touching a single Publication row.
Codes are stored as **text**: Antioquia's `05` becomes `5` as an integer.

**Google Places was evaluated for the municipality typeahead and rejected on four independent grounds:**

- **Cost.** After the March 2025 restructure, Autocomplete bills $2.83/1,000 beyond 10,000 free Essentials
  calls/month, and session tokens do not help — the first 12 requests of a session bill per-request and a
  municipality lookup never reaches 12. The whole remaining budget is gone somewhere around 1,200–2,000
  signups/month.
- **The ToS forbids the one thing we would need.** §3.2.3(a)(iii) prohibits copying and saving place
  **names**; caching is permitted only for `place_id` and, for 30 days, lat/lon. It could never populate a
  stored municipality.
- **No DIVIPOLA.** No Place Details field carries a national statistical code and no mapping is documented,
  so it cannot seed the list either.
- **Google is an independent controller, not an *encargado*.** Maps Platform contracts under
  Controller-Controller Data Protection Terms — there is no processor DPA, so it could never be a
  *contrato de transmisión* entry in the register `#21` requires.

A local typeahead over 1,122 seeded rows costs nothing, returns the DIVIPOLA code directly, needs no
attribution, transfers no personal data to anyone, and works offline. Against a closed list of known
values, Places adds nothing it is good at.

## Consequences

- **#10's and #19's steer on searchable free text is superseded.** #10 inherits: no full-text index on
  prose, so its `pg_trgm`/Spanish-configuration question narrows to typeahead over ~300 terms, ~14,462
  denominations and 1,122 municipalities — all small, closed, local lists.
- **#20 inherits** one matching key, the 20-skill cap, and the three location tiers.
- **#13 inherits a second operator queue**, the Skill Suggestion review, which blocks nothing.
- **`CONTEXT.md`** gains **Skill Group**, **Denomination**, **Self-description** and **Skill Suggestion**;
  **Skill** is rewritten.
- **Authoring the ~300 terms and running the proxy rule over them is execution, not decision** — it carries
  no open question and belongs to an implementation ticket.
