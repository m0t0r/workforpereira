# Search is two surfaces with opposite authentication boundaries, over one flat key

ADR-0012 made the controlled vocabulary the entire index: with the Self-description shown and never
queried and the Photo shown and never queried, a Skill is the only thing anyone can search on. This ADR
decides what a search *is* — who may run one, what it accepts, what comes back and in what order.

Three of #10's original questions are already answered by inheritance and are recorded here only so that
nobody re-opens them: the proxy audit of the filter set is ADR-0012's *a term names something you do,
never something you are*; the free-text self-description is not searchable; and the 20-skill cap and the
three location tiers are fixed at the data layer.

**One thing #10 asked turns out not to be a question at all.** It framed the technical choice as
*"PostgreSQL full-text with a Spanish configuration and `unaccent` vs `pg_trgm` vs an external service"*.
With no prose to index, **none of the three appears in the search path**. `pg_trgm` and `unaccent` survive
only in the typeahead over three seeded reference tables, and even there `unaccent` never runs in a query.

## The authentication boundary is asymmetric, because the two objects are

ADR-0011 said search is authenticated — *"the first thing an account buys"*, in the session-required
column of its own fields table. **That is now half true, and the half that changes is the half that
matters most to the people this exists for.**

- **Searching Needs is public.** No account, no session.
- **Searching Capability Profiles requires a session.** Unchanged.

This is not a reversal of ADR-0011 so much as an application of its own governing principle further than
it went. That ADR built two Walls rather than one because *"the two objects invert each other's risk"*: a
Capability Profile is a person in economic distress advertising themselves, and a Need is a piece of work
authored by the side with money to spend. Under Ley 1581 the Profile is the dangerous object; under the
SPE regime the **Need** is. If the risk is asymmetric, the boundary should be too, and ADR-0011 drew it
symmetrically only because it was deciding about walls rather than about search.

**Why public Need search costs almost nothing.** A Need is barely personal data — it describes work. Its
author is a Person whose Public View ADR-0011 already made public, so nothing new about them is exposed.
And nobody is pre-selected for economic vulnerability by wanting something done, which is the precise
inference ADR-0011 identified as the real reach of art. 4(f). The residual risk is **SPE**: UAESPE Res.
000129 art. 5 defines *publicación de vacantes* as *"la difusión realizada por el prestador a través de
plataformas web"*, and ADR-0011 **already accepted that exposure** by putting Needs on a public wall.
Search over them is a marginal increase in an accepted risk, not a new one — a line for #23's brief, not a
new decision.

**Why Capability Profile search stays behind the session.** ADR-0011's reasoning is that *enumerability*
is the harm — *"twelve faces on a landing page and a paginated searchable index of every Person are
different objects under Ley 1581, and only the second is a target list."* A public skill search is a
**filtered** public index, which is strictly worse than the paginated one it refused: unauthenticated
`cuidado de niños` + `Risaralda` would return faces and full names of women in economic distress stating
willingness to enter strangers' homes, and *falsas ofertas de empleo* is the documented
trafficking-recruitment modality in Colombia. Art. 4(f) asks for access that is *técnicamente
controlable*; ADR-0011 holds that authentication is such a control and a crawler directive is not, so
removing the session removes the only one this design has.

**The obvious objection — that free self-service signup makes the wall weak — is true and is an argument
for bounding it, not for deleting it.** An account converts anonymous mass collection into attributable,
rate-limitable, suspendable collection, and ADR-0013's Suspension is a power that exists **only** if there
is an account to suspend.

**The funnel this produces is the ethically correct one.** The person who lost their income can look for
work with no account at all; the person who wants to browse faces has to create one and be accountable for
it. The previous arrangement had it exactly backwards.

## What a query is

**A query is a set of Skills, a place, and a remote toggle. Nothing else is accepted.**

**Skills are OR-ed, and the overlap count is the relevance signal.** A Publication holding at least one
selected Skill is a result; holding more ranks higher. `AND` was rejected: over a **flat** 300-term
vocabulary with no hierarchy there is no parent term to fall back on, so `atención al cliente` AND `manejo
de caja` silently drops the person who holds only the first — and ADR-0012 deliberately removed the tier
that would have rescued that. **A searcher may select at most 5 Skills**; past that the overlap score
stops discriminating and the query returns everyone.

