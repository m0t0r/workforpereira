# There is no badge to earn, so the mechanism is stated once and the warning lands twice

Employer verification left with #8, and the pivot took the object it verified with it. There are no
companies, no NIT, no Cámara de Comercio, no badge. Both sides are individuals, one may be in another
country, and **no money passes through the platform**, so there is no transaction history to build
reputation from. ADR-0010 named the consequence in passing — _"a face is the cheapest trust signal
this platform has, and it has no others"_ — and left the rest to this ticket.

This ADR decides what the product says to make this feel safe without lying: which signals exist
(none), where an honest account of the mechanism goes, how off-platform payment is stated, where the
advance-fee warning lands, and the Spanish wording of every safety-relevant state. Prototyped at
`docs/design/trust-presentation-prototype/` on `prototype/trust-presentation`, three ways.

## There are no per-person signals, and that is a finding rather than a preference

#12 asked what signals exist at all — _"account age, confirmed contact details, offer history, report
history, or honestly nothing"_. Worked against the decisions already made, every candidate fails, and
each one fails on a different ADR:

| Candidate                     | Why it is not available                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Confirmed contact details** | **A constant, not a signal.** ADR-0009 gates publishing and sending on a verified email, so every Publication and every Offer sender already holds one. A badge nobody lacks distinguishes nobody, and rendering it teaches people that badges here mean something.                                                                                                            |
| **Photo reviewed by a human** | **True, and unusable per profile.** ADR-0010 pre-moderates every image, so _every visible Photo has passed a person_. Attaching that to a profile makes a profile without a Photo carry visibly less — the second-class rendering ADR-0010 rule 1 forbids, which ADR-0011 and ADR-0014 both restate for this ticket.                                                           |
| **Offer history**             | **Refused, not deferred.** ADR-0015 already holds that an unverifiable outcome shown as trust is worse than none. An _accepted_ count is verifiable, but it means only "exchanged Contact Details N times" while reading as reputation — and ADR-0015 names the real cost: **the moment reputation accrues, re-registration stops being cheap and ADR-0009 must be reopened.** |
| **Report history**            | **Never.** A Report is another Person's personal data, disclosed to nobody but the reported Person (ADR-0013 as amended by ADR-0020). And _"0 reportes"_ is a badge everyone wears until the day they do not, which converts our queue latency into a public accusation.                                                                                                       |
| **Account age**               | **Available, weak, and refused anyway.** `persons.created_at` is honest and free. At launch everybody is new, a fraudster ages an account for nothing, and displaying it invites the reading that older is safer, which is false.                                                                                                                                              |

**So nothing is attached to a Person, anywhere.** Not a badge, not a ledger, not a line of text. This
is stated as a prohibition rather than an absence, because the pressure to add one arrives every time
someone looks at a bare profile and finds it thin.

The product has exactly three true things to say, and none of them is about a person: **using it
costs nothing**, **a human looks at every photograph and at nothing else**, and **contact details
cross only at acceptance**.

## The line is not standing versus situated. It is whether the surface judges a person

The prototype framed the choice as _standing rules_ against _per-object disclosure_ against _only at
the moment_, and the moment-based shape won. Its own answer was that **nothing** stands, including
the landing page. That half is overturned, and the reason is the distinction the whole ADR turns on:

- **A surface where somebody is being judged carries nothing.** The Wall, the Public View, the
  signed-in Capability Profile, the public Need card, a search result, a suggestion. Text here is
  read as being _about the person on the card_, and there is nothing true to say about them.
- **A surface where a decision has a cost carries everything.** The Offer and the Contact Exchange.
- **A surface where nobody is on trial carries the statement.** The landing page, which is where the
  false promise used to live and therefore where a true one has to.

`TrustProof` promised _"Empresas verificadas"_, and #12's instruction is that it **must be
replaced** — not deleted. Deleting it also leaves nothing anywhere that sets the money expectation
before someone signs up, and ADR-0010's argument for having faces at all is that a public surface
claiming nothing _"reads as a scam"_ in a market where this work is really arranged over WhatsApp.

