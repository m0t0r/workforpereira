# Colombian data-protection obligations for Encuentra

Research for [#5](https://github.com/m0t0r/workforpereira/issues/5). Part of the map, [#1](https://github.com/m0t0r/workforpereira/issues/1).

> **This is not legal advice.** It is engineering research, gathered from primary sources, to decide
> what we build. A Colombian data-protection lawyer should review the artefacts we produce from it
> (the aviso de privacidad, the política de tratamiento, the employer terms, the transmission
> contracts) before we take real candidate data. Where a source could not be verified it says so —
> those are the points to take to a lawyer first.

## Scope and method

Primary sources only. Statutory text was read in Spanish from the Función Pública _Gestor Normativo_
edition of each norm, the MinTIC/Cancillería normogram compilations of Decreto 1377 de 2013, the
compiled Decreto 1074 de 2015, and the SIC's own Circular Única and RNBD documentation. Law-firm
commentary was used only to locate primary text, never as a finding.

The norms that govern us:

| Norm                                               | What it does                                                                                                                                                                                                                                                                       |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ley Estatutaria 1581 de 2012**                   | The general data-protection regime (_habeas data_). Rights, duties, procedures, sanctions, RNBD, international transfer.                                                                                                                                                           |
| **Sentencia C-748 de 2011** (Corte Constitucional) | Prior constitutional review of the bill. Binding gloss on several articles — notably art. 8(e).                                                                                                                                                                                    |
| **Decreto 1377 de 2013**                           | Implements Ley 1581: consent, its proof, the privacy policy, the privacy notice, retention, data-subject procedures, transmission contracts.                                                                                                                                       |
| **Decreto 1074 de 2015**                           | Sole regulatory decree of the Commerce/Industry/Tourism sector. Decreto 1377 is **compiled** into it at Libro 2, Parte 2, Título 2, Capítulo 25 (`2.2.2.25.x.x`); the RNBD rules sit in Capítulo 26 (`2.2.2.26.x.x`). Cite both numberings — the compiled one is the one in force. |
| **SIC Circular Única, Título V**                   | The SIC's own binding instructions: RNBD mechanics, incident reporting, reclamo reporting.                                                                                                                                                                                         |
| **Ley 1266 de 2008**                               | A **separate** regime for financial/credit data. Expressly carved out of Ley 1581's scope by art. 2(e). Does not apply to us unless we touch credit data.                                                                                                                          |

Two things worth knowing before reading the obligations:

- **Ley 1581 applies to us by territory.** Art. 2 makes the law applicable to treatment "efectuado en
  territorio colombiano". Hosting the database in the United States does not move the treatment out
  of scope — it makes it an _international transfer/transmission_ question, addressed below.
- **Sanctions are real and personal.** Art. 23 allows fines of up to 2.000 SMLMV, "de carácter
  personal e institucional", suspension of processing for up to six months, temporary closure, and —
  for operations involving _datos sensibles_ — "cierre inmediato y definitivo". The personal
  exposure matters for a solo developer.

---

## 1. RNBD registration — **does not apply to us**

**Answer: no, we do not have to register in the Registro Nacional de Bases de Datos**, on either
corporate shape a solo developer would plausibly take. This is the clearest win in the whole
research: an obligation many blogs describe as universal was deliberately narrowed in 2018.

The obligation is created by **Ley 1581 art. 25** and regulated by **Decreto 886 de 2014**, compiled
into **Decreto 1074 de 2015, Libro 2, Parte 2, Título 2, Capítulo 26** (`2.2.2.26.1.1` –
`2.2.2.26.4.1`). Its scope was then rewritten by **Decreto 090 de 2018** (18 January 2018, D.O.
50.480), art. 1, which replaced art. `2.2.2.26.1.2`:

> **ARTÍCULO 2.2.2.26.1.2. Ámbito de aplicación.** Serán objeto de inscripción en el Registro
> Nacional de Bases de Datos, las bases de datos que contengan datos personales cuyo Tratamiento
> automatizado o manual sea realizado por los Responsables del tratamiento que reúnan las siguientes
> características:
> a) Sociedades y entidades sin ánimo de lucro que tengan activos totales superiores a 100.000
> Unidades de Valor Tributario (UVT).
> b) Personas jurídicas de naturaleza pública.

Two consequences:

- **Operating as a persona natural → out of scope entirely.** The decree's considerandos say it in
  terms: _"Igualmente, serán excluidas las personas naturales."_
