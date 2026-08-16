# Brief for counsel: does Encuentra require SPE authorisation?

Research for [#23](https://github.com/m0t0r/workforpereira/issues/23). Part of the map,
[#1](https://github.com/m0t0r/workforpereira/issues/1). Follows on from
[#5](https://github.com/m0t0r/workforpereira/issues/5) §10, in
[`ley-1581-obligations.md`](./ley-1581-obligations.md).

> **This is not legal advice, and it does not answer the question.** It is engineering research,
> gathered from primary sources, written so that a Colombian *abogado laboralista* can answer in one
> sitting. It says what the primary text says, marks precisely where the text runs out, and turns the
> unclear part into questions. It deliberately reaches **no conclusion** on whether Encuentra is or is
> not inside the regime.

**Method.** Primary sources only, read in Spanish, in full rather than in snippets. Statutory and
regulatory text from the Función Pública *Gestor Normativo*, the Senate's *basedoc* compilation, and —
where funcionpublica.gov.co served a defective article or refused the request — the Colpensiones
normogram, a compilation published on a `.gov.co` domain that renders the same *Notas de Vigencia*
apparatus. Official UAESPE publications from `serviciodeempleo.gov.co`. Law-firm commentary and blog
posts were used only to locate primary text and are never a finding here. Where only a secondary source
exists, it is labelled as such and the claim is marked unverified. **Two official renderings were found
to be defective and are flagged at the point of use** (§1.2 and §7 item 5).

---

## 1. The one-page brief

**The client.** *Encuentra* — a free, Spanish-language web platform for Pereira and Risaralda. **One
account type: a natural person.** A person publishes a **capability profile** (what they can do) and/or
a **need** (work they want done). Others search **by skill and location**; the platform **suggests
matches algorithmically**, pull-first. Connection is a **structured offer** with stated terms, answered
yes or no. **Contact details are released only when an offer is accepted.** **No money moves through
the platform. No CVs are forwarded by the operator. No employment relationship is created or verified.**
The operator today is a **natural person**, not a company. Nobody is charged anything, ever.

**The question.** Does that require prior authorisation as a *prestador del Servicio Público de Empleo*
under **Ley 1636 de 2013 art. 32** and **Decreto 1072 de 2015 Título 6** — and if so, what follows?

**What the primary text says, in five lines.**

1. The trigger is a **general clause with no exceptions**: *servicios de gestión y colocación de empleo*
   are *"todas aquellas actividades que faciliten el encuentro entre oferta y demanda laboral"*
   (Ley 1636 art. 29 num. 1, as replaced by Ley 2225 de 2022 art. 11). The 2022 amendment made it
   **broader**, deleting the old lit. b) that had covered merely *"brindar información"*.
2. The **four basic services** are *registro, orientación ocupacional, preselección, **remisión***
   (`2.2.6.1.2.17`, as replaced by Decreto 1823 de 2020 art. 4). **Encuentra plainly performs *registro***
   — and *registro* expressly includes self-service, *"de manera autónoma o asistida por el prestador"*.
3. **The two definitions that decide the rest** are in Resolución 3229 de 2022's Anexo Técnico:
   *Preselección* is *"Identificación entre los oferentes o buscadores registrados, aquellos que cumplan
   con el perfil requerido en la vacante, **mediante acciones generadas por el sistema de información
   autorizado**"*; *Remisión* is *"Acciones que permiten **poner a disposición del potencial empleador,
   las hojas de vida** de los oferentes o buscadores preseleccionados"*. **Note that *remisión* is defined
   by availability of the *hoja de vida*, not by disclosure of contact details** — so our
   contact-gating design does not, by itself, answer it (§2.4).
4. Only **authorised *personas jurídicas*** may provide these services (`2.2.6.1.2.18` par. 1; Res. 3229
   art. 2) — but **Ley 1636 art. 38 sanctions *"las personas naturales o jurídicas"*** who provide them
   without authorisation, **1 to 5.000 SMMLV**, with successive fines and *"sin perjuicio de las acciones
   penales"*.
5. **Being free is not an exemption.** `2.2.6.1.2.4` (*gratuidad para el trabajador*) is a **duty imposed
   on providers inside the regime**, not a test for whether you are one. And **no carve-out for
   platforms, portals, marketplaces, classifieds or *medios de comunicación* exists anywhere** in Ley
   1636, Ley 2225, Decreto 1823 or Decreto 1072 Título 6 — verified by exhaustive negative search
   (§1.5). The regulator already has a name for a web portal delivering these services: a ***Punto
   Virtual*** (§1.4).

**What we could not find, having looked hard for it.** **No UAESPE concepto, MinTrabajo circular, court
decision or sanction resolution addressing job portals, platforms, or the difference between
*publicación* and *intermediación* — in either direction.** See §7 item 1 for exactly what was searched.

**What practice shows.** UAESPE's own December 2025 provider bulletin records **211 authorised
providers** and **134 puntos virtuales**, and its authorised list includes the operators of Computrabajo,
elempleo, Magneto, hoytrabajas, miEmpleo, Coally, Hunty and more — **the Colombian online job-platform
market operates from inside the regime** (§1.6). Not a ruling; the clearest signal available.

**The two arguments worth counsel's time.** Not *"we only connect people"* — that is the weakest of
them, because *connecting* is what the general clause describes. Rather:
**(a)** the regime's every operative term is an **employment** term (*empleo*, *empleador*, *vacante*,
*trabajador*, *colocación*), and Encuentra brokers **paid work that is often not employment at all**
(§3 item 1); and **(b)** the decree's rules are addressed throughout to ***personas jurídicas***, which
Encuentra's operator is not (§5) — an argument that must survive Ley 1636 art. 38.

**What we need from you.** The twelve questions in §4. Question 1 governs everything; **question 5 is the
sharpest and determines what we build next**; question 7 (enforcement practice) would be worth more than
all the textual argument here.

The rest of this document is the supporting detail.

### 1.1 The regime, in five sentences

Colombia treats *gestión y colocación de empleo* as a **public service**. **Ley 1636 de 2013 art. 25**
says it is *"un servicio obligatorio, cuya dirección, coordinación y control está a cargo del Estado"*
and that *"La prestación del servicio podrá hacerse de manera personal y/o virtual"* — virtual
delivery is contemplated at statutory level. **Art. 32** says *"Para ejercer la actividad de gestión y
colocación de empleo, se requerirá la autorización expedida mediante resolución motivada, expedida
por la Subdirección de Promoción y Generación de Empleo del Ministerio del Trabajo."* **Art. 38**
punishes doing it without authorisation with a fine of *"uno (1) a cinco mil (5.000) salarios mínimos
legales vigentes"*, plus *"multas sucesivas"* if it continues — and it is addressed to *"Las personas
naturales o jurídicas"*. The implementing detail is **Decreto 2852 de 2013, compiled into Decreto 1072
de 2015, Libro 2, Parte 2, Título 6, Capítulo 1, Sección 2** (`2.2.6.1.2.x`), heavily amended by
**Decreto 1823 de 2020**, with the operational detail in **MinTrabajo Resolución 3229 de 2022** and its
*Anexo Técnico*.

### 1.2 The trigger clause is a general clause, and it got broader in 2022

This is the single most important thing for counsel to see, and it is a **refinement of what #5
recorded**. #5 framed the trigger as a four-item disjunctive list. The text is broader than that: the
list defines what an authorised provider must *deliver*; the **trigger** is a general clause.

**Ley 1636 art. 29, as replaced by Ley 2225 de 2022 art. 11** — the text now in force:

> **Artículo 29.** *Servicios de gestión y colocación de empleo se entienden por servicios de gestión y
> colocación de empleo a cargo de los prestadores del servicio público de empleo.*
>
> *1. **todas aquellas actividades que faciliten el encuentro entre oferta y demanda laboral.***
>
> *2. todas aquellas actividades que conlleven al mejoramiento de las condiciones de empleabilidad y la
> mitigación de barreras para el acceso y permanencia a un empleo.*

The article has two parágrafos, and **neither is an exception**: parágrafo 1 says *"El Ministerio de
Trabajo fijará las reglas para la prestación de los servicios"*, parágrafo 2 obliges Cajas de
Compensación Familiar to provide the service with prior authorisation. **There is no proviso, no
exception and no qualifier on numeral 1 anywhere in the article.**

The 2022 amendment made the clause *broader*, and it did so by **deleting the one category that came
closest to "we just publish information"**. The 2013 original read:

> *a) Los servicios destinados a vincular ofertas y demandas de empleo;*
> *b) Otros servicios relacionados con la búsqueda de empleo, determinados por el Ministerio del
> Trabajo, **como brindar información, sin estar por ello destinados a vincular una oferta y una
> demanda específicas**;*
> *c) Servicios que, asociados a los de vinculación de la oferta y demanda de empleo, tengan por
> finalidad mejorar las condiciones de empleabilidad de los oferentes.*