### Why no profile, card or suggestion carries a word about verification

Three reasons, in ascending order of how load-bearing they are.

1. **It is wallpaper**, by ADR-0013's own reasoning about undifferentiated safety copy: a sentence
   repeated on every card of a grid is read on none of them.
2. **The grid is where it is least legible and most alarming.** ADR-0014 already binds this ticket to
   the search-results surface, _"where a grid makes the contrast sharpest"_.
3. **The only honest per-object ledger has a Photo-shaped hole in it, and the hole is unfixable.**
   This is the decisive one and it was found by building it. A ledger of _what we know_ about a
   Person can truthfully include _"una persona revisó esta foto"_ — and that row exists only for
   people who uploaded one. Rendered side by side, a Person with no Photo has visibly less known
   about them. Deleting the row for everyone leaves a panel of three "no" and two "yes" attached to
   every human on the platform, which reads as an accusation. **There is no third version.** Flip
   `?variant=B&photo=off` in the prototype; the defect is on screen.

## What replaces "Empresas verificadas"

Three items on the landing page, and on no other surface. Phrased as **mechanism** rather than as
limits:

> **Usar Encuentra no cuesta nada.** Ni publicar, ni buscar, ni mandar una propuesta.
>
> **Una persona revisa cada foto.** Antes de que aparezca. Solo la foto: no comprobamos nada más de
> nadie.
>
> **El teléfono se comparte al aceptar.** Tú decides cuándo, propuesta por propuesta.

**The second item's limit clause is load-bearing, not politeness.** _"Una persona revisa cada foto"_
alone is heard as _"Encuentra revisa a la gente"_ — the exact claim this ADR exists to retire,
arriving through the one true sentence the platform has. The clause carries the work that a
negatively-phrased band would have carried, which is why the band can afford to be positive at all.

**A band phrased as limits was the alternative** — _Aquí no pasa plata · No verificamos a nadie · Tus
datos de contacto son tuyos_ — and it is the braver inversion of the dead promise. It loses on the
one screen whose job is to make somebody stay: opening on three negatives to a person who has just
lost their income is a worse first impression than opening on three facts, and the honesty is
identical either way.

**Dropping the second item and shipping a band of two was also weighed and rejected.** The photo
review is the single true operational fact this platform has. A product with almost nothing to say
must not discard the one thing it can.

## Off-platform payment: state the limit, never the risk

The honest sentence about money is a **disclaimer of protection**, and disclaimers read as danger.
The drafting rule that resolves it, and which governs every safety string in this ADR:

> **State the limit, never the risk.** _"Encuentra no puede devolverte la plata"_ is a fact about us.
> _"Te pueden estafar"_ is a warning about the stranger the reader is about to meet, and it is what
> frightens people away from a product that has done nothing wrong.

It lives **in the Offer**, next to the figure someone is about to accept — not on a surface anyone is
browsing:

> El pago lo acuerdan ustedes dos. Encuentra no cobra, no paga y no guarda plata: si algo sale mal
> con el pago, nosotros no podemos devolvértela. **Nadie de Encuentra te va a pedir plata nunca.**

**The last sentence is the only one in the product that names an attack, and it earns that.** The
band above says using Encuentra is free, which makes impersonating Encuentra the cheapest advance-fee
approach available. The sentence closes a hole the band itself opens, and costs nine words.

**The pay direction is stated as the structural fact it is.** ADR-0013 fixed it in the schema so an
Offer is incapable of expressing _"the worker pays"_; the Offer says so out loud, because a
guarantee backed by a column is the only guarantee this product can make:

> En una propuesta la plata solo va en una dirección: de quien contrata a quien trabaja. No hay forma
> de escribir lo contrario.

**Nothing about payment appears on the landing page, a profile, a Need card or a suggestion.** The
band's first item sets the free-to-use expectation and stops there.

## Two warnings, at two moments, never in the same words