- **Operating through an S.A.S. → in scope only above 100.000 UVT of total assets.** DIAN
  **Resolución 000238 del 15 de diciembre de 2025**, art. 1, fixes the 2026 UVT at **COP $52.374**,
  so the threshold is **COP $5.237.400.000** (roughly USD 1.3M). The test is _activos totales_,
  borrowed from the MiPyme definition in Ley 905 de 2004 art. 2 — not revenue, not headcount (the
  SIC's own RNBD FAQ confirms headcount is irrelevant).

The carve-out is **only from registration**. Decreto 090's considerandos are explicit:

> "La limitación del universo de vigilados frente al deber de registrar sus bases de datos no implica
> de ninguna manera que las personas jurídicas y naturales que se exceptúan de efectuar dicho
> registro […] queden relevadas del cumplimiento de los demás deberes establecidos para los
> Responsables del Tratamiento […] siguen sujetas al cumplimiento de las disposiciones contenidas en
> la Ley 1581 de 2012."

**Time and money.** Nothing to spend, because nothing to file. Should we ever cross the threshold:
registration is online through the SIC micrositio ("Protección de datos personales" → "Registro
Bases de Datos"), account creation requires a RUT copy no older than three months, each database is
registered separately and receives a _número de radicado_. Ongoing duties would then be updates
within the first 10 días hábiles of a month after any _cambio sustancial_, an annual update **between
2 January and 31 March**, and the semi-annual reclamos report (Circular Única, Título V, numeral
2.3). No primary source states a fee or a processing SLA — see the open questions.

**The one RNBD-adjacent duty that does bind us anyway** is security-incident reporting; see §5.

**Product surface:** none. Record the reasoning in an ADR so the question is not re-opened, and add a
tripwire to whatever we use for annual bookkeeping: if total assets ever approach 100.000 UVT, the
registration duty switches on and new databases must be registered **within two months of creation**
(Decreto 1074 art. `2.2.2.26.3.1`, as replaced by Decreto 090 de 2018 art. 2).

---

## 2. Consent — capture and, above all, **evidence**

This is where the law converts directly into schema.

### The statutory requirement

- **Ley 1581 art. 4(c)** — _principio de libertad_: treatment may only be exercised with the
  "consentimiento, previo, expreso e informado del Titular".
- **Ley 1581 art. 9**: authorization must be "obtenida por cualquier medio **que pueda ser objeto de
  consulta posterior**". Evidencing is a statutory requirement, not a decree detail.
- **Ley 1581 art. 17(b)**: the Responsable must "Solicitar y **conservar** […] copia de la respectiva
  autorización otorgada por el Titular".
- **Ley 1581 art. 12 parágrafo**: the Responsable "deberá conservar prueba del cumplimiento de lo
  previsto en el presente artículo y, cuando el Titular lo solicite, **entregarle copia de esta**."
- **Ley 1581 art. 8(b)**: the Titular has a _right_ to demand proof of the authorization they gave.
- **Decreto 1377 art. 8** (= Decreto 1074 art. `2.2.2.25.2.5`): "Los Responsables deberán conservar
  prueba de la autorización otorgada por los Titulares."

Read together: a boolean `accepted_terms` column does not satisfy this. We must be able to **render
back to a specific candidate, on demand, the exact consent artefact they were shown and the fact of
their acceptance**.

The SIC has said so in its own words. Its **"Formatos modelo para el cumplimiento de obligaciones
establecidas en la Ley 1581 de 2012 y sus decretos reglamentarios"** (Delegatura para la Protección
de Datos Personales, November 2022) tells controllers that "sin importar el medio por el cual se
obtenga dicha autorización, **no puede perderse de vista que es necesario conservar prueba de la
misma**", and its model authorization form records name, identification, signature and the date "en
que se puso de presente al titular la autorización y entregó sus datos".

Its **"Guía sobre el Tratamiento de Datos Personales para fines de Comercio Electrónico"** (2019) is
blunter still: "usted **no solo debe estar en capacidad de demostrar que tiene prueba de la
autorización, también tiene la carga de probar que informó lo que ordena el artículo 12**". There are
**two** separate evidence trails: the consent, and the disclosure that preceded it.

Enforcement follows the same line. In a SIC Boletín Jurídico _habeas data_ matter the SIC sanctioned
a controller that could not show _how_ it had obtained an authorization — the Titular had in fact
ticked "NO" — framing it as a breach of art. 17(b) and of the requirement that consent be "previa,
expresa e informada".

### How consent may be given

**Decreto 1377 art. 5** (= `2.2.2.25.2.2`) is the "when": procedures must request authorization "**a
más tardar en el momento de la recolección**", informing which personal data will be collected and
"**todas las finalidades específicas del Tratamiento para las cuales se obtiene el consentimiento**".
The same article defines what a _substantial change_ is — a change to the identification of the
Responsable, or to the _finalidad_ — and sets the consequence: notify before implementing, and where
the **finalidad** changes, "deberá obtener del Titular una **nueva autorización**".

**Decreto 1377 art. 7** (= `2.2.2.25.2.4`) is the "how": mechanisms must "garanticen su consulta",
may be "predeterminados a través de medios técnicos", and consent is valid when expressed "(i) por
escrito, (ii) de forma oral o (iii) mediante conductas inequívocas del titular". Then the hard rule:

> "En ningún caso el silencio podrá asimilarse a una conducta inequívoca."

No pre-ticked boxes, no "by continuing you agree", no consent inferred from inactivity.

**Consent must be granular.** The SIC's 2022 model-formats cartilla carries an explicit warning on
its model authorization: "**Cada finalidad que usted incluya en este formato debe contar con un
mecanismo que le permita al Titular seleccionar por separado si acepta o no que se efectúe ese
tratamiento particular.**" This is the single most directive statement the SIC makes about UI, and it
settles the shape of the signup: **one checkbox per purpose**, not one for everything.

**Decreto 1377 art. 4** (= `2.2.2.25.2.1`) adds data minimisation — collection "deberá limitarse a
aquellos datos personales que son pertinentes y adecuados para la finalidad" — and forbids
"medios engañosos o fraudulentos" to collect data.

### What must be engineered

| Obligation                                                                            | Source                                                      | Product surface                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consent requested at or before collection                                             | D.1377 art. 5 / `2.2.2.25.2.2`                              | `/registro` `ProfileWizard` — the consent step comes before the data is persisted, not after.                                                                                                                                                                                                                    |
| **One separately selectable checkbox per finalidad**                                  | SIC _Formatos modelo_ (2022), Anexo 2                       | Enumerate purposes explicitly: create and hold a profile; publish the profile to employers; send notifications about applications; (separately, and optional) send job suggestions or marketing. Purposes must be separable because revocation can be per-purpose.                                               |
| Silence is never consent                                                              | D.1377 art. 7 / `2.2.2.25.2.4`                              | Checkboxes default to unchecked; submission blocked until required consents are affirmative. No dark patterns — consistent with the handoff's accessibility bar.                                                                                                                                                 |
| Collect only pertinent and adequate data                                              | D.1377 art. 4 / `2.2.2.25.2.1`                              | A justification recorded for every profile field. This is the discipline that keeps §8 (sensitive data) manageable.                                                                                                                                                                                              |
| **Proof of the consent**, retained and reproducible                                   | L.1581 arts. 9, 17(b), 8(b); D.1377 art. 8 / `2.2.2.25.2.5` | An append-only **consent event log** in Postgres: `titular_id`, `purpose`, `granted_at`, `channel`, IP, user agent, and **the version identifier of the exact policy and aviso shown**. Never `UPDATE`; revocation writes a new row. Include it in the account-export path so we can literally hand over a copy. |
| **Proof of the art. 12 disclosure**, as a second trail                                | L.1581 art. 12 parágrafo; SIC e-commerce guide (2019)       | The consent row must reference the rendered disclosure — what the candidate was told about purposes, the facultative nature of sensitive questions, their rights, and our identity and contact details — not merely that they clicked.                                                                           |
| Consent artefacts versioned, never edited in place                                    | D.1377 arts. 5, 13, 16                                      | Store the _política_ and the _aviso_ as versioned documents with `effective_from`, so a 2028 dispute about a 2026 signup can be answered.                                                                                                                                                                        |
| Substantial change → notify before implementing; changed _finalidad_ → **re-consent** | D.1377 arts. 5, 13                                          | A re-consent flow targetable at users whose stored version predates the change, plus the free-consulta trigger it fires (§4).                                                                                                                                                                                    |

**Retention is part of this.** **Decreto 1377 art. 11** (= `2.2.2.25.2.8`) allows retention only
"durante el tiempo que sea razonable y necesario" for the purpose, requires suppression once the
purpose is met absent a legal or contractual obligation, and — importantly for us — requires that we
"documentar los procedimientos para el Tratamiento, conservación y supresión". A written, versioned
retention schedule per entity (`user`, `candidate_profile`, `application`, consent log, audit log) is
itself a compliance artefact, not just good hygiene.

---

## 3. The two transparency artefacts

The _política de tratamiento_ and the _aviso de privacidad_ are different documents with different
jobs. We need both, and both must be versioned and kept.

### Política de tratamiento de la información

**Decreto 1377 art. 13** (= Decreto 1074 art. `2.2.2.25.3.1`). It must be "en medio físico o
electrónico, en un lenguaje claro y sencillo y ser puestas en conocimiento de los Titulares", and
contain **at least**:

1. Nombre o razón social, **domicilio, dirección**, correo electrónico y teléfono del Responsable.
2. Tratamiento al cual serán sometidos los datos y finalidad del mismo, cuando esta no se haya
   informado mediante el aviso de privacidad.
3. Derechos que le asisten como Titular.
4. Persona o área responsable de la atención de peticiones, consultas y reclamos.
5. Procedimiento para que los Titulares ejerzan los derechos a conocer, actualizar, rectificar y
   suprimir información y revocar la autorización.
6. Fecha de entrada en vigencia de la política y **período de vigencia de la base de datos**.

Its final paragraph requires substantial changes — as defined in art. 5 — to be communicated
"oportunamente […] de una manera eficiente, **antes de implementar las nuevas políticas**".

Two of those items force decisions rather than prose:

- **Item 1 requires publishing a physical address and a telephone number.** For a solo developer that
  is a business-shape decision: run as a _persona natural_ and your home address goes on the
  internet, or incorporate an S.A.S. with a registered address. It interacts with the RNBD threshold
  in §1, and it should be settled before launch rather than at launch.
- **Item 6 requires stating how long the data is kept.** It pairs with **Decreto 1377 art. 11** —
  retention only "durante el tiempo que sea razonable y necesario", suppression once the purpose is
  met, and documented procedures for treatment, retention and deletion. The published period and the
  deletion jobs must agree.

Two adjacent duties belong here:

- **Decreto 1377 art. 18** (= `2.2.2.25.3.6`): the procedures for exercising rights must be easily
  accessible **and included in the policy itself**.
- **Ley 1581 art. 17(k)**: a _separate_ internal manual of policies and procedures. The SIC's own
  cartilla warns this manual "no debe confundirse con las políticas de tratamiento de la
  información" — the public policy and the internal manual are two documents.

### Aviso de privacidad

**Decreto 1377 art. 14** (= `2.2.2.25.3.2`) makes it a **fallback**: it applies "en los casos en los
que **no sea posible** poner a disposición del Titular las políticas", and must inform of the
policy's existence and how to reach it "a más tardar al momento de la recolección". A web product
generally _can_ put the policy in front of the user; the SIC's cartilla confirms that where the
policy is shown directly, "no será obligatorio contar con un aviso de privacidad". We will show
both anyway — a short notice at the point of collection is better product, and it costs little.

**Decreto 1377 art. 15** (= `2.2.2.25.3.3`) fixes the minimum contents: (1) nombre o razón social y
datos de contacto del Responsable; (2) el tratamiento y su finalidad; (3) los derechos del Titular;
(4) los mecanismos para conocer la política y los cambios sustanciales, and in all cases how to
access the policy. Where **sensitive data** are collected, the aviso "deberá señalar expresamente el
carácter facultativo de la respuesta". And publishing an aviso "no eximirá al Responsable" of making
the full policy known.

### The second evidencing duty — art. 16

**Decreto 1377 art. 16** (= `2.2.2.25.3.4`) is the one most commonly missed:

> Los Responsables deberán **conservar el modelo del Aviso de Privacidad** que utilicen […] **mientras
> se traten datos personales conforme al mismo y perduren las obligaciones que de este se deriven**.
> Para el almacenamiento del modelo, el Responsable podrá emplear medios informáticos, electrónicos o
> cualquier otra tecnología que garantice el cumplimiento de lo previsto en la **Ley 527 de 1999**.

It is a _model_-retention duty — keep the version of the notice you used — which combines with the
per-Titular consent evidence in §2 to make a complete record. Practically: **version the notice and
bind every authorization record to the version in force when it was given.** The reference to Ley 527
de 1999 (Colombia's e-commerce and electronic-signature law) is the closest textual anchor we have
for electronic evidencing generally, and it is what makes a database record an acceptable "model".

### What must be engineered

| Obligation                                                      | Source                          | Product surface                                                                                                                                                                                                              |
| --------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Publish the full policy with all six contents                   | D.1377 art. 13 / `2.2.2.25.3.1` | A `/legal/politica-de-tratamiento` route rendered from a versioned document; linked from the footer, the consent step and every collection form. Spanish, plain language — which the handoff's content rules already demand. |
| Publish a physical address, email and telephone                 | D.1377 art. 13(1)               | Forces the persona-natural-vs-S.A.S. decision. Route the phone somewhere answerable.                                                                                                                                         |
| State the retention period, and honour it                       | D.1377 arts. 13(6), 11          | A retention schedule the code implements — deletion jobs per entity, not prose.                                                                                                                                              |
| Show the aviso at the point of collection                       | D.1377 arts. 14, 15             | Inline in `ProfileWizard` (`/registro`), and in every other collection form — including the `ReportForm` on `/ayuda/busqueda-segura` and employer signup. Not a link buried in the footer.                                   |
| Flag the facultative nature of sensitive questions in the aviso | D.1377 art. 15                  | Only relevant if we ever collect sensitive data — see §8, where the recommendation is not to.                                                                                                                                |
| **Retain the model of every aviso version**                     | D.1377 art. 16 / `2.2.2.25.3.4` | Versioned documents with `effective_from`, referenced by ID from every consent record.                                                                                                                                       |
| Name the person/area handling peticiones                        | D.1377 arts. 13(4), 23          | One named contact, consistent across the policy, the aviso and `/mis-datos`.                                                                                                                                                 |
| Publish the rights-exercise procedure inside the policy         | D.1377 art. 18 / `2.2.2.25.3.6` | The policy links to and describes `/mis-datos`.                                                                                                                                                                              |
| Write the separate internal manual                              | L.1581 art. 17(k)               | A document in the repo — distinct from the public policy.                                                                                                                                                                    |
| Notify substantial changes **before** implementing              | D.1377 arts. 5, 13              | Email + in-app notice keyed on stored policy version, and the free-consulta entitlement it triggers (§4).                                                                                                                    |
| Local persistence of a recent search query                      | D.1377 arts. 5, 7               | The handoff already says "persist recent query locally only after consent". Colombia has no separate cookie statute, so the §2 consent rules are the ones that apply: a plain, unticked opt-in.                              |

---

## 4. Data-subject rights and the deadlines that become our SLAs

**Ley 1581 art. 8** grants six rights: (a) know, update and rectify; (b) demand proof of the
authorization given; (c) be informed of the use made of the data; (d) complain to the SIC; (e) revoke
authorization and/or request deletion; (f) access their data free of charge.

**A binding constitutional gloss on 8(e).** As drafted, 8(e) reads as though revocation and deletion
only proceed once the SIC has found misconduct. **Sentencia C-748 de 2011** (resolutive point
Cuarto) struck the word _"sólo"_ as inexequible and held that 8(e) must be read so that the Titular

> "también podrá revocar la autorización y solicitar la supresión del dato, cuando **no exista un
> deber legal o contractual** que le imponga el deber de permanecer en la referida base de datos."

**We therefore cannot gate deletion on a prior SIC ruling.** A plain request must be honoured unless
a legal or contractual duty to remain exists.

### Deletion and revocation are _reclamos_

**Decreto 1377 art. 9**, compiled as **Decreto 1074 art. `2.2.2.25.2.6`** — note the compiled number,
the Sección 2 mapping runs at a clean −3 offset, and `2.2.2.25.2.9` is the _children's data_ article,
not this one:

> "Los Titulares podrán en todo momento solicitar al responsable o encargado la supresión de sus
> datos personales y/o revocar la autorización otorgada para el Tratamiento de los mismos, **mediante
> la presentación de un reclamo**, de acuerdo con lo establecido en el artículo 15 de la Ley 1581 de 2012. La solicitud de supresión de la información y la revocatoria de la autorización **no
> procederán cuando el Titular tenga un deber legal o contractual de permanecer en la base de
> datos**. El responsable y el encargado deben poner a disposición del Titular **mecanismos gratuitos
> y de fácil acceso** […]"

Deletion has no separate clock: it inherits the full art. 15 procedure, including the
`reclamo en trámite` legend and the extension-notification duty. And if the term lapses without
deletion, the Titular can go straight to the SIC to have deletion _ordered_ — missing our own SLA is
itself the trigger.

### The SLA table

| Obligation                                                               | Term | Unit                                                                                           | Source                                                    |
| ------------------------------------------------------------------------ | ---- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Answer a **consulta**                                                    | 10   | días **hábiles**, from date of receipt                                                         | L.1581 art. 14                                            |
| Consulta extension — valid only if we notify reasons + the new date      | +5   | días **hábiles** after the first term expires                                                  | L.1581 art. 14                                            |
| Request cure of an **incomplete reclamo**                                | 5    | **"días"** — the only term in arts. 14–15 written _without_ "hábiles". Build to calendar days. | L.1581 art. 15.1                                          |
| Deemed **desistimiento** if the claimant never cures                     | 2    | **meses** from the requerimiento                                                               | L.1581 art. 15.1                                          |
| **Traslado** when we are not competent to resolve, + notify the claimant | 2    | días **hábiles**                                                                               | L.1581 art. 15.1                                          |
| Insert the **`reclamo en trámite`** legend, with its motive              | 2    | días **hábiles** from receipt of the _complete_ reclamo; kept until decided                    | L.1581 art. 15.2                                          |
| Resolve a **reclamo** — including deletion and revocation                | 15   | días **hábiles**, counted from the **day after** receipt                                       | L.1581 art. 15.3                                          |
| Reclamo extension — valid only if we notify reasons + the new date       | +8   | días **hábiles** after the first term expires                                                  | L.1581 art. 15.3                                          |
| **Report a security incident** to the SIC                                | 15   | días **hábiles** from detection **and** escalation to the designated person/area               | SIC Circular Única, Tít. V, Cap. Segundo, num. 2.1 f)(ii) |
| Free **consulta** entitlement                                            | ≥1   | per **mes calendario**, plus unlimited whenever the policy changes substantially               | D.1074 art. `2.2.2.25.4.2`                                |
| If we ever act as **Encargado**: apply updates pushed by a Responsable   | 5    | días **hábiles** from receipt                                                                  | L.1581 art. 18(d)                                         |

Ceilings to design against: **15 días hábiles** total for a consulta, **23 días hábiles** total for a
reclamo. Note the counting asymmetry — art. 14 counts _from_ receipt, art. 15 counts from the _day
after_ receipt.

### What must be engineered

| Obligation                                                       | Source                                          | Product surface                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A permanently available, simple, free channel to exercise rights | D.1074 art. `2.2.2.25.4.2`; art. `2.2.2.25.2.6` | A first-class **`/mis-datos`** surface (not a `mailto:`), reachable from `/mi-perfil` and the footer: view my data, export it, correct it, revoke a purpose, delete my account. `/ayuda/busqueda-segura` already establishes the pattern of a help surface with a form.                                                                                                        |
| Every request is a tracked case with a legal clock               | L.1581 arts. 14, 15                             | A `data_request` entity: type (`consulta` \| `reclamo` \| `revocacion` \| `supresion`), `received_at`, computed `due_at` in **días hábiles on the Colombian calendar** (`America/Bogota`, incl. _festivos_ — Colombia has ~18, several movable under Ley 51 de 1983), `extension_notified_at`, `resolved_at`. Deadlines must alarm before they lapse.                          |
| The `reclamo en trámite` legend                                  | L.1581 art. 15.2, art. 18(g)                    | A **persistent state flag on the affected records**, set within 2 días hábiles and cleared only on decision. It is a marker on the data, not a ticket status — so it belongs in the domain model (and, per art. 4(f), the flagged data should not be circulating to employers meanwhile: art. 18(i) forbids circulating data being contested).                                 |
| Extensions require an outbound notification                      | L.1581 arts. 14, 15.3                           | The extension is only lawful if we send reasons and a date. Make the extension action _send the message_, not just move a date.                                                                                                                                                                                                                                                |
| Identity verification, by means we provide                       | D.1074 art. `2.2.2.25.4.1`                      | Better Auth session for logged-in users; a verified-email challenge for the rest. Also handle _causahabientes_ and _apoderados_ — an out-of-band, human-reviewed path is acceptable, but it must exist.                                                                                                                                                                        |
| A named person or area for data protection                       | D.1074 art. `2.2.2.25.4.4`                      | Solo developer = the developer, named with a contact address in the policy. It also defines the moment the breach clock starts (§4).                                                                                                                                                                                                                                           |
| Proactive correction                                             | D.1074 art. `2.2.2.25.4.3`                      | Data must be updated/rectified/deleted when the Titular asks **or when we could have noticed** — e.g. bounced-email and dead-vacancy hygiene.                                                                                                                                                                                                                                  |
| A written internal manual of policies and procedures             | L.1581 art. 17(k)                               | A real document in the repo covering how consultas and reclamos are handled. Non-optional and separate from the public policy.                                                                                                                                                                                                                                                 |
| Free access floor                                                | D.1074 art. `2.2.2.25.4.2`                      | Never charge. The rule is a _floor_ on free access (≥1/month + on substantial policy change), not a cap on requests; we simply will not meter it. Reclamos, deletion and revocation are always free with no frequency limit.                                                                                                                                                   |
| Deletion refusal must be specific and documented                 | D.1074 art. `2.2.2.25.2.6`; C-748/11            | The only lawful refusal is a _legal or contractual duty to remain_. Encode a small, enumerated set of retention grounds and store which one was invoked; no general "legitimate interest" escape hatch exists in Colombian law. Deleting a candidate must reconcile with the `Application` record an employer already holds — decide that in the application-lifecycle ticket. |

---

## 5. Security and breach notification — **this one does bind us**

**Ley 1581 art. 4(g)** (_principio de seguridad_) and **art. 17(d)** require the information to be
kept "bajo las condiciones de seguridad necesarias para impedir su adulteración, pérdida, consulta,
uso o acceso no autorizado o fraudulento". **Art. 17(n)** requires informing the data-protection
authority "cuando se presenten violaciones a los códigos de seguridad y existan riesgos en la
administración de la información de los Titulares" — but states **no deadline**.

The deadline comes from the SIC's own instructions — cited here as **Circular Única, Título V,
Capítulo Segundo, numeral 2.1 f)(ii)**, with the citation caveat in §12 item 1 — and it explicitly
reaches those of us who are _not_ obliged to register:

> "Los Responsables del Tratamiento que **no se encuentren obligados a registrar sus bases de datos
> en el RNBD** y los Encargados del Tratamiento, deberán hacer el reporte de los incidentes de
> seguridad […] mediante el aplicativo dispuesto para tal fin en la página web de la
> Superintendencia […] **dentro de los quince (15) días hábiles siguientes** al momento en que se
> detecten y sean puestos en conocimiento de la persona o área encargada de atenderlos."

**The clock start is engineering-relevant.** It runs not from the breach, nor from a log line, but
from the moment the incident is detected **and escalated to the designated data-protection
person/area** (the one required by `2.2.2.25.4.4`). That escalation timestamp is the defensible start
of the term, so the incident runbook must record it.

**Product surface:** the observability and on-call design (#18) must include an incident record with
a `escalated_at` field and a 15-día-hábil SIC-report deadline; `packages`-level audit logging of
access to candidate data; and the security posture that makes "acceso no autorizado" detectable at
all. Also `art. 4(f)`: personal data must not be "disponibles en Internet […] salvo que el acceso sea
técnicamente controlable" — candidate profiles must be authenticated-and-authorised, never publicly
indexable. That is a hard constraint on the SEO question the map leaves open.

---

## 6. Hosting the database in the United States

Two independent bases make US hosting lawful. Either alone would do; we should have both.

### 6.1 It is a _transmisión_, not a _transferencia_ — the decisive distinction

**Decreto 1074 art. `2.2.2.25.1.3`** (= Decreto 1377 art. 3) defines the two operations differently:

> **4. Transferencia.** […] el Responsable y/o Encargado […] ubicado en Colombia, envía la información
> o los datos personales a **un receptor, que a su vez es Responsable del Tratamiento** y se encuentra
> dentro o fuera del país.
>
> **5. Transmisión.** Tratamiento de datos personales que implica la comunicación de los mismos dentro
> o fuera del territorio de la República de Colombia **cuando tenga por objeto la realización de un
> Tratamiento por el Encargado por cuenta del Responsable.**

A hosting provider that stores our database and decides nothing about _why_ the data exists is an
**Encargado**. The SIC agrees: its own **"Recomendaciones para el tratamiento de datos personales
mediante servicios de computación en la nube" (abril de 2021)** states that cloud providers
"usualmente obran como Encargados del Tratamiento", and that where their data centres sit abroad
"el contratante de los servicios […] debe observar las reglas locales de la transferencia
internacional de datos".

**Decreto 1074 art. `2.2.2.25.5.1`** (= D.1377 art. 24) then splits the two tracks:

> 1. Las transferencias internacionales de datos personales deberán observar lo previsto en el
>    artículo 26 de la Ley 1581 de 2012.
> 2. Las transmisiones internacionales […] entre un Responsable y un Encargado para permitir que el
>    encargado realice el tratamiento por cuenta del responsable, **no requerirán ser informadas al
>    Titular ni contar con su consentimiento cuando exista un contrato** en los términos del artículo
>    2.2.2.25.5.2.

So a compliant **contrato de transmisión de datos personales** is what makes US hosting lawful, and
it removes any need for a _declaración de conformidad_.

**Decreto 1074 art. `2.2.2.25.5.2`** (= D.1377 art. 25) fixes the contract's minimum contents: the
_alcances del tratamiento_, the activities the encargado performs on our behalf, and its obligations
toward both the Titular and us; a commitment to apply **our** política de tratamiento and to process
only for the purposes the Titulares authorised; plus three express duties on the encargado —

> 1. Dar Tratamiento, a nombre del Responsable, a los datos personales conforme a los principios que
>    los tutelan. 2. Salvaguardar la seguridad de las bases de datos en los que se contengan datos
>    personales. 3. Guardar confidencialidad respecto del tratamiento de los datos personales.

### 6.2 And the United States _is_ on the SIC's adequacy list

**SIC Circular Externa 005 de 2017** (10 Aug 2017, D.O. 50.321) added **Capítulo Tercero** to Título V
of the Circular Única: adequacy criteria (3.1), the country list (3.2) and the declaración de
conformidad procedure (3.3). Numeral 3.2 was amended twice — **Circular Externa 008 de 2017** added
Japan, **Circular Externa 002 de 2018** added Australia — and not since. The current list reads:

> Alemania; Australia; Austria; Bélgica; Bulgaria; Chipre; Costa Rica; Croacia; Dinamarca;
> Eslovaquia; Eslovenia; Estonia; España; **Estados Unidos de América**; Finlandia; Francia; Grecia;
> Hungría; Irlanda; Islandia; Italia; Japón; Letonia; Lituania; Luxemburgo; Malta; México; Noruega;
> Países Bajos; Perú; Polonia; Portugal; Reino Unido; República Checa; República de Corea; Rumania;
> Serbia; Suecia; y los países que han sido declarados con el nivel adecuado de protección por la
> Comisión Europea.

**"Estados Unidos de América" appears with no qualifier, no footnote, no sectoral limitation and no
reference to Privacy Shield or any successor framework** — which is precisely why the EU's
invalidation of Safe Harbor and Privacy Shield never disturbed the Colombian listing. `us-east-1`
therefore also clears **Ley 1581 art. 26** on its own terms, even if a flow were recharacterised as a
_transferencia_.

Three further paragraphs of numeral 3.2 matter to us:

- **Parágrafo Primero** — adequacy does not discharge _responsabilidad demostrada_: we "deben ser
  capaces de demostrar que han implementado medidas apropiadas y efectivas" for the data we send
  abroad. Adequacy removes the permission question, not the evidence question.
- **Parágrafo Tercero** — "El simple **tránsito transfronterizo** de datos no comporta una
  transferencia". Packets routing through third territories are not a transfer. Relevant to CDN and
  edge topology.
- **Parágrafo Cuarto** — transmission to adequate countries is possible "en los términos que rigen la
  transferencia".

### 6.3 What must be engineered / signed

| Obligation                                                                | Source                                            | Product surface                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A **contrato de transmisión** with every processor holding candidate data | D.1074 art. `2.2.2.25.5.2`                        | Vendor DPAs for the Postgres host, the mail/SMS provider (#6), error tracking, and any analytics — with a Colombia addendum naming Ley 1581 and the three literal duties. Standard US-vendor DPAs cover most but not all of it. **Vendor choice is now a compliance gate**, not only a cost one: a provider that will not sign a DPA cannot hold candidate data. |
| Data-processor inventory                                                  | D.1074 art. `2.2.2.25.6.1`; 3.2 Parágrafo Primero | A maintained register of sub-processors, what each holds, in which country, and under which contract. Needed to answer the SIC, and to write the policy honestly.                                                                                                                                                                                                |
| Disclose international processing                                         | D.1377 arts. 13, 15                               | Name it in the política de tratamiento and the aviso de privacidad. Cheap, and it also picks up **Ley 1581 art. 26(a)** ("autorización expresa e inequívoca para la transferencia") as a belt-and-braces third basis.                                                                                                                                            |
| Demonstrable security measures                                            | 3.2 Parágrafo Primero; L.1581 art. 17(d)          | Encryption in transit and at rest, least-privilege access, key management, a documented risk assessment, incident response, secure deletion on vendor exit. Keep the evidence — the standard is _demonstrable_, not merely present.                                                                                                                              |
| Send only authorised data to processors                                   | L.1581 art. 17(h)                                 | We may hand an Encargado "únicamente datos cuyo Tratamiento esté previamente autorizado". Third-party integrations must not receive fields outside the consented purposes.                                                                                                                                                                                       |

**Verdict: US hosting in `us-east-1` needs no SIC filing, no declaración de conformidad, and no
special consent — provided we sign transmission contracts with our processors.** This does not
disturb the map's hosting given.

---

## 7. Passing candidate data to an employer: we are **Responsable**, and so are they

This is the question with the most product consequence, because it decides whether an employer is
someone we _instruct_ or someone we _hand data to_.

### The test

**Ley 1581 art. 3** defines the two roles by who decides:

> **d) Encargado del Tratamiento:** Persona natural o jurídica, pública o privada, que por sí misma o
> en asocio con otros, realice el Tratamiento de datos personales **por cuenta del Responsable del
> Tratamiento**;
> **e) Responsable del Tratamiento:** Persona natural o jurídica, pública o privada, que por sí misma
> o en asocio con otros, **decida sobre la base de datos y/o el Tratamiento de los datos**;