Note two things about old lit. b). First, mere information provision *not* aimed at linking a specific
offer to a specific demand was **inside** the regime, not outside it — it was a species of *servicio de
gestión y colocación*. Second, it was hedged by *"determinados por el Ministerio del Trabajo"*, so it
arguably bit only once MinTrabajo designated such a service. **Both the category and the hedge are gone
as of Ley 2225 de 2022.** What remains is the unqualified general clause in numeral 1.

The same general clause is the chapeau of the compiled decree article, **`2.2.6.1.2.17`** (as replaced
by Decreto 1823 de 2020 art. 4):

> *Se entienden por servicios de gestión y colocación de empleo a cargo de los Prestadores autorizados
> del Servicio Público de Empleo, **todas aquellas actividades que facilitan el encuentro entre oferta y
> demanda laboral**, el mejoramiento de las condiciones de empleabilidad y la mitigación de barreras
> para el acceso y permanencia a un empleo formal. Estos servicios podrán ser básicos y especializados.*
>
> *Los servicios básicos son aquellos que garantizan las condiciones mínimas para el encuentro entre
> oferta y demanda laboral, y comprenden las siguientes actividades:*
>
> *1. Registro de oferentes o buscadores, potenciales empleadores y vacantes.*
> *2. Orientación ocupacional a oferentes o buscadores y potenciales empleadores.*
> *3. Preselección.*
> ***4. Remisión.***

**A source-quality warning that matters.** Función Pública's rendering of the *compiled* article
`2.2.6.1.2.17` **stops at "3. Preselección" and omits "4. Remisión"** — `norma.php?i=72173`. Función
Pública's rendering of the *amending* decree, **Decreto 1823 de 2020 art. 4** — `norma.php?i=154447` —
**does contain "4. Remisión."**, as does UAESPE's own current guidance (§1.4). This confirms #5 §12
item 14(a): the compiled-article page is defective. **Do not quote `norma.php?i=72173` for this article
in anything formal**; quote Decreto 1823 art. 4, or the Diario Oficial.

### 1.3 Who may be authorised, and what it costs to be one

- **`2.2.6.1.2.18`** (Decreto 1823 art. 5) — MinTrabajo *"podrá otorgar autorización […] a las personas
  jurídicas de derecho público o privado que la soliciten. **Cuando los servicios de gestión y
  colocación de empleo sean prestados utilizando exclusivamente medios electrónicos, la autorización se
  entenderá otorgada para todo el territorio nacional.**"* Term: **four years**. **PARÁGRAFO 1: *"Solo
  las personas jurídicas autorizadas podrán prestar los servicios de gestión y colocación de que trata
  el artículo 29 de la Ley 1636 de 2013."*** (§5 unpacks that sentence.)
- **`2.2.6.1.2.19`** (Decreto 1823 art. 6) — four documents *"como mínimo"*: the constitutive act **with
  *gestión y colocación de empleo* in the corporate object**; certificate of existence and legal
  representation; a **Reglamento de Prestación de Servicios**; and a **Proyecto de Viabilidad**. Special
  authorisation is needed to place workers abroad. **No surety bond** — see §6.
- **`2.2.6.1.2.20`** (Decreto 1823 art. 7) — sixteen standing obligations, including: all basic services
  **free to the *oferente*** (num. 4); *"Verificar que los empleadores que se registran y publican
  vacantes en el Servicio Público de Empleo **estén legalmente constituidos**"* (num. 7); *"Velar por la
  correcta relación entre las características de la vacante respecto al perfil de los oferentes o
  buscadores **remitidos**"* (num. 8); and, in all promotion, *"hacer constar la condición en que actúa,
  **mencionando el número del acto administrativo mediante el cual fue autorizado**"* (num. 10).
- **`2.2.6.1.2.21`–`.23`** — a **sistema de información propio** whose functional and technical
  characteristics, **interoperability and compatibility with the SISE**, are defined by UAESPE.
- **Money.** `2.2.6.1.2.4`: basic activities *"serán prestadas siempre de forma gratuita para el
  trabajador."* `2.2.6.1.2.28`: private agencies *"podrán cobrar al demandante de mano de obra una
  comisión por la prestación de los servicios básicos"*. `2.2.6.1.2.29`: both sides may be charged, but
  **only for *servicios especializados***. **Encuentra charges nobody, so it complies — but note that
  `2.2.6.1.2.4` is a duty imposed on providers *inside* the regime. It is a condition of being a
  provider, not a test for whether you are one.** "It is free" is not an exemption argument.
- **Not a *bolsa de empleo*.** `2.2.6.1.2.36`: *"la persona jurídica **sin ánimo de lucro** que presta
  servicios de gestión y colocación **para un grupo específico de oferentes con los cuales tiene una
  relación particular**, tales como: estudiantes, egresados, afiliados u otros de similar naturaleza."*
  Encuentra is open to anyone, so this narrow category does not fit.

### 1.4 The regulator already has a name for a web portal, and the operative definitions are in a resolution

Read directly from the signed original: **MinTrabajo Resolución 3229 del 5 de agosto de 2022**,
*"Por medio de la cual se Deroga la Resolución 2232 de 2021 […] y se definen las condiciones jurídicas,
técnicas y operativas para la prestación y alcance de los servicios de gestión y colocación de empleo;
y, se modifica el numeral 6 del artículo 3 de la Resolución 1397 de 2015 mediante el cual se
caracterizan los puntos de atención autorizados."* Sixteen pages, scanned; the text below was read page
by page from the PDF served by the Unidad del SPE.

- **Art. 2 — Ámbito de Aplicación:** *"La presente resolución aplica para **las personas jurídicas** de
  derecho público o privado interesadas en prestar servicios de gestión y colocación de empleo."*
- **Art. 3 — Servicios de Gestión y Colocación de Empleo:** *"Son los desarrollados por los Prestadores
  del Servicio Público de Empleo, y que **facilitan el encuentro entre oferta y demanda laboral** […]
  1. **Servicios Básicos** […]: Son servicios **obligatorios** que garantizan las condiciones mínimas
  para el encuentro entre oferta y demanda laboral; y, se clasifican en: 1. Registro de oferentes o
  buscadores, potenciales empleadores y vacantes 2. Orientación ocupacional a oferentes o buscadores y
  potenciales empleadores 3. Preselección **4. Remisión**"* — a fourth independent confirmation that
  *Remisión* is in the list.
