# Prototype — the first run (#35)

**Throwaway.** One self-contained HTML file. Double-click `index.html`, or:

```sh
open docs/design/first-run-prototype/index.html
```

No build, no server, no dependencies. Nothing here is production code, and none of the vocabulary in
it is the real vocabulary.

> Three variants of the first run — from _the credential is set_ to a published Publication —
> switchable via `?variant=`, each renderable for either role via `?role=`, plus three cross-cutting
> toggles (`?stop=`, `?photo=`, `?done=`) for the decisions #35 asks that are orthogonal to the shape
> of the funnel.

**Nothing here is decided.** This is the artifact to react to.

## The question

#35's own words: **what does a person see between creating an account and having a Publication worth
finding?** The ticket names a cliff the ADRs built without anyone designing it —

- **ADR-0009** spends a whole screen before the product has been seen: full name, date of birth,
  four consent boxes, _then_ pick a credential. Social login shortens nothing.
- **ADR-0016** makes the signed-in home the suggestions surface — which for a brand-new Person is
  computed from nothing.
- **ADR-0012** sets a minimum of 1 Skill, below which a Publication is unreachable and there is no
  signal that you are on the wrong side of the line.
- **#2** gives two publishable objects, and signup never asks which one you came for.

The picker itself is **not** the question — ADR-0023 settled it — so it is rendered here at low
fidelity: the search box, the chips, the meter with its floor tick, the near-empty states, and the
Denomination bundle. Enough to judge the flow around it, deliberately not enough to re-open it.

## The three variants

Flip with the arrows in the black bar, the `←`/`→` keys, or `?variant=A|B|C`. Changing the variant
**resets the flow**, because the variants disagree about where the flow starts.

| Key   | Name          | Shape            | The bet                                                                                                                               |
| ----- | ------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **A** | Directo       | Linear, no fork  | The audience is the supply side. Assume the worker, put the other door in a line of text, and spend nobody's first tap on a question. |
| **B** | Bifurcación   | Branching        | Asking is cheaper than guessing. A hirer funnelled through _"¿Qué sabes hacer?"_ is a worse failure than one extra tap for everyone.  |
| **C** | Sin asistente | No funnel at all | A wizard is a detour. Meet the real product immediately, learn where things live, and never see an empty screen.                      |

They disagree about more than layout:

- **Where the first screen's question comes from.** A asks what you can do. B asks why you are here.
  C asks nothing and shows you the page you are going to live on.
- **Whether an empty home is ever rendered.** In A and B the home is only reached after publishing,
  so the empty state ADR-0016 creates never appears in the first run — it is _dodged_, not solved.
  In C it is the entire design problem, met head-on: the picker sits in the home and the
  coincidencias fill in underneath as you choose, greyed and marked as an example until they are
  really yours.
- **What "one submit" means.** A and B have a Continue button per screen and a breadcrumb across the
  top. C has one button, disabled until it is honest to press.

### Variant A's honest hirer story is a link

Under the hero, A carries _"¿Vienes a contratar a alguien? Publica lo que necesitas."_ That is the
whole branch. Flipping `Role · hirer` on A shows what that person actually gets: a screen written for
somebody else, and one line of small text to rescue them. **That is the thing to judge about A**, not
its worker path, which is obviously fine.

## The role toggle — `?role=worker|hirer`

#30 handed the Need path here explicitly, and #35 already owned it as _"not the mirror image"_. The
toggle flips **every** variant to the hirer's first run rather than giving the hirer its own variant,
so the same funnel can be judged under both roles. What changes:

|                      | Worker (Capability Profile)         | Hirer (Need)                             |
| -------------------- | ----------------------------------- | ---------------------------------------- |
| Opening question     | _¿Qué sabes hacer?_                 | _¿Qué necesitas que te hagan?_           |
| Skill cap            | **20** (ADR-0012)                   | **5** (ADR-0016)                         |
| Near-empty note at 1 | _"en más búsquedas vas a aparecer"_ | _"mejores personas te vamos a mostrar"_  |
| Location question    | _¿Dónde estás?_                     | _¿Dónde es el trabajo?_                  |
| Free prose           | **not asked at all** — see below    | **asked** — _Cuenta qué hay que hacer_   |
| Photo                | offered                             | **never asked**                          |
| The home             | Needs that match your Skills        | People who hold the Skills you asked for |

## The toggles

Independent of the variant on purpose — _"where does the photo go"_ should not be smuggled in with
_"is there a fork"_.

### `?stop=` — can a person stop halfway, and what are they told?

