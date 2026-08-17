# Prototype — trust presentation between strangers (#12)

**Throwaway.** One self-contained HTML file. Double-click `index.html`, or:

```sh
open docs/design/trust-presentation-prototype/index.html
```

No build, no server, no dependencies. Nothing here is production code, and none of the fixture data
in it is real.

> Three variants of **where the trust work lives**, rendered across every surface at once — the two
> Walls, the Public View beside the signed-in profile, the public Need card, the coincidencias, the
> Offer, the Contact Exchange and the safety states — switchable via `?variant=`, plus three
> question toggles (`?proof=`, `?pay=`, `?scam=`) and two inspection toggles (`?photo=`,
> `?setting=`).

**No verdict yet.** This is the artefact to react to; the ADR is written after.

## The finding that shapes all three variants

The ticket asks what signals exist at all. Worked through against the ADRs, **there are no
per-person trust signals in v1, and every candidate fails for a reason already on the record**:

| Candidate                     | Verdict                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Confirmed contact details** | **Not a signal — a constant.** ADR-0009 gates publishing and sending on a verified email, so every Publication and every Offer sender already has one. A badge everyone holds distinguishes nobody. It is a fact about the _platform_, statable once.                                                                                              |
| **Photo reviewed by a human** | **True, and unusable per profile.** ADR-0010 pre-moderates every image, so "foto revisada" is real — but attaching it to a profile makes a profile without a Photo second-class, which rule 1 forbids and this ticket inherits twice (ADR-0010, ADR-0011).                                                                                         |
| **Offer history**             | **Refused, and not merely deferred.** ADR-0015 already says an unverifiable outcome shown as trust is worse than none. An _accepted_ count is verifiable but means only "exchanged contact details N times", and ADR-0015 names the real cost: the moment reputation accrues, re-registration stops being cheap and **ADR-0009 must be reopened**. |
| **Report history**            | **Never.** It is a third party's personal data, it is disclosed to nobody but the reported Person (ADR-0013 as amended by ADR-0020), and "0 reportes" is a badge everyone wears until the day they do not.                                                                                                                                         |
| **Account age**               | **Available, weak, and the only one left.** `persons.created_at` is honest and cheap. At launch everybody is new, and a fraudster ages an account for free. It is included in variant B precisely so its emptiness is visible.                                                                                                                     |
| **Honestly nothing**          | **This is the answer.**                                                                                                                                                                                                                                                                                                                            |

So the design question is not _which badge_. It is **where an honest account of the mechanism
goes**, given that the product has one and only one true thing to say: what it does, what it does
not do, and what cannot be undone. That is the axis the three variants disagree about.

The motif that falls out of it is a **ledger, not a stamp** — two columns, _Lo que sabemos_ / _Lo
que no sabemos_. A badge asserts; a ledger accounts. A product with nothing to assert should not be
reaching for the vocabulary of assertion.

## The three variants

Flip with the arrows in the black bar, the `←`/`→` keys, or `?variant=A|B|C`.

| Key   | Name               | Where the trust work lives                                                                                      | The bet                                                                                   |
| ----- | ------------------ | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **A** | House rules        | One standing account of the mechanism — a band on the landing page, a page behind it, a link from every surface | Trust comes from a coherent, honest explanation read once, not from repetition            |
| **B** | Per-object ledger  | A ledger attached to **every** profile, Need card, suggestion and Offer                                         | Honesty at the point of judgment beats a page nobody opens                                |
| **C** | Only in the moment | Nothing standing at all. Everything at the Offer and the Contact Exchange                                       | A warning is only read where ignoring it costs something; everywhere else it is wallpaper |

The variant names are **English**, like every other control — ADR-0001 as amended by #30. In the
product these surfaces are _reglas_, _ficha_ and _propuesta_; in the black bar they are
instrumentation and get deleted with it.

They disagree about more than placement:

- **What an unauthenticated visitor is told.** A gives them the whole mechanism before they scroll.
  B gives them one line per card. C gives them nothing, and the Wall is left to carry it alone.
- **Whether the same sentence repeats.** B says _"Encuentra no comprobó nada de esto"_ perhaps
  fifteen times on one screen. A says it once. C never says it outside an Offer.
- **Where the advance-fee warning is structural rather than optional.** In C it is not a toggle —
  the Offer interruption is the variant.

### Each one has a visible flaw, and the file is built to show it

**B walks into ADR-0010 and the file makes it obvious.** Flip `Photo · without`. The ledger's _Lo
que sabemos_ column loses a row — _"Una persona revisó esta foto"_ — so a Person with no Photo
literally has less known about them, printed beside the person who has one. That is
_second-class rendering_ arriving through a component that was trying to be honest. It is fixable
only by deleting the row for everybody, at which point B's ledger is three "no" and two "yes" on
every card and reads as an accusation. **Treat this as B's disqualifying defect unless you disagree
with it.**