- **Art. 4 — Modalidades:** *"1. **Presencial** […] 2. **Virtual**: Prestación de los servicios de gestión
  y colocación de empleo, a través de puntos de atención virtual. 3. **Mixta**."*
- **Art. 5**, replacing numeral 6 of art. 3 of Resolución 1397 de 2015, characterises the *puntos de
  atención*. Under *Puntos de Atención Virtual*:

  > *a) **Punto Virtual**: Portal de internet mediante la cual se prestan uno o varios servicios básicos
  > de gestión y colocación de empleo a los oferentes o buscadores de empleo y potenciales empleadores.*

  and closes: *"La prestación de **todos** los servicios básicos de gestión y colocación de empleo debe
  garantizarse a través de uno o varios puntos de atención."*

The same three propositions appear in **UAESPE's current operational guidance** — *Guía para la
Elaboración de Proyecto de Viabilidad*, código `GR-In-03`, **versión 5, vigente desde 30 de mayo de
2025** — which repeats the *Punto Virtual* definition verbatim and states *"Los servicios básicos son
**obligatorios** en cumplimiento de la normatividad vigente."*

Two consequences worth putting to counsel. First, **a web portal is a recognised delivery channel, not
a different kind of thing** — the regime's own vocabulary has a name for it, and *Virtual* is one of
only three delivery modes. Second, **you cannot be authorised to do only one basic service**:
authorisation obliges you to deliver all four. So the practical shape of compliance is not "register the
bit we already do"; it is "become a full provider".

### 1.5 What is *not* in the text

An exhaustive negative search of the whole of Decreto 1072 Título 6 Capítulo 1 (the text as served by
Función Pública, `norma.php?i=72173`, covering `2.2.6.1.1.1` through `2.2.6.1.10.13`) for
*medio de comunicación*, *medios de comunicación*, *clasificado*, *aviso*, *publicidad*, *difusión*,
*portal*, *plataforma*, *red social*, *no requiere*, *excepción* and *se exceptúa* returns:

- **zero** hits for *medio de comunicación*, *clasificado*, *aviso*, *publicidad*, *difusión*, *portal*,
  *plataforma*, *red social*, *no requiere* and *excepción*;
- **one** hit for *se exceptúa* / *exceptúan*, and it is `2.2.6.1.2.12` parágrafo 3 — an exception to the
  **employer's** vacancy-registration duty, not to the provider-authorisation duty;
- **one** hit for *intermediación*, in `2.2.6.1.2.9`, describing the SISE as *"la fuente oficial de
  información en materia de intermediación laboral y gestión de empleo"* — the two terms used together,
  not contrasted.

The same search was run over three further full texts — **Ley 1636 de 2013**, **Ley 2225 de 2022** and
**Decreto 1823 de 2020** — and returns **zero hits for every one of those terms in all three**.

**There is no marketplace, platform, classified-advertising or medio-de-comunicación carve-out anywhere
in Título 6, nor in either statute, nor in the 2020 amending decree.** That is a verified negative,
independently reproduced here. It is evidence. **It is not a ruling**, and it must not be read as one:
the absence of an exception does not by itself decide whether a given set of facts falls inside the
rule in the first place.

### 1.6 What the comparable Colombian platforms actually do

Not doctrine, not a ruling — **practice**, read from UAESPE's own monthly register summary. *Boletín
**Caracterización de Prestadores**, Edición No. 177, diciembre de 2025* (Unidad del Servicio Público de
Empleo) reports **211 authorised providers**, **734 authorised puntos de atención** of which **134 are
puntos virtuales operating nationwide** (49 *Puntos Virtuales* plus 85 *Punto virtual con atención
restringida*), **17 prestadores transnacionales**, and **119 providers using the SISE**. Its point-type
glossary cites *Resolución 3229 de 2022* by name.

Its Anexo 1 — the list of authorised providers — includes, as *Agencias Privadas Lucrativas de Gestión y
Colocación de Empleo*, the operators of essentially the whole Colombian online job-board market:

> **DGNET COLOMBIA / COMPUTRABAJO**, **LEADERSEARCH SAS** (elempleo.com), **MAGNETO GLOBAL S.A.S.**,
> **HOYTRABAJAS.COM S.A.S.**, **MIEMPLEO S.A.S**, **TICJOB S.A.S**, **COALLY S.A.S**, **HUNTY JOBS
> S.A.S**, **VINCU SAS**, **TALENTOP S.A.S**, **REQLUT COLOMBIA SAS**, **UNIVERSIA COLOMBIA S A S** —
> alongside the staffing and headhunting firms (Adecco, Manpower, Egon Zehnder, THT).

**LinkedIn and Indeed do not appear** in the extracted list; whether they operate through one of the 17
*prestadores transnacionales*, under a different corporate name, or not at all was **not established**
(§7 item 6).

**What this is worth, and what it is not.** It is not a decision about Encuentra, and none of these
platforms has Encuentra's shape — they carry employer accounts and employer-posted vacancies, which
Encuentra does not. But it is the clearest available signal of how the market and the regulator behave:
**in Colombia, running an online job platform commercially is done from inside the regime, with an
authorisation, not from outside it.** Nobody appears to be relying on a "we only publish, we only
connect" position. Counsel should be asked whether that is because the position is unavailable, or
merely because nobody has tested it (question 7).

### 1.7 The sanction, and who it reaches

**Ley 1636 art. 38**, in force:

> ***Las personas naturales o jurídicas**, ya sean de carácter público o privado, que ejerzan la
> actividad de gestión y colocación de empleo **sin la previa autorización** otorgada por el Ministerio
> del Trabajo, serán sancionadas, por esta entidad, con una multa equivalente al monto de **uno (1) a
> cinco mil (5.000) salarios mínimos legales vigentes** […] Si persisten en el ejercicio indebido de la
> actividad de colocación, el Ministerio del Trabajo podrá imponer **multas sucesivas**.*

**Art. 39** adds suspension or cancellation of the authorisation on reincidence.

The same range restated in tax units, and **with a criminal referral attached** — `2.2.6.1.2.42`
parágrafo, as replaced by **Decreto 2642 de 2022 art. 23**:

> *El régimen sancionatorio establecido en los artículos 38 y 39 de la Ley 1636 de 2013 con la
> imposición de **multas y sanciones desde 26,31 UVT hasta 131.565 UVT**, se aplicará **sin perjuicio de
> las acciones penales a que haya lugar**, para lo cual el Ministerio del Trabajo o la Unidad
> Administrativa Especial del Servicio Público de Empleo **remitirán, cuando proceda, copia del
> expediente a las autoridades competentes**.*

(The parallel parágrafo 4 of `2.2.6.1.2.19`, replaced by Decreto 2642 art. 22, carries the identical
range, but Función Pública's rendering garbles it as *"26,3d UVT"* and *"J3J.565 UVT"*. Quote
`2.2.6.1.2.42`, which renders cleanly. 26,31 and 131.565 UVT are also exactly 1 and 5.000 SMMLV at the
2022 SMMLV of COP 1.000.000 and UVT 2022 of COP 38.004.)

**Who enforces, and how.** `2.2.6.1.2.42` gives inspection, surveillance and control to *"La Dirección
de Inspección, Vigilancia, Control y Gestión Territorial y las Direcciones Territoriales del Ministerio
del Trabajo"* — note that the article describes that competence as running over *"las **personas
jurídicas** prestadoras del Servicio Público de Empleo de que trata este capítulo"*, which is relevant
to §5. `2.2.6.1.2.43` sets the procedure: MinTrabajo applies fine, suspension or cancellation *"cuando
se presente, por única vez o en forma reiterada, **el ejercicio irregular de la gestión y colocación de
empleo**"*, through the Dirección de Inspección, Vigilancia y Control, *"en los términos de lo dispuesto
en el artículo 486 del Código Sustantivo del Trabajo y la Ley 1610 de 2013"*.

