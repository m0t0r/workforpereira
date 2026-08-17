# CPACA art. 52 behind the five-year evidence term: three years, but from when?

Research for [#44](https://github.com/m0t0r/workforpereira/issues/44). Part of the
[Encuentra architecture map (#1)](https://github.com/m0t0r/workforpereira/issues/1). Consumed by
ADR-0021, whose retention table sets `consents` at 5 years from account closure and `data_requests`
at 5 years from `resolved_at` and flags both as provisional.

> **Not legal advice**, and deliberately **not** a counsel-grade brief. This is a reading scoped to
> one build decision — a retention constant in `@repo/db`'s column helpers, from which the published
> _política_ table is generated. Where a question has no clean answer in the primary text it says so
> and names the safer default, rather than reading further.

**Method.** Primary sources only, in Spanish: Ley 1437 de 2011 (CPACA) arts. 47–52, 164 and 308–309;
Ley 1581 de 2012 arts. 15, 16 and 21–24 with the C-748 de 2011 _Jurisprudencia Vigencia_ annex;
Decreto 1377 de 2013 arts. 9 y 11 and Decreto 886 de 2014 (the two decrees compiled into Decreto
1074 título 2.2.2.25); Decreto 01 de 1984 (CCA) art. 38, read only to establish the lineage of the
three-year figure; and Ley 1340 de 2009 arts. 27–28, read only as a contrast. Texts were read from
the MinTIC _normograma_ on 17 August 2026 and **every provision quoted was cross-checked against the
CRC mirror**, byte for byte, exactly as `moderation-record.md` did. The _normograma_'s annotation
apparatus (`Notas de Vigencia`, `Jurisprudencia Vigencia`, `Concordancias`) is served from a separate
JavaScript file and was read from there, not from the rendered page — that is where the amendment
history and the jurisprudence citations actually live. **`funcionpublica.gov.co` and
`secretariasenado.gov.co` were not attempted**; `moderation-record.md` already records both as
unreachable and nothing suggested that changed. `corteconstitucional.gov.co` served C-875 de 2011.
`sic.gov.co` failed TLS verification through the fetch tool and was read with certificate
verification disabled — noted as a caveat on the one item sourced from it.

**Nothing about Ley 1266 is reopened.** `moderation-record.md`'s finding stands and is not disturbed:
Ley 1581 art. 2(e) excludes Ley 1266 databases textually, so the 4/8-year _caducidad del dato
negativo_ is not an anchor and is not cited here. The question below is a different one — the
_caducidad de la facultad sancionatoria_, which is about how long the regulator may punish, not how
long a datum may live.

---

## The answer, in seven lines

1. **CPACA art. 52 does apply to the SIC's sanctioning power under Ley 1581, by two independent
   routes.** Ley 1581 art. 22 inciso 2 remits expressly to the _Código Contencioso Administrativo_ in
   everything the statute does not regulate, and C-748 de 2011 declared art. 22 exequible **because
   of** that _reenvío_. Independently, CPACA art. 47 applies Parte Primera to any sanctioning
   procedure _"no regulado por leyes especiales"_. **Ley 1581 prescribes no _caducidad_ and neither
   does título 2.2.2.25** — a negative finding from reading both through — so art. 52's opening
   reservation, _"Salvo lo dispuesto en leyes especiales"_, has nothing to bite on.
2. **The current text is the original one.** Art. 52 has never been amended: no `Notas de Vigencia`
   in either mirror, and the string `1955` does not occur anywhere in the consolidated CPACA. Ley
   2080 de 2021 rewrote arts. 47, 48 and 49 around it and left 52 alone.
3. **ADR-0021's "three years from the act" is the wrong half of the article.** Art. 52 inciso 2:
   _"Cuando se trate de un hecho o conducta continuada, este término se contará desde el día
   siguiente a aquel en que cesó la infracción y/o la ejecución."_ Holding personal data without
   valid consent evidence is _conducta continuada_ on any natural reading, so the clock starts when
   the treatment **stops** — which for us is account closure, and for a _reclamo_ is its resolution.
   **ADR-0021 already anchors both terms at exactly those two events.**
4. **The three years must contain the whole procedure, not just its opening.** The sanctioning act
   must have been _"expedido **y notificado**"_ inside the term. The _formulación de cargos_ is
   therefore not a finish line and does not stop the clock.
5. **Nothing tolls it.** No interruption or suspension rule exists anywhere in CPACA's sanctioning
   chapter — verified by reading arts. 47–52 through. A _reclamo_ in flight does not toll it either;
   Ley 1581 art. 16 makes the _reclamo_ a **requisito de procedibilidad** for a _queja_, which
   compresses the SIC's window rather than extending it.
6. **One counter-current, and it is not on point.** A 2023 Tribunal Administrativo de Cundinamarca
   judgment starts the clock at the authority's _"real y efectivo conocimiento"_ of the facts — but
   it construes **Ley 1340 art. 27** (competition, five years), not art. 52, and Ley 1340 art. 28
   confines itself to competition. It is a reason to keep margin, not an authority to count from.
7. **Five years is defensible and I recommend keeping it.** Three years from account closure is the
   regulatory floor; CPACA art. 164.2(d) then gives the sanctioned party four months to sue and the
   contentious action runs for years after that. **Five years from account closure / `resolved_at` is
   the floor plus roughly two years of litigation tail — the number does not change. The reasoning
   does.**

---

## 1. Does art. 52 reach the SIC's power under Ley 1581?

### 1.1 Ley 1581 sets sanctions and no term at all

**Ley 1581 art. 23** enumerates what the SIC may impose — multas up to 2,000 SMMLV, suspensión of
treatment up to six months, cierre temporal, cierre inmediato y definitivo for _datos sensibles_ —
and **art. 24** gives six graduation criteria. Neither article, and no other article of the statute,
mentions _caducidad_, _prescripción_ or any period within which the power must be exercised.
Confirmed by reading the whole law: every occurrence of `caduc` in the MinTIC text sits inside the
C-748 annex and refers to the _caducidad del dato negativo_ — the habeas-data principle — not to the
sanctioning power.

What art. 22 does instead is remit:

> **ARTÍCULO 22. TRÁMITE.** La Superintendencia de Industria y Comercio, una vez establecido el
> incumplimiento de las disposiciones de la presente ley […] adoptará las medidas o impondrá las
> sanciones correspondientes.
>
> **En lo no reglado por la presente ley y los procedimientos correspondientes se seguirán las normas
> pertinentes del Código Contencioso Administrativo.**

### 1.2 C-748 upheld art. 22 *because of* that remission

The Defensoría del Pueblo argued in the C-748 review that a statutory law may not delegate its
procedure by cross-reference and that art. 22 was therefore unconstitutional. The Corte disagreed,
and the reason it gave is the load-bearing part for us:

> La Sala encuentra que en el procedimiento que debe aplicarse para la imposición de las sanciones se
> hace un **reenvío al Código Contencioso Administrativo**; es decir, pese a que el legislador
> estatutario expresamente **no consagró "el procedimiento"** para la aplicación de las sanciones
> contempladas en el artículo 23, ese reenvío permite señalar que el inciso se ajusta al artículo 29
> de la Constitución, toda vez que sí existe un procedimiento específico que debe aplicar la
> autoridad de protección del dato […]

> El anterior recorrido normativo, le permite a la Sala concluir que el procedimiento que consagra el
> Código Contencioso Administrativo garantiza los derechos al debido proceso y defensa, razón por la
> que se declarará **exequible el artículo 22** del proyecto de ley en revisión.

So the general administrative code is not a fallback the SIC may take or leave — it is the only
reason Ley 1581's sanctioning title survived constitutional review. **Ley 1581 is a _ley especial_
that does not regulate its own sanctioning procedure**, which is the exact case art. 47 addresses.

### 1.3 The remission now lands on CPACA

C-748 was decided in 2011 and analysed _"el artículo 28 y siguientes"_ of the then-CCA, Decreto 01 de
1984. **CPACA art. 309 derogated that code** from the date fixed by art. 308 (2 July 2012), and
CPACA's own art. 47 makes the point without needing the remission at all:

> **ARTÍCULO 47. PROCEDIMIENTO ADMINISTRATIVO SANCIONATORIO.** Los procedimientos administrativos de
> carácter sancionatorio **no regulados por leyes especiales** o por el Código Disciplinario Único se
> sujetarán a las disposiciones de esta Parte Primera del Código. **Los preceptos de este Código se
> aplicarán también en lo no previsto por dichas leyes.**

Two routes, one destination. Art. 47's second sentence is the stronger of the two, because it does
not depend on reading Ley 1581's reference to a repealed code as a reference to its successor.

### 1.4 The three-year figure is older than CPACA

The _normograma_'s `Concordancias` for art. 52 point at **CCA art. 38**, which read:

> **ARTICULO 38. CADUCIDAD RESPECTO DE LAS SANCIONES.** Salvo disposición especial en contrario, la
> facultad que tienen las autoridades administrativas para imponer sanciones caduca a los **tres (3)
> años** de producido el acto que pueda ocasionarlas.

That is the text C-748 had in view when it upheld art. 22. CPACA kept the three years and tightened
them — see §2. So the three-year exposure window is continuous across the 2012 handover, and there is
no gap in which a longer term applied.

### 1.5 What a real *ley especial* looks like

Worth stating because it shows what art. 52's reservation is for. **Ley 1340 de 2009 art. 27** gives
the SIC a *different* term for competition matters:

> **ARTÍCULO 27. CADUCIDAD DE LA FACULTAD SANCIONATORIA.** La facultad que tiene la autoridad de
> protección de la competencia para imponer una sanción por la violación del régimen de protección de
> la competencia caducará transcurridos **cinco (5) años** de haberse ejecutado la conducta violatoria
> o del **último hecho constitutivo** de la misma en los casos de conductas de tracto sucesivo, sin
> que el acto administrativo sancionatorio haya sido notificado.

And **art. 28** confines it: _"Las competencias asignadas, mediante la presente ley, a la
Superintendencia de Industria y Comercio se refieren **exclusivamente** a las funciones de protección
o defensa de la competencia […]"_. The legislature writes a special term when it wants one, and it
did not write one for data protection. **The SIC wearing two hats does not import the competition
term into habeas data.**

---

## 2. From when do the three years run?

The consolidated text, identical on both mirrors, unamended:

> **ARTÍCULO 52. CADUCIDAD DE LA FACULTAD SANCIONATORIA.** Salvo lo dispuesto en leyes especiales, la
> facultad que tienen las autoridades para imponer sanciones **caduca a los tres (3) años de ocurrido
> el hecho, la conducta u omisión que pudiere ocasionarlas**, término dentro del cual el acto
> administrativo que impone la sanción **debe haber sido expedido y notificado**. Dicho acto
> sancionatorio es diferente de los actos que resuelven los recursos, los cuales deberán ser
> decididos, so pena de pérdida de competencia, en un término de un (1) año contado a partir de su
> debida y oportuna interposición. Si los recursos no se deciden en el término fijado en esta
> disposición, se entenderán fallados a favor del recurrente, sin perjuicio de la responsabilidad
> patrimonial y disciplinaria que tal abstención genere para el funcionario encargado de resolver.
>
> **Cuando se trate de un hecho o conducta continuada, este término se contará desde el día siguiente
> a aquel en que cesó la infracción y/o la ejecución.**
>
> La sanción decretada por acto administrativo prescribirá al cabo de cinco (5) años contados a
> partir de la fecha de la ejecutoria.

Three things follow, and ADR-0021 gets the first one wrong.

**The default start is the act; the continuing-conduct rule displaces it.** Inciso 1 counts from
_"ocurrido el hecho, la conducta u omisión"_. Inciso 2 is the exception, and it is written as a rule
of general application, not as a carve-out for a listed class of infraction. **Unlawful retention is
the paradigm _conducta continuada_**: it is not an act completed at a moment but a state maintained
day after day, and it is the omission of a duty — `2.2.2.25.2.8`'s _"deberán proceder a la
supresión"_ — that persists until performed. On that reading the clock on a consent defect starts
when the treatment stops, which is **account closure**; and on a mishandled _reclamo_, when the
_reclamo_ is resolved. **No Colombian source says this in terms for Ley 1581**, and that is a
genuine gap; but the alternative reading (that each day's holding is a fresh completed _hecho_)
produces a clock that also never expires while the data is held, which lands in the same place for
our purposes. Either way, **the term cannot run out while we still hold the record**.

**It is not the _formulación de cargos_.** The article requires the sanctioning act to be _"expedido
y notificado"_ inside the three years. CPACA art. 47 inciso 2 puts the _formulación de cargos_ near
the **start** of the procedure — _"Concluidas las averiguaciones preliminares, si fuere del caso,
formulará cargos mediante acto administrativo"_, followed by fifteen days for _descargos_, then arts.
48–49's probatory period and thirty days to decide. The whole of that has to fit inside the window.
The one thing that does escape it is the resolution of the _recursos_, which art. 52 expressly calls
a different act and gives its own one-year clock — the sentence the Corte Constitucional declared
exequible in **C-875 de 2011** (22 November 2011, M.P. Jorge Ignacio Pretelt Chaljub), the only
jurisprudence annotation the _normograma_ carries on art. 52.

**A Tribunal has counted from the regulator's knowledge — under a different article.** The SIC's own
_boletín jurídico_ publishes **Tribunal Administrativo de Cundinamarca, Sección Primera, Subsección
B, 7 September 2023, exp. 25000-23-41-000-2019-00249-00** (M.P. César Giovanni Chaparro Rincón,
_Bureau Veritas Colombia y Tecnicontrol v. SIC_):

> […] la administración cuenta con un término de cinco (5) años, contados a partir del conocimiento
> del hecho que da origen a la sanción **o a partir de la cesación de la conducta continuada, lo que
> ocurra de último**, para iniciar la correspondiente investigación administrativa, proferir la
> decisión de fondo y notificarla. Sin embargo […] también se debe tener en cuenta la fecha en la que
> la SIC tuvo **real y efectivo conocimiento** de tal hecho, ya que antes le resultaría imposible
> ejercer su facultad sancionatoria.

**This is not authority on art. 52.** The case is an _acuerdo colusorio_ under Ley 155 de 1959 and
the term applied is **Ley 1340 art. 27**'s five years, in the field art. 28 fences off. It is a
Tribunal, not the Consejo de Estado. What it is worth to us is a warning about the shape of the
reasoning: a Colombian administrative court, construing a caducidad written to run from the conduct,
read it as running from the **later** of cessation and the regulator's actual knowledge. If that
reasoning ever reached art. 52 in a habeas-data case, our exposure would start after account closure
rather than at it — and margin over the bare three years is what absorbs that.

---

## 3. Does anything toll it?

**No — and this is a negative finding from reading CPACA arts. 47 to 52 through, on both mirrors.**
The sanctioning chapter contains no rule interrupting or suspending the caducidad. The only
occurrence of _interrumpir_ near it runs the other way: **art. 51 parágrafo**, on the separate
_renuencia_ sanction for refusing to hand over information, says that actuación _"**no suspende ni
interrumpe** el desarrollo del procedimiento administrativo sancionatorio"_ — the code legislating
that a collateral proceeding leaves the main clock alone.

Specifically:

- **An open SIC investigation does not toll it.** That is the whole point of requiring the sanction
  to be _expedido y notificado_ within the term: the investigation happens **inside** the three
  years, it does not pause them.
- **The _formulación de cargos_ does not toll it.** See §2.
- **A _reclamo_ in flight does not toll it, and cuts the other way.** **Ley 1581 art. 16**: _"El
  Titular o causahabiente **sólo podrá elevar queja** ante la Superintendencia de Industria y
  Comercio **una vez haya agotado** el trámite de consulta o reclamo ante el Responsable […]"_. Art.
  15.3 gives the responsable fifteen _días hábiles_, extendable by eight. So the statutory path to
  the SIC spends weeks of the regulator's own window before the SIC hears of the matter at all —
  a compression, not an extension. (The **Bureau Veritas** knowledge rule, if it ever applied here,
  would neutralise that compression; it would not create a tolling rule.)
- **The _prescripción_ in inciso 3 is a different animal.** Five years from _ejecutoria_ governs the
  life of a sanction already imposed — collection — not the time available to impose one. It is not
  an argument for a five-year retention term, and it is not used as one below.

---

## 4. Is five years defensible?

**Yes. Keep it. The number does not change; two sentences of ADR-0021's reasoning do.**

The standard is unchanged and remains the only one there is — but its full text matters more than
the excerpt `moderation-record.md` quoted. **Decreto 1377 de 2013 art. 11 = `2.2.2.25.2.8`**, quoted
here without the elision:

> Los Responsables y Encargados del Tratamiento solo podrán recolectar, almacenar, usar o circular
> los datos personales durante el tiempo que sea **razonable y necesario**, de acuerdo con las
> finalidades que justificaron el tratamiento, **atendiendo a las disposiciones aplicables a la
> materia de que se trate y a los aspectos administrativos, contables, fiscales, jurídicos e
> históricos de la información**.

The clause after the comma is the one that authorises what ADR-0021 is doing. The decree does not
merely permit a retention term calibrated to legal exposure — it **names the _aspectos jurídicos_ of
the information as a factor to be weighed**. Anchoring the consent-evidence term to the window in
which that evidence could be demanded of us is the decree's own method, not a workaround for its
silence.

Applied:

| Component                                                | Source                 | Runs from            |
| -------------------------------------------------------- | ---------------------- | -------------------- |
| SIC may investigate, decide and **notify** a sanction    | CPACA art. 52 inciso 1 | cessation (inciso 2) |
| Sanctioned party may sue in _nulidad y restablecimiento_ | CPACA art. 164.2(d)    | notification         |
| The contentious action itself                            | —                      | filing               |
| **Total, from account closure / `resolved_at`**          |                        | **3 y + 4 m + tail** |

Three years is the floor, and it is a floor we cannot shave: it starts at account closure, not
before, because that is when the _conducta continuada_ ceases. **CPACA art. 164.2(d)** then adds four
months in which we may be sued over the sanction, and the evidence that answered the SIC is the
evidence that answers the Tribunal. **Five years is that floor plus about twenty months of tail.**

Why not a different number:

- **Three years is too tight.** It expires the day the SIC's power does, leaving nothing for the four
  months to sue, nothing for the contentious action, and nothing for the Bureau Veritas risk that
  the clock starts later than account closure.
- **Four years would also be arguable**, and is the tightest number I would sign: floor plus the four
  months plus a year. It buys little over five and gives up the whole litigation tail.
- **Six years or more starts failing _razonable y necesario_.** Past the point where any regulatory
  or contentious exposure survives, the retention has no _finalidad_ left to serve, and
  `2.2.2.25.2.8` sentence two obliges deletion.
- **Ley 1266's 4/8 years remain irrelevant** and the coincidence between "four" and Ley 1266's first
  figure is exactly that. Not cited, per `moderation-record.md`.

**Explicitly: this does not change ADR-0021's figure.** `consents` stays at 5 years from account
closure and `data_requests` at 5 years from `resolved_at`. What changes is the sentence beneath the
table, in three respects:

1. **"three years from the act" → three years from the cessation of the conduct**, per art. 52 inciso
   2 — which is why anchoring at account closure and at `resolved_at` is the right anchor rather than
   an approximation of one.
2. **Art. 52 applies _supletoriamente_, not directly** — via CPACA art. 47 and Ley 1581 art. 22, with
   C-748 upholding art. 22 on precisely that basis. Worth one clause, because it is the answer to
   "does the general code really reach a statutory-law regime".
3. **"That article was not read" comes out**, and the five years stops being provisional. It is now a
   documented proportionality judgement with a named anchor — which is what `2.2.2.25.2.8` sentence
   two requires of it.

---

## What could not be verified

1. **No Colombian source characterises unlawful data retention as _conducta continuada_ under art.
   52.** The classification is mine, from the text of inciso 2 and the nature of the duty in
   `2.2.2.25.2.8`. It is the load-bearing inference in this note, and the first thing for a lawyer.
   It is also the *safe* direction to be wrong in: if the conduct were instead treated as completed
   at the moment of collection, the SIC's window would close **earlier** and five years would be more
   than enough, not less.
2. **No decision of the Consejo de Estado or the Corte Constitucional applying art. 52 to a Ley 1581
   sanction was found.** C-875 de 2011 construes art. 52's _recursos_ sentence, not its caducidad.
   The _normograma_'s annotation apparatus for art. 52 carries **one** jurisprudence entry, C-875, and
   nothing else — so the absence is not merely a failed search, it is what the official consolidated
   text records.
3. **Consejo de Estado, Sección Primera, exp. 2001-00986-01 of 9 June 2011 (C.P. Marco Antonio Velilla
   Moreno), flagged in the _normograma_ as _unificación jurisprudencial_ on CCA art. 38, was not
   read.** It is the likely origin of the _"expedido y notificado"_ rule that CPACA art. 52 later
   codified. Since the rule is now in the statute verbatim, nothing here rests on it.
4. **The Bureau Veritas judgment was read from a `sic.gov.co` PDF whose TLS chain the fetch tool could
   not verify** (`unable to verify the first certificate`); it was downloaded with verification
   disabled. The document is internally consistent and self-identifying, but it is a Tribunal
   judgment obtained from the losing party's own website and is used here only as a warning, never as
   authority.
5. **SIC guidance on retention was not read** — the same scope limit `moderation-record.md` set, and
   the same reason: it does not surface cheaply and would not change a term anchored in the statute.
6. **Nothing was verified about what the SIC does in practice** — how long its investigations
   actually take, or whether it has ever sanctioned on a consent-evidence failure. That is a
   different research question and does not bear on the term.

---

## Consequences

**ADR-0021 — figure confirmed, reasoning corrected.** The `consents` and `data_requests` rows of the
retention table stand at 5 years. The paragraph beneath the table should drop "provisional", drop
"three years from the act", and say instead: **CPACA art. 52 gives the SIC three years to expedir and
notificar a sanction, counted from the cessation of the conduct (inciso 2) — which for a consent
record is account closure and for a _reclamo_ is its resolution — with no tolling; five years is that
window plus the four months of CPACA art. 164.2(d) and a litigation tail.** Cite art. 52 with art. 47
and Ley 1581 art. 22, and `2.2.2.25.2.8`'s _aspectos jurídicos_ clause as the authority for
calibrating a term to legal exposure at all.

**`moderation-record.md` — one quotation is thinner than it should be.** Its §1.2 renders
`2.2.2.25.2.8` with an ellipsis that swallows _"atendiendo a las disposiciones aplicables a la
materia de que se trate y a los **aspectos administrativos, contables, fiscales, jurídicos** e
históricos de la información"_. That clause is not decoration — it is the decree telling a responsable
which factors a retention term may be built from, and it is the difference between "the regime
supplies a proportionality standard and nothing else" and "the regime supplies a proportionality
standard and names its inputs". The file's conclusion is unaffected; the quotation is worth widening
if it is ever edited.

**No other ADR is touched**, and nothing here reopens ADR-0007, ADR-0008 or ADR-0013.

---

## Sources

- **Ley 1437 de 2011 (CPACA)**, consolidated text — arts. 47, 47A, 48, 49, 51, 52, 164.2(d), 306–309.
  MinTIC: <https://normograma.mintic.gov.co/mintic/compilacion/docs/ley_1437_2011.htm>; CRC mirror:
  <https://normograma.crcom.gov.co/crc/compilacion/docs/ley_1437_2011.htm>. Art. 52 verified **byte
  for byte identical on both**.
- **CPACA annotation apparatus**, read from the _normograma_'s data file rather than the rendered
  page: <https://normograma.mintic.gov.co/mintic/compilacion/docs/js/ley_1437_2011.js>. Art. 52
  carries exactly two entries — `Jurisprudencia Vigencia`: C-875 de 2011; `Concordancias`: CCA art.
  38, Ley 4 de 1913 arts. 59 y 62.
- **Corte Constitucional, Sentencia C-875 de 2011** (22 November 2011, M.P. Jorge Ignacio Pretelt
  Chaljub), declaring exequible art. 52's _"Si los recursos no se deciden […] se entenderán fallados
  a favor del recurrente"_: <https://www.corteconstitucional.gov.co/relatoria/2011/C-875-11.htm>
- **Ley 1581 de 2012** — arts. 15, 16, 22, 23, 24, with the C-748 de 2011 _Jurisprudencia Vigencia_
  annex (§2.21 on art. 22). MinTIC:
  <https://normograma.mintic.gov.co/mintic/compilacion/docs/ley_1581_2012.htm>; CRC mirror:
  <https://normograma.crcom.gov.co/crc/compilacion/docs/ley_1581_2012.htm>
- **Decreto 1377 de 2013 art. 11** (= Decreto 1074 de 2015 art. `2.2.2.25.2.8`), quoted unelided:
  <https://normograma.mintic.gov.co/mintic/compilacion/docs/decreto_1377_2013.htm>
- **Decreto 886 de 2014** (the RNBD half of título 2.2.2.25), read only to confirm the negative
  finding: <https://normograma.mintic.gov.co/mintic/compilacion/docs/decreto_0886_2014.htm>
- **Decreto 01 de 1984 (CCA) art. 38**, read only for the lineage of the three-year term:
  <https://normograma.mintic.gov.co/mintic/compilacion/docs/codigo_contencioso_administrativo.htm>
- **Ley 1340 de 2009 arts. 27 y 28**, read only as a contrast — a real _ley especial_ term, confined
  to competition: <https://normograma.mintic.gov.co/mintic/compilacion/docs/ley_1340_2009.htm>
- **Tribunal Administrativo de Cundinamarca, Sección Primera, Subsección B, 7 September 2023, exp.
  25000-23-41-000-2019-00249-00**, via the SIC _boletín jurídico_ (TLS chain unverifiable; downloaded
  with verification disabled):
  <https://www.sic.gov.co/content/acerca-del-cómputo-de-la-caducidad-de-la-facultad-sancionatoria> →
  <https://www.sic.gov.co/sites/default/files/normativa-boletin-juridico/Sentencia-25000-23-41-000-2019-00249-00.pdf>
- **Negative finding, verified by reading Ley 1581 through on two mirrors**: no article of the
  statute prescribes a _caducidad_ or _prescripción_ of the SIC's sanctioning power. Every occurrence
  of `caduc` in the text belongs to the C-748 annex and concerns the _caducidad del dato negativo_.
- **Negative finding, verified by reading both compiled decrees through**: neither Decreto 1377 de
  2013 nor Decreto 886 de 2014 — together, Decreto 1074 título 2.2.2.25 — contains the word
  _caducidad_ at all, let alone a term.
- **Negative finding, verified on the consolidated text and its annotation file**: CPACA art. 52 has
  never been amended. It carries no `Notas de Vigencia` in either mirror, and the string `1955` does
  not occur anywhere in the consolidated CPACA — **Ley 1955 de 2019 never touched this code**. Ley
  2080 de 2021 amended arts. 47 (parágrafo 2), 48 (parágrafo) and inserted 47A and 49A, all confined
  to the _procedimiento sancionatorio fiscal_, and left art. 52 untouched.
- **Negative finding, verified by reading CPACA arts. 47–52 through**: the sanctioning chapter
  contains no rule tolling, interrupting or suspending the art. 52 caducidad. The only nearby
  occurrence of _interrumpe_ is art. 51's parágrafo, denying that effect to the _renuencia_ actuación.
