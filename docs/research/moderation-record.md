# Ley 1581 against the moderation record: erasure versus ban, and art. 8(a)

Research for [#31](https://github.com/m0t0r/workforpereira/issues/31). Part of the
[Encuentra architecture map (#1)](https://github.com/m0t0r/workforpereira/issues/1). Surfaced by
[#13](https://github.com/m0t0r/workforpereira/issues/13); consumed by
[#26](https://github.com/m0t0r/workforpereira/issues/26),
[#27](https://github.com/m0t0r/workforpereira/issues/27) and ADR-0013.

> **Not legal advice**, and deliberately **not** a counsel-grade brief. This is a reading scoped to two
> build decisions — what `persons` and the moderation tables may retain, and what a `/mis-datos`
> *consulta* response contains. Where a question has no clean answer in the primary text it says so
> and names the safer default, rather than reading further.

**Method.** Primary sources only, in Spanish: Ley 1581 de 2012, Decreto 1074 de 2015 título 2.2.2.25
(compiling Decreto 1377 de 2013), and C-748 de 2011 where it construes those articles.
`funcionpublica.gov.co` failed TLS and `secretariasenado.gov.co` refused connections throughout, so
texts were read from the MinTIC and CRC *normogramas* — `.gov.co` compilations reproducing the
consolidated text with its *Jurisprudencia Vigencia* apparatus — cross-checked against a second
mirror for every provision quoted. SIC guidance did not surface cheaply and was not read.

**Nothing is inherited from [#5](https://github.com/m0t0r/workforpereira/issues/5).** Its §4 reading —
that the only lawful refusal of erasure is a legal or contractual duty to remain — was re-verified and
is **confirmed**, as is its compiled-number mapping (D.1377 art. 9 = `2.2.2.25.2.6`, art. 11 =
`2.2.2.25.2.8`, art. 22 = `2.2.2.25.4.3`).

**Being free and charitable is not an argument and is not used as one.** Art. 2 reaches databases held
by entities *"de naturaleza pública o privada"* with no commerciality filter, and the *ámbito
exclusivamente personal o doméstico* exception is expressly lost once data is *"suministrado a
terceros"*. It matters here only as a reason to prefer the simpler of two lawful options.

---

## The answer, in six lines

1. **There is exactly one ground for refusing erasure** — *"cuando el Titular tenga un deber legal o
   contractual de permanecer en la base de datos"* (`2.2.2.25.2.6`). C-748 writes the same single
   carve-out into art. 8(e), so it is constitutional-grade and correspondingly narrow. The three-limb
   list #31 hypothesised (judicial obstruction, *intereses jurídicamente tutelados*, public interest)
   is **Mexico's LFPDPPP art. 26, not Colombian law** — discard it.
2. **No Colombian source reaches the ban scenario at all**, so the answer is neither of #31's clean
   outcomes. The position is **narrow the erasure, do not refuse it**: hard-delete the `persons` row,
   keep a **keyed hash + timestamp + coded reason** in a separate blocklist, for a **bounded and
   published** term. Ley 1266's 4/8-year *caducidad* does not apply and must not be cited.
3. **Art. 8(a) reaches a Report written about the titular by another titular. Settled.** Art. 3(c)
   defines personal data by association, not authorship.
4. **The reporter's identity is withholdable** — on art. 13's closed list plus arts. 4(f)/(h) and
   18(j), **not** on the *seguridad* duties ADR-0013 and #31 both reached for.
5. **Withholding the reporter's *words* wholesale is ADR-0013's weakest position** and narrows to
   withholding identifying detail while disclosing the substance.
6. **Rectifying an allegation is unresolved**, but art. 15.2's *reclamo en trámite* legend is the
   statute's own answer to contested-not-yet-false data, and it is not optional.

---

## 1. Erasure versus ban

### 1.1 One refusal ground, and it is the only one

**Decreto 1074 art. `2.2.2.25.2.6`** (= D.1377 art. 9):

> Los Titulares podrán en todo momento solicitar al responsable o encargado la supresión de sus datos
> personales y/o revocar la autorización […] mediante la presentación de un reclamo, de acuerdo con lo
> establecido en el artículo 15 de la Ley 1581 de 2012.
>
> La solicitud de supresión de la información y la revocatoria de la autorización **no procederán
> cuando el Titular tenga un deber legal o contractual de permanecer en la base de datos**.

**C-748 de 2011, resolutivo Cuarto**, striking *"sólo"* from art. 8(e):

> […] el literal e) debe entenderse en el sentido que el Titular **también podrá revocar la
> autorización y solicitar la supresión del dato, cuando no exista un deber legal o contractual que le
> imponga el deber de permanecer en la referida base de datos**.

Three doors #31 asked about are closed by this. **The three-limb list does not exist** — verified
absent from the Colombian text on two independent official mirrors; there is no criminal-investigation
ground and no public-interest ground. **Art. 9 is not a retention exception**: it is the consent
requirement, and it runs the other way — it is why the `safety` Purpose exists at all. **Art. 17(d) is
not one either**: *"conservar la información bajo las condiciones de seguridad necesarias"* governs
*how* held data is secured, not whether it may be held. And **there is no defence-of-a-right ground
and no *interés legítimo***; arts. 4(c) and 9 make consent the axis and art. 10's exceptions are a
closed list about public, health, judicial and statistical cases. ADR-0007 already relies on this, and
it cuts against us here exactly as it cut for us there.

### 1.2 The *finalidad* argument, and its limit

**Art. `2.2.2.25.2.8`** (= D.1377 art. 11):

> […] sólo podrán recolectar, almacenar, usar o circular los datos personales **durante el tiempo que
> sea razonable y necesario, de acuerdo con las finalidades que justificaron el tratamiento** […] Una
> vez cumplida la o las finalidades […] deberán proceder a la supresión […] No obstante, los datos
> personales **deberán ser conservados cuando así se requiera para el cumplimiento de una obligación
> legal o contractual**.
>
> Los responsables y encargados **deberán documentar los procedimientos para el Tratamiento,
> conservación y supresión** de los datos personales […]

This is the operative text for #27. It sets **no number** — a proportionality standard tied to the
declared *finalidad*, self-assessed and reviewable by the SIC — and its second paragraph makes
**documenting** the retention and deletion procedure a standalone duty, independent of whether the
retention is lawful. Art. 17(k)'s manual interno is where that lives.

The argument it supports is that the `safety` Purpose ADR-0007 made required *is* a declared
*finalidad*, so while a suspension is live that *finalidad* is not *cumplida* and the erasure duty in
sentence two has not triggered. That is real. **It also proves too much if leaned on** — the same
reasoning would justify keeping the whole evidence file forever, which *"razonable y necesario"*
plainly forbids. It supports a minimum, not a maximum.

### 1.3 Where this lands — unresolved, and stated as such

**No Colombian primary source addresses the ban scenario.** Not Ley 1581, not título 2.2.2.25, not
C-748. The *deber contractual* limb is undefined: nothing says whether a duty the responsable wrote
into its **own adhesion contract** counts, or whether it must be independent of the responsable's
unilateral drafting. A Terms clause reading *"if we suspend you, you agree to remain in our database"*
is exactly what the SIC could characterise as evading art. 8(e) and the *principio de libertad*, and no
concepto or decision was found either way. So there **is** a ground, it **is** constitutional-grade,
and a *finalidad* argument sits behind it — but it is untested on these facts and cannot carry a full
evidence file.

### 1.4 The minimum record, and for how long

Nothing prescribes a permitted minimum; what the sources prescribe is the shape of the constraint —
`2.2.2.25.2.8` (*razonable y necesario*), art. 4(f) (restricted access, never publicly visible), art.
4(g) (security), `2.2.2.25.4.3` (*"precisos y suficientes […] de tal manera que satisfagan los
propósitos del tratamiento"*). Applied, that yields the record specified in **Consequences** below: a
**keyed HMAC** of the identifying key, a suspension timestamp, a coded reason, and nothing else, in a
table separate from `persons`.

Two details carry weight. The hash must be **keyed, not a bare digest** — a plain SHA of a cédula is
trivially brute-forceable and would remain personal data under art. 3(c), *"determinada o
**determinable**"*. (The keyed version is still personal data; the key is what stops it being an open
ledger.) And the blocklist does **not** reopen ADR-0008's `deleted_at` rule: it is a deliberately
designed evidentiary table in exactly that ADR's sense, and it can point at an article.

**On duration the sources support no number.** **Ley 1266's *caducidad* does not apply**: its art. 13
(as substituted by Ley 2157 de 2021) gives the 4- and 8-year figures for *dato negativo financiero*,
but Ley 1581 art. 2(e) expressly excludes Ley 1266 databases from its scope, and C-748 relies on that
split when refusing to import a Ley 1266 rule into Ley 1581. What the habeas-data line behind those
figures does say at the level of principle is that negative data is **temporal** — which argues
*against* an indefinite blocklist rather than for importing a safe harbour. **Indefinite retention is
the hardest position to defend under *razonable y necesario***.

---

## 2. Art. 8(a) against the report record

### 2.1 Does art. 8(a) reach a Report written by another titular? **Yes — settled**

Art. 3(c) defines a *dato personal* as *"cualquier información vinculada o que pueda asociarse a una o
varias personas naturales determinadas o determinables"* — by **association, not authorship**, so one
field can be two people's data at once. Art. 14 obliges us to supply *"**toda la información contenida
en el registro individual o que esté vinculada con la identificación del Titular**"*, and C-748 §2.16.3
restates that as *"toda la información contenida en la base de datos"*. No art. 2 exclusion reaches a
moderation database. The reason code, date and action taken are unambiguously the reported Person's
data; so is the free text, to the extent it is about them.

### 2.2 May the reporter's identity be withheld? **Yes — but not on ADR-0013's basis**

The reporter's identity is **not the reported Person's data at all** — it is the reporter's own, and
art. 14 compels disclosure only of information *"vinculada con la identificación del **Titular**"*.
Handing it over is a *suministro* of a third party's data, and **art. 13 is a closed list**: to *"los
Titulares, sus causahabientes o sus representantes legales"*, to public entities or by court order, or
to *"los terceros autorizados por el Titular o por la ley"*. As to the reporter's identity, the
reported Person is none of these. **Art. 4(f)** (*"sólo podrá hacerse por personas autorizadas por el
Titular y/o por las personas previstas en la presente ley"*), **art. 4(h)** *confidencialidad*, and
**art. 18(j)** (*"permitir el acceso a la información únicamente a las personas que pueden tener acceso
a ella"*) all point the same way.

**ADR-0013 and #31 both reached for arts. 4(g)/17(d) *seguridad*. That is the weakest candidate** — it
governs adulteration and unauthorised access to the store, not an exception to a titular's own access
right. Lead with art. 13 + 4(f)/(h). Arts. 5–6 (*datos sensibles*) are situational reinforcement only:
a `harassment` report can touch *vida sexual*, and where it does art. 6 adds a second independent
reason to restrict. Do not build the general rule on it.

### 2.3 Is a redacted answer lawful? **Unresolved — and the text leans against a thin redaction**

**No redaction regime, no balancing clause and no rights-of-others carve-out exists anywhere** in Ley
1581 or título 2.2.2.25 — a negative finding from reading the título through. What exists pulls toward
completeness: **art. 14** (*"toda la información"*), **art. 11** (*"deberá corresponder **en un todo** a
aquella que repose en la base de datos"*), and **C-748 §2.16.3** importing the *derecho de petición*
standard — *"(i) la respuesta debe ser **de fondo**, es decir, no puede evadirse el objeto de la
petición, (ii) que de forma **completa y clara** se respondan a los interrogantes"*. C-748 acknowledges
the principles are *mandatos de optimización* needing case-by-case *ponderación* where rights collide,
but **never performs that ponderación for a two-titular record, and no article supplies the rule.**

**Safer default, narrower than ADR-0013's.** Answer *completely* on everything that is the reported
Person's own data — reason code, date, action taken, that Reports exist and how many — **and the
substance of the allegation**, with only the reporter's identifying threads removed. Then **state in
the response that third-party identifying data was withheld, and cite arts. 13 and 4(f)/(h)**. A
disclosed redaction is far more defensible than a silent one: the failure C-748 names is *"evadirse el
objeto de la petición"*, and an answer saying what it withheld and why does not evade. **Withholding
the words wholesale is the position most exposed under arts. 11 and 14.**

### 2.4 Can the titular rectify a Report? **Unresolved on the text; three things bite**

**C-748 does not distinguish allegations from facts** — the distinction is absent from the sentencia.
What it says (§2.6.5.2.4) is that data *"deben obedecer a situaciones reales, actualizadas y
**comprobables**"*. ADR-0013's framing survives that on its face: the *comprobable* proposition is
"reporter R submitted code C at time T", and the truth of the allegation is not the datum. **But no
source says so, and nothing forecloses the opposite reading.** What does bite:

1. **Art. 15.2's legend is mandatory and self-executing.** On a complete *reclamo* we **must** write
   `reclamo en trámite` plus its motive into the database within **2 días hábiles** and keep it until
   decided (art. 17(l) says the same toward any Encargado). This is the statute's own mechanism for
   contested-but-not-yet-false data. #5 §4 already flagged it as a persistent flag on affected
   records; **Reports are affected records.**
2. ***Integridad* makes the remedy *adición*, not *supresión*.** Art. 4(d) prohibits *"el Tratamiento
   de datos parciales, incompletos, fraccionados o que induzcan a error"*, and C-748 fn. 212 records a
   tutela granted where an administrator held negative data without recording the subject's answering
   submission. A Report row carrying an accusation with **no field for the reported Person's response**
   is *parcial* in that sense.
3. **C-748 §2.6.5.2.6**: *"queda prohibido generar efectos jurídicos adversos frente a los Titulares,
   con base, **únicamente** en la información contenida en una base de datos."* ADR-0013's refusal of
   every automatic state transition is not only good product design — it is what keeps
   `suspend_person` on the right side of this sentence, and should be cited as such.

---

## What could not be verified

1. **Whether a self-drafted Terms clause qualifies as a *deber contractual* under `2.2.2.25.2.6`.** No
   primary source either way. **The load-bearing uncertainty in §1**, and the first thing for a lawyer.
2. **Any permitted retention term.** No number exists in the regime; whatever #27 picks is our own
   proportionality judgement, defensible only if documented in advance.
3. **SIC guidance on supresión, retention or answering *consultas*** — out of scope by this ticket's
   own terms. #5 §12 item 17 already records that the *responsabilidad demostrada* guía is an
   image-only scan.
4. **Whether a fraud/suspension flag is a *dato sensible*.** Art. 5's list is open (*"tales como"*) and
   its test is data *"cuyo uso indebido puede generar su discriminación"*, which a fraud label in a
   labour-matching context plainly can. Unresolved by any source — and a further argument for the
   blocklist being a hash rather than a readable flag.
5. **C-748 was read from the MinTIC/CRC normogram annex**, which reproduces the sentencia in full, not
   from corteconstitucional.gov.co. Confirm before quoting externally. **T-729/2002, C-1011/2008,
   SU-082/1995, SU-089/1995 and T-1085/2001** were not read and appear only as C-748 characterises
   them — §2.4 point 2 is an analogy from that footnote, not a holding.

---

## Consequences

**Question 1 — what `persons` and the moderation tables must retain.**

- **A suspended Person who has not asked for erasure changes nothing.** Suspension-as-`persons.status`
  stands as ADR-0013 designed it for that case, which is the common one.
- **An art. 15 *supresión* reclamo from a suspended Person must be honoured, narrowed.** #27's erasure
  implementation gets **one enumerated exception branch, not a refusal path**: hard-delete the
  `persons` row and its dependents, and write a blocklist row holding a **keyed HMAC of the normalised
  email (and *documento* if held), a suspension timestamp, and a coded reason — nothing else**, in a
  separate table read only by the registration check.
- **#27 must set and publish a bounded term with automatic purge**, justified against the `safety`
  *finalidad*. Not 4 years, not 8 — Ley 1266 does not apply. The term and the deletion procedure go in
  the Política and the manual interno **before** launch; `2.2.2.25.2.8` makes documenting them a duty
  in its own right.
- **The narrowing must be stated in the response**: resolve within 15 días hábiles, name the ground
  invoked (*deber contractual de permanecer*, `2.2.2.25.2.6`), and confirm everything else was erased.

**Question 2 — what the `/mis-datos` *consulta* response contains.**

- **#26's answer shape for a reported Person**: reason code, date, action taken, the fact and count of
  Reports, **and the substance of the free text with identifying threads removed** — not the text
  withheld wholesale.
- **Never disclosed**: the reporter's identity or any detail that fingerprints them. Basis: art. 13's
  closed list, arts. 4(f) and 4(h), art. 18(j). **Not** arts. 4(g)/17(d).
- **The response must name its own redaction** and cite that basis. A silent partial answer is the
  failure mode C-748 describes.
- **#26 also inherits the art. 15.2 legend on `reports`** — a `reclamo en trámite` marker plus motive,
  set within 2 días hábiles, cleared only on decision. A flag on the record, not a ticket status.
- **`reports` gains a field for the reported Person's response.** Rectification of the allegation is
  refused — the row records that something was *said* — but *adición* is what art. 4(d) points at, and
  a row with no place for the answer is the *parcialidad* the article prohibits.

**ADR-0013 — confirmed in part, amended rather than rewritten.**

- **Confirmed**: Reports rooted on a Person; Suspension as a retained `persons.status`; withholding the
  reporter's identity; no automatic state transition — the last now doing constitutional work.
- **Must change**: *"The Person and the evidence are **retained**, not deleted"*, in ADR-0013 and in
  `CONTEXT.md`'s **Suspension** entry, is **too strong**. It survives an ordinary suspension and does
  not survive an art. 15 *supresión* reclamo. Both should say a suspension survives erasure only as a
  minimal blocklist record, for a bounded term.
- **Must change**: *"withhold the reporter's identity **and their words**"* narrows to *withhold the
  identity and identifying detail; disclose the substance*.
- **Replace** *What this ADR deliberately does not decide* with §1.3, §2.3 and §2.4 — including that
  both questions remain unresolved at the level of authority, with the safer default named.

---

## Sources

- Ley 1581 de 2012 — MinTIC *normograma* consolidated text, carrying the C-748/2011 *Jurisprudencia
  Vigencia* annex: <https://normograma.mintic.gov.co/mintic/compilacion/docs/ley_1581_2012.htm>; CRC
  mirror: <https://normograma.crcom.gov.co/crc/compilacion/docs/ley_1581_2012.htm>
- Decreto 1074 de 2015 título 2.2.2.25 — arts. `2.2.2.25.2.6`, `2.2.2.25.2.8`, `2.2.2.25.4.1`–`4.4`
- Decreto 1377 de 2013 arts. 9 y 11, standalone confirmation of the compiled text:
  <https://normograma.mintic.gov.co/mintic/compilacion/docs/decreto_1377_2013.htm> and
  <https://www.medellin.gov.co/normograma/docs/astrea/docs/decreto_1377_2013.htm>
- Corte Constitucional, Sentencia C-748 de 2011 — ratio on art. 8(e), resolutivo Cuarto, §§2.6.4,
  2.6.5.2.4, 2.6.5.2.6, 2.16.3 and fn. 212
- Ley 1266 de 2008 art. 13 as substituted by Ley 2157 de 2021 art. 3, read only to establish that it
  does **not** apply: <https://normograma.mintic.gov.co/mintic/compilacion/docs/ley_1266_2008.htm>
- **Negative finding, verified by reading the título through**: no article of Ley 1581 or of Decreto
  1074 título 2.2.2.25 prescribes the content of a *consulta* response beyond arts. 11 and 14, and none
  contains a redaction or third-party-rights exception.