### 1.8 What is at stake, stated neutrally

If the regime applies and Encuentra operates without authorisation, exposure is a MinTrabajo fine
starting at one SMMLV and reaching 5.000, with successive fines while it continues, **it reaches the
natural person operating the platform**, and it is expressly *"sin perjuicio de las acciones penales a
que haya lugar"*. If the regime applies and Encuentra seeks authorisation, the cost is incorporation
with *gestión y colocación de empleo* in the corporate object, a Reglamento de Prestación de Servicios,
a Proyecto de Viabilidad, an information system interoperable with the SISE, transmission of registered
vacancies to the SISE (`2.2.6.1.2.12` gives employers ten business days to register and caps a vacancy's
life at six months), delivery of **all four** basic services, a four-year renewal cycle, monthly
statistical reporting (Ley 1636 art. 35), and the authorisation number displayed in all promotion.

---

## 2. Which of the four activities Encuentra performs

**Encuentra's mechanics, as decided in #1 and #2 and not open to re-litigation here.** One account
type: a person. A person publishes a **capability profile** (what they can do) and/or a **need** (work
they want done). Search is **by skill and location**. The platform **suggests matches algorithmically**;
suggestions are **pull-first**, push is opt-in. Connection is a **structured offer** carrying terms,
answerable yes/no. **Contact details are disclosed only when an offer is accepted.** **No money moves
through the platform.** No employment relationship is established or verified. **The operator forwards
no CVs**; the two parties transact directly after the introduction.

Mapped against `2.2.6.1.2.17`, stated plainly:

| Basic activity | Does Encuentra do it? |
| --- | --- |
| **1. Registro** de oferentes o buscadores, potenciales empleadores y vacantes | **Yes, unambiguously** — and self-service is expressly covered. |
| **2. Orientación ocupacional** | **No**, on the spec as it stands. |
| **3. Preselección** | **Yes on the face of the definition**, which names *acciones generadas por el sistema de información*. Two counter-arguments, both real. |
| **4. Remisión** | **This is the contested one, and the line is ours to move.** See §2.4. |

### 2.1 Registro — yes, and there is no honest way to argue otherwise

A capability profile is a self-published record of *"lo que sé hacer"*, held in the operator's database
and searchable by others. `2.2.6.1.2.10` calls the equivalent object a *hoja de vida*: *"La persona
natural que desee registrar **su hoja de vida** en el Servicio Público de Empleo, podrá hacerlo a través
de cualquiera de los prestadores autorizados"*. A published *need* — "my restaurant lost its chef" — is
functionally the *registro de vacante* and, in the same act, the registration of a *potencial empleador*.

Registration therefore lands on all three of the objects `2.2.6.1.2.17` num. 1 names. If the
"any-one-activity" reading is right, **registro alone puts Encuentra inside the regime**, before any
question about matching or offers is reached.

### 2.2 Orientación ocupacional — no, today