The advance-fee and equipment-purchase warning lands **twice**. ADR-0013 ruled against
undifferentiated safety copy, so the two are not permitted to be the same block — repeating one
verbatim is precisely the wallpaper that ADR refused.

**In the Offer, above the answer buttons — the decision gate.**

> **Nadie debería pedirte plata para darte trabajo.** Ni para el uniforme, ni para los materiales, ni
> para el curso, ni para los trámites. Que te pidan comprar algo tú para empezar es la misma cosa
> dicha de otra forma.
>
> Si te la piden, repórtalo. No pierdes nada por reportar y no le avisamos a nadie que lo hiciste.

Equipment purchase is named explicitly rather than folded into "asking for money", because
_"cómprate tú el uniforme y arrancamos"_ is not heard as being asked for money.

**At the Contact Exchange — what the Offer could not cover, because it had not happened yet.**

> **Lo que aceptaste es lo que quedó escrito: $90.000 por día.** Acuerden por mensaje qué día se paga,
> antes de empezar. Esa conversación ya es de ustedes: Encuentra no la ve y no guarda nada de ella.
>
> **Si aparece un costo que no estaba en la propuesta, no estaba en el trato.**

**The second block is the reason `both` beats the Offer alone.** An advance-fee approach that
survives the Offer screen survives it precisely by not being in the Offer — the cost appears after
acceptance, once the terms are fixed and the platform can no longer see anything. The Offer warning
cannot reach that case, and the Exchange is the last surface either person will ever see.

**ADR-0013's Work Setting guidance is unchanged and sits beside it**, selected by the Offer's copy of
Work Setting. It answers a different question — the physical risk of the meeting, not the money — and
the two are rendered as separate blocks so neither dilutes the other.

**The Contact Exchange also states what cannot be undone**, which ADR-0013 requires and which no copy
may soften:

> Si más adelante lo bloqueas, no te va a poder escribir **por Encuentra** — pero ya tiene tu número
> y eso no se lo podemos quitar.

## The Public View claims exactly what the signed-in profile claims, which is nothing

ADR-0011 split the public and authenticated tiers by **fields**. The boundary it drew is about
_enumerability_, not credibility, and the presentation must not let that slip: **signing in buys more
fields about the same unvetted stranger.**

**No copy on either side of the line may imply that an account buys a vetted person.** The Public
View's one sentence about the difference is written to foreclose it:

> Con una cuenta ves el municipio y el detalle de lo que publicó. No ves nada más sobre si es de
> fiar: eso no lo tenemos.

The public Need card is ADR-0014's, unchanged — the work and not the author, the author as name only
linking to their Public View, no Photo — and it carries no trust text either.

> **Amended by ADR-0030 for one Work Setting.** On a `hirer_home` Need the public card has **no author
> line at all** — and no placeholder: no _Anónimo_, no _Un vecino de Pereira_, no initials, which is the
> reasoning of _"A profile without a Photo has no Photo-shaped hole"_ reaching the same answer for a
> different reason. A stand-in word reads as evasion on a card that deliberately carries no trust
> signal. One sentence names the missing field, in this section's own pattern:
>
> > Con una cuenta ves quién lo publicó.
>
> The companion sentence _"No ves nada más sobre si es de fiar"_ is **not** repeated there: this section
> already rules the Need card carries no trust text, and repeating it on every `hirer_home` card is the
> wallpaper ADR-0013 refused.

## A profile without a Photo has no Photo-shaped hole

ADR-0010 rule 1 is a rule about data and this is its expression in layout, stated here because
_"never render second-class"_ is otherwise decided by whoever writes the component.

**A Person with no Photo gets no placeholder at all.** No silhouette, no grey disc, no initials, no
empty circle. The card **re-flows** and the name takes the leading position at a larger size, in the
same card height and the same grid density.

A placeholder is a hole where a face should be, and a hole is a penalty rendered in CSS — it says
_something is missing here_ on behalf of a person the law forbids us to condition anything on.
Initials in a disc are the same statement in a friendlier font. A name set larger is not a
substitute for a photograph and does not read as one; it reads as a card that was designed for a
name.