ADR-0012's minimum of 1 makes _saved but unreachable_ a real state, and the ticket asks what it is
called in Spanish and how someone is brought back.

| Value   | Behaviour                                                                                                                                                                                                 |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `none`  | No exit. The flow has no save control and no dismiss; you leave by closing the tab and lose it.                                                                                                           |
| `draft` | An explicit **_Guardar y seguir después_**. The home then carries a card: _"Tu perfil está guardado, sin publicar. Nadie te puede encontrar mientras esté sin publicar."_ plus **_Terminar y publicar_**. |
| `auto`  | Nothing to press. A quiet line — _"Lo que escojas se guarda solo."_ — and the same card on the home.                                                                                                      |

The copy is written to **state a fact, never to nag**: it says what is true (nobody can find you) and
offers the one action that changes it. It never says _completa tu perfil_ and never counts what is
missing, which is the rule ADR-0023 set for the meter and which applies with more force here.

### `?photo=` — where the Photo sits

`never` (not in the first run at all — offered later from the profile) · `after` (once you are
already published) · `during` (before publishing).

The screen carries ADR-0010's three duties in plain Spanish — that a face is data the law protects
specially, that you are not obliged to give it, and what it is for — plus the fact nobody mentions
otherwise: **it is invisible for up to 3 days while it is reviewed, and nothing else waits for it.**

`during` is the one that reads worst on purpose: it puts the hardest, most personal ask in front of
the thing the person came to do.

### `?done=` — what "done" says