Nothing in the current spec advises a person on career direction, training, or how to present
themselves. Worth flagging as a **build-time constraint rather than a finding**: the skill taxonomy
(#19) and the matching surface (#20) are exactly the places where a well-meant "people with your skills
also offer…" feature would start to look like *orientación*.

### 2.3 Preselección — the definition is explicit, and it names software

The decree does not define *preselección*. **Resolución 3229 de 2022, Anexo Técnico, Capítulo I, Título
I, numeral 3** does, and it is the operative text:

> ***3. Preselección.** Identificación entre los oferentes o buscadores registrados, aquellos que cumplan
> con el perfil requerido en la vacante, mediante **acciones generadas por el sistema de información
> autorizado** y/o la gestión realizada por el prestador.*

Read against Encuentra: the platform identifies, among registered capability profiles, those matching
the skill and location a published need requires, by an action generated by its own system. **The
definition does not require a human to be involved — it names the information system as one of the two
ways preselección happens.** On this text, Encuentra's match suggestion is hard to distinguish from
*preselección*.

Two counter-arguments are available and both are real. First, the definition is anchored to *"el perfil
requerido **en la vacante**"* — it presupposes a *vacante*, which is undefined anywhere in Título 6 and
is an employment concept (see §3 item 1). Second, Encuentra's suggestions are shown **to the searching
user in their own session, pull-first**, and are never delivered to a demandante as a shortlist —
whereas the definition speaks of identifying candidates *against a vacancy's requirement*, which is a
demandante-facing act. Whether the "identificación" is complete when the system computes it, or only
when it is delivered, is question 4 in §4.

Also worth noting for the *registro* point in §2.1: the same Anexo Técnico defines
***1.1 Registro de Oferentes o Buscadores*** as *"Inscripción presencial y/o virtual del oferente o
buscador, **de manera autónoma o asistida por el prestador**, que incluye el contenido mínimo de la hoja
de vida"* — **self-service registration is expressly registro** — and defines ***1.3 Registro de
Vacantes*** the same way, *"de manera autónoma o asistida por el prestador"*.

### 2.4 Remisión — where the movable line actually sits

**What the primary text says about remisión.** `2.2.6.1.2.17` num. 4 names it and does not define it.
`2.2.6.1.2.20` num. 8 presupposes it: *"Velar por la correcta relación entre las características de la
vacante respecto al perfil de los oferentes o buscadores **remitidos**."* **Ley 1636 art. 31, as replaced
by Ley 2225 de 2022 art. 12**, describes the act from the far side: *"**Posterior a la remisión de los
oferentes o buscadores de empleo realizada por el prestador**, los empleadores están obligados a
reportarle al prestador, los oferentes colocados; o, en su defecto las razones de no colocación."*

**And there is a definition — this is the sentence the whole question turns on.** Resolución 3229 de
2022, **Anexo Técnico, Capítulo I, Título I, numeral 4**:

> ***4. Remisión.** Acciones que permiten **poner a disposición del potencial empleador, las hojas de
> vida de los oferentes o buscadores preseleccionados** que cumplen con lo requerido en la vacante. Estas
> acciones deben quedar registradas en el sistema de información autorizado al prestador el cual deberá
> implementar **estrategias de retroalimentación** respecto a los oferentes o buscadores remitidos.*

The decree adds a description of the mechanics at `2.2.6.1.2.41` (in the *bolsas de empleo* section, so
of limited general weight, but it is the only place the decree spells the act out):

> *Para efectos de **la actividad de remisión de los oferentes** la bolsa deberá **consultar el registro
> de oferentes** del Sistema de Información del Servicio Público de Empleo y **remitir los candidatos que
> corresponda a los requerimientos de los demandantes**.*

**Three things follow, and one of them is uncomfortable.**

First, **remisión is defined by making the *hoja de vida* available to the demand side — not by
disclosing contact details.** Encuentra's central safety design, "contact details are revealed only on
acceptance", **is not what this definition is about**. A profile can be *puesta a disposición* without a
phone number in it. The "we don't disclose contact details until acceptance" answer does not, on its
face, answer the *remisión* question.

Second, the verb is *"poner a disposición"* — **to make available**, which is weaker than "to send".
That is a materially broader verb than the *"remitir los candidatos"* of `2.2.6.1.2.41`, and it is the
one in the operative definition.

Third, the definition is doubly anchored: to *"preseleccionados"* (so remisión presupposes a completed
preselección) and to *"lo requerido en la vacante"* (so it presupposes a *vacante*), and it carries an
obligation to record the acts and run *estrategias de retroalimentación* — i.e. the art. 31 feedback
loop. **All three anchors are things Encuentra does not have**: no *vacante* in the employment sense, no
preselección delivered to a demandante, no feedback loop, no record of remisiones.

**The case that Encuentra does not perform remisión.** Capability profiles are published *by their
owners, to everyone*, not put at the disposal of a particular *potencial empleador* against a particular
*vacante*. The operator selects nothing for anyone and sends nothing to anyone. The move that creates
contact is made by a *user*: one person sends a structured offer, the other answers yes or no, and
contact details are released by that acceptance. There is no *preselección* handed on, and no
*retroalimentación* loop — both of which the definition treats as constitutive.

**The case that it does.** A need-publisher who receives skill-and-location-matched suggestions is being
*puesto a disposición de* exactly the profiles that meet what their need requires. If a published
*need* counts as a *vacante* and a need-publisher counts as a *potencial empleador* — and §2.5 shows the
Anexo Técnico expressly contemplates a *potencial empleador* who is a **natural person** — then the
suggestion surface is doing, functionally, what numeral 4 describes, and the absence of a feedback loop
is a missing *obligation of a provider*, not proof of not being one.

**Where the line moves, and it is ours to move.** The following are build decisions, and each one moves
Encuentra toward or away from remisión:

| Design | Distance from *remisión* as numeral 4 defines it |
| --- | --- |
| Person A searches by skill, finds B's published profile, sends an offer | **Furthest.** The operator identifies nobody and makes nothing available *to A in particular*. |
| Platform shows A a ranked list of profiles matching A's own need, in A's own session | **Contested — this is where we actually are.** The operator has *identificado* profiles against what A requires, and has *puesto a disposición* of A precisely those. Whether "in A's session, pull-first" defeats *poner a disposición* is question 5. |
| Platform **emails or pushes** A a list of profiles for A's need | **Closer still.** Now the operator initiates delivery, not just availability. |
| Platform sends B's profile or *hoja de vida* to A | **This is remisión** on the face of numeral 4. |
| Platform records the remisiones and follows up on whether the work happened | **Closest of all** — this adds the *"estrategias de retroalimentación"* numeral 4 requires and the report-back Ley 1636 art. 31 builds on top of it. |

The current spec sits in row 2, with row 3 reachable via the opt-in push already contemplated in #1.
**Row 2 is the one to ask about, and rows 3–5 are the ones not to build until counsel has answered.**
Row 5 also touches the "what happens after acceptance" item that #1 lists as not-yet-specified: **any
follow-up asking whether the work happened would import the exact feedback machinery the definition of
remisión requires of a provider** — which would be the strongest available evidence that the platform is
operating as one.

### 2.5 One assumption that does not survive the Anexo Técnico

It is tempting to argue that Encuentra cannot be inside the regime because it has **no employers** — the
demand side is a natural person with a need, and `2.2.6.1.2.20` num. 7 tells providers to verify that
employers *"estén legalmente constituidos"*, which a household hiring a cook is not.

**The Anexo Técnico forecloses that argument.** Numeral **1.2, Registro de Potenciales Empleadores**,
requires the registration to include:

> *tipo de persona **(natural o jurídica)**; razón social o nombre; número del nit **o documento de
> identificación**; datos del representante legal (nombre y correo electrónico); domicilio (ciudad,
> departamento y país); datos de la persona de contacto (nombre, teléfonos y correo electrónico).*

**The regime expressly contemplates a *potencial empleador* who is a natural person, identified by a
cédula rather than a NIT.** So "our demand side is not a company" is not a way out, and §3 item 5's
compliance-impossibility point is narrower than it first appears. What survives is the *substance* of
the objection — a person hiring a person for a one-off job is not obviously an *empleador* offering a
*vacante* at all (§3 item 1) — not the corporate-form version of it.

---

## 3. Where the line is genuinely unclear

Five points where the primary text runs out. None of these is a gap this research can close.

1. **"Oferta y demanda *laboral*" versus paid work that is not employment.** Every operative term in the
   regime is an employment term: *empleo*, *empleador*, *vacante*, *trabajador*, *hoja de vida*,
   *colocación*, *empleo formal*. Encuentra establishes **no employment relationship**, verifies none,
   and covers any legitimate paid work — much of which will be a *contrato de prestación de servicios*
   or a one-off gig between two natural persons, with no subordination and no *vacante* in the ordinary
   sense. **Nothing in Título 6 defines *vacante*, and the word *subordinación* does not appear in it at
   all.** This is, on the primary text, the **strongest genuinely available argument for Encuentra being
   outside the regime — and it is a completely different argument from "we only connect people".** It
   also cuts the other way: `2.2.6.1.2.2` num. 2 (*universalidad*) promises access *"independiente de la
   situación ocupacional del oferente y/o de la condición del empleador"*, and the whole apparatus of
   the Mecanismo de Protección al Cesante contemplates *trabajadores independientes contratistas*.
2. **Whether the trigger is "any one activity" or the general clause.** #5 read `2.2.6.1.2.17`'s
   enumeration as disjunctive. On the text, the enumeration is the **content of the *servicios
   básicos***, and the actual definitional trigger is the general clause in Ley 1636 art. 29 num. 1 and
   in `2.2.6.1.2.17`'s chapeau. If so, the "any one of four" reading is a *conservative floor*, and the
   real test — *"todas aquellas actividades que faciliten el encuentro entre oferta y demanda laboral"*
   — is broader still. Counsel should say which reading a MinTrabajo inspector would apply.
3. **Whether *preselección* is complete when the system computes a match, or only when the result is
   delivered to a demandante.** The definition names *"acciones generadas por el sistema de información
   autorizado"* but anchors them to *"el perfil requerido en la vacante"*. See §2.3.
4. **Whether making matched profiles available in a need-publisher's own session is *"poner a disposición
   del potencial empleador las hojas de vida"*.** This is the sharpest question in the document, and the
   "contact details are gated" design does not answer it, because numeral 4 is about the *hoja de vida*,
   not the contact details. See §2.4.
5. **Whether the regime can be complied with on Encuentra's shape.** Narrower than it looks — §2.5 shows
   the Anexo Técnico expressly contemplates a natural-person *potencial empleador*, so the "we have no
   companies" objection fails. What remains: `2.2.6.1.2.20` num. 7 still requires providers to verify
   employers are *"legalmente constituidos"*; `2.2.6.1.2.11` builds a *Registro Único de Empleadores*;
   `2.2.6.1.2.12` requires vacancies to be transmitted to the SISE and caps their life at six months; and
   numeral 4 of the Anexo Técnico requires remisiones to be recorded with feedback strategies. Whether a
   platform with no vacancies, no placements and no post-hire visibility can be mapped onto that
   architecture at all is a live question, and if the answer to §4 Q1 is "yes", it becomes the practical
   one.

And one adjacent duty, which is **not** Encuentra's but lands on its users: **Ley 1636 art. 31** obliges
*"Todos los empleadores"* to report their vacancies to the SPE. If a person publishing a *need* on
Encuentra is an *empleador* for that purpose, Encuentra is inviting users into a reporting duty they
will not discharge. Question 9.

---

## 4. Questions for counsel

Framed to be answerable, in order of how much each changes what gets built.

1. **Is Encuentra, as described in §2, providing *servicios de gestión y colocación de empleo* within
   Ley 1636 art. 29 num. 1 as replaced by Ley 2225 de 2022 art. 11, and therefore subject to the
   authorisation requirement in art. 32?** A yes/no, with the reasoning, is what we need; everything
   below is subordinate to it.
2. **Does the regime reach work that is not *empleo*?** If two natural persons contract for a one-off
   paid job with no subordination, no *vacante* and no employment relationship — is that *"oferta y
   demanda laboral"* for art. 29? Does the answer change if some listings on the same platform *are*
   employment and some are not? Is there any authority — a MinTrabajo concepto, a Consejo de Estado
   decision, or the *Mecanismo de Protección al Cesante* case law — on where that boundary sits?
3. **Is the enumeration in `2.2.6.1.2.17` a trigger or a content specification?** Does performing *one*
   listed activity bring a person inside the regime, or does the general clause govern and the
   enumeration only describe what an authorised provider must deliver? Which reading does MinTrabajo
   apply in practice?
4. **Is *preselección* performed when an algorithm ranks and displays matching profiles to the user who
   published the need, and nothing is delivered to anyone?** Resolución 3229 de 2022, Anexo Técnico,
   Título I num. 3 defines it as *"Identificación entre los oferentes o buscadores registrados, aquellos
   que cumplan con el perfil requerido en la vacante, mediante acciones generadas por el sistema de
   información autorizado"*. Does *identificación* happen when the system computes the match, or only
   when a result is delivered? And does it require a *vacante* in the strict sense?
5. **Is *remisión* performed when matched capability profiles are shown to a need-publisher inside our
   product, given that numeral 4 defines it as *"poner a disposición del potencial empleador, las hojas
   de vida de los oferentes o buscadores preseleccionados"*?** Specifically: (a) does *"poner a
   disposición"* reach making profiles visible in the user's own session, or does it require the provider
   to send something; (b) does it matter that we disclose no contact details until an offer is accepted,
   or is that irrelevant because the definition is about the *hoja de vida*; (c) does it matter that we
   run no *estrategias de retroalimentación* and keep no record of remisiones — is that a missing element
   of the act, or merely a breached obligation? **Please answer the five-row table in §2.4 row by row and
   tell us which rows we may build.**
6. **Does it matter that the service is free to everyone?** We read `2.2.6.1.2.4` as a duty *inside* the
   regime, not a test for entry — and `2.2.6.1.2.27` as classifying agencies by whether they take a
   profit from *colocación*, not by whether they charge users. Is a **non-profit-making, free, open**
   platform outside the regime on any reading, or does it simply become an *agencia privada no
   lucrativa* if it is inside?
7. **Has UAESPE or MinTrabajo ever said anything, in any form, about job portals, platforms or
   marketplaces?** A concepto, a circular, a *preguntas frecuentes*, a sanction resolution, or a public
   statement. We could not find one (§7 item 1). And relatedly: **§1.6 shows that essentially every
   Colombian online job platform is authorised.** Is that because a "publish-only" position is
   unavailable in law, or because nobody has ever tested it? Has any unauthorised platform been
   sanctioned? Do LinkedIn or Indeed hold Colombian authorisations, and if not, why has nothing
   happened to them? **Enforcement practice is worth more to us than any textual argument in this
   document.**
8. **If we are inside: what is the realistic path and cost?** Specifically — (a) what corporate object
   wording satisfies `2.2.6.1.2.19` num. 1; (b) what the Proyecto de Viabilidad and Reglamento actually
   demand of a two-person-scale operation; (c) whether **all four** basic services must genuinely be
   built before authorisation, given UAESPE's *"Los servicios básicos son obligatorios"*; (d) what the
   SISE interoperability obligation costs to implement and maintain; (e) realistic elapsed time and
   professional fees. Budget context: total infrastructure spend is capped at **USD 25/month**.
9. **Does publishing a *need* on Encuentra make the publisher an *empleador* with a vacancy-reporting
   duty under Ley 1636 art. 31, as replaced by Ley 2225 de 2022 art. 12?** And does that duty attach at
   all to a natural person hiring a natural person for non-employment work? If it does, what must we
   tell users?
10. **If we build and launch before this is settled, what is the realistic enforcement posture?** We can
    see the machinery — `2.2.6.1.2.42` (Dirección de IVC y Gestión Territorial and the Direcciones
    Territoriales), `2.2.6.1.2.43` (CST art. 486 and Ley 1610 de 2013 procedure), and the *"sin perjuicio
    de las acciones penales"* referral. What we cannot see is how it behaves. How does a proceeding
    actually start — complaint, routine inspection, referral from UAESPE? Is there a *requerimiento* or
    cease-and-desist stage before a fine? Are the 1-to-5.000 SMMLV fines graduated in practice, and what
    has actually been imposed? **What is the *"acciones penales"* referral for — which offence?** Does
    personal exposure attach to the natural person operating the platform, and does incorporating later
    remove exposure for the earlier period?
11. **Does the answer change if the operator is not resident in Colombia, or if the company is
    incorporated abroad?** Ley 1636 art. 30 defines agencies as *"las personas jurídicas, públicas o
    privadas, **nacionales o extranjeras**, que ejercen las actividades descritas en el artículo
    anterior, **en el territorio nacional**"*. What makes an activity be exercised *en el territorio
    nacional* when the software runs on servers in the United States and the users are in Risaralda?
12. **Is there a lighter-touch shape that is clearly outside the regime and still serves the purpose?**
    For example: no algorithmic suggestion at all, search only; or no structured offer, with users left
    to publish their own contact details. We would rather change the product than launch under a fine we
    cannot pay — but only if the change actually buys something.

---

## 5. What standing up a *persona jurídica* would change

`2.2.6.1.2.18` parágrafo 1 reads, in full:

> *Solo las personas jurídicas autorizadas podrán prestar los servicios de gestión y colocación **de que
> trata el artículo 29 de la Ley 1636 de 2013**.*

**What that sentence does say.** It is a **restriction on who may lawfully provide**, and it is
double-locked: you must be a *persona jurídica*, **and** you must be authorised. The eligibility half is
repeated throughout: Ley 1636 art. 30 defines agencies as *"las personas jurídicas"*; art. 33 says
MinTrabajo issues the authorisation *"a las personas jurídicas que cumplan con los requisitos"*;
`2.2.6.1.2.15` says *"Los prestadores del Servicio Público de Empleo son personas jurídicas de derecho
público o privado, autorizados por la autoridad competente"*; `2.2.6.1.2.19` opens *"Las personas
jurídicas interesadas en prestar servicios…"*. And `2.2.6.1.2.1` inciso 3 states the chapter's scope in
the same terms: *"**Todas las personas jurídicas que deseen ejercer las actividades de gestión y
colocación de empleo** de que trata el artículo 29 de la Ley 1636 de 2013, deberán sujetarse a las
reglas establecidas en el presente capítulo para su ejercicio."*

**What that sentence does *not* say.** It does **not** say that a natural person who performs these
activities is outside the regime. It says the opposite of an exemption: a natural person can never be
authorised, so a natural person performing these activities can never be performing them lawfully.
**Ley 1636 art. 38 closes the loop explicitly**: *"**Las personas naturales** o jurídicas […] que ejerzan
la actividad de gestión y colocación de empleo sin la previa autorización […] serán sancionadas"*. The
statute anticipates natural persons doing this and punishes them for it.

So, plainly:

- **Today, as a natural person:** the owner **cannot obtain** authorisation at all, and **is within the
  class art. 38 sanctions** if the activity is covered.
- **After incorporating:** the entity becomes **eligible to apply**. Nothing else changes by itself.
  Incorporation is a **necessary precondition** to lawful operation if the regime applies; it is **not**
  a compliance step on its own, and an unauthorised SAS is in exactly the same position under art. 38 as
  an unauthorised natural person.

**There is a genuine argument the other way, and it is stronger than it first looks.** Every level of
the regulatory apparatus below the statute addresses itself to *personas jurídicas* and to nobody else:

- `2.2.6.1.2.1` inciso 3 — the chapter's scope: *"**Todas las personas jurídicas** que deseen ejercer las
  actividades […] deberán sujetarse a las reglas establecidas en el presente capítulo"*.
- **Resolución 3229 de 2022 art. 2 — *Ámbito de Aplicación*:** *"La presente resolución aplica para **las
  personas jurídicas** de derecho público o privado interesadas en prestar servicios de gestión y
  colocación de empleo."*
- `2.2.6.1.2.42` — inspection, surveillance and control run over *"**las personas jurídicas** prestadoras
  del Servicio Público de Empleo de que trata este capítulo"*. **The supervisory competence is itself
  written as a competence over legal persons.**

One could therefore argue the whole regulatory layer — chapter, resolution and supervisory power alike —
simply has no addressee in a natural person, and that Ley 1636 art. 38 bites only once the *"actividad
de gestión y colocación de empleo"* it refers to is one the regulations recognise. That argument has to
survive art. 38's own words, which are statutory, sit above the decree, and name *personas naturales*
directly. **This research does not resolve it**, and it is the second half of question 1 and the whole
of question 10.

One practical note that is not legal advice: incorporating has consequences beyond this question —
notably that #5 established RNBD registration does not apply to us *"on either corporate shape a solo
developer would plausibly take"*, so incorporating is not expected to trigger it. Confirm against #5 §1
before acting.

---

## 6. The "100 SMLMV bond" — reconciled

**Both readings were right about different texts. The requirement existed, and it was repealed. It does
not exist today.**

- **What #6 read.** `docs/research/messaging-providers.md` §8 reported, from the Cancillería normogram
  copy of **Decreto 2852 de 2013**, that *"Art. 20 requires a compliance surety bond of 100 SMLMV from a
  Colombian insurer."* That is an accurate reading of that text. **Decreto 2852 de 2013 art. 20 lit. d)**
  read:

  > *d) **Póliza de seguro de cumplimiento** de disposiciones legales a favor de la entidad
  > administrativa que otorga la autorización, expedida por una compañía de seguros legalmente
  > establecida en Colombia, **por un valor asegurado de cien (100) salarios mínimos mensuales legales
  > vigentes**, con el fin de garantizar el cumplimiento de las disposiciones legales por parte del
  > prestador del Servicio Público de Empleo relacionadas con dicha actividad, en especial las previstas
  > en el artículo 95 y siguientes de la Ley 50 de 1990 y en el presente decreto, con una vigencia igual
  > al periodo de la autorización.*

  with *"PARÁGRAFO 2o. Se exceptúa de la presentación de la póliza […] a las personas de derecho público
  que constituyan agencias públicas de gestión y colocación."*

