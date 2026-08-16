# The skill picker is one search box, and the cap of 20 is a choice rather than a limit

ADR-0012 made the vocabulary the only searchable field, which makes the picker the screen where this
product either works for its audience or quietly excludes them: a person who cannot find themselves
in ~300 terms cannot be found by anyone else. #30 asked which gesture that screen leads with.

**Search-first.** One hero box — _"¿Qué sabes hacer?"_ — over Skills and Denominations in the same
result list. Browsing by Skill Group survives as a secondary path; the Denomination survives inside
search; neither is the opening move.

Decided against a prototype of all three, kept at
[`docs/design/skill-picker-prototype/`](../design/skill-picker-prototype/) on branch
`prototype/skill-picker`. Its fixture vocabulary — 256 terms in 14 Groups, 57 Denominations — is
sample data sized to ADR-0012's target so the alternatives could be judged at real density. It is
not the seed.

## Why not browse-first

Browsing 14 Group cards is the gentlest gesture on paper: recognition beats recall, and nobody has to
know the word. It loses on what a Group **is**.

ADR-0012 built Skill Groups as _"browsing scaffolding — a label on the flat list, never stored on a
Publication and never an input to anything"_, and was explicit that they are _"not the second level
the vocabulary deliberately lacks"_. Leading with them promotes that scaffolding to the structure of
the product. A person who meets _Cocina y alimentos_ · _Construcción y obra_ · _Cuidado de personas_
as the first screen reads them as **categories of person**, picks the one that matches the job they
lost, and never opens the other thirteen — which reconstitutes the occupation tier ADR-0012 rejected,
out of labels that were never supposed to mean anything.

The density is the second problem and the smaller one. At ~20 terms per Group the list is well past
the 5–9 chunking the UX guidance wants, so a Group is not one glance either; it is a scroll inside a
scroll.

## Why not Denomination-first

Denomination-first tested best on the thing the ticket worried about most — a person with low digital
literacy has a job title ready and often has nothing else. The prototype's version put a mandatory
full-screen edit after it (_"Quita lo que no hagas · Nadie hace todo lo de una lista"_), which does
answer #30's _starting point or shortcut_ question honestly.

It still loses, on one sentence: **it makes _"what were you employed as"_ the first question the
product asks.** ADR-0012 exists because _"a hotel receptionist can do many things she was never
employed to do"_, and because _"this product exists precisely because that job is gone"_. An edit
step downstream cannot undo the frame set by the first screen. The person has already been asked to
introduce themselves as their lost job, and the bundle they are then editing is that job's contents.

The escape hatch does not rescue it. The prototype's _"No tengo un oficio fijo — prefiero escoger
yo"_ works, but a first screen whose honest answer for many people is _"none of these"_ is a first
screen that sorts its audience into those who fit a title and those who do not.

## Why search-first wins

It is the only one of the three that asks the person to name **what they do**, in their own first
word, and lets everything else follow from that word. `cocinar`, `moto`, `aseo`, `mesero` all work
and all land in the same list.

That last one matters more than it looks: **the Denomination is still reachable, it is just not the
frame.** Typing `mesero` returns `Mesero · añade 6 habilidades` alongside the individual Skills. The
person who thinks in job titles gets the shortcut ADR-0012 designed; the person who thinks in tasks
never has to meet one. Search is the only gesture that serves both without asking anyone which they
are.

The known cost, stated plainly: **search demands you know a word.** The mitigations are that the
vocabulary is authored in Colombian Spanish rather than imported (ADR-0012), that Denominations
widen the entry points from ~300 to ~14,762, that an empty box shows eight common Skills as chips
rather than nothing, that _"Ver todas las categorías"_ is one tap away, and that a failed search is
the one place the Skill Suggestion is guaranteed to appear. A zero-result search is a measured event
under ADR-0014, so the cost is observable rather than assumed.

## The Denomination bundle adds to the tray, and the edit is invited

Tapping `Mesero · añade 6 habilidades` puts all six Skills in the tray and posts one note above them:
_"Añadimos 6 habilidades de mesero. Quita las que no hagas."_ The note clears as soon as anything
else is added by hand.