**C loses the argument ADR-0010 already won.** That ADR's case for having faces at all is that _"a
faceless directory of names and skills reads as a scam"_ in a market where this work is really
arranged over WhatsApp. C's public surfaces claim nothing whatsoever, so the person deciding
whether this platform is real gets no answer. Flip to C with `proof=none` and look at the landing
page as a stranger.

**A's flaw is the one the ticket named in advance** — _"a help page nobody opens"_. A is only
defensible if its landing band carries the whole load and the page behind it is a reference, not the
mechanism. Judge the band, not the page.

## The toggles

Two rows in the black bar: **Questions** are decisions #12 owes an answer to; **Inspect** are ways
of looking at the same design.

### `?proof=` — what replaces `TrustProof`'s "Empresas verificadas"

| Value       | What it says                                                                                                                                                   |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `limits`    | Three limits: _Aquí no pasa plata_ · _No verificamos a nadie_ · _Tus datos de contacto son tuyos_. A trust proof made of what we do **not** do.                |
| `mechanism` | Three mechanics: _Usar Encuentra no cuesta nada_ · _Una persona revisa cada foto_ · _El teléfono se comparte al aceptar_. Same honesty, phrased as capability. |
| `none`      | No band. One line — _"Cada perfil de abajo lo escribió la persona misma."_ — and the Wall is the proof.                                                        |

`limits` is the direct inversion of the dead promise and it is the bravest. `mechanism` says the
same true things without opening on a negative, which matters on the one screen whose job is to make
someone stay. **The second `mechanism` item is a trap worth noticing**: _"una persona revisa cada
foto"_ is true and is a platform fact, but read on a landing page it can be heard as _"Encuentra
revisa a la gente"_. If that reading is live, the item has to go, and `mechanism` drops to two.

### `?pay=` — how off-platform payment is said

| Value    | Behaviour                                                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `plain`  | Stated on the landing page and in the Offer: _"si algo sale mal con el pago, nosotros no podemos devolvértela."_                     |
| `warned` | Adds _"Nadie de Encuentra te va a pedir plata nunca."_ — an impersonation control, and the first sentence here that raises an alarm. |
| `quiet`  | Only inside the Offer. The public surfaces never mention money at all.                                                               |

The hard part is that the honest sentence is a **disclaimer of protection**, and disclaimers read as
danger. The drafting rule used throughout: **state the limit, never the risk.** _"No podemos
devolvértela"_ is a fact about us; _"te pueden estafar"_ is a warning about them, and the second one
is what frightens people away from a product that has done nothing wrong.

Against `warned`: it is the only line in the set that describes an attack. For it: impersonating the
platform is the cheapest advance-fee approach there is, and the sentence costs nine words.

### `?scam=` — where the advance-fee and equipment-purchase warning lands

| Value      | Behaviour                                                                        |
| ---------- | -------------------------------------------------------------------------------- |
| `offer`    | Inside the Offer, above the answer buttons. Read before a decision, by everyone. |
| `exchange` | At the Contact Exchange, beside ADR-0013's Work Setting guidance.                |
| `both`     | Both places.                                                                     |

The ticket's own framing — _"inside the offer flow, not on a help page nobody opens"_ — argues for
`offer`, and there is a second reason: at the **exchange** the decision is already made and the
contact details have already crossed. A warning that arrives after the irreversible step is a
record that we said something, not a control.

The argument for `exchange` is ADR-0013's: undifferentiated safety copy shown everywhere is
wallpaper, and the Work Setting guidance is already there and is already differentiated. `both`
risks exactly the wallpaper that ADR ruled against.

### `?photo=` — inspection, not a question

Renders the featured Person **with** or **without** a Photo across every surface. The Walls and the
coincidencias stay mixed regardless, because the grid is where the contrast is sharpest — the
constraint #12 inherited from ADR-0014's comment on this ticket.

**The layout position this file takes:** a Person with no Photo does not get an empty circle, a grey
silhouette, or initials in a disc. The card **re-flows** and the name takes the leading position at
a larger size. A placeholder is a hole where a face should be, and a hole is a penalty rendered in
CSS; a name set larger is not. This is a position, not a default — say so if it reads as its own
kind of odd.

### `?setting=` — inspection, all five Work Settings

ADR-0013 makes Work Setting select the safety guidance at the Contact Exchange, so all five have to
be readable. Flip it and read the Contact Exchange section. `hirer_home` is the one the ADR
prioritises and the one whose copy is hardest — it must be useful without implying that Encuentra
has vetted anywhere anyone goes.