**Decreto 1377 art. 3** (= `2.2.2.25.1.3`) turns the same test into two named operations:

> **4. Transferencia.** […] el Responsable y/o Encargado […] ubicado en Colombia, envía la información
> o los datos personales a **un receptor, que a su vez es Responsable del Tratamiento** […]
> **5. Transmisión.** […] cuando tenga por objeto la realización de un Tratamiento **por el Encargado
> por cuenta del Responsable**.

### Applying it

An employer who receives a candidate's profile does not process it on our behalf. It reads the
profile to make **its own** hiring decision, keeps it in **its own** recruitment records, and decides
for itself how long to keep it and what to do with it. It decides "sobre […] el Tratamiento de los
datos". **The employer is therefore an independent Responsable, and the disclosure is a
_transferencia_, not a _transmisión_.**

That conclusion is the natural reading of art. 3, and it matches how the platform is described in the
handoff — "Recibe avisos cuando una empresa **revise tu perfil**". It is also the _less_ convenient
answer, because the encargado route would have let us bind employers by contract alone. Note the
carve-out: for the narrow slice where an employer genuinely acts on our instructions and for our
purposes — it does not, in the current design — the encargado analysis and a `2.2.2.25.5.2` contract
would apply instead.

### What follows from that

Because the employer is a separate Responsable, **the lawful basis for the disclosure has to come from
the candidate, not from a contract with the employer.**

- **Ley 1581 art. 13** limits who may receive personal data to Titulares and their representatives,
  public entities in the exercise of legal functions, and "**terceros autorizados por el Titular o por
  la ley**". An employer is a third party authorised by the Titular — which means the authorization
  captured in §2 must cover _this specific purpose_, in its own checkbox: **"share my profile with the
  employers I apply to"**.
- **Ley 1581 art. 4(f)** (_acceso y circulación restringida_) limits treatment to "personas
  autorizadas por el Titular", and forbids personal data being available on the internet unless access
  is technically controlled. So employer access must be scoped, authenticated and logged — an employer
  may see the candidates who applied to _its_ vacancies, not a browsable candidate database. Any
  future "search all candidates" feature is a different, separately consented purpose.
- **Ley 1581 art. 4(h)** (_confidencialidad_) binds everyone who intervenes in the treatment,
  including "después de finalizada su relación" with the activity.