Two alternatives were rejected. Pushing into a full-screen review is a modal detour in the middle of
a search-first flow, and it re-imports the framing problem above at the one moment the person was
being efficient. Adding silently is the _"bundle accepted unedited"_ failure ADR-0012 names outright.

**This is weaker than a forced edit and the weakness is accepted.** Nothing compels the person to
prune. What replaces compulsion is that the edit surface is already on screen — the chips sit
directly under the note, each with its own ×, so removing one is a tap rather than a navigation. The
bet is that a bundle is at worst an over-broad Capability Profile, which ADR-0012 already priced when
it set the cap at 20 and accepted _"weaker signal"_ as the cost of asserting willingness rather than
experience. Where a forced step **is** justified is the Need, and that is #35's call, not this one.

## The cap of 20 is a choice, and it is silent until 15

Three treatments were built. **`choose` ships.**

|             | Behaviour                          | Verdict    |
| ----------- | ---------------------------------- | ---------- |
| `counter`   | `8 de 20` from the first selection | Rejected   |
| `hard-stop` | Nothing, then a refusal at 20      | Rejected   |
| `choose`    | Silent below 15, then a prompt     | **Chosen** |

Below 15 the picker says nothing about the cap, because most people will never reach it and a limit
you cannot hit is noise. From 15: _"Te quedan 5. Deja las que más quieras hacer, no todas las que
aceptarías."_ At 20: _"Estas son tus 20. Para añadir otra, quita la que menos te interese."_

This is the only treatment that carries ADR-0012's actual reasoning into the copy. The cap exists
because _"the rational move for someone desperate for income is to tick everything"_, and the
purpose of refusing that is to make someone state what they **want** to do rather than everything
they would accept. `counter` frames 20 as a quota from the first tap and quietly instructs people to
fill it — the exact behaviour the cap was built to prevent. `hard-stop` refuses without ever saying
why, which to this audience reads as the platform deciding they have claimed too much.

The number is not re-litigated here. ADR-0012 fixed it at 20 and noted the cap is asymmetric —
raising is one line, lowering means telling published people to delete skills.

## The Skill Suggestion is always visible

Not only after a failed search. It sits under the tray in the primary flow and at the foot of every
opened Group.

Behind a failed search it reads as an **error state**, and error states are where people leave. It
would also under-collect the one thing ADR-0012 wants from it: the queue is _"the only honest
evidence of how good 300 terms actually are"_, and someone who searches an approximate word, finds a
near-enough term and settles never fails a search at all — so the gap they felt is never recorded.

Two copy rules, and neither may be relaxed:

- **It may not promise the term will be added.** ADR-0006 makes `@repo/catalog` read-only at runtime,
  so nothing a person writes becomes a Skill. The receipt is _"Gracias. Lo leemos nosotros"_, never
  _"lo agregaremos"_.
- **It may not dead-end.** Sending a Suggestion and choosing an approximate Skill are not
  alternatives. The receipt is followed in the same breath by the three nearest existing Skills as
  chips, with _"así ya quedas visible hoy"_ — because a Publication with no Skill is unreachable
  today whatever we author next quarter.

It also states, unprompted, the two things ADR-0012 makes true and a person would otherwise assume
the opposite of: _"No entra a tu publicación y no se usa para buscarte."_

## The near-empty state, and a meter that names the floor

ADR-0012's minimum of 1 creates a cliff, so the picker says where it is:

- **0 Skills** — the continue action is disabled under _"Escoge al menos 1 para poder publicar tu
  perfil."_ Blocking is honest: below 1 there is nothing to publish that anyone could reach.
- **exactly 1** — one note: _"Con 1 ya puedes publicar. Entre más habilidades escojas, en más
  búsquedas vas a aparecer."_ It states a fact about reach, promises no work, and **does not
  escalate** — no repeat at 3, 5 or 10. Encouragement that returns is pressure, and this audience is
  the last one to apply it to.
- **2 and above** — silence.

There **is** a completion meter, and its shape is the whole decision. It is **not a percentage of
20**: a bar that fills toward 20 tells someone with four real skills they are 20% of a person, which
turns ADR-0012's versatility into a score and is the pressure #30 asks about. What ships is a bar
with **two marks** — the fill, and a tick on the track at **1** — under a legend that names both
ends: _"Con 1 ya puedes publicar · 20 es el máximo"_. The only number it calls sufficient is 1;
everything above reads as reach rather than debt.