- **Why #5 did not find it.** Decreto 2852 art. 20 was compiled as **`2.2.6.1.2.19`**, and #5's article
  list ran `.4`, `.15`, `.17`, `.18`, `.22`, `.29`, `.36` — `.19` was simply not among the articles read.
  There was no contradiction between the two documents; there was a gap.

- **What is in force now.** **Decreto 1823 de 2020 art. 6** replaced `2.2.6.1.2.19` in full — *"el cual
  quedará así"* — and the replacement lists **four** documents *"como mínimo"*: constitutive act,
  certificate of existence, Reglamento de Prestación de Servicios, Proyecto de Viabilidad. **There is no
  póliza, no garantía and no seguro in the replacement text, and none anywhere else in Título 6.** The
  word *póliza* does not appear in the compiled Título 6 at all.

**Verdict for the ticket: the 100 SMLMV bond was a real requirement of the 2013 decree and was removed
on 31 December 2020. Do not carry it forward.** The cost of authorisation today is the Reglamento, the
Proyecto de Viabilidad, the information system and the corporate object — not a bond.

*Caveat, and it is a live one:* `2.2.6.1.2.19` says requirements are *"conforme las definiciones que
adopte mediante resolución"* and lists its four documents *"como mínimo"*. **A MinTrabajo or UAESPE
resolution could impose further requirements, including a financial guarantee, without amending the
decree.** Resolución 3229 de 2022 and its Anexo Técnico were not read in full here (§7). Question 8(b)
covers this.