- Once the data is transferred, the employer carries its **own** art. 17 duties for what it holds. We
  do not become liable for their processing — but we do choose whom we transfer to, and a
  soft-verification gate that lets fraudulent "employers" harvest profiles is a data-protection
  failure as much as a trust failure. This connects §7 directly to the verification ticket (#8) and
  the safety ticket (#13).

### What must be engineered

| Obligation                                                               | Source                                                                | Product surface                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A **separate consented purpose** for disclosing the profile to employers | L.1581 arts. 4(c), 13; SIC _Formatos modelo_ granularity rule         | **UI** its own checkbox in `ProfileWizard`; revocable on its own from `/mis-datos`, which must then stop new disclosures                                                                                                                                                                                                                                                                                              |
| Disclosure scoped to the vacancies the candidate applied to              | L.1581 art. 4(f)                                                      | **DB** employer visibility derived from `Application`, never a global candidate index. Employer-side listing is authorisation-checked per vacancy.                                                                                                                                                                                                                                                                    |
| Employer terms of service imposing data-protection obligations           | L.1581 arts. 4(h), 17; contractual, not statutory                     | **LEGAL** binding employer terms: use the data only to evaluate that application, keep it confidential and secure, honour the candidate's rights, do not re-transfer or use it for marketing, delete on request or after a stated period, and accept that they are an independent Responsable under Ley 1581 with their own duties. We cannot _make_ them comply, but we can make it a term and terminate for breach. |
| Tell the candidate who received their data                               | L.1581 art. 8(c) — right to be informed of the use made of their data | **UI** `/mis-postulaciones` already shows which employers hold an application; make that the honest answer to "who has my data", and include it in the export                                                                                                                                                                                                                                                         |
| Verification gate before an employer can receive data                    | L.1581 arts. 4(f), 17(a)                                              | **OPS/UI** ties to #8; the soft gate at launch is a data-protection risk to document, not just a product choice                                                                                                                                                                                                                                                                                                       |
| Audit log of employer access to candidate data                           | L.1581 arts. 4(g), 17(d)                                              | **DB** who viewed which profile and when — needed to answer a candidate's art. 8(c) request and to investigate abuse                                                                                                                                                                                                                                                                                                  |
| Deleting a candidate must reconcile with employer-held copies            | D.1074 `2.2.2.25.2.6`                                                 | **DB/LEGAL** deletion removes our copy and stops further disclosure; the employer's copy is theirs to delete under their own duties. Say so plainly in the policy — do not promise what we cannot deliver.                                                                                                                                                                                                            |

### Two rules that make this verdict hard to escape

**Substance beats labels.** SIC **Concepto Rad. 25-625951** (enero 2026), applying C-748 de 2011:

> …si se evidencia que una persona natural o jurídica, **aun cuando haya sido designado formalmente
> como encargado del tratamiento, determina en la práctica los fines y medios esenciales del
> tratamiento, se considerará responsable del tratamiento** y, en tal condición, asumirá las
> obligaciones previstas […] para quienes tienen este rol.

Writing "the employer is our encargado" into the terms of service would not make it one. The same
concepto states the test the SIC actually applies: "**el responsable es quien determina los fines y
los medios esenciales del tratamiento** […] no actúa por delegación ni tampoco debiendo cumplir las
instrucciones de otra persona", whereas "el encargado […] **no define ni los fines ni los medios
esenciales**".

**C-748 de 2011 names the employer case directly.** In the typology the SIC adopts, one of the ways
the _responsable_ role arises is "(ii) cuando en el ámbito propio de la actividad se produce el
tratamiento, **se trata del caso de los empleadores frente a sus trabajadores**, lo que se denomina
competencia jurídica implícita".

**And the encargado structure would be worse for us anyway.** Concepto 25-625951 again: "**Como el
encargado obra por cuenta del responsable del tratamiento, este último responde por todas las
actuaciones que realice el encargado**". Structuring employers as our encargados would make us
answerable for every employer's misuse of candidate data. As independent responsables, each answers
for its own treatment — the correct legal analysis is also the commercially safer one.

Also load-bearing for the consent design: C-748 §2.6.5.2.3 holds that the _principio de libertad_
"**impide que la información ya registrada de un usuario, la cual ha sido obtenida con su
consentimiento, pueda pasar a otro organismo que la utilice con fines distintos para los que fue
autorizado inicialmente**." Disclosure to employers must be its _own_ stated finality at collection
time — not a use inferred from having a profile.

**A caveat worth keeping.** No SIC concepto, guía, circular or sanction resolution addresses the job
board → employer pattern on its facts; there is no SIC guide on employment-context data at all. The
verdict above is a well-supported inference from SIC-adopted reasoning, not a ruling on our facts.
SIC conceptos are in any case non-binding (C-542 de 2005: they "se equiparan a opiniones, a
consejos"). The design implication does not change — consent must carry the disclosure either way.

**And a much larger flag: the Servicio Público de Empleo authorisation regime probably applies to
us.** That is a labour-administration question, not a data-protection one, but it may be the biggest
constraint this research surfaced. See **§10**.

---

## 8. Datos sensibles — what a candidate profile may safely contain

### The rule

**Ley 1581 art. 5**, verbatim:

> Para los propósitos de la presente ley, se entiende por datos sensibles aquellos que **afectan la
> intimidad del Titular o cuyo uso indebido puede generar su discriminación**, tales como aquellos que
> revelen el **origen racial o étnico**, la **orientación política**, las **convicciones religiosas o
> filosóficas**, la **pertenencia a sindicatos, organizaciones sociales, de derechos humanos** o que
> promueva intereses de cualquier partido político […] así como los datos relativos a la **salud**, a
> la **vida sexual** y los **datos biométricos**.

Note "**tales como**". **Sentencia C-748 de 2011 §2.7.3** upheld art. 5 on exactly that condition:

> …la definición del artículo 5 es compatible con el texto constitucional, **siempre y cuando no se
> entienda como una lista taxativa, sino meramente enunciativa de datos sensibles**, pues los datos
> que pertenecen a la esfera íntima son determinados por los cambios y el desarrollo histórico.

So the operative test is the _first_ clause — data affecting intimacy, or whose misuse can generate
discrimination. A field does not have to appear in the list to be sensitive, and a proxy we invent
can become sensitive.

**Ley 1581 art. 6** prohibits treating sensitive data except with the Titular's _explicit_
authorization (or on four narrow grounds — vital interest, non-profit membership, a right in judicial
proceedings, or historical/statistical/scientific purposes with de-identification).

**A publicity trap worth knowing about.** C-748 de 2011, RESUELVE Tercero, struck from art. 6 the
words "**el Titular haya hecho manifiestamente públicos o**". **Making sensitive data public does not
license processing it.** A candidate who uploads a photo, or writes a health detail into a free-text
box, has not thereby authorised our use of it — we still need explicit consent for that specific
treatment.

The Court also imposed a heightened standard where sensitive data is treated at all: because these
are exceptions to a prohibition, the agents processing it "tienen una **responsabilidad reforzada**
que se traduce en una exigencia mayor en términos de cumplimiento de los principios del artículo 4 y
los deberes del título VI".

**Decreto 1377 art. 6** (= `2.2.2.25.2.3`) adds three duties: tell the Titular they are **not
obliged** to authorize it; tell them explicitly and in advance **which** data are sensitive and the
purpose; obtain **express** consent. And the hard stop:

> **Ninguna actividad podrá condicionarse a que el Titular suministre datos personales sensibles.**

Any field we classify as sensitive **can never be required** — not to complete a profile, not to
apply, and not to reach a "profile complete" score.

**Consent for sensitive data cannot be implied.** Per SIC Concepto 18-171259, the _autorización
explícita_ of art. 6(a) means the consent must be **written or oral**; Concepto 17-364624 confirms
that the _conductas inequívocas_ route in D.1377 art. 7 is **not sufficient** for sensitive data. So
the granular-checkbox pattern from §2 is the floor, not the ceiling, if a sensitive field ever exists.

### Why the stakes are higher than usual

**Ley 1581 art. 23(d)** allows the SIC to order "**cierre inmediato y definitivo** de la operación que
involucre el Tratamiento de datos sensibles". Every other sanction is graduated; this one is not.
Sensitive data is the one category where a mistake can end the platform.

### Field-by-field

| Field                                                                    | Sensitive?                                                | Why, and what to do                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------ | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nombre completo                                                          | No                                                        | Ordinary personal data.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Documento de identidad (cédula)                                          | No, but high-risk                                         | Not in art. 5, but the primary identity-theft vector in Colombia. Under art. 4's minimisation rule, ask **only if a purpose requires it** — v1 has none. Prefer email as the identifier and defer the cédula to a later verification feature.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Fecha de nacimiento                                                      | No                                                        | Justified narrowly by the age gate (§9). Do not display it to employers; age is a discrimination vector.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Correo, teléfono                                                         | No                                                        | Ordinary.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Ciudad / municipio                                                       | No                                                        | Ordinary and needed for search.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Barrio / dirección exacta**                                            | Borderline — **avoid**                                    | In Pereira, neighbourhood is a strong proxy for _estrato_ and can proxy for ethnicity. It is not needed for a city-and-municipality search. Collect municipality, not address.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Historial laboral, cargos, fechas                                        | No, but **it can embed sensitive data**                   | Employment by a union, a political party, a religious institution or an HIV/LGBTQ+ NGO reveals art. 5 categories. Unavoidable in a CV — but **do not build structured or searchable fields on employer type**, and see the free-text warning below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Educación                                                                | No                                                        | Ordinary.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Aspiración salarial                                                      | No                                                        | Ordinary.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Fotografía de perfil**                                                 | **SENSITIVE** under the SIC's current position            | The SIC's _Guía sobre el tratamiento de las fotos como datos personales_ (2020): "algunas fotos captan la imagen de la cara […] **Estas imágenes se consideran información biométrica. Los Datos Biométricos, a su vez, son un ejemplo de Dato Sensible.**" Repeated in an actual decision, **Resolución 46344 del 26 de julio de 2021**. (An earlier Concepto 18-171259 of 2018 had applied a narrower "medios técnicos específicos" test; the later decision-level position is the flat one — see §12.) **Recommendation: no candidate photos in v1.** Removes a whole compliance surface, and aligns with the no-file-uploads given.                                                                                       |
| **Estado de salud, discapacidad**                                        | **Yes — "datos relativos a la salud"**                    | Art. 5 expressly. SIC Concepto 17-28149 reads _dato de salud_ broadly: "cualquier dato personal relativo a la realidad física y psicológica de un individuo […] aunque la misma no responda a la necesidad de tratar una enfermedad en sentido estricto". Disability specifically: MinSalud **Resolución 1239 de 2022** treats the disability registry as involving _datos sensibles_. Do not collect. If workplace-accessibility matching is ever wanted, it must be optional, flagged as sensitive, never required, and **never a filter employers can search on**.                                                                                                                                                         |
| **EPS / afiliación a seguridad social**                                  | Treat as sensitive — _by inference_                       | Not addressed by any SIC source found; classified health-adjacent from the broad _dato de salud_ definition above. Do not collect pre-hire; it belongs to the employer post-offer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Afiliación sindical**                                                  | **Yes — named in art. 5**                                 | Do not collect. Watch for it appearing inside free-text work history.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Afiliación política o religiosa**                                      | **Yes — named in art. 5**                                 | Do not collect. Note that an employer's _name_ in a work history can imply religion or politics; that is the candidate's disclosure about themselves, not a field we ask for.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Origen racial o étnico**                                               | **Yes — named in art. 5**                                 | Do not collect, and do not collect proxies.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Sexo / género                                                            | Not named, but                                            | Gender identity can reveal _vida sexual_, which art. 5 names, and the list is _enunciativa_ (C-748). Unnecessary for matching. **Do not collect in v1**; if ever needed, make it optional with a prefer-not-to-say.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Embarazo / planes reproductivos**                                      | **Yes — health data, and separately prohibited to ask**   | **CST art. 241A núm. 1** (added by Ley 2114 de 2021 art. 3): "**La exigencia de la práctica de pruebas de embarazo queda prohibida como requisito obligatorio para el acceso o permanencia en cualquier actividad laboral** […] Se presume que toda exigencia […] tiene carácter discriminatorio […] se invertirá la carga de la prueba a favor de la mujer." **Núm. 2**: "**La realización de preguntas relacionadas con planes y reproductivos queda prohibida en las entrevistas laborales**." Fine up to **2.455 UVT**. Corroborated by **T-1002 de 1999**. **Never collect, and never let employers ask it through the platform** — the interview-question prohibition plausibly reaches structured screening questions. |
| Estado civil                                                             | Expressly a **dato público** — but drop it anyway         | Decreto 1074 art. `2.2.2.25.1.3` núm. 2 lists "los datos relativos al **estado civil** de las personas, a su profesión u oficio" as public data. Public in classification, but collecting it pre-hire is a proxy for family plans and invites CST 241A(2) exposure. No purpose requires it.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Datos biométricos** (huella, reconocimiento facial)                    | **Yes — named in art. 5**                                 | SIC _Guía […] en las entidades estatales_ (2021), p. 17: "**Las huellas dactilares y la información relativa al estado de salud de las personas son ejemplos de Datos Sensibles.**" Nothing in this product needs them.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Antecedentes judiciales / penales**                                    | Do not collect, do not host, do not offer                 | **Decreto 019 de 2012 art. 93**: "suprímase el documento certificado judicial. En consecuencia, **ninguna persona está obligada a presentar un documento que certifique sus antecedentes judiciales para trámites con entidades de derecho público o privado**." Art. 94 subjects criminal-record administration to Ley 1581. **Sentencia SU-458 de 2012 §35** ordered the Policía Nacional to "**impida que terceros sin un interés legítimo […] conozcan que los peticionarios […] fueron condenados**", invoking Ley 65 de 1993 art. 162 ("los antecedentes penales no [podrán] ser por ningún motivo factor de discriminación social"). A background-check feature would sit squarely in SU-458 territory.                |
| **Libreta / tarjeta militar**                                            | **Remove the field — collecting it pre-hire is unlawful** | **Ley 1861 de 2017 art. 42**: "las entidades públicas o privadas **no podrán exigir al ciudadano la presentación de la tarjeta militar para ingresar a un empleo**".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Free-text fields** (about-me, cover letter, work history descriptions) | **The real risk**                                         | A free-text box is where sensitive data actually arrives: "salí por incapacidad médica", "trabajé en la parroquia", "fui delegado sindical". We cannot pre-classify it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

### The free-text problem

Every field above can be governed by a schema decision. Free text cannot. The mitigation is not
filtering — it is (a) minimising the number and prominence of free-text fields; (b) writing the
helper copy so it steers toward role and responsibilities rather than circumstances; (c) never
indexing free text for employer-side _search_ on terms that would surface sensitive attributes; and
(d) accepting that free text inherits the strictest handling in the system.

This is also where the map's "earthquake-affected status is **never collected**" given earns its
keep. That status is not itself listed in art. 5, but it is exactly the kind of attribute whose
misuse invites discrimination, and it would sit near health and socioeconomic data. Not collecting it
is both the product decision and the data-protection decision — and it should be an explicit rule
that no free-text prompt invites it either.

### What must be engineered

| Obligation                                                               | Source                                               | Product surface                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A profile schema with **no sensitive fields**                            | L.1581 arts. 5, 6; art. 23(d)                        | **DB** the candidate profile in the domain package should be closed and reviewed; adding a field is a decision, not a migration                                                                                                                |
| No activity may be conditioned on sensitive data                         | D.1377 art. 6 / `2.2.2.25.2.3`                       | **UI** if any sensitive field ever exists, it can never be required to complete a profile or apply                                                                                                                                             |
| Explicit consent must be **written or oral**, never implied              | L.1581 art. 6(a); SIC Conceptos 18-171259, 17-364624 | **UI** a distinct consent artefact, not folded into the general one, and not satisfiable by _conducta inequívoca_                                                                                                                              |
| Public disclosure by the candidate does **not** authorise us             | C-748/11 RESUELVE Tercero                            | **DB/OPS** never treat "they typed it themselves" as a lawful basis                                                                                                                                                                            |
| Minimisation as a standing rule                                          | D.1377 art. 4 / `2.2.2.25.2.1`                       | **OPS** every new profile field carries a recorded purpose justification                                                                                                                                                                       |
| **No sensitive field or proxy may be employer-searchable or filterable** | L.1581 art. 5 (the anti-discrimination purpose)      | **DB** a filter _is_ the discrimination mechanism art. 5 exists to prevent. Constrains the search design in #10.                                                                                                                               |
| Free text handled as maximally sensitive                                 | L.1581 art. 5 (_lista enunciativa_, C-748 §2.7.3)    | **DB/UI** minimise free-text surfaces; exclude from employer-side search indexing; strictest access controls                                                                                                                                   |
| Employers cannot ask for sensitive data through us                       | L.1581 arts. 5, 6; CST art. 241A                     | **UI** vacancy authoring and any screening-question feature must forbid sensitive questions — especially pregnancy and reproductive plans, which are separately prohibited by labour law. A content rule enforced in the product, tied to #13. |
| No background-check or criminal-record feature                           | Decreto 019 de 2012 art. 93; SU-458/2012             | **Product** rule out the feature category, not just the field                                                                                                                                                                                  |

---

## 9. Minors — a real product decision, not an edge case

Colombia's minimum working age is **15**. **Ley 1098 de 2006 (Código de la Infancia y la
Adolescencia) art. 35**: "La edad mínima de admisión al trabajo es los quince (15) años. Para
trabajar, los adolescentes entre los 15 y 17 años requieren la respectiva autorización expedida por
el Inspector de Trabajo o, en su defecto, por el Ente Territorial Local". A person is a minor until 18. So a job platform in Pereira will meet 15-, 16- and 17-year-old job seekers.

Data-protection law is severe here. **Ley 1581 art. 7**: "Queda proscrito el Tratamiento de datos
personales de niños, niñas y adolescentes, **salvo aquellos datos que sean de naturaleza pública**."
**Decreto 1377 art. 12** (= `2.2.2.25.2.9`) repeats the prohibition and allows treatment only where it
(1) responds to and respects the _interés superior_ of the minor and (2) assures respect for their
fundamental rights — and then:

> el **representante legal** del niño, niña o adolescente otorgará la autorización **previo ejercicio
> del menor de su derecho a ser escuchado**, opinión que será valorada teniendo en cuenta la madurez,
> autonomía y capacidad para entender el asunto.

A candidate profile is plainly _not_ "de naturaleza pública".

**There is no age of digital consent anywhere in Ley 1581 or Capítulo 25.** No provision lets a 16- or
17-year-old self-authorize, none carves out employment, and no SIC circular or guide was found
resolving it. This is the sharpest unresolved legal risk in the whole research.

**The decision this forces.** Either:

- **(a) Restrict self-registration to 18+**, with a date-of-birth gate at signup. Simple, defensible,
  and it excludes a population the platform is arguably meant to serve; or
- **(b) Build a verified legal-representative authorization flow** — the representative gives consent,
  and the flow records that the minor was heard. There is no primary-source authority validating a
  self-declared "my parent agrees" checkbox, so a real flow means real work: representative identity,
  a separate consent artefact, and a recorded _derecho a ser escuchado_ step.

Recommendation for v1: **(a)**, stated plainly in the aviso, with (b) as a later, deliberate feature.
Whichever we pick, **Ley 1581 art. 12(b)** requires disclosing that answering questions about minors'
data is facultative, and **`2.2.2.25.4.1`** confirms a minor's rights are exercised by their
representatives — so the `/mis-datos` flows in §4 need a representative path if (b) is ever built.

**Product surface:** a date-of-birth field at `/registro` whose only job is the age gate (itself
personal data, so justified under minimisation), a hard block below 18 in v1, and an entry in the
glossary distinguishing _Titular_ from _representante legal_.

---

## 10. Adjacent regimes that also bite

### Servicio Público de Empleo — the biggest constraint this research turned up

**Out of this ticket's scope, and it needs its own.** This is labour-administration law, not data
protection. But it surfaced while establishing whether employers are _responsables_, it is
potentially existential for the product shape, and #6 (messaging providers) hit the same decree
independently from another direction — so it is recorded here rather than lost.

**The finding: a commercial online job marketplace in Colombia appears to require prior authorisation
from the Unidad Administrativa Especial del Servicio Público de Empleo (UAESPE) before operating, and
no "we only publish listings" exemption was found in the primary sources.**

**Ley 1636 de 2013:**

- **Art. 25** — the service "**podrá hacerse de manera personal y/o virtual**". Virtual provision is
  contemplated at statutory level.
- **Art. 29**, as amended by **Ley 2225 de 2022 art. 11** — "se entienden por servicios de gestión y
  colocación de empleo […] **1. todas aquellas actividades que faciliten el encuentro entre oferta y
  demanda laboral.**" The 2022 amendment made this _broader_.
- **Art. 30** — agencies are "las personas jurídicas, públicas o privadas, **nacionales o
  extranjeras**, que ejercen las actividades descritas en el artículo anterior".
- **Art. 32** — "**Para ejercer la actividad de gestión y colocación de empleo, se requerirá la
  autorización** expedida mediante resolución motivada".
- **Art. 38** — operating without it is punished "**con una multa equivalente al monto de uno (1) a
  cinco mil (5.000) salarios mínimos** legales vigentes […] **Si persisten […] multas sucesivas**",
  and art. 38 reaches _personas naturales_ even though only _personas jurídicas_ can be authorised.

**Decreto 2852 de 2013, compiled into Decreto 1072 de 2015, Libro 2, Parte 2, Título 6:**

- **`2.2.6.1.2.17`** — the four basic activities: "a) Registro de oferentes, demandantes y vacantes;
  b) Orientación ocupacional…; c) Preselección, **o** d) Remisión." The list is **disjunctive** — any
  one of them triggers the regime.