This supersedes the shape `NEXTJS_HANDOFF.md` specifies for `CompletionMeter` / `ProfileCompletion`.
Progress may be shown; completeness may not be scored. It pairs with `choose`, which is silent until
15 — so the two never nag at once.

## UI copy addresses the reader as `tú`

Every string, everywhere: _"¿Qué sabes hacer?"_, _"Quita la que menos te interese"_, _"Cuéntanos qué
sabes hacer"_.

`usted` was tried first, on the reasonable ground that it is the Eje Cafetero default _between
friends and family_ and so reads as respect rather than distance. It was overruled: `tú` is what a
Colombian consumer product is expected to sound like, and the warmth it buys costs nothing in
dignity. `vos` was never a candidate — it is Paisa-marked, and the destination says hirers are
"anyone, anywhere".

Recorded here rather than in a voice guide, which is its own effort past this map's destination.
`CONTEXT.md` carries the rule.

## The Need picker is not decided here

`CONTEXT.md` makes a Need a Publication, ADR-0016 caps it at five Skills, and the prototype shows the
same picker works for one mechanically. That is all it shows.

The person publishing a Need has money and is usually thinking in job titles, which is the single
case where Denomination-first is obviously right — and also the case where ADR-0012 least wants a job
title framing the object, and the one UAESPE Res. 129 art. 5 makes risky (ADR-0011). Deciding it here
would be deciding it from the worker's screen. **#35 owns it**, having already named the Need path as
_"not the mirror image"_, and inherits the prototype's `?mode=need` as a sketch rather than an answer.

## Accessibility

The `NEXTJS_HANDOFF.md` bar binds: WCAG 2.2 AA, keyboard, live regions, no meaning by colour alone,
tested at 390/768/1024/1440. Choosing search-first concentrates the whole risk in one component, so
the requirements are stated rather than left to implementation:

- A real combobox per the WAI-ARIA Authoring Practices — `role="combobox"` with `aria-expanded`,
  `aria-controls` and `aria-activedescendant`; `↑`/`↓`/`Enter`/`Escape` over the listbox.
- **One** polite live region, announcing result counts, every add and remove with the running total,
  and every cap refusal. A refusal that is only visual is a silent failure for a screen-reader user.
- Real `<input type="checkbox">` wherever a list is checkable. Targets ≥ 40px. A 2px
  `--color-brand-500` focus ring. `prefers-reduced-motion` honoured, and no animation on keyboard
  navigation.
- The meter is decorative to assistive tech: it carries an `aria-label` naming the same two numbers
  its legend does, and it is never the only place the count appears.

**Not cleared, and named so it is not mistaken for done:** the result list is unvirtualised, the
Group accordion has no roving tabindex, and nothing has been through a real screen reader. ADR-0017
puts all browser end-to-end testing out of v1, so this component has no automated guard either. Treat
the prototype as a demonstrated pattern, not verified conformance.

## Consequences

- **ADR-0014's typeahead becomes the product's front door**, not a convenience. Its seeded
  `search_text` over ~300 Skills, ~14,462 Denominations and 1,122 municipalities is now on the path
  every new Person walks, which raises the cost of getting the seed-time normalisation wrong.
- **#35 inherits** the picker as the largest step inside the first run, the Need picker as an open
  question, and the `tú` rule for every screen it designs.
- **ADR-0012's Denomination and Skill Suggestion entries gain behaviour**: the bundle is added and
  edited in place, and the Suggestion is unconditional. `CONTEXT.md` is amended for both.
- **`NEXTJS_HANDOFF.md`'s `CompletionMeter` shape is superseded** — progress shown, completeness never
  scored.
- **ADR-0001 was amended in the course of this ticket** for a reason unrelated to the picker: a
  prototype's own controls are English, and only the copy inside the thing being prototyped is
  Spanish.
- **Authoring the ~300 terms and running ADR-0012's proxy rule over them remains an implementation
  ticket.** The prototype's 256 fixture terms are not it, and must not be seeded.