> **Boundary, added by ADR-0027.** This rule governs surfaces where a Person is being **shown to
> somebody else** — a profile, a card, a search result, a suggestion. It does not reach the owner's
> own Photo screen, where ADR-0027 sets the refusal inside a photo-shaped frame deliberately: there
> the rectangle is the object under discussion rather than a person's missing face, and naming it is
> the point. The two must never be quoted at each other.

## The safety-relevant states, in Spanish

| State                         | Copy                                                                                                                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Block**                     | _No va a poder escribirte ni mandarte propuestas por Encuentra, y no se van a ver el uno al otro en las búsquedas._ · _**No le avisamos.** Si ya intercambiaron datos, esto no le quita tu número._           |
| **Report — acknowledgement**  | _Gracias. Lo leemos nosotros._ · _No te vamos a contar qué pasó después: no podemos hablarte de la cuenta de otra persona._ · _Si quieres que deje de escribirte ya mismo, bloquéala. Eso no espera a nadie._ |
| **Counterparty suspended**    | _Esta cuenta ya no está disponible._ — and nothing else, in either direction.                                                                                                                                 |
| **Returning from a Pause**    | _Llegaron 2 propuestas mientras estabas en pausa. Contéstalas o descártalas._                                                                                                                                 |
| **Absent public profile**     | _Esta página ya no existe._ Plus one route onward. Nothing about why.                                                                                                                                         |
| **Photo pending review**      | _La está revisando una persona. Suele tardar menos de 3 días._ · _Mientras tanto tu perfil funciona igual: sales en las búsquedas, te pueden mandar propuestas y tú puedes mandar._                           |
| **Contact details in prose**  | Hint: _Tus datos de contacto se comparten cuando alguien acepta una propuesta. No los pongas aquí._ · Refusal: _Eso parece un teléfono. Tus datos se comparten cuando aceptas una propuesta, no antes._       |
| **Sin publicar**              | ADR-0025's card, unchanged.                                                                                                                                                                                   |
| **Every route out of a flow** | _Encuentra no consigue trabajo por nadie. Te pone donde te pueden encontrar._                                                                                                                                 |

Four of these are decisions rather than transcriptions:

- **The Report acknowledgement ends by routing to Block.** ADR-0013's entire argument for refusing
  automatic moderation is that Block is instant and holds the line while the queue is slow. The
  acknowledgement is the one screen where the person needs to be told that, and no response-time
  commitment appears anywhere near it — ADR-0013 forbids a clock nobody is staffed to keep.
- **The suspended-counterparty string is deliberately incurious**, and identical for a deleted
  account. ADR-0015 requires that the counterparty never learn a moderation action occurred.
- **The 404 says nothing about why.** _"Puede que la hayan eliminado"_ leaks exactly what ADR-0011's
  404-rather-than-403 rule exists to withhold.
- **The prose refusal repeats the mechanic, never the format.** ADR-0013's rule: _"tus datos se
  comparten cuando aceptas una propuesta"_, never _"formato inválido"_.

The ten Report reason codes get Spanish labels — _Me pidió plata para darme el trabajo_, _Me sacó de
Encuentra antes de aceptar_, _No es quien dice ser_, _No es un trabajo de verdad_, _Me acosó o me
amenazó_, _Me discriminó_, _El trabajo es ilegal o peligroso_, _Parece menor de edad_, _Manda lo
mismo a todo el mundo_, _Otra cosa_ — as UI copy over ADR-0013's English enum, per ADR-0001.

## What has no automated guard

Everything here. This ADR is strings and component trees, and ADR-0017 tests neither components nor
browsers in v1. It joins the list ADR-0025 opened: the consent-evidence path, ADR-0023's picker, the
first run, and now this.

Two items on it carry more than a usability cost:

- **The no-placeholder rule is a property of a React component.** A well-meaning refactor that adds
  an avatar fallback re-introduces the penalty ADR-0010 rule 1 forbids, and nothing fails.