- **`2.2.6.1.2.18`** — "**Cuando los servicios de empleo sean prestados utilizando exclusivamente
  medios electrónicos, la autorización se entenderá otorgada para todo el territorio nacional** […]
  **PARÁGRAFO. Solo las personas jurídicas autorizadas podrán prestar los servicios de gestión y
  colocación**".
- **`2.2.6.1.2.15` parágrafo** — providers include legal persons operating "**servicios asociados o
  relacionados, aun cuando no desarrollen alguna de las actividades básicas**".
- **`2.2.6.1.2.22` lit. h)** — the provider's information system must support "**De remisión de hojas
  de vida de los oferentes a los demandantes de empleo**" — precisely what a marketplace does.
- **`2.2.6.1.2.4` (Gratuidad)** — "Las actividades básicas […] **serán prestadas siempre de forma
  gratuita para el trabajador.**" Ley 1636 art. 28 lets private agencies charge **the employer** only;
  `2.2.6.1.2.29` permits charging either side only for _servicios especializados_.
- **`2.2.6.1.2.36`** — a **bolsa de empleo** is narrow: "la persona jurídica **sin ánimo de lucro** […]
  **para un grupo específico de oferentes con los cuales tiene una relación particular**". An open
  commercial marketplace is therefore **not** a _bolsa de empleo_; it would be an **agencia privada
  lucrativa** under Ley 1636 art. 28 lit. a).
- Ley 1636 **art. 31** (amended by Ley 2225/2022 art. 12) requires _all_ employers to report vacancies
  to the SPE — and a posting on an unauthorised portal does not discharge that duty.

**What closes the obvious escape routes.** **Resolución 3229 de 2022** (which derogated Res. 2232 de
2021, which had derogated Res. 3999 de 2015) defines:

> **Punto Virtual: Portal de internet mediante la cual se prestan uno o varios servicios básicos de
> gestión y colocación de empleo a los oferentes o buscadores de empleo y potenciales empleadores.**

and its Anexo Técnico counts registration "de manera autónoma o asistida por el prestador"
(self-service counts) and treats _Preselección_ as including "acciones generadas por el sistema de
información autorizado" (algorithmic matching counts). Res. 3229 art. 3 also makes the four basic
services _obligatorios_ — you cannot be authorised to do only publishing.

**Corroborating practice.** Computrabajo (DGNET Ltd, Colombian branch NIT 900.786.587-9), a purely
virtual self-service job board, is authorised as an _Agencia Privada Lucrativa de gestión y colocación
de empleo_ by UAESPE Resolución 0375 del 29 de julio de 2022.

**What it would impose, if it applies:** incorporation as a _persona jurídica_ with _gestión y
colocación de empleo_ in the corporate object; a Reglamento de Prestación de Servicios and Proyecto
de Viabilidad; an information system interoperable with the SISE with daily vacancy transmission; a
four-year authorisation; display of the authorisation number in all promotion; **basic services free
to candidates** — so monetisation must come from employers or from delineated _servicios
especializados_; and a separate special authorisation for cross-border placement.

**How firm is this?** The primary texts are quoted above and are firm. What is _inferred_ is the
application to our facts: **no official UAESPE or MinTrabajo statement was found saying in terms that
a publish-only portal does or does not require authorisation.** The absence of any carve-out —
searches of the whole Título 6 for _medio de comunicación_, _aviso_, _publicidad_, _clasificados_,
_portal_, _no requiere autorización_, _se exceptúa_ found only exceptions to the _employer's_ vacancy
duty — is itself the finding, but it is not the same as a ruling.

**Recommendation: open a ticket, and resolve it before launch rather than after.** It bears directly
on the map's "vacancies enter via employer self-serve" given and on monetisation, which the map
currently places out of scope. Note that the #6 messaging research independently reported a **100
SMLMV bond** requirement under the same decree; that specific figure was **not** among the articles
read here, so treat it as unconfirmed by this research and reconcile the two readings in that ticket.

### Ley 2300 de 2023 — when and how we may message candidates

