# A public Need names the place, and in one Work Setting it stops naming the person

Every publicly searchable Need shows its **exact Municipality**. Where the Work Setting is
`hirer_home`, the **author's name and the link to their Public View wait for a session**, and the
public card is the work and nothing else.

ADR-0025 left this open deliberately and handed it to **#10**, which had already closed — so the
question had no owner and no screen was allowed to claim either answer. This ADR is that owner. It
closes the question in both directions at once: ADR-0011's fields table keeps its meaning untouched,
because it is a table about a **Person**, and a Need's place becomes public because withholding it was
never a control in the first place.

## The card was never the control, so the card was never the decision

ADR-0025 framed this as _"does a publicly searchable Need expose its exact Municipality"_, and #12
answered it as a field list — department, following ADR-0014's `What a public Need shows`. The field
list is downstream of something nobody looked at.

ADR-0014's `What a query is` governs **both** search surfaces, and public Need search is one of them. A
query accepts _"a Municipality, a Department, or anywhere"_; results are **banded** by location tier;
and the explanation is _"3 of your 4 skills, in your municipality"_. So an unauthenticated visitor
learns a Need's municipality by choosing one and reading which band the Need lands in — over a space of
1,122 Municipalities that a department narrows to a handful. The exact Municipality of every public
Need has been exposed since ADR-0014, by the search surface, whatever the card printed.

ADR-0011 set the standing rule that settles this: **no privacy argument may rest on something that is
not a technically controllable access control.** A card that declines to print a value the same page
discloses by band membership is the same species of fig leaf as `robots.txt`. Rendering the
Municipality is therefore not a loosening — it is the card catching up with the query, and it is
recorded here so that nobody re-derives the field list in isolation a third time.

**Query granularity is unchanged and stays uniform for all Needs.** That is a property of this
decision worth naming, because the alternative did not have it (below).

## `hirer_home` is the only Work Setting where the two municipalities are one value

ADR-0025 made the load-bearing observation without drawing the conclusion: the Municipality is _"the
same column, a different owner"_ — asked as _¿Dónde estás?_ for a Capability Profile and _¿Dónde es el
trabajo?_ for a Need.

Follow that through the five Work Settings ADR-0013 fixed. For `remote`, `worker_home`,
`business_premises` and `public_or_varied`, a Need's Municipality is **where work happens** and says
nothing whatever about where its author lives. ADR-0011 has no claim on it, because ADR-0011 is about a
Person's own location. For `hirer_home` the two collapse: the place the work happens **is** the
author's home municipality, which ADR-0011 withholds from a public tier by a flat rule.

So the rule differs by Work Setting, and it differs for a derived reason rather than a felt one. Not
_"`hirer_home` is the frightening one"_ — though ADR-0013 already triages it first — but _"`hirer_home`
is the only setting in which publishing a Need's place also publishes a Person's place."_ Everything
else follows from that sentence.

**This is Work Setting's third job, not new machinery.** ADR-0013 gave it two — it selects the safety
guidance at a Contact Exchange, and it raises a Report's place in the queue. A field that already
discriminates twice discriminating a third time is cheaper than any new field would be, and ADR-0013's
warning still binds: **the copy attached to it must never drift into implying the platform vets home
visits.** Nothing below claims a `hirer_home` Need is checked.

## The side channel is closed, and it is not closed with copy

A Person in economic distress has their exact Municipality withheld from their Public View by an
ADR-0011 rule with **no control attached** — not a default, not a setting, a rule. If they then publish
_"somebody fix my roof, at my house in Dosquebradas"_, a `hirer_home` Need would publish that same
field about that same person on a surface with no session gate.

The tempting answer was to make it an informed choice: say the consequence out loud at collection —
ADR-0025's own pattern — and let the person decide. **It is refused.** A flat rule that a second object
routes around is not a rule, and consent that arrives through a field label is the weakest kind
available: someone answering _¿Dónde es el trabajo?_ is answering a logistics question, not making a
privacy decision. ADR-0011 chose a rule over a control on purpose for a population it identified as
pre-selected for economic vulnerability, and a Need is not a place to reopen that choice by accident.