- **The band's second item is one clause away from being a false claim.** Deleting _"Solo la foto: no
  comprobamos nada más de nadie"_ for length turns a true sentence into the one this ADR retired.

Both are named so the first browser test written, whenever v1 is standing, has a reason to cover
them.

## Consequences

- **`NEXTJS_HANDOFF.md` loses more than one item.** Dead alongside `TrustProof`'s _"Empresas
  verificadas"_: its _"Postularte es gratis"_ item (there is no _postulación_ — `CONTEXT.md` bans the
  word) and its _"Respuestas en un solo lugar"_ item (it promises a reply; nothing promises a reply);
  `CompanyBadge`; `Job.company.verified`; the `Job`, `Application` and `ApplicationStage` contracts;
  `ApplicationTimeline`, `NextStepCard` and `/mis-postulaciones`; `/empleos`, `/empleos/[slug]`,
  `ApplyPanel` and `JobCard`; and the content rule _"State «verificada» only after a real
  company-verification process exists"_, which is retired with the badge rather than kept as an
  escape hatch. `SafetyNotice`'s no-fee content survives as **content in the Offer**, not as a page.
  **The tokens, primitives, motion rules, content rules and accessibility bar are untouched.**
- **`CONTEXT.md` gains nothing**, which is unusual enough to state. This ADR introduces no domain
  term — it decides what existing terms are allowed to claim.
- **ADR-0010's never-second-class rule gains its layout expression**, and the no-placeholder rule is
  now quotable against any component that proposes an avatar fallback.
- **ADR-0013 gains a second block at the Contact Exchange**, beside its Work Setting guidance and
  distinct from it. Its Block, Report and prose-refusal copy are fixed here.
- **ADR-0015's copy obligation is discharged**: v1 cannot verify that anyone was paid, and the
  surfaces say so by never referring to it.
- **ADR-0014's public Need card contents and its no-photo-on-a-Need rule are discharged**, presented
  with no trust text of any kind.

  > **Re-opened for one branch by ADR-0030** — a `hirer_home` Need card carries no author line. The
  > no-trust-text rule is unaffected and constrains the one sentence that replaces it.

- **ADR-0016's deliberately-open rendering decision is discharged**: a suggestion card carries its
  explanation line and nothing else.
- **ADR-0011's Wall is presented as a sample rather than a proof of vetting** — the landing copy
  never calls the people on it verified, checked or trusted.
- **#28 inherits nothing.** The operator surface is unaffected; every string here is Person-facing.
- **The successor to ADR-0015 — outcome confirmation — reopens this ADR as well as ADR-0009.** The
  moment any per-person signal becomes displayable, the prohibition at the top of this document is
  what has to be amended.

## Rejected

**A ledger on every profile, card and Offer.** The honest version has a Photo-shaped hole in it
(above); the version without the hole is an accusation printed beside every human on the platform.
Found by building it, not by arguing about it.

**No public statement at all.** The moment-based variant's own answer, and the half of it that was
overturned: the ticket requires `TrustProof` to be replaced, nothing else would set the money
expectation before signup, and ADR-0010's _"reads as a scam"_ argument applies to a public surface
that claims nothing.

**A band phrased as limits.** Braver and equally honest, and it opens on three negatives to a person
who has just lost their income.

**Account age, verified-email and photo-reviewed badges.** Covered above: one is a constant, one
penalises the absence of sensitive data, and the third invites a false inference.

**Offer history as a displayed count.** ADR-0015's reasoning, plus the ADR-0009 reopening it forces.

**Report counts, in either direction.** Third-party personal data, and _"0 reportes"_ turns queue
latency into a public accusation.

**The same advance-fee block repeated at both moments.** The wallpaper ADR-0013 ruled against, and it
wastes the Exchange on a warning the reader has already read.

**A placeholder avatar of any kind** — silhouette, initials, or an empty circle.

**A response-time commitment on Reports.** ADR-0013 refused one and nothing here reopens it.