Verified from the primary text (Ley 2300 del 10 de julio de 2023, "Por medio de la cual se establecen
medidas que protejan el derecho a la intimidad de los consumidores").

Art. 1 aims the law at entities supervised by the Superintendencia Financiera and at debt collection
— neither of which is us. But **art. 5** extends it:

> "Lo dispuesto en la presente ley se aplicará en los mismos términos a las relaciones comerciales
> entre los productores y proveedores de bienes y servicios privados o públicos y el consumidor
> comercial frente al envío de **mensajes publicitarios** a través de mensajes cortos de texto (SMS),
> mensajería por aplicaciones web, correos electrónicos y llamadas telefónicas de carácter comercial
> o publicitario."

and art. 5 parágrafo 3 confirms those messages may only go out inside the art. 3 windows. **Art. 3**
sets them: no contact through several channels within the same week, nor more than once in the same
day, and only "dentro del horario de lunes a viernes y de 7:00 am a 7:00 pm, y sábados de 8:00 am a
3:00 pm, excluyendo cualquier tipo de contacto con el consumidor los domingos y días festivos."

**Art. 5 parágrafo 2** reads straight onto a signup form:

> "…no podrá obligarse al consumidor a aceptar recibir mensajes comerciales de ninguna índole, salvo
> aquellos asuntos estrictamente relacionados con el bien o servicio adquirido. Cuando se trate de
> promociones para alimentar bases de datos, el consumidor deberá saberlo y aceptarlo de manera
> explícita. El emisor del mensaje deberá habilitar y disponer de un **mecanismo ágil, sencillo y
> eficiente para cancelar en cualquier momento** la recepción de mensajes y correos."

**Art. 8** exempts contacts whose purpose is to send "información solicitada por el consumidor".

**Reading for us.** Messages reporting on something the candidate initiated — "tu postulación pasó a
revisión", a password reset, an employer's message about _their_ application — are transactional and
sit within art. 8. **Promotional sends are not**: a weekly "nuevos empleos para ti" blast, a
re-engagement nudge, anything advertising the platform is a _mensaje publicitario_ and inherits the
whole regime. Enforcement sits with the Superintendencia Financiera and the SIC (art. 9).

**Product surface** — this constrains the messaging design in #6:

- a per-message-type **transactional vs promotional** classification, a property of the type, not a
  runtime guess;
- a send scheduler that holds promotional sends to the next permitted window in `America/Bogota`,
  honouring Colombian _festivos_;
- frequency caps: at most one contact per day, and not across multiple channels in the same week;
- a one-click unsubscribe on every promotional message, separate from deleting the account;
- marketing consent captured **separately** and never bundled with signup — which is the same
  granular-consent rule as §2, arriving from a second direction;
- consult the **Registro de Números Excluidos** before promotional SMS or calls. A good reason to keep
  anything promotional on email and in-app only.

### Ley 1266 de 2008 — not ours, and worth keeping that way

Ley 1581 art. 2(e) expressly carves databases governed by **Ley 1266 de 2008** (financial, credit,
commercial and services data) out of its scope; they have their own regime, their own deadlines and,
after Ley 2157 de 2021, their own quirks. Nothing in the current product touches credit data. If
income verification, credit scoring or payment history ever enters the model, that is a separate
research ticket, not an extension of this one.

---

## 11. Consolidated checklist — obligation → product surface

Legend: **DB** schema or domain package · **UI** a screen or component · **OPS** a process or internal
document · **LEGAL** an artefact a lawyer should draft or review.

| #   | Obligation                                                                                                     | Source                                                                        | Surface                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | No RNBD registration below 100.000 UVT of total assets; personas naturales excluded outright                   | D.1074 `2.2.2.26.1.2` (Decreto 090 de 2018 art. 1)                            | **OPS** ADR + an asset-threshold tripwire in annual bookkeeping                                      |
| 2   | Consent requested at or before collection, informing every specific _finalidad_                                | D.1377 art. 5 / `2.2.2.25.2.2`                                                | **UI** consent step in `ProfileWizard` before persistence                                            |
| 3   | **One separately selectable checkbox per finalidad**                                                           | SIC _Formatos modelo_ (2022), Anexo 2                                         | **UI** enumerated, unticked purposes                                                                 |
| 4   | Silence is never consent                                                                                       | D.1377 art. 7 / `2.2.2.25.2.4`                                                | **UI** nothing pre-ticked; no implied acceptance                                                     |
| 5   | Collect only pertinent and adequate data; no deceptive means                                                   | D.1377 art. 4 / `2.2.2.25.2.1`                                                | **DB** a recorded justification per profile field                                                    |
| 6   | Retain **provable consent**, reproducible to the Titular on demand                                             | L.1581 arts. 9, 17(b), 8(b); D.1377 art. 8                                    | **DB** append-only consent event log · **UI** included in data export                                |
| 7   | Retain proof of the **art. 12 disclosure** as a second trail                                                   | L.1581 art. 12 par.; SIC e-commerce guide (2019)                              | **DB** consent row references the rendered disclosure version                                        |
| 8   | Publish the **política de tratamiento** with all six contents                                                  | D.1377 art. 13 / `2.2.2.25.3.1`                                               | **UI** versioned `/legal/politica-de-tratamiento` · **LEGAL**                                        |
| 9   | Publish a physical address, email and telephone                                                                | D.1377 art. 13(1)                                                             | **OPS** forces the persona-natural-vs-S.A.S. decision                                                |
| 10  | State the retention period — and honour it                                                                     | D.1377 arts. 13(6), 11                                                        | **OPS** retention schedule · **DB** deletion jobs                                                    |
| 11  | Show an **aviso de privacidad** at every point of collection                                                   | D.1377 arts. 14, 15                                                           | **UI** inline in `ProfileWizard`, `ReportForm`, employer signup · **LEGAL**                          |
| 12  | **Retain the model of every aviso version**                                                                    | D.1377 art. 16 / `2.2.2.25.3.4`                                               | **DB** versioned documents with `effective_from`                                                     |
| 13  | Publish the rights-exercise procedure inside the policy                                                        | D.1377 art. 18 / `2.2.2.25.3.6`                                               | **UI/LEGAL**                                                                                         |
| 14  | Substantial change → notify before implementing; changed _finalidad_ → re-consent                              | D.1377 arts. 5, 13                                                            | **UI** targeted re-consent flow keyed on stored version                                              |
| 15  | Free, permanently available, simple channel to exercise rights                                                 | D.1074 `2.2.2.25.4.2`, `2.2.2.25.2.6`                                         | **UI** a first-class `/mis-datos` — view, export, correct, revoke, delete                            |
| 16  | Consulta answered in 10 días hábiles (+5 with notified reasons)                                                | L.1581 art. 14                                                                | **DB** `data_request` with a Colombian business-day clock · **OPS** alerting                         |
| 17  | Reclamo resolved in 15 días hábiles (+8 with notified reasons), from the day after receipt                     | L.1581 art. 15.3                                                              | same                                                                                                 |
| 18  | Incomplete reclamo: cure request within 5 days (unqualified — treat as calendar); desistimiento after 2 months | L.1581 art. 15.1                                                              | same                                                                                                 |
| 19  | `reclamo en trámite` legend on affected records within 2 días hábiles, held until decided                      | L.1581 arts. 15.2, 18(g)                                                      | **DB** a persistent flag in the domain model, not a ticket status                                    |
| 20  | Do not circulate data being contested                                                                          | L.1581 art. 18(i)                                                             | **DB/UI** flagged profiles withheld from employer surfaces                                           |
| 21  | Deletion and revocation honoured unless a legal or contractual duty to remain exists — no SIC ruling required  | C-748/11 pt. Cuarto; D.1074 `2.2.2.25.2.6`                                    | **DB** an enumerated set of retention grounds, recorded per refusal                                  |
| 22  | Identity verification by means we provide, incl. causahabientes and apoderados                                 | D.1074 `2.2.2.25.4.1`                                                         | **UI** session-based for users; a human-reviewed path otherwise                                      |
| 23  | Name a person or area responsible for data protection                                                          | D.1074 `2.2.2.25.4.4`                                                         | **OPS/LEGAL** named, with contact details, in the policy                                             |
| 24  | Internal manual of policies and procedures — separate from the public policy                                   | L.1581 art. 17(k)                                                             | **OPS** a document in the repo                                                                       |
| 25  | Security measures adequate **and demonstrable**                                                                | L.1581 arts. 4(g), 17(d); Circ. Única 3.2 Par. Primero; D.1074 `2.2.2.25.6.1` | **OPS/DB** encryption, least privilege, audit logging, documented risk assessment, retained evidence |
| 26  | Personal data never publicly available online unless access is technically controlled                          | L.1581 art. 4(f)                                                              | **UI** candidate profiles behind auth, never indexable — constrains the open SEO question            |
| 27  | Report security incidents to the SIC within 15 días hábiles of detection **and** escalation                    | Circ. Única Tít. V num. 2.1 f)(ii); L.1581 arts. 17(n), 18(k)                 | **OPS** incident record with `escalated_at` and a report deadline                                    |
| 28  | Sign a **contrato de transmisión** with every processor holding candidate data                                 | D.1074 `2.2.2.25.5.2`                                                         | **LEGAL** DPAs + Colombia addendum · **OPS** vendor choice becomes a compliance gate                 |
| 29  | Maintain a processor / sub-processor register and disclose it                                                  | Circ. Única 3.2 Par. Primero                                                  | **OPS** register, reflected in the policy                                                            |
| 30  | Send processors only data whose treatment is already authorised                                                | L.1581 art. 17(h)                                                             | **DB** field-level scoping of third-party integrations                                               |
| 31  | Minors: no self-registration under 18 in v1                                                                    | L.1581 art. 7; D.1377 art. 12 / `2.2.2.25.2.9`; Ley 1098 art. 35              | **UI** date-of-birth age gate at `/registro`                                                         |
| 32  | Promotional messages only in permitted windows, capped, with unsubscribe and separate consent                  | Ley 2300 de 2023 arts. 3, 5, 8                                                | **OPS/DB** message-type classification, scheduler, frequency caps, unsubscribe                       |
| 33  | **No sensitive field or proxy may be employer-searchable or filterable**                                       | L.1581 art. 5                                                                 | **DB** constrains the search design in #10 — a filter is the discrimination mechanism                |
| 34  | Consent for sensitive data must be written or oral, never _conducta inequívoca_                                | L.1581 art. 6(a); SIC Conceptos 18-171259, 17-364624                          | **UI** a distinct consent artefact if a sensitive field ever exists                                  |
| 35  | A candidate making data public does **not** authorise our use of it                                            | C-748/11 RESUELVE Tercero                                                     | **OPS** never treat self-disclosure as a lawful basis                                                |
| 36  | No pregnancy or reproductive-plan questions anywhere, including employer screening                             | CST art. 241A (Ley 2114 de 2021 art. 3)                                       | **UI** enforced in vacancy authoring and any screening-question feature (#13)                        |
| 37  | No criminal-record, background-check or _libreta militar_ collection — as fields or as features                | Decreto 019 de 2012 art. 93; SU-458/2012; Ley 1861 de 2017 art. 42            | **Product** rule out the feature category                                                            |
| 38  | No candidate photo in v1                                                                                       | SIC _Guía fotos_ (2020); Resolución 46344 de 2021                             | **UI/DB** aligns with the no-file-uploads given                                                      |

---

## 12. What could not be verified from primary sources

Ordered by how much each could change a build decision. These are the points to put in front of a
lawyer first.

1. **A citation conflict about where the SIC's data-protection instructions live, and it touches the
   deadlines in §4 and the adequacy list in §6.** One research thread located the incident-reporting
   and reclamo-reporting rules in the **SIC Circular Única, Título V, Capítulo Segundo**, working from
   a PDF served at `sic.gov.co/.../Titulo V Proteccion_Datos_Personales.pdf`, and the adequacy list in
   **Título V, Capítulo Tercero** as added by Circular Externa 005 de 2017. A second thread reported
   that **Título V of the Circular Única is _Acreditación_**, and that data-protection instructions
   live in standalone Circulares Externas instead. Both cannot be right. The _substance_ — a
   15-día-hábil incident report, the semi-annual reclamos report, and an adequacy list naming the
   United States — was read from SIC documents in both threads and is not in doubt; **only the
   citation form is.** Verify the correct title/chapter before quoting it in anything external, and do
   not cite "Circular Única Título V" in a legal document until it is confirmed. The file-name
   evidence favours Título V being data protection, but that is inference from a URL.
2. **Whether the Servicio Público de Empleo regime applies to a publish-only portal.** The primary
   texts in §10 are firm and point strongly at "yes". What is _not_ established is an official UAESPE
   or MinTrabajo statement addressing our facts: no carve-out for listing-only portals was found
   anywhere in Título 6, but absence of a carve-out is evidence, not a ruling. **This needs its own
   ticket**, and it is the largest open commercial question this research produced.
3. **The 100 SMLMV bond** reported by the #6 messaging research under the same decree. That figure was
   **not** among the articles read here. Reconcile the two readings in the ticket above rather than
   assuming either.
4. **The doctrinal tension on photographs.** SIC Concepto 18-171259 (2018) treats an image as
   biometric only "cuando el hecho de ser tratadas con medios técnicos específicos permita la
   identificación o la autenticación unívocas"; the 2020 _Guía sobre el tratamiento de las fotos_ and
   Resolución 46344 de 2021 state flatly that a face image is biometric and therefore sensitive. The
   later, decision-level position is the one to plan against, and §8's recommendation follows it — but
   if photos are ever wanted, get this resolved rather than picking the convenient reading.
5. **Partial vs total revocation of consent.** No article of Ley 1581, Decreto 1377 or Decreto 1074
   Cap. 25 uses the words _revocatoria parcial_ / _total_. The distinction is SIC doctrine derived
   from consent being granted per-_finalidad_ (D.1377 art. 5) and from the SIC's own model-formats
   guidance. Purpose-level revocation is the safe design either way; just do not cite an article for
   it.
6. **No SIC doctrine on the job-board → employer pattern.** No concepto, guía, circular or sanction
   resolution addresses _bolsa de empleo_, _portal de empleo_, CV-sharing with employers, or
   employment-context data protection generally — there is no SIC guide on employment data at all. The
   §7 verdict rests on C-748/11's _competencia jurídica implícita_ typology as adopted by SIC Concepto
   25-625951. Good authority, not a ruling on our facts. Note also that SIC conceptos are non-binding
   (C-542 de 2005: they "se equiparan a opiniones, a consejos").
7. **No SIC doctrine on liability allocation between two independent Responsables.** Art. 18 parágrafo
   covers only role _concurrence_ in one person. The §7 reading — each answers for its own treatment —
   is inference. What _is_ documented is the opposite axis: a responsable answers for its encargado's
   acts (Concepto 25-625951), which is the argument against structuring employers as encargados.
8. **No SIC concepto stating in terms that a Responsable needs authorization specifically covering
   onward disclosure to another independent Responsable.** That rule is assembled from Ley 1581 arts.
   4(b)/(c), 9, 12 and 13(c) plus C-748 §2.6.5.2.3. The assembly is sound; there is no single citation
   for it.
9. **Whether a consolidated SIC Circular Única data-protection title newer than the 30 March 2020
   version exists.** `www.sic.gov.co` served an untrusted TLS certificate throughout. No amending
   circular between 2020 and 2026 was found, and SIC Circular Externa 002 de 2025 describes the regime
   in unchanged terms — strong negative evidence, not proof. Combine with item 1 before citing.
10. **The exact sub-literal carrying the 15-día-hábil incident deadline.** The text sits inside
    "Reporte de novedades"; cited here as numeral 2.1 f)(ii) with that caveat.