So the field is held back regardless of which object would publish it — and because the query stays
uniform, what is held back is not the place.

## The author gives way, not the place

Two ways to keep the rule intact, and the choice between them is the substance of this ADR.

**Rejected — coarsen the place.** Public `hirer_home` Needs band and render at department; the exact
Municipality waits for a session. The name stays public and ADR-0011 stays literal.

**Chosen — withhold the author.** Public `hirer_home` Needs carry the exact Municipality like every
other Need; the author's name and the link to their Public View wait for a session.

Four reasons, each of them already on the record rather than invented here:

1. **ADR-0026 has already emptied the name of value.** _"Signing in buys more fields about the same
   unvetted stranger"_, there is no badge to earn, and the Need card carries no trust text either way.
   A full name attached to an unvetted stranger buys a reader nothing, so removing it costs far less
   than its prominence suggests.
2. **ADR-0011's reason for making the full name public does not transfer to a Need.** It kept the name
   because _"a profile is meant to be shared: the act this design most wants to enable is a neighbour
   posting 'hire her' into a Facebook group, and 'María C.' undercuts it."_ That argument is about a
   Capability Profile. Nobody shares _"hire this household."_
3. **It is the faithful reading of ADR-0014's own sentence** — _"a public Need card shows the work, not
   the author."_ Coarsening the place publishes the author in full and degrades the work; this
   finishes the thought ADR-0014 started and stopped one field short of.
4. **It is less machinery, in the cheaper layer.** Coarsening the place needs a per-Work-Setting branch
   in the **public search path** — a different band for one setting and a different explanation
   sentence — which is the one place ADR-0016 established that per-row work is already the scaling
   problem. Withholding the author needs a branch in **one projection**, and leaves the query identical
   for every Need.

And the cost the chosen option pays is the cost this platform can least afford under the other one.
The public Need surface exists because, in ADR-0014's words, _"the person who lost their income can
look for work with no account at all"_ — the funnel it called the ethically correct one. `hirer_home`
is plausibly the largest category of Need here: cleaning, cooking, childcare, elder care, gardening,
repairs. Coarsening exactly that category to _Risaralda_ removes the single fact that tells a worker
with no income whether they can afford the bus, from exactly the people the surface was built for.

**A third option, refused and recorded so it stays refused:** making `hirer_home` Needs findable only
with a session. It puts the largest category of work behind the gate the public surface exists to
remove.

## What the public `hirer_home` card shows instead of a name

**Nothing, and no placeholder.** No _Anónimo_, no _Un vecino de Pereira_, no initials, no disc. The
card has no author line and re-flows without one — the same reasoning ADR-0026 used to refuse a
photo-shaped hole, arriving at the same answer for a different reason: here a placeholder does not
penalise anyone, it invents an identity to fill a gap, and a stand-in word like _Anónimo_ reads as
evasion on a card that deliberately carries no trust signal.

One sentence names the missing field, in the pattern ADR-0026 already set for the Public View:

> Con una cuenta ves quién lo publicó.

It names a field and stops. ADR-0026's second sentence — _"No ves nada más sobre si es de fiar"_ — is
**not** repeated here: ADR-0026 ruled the Need card carries no trust text, and repeating that line on
every `hirer_home` card is exactly the wallpaper ADR-0013 refused.

## The projection drops the name, never the component

The name is omitted by the **public Need projection** — one exported function, living with search in
`@repo/matching` (which ADR-0014 widened to search and suggestions, and which the Wall reads the same
rows through) — and never by the card component.