**Location is a band, not a filter.** The searcher chooses a Municipality, a Department, or *anywhere*,
defaulting to their own **department** rather than their municipality — the destination says hirers are
"anyone, anywhere", and a hirer in Bogotá or Madrid hiring remote does not want their own municipality
imposed. Choosing Pereira orders Pereira first, then the rest of Risaralda, then everywhere; it never
returns nothing because Pereira happened to be empty. This is what makes the empty state a rare event
rather than the normal one.

**The remote toggle widens rather than filters.** ADR-0012 made `remote` orthogonal to the three tiers, so
*"also show people open to remote work"* adds them at their own band and excludes no local person.

**Typing `mesero` in the search box is the picker mechanism, unchanged.** A Denomination is a way *into*
the vocabulary and is never matched on (ADR-0012); typing one offers the Skills it implies and the
searcher edits. The query that actually runs still carries only Skill ids. No second concept.

## Ranking, and the three signals that are forbidden

**Results are banded by `(location tier, overlap count DESC)`, and randomised within each band** using a
seed derived from `(searcher, query, date)`.

The seed does four things at once: nobody is systematically first among equals; the order **rotates
daily**, so the tail is not permanently buried; it is stable within a day, so pagination never duplicates
or drops a row; and it is reproducible, so "why was I shown this?" is answerable. The explanation is one
sentence — *"3 of your 4 skills, in your municipality"*.

Three candidate signals are refused, each for a reason already on the record:

- **Photo presence.** ADR-0010 requires that a profile without a photograph *"must never render
  second-class"*, and ADR-0011 notes the contrast is most visible on a public surface. Ranking on it would
  do exactly what both forbid.
- **Anything experience-shaped.** ADR-0012 removed levels, years and has-done-this-before precisely so
  they could not become the thing hirers filter on.
- **Overlap *ratio*** (matched ÷ claimed) instead of absolute count. It looks fairer and produces
  ADR-0012's intolerable sentence: *"you ranked lower because you can do more things."*

**Also rejected: any liveness or last-active decay.** We do not record `last_active_at`; adding it creates
new behavioural personal data serving no consented *finalidad*, and **Pause** (ADR-0011) is already the
honest mechanism for "I am not here". Guessing at abandonment from behaviour would punish the person who
published once and cannot afford the data to keep coming back — which is the same population the fairness
clause exists to protect.

## Bounded, and honest about which bound does the work

**Three bounds.** A query must carry **at least one Skill** — there is no "show me everyone", which is
coherent because ADR-0012 already forces every Publication to carry at least one. Results are capped at
**200 (ten pages of twenty)**. And search is rate-limited.

**The result cap is not an enumeration control, and the ADR says so rather than letting a future reader
trust it.** Someone who wants the whole population does not page deep — they iterate ~300 Skills × 33
departments and take the top of each, reaching everyone many times over. Depth is the wrong axis;
**query volume** is the axis. What the cap is actually for is smaller and real: a query that needs page
eleven is a bad query best answered by helping refine it, and the cap bounds the one sort no index can
serve (below).

**The cap is only fair because of the rotation.** If a query matches 400 people and 200 are reachable,
200 people are invisible for it — and that is survivable solely because the visible 200 is a different 200
tomorrow. Rotation and the cap are load-bearing on each other; removing the rotation later turns the cap
into a permanent invisibility sentence on the tail, which is the exact failure #10 asked us to counter.

**The number is deliberately not enshrined.** ADR-0012 was careful that its 20-skill cap is *asymmetric* —
raising it is one line, lowering it means telling published people to delete skills. This cap is
**symmetric**: nothing is built on it and it moves either way for free. It ships at 200 and changes the
first time real data says otherwise.

**Two rate limiters, because the surface is split.** ADR-0013 insisted that auth limiting and safety
counters *"share a name and share nothing else"*; the public surface adds a third case with no Person to
key on.

| Surface | Mechanism | Why |
| --- | --- | --- |
| Public Need search | **Cloudflare edge** | No account to attribute to. Already stacked, $0 (ADR-0005), and it is the anti-scraping requirement ADR-0011 handed to #15 — now with a second named surface |
| Authenticated Profile search | **Durable per-Person counter** | Must be attributable and auditable to feed Suspension. ADR-0013's sense: a `SELECT count(*)`, never a cache |