---

## 7. What could not be verified from primary sources

Ordered by how much each could change a decision.

1. **Whether any Colombian authority has ever addressed job portals or platforms.** This was the primary
   research target, on the explicit instruction to hunt for material *supporting* the "we only connect
   people" reading. **Nothing was found — in either direction.** Searched for: a UAESPE *concepto* or
   *circular* on portals, platforms or publication-only sites; a MinTrabajo *concepto* on the same; any
   official distinction between *publicación/difusión de vacantes* and *intermediación laboral*; any
   sanction resolution against an unauthorised platform; any *preguntas frecuentes* addressing it. Two
   UAESPE circulars from 2014 were retrieved and read in full — **Circular 10 de 2014** (employers'
   vacancy-reporting duty from 1 July 2014) and **Circular 12 de 2014** (temporary-agency vacancies,
   Diario Oficial 49.263) — and **neither mentions portals, platforms or unauthorised providers**. A
   Corte Constitucional search surfaced C-473-19 and C-571-17 on Ley 1636, neither on arts. 29–38's
   scope. **Treat "no official statement exists" as this research's finding, not as a licence to assume
   either answer.**
2. ~~**Resolución 3229 de 2022 and its Anexo Técnico were not read.**~~ **Resolved during this research.**
   The signed original (16 pages, 5 August 2022) was located on the Unidad del SPE's own site and read
   page by page — the PDF is a **scan with no text layer**, so it was rendered to images and read
   visually. Every #5 quotation was confirmed and the operative definitions of *Preselección* and
   *Remisión* were recovered verbatim (§2.3, §2.4). **Caveat: because it is a scan, the quotations here
   are transcriptions from images.** They are legible and unambiguous, but check them against a text
   original before quoting in a filing.
3. **No definition of *vacante* exists in Título 6, in Resolución 3229, or in its Anexo Técnico.** The
   Anexo Técnico's *1.3 Registro de Vacantes* defers to *"el contenido mínimo de la vacante de acuerdo
   con la normatividad vigente"* without saying which norm that is. Since both *preselección* and
   *remisión* are defined **by reference to a *vacante***, this undefined term carries a great deal of
   weight. It is the hinge of §3 item 1 and question 2.
4. ~~**The UVT sanction figures.**~~ **Resolved during this research.** Función Pública garbles them in
   `2.2.6.1.2.19` parágrafo 4 (*"26,3d UVT"*, *"J3J.565 UVT"*, from Decreto 2642 de 2022 art. 22) but
   renders the identical range cleanly in `2.2.6.1.2.42` parágrafo (Decreto 2642 art. 23): **26,31 UVT
   to 131.565 UVT**. That also matches the arithmetic conversion of 1 and 5.000 SMMLV at 2022 values.
   **Cite `2.2.6.1.2.42`, not `.19` par. 4.**
5. **Función Pública's compiled `2.2.6.1.2.17` omits "4. Remisión".** Confirmed as a rendering defect
   three ways over: by Decreto 1823 de 2020 art. 4 on the same site, by Resolución 3229 de 2022 art. 3,
   and by UAESPE's *Guía* `GR-In-03` v5. **Cite Decreto 1823 art. 4 or the Diario Oficial, never
   `norma.php?i=72173`, for that article.**