## What dies in `NEXTJS_HANDOFF.md`

The ticket asks for "Empresas verificadas" and **anything else in the prototype that implies vetted
employers**. The full list, so it is deleted once rather than found later:

| Artefact                                                      | Why it dies                                                                                               |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `TrustProof` item **"Empresas verificadas"**                  | False. There are no companies and nothing is verified.                                                    |
| `TrustProof` item **"Postularte es gratis"**                  | There is no _postulación_ — `CONTEXT.md` bans the word. The true sentence is that nothing costs anything. |
| `TrustProof` item **"Respuestas en un solo lugar"**           | Survives in substance as the Offers surface, but it promises a reply. Nothing promises a reply.           |
| `CompanyBadge`                                                | No company accounts exist.                                                                                |
| `Job.company.verified: boolean`                               | The data contract's verification flag. Nothing sets it and nothing could.                                 |
| `Job` / `Application` types, `ApplicationStage`               | ADR-0015: the four-stage timeline is **dead, not adapted**.                                               |
| `ApplicationTimeline`, `NextStepCard`, `/mis-postulaciones`   | Same.                                                                                                     |
| `/empleos`, `/empleos/[slug]`, `ApplyPanel`, `JobCard`        | Superseded IA. Routes are `/search/work` and `/search/people` (ADR-0014).                                 |
| Content rule _"State «verificada» only after a real process"_ | Retire the escape hatch with the badge. There will be no such process in v1.                              |
| `SafetyNotice` "no-fee policy"                                | Survives as **content**, not as a page: the fee statement moves into the Offer.                           |
| `/ayuda/busqueda-segura`                                      | Kept only as a reference; it must never be where a warning first appears.                                 |

**What survives, unchanged and still binding**: the design tokens, the component primitives, the
motion rules, the content rules about never implying a guarantee of employment and never using
disaster imagery, and the whole accessibility bar. This prototype uses the tokens verbatim.

## The Public View / signed-in difference, stated

Rendered side by side in section 2, because this is the sub-question most likely to be answered
wrongly by instinct.

|                                             | Public View               | Signed in                |
| ------------------------------------------- | ------------------------- | ------------------------ |
| Full name                                   | yes                       | yes                      |
| Photo                                       | only if opted in publicly | if uploaded and approved |
| Place                                       | **department only**       | exact Municipality       |
| Skills                                      | yes                       | yes                      |
| Availability, Need detail, Self-description | no                        | yes                      |
| **What is claimed about the person**        | **nothing**               | **nothing**              |

**The last row is the decision.** The boundary ADR-0011 drew is about _enumerability_, not
credibility. Signing in buys you more fields about the same unvetted stranger, and **no copy on
either side of the line may imply that an account buys a vetted person.** The public view therefore
carries one sentence that is easy to get wrong and is written to be right:

> _Con una cuenta ves el municipio y el detalle de lo que publicó. No ves nada más sobre si es de
> fiar: eso no lo tenemos._

## Language

**The prototype's controls are English. Only the copy inside the surfaces is Spanish.**

The black bar and its labels, the **variant names**, the top banner, the board's section headers
(`1 · Landing and the two Walls`), the **frame labels** on each surface (`Public View · signed out`),
the state readout and every search-param value are instrumentation — they get deleted when this
prototype is captured, so no string in them will reach a user. Everything a person in the design
would read is Spanish. This is ADR-0001 as amended by #30, and the trap it closes is Spanish chrome
growing Spanish state keys behind it.

Two cases needed a call:

- **Frame labels name product surfaces**, and a surface name is close to domain vocabulary. They are
  chrome because they are navigation _through the board_, which is not a thing that exists in the
  product. So `Contact Exchange · accepted`, not `Intercambio de datos · aceptada` — and `CONTEXT.md`
  already gives every one of those concepts an English name for exactly this reason.
- **English commentary that has to sit inside a Spanish surface** — the note on variant C's band, the
  404's "deliberately incurious", the hint-vs-refusal labels — is rendered in the dark monospace
  `.chromenote` style rather than the product's own muted text, so it cannot be mistaken for design.

## Voice

Following the sketch in `docs/design/skill-picker-prototype/README.md` — Everyman, Directness **5**,
Warmth **4**, Sophistication **1**, `tú`, no gender agreement with the reader. Two rules this
surface adds, because safety copy is where a voice usually breaks:

- **State the limit, never the risk.** _"Encuentra no puede devolverte la plata"_ over _"te pueden
  estafar"_. The first is a fact about us and is calm; the second is a warning about a stranger the
  reader is about to meet, and it is the sentence that makes a product feel dangerous.