This is a testability decision, not a layering preference. ADR-0017 admits exactly two seams, and a
React component is not one of them; a rule that lives in JSX is guarded by prose alone. A rule that
lives in a module function exported from a `@repo/*` package's `index.ts` is guarded by an **Invariant
Test** naming this ADR — _a public projection of a `hirer_home` Need contains no author name and no
`public_id`_ — which is the difference between a decision that holds and a decision that held once.

The map's fog records three surfaces guarded by prose alone because ADR-0017 cannot reach them. This
one deliberately does not join them.

## De-identified by default, never de-identified as a guarantee

ADR-0014 puts the **Self-description on the public Need card as prose** — _"shown, never queried"_ —
and ADR-0025 makes it the screen that publishes a Need. Nothing sanitises it, so _"es en mi casa en el
barrio Cuba, pregunten por Marta"_ undoes everything above, in the author's own words.

The prose stays. A `hirer_home` card with no name **and** no description is skills-plus-a-place, which
is not enough for anyone to decide whether to answer — the field rule would be protecting a surface it
had already destroyed. Instead this ADR takes the honesty ADR-0011 used for scraping (_"we cannot
retrieve what a third party already took"_) and applies it here: **the rule is a default, not a
guarantee**, and it is written down as one so that no _política_, no screen and no future ADR upgrades
it into a promise.

What that buys is a real requirement rather than a false assurance. ADR-0025's description screen
already says what does not go in the box — _"El pago y las condiciones no van aquí"_ — and for
`hirer_home` it gains a second line:

> No pongas tu dirección ni tu nombre aquí: eso se intercambia al aceptar una oferta.

Only for `hirer_home`. On the other four settings there is nothing to protect and the sentence would be
wallpaper.

## The first run can now say the thing it was forbidden to say

ADR-0025's _dónde_ screen carries one sentence for a worker, because _"a person would otherwise assume
the opposite"_: _"En tu perfil público solo se ve el departamento, nunca el municipio."_ Its Need
counterpart was left blank on purpose, pending this decision. It is now:

> Como el trabajo es en tu casa, en la búsqueda pública no mostramos tu nombre. El municipio sí se ve.

**For `hirer_home` only.** The four other settings get no sentence at all — nobody typing an answer to
_¿Dónde es el trabajo?_ assumes the place is private, and a visibility notice on every Need screen is
the undifferentiated copy ADR-0013 refused, which is not read on the one occasion it matters. Where
copy is differentiated by Work Setting the differentiation is the point.

## Work Setting has to be collected before a Need is published, and it is not

Applying any of the above needs a Work Setting at publish time, and ADR-0025's first run never asks for
one. Its Need path is **fork → skills → dónde → descripción**, and `The Need path is not the mirror
image` lists no Work Setting on any screen — so a Need published in the first run has none, ADR-0013's
queue priority has nothing to read, and the sentence above has no condition to test.

**Work Setting joins the _dónde_ screen**, beside the Municipality and the remote checkbox. Three
reasons and no sixth screen, which ADR-0025 was right to count as a cost:

- It is **the same question**. `CONTEXT.md` calls it _lugar de trabajo_ and _dónde_ already asks
  _¿Dónde es el trabajo?_ — the Municipality is which place, the Work Setting is what kind of place.
- The visibility sentence **cannot be written anywhere else**, because it belongs on the screen that
  collects the Municipality and cannot be composed until the Work Setting is known.
- The remote flag is already there, and `remote` is one of the five Work Setting values — leaving them
  on separate screens invites two answers that contradict each other.

**`Commitment` is the same gap and is not closed here.** ADR-0026 lists it on the public Need card and
no ADR collects it either. Named so that it is discovered on purpose rather than by a blank card, and
left to whoever owns Need composition beyond the first run — which is also unowned.

> **Both halves closed by ADR-0033.** `Commitment` is three values saying whether the work ends —
> collected on ADR-0025's _descripción_ screen, and carrying no hours and no dates for the same
> Res. 000129 art. 5 reason this ADR's neighbour keeps pay off a Need. Need composition beyond the
> first run is **one screen**, which also owns editing, and the `hirer_home` flip it creates needs no
> machinery because this ADR already put that branch in the read-time projection.

## Authored Municipality pages are prose and a link, and list no Publications

ADR-0014 asserts that _"the authored skill and municipality pages stay indexable and remain the surface
that ranks"_, but only `/skills/<slug>` was ever specified — by ADR-0012. A Municipality page has been
referred to twice and defined nowhere, which makes it an **indexable public surface keyed to
Municipality with no owner**, and Municipality-keyed enumeration is precisely what everything above is
about.

It is closed in one line: an authored Municipality page is **authored prose and a link into the
search**. It lists no Needs and no Capability Profiles.

Listing live Needs would build a paginated, indexable, Municipality-keyed index of Needs — strictly
worse than the results page ADR-0014 was careful to mark `noindex`, and it would make the _difusión de
vacantes_ exposure under UAESPE Res. 000129 art. 5 maximally visible, which is the exact thing ADR-0014
declined to do. It would also rank on nothing it does not already rank on: ADR-0012's skill pages rank
on their authored text.

A bounded rotating sample was the other candidate — a third Wall — and `CONTEXT.md` answers it: there
are two Walls _"because the two kinds of Publication carry opposite risks"_. A Municipality Wall is
sliced on the wrong axis. Cheap to close now, expensive if someone builds it later believing ADR-0014
licensed it.

## Consequences

- **ADR-0011 amended, in scope rather than in substance.** Its fields table is a **Person's** tiers and
  every row still holds. Added: a Need's Municipality is public, because for four Work Settings it is
  not the author's location at all, and for `hirer_home` — where it is — the author's name leaves the
  public tier instead. Its consequence _"#12 inherits the wall itself"_ now carries a per-Work-Setting
  branch. Its standing rule about controllable access is load-bearing here, not merely cited.
- **ADR-0014 amended in three places.** `What a public Need shows` gains the **exact Municipality**;
  _"the author appears as name only, linking to their existing Public View"_ is now true of four Work
  Settings and false of `hirer_home`; and the Municipality page it asserted is defined above as prose
  that lists nothing. Its query, bands and explanation sentence are **unchanged for every Need**.
- **ADR-0025's open question is discharged**, its consequence _"#10 owns whether a publicly searchable
  Need exposes its exact Municipality"_ is closed by this ADR, and its _dónde_ screen gains the Work
  Setting control plus one conditional sentence. Its description screen gains a second conditional
  line. The five-screen count is unchanged.
- **ADR-0013 amended.** Work Setting acquires a third job — it now also decides what a public Need card
  discloses about its author — and its warning against implying vetting binds the new copy.
- **ADR-0026 amended.** _"The public Need card is ADR-0014's, unchanged"_ is no longer true for
  `hirer_home`. Its no-trust-text rule, its no-placeholder reasoning and its Public View sentence
  pattern are all reused rather than displaced.
- **ADR-0017 gains an Invariant Test** — the public Need projection contains no author name for a
  `hirer_home` Need — reachable because the rule was placed at a module-function seam on purpose.
- **`CONTEXT.md`** — **Municipality** gains what a Need's Municipality means and that it is public;
  **Capability Profile** and **Photo** are corrected, because both currently say the Municipality
  belongs to the `Person` while **Publication** says it belongs to the Publication, and this decision
  depends on the second being right; **Work Setting** gains the third job; **Public View** is untouched.
- **Whoever builds the Need card inherits** one branch and the rule that the branch lives in the
  projection.
- ~~**Need composition beyond the first run has no owner**, and now has two fields waiting for one —
  Work Setting and Commitment.~~ **Owned by ADR-0033**, which collects `Commitment`, composes and
  edits a Need on one screen, and inherits this ADR's two conditional `hirer_home` sentences onto it.
