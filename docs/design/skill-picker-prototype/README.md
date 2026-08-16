# Prototype — the skill picker (#30)

**Throwaway.** One self-contained HTML file. Double-click `index.html`, or:

```sh
open docs/design/skill-picker-prototype/index.html
```

No build, no server, no dependencies. Nothing here is production code, and none of the vocabulary
in it is the real vocabulary.

> Three variants of the skill picker, switchable via `?variant=`, plus three cross-cutting toggles
> (`?cap=`, `?mode=`, `?sug=`) for the decisions #30 asks that are orthogonal to the primary gesture.

## Verdict so far

**Variant A (search-first) wins the primary gesture, and the Skill Suggestion is `always`.** Those
two are settled; `?cap=`, `?mode=` and the Denomination question are still open, so all three
variants and every toggle are still here to flip through. The defaults on load are the two decided
values — `?variant=A&sug=always`.

## Language

**The prototype's controls are English. Only the copy inside the picker is Spanish.**

The black bar, its labels and values (`Publication · profile | need`, `Cap · counter | hard stop |
choose`, `Suggestion · after search | always`, `Reset`), the banner, the state readout and the
search-param values are all instrumentation — they get deleted when this prototype is captured, so
no string in them will ever reach a user. Everything the picker itself says is Spanish, because that
is the design under review.

This is ADR-0001 as amended by #30; the reasoning lives there, not here. The trap it closes is that
Spanish chrome grows Spanish state keys behind it (`state.cap === "elegir"`), which is the
two-language codebase ADR-0001 exists to prevent, arriving through a file nobody thought counted.

## The question

#19 (ADR-0012) settled the vocabulary: ~300 flat Skills in 12–15 Groups, max 20 per Publication and
minimum 1, ~14,462 Denominations as the way in, a Skill Suggestion capture for the gaps. #30 asks
what a person actually meets — and the ticket's own framing is that these are **different products**
for someone with low digital literacy:

- search demands you know the word,
- browsing demands patience through 300 items,
- Denomination-first demands you identify with a job title, which is exactly the framing ADR-0012
  spent a whole ticket escaping.

## The three variants

Flip with the arrows in the black bar, the `←`/`→` keys, or `?variant=A|B|C`.

| Key   | Name     | Primary gesture                                                                    | What it bets on                                                                                                                                         |
| ----- | -------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** | Buscar   | A hero search box over Skills **and** Denominations in one list                    | That people can name what they do, and that a Denomination row (`Mesero · añade 6 habilidades`) is a shortcut inside search rather than a separate mode |
| **B** | Explorar | 14 Group cards, tap to expand into checkboxes                                      | That recognition beats recall, and that Groups make 256 items browsable in ~20-item chunks                                                              |
| **C** | Oficio   | _"¿En qué ha trabajado antes?"_ → up to 3 job titles → a **mandatory** edit screen | That the job title is the only word people reliably have — and that a full-screen edit step is what keeps it a starting point rather than a shortcut    |

They deliberately disagree about more than layout:

- **Where the tray lives.** A puts selected chips inline under the search; B relies on a sticky
  counter bar because browsing scrolls; in C the tray _is_ the second screen.
- **Where Denominations appear.** A mixes them into the result list, B hides them entirely (search
  only), C makes them the entire first step.
- **Whether the Suggestion is a fallback or a fixture.** See `?sug=` below.

### Variant C answers the ticket's "starting point or shortcut" question in the affirmative

Step 2 is a full screen with the bundle pre-ticked, headed _"Quite lo que no haga"_ and subtitled
_"Nadie hace todo lo de una lista."_ There is no way to accept a bundle without seeing it item by
item. The alternative — a confirm dialog — is what would reproduce the occupation model through the
back door. **This is a design position, not a neutral rendering; disagree with it if it feels
paternalistic.**

Also in C: **"No tengo un oficio fijo — prefiero escoger yo"** drops you into variant B. A
Denomination-first product that dead-ends people who don't identify with a title is worse than
either of the others.

## The toggles

These are the cross-cutting decisions #30 lists. They are independent of the variant on purpose —
the answer to "how do we communicate the cap" shouldn't be smuggled in with the answer to "search or
browse".

### `?cap=` — how the cap of 20 is communicated