## Postgres alone, and no second copy of anybody

**A plain btree on `publication_skills (skill_id, publication_id)` is the index.** A join table with that
index *is* an inverted index. Add a partial btree on `publications (kind, municipality_code) WHERE status
= 'published'`. That is the whole design.

**GIN over a denormalised `skill_ids` array was the alternative and is rejected.** It duplicates
`publication_skills`, which ADR-0006 makes an owned entity; `&&` yields overlap as a boolean where the
ranking needs the *count*; and at ≤20 elements per row a btree wins anyway. Two PG18 behaviours help,
both verified against the release notes: `OR`-clauses are transformed to arrays for index processing, and
btree **skip scan** lets multi-column indexes apply *"when there are no restrictions on the first or early
indexed columns"*.

**The seeded shuffle cannot be served by an index** — it is a per-row hash over the candidate set. This is
recorded as a known cost rather than discovered later. It is acceptable because the min-one-skill rule and
the result cap both bound that set, and it becomes a problem only at a scale this platform will not reach.

**An external search service is rejected, and the budget is the weakest of the three reasons.** The real
one is **ADR-0008**: erasure is *"one implementation with N adapters and no constraint bypass"*, and an
external index is an N+1 adapter sitting outside the database's constraint system, holding a second copy
of personal data that no foreign key can keep honest. Second, it is a new processor requiring a *contrato
de transmisión* in the register #21 established. Third — and only third — #18's real remaining budget is
$4.46–$7.46/month.