6. **The authorised-provider list was read from a summary bulletin, not from the register itself.** §1.6
   is drawn from UAESPE's *Boletín Caracterización de Prestadores* No. 177 (December 2025), whose Anexo 1
   lists providers by name. **Two limits.** (a) Names were extracted from the PDF's text layer; the list
   is long and the extraction dropped some leading words, so **treat §1.6's list as indicative, not
   exhaustive** — verify any specific name against the live *Registro de Prestadores*. (b) **Whether
   LinkedIn or Indeed hold Colombian authorisations was not established**: they do not appear under those
   names, but the bulletin also counts **17 *prestadores transnacionales*** whose Anexo 3 list was not
   read. The absence of a name is therefore not evidence that the operator is unauthorised. Question 7.
   #5's separate record of **UAESPE Resolución 0375 del 29 de julio de 2022** authorising Computrabajo
   (DGNET Ltd, NIT 900.786.587-9) was **not re-verified**, though the bulletin independently confirms
   DGNET Colombia / Computrabajo is on the list.
7. **Código Sustantivo del Trabajo art. 35 (*simples intermediarios*)** — referenced by `2.2.6.1.2.26`
   num. 4 as conduct prohibited to authorised providers. Its text could not be retrieved (TLS and 403
   failures on three official mirrors). It matters only as a reminder that *intermediación laboral* in
   the CST sense is a **third, separately prohibited** thing — so "we are not an intermediary" does not
   answer whether we are a *prestador*.
8. **Whether Encuentra's demand side is an *empleador* at all**, for `2.2.6.1.2.20` num. 7 (*"estén
   legalmente constituidos"*), `2.2.6.1.2.11` (*Registro Único de Empleadores*) or Ley 1636 art. 31.
   §2.5 establishes that the Anexo Técnico **does** contemplate a natural-person *potencial empleador*,
   which settles the corporate-form half. What is unresolved is whether a person hiring a person for a
   one-off job is an *empleador* offering a *vacante* in the sense the regime means. Question 9.
9. **`2.2.6.1.2.22`'s functional list is gone.** #5 quoted *"lit. h) De remisión de hojas de vida de los
   oferentes a los demandantes de empleo"*. **Decreto 1823 de 2020 art. 9 replaced that article in full**,
   and the text in force contains **no list at all** — it delegates the functional and technical
   characteristics entirely to UAESPE. The quoted literal is from the **pre-2020** text. The substance
   (that the system must support *remisión*) is unchanged, but it now lives in UAESPE instruments, not in
   the decree. Correct this before relying on #5 §10's citation.

---

## 8. Sources

Primary texts and official publications relied on. Every quotation above was read from one of these.

- **Ley 1636 de 2013** ("Mecanismo de Protección al Cesante"), Diario Oficial 48.825 — arts. 24–39.
  Función Pública, *Gestor Normativo*:
  <https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=53493>
- **Ley 2225 de 2022**, arts. 11 (replacing Ley 1636 art. 29) and 12 (replacing art. 31). Senado de la
  República, *basedoc*: <http://www.secretariasenado.gov.co/senado/basedoc/ley_2225_2022.html>
- **Decreto 2852 de 2013** (original text, since compiled and largely amended) — art. 19 (parágrafo:
  *solo las personas jurídicas autorizadas*) and **art. 20 lit. d) (the 100 SMLMV póliza)**. Colpensiones
  normogram: <https://normativa.colpensiones.gov.co/colpens/docs/decreto_2852_2013.htm>
- **Decreto 1072 de 2015** (DUR Sector Trabajo), Libro 2, Parte 2, Título 6, Capítulo 1, Sección 2 —
  arts. `2.2.6.1.2.1`, `.2`, `.3`, `.4`, `.9`, `.10`, `.11`, `.12`, `.13`, `.15`, `.16`, `.17`, `.18`,
  `.19`, `.20`, `.21`, `.22`, `.23`, `.24`, `.26`, `.27`, `.28`, `.29`, `.36`, `.38`, `.40`, `.41`,
  `.42`, `.43`. Función Pública, *Gestor Normativo*:
  <https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=72173>
  **— see §7 item 5: this rendering of `2.2.6.1.2.17` is defective.**
- **Decreto 1823 de 2020** (31 December 2020), arts. 2–13, amending most of the above — in particular
  **art. 4** (`2.2.6.1.2.17`, which *does* list "4. Remisión"), **art. 5** (`.18`), **art. 6** (`.19`,
  which **removed the póliza**), art. 7 (`.20`), art. 9 (`.22`), art. 11 (`.26`). Función Pública:
  <https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=154447>
- **Decreto 2642 de 2022** arts. 22 and 23 (replacing `2.2.6.1.2.19` parágrafo 4 and `2.2.6.1.2.42`
  parágrafo; SMMLV→UVT conversion of the Ley 1636 arts. 38–39 sanctions, and the *acciones penales*
  referral). Función Pública:
  <https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=200584>
- **MinTrabajo Resolución 3229 del 5 de agosto de 2022** and its **Anexo Técnico** — arts. 2, 3, 4, 5,
  6, 7, 8, 9, and Anexo Técnico Capítulo I, Títulos I y II (definitions of *Registro*, *Orientación*,
  ***Preselección*** and ***Remisión***), Capítulo II. Derogated Resolución 2232 de 2021 and modified
  numeral 6 of art. 3 of Resolución 1397 de 2015. Unidad del Servicio Público de Empleo:
  <https://www.serviciodeempleo.gov.co/wp-content/uploads/2025/07/Res-3229-Agosto-5-de-2022.pdf>
  **— a 16-page scan with no text layer; quotations here are transcribed from page images (§7 item 2).**
- **UAESPE, *Guía para la Elaboración de Proyecto de Viabilidad*, `GR-In-03`, versión 5, vigente desde
  30 de mayo de 2025** — *Punto Virtual* definition; the four basic services; *"Los servicios básicos son
  obligatorios"*. Proceso: Gestión de la Red de Prestadores del SPE:
  <https://www.serviciodeempleo.gov.co/wp-content/uploads/2025/10/GR-In-03-Guia-para-la-Elaboracion-del-Proyecto-de-Viabilidad_3.pdf>
- **UAESPE, *Boletín Caracterización de Prestadores*, Edición No. 177, diciembre de 2025** — 211
  authorised providers, 734 puntos de atención, 134 puntos virtuales, 17 prestadores transnacionales,
  119 providers on the SISE; Anexo 1 names the authorised providers:
  <https://www.serviciodeempleo.gov.co/wp-content/uploads/2026/02/12.%20Boletin%20de%20caracterizaci%C3%B3n%20Diciembre%202025.pdf>
  **— see §7 item 6 on the limits of the name extraction.**
- **UAESPE Circular 10 de 2014** (26 June 2014, employers' vacancy-reporting duty). Colpensiones
  normogram: <https://normativa.colpensiones.gov.co/colpens/docs/circular_uaespe_0010_2014.htm>
  — read in full; **does not address portals or unauthorised providers.**
- **UAESPE Circular 12 de 2014** (15 August 2014, Diario Oficial 49.263, temporary-agency vacancies).
  Colpensiones normogram:
  <https://normativa.colpensiones.gov.co/colpens/docs/circular_uaespe_0012_2014.htm>
  — read in full; **does not address portals or unauthorised providers.**

Cited but **not read in this research**, and therefore carried forward with the caveats in §7:

- **UAESPE Resolución 0375 del 29 de julio de 2022** (Computrabajo / DGNET Ltd authorisation) — recorded
  in #5, not re-verified here.
- **Resolución 1397 de 2015** (as amended by Resolución 293 de 2017 art. 11 and then by Resolución 3229
  de 2022 art. 5) — read only through Resolución 3229's replacement text of its art. 3 num. 6.
- **Código Sustantivo del Trabajo art. 35** — could not be retrieved from any official mirror.

Related research in this repo:

- [`docs/research/ley-1581-obligations.md`](./ley-1581-obligations.md) §10 — the origin of this ticket.
- [`docs/research/messaging-providers.md`](./messaging-providers.md) §8 — the origin of the 100 SMLMV
  figure reconciled in §6.