- **Never claim a reach we do not have.** ADR-0013 forbids any copy suggesting we can retrieve
  contact details already exchanged. Hence the Contact Exchange's _"ya no te va a poder escribir
  **por Encuentra** — pero ya tiene tu número"_, and the Block dialog's version of the same
  sentence.

**Never:** _verificado_, _confiable_, _seguro_ about a person; _empresa_, _empleador_; any word
implying we will find you work; _víctima_, _damnificado_, _ayuda_, _apoyo_ about the person; a
promise of an outcome on a Report.

## Accessibility

The bar from `NEXTJS_HANDOFF.md` binds. Present here: no meaning carried by colour alone — every
notice has a text kicker naming what it is, and the ledger's two columns are labelled rather than
tinted; 44px minimum targets; a 2px `--color-brand-500` focus ring; real radio inputs in the report
form with real labels; the switcher announced through a polite live region; `prefers-reduced-motion`
honoured; hover motion behind `(hover: hover) and (pointer: fine)`; tabular figures on the pay
amount; `:active { transform: scale(.97) }` on every button.

**Not cleared here**: nothing has been through a screen reader, the board is a long single column at
390px rather than a designed mobile layout, and the coloured discs standing in for photographs carry
`role="img"` with a generic label because there is no real image to describe. Treat the a11y as
_demonstrated pattern_, not _verified conformance_.

## Departures from the named skills

- **`/prototype` UI branch wants a route.** This is a single HTML file instead, for the same reason
  `skill-picker-prototype` and `first-run-prototype` are: `apps/web` is still the bare
  `create-turbo` scaffold, so sub-shape A has no host page and sub-shape B would mean standing up
  half the app. The repo's own convention is a single-file prototype.
- **UI.md wants variants that "disagree about structure", and one section here does not vary.** The
  safety states (section 7/8) are identical across A, B and C, because they are copy decisions
  rather than placement decisions — the ticket asks for _"the wording, in Spanish, of every
  safety-relevant state"_ and the wording does not depend on where the trust band lives. They are
  rendered once, in all three.
- **The board is not a flow.** UI.md's variants usually replace a page; here each variant re-renders
  **seven surfaces at once**, because the ticket's real question is consistency _across_ surfaces
  and a one-page variant cannot show it.
- **`shadcn` could not be loaded as a skill.** `npx shadcn info` refuses at the monorepo root; run
  with `-c packages/design-system` it reports the project: style `base-vega`, Base UI underneath,
  Tailwind v4, lucide, preset `b1sRmB0Rk`. That is recorded here because it is what a real
  implementation will build against — but this file is plain CSS on the handoff tokens, so nothing
  from the registry is used.
- **`brand-voice` was not run as specified.** It produces a full voice guide from an intake
  interview, which is its own effort and sits past this map's destination. The sketch above extends
  the one `skill-picker-prototype` established, which is the lightweight path that skill permits
  when no guide exists.
- **`emil-design-eng` and `userinterface-wiki` bound the motion and the layout, not the copy.** What
  they contributed: `ease-out` with the handoff's custom curve, press feedback at 140ms, no
  animation on the keyboard-driven variant switch, transitions rather than keyframes, tabular
  figures on the pay amount, minimum target size, and proximity grouping in the ledger. Neither has
  a rule about safety copy, which is most of this ticket.
- **`frontend-design` asks for a distinctive palette and type system; the brief pins both.** The
  handoff's tokens are recorded as still binding, and that skill's own rule is that the brief wins.
  The freedom spent instead is structural: the **ledger** motif, and the surfaces board.

## Open calls this prototype takes without being asked to

Flag any of these that are wrong — they are positions, not defaults.

1. **No per-person trust signal ships in v1, including account age.** Variant B renders it to make
   the case visible, not because it should ship.
2. **A profile with no Photo gets no placeholder at all**, and the name grows instead.
3. **"Correo verificado" is never shown to anyone.** Everyone has one; it distinguishes nobody.
4. **The pay statement lives in the Offer even when it also lives on the landing page.** The
   landing page is read by a visitor; the Offer is read by the person about to say yes.
5. **The Report acknowledgement routes to Block in its last sentence.** ADR-0013's whole argument
   for refusing automatic moderation is that Block is instant, so the acknowledgement is where that
   has to be said.
6. **The 404 for an absent profile is deliberately incurious** — no "may have been removed", which
   would leak what a 403 leaks.
7. **The advance-fee copy names equipment purchase explicitly** rather than folding it into "asking
   for money". _"Cómprate tú el uniforme y arrancamos"_ is not heard as being asked for money.