11. **EPS / afiliación a seguridad social as health data.** No SIC source addresses it; classified in
    §8 by inference from the broad _dato de salud_ definition in Concepto 17-28149.
12. **A static scanned signature.** The SIC only ever describes "la forma de firmar" — the dynamic act
    — as a behavioural biometric. Whether a signature _image_ is biometric is unaddressed. Not
    currently relevant, but it would be if signed documents ever enter the product.
13. **Decreto 1543 de 1997** (HIV-testing prohibition in employment) — not verified this session.
    Relevant only if health data is ever collected, which §8 recommends against.
14. **Two source-quality defects worth knowing about.** (a) Función Pública's rendering of compiled
    art. `2.2.6.1.2.17` **omits "4. Remisión"**, which Decreto 1823 de 2020 art. 4 and Resolución 3229
    de 2022 art. 3 both list — check the Diario Oficial before relying on that article formally.
    (b) Two SIC _sede electrónica_ boletín pages have their **PDF attachments swapped**; always cite
    the radicado printed inside the PDF, not the page title.
15. **Any age of digital consent for 15–17-year-olds.** None found in Ley 1581, Capítulo 25, or any SIC
    circular or guide. The prohibition plus legal-representative authorisation plus right-to-be-heard
    model in §9 appears to be the whole of the primary law. Treat as a genuine unresolved risk, and the
    reason to gate at 18 in v1.
16. **Whether the SIC has published guidance on electronic / click-wrap consent evidence
    specifically** — log formats, hashing, e-signature standards. None found. The only textual anchor
    is Decreto 1377 art. 16's reference to **Ley 527 de 1999**, and that is worded for the _aviso de
    privacidad model_, not the per-user authorization record. The design in §2 is therefore a reasoned
    interpretation, not a documented SIC expectation.
17. **The SIC's _Guía para la implementación del principio de responsabilidad demostrada_ (28 May
    2015).** The PDF on sic.gov.co is a scanned image with no text layer, and the link advertised on
    the SIC's own news page 404s. Cited by title and date only; its contents were not read.
18. **SIC Concepto 23-394496**, reportedly the SIC's opinion directly on Colombian data held by
    US-based cloud providers. Could not retrieve the primary document (TLS failures on SIC concepto
    pages); only law-firm summaries were available, which this research does not accept.
19. **Whether RNBD registration is free, and how long it takes.** The SIC's RNBD page, FAQ, terms and
    user manual state no fee and no processing SLA. Moot while we are below the threshold.
20. **Which year's UVT applies to the 100.000 UVT asset test.** Decreto 090 de 2018 gives no temporal
    anchor and no SIC instructivo resolves it. Moot at our scale.
21. **Cost and processing time of a _declaración de conformidad_**, and the contents of the SIC's
    "Guía para Solicitar la Declaración de Conformidad" — both published copies are image-only scans.
    Moot for US hosting, which needs no declaración.
22. **The rationale for the United States' place on the adequacy list.** Circular Externa 005 de 2017
    gives none beyond citing a 2013 outside-counsel study. The listing is unconditional today, but its
    basis is opaque, so its durability cannot be assessed. This is why §6 leads with the
    _transmisión_-plus-contract route and treats adequacy as the fallback, not the other way round.

### One thing that is settled, and worth recording

**The reform bill is dead.** Proyecto de Ley Estatutaria **274 de 2025 Cámara** ("Por la cual se
modifica parcialmente la Ley 1581 de 2012"), filed 27 August 2025 by MinCIT and MinCiencias and
accumulated with PL 214/2025C, was approved in Comisión Primera (Acta 18, 28 October 2025) and is now
recorded by the Cámara de Representantes as **ARCHIVADO** under art. 190 of Ley 5 de 1992. It would
have added portability, rules on automated decisions, a right to erasure and fines up to 10.000 SMLMV
or 5% of income. **Ley 1581 stands unamended**, and this research is written against the law in force.
A future bill in the same shape is likely, so re-check before any large investment in the consent and
rights machinery.

---

## Sources

Primary texts and official guidance relied on:

- Ley Estatutaria 1581 de 2012 — Función Pública, _Gestor Normativo_
- Decreto 1377 de 2013 — Función Pública, _Gestor Normativo_; MinTIC normogram compilation
- Decreto 1074 de 2015 (DUR Sector Comercio, Industria y Turismo), Libro 2, Parte 2, Título 2,
  Capítulos 25 and 26
- Decreto 886 de 2014 (RNBD) and Decreto 090 de 2018 (RNBD scope)
- Decreto 255 de 2022 (Normas Corporativas Vinculantes — available to business groups, not to us)
- Corte Constitucional, Sentencia C-748 de 2011
- Corte Constitucional, Sentencia SU-458 de 2012 (criminal records)
- SIC Circular Única — the data-protection title, Capítulo Segundo (RNBD, incident and reclamo
  reporting) and Capítulo Tercero (international transfer), as amended by Circulares Externas 005 y
  008 de 2017 y 002 de 2018. **See §12 item 1 on the citation conflict before quoting this.**
- SIC, _Formatos modelo para el cumplimiento de obligaciones establecidas en la Ley 1581 de 2012 y sus
  decretos reglamentarios_ (November 2022)
- SIC, _Guía sobre el Tratamiento de Datos Personales para fines de Comercio Electrónico_ (2019)
- SIC, _Guía sobre el tratamiento de las fotos como datos personales_ (2020)
- SIC, _Guía sobre el tratamiento de datos personales en las entidades estatales_ (2021)
- SIC, _Recomendaciones para el tratamiento de datos personales mediante servicios de computación en
  la nube_ (April 2021)
- SIC Resolución 46344 del 26 de julio de 2021 (face image as biometric data)
- SIC Conceptos 25-625951, 25-458959, 18-171259, 17-364624, 17-28149
- SIC Boletín Jurídico — concepto on _Cumplimiento de la obligación del reporte de incidentes de
  seguridad_; habeas data enforcement decision on consent evidence
- DIAN Resolución 000238 de 2025 (UVT 2026)
- Ley 1098 de 2006 art. 35 (minimum working age)
- Código Sustantivo del Trabajo art. 241A, added by Ley 2114 de 2021 art. 3 (pregnancy)
- Ley 1861 de 2017 art. 42 (_libreta militar_)
- Decreto 019 de 2012 arts. 93–94 (_antecedentes judiciales_)
- MinSalud Resolución 1239 de 2022 (disability registry as sensitive data)
- Ley 2300 de 2023
- Cámara de Representantes record for PL 274/2025C

Consulted for §10 (Servicio Público de Empleo — recorded for a separate ticket, not this one's scope):

- Ley 1636 de 2013 arts. 25, 28, 29, 30, 31, 32, 38, as amended by Ley 2225 de 2022 arts. 11–12
- Decreto 2852 de 2013, compiled into **Decreto 1072 de 2015**, Libro 2, Parte 2, Título 6 — arts.
  `2.2.6.1.2.4`, `2.2.6.1.2.15`, `2.2.6.1.2.17`, `2.2.6.1.2.18`, `2.2.6.1.2.22`, `2.2.6.1.2.29`,
  `2.2.6.1.2.36`
- MinTrabajo Resolución 3229 de 2022 (which derogated Res. 2232 de 2021, which derogated Res. 3999 de 2015) and its Anexo Técnico
- UAESPE Resolución 0375 del 29 de julio de 2022 (Computrabajo authorisation — corroborating practice)