| Value       | Behaviour                                                                                                                                                                                            |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `counter`   | `8 de 20` always visible. At 20: _"Llegó a 20. Quite una para añadir otra."_                                                                                                                         |
| `hard-stop` | **No counter at all** until you hit the wall, then a refusal: _"No puede añadir más de 20."_ Checkboxes go disabled.                                                                                 |
| `choose`    | From 15 on, the counter becomes a prompt: _"Le quedan 5. Deje las que más quiera hacer, no todas las que aceptaría."_ At 20: _"Estas son sus 20. Para añadir otra, quite la que menos le interese."_ |

ADR-0012's reasoning was that the cap makes someone state what they _want_ to do rather than
everything they would accept out of desperation. `choose` is the only one of the three that carries
that reasoning into the copy; `hard-stop` is the version that loses it. `counter` is the neutral default
most products ship.

### `?mode=` — does a Need use the same picker?

`profile` (cap 20) vs `need` (cap **5** — ADR-0016 lowered the Need's cap and gave it
ADR-0014's reason verbatim). The same three variants render in both. What changes:

- The headline: _"¿Qué sabe hacer?"_ → _"¿Qué necesita que le hagan?"_, and in C
  _"¿En qué ha trabajado antes?"_ → _"¿A quién necesita?"_
- The tray heading: _Lo que sabe hacer_ → _Lo que necesita_
- The lede stops promising findability and starts promising match quality:
  _"Entre más puntual sea, mejores personas le vamos a mostrar."_

**The thing to judge is whether variant C survives the flip.** The person publishing a Need has money
and is usually thinking in job titles — which is the one case where Denomination-first is obviously
right, and also the case where ADR-0012 least wants a job title stored. Nothing is stored either way
(a Denomination is never persisted), but the _framing_ differs, and it is the Need that UAESPE
Res. 129 art. 5 makes risky.

### `?sug=` — where the Skill Suggestion appears

| Value          | Behaviour                                                                     |
| -------------- | ----------------------------------------------------------------------------- |
| `after-search` | Only after a search returns nothing.                                          |
| `always`       | Always present — in A under the tray, in B at the foot of every opened Group. |

Both share the copy, which is written to a hard rule: **it may not promise the term will be added,
and it may not dead-end.** So the receipt is _"Gracias. Lo leemos nosotros"_ — never _"lo
agregaremos"_ — followed immediately by the three nearest existing Skills as chips, with
_"así ya queda visible hoy"_. Sending a Suggestion and choosing an approximate Skill are not
alternatives; the UI does both in one breath.

It also states the two things ADR-0012 makes true and a person would otherwise assume otherwise:
_"No entra a su publicación y no se usa para buscarlo."_

## The near-empty state

Live in every variant, driven by the real selection count:

- **0 selected** — dashed box: _"Escoja al menos 1 para poder publicar su perfil."_ The CTA is
  disabled. This is the cliff ADR-0012's minimum-of-1 creates, stated plainly.
- **exactly 1** — green-bordered note: _"Con 1 ya puede publicar. Entre más habilidades escoja, en
  más búsquedas va a aparecer."_ Encouragement, once, and it **does not escalate**: at 2 it
  disappears entirely.
- **2–14** — nothing. No nudge, no meter.

**There is no completion meter anywhere, deliberately.** `NEXTJS_HANDOFF.md` specifies a
`CompletionMeter` and a `ProfileCompletion`; a percentage-of-done bar on a page where the honest
maximum is _"whatever you can actually do"_ turns versatility into a score and tells someone with
four real skills they are 20% of a person. That is the pressure the ticket asks about. If you want
it back, it needs an argument.

## Voice

No voice guide exists for Encuentra yet, and writing one is past this map's destination. This is a
sketch, held only tightly enough that the copy above is judgeable:

- **Archetype: Everyman**, not Caregiver. Caregiver is the charity register the product exists to
  refuse.
- **Extremes:** Directness **5**, Warmth **4**, Sophistication **1** (short sentences, common words,
  no product vocabulary). Everything else moderate. Humor **1** — not solemn, just not funny here.
- **Person: `usted`.** This is a real call and worth confirming. Pereira is Eje Cafetero, where
  `usted` is the default _between friends and family_ — it reads as respect, not distance, and it
  does not exclude older users the way `tú` can. The cost is that it reads slightly formal to a
  younger urban reader. `vos` was not considered: it is Paisa-marked and would exclude the "anyone,
  anywhere" hirer.
- **Never:** any word implying the platform will find you work; _"complete su perfil"_; a percentage;
  the word _víctima_, _damnificado_, _ayuda_ or _apoyo_ about the person; _"lo agregaremos"_ on a
  Suggestion.
- **Always:** the second person doing the verb — _"escoja"_, _"quite"_, _"cuéntenos"_ — never
  _"se requiere"_, never the system as subject.

## Accessibility

The bar from `NEXTJS_HANDOFF.md` still binds and the ticket calls this out as the hardest part.
Present in all three: a real `role="combobox"` with `aria-expanded` / `aria-controls` /
`aria-activedescendant`, arrow-key + Enter + Escape navigation over the listbox, one polite live
region announcing every add, remove, result count and cap refusal, real `<input type="checkbox">`
in B and C (not divs), 40px+ targets, a 2px `--color-brand-500` focus ring, no meaning by colour
alone, and `prefers-reduced-motion` honoured.

**Not cleared here, and worth knowing before deciding:** the 300-item listbox is virtualised nowhere
and announces "40 resultados" rather than paging; variant B's accordion has no roving tabindex; none
of it has been through a real screen reader. Treat the a11y as _demonstrated pattern_, not _verified
conformance_.

## The fixture data is not the vocabulary

256 Skills across 14 Groups (ADR-0012 targets 250–350 in 12–15) and 57 Denominations, authored for
this prototype so that browsing 300 items _feels_ like browsing 300 items. Every Denomination bundle
resolves to real Skills — the file fails loudly in the console otherwise. Slugs are generated by
ADR-0012's rule and come out right (`atención al cliente` → `atencion-al-cliente`).

It is **not** the seed. Authoring the real list and running the proxy rule over it is an
implementation ticket, which #30 puts out of scope explicitly. CUOC ships 14,462 denominaciones;
57 are sampled. Do not mistake this for the term list.

## Departures from the named skills

- **`/prototype` UI branch wants a route** (sub-shape A on an existing page, or B as a throwaway
  route). This is a single HTML file instead. `apps/web` is still the bare `create-turbo` scaffold —
  no design system, no shadcn, no seeded catalog, nothing rendered — so sub-shape A has no host page
  and sub-shape B would mean standing up half the app to render a picker, against a map whose
  destination says _plan only, this map builds nothing_. The repo already carries exactly this
  convention: `apps/landing/option-2.html` is a single-file prototype.
- **The switcher bar carries three extra toggles.** UI.md specifies arrows and a label. #30 asks four
  questions, three of which are orthogonal to the primary gesture; folding them into the variant axis
  would have meant nine variants, well past UI.md's cap of five.
- **`shadcn` was not loaded.** The repo has no `components.json` and `@repo/design-system` does not
  exist yet (ADR-0006 creates it, unbuilt). There is nothing for it to act on.
- **`brand-voice` was not run as specified.** It produces a full voice guide from an intake
  interview; that is its own effort and sits past this map's destination. Its dimension vocabulary is
  used for the sketch above, which is the "lightweight voice sketch" its own instructions permit when
  no guide exists.
- **`userinterface-wiki` has no combobox rule.** Its ARIA-shaped guidance stops at Laws of UX. The
  combobox semantics come from the WAI-ARIA Authoring Practices, not from that skill. What it _did_
  bind: minimum target size, chunking into 5–9 (Groups are ~20, which is over — noted, not fixed),
  progressive disclosure, tabular figures on the counter, and no animation on keyboard navigation.

## Open calls this prototype takes without being asked to

Flag any of these that are wrong — they are positions, not defaults:

1. **`usted`, not `tú`.**
2. **No completion meter, ever**, superseding `NEXTJS_HANDOFF.md`'s `CompletionMeter`.
3. **The one-skill note appears once and never escalates.** No repeat nudge at 3, 5 or 10.
4. **Denominations are multi-select (up to 3) in C.** The ticket implies one. Someone who was a
   _mesero_ and a _domiciliario_ is the normal case here, and picking one erases the versatility the
   product exists to reveal.
5. **A Suggestion always ships with three nearest Skills.** The capture alone would be a dead end
   even when it doesn't read like one.