| Value     | The screen                                                                                                                                                                                   |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plain`   | _"Listo. Tu perfil ya está publicado."_ and what that means, once.                                                                                                                           |
| `wall`    | **_"Ya te pueden encontrar. Eso no es lo mismo que te encuentren."_** Then where you actually are — in search from now, on the Wall by rotation — and what you can do today without waiting. |
| `matches` | No confirmation screen at all. Publishing drops you straight into the coincidencias.                                                                                                         |

All three end on the same line: **_"Encuentra no consigue trabajo por nadie. Te pone donde te pueden
encontrar."_**

## What building it turned up

Four things that were not visible from the ticket, and that need answering whichever variant wins.

**1. The first run has to collect the Municipality, and nothing in the map says so.** ADR-0009's
signup form is full name, date of birth and four consent boxes — no location. `CONTEXT.md`: _"Every
Publication has one."_ ADR-0014 indexes on skill **and** place. So the municipality falls into this
flow by elimination, in every variant, and it is the only field here that is neither a Skill nor
optional. It is in all three as a step (A, B) or an inline block (C).

**2. The Self-description is the sharpest form of "not the mirror image".** It is _"never searched,
never filtered, and never an input to matching"_. For a worker it therefore buys **zero
findability** — it is the hardest possible ask on day one and it does nothing for the person making
it, so this prototype leaves it out of the worker's first run entirely. For a Need it is the thing a
worker reads before deciding whether to answer, so it is in. **Same field, opposite verdicts, and the
asymmetry falls out of the ADRs rather than out of taste.**

**3. Variant C cannot represent `stop=none`.** If the home _is_ the first run, there is no funnel to
be trapped in — you can always leave, and leaving is not abandonment. The toggle is only meaningful
for A and B. That is a real point in C's favour and it is invisible until you try to build it.

**4. Two UX laws point away from the product's own rules, and the prototype sides with the product.**
`ux-peak-end-finish-strong` wants the flow to end on a clear success state; `done=wall` deliberately
ends on a limit, because ADR-0011's Wall is a rotating sample and the map's standing rule is never to
imply the platform will find you work. `ux-zeigarnik-show-incomplete` wants an incomplete state shown
to drive completion; `stop=draft`'s card is the only place this product will do that, and it is
written as a fact with one action rather than as pressure. **Both are named rather than resolved
silently — disagree with either and the copy changes.**

## Positions this takes without being asked

Flag any of these that are wrong. They are choices, not defaults.

1. **The worker is never asked for prose in the first run.** See finding 2.
2. **The hirer is never asked for a Photo.** It belongs to the Person either way, but nothing in the
   hirer's first run is improved by it and ADR-0010's whole argument is about not asking casually.
3. **No Spanish copy ever agrees in gender with the reader.** Not _"ya estás publicada"_ but _"tu
   perfil ya está publicado"_. Gender is never collected, so the object takes the adjective.
4. **B's fork offers two doors and says you can do both**, rather than three doors with _"las dos
   cosas"_ as a first-class option. A third card would make the rarest case as loud as the two
   common ones.
5. **The Need's pay and conditions are not in the Need.** _"El pago y las condiciones no van aquí:
   los pones en la oferta que le mandas a alguien."_ ADR-0015 puts terms in the Offer; nothing says
   the Need may not restate them, and a Need that quotes a rate is closer to the _vacante_ that
   UAESPE Res. 129 art. 5 makes risky.
6. **The empty published home says _"No es que no sirvas"_.** It names the interpretation the person
   will reach for and refuses it. That is a deliberate act of voice, and it is the sort of line that
   is either exactly right or badly wrong.

## Voice

No voice guide exists for Encuentra, and writing one is past this map's destination. The sketch is
**#30's, reused verbatim** rather than re-derived — Everyman archetype, directness 5, warmth 4,
sophistication 1, `tú` (now the `CONTEXT.md` address rule), the verb belonging to the reader, and the
banned list: nothing implying the platform finds you work, no _completa tu perfil_, no bare
percentage, no _víctima_ / _damnificado_ / _ayuda_ about the person.

Two lines added to that banned list by this ticket:

- **Nothing that agrees in gender with the reader.** See position 3.
- **No "¡Felicitaciones!"** at the end of the flow. The person published a profile because they lost
  their income; the product's tone at that moment is _matter-of-fact and useful_, not celebratory.

## Accessibility

Inherited from #30 and held: a real `role="combobox"` with `aria-expanded` / `aria-controls`, arrow +
Enter + Escape over the listbox, one polite live region for every add, remove, result count, refusal
and publish, real `<input type="checkbox">`, 44px targets, a 2px `--color-brand-500` focus ring,
`text-wrap: balance` on headings and `pretty` on ledes, tabular figures on every counter, and
`prefers-reduced-motion` honoured.

**Not cleared, and unchanged from #30:** the result list is unvirtualised, there is no roving
tabindex, and **none of this has been through a screen reader**. ADR-0017 puts browser E2E out of v1,
so there is no automated guard either — the map already carries this as a named launch risk and this
prototype adds a second surface to it, not a second risk.

## How this was checked

The flow was walked **headlessly across all 162 combinations** of variant × role × stop × photo ×
done, plus the park path and variant C's fill-in behaviour: every combination reaches a published
home, no screen renders empty, no screen dead-ends without an enabled control, the caps come out 20
and 5, and the parked state both names itself and offers a way back. The harness is throwaway and
lives outside the repo.

**That is a check on the flow, not on the design.** It says nothing about whether any of this reads
well, looks right, or is usable by the person it is for — which is what the variants are for.

## Departures from the named skills

- **`/prototype`'s UI branch wants a route.** This is a single HTML file, for the same reason #30's
  was: `apps/web` is still the bare `create-turbo` scaffold, so sub-shape A has no host page and
  sub-shape B would mean standing up half the app. The repo already carries this convention twice
  over.
- **The switcher carries four toggles beyond the arrows**, as #30's did. Folding role, stop, photo
  and done into the variant axis would mean 54 variants against UI.md's cap of five.
- **`shadcn` was not loaded.** Still no `components.json`, and `@repo/design-system` does not exist
  on `dev` — though `feat/design-system-package` is in flight, so the next prototype may not get to
  say this.
- **`brand-voice` was not re-run.** It produces a full voice guide from an intake interview, which is
  its own effort and sits past this map's destination. #30's sketch is reused rather than a second
  one being invented, which is the point.
- **`frontend-design` was followed, not departed from.** Its own rule is that where a brief pins down
  the visual direction, the brief wins — and the map records `NEXTJS_HANDOFF.md`'s tokens as still
  binding. Its guidance on writing is applied throughout: a control names what happens, the action
  keeps its name across the flow (_Publicar mi perfil_ → _tu perfil ya está publicado_), and the
  empty screens are invitations to act rather than apologies.
- **`userinterface-wiki` bound four things**: 44px targets, eight seed chips as a 5–9 chunk,
  progressive disclosure (which is what variant C _is_), and tabular figures. It also produced the
  two conflicts in finding 4, which are recorded rather than obeyed.

## The fixture data is not the vocabulary

37 Skills in 8 Groups, 7 Denominations, 12 Municipalities, 6 Needs and 6 people — authored for this
file so the flow has something to move through. **It is not the seed**, it is a tenth the size of the
real vocabulary, and it exists to make screens judgeable, not to sample anything. The file throws on
load if a Denomination or a fixture points at a Skill that does not exist.