**The typeahead normalises at seed time, so `unaccent` never runs in a query.** Colombians type
`atencion` and `nino`. The reflex is `unaccent()` in the predicate over a `pg_trgm` GIN index, but all
three searchable lists — ~300 Skills, ~14,462 Denominations, 1,122 Municipalities — are **seeded and
read-only at runtime** (ADR-0006's `@repo/catalog`). So each carries a precomputed `search_text` column,
lowercased and unaccented **by the seed, in application code**, with a `pg_trgm` GIN index on it for typo
tolerance. The extension never appears in a query and never needs an immutable wrapper for an expression
index.

**Skills and Municipalities ship to the client as static JSON.** Tens of kilobytes, cacheable
indefinitely, and the picker becomes instant on a bad mobile connection — which for this audience matters
more than any index. Only the 14,462 Denominations stay a server round-trip. This is the single biggest
thing this ADR hands to **#30**.

## Who is absent from results

**Only active Publications of active Persons.** Paused and suspended Persons are absent (ADR-0011,
ADR-0013), as are draft, unpublished and suppressed Publications.

**A Block hides both parties from each other in search, in both directions.** ADR-0013 says a Block
removes both from *"each other's matching and suggestions"* and does not name search; read literally, a
blocked Person could still find their target and merely be unable to send an Offer, which is not what
anyone blocking someone believes they bought. **This ADR amends ADR-0013** to cover search rather than
quietly interpreting it.

**Absence is indistinguishable from "nobody here holds that skill".** No "1 result hidden", no adjusted
counts — for the same reason ADR-0011 makes every absent profile 404 rather than 403: the negative space
is itself a disclosure.

## What we deliberately do not build

**No facet counts, on privacy grounds rather than cost.** #10 asked whether counts are cheap enough to
compute per query; cheapness is the wrong axis. *"Cuidado de niños · Pereira (47)"* is a **census of
vulnerable people**, handed to whoever asks without their even paging through the results — the
population-size leak this ADR and ADR-0011 are both built against. Banding rather than filtering also
removes the thing a count would qualify.

**No per-search log.** Who searched for what is the searcher's own personal data, serves no consented
*finalidad*, and repeats reasoning ADR-0011 already accepted in declining a profile-view log. #13's
abuse-investigation need stays in the fog where ADR-0011 left it.

**One anonymous counter is kept**: zero-result `(skill, location tier)` pairs, with **no Person link**.
That is the second half of ADR-0012's *"only honest measure of how good 300 terms actually are"*,
alongside the Skill Suggestion queue, and it points at nobody, satisfying #18's rule that analytics never
touch personal data.

## The empty state

Because location bands rather than filters, a query carrying at least one Skill returns nothing only when
**nobody anywhere** holds that Skill. When it happens, three concrete steps and never a blank page: other
Skills in the same **Skill Group**; *publish a Need so people come to you*; and a **Skill Suggestion** if
the term could not be found at all, which routes the failure into ADR-0012's queue instead of losing it.

ADR-0012 says a Skill Group is *"never an input to matching"*. Suggest-on-empty is **navigation, not
matching** — it changes what we offer to click, never what ranks or who is returned — but it is close
enough to that line to be stated out loud rather than assumed.

## Where it lives, and what it is called

**`@repo/matching`**, whose ADR-0006 charter widens from *"Suggestions"* to *search and suggestions*. The
name stands: the whole point of ADR-0012's flat vocabulary is that pull and push run on the same key, and
a second package would duplicate it.

`@repo/publications` (tier 4) was the alternative and inverts the DAG, since it would then need `safety`
(tier 6) for Blocks. `matching` is itself tier 6 and does not depend on `safety` either — it **reads
`blocks` directly from `@repo/db`**, which ADR-0006 pre-authorises by name: *"cross-module reads are fine
and often wanted; `matching` and search (issues #10, #20) need them."*

**Routes**, English per ADR-0001 as amended by #21: `/search/work` (public) and `/search/people`
(authenticated). *Work* rather than *needs* because the public one is what a person looking for income
clicks. `/skills/atencion-al-cliente` remains ADR-0012's authored, indexable page.

**Results pages are `noindex`.** A results page is a query, not content, and indexing
`?skill=cocina-casera&dept=risaralda` would make our *difusión de vacantes* maximally visible — the exact
activity #23 could find no carve-out for. Licensed under ADR-0011's standing rule as a **distribution**
control and never a privacy one, which is honest here because the underlying Needs are public by design.
The authored skill and municipality pages stay indexable and remain the surface that ranks.

## What a public Need shows

Public Need search is new here, and ADR-0011 settled the public tier for a **Person**, not for a Need. A
public Need card shows **the work, not the author**: Skills, department, remote-or-local, Commitment, Work
Setting, and the Self-description as prose — shown, never queried. The author appears as **name only**,
linking to their existing Public View, with **no photo on the Need card**, which keeps ADR-0011's photo
consent doing one job in one place.

This overlaps **#12** and is recorded as a constraint #12 inherits, not as a presentation decision made
here.

## Consequences

- **ADR-0011 amended.** Its fields table and its consequence *"#10 inherits that search is
  authenticated-only"* are now true of Capability Profiles only. Public Need search is added to the
  surfaces #15's edge rate limiting must defend.
- **ADR-0013 amended.** A Block reaches search, not only matching and suggestions.
- **ADR-0006 amended.** `@repo/matching`'s one-line charter widens to search and suggestions.
- **`CONTEXT.md`** gains **Search**, **Skill Overlap** and **Result Band**; **Wall** is amended, because
  its sentence *"searching by skill is the first thing an account buys"* is no longer true of Needs.
- **#30 inherits** client-side static Skill and Municipality lists, and the seed-time normalisation that
  makes the picker instant offline.
- **#20 inherits** the same package, the same flat key, and the banding-plus-rotation pattern as a
  precedent for its own explainability requirement.
- **#12 inherits** the public Need card contents and the no-photo-on-a-Need rule.
- **#15 inherits** two rate limiters that must not be unified, and the edge one as a launch requirement.
- **#23's brief gains one line**: public Need search is *difusión* under Res. 129 art. 5, marginal to an
  exposure ADR-0011 already accepted.
- **Postgres 18 is the target version**, recorded here because no ADR states one — ADR-0004 pins the host,
  plan and region and names no version. **#17** must match it in docker compose; **#16** must check that
  PGlite has a Postgres 18 build before assuming parity, or record the divergence. Two PG18 facts are
  load-bearing above (skip scan, `OR`→array) and one is a migration caveat for #15: PG18 reads full-text
  and `pg_trgm` dictionaries via the cluster's default collation provider rather than always libc, and
  recommends reindexing those indexes after a `pg_upgrade`.
- **PostGIS is unavailable on PlanetScale** — five extensions listed as temporarily disabled. ADR-0012
  rejected radius search on domain grounds; it was not available either way, and the seeded centroids stay
  unused.
