# Encuentra

Encuentra connects people in Pereira and Risaralda who lost their income after the earthquake with
anyone, anywhere, willing to offer them paid work. A person says what they can do; another person
says what they need done; the platform carries a structured offer between them and stops at the
introduction. No money moves through the platform.

**Naming rule.** Code, database, routes and file names are **English**. Spanish is strictly a UI
concern. Each term below carries the Spanish word used in copy, so the UI stays consistent without
the schema inheriting Colombian labour-law vocabulary. A small set of legal terms of art stay
Spanish everywhere, because translating them loses the tie to the statute.

## Language

### People

**Person**:
A human being with an account on Encuentra. The only account type — there are no company or
employer accounts.
_Spanish (UI)_: persona
_Avoid_: User, Account, Member, Candidate, Worker, Jobseeker, Oferente

**User**:
Reserved for the authentication concept — the Better Auth row that can sign in. Never used for the
human in domain code; a `Person` holds a nullable reference to one.
_Avoid_: using this word for a Person

**Titular**:
The role a Person plays under Ley 1581 — the data subject whose personal data we hold. A role, not
a second entity. Kept in Spanish as a legal term of art.

**Contact Details**:
The means of reaching a Person directly — their phone number and email. Held on the Person, never
shown on a Publication, and released to another Person only by a Contact Exchange.
_Spanish (UI)_: datos de contacto

**Contact Exchange**:
The event, at the acceptance of an Offer, that releases *both* Persons' Contact Details to each
other. Not one-directional and not a property of the Offer — it is the thing the Offer exists to
cause, and the thing each side separately authorises.
_Spanish (UI)_: intercambio de datos
_Avoid_: Disclosure (reserved for the Ley 1581 sense — see below), Reveal, Match

### Signing in

**Credential**:
How a Person proves they are the same human returning — a Google account, a Facebook account, or a
password. A Person may hold more than one, and is prompted to, because holding only one is how
people get locked out. Distinct from Contact Details: a phone number is a way to *reach* someone,
never a way to sign in.
_Spanish (UI)_: forma de ingreso
_Avoid_: Login, Identity, Provider (a Provider is the third party behind a Credential, not the
Credential itself)

**Pending Signup**:
The short-lived record holding a would-be Person's Consents, name and date of birth between
submitting `/signup` and returning from Google or Facebook. It exists so that Consent is recorded
*before* any personal data is stored rather than after, which the law requires and a redirect would
otherwise make impossible. Discarded if the person never comes back; it is not an account.
_Avoid_: Draft account, Partial user, Pending user

### What a person publishes

**Publication**:
Something a Person puts in front of others — either a Capability Profile or a Need. It carries what
both kinds share: the Person who owns it, its municipality, whether it is open to remote work, its
skills, and whether it is a draft, published or unpublished. An Offer is always addressed to a
Publication.
_Spanish (UI)_: publicación
_Avoid_: Listing, Posting

**Capability Profile**:
A kind of Publication: what a Person can do and is willing to do — their skills, experience and
availability. Optional, and at most one per Person. It is not the Person's identity; name,
municipality and contact details belong to the `Person`.
_Spanish (UI)_: perfil
_Avoid_: UserProfile, CV, Résumé, Hoja de vida

**Need**:
A kind of Publication: a specific piece of paid work a Person wants done, whether a one-off errand
or an ongoing role. A Person may publish any number of them.
_Spanish (UI)_: necesidad
_Avoid_: Job, Vacancy, Vacante, Oferta laboral

**Commitment**:
The shape of the work a `Need` describes — one-off or ongoing, with expected hours or dates. A
property of a Need, not a separate kind of Need.
_Spanish (UI)_: dedicación

**Work Setting**:
Where the work would happen — in the hirer's home, in the worker's own home, on business premises,
out in public or across several places, or remotely. A property of a **Need and of an Offer** alike,
drawn from a fixed vocabulary. It exists because the risk of cleaning a stranger's house is not the
risk of remote data entry, and the platform must be able to tell those apart: it selects the safety
guidance shown at a Contact Exchange and raises a Report's place in the queue. It belongs to the
Offer as well because an Offer addressed to a Capability Profile answers no Need, and the guidance
must still know what it is warning about. It never means the platform has vetted anywhere.
_Spanish (UI)_: lugar de trabajo
_Avoid_: Location (that is the Municipality), Modality, Arrangement

**Skill**:
Something a Person is willing to do, drawn from a controlled vocabulary rather than typed freely.
Named for a **capability** — *atención al cliente*, *conducción de motocicleta*, *cuidado de niños* —
and never for an occupation, because the founding insight is that a person can do far more than they
were ever employed as, and a vocabulary of occupations records only the job they have lost. Linked to
a Publication, where it means *I can do this* on a Capability Profile and *this is needed* on a Need —
the same link, read according to the kind.

The link asserts **willingness, not experience**. It carries no level, no years, and no record of
having been paid for it before: the moment experience becomes recordable it becomes the thing people
filter on, and the profile turns back into the hoja de vida this product exists to replace. Where past
experience matters it belongs in the Self-description, as prose.

The vocabulary is **flat and closed** — no sub-skills, no second tier, and nothing a Person can add
themselves. It is the only thing search and matching run on, which is why a gap in it is a person
nobody can find.
_Spanish (UI)_: habilidad
_Avoid_: Tag, Keyword, Occupation, Ocupación, Competency, Trade, Oficio

**Skill Group**:
A heading Skills are browsed under — *Cocina y alimentos*, *Ventas y atención al cliente*. Every Skill
belongs to exactly one. A Group is scaffolding for **finding** a Skill and nothing else: it is never
stored on a Publication, never searched on, and never an input to matching. It is a label on a flat
vocabulary rather than a branch of a tree, and it is not the second level the vocabulary deliberately
lacks.
_Spanish (UI)_: categoría
_Avoid_: Parent skill, Taxonomy node, Sector, Area

**Denomination**:
A job title as Colombians actually say it — *niñera*, *mesero*, *domiciliario*, *empleada doméstica* —
which someone types when looking for a Skill. It is a way **into** the vocabulary, never part of it: a
Denomination is never stored on a Publication and never matched on. Choosing one offers the Skills that
title usually implies, which the Person then edits. This is the only form in which occupations survive
in the product, and they survive as a search aid rather than as a claim about anybody.
_Spanish (UI)_: denominación / oficio
_Avoid_: Job title, Role, Alias, Synonym (too weak — it names an occupation, not another word for a
Skill)

**Self-description**:
Free prose on a Publication — who a Person is and what they are after, in their own words. Shown to
anyone who can see the Publication, and **never searched, never filtered, and never an input to
matching**. Unconstrained prose is exactly where someone volunteers what the law protects — a
disability, a household, a displacement, a loss in the earthquake — and indexing it would build the
discrimination filter art. 5 exists to prevent. The same rule as the Photo: shown, never queried.
_Spanish (UI)_: sobre mí (perfil) / descripción (necesidad)
_Avoid_: Bio, About, Summary, Headline, Resumen (reads as a CV), Keywords, Tags

**Skill Suggestion**:
What a Person writes when nothing in the vocabulary fits them. It is a message to the operator, not a
Skill: it never enters the vocabulary at runtime, never appears on a Publication, and is never matched
on. The operator reads it, and the term it argues for may be authored into a later release. It exists
because the vocabulary is the only route to being found, so a gap in it makes someone invisible — and
because a list of what people could not find is the only honest measure of how good the vocabulary is.
_Spanish (UI)_: sugerencia
_Avoid_: Custom skill, Free skill, Other, Pending skill

**Photo**:
A photograph of a Person. It belongs to the Person, not to a Publication — like their name and
municipality, it is who they are rather than something they published, and it does not change when
they publish or unpublish. It has three states rather than two — absent, visible to signed-in Persons,
or in the Public View — and the third is chosen separately and never by default. Always optional and
never required by anything. It is the only kind of file Encuentra accepts — there are no documents and no hojas de
vida — and it is named for what it is rather than as an Attachment, so that admitting a second kind
of file is a decision rather than a migration. Under Colombian law a face is *sensitive*, so it is
never searchable, never filterable, and never processed by anything that could identify a person from
it.
_Spanish (UI)_: foto
_Avoid_: Avatar, Image, Picture, Attachment, Upload, File

**Photo Review**:
The operator's decision on whether a Photo may appear. Every Photo waits for one, and no one but its
owner sees it until it is approved — but nothing else waits: the Person publishes, is matched, and
sends and receives Offers meanwhile. A refusal has a reason drawn from a fixed vocabulary, and the
image itself is destroyed; the record that it happened is not.
_Spanish (UI)_: revisión de la foto
_Avoid_: Approval, Moderation (which is the wider #13 concern, not this one step), Verification

**Municipality**:
A Colombian municipality, identified by its DANE DIVIPOLA code and belonging to a department. Every
Publication has one. Remote work is a separate property of the Publication, never a municipality
value. A Public View names only the department, never the municipality.
_Spanish (UI)_: municipio
_Avoid_: City, Location, Ciudad

### Being seen

**Public View**:
What a Person looks like to someone with no account: their full name, their Photo if they chose to
show it publicly, their department, their skills, and whether they work remotely. One view at one
address, whether it is reached from the Wall or from a link the Person sent a friend. Everything
else — the exact Municipality, availability, the detail of any Publication — waits for a session, and
Contact Details are on neither side of that line.

It is a view of a **Person**, not of a Capability Profile, and the two must not be confused: a Person
with no Capability Profile still has a Public View.
_Spanish (UI)_: perfil público
_Avoid_: Public Profile (collides with Capability Profile), Preview, Card, Page

**Wall**:
The bounded, rotating sample of real Capability Profiles and real Needs that anyone can see without an
account. Deliberately a *sample* and never an index: no search, no filter, no pagination, no way to
enumerate the people on it. There are two Walls because the two kinds of Publication carry opposite
risks, not because it looks better — and for the same reason a Wall is not the only public surface:
Needs can also be searched without an account, while searching Capability Profiles is what an account
buys. A Wall is still never a search result: it answers no query.
_Spanish (UI)_: muro
_Avoid_: Directory, Feed, Gallery, Listing, Search results

**Search**:
Asking the platform who holds a set of Skills, near a place. The only query the platform accepts — a
Search carries Skills, a place and whether remote work counts, and nothing else, because a Skill is the
only thing anything is ever indexed on. Deliberately bounded rather than exhaustive: it refuses a query
carrying no Skill, so there is no way to ask for everybody, and it stops well short of returning every
match. Searching Needs needs no account; searching Capability Profiles does.
_Spanish (UI)_: búsqueda
_Avoid_: Query, Filter, Browse, Directory, Discovery

**Skill Overlap**:
How many of the Skills a Search asked for a Publication actually carries. The whole of relevance — there
is no other score, and nothing about a Person's completeness, activity, photograph or experience enters
it. It is a count and never a proportion: ranking someone lower for being able to do more things is the
one thing this product must never say.
_Avoid_: Score, Relevance, Rank, Match strength

**Result Band**:
The group a search result is ordered into — its location tier, then its Skill Overlap. Order *within* a
Band is deliberately shuffled and rotates daily, so that among people who match a Search equally well,
none is permanently first and none is permanently unreachable. The rotation is what makes bounded
results fair rather than a quiet sentence of invisibility on whoever sorts last.
_Avoid_: Bucket, Tier (that is the location tier, which is only one part of a Band), Page

**Pause**:
A Person stepping out without leaving: every Publication becomes invisible and unaddressable, they
leave matching and suggestions, and Offers already sent to them are frozen rather than declined. It
touches no Consent, so it is never a Revocation and never an erasure — someone who pauses expects to
come back. Distinct from a **Suspension**, which is what the platform does *to* a Person for cause;
the difference shows in the Offers, which a Pause freezes and a Suspension voids.
_Spanish (UI)_: pausa
_Avoid_: Deactivate, Suspend, Ban, Disable, Delete, Hide

### Connecting

**Offer**:
A proposal of concrete paid work, addressed to a published Capability Profile or a published Need,
carrying its own complete terms and answerable yes or no. It **states** those terms rather than
pointing at them — a snapshot, so that editing the Need it answers cannot rewrite what someone
already accepted — and it is immutable once sent: changing anything means withdrawing and sending
another.

It resolves exactly once, into one of five ends: accepted, declined, withdrawn, expired or voided.
*Frozen* is not among them — that is what a pending Offer looks like while the Person it is
addressed to has Paused, not a state of its own. There is no counter-offer: a decline may carry a
reason, and the sender may revise and send again.

Contact Details are exchanged only when an Offer is accepted, and the platform knows nothing of what
happens afterwards.
_Spanish (UI)_: propuesta
_Avoid_: Application, Postulación, Oferta (means the job posting in Colombian usage), Match,
Placement, Colocación, Remisión

**Offer Send Attempt**:
A record that a Person tried to send an Offer and the platform refused them — refused by a limit of
ours, never by the recipient, who never learns it happened. It is not an Offer and never becomes
one: it holds who tried, whom they tried to reach, when, and why it was stopped, and never the words
they wrote. It exists because the sends that were *stopped* are the clearest evidence of the
behaviour the limits exist to catch, and that evidence cannot be reconstructed after the fact.
_Avoid_: Failed offer, Rejected offer (a rejection is the recipient's answer, not ours), Blocked
offer (that is a Block, which is another Person's doing)

**Hirer**:
The side of an Offer that would pay for the work. Derived from what the Offer is addressed to, not
from who sent it — someone answering a Need is proposing *themselves*, and so is the worker.
_Spanish (UI)_: quien contrata
_Avoid_: Employer, Empleador (implies an employment relationship the platform never establishes),
Company, Demandante

**Worker**:
The side of an Offer that would do the work and be paid for it.
_Spanish (UI)_: quien trabaja
_Avoid_: Candidate, Applicant, Employee, Oferente

### Safety

**Report**:
One Person telling the platform that another Person is doing something wrong. Always about a
**Person** — never about an object — though it may point at the Publication or Offer that prompted
it, which is what lets an operator act on one Publication instead of a whole account. It carries a
reason drawn from a fixed vocabulary and, optionally, the reporter's own words, which the reported
Person never sees. Accumulation moves a Report up the queue and never acts on its own.
_Spanish (UI)_: reporte
_Avoid_: Flag, Complaint (that is a *reclamo*, a Ley 1581 term with its own clock), Abuse, Ticket,
Case

**Block**:
One Person making another unable to reach them: mutual invisibility in matching and suggestions, and
no Offer in either direction. Instant, needing no operator, and never disclosed to the blocked
Person. It is the only safety power that does not wait in a queue, which is what makes a slow queue
survivable. It reaches forward only — it does nothing to an Offer already accepted or to Contact
Details already exchanged, and never claims to.
_Spanish (UI)_: bloqueo
_Avoid_: Mute, Hide, Ignore, Ban (that is ours to do, not theirs)

**Suspension**:
What the platform does to a Person for cause: the account becomes unusable, every Publication is
suppressed, and Offers they sent are voided rather than frozen. Indefinite and reversible by an
operator, never timed. The Person and the evidence are **retained**, not deleted — the record of why
must outlive the account, and a Person deleted outright simply registers again tomorrow. The opposite
of a **Pause** in every respect, including who chose it.
_Spanish (UI)_: suspensión
_Avoid_: Ban, Deactivation, Pause, Delete, Removal

**Safety Incident**:
A breach of the platform's own security — data leaked, scraped or reached by someone who should not
have. Kept deliberately separate from a Report: a person defrauding another on the platform is not
this, and only a Report that turns out to expose data ever becomes one. It is the thing that starts
the 15-día-hábil clock for telling the SIC, counted from the moment it is both detected *and*
escalated — which, with one developer, is a single moment rather than two.
_Spanish (UI)_: incidente de seguridad
_Avoid_: Breach on its own (ambiguous), Report, Violation

### Consent

**Purpose**:
One specific thing Encuentra may do with a Person's data, which that Person accepts or refuses on
its own. Colombian law requires each to be separately selectable, so the set of Purposes is fixed
vocabulary rather than a policy document: hold an account and profile; publish; disclose contact
details; send transactional messages; send suggestions; send news; keep the platform safe; show a
Photo.

Three of them — hold an account, send transactional messages, keep the platform safe — are
*constitutive*: refusing one means there is no account, because nothing lawful remains to do.
Refusing most of the others switches off a feature and nothing else.

Showing a Photo is neither: it is the one Purpose that can **never** be required, because the law
forbids making anything conditional on data it treats as sensitive. Three states, then — a Purpose is
required, optional, or never requirable — and the last has exactly one member.
_Spanish (UI)_: finalidad
_Avoid_: Permission, Scope, Setting, Preference

**Consent**:
A Person's recorded acceptance or refusal of a single Purpose at a moment in time, tied to the
Disclosure they were shown. Never edited — a change of mind is a new record. Most Consents are
account-wide; the one for disclosing Contact Details is given once per Offer, by each side
separately.
_Spanish (UI)_: autorización
_Avoid_: Agreement, Acceptance, Opt-in

**Disclosure**:
What a Person was told before they consented — the identity of the Responsable, the Purposes on
offer, and their rights. A versioned document in its own right, one per surface where Consent is
collected, and the second thing the law requires us to be able to reproduce: proving *what we said*
is a separate duty from proving *that they agreed*.
_Spanish (UI)_: información al titular
_Avoid_: using this word for a Contact Exchange

**Revocation**:
A Person withdrawing a Consent. Takes effect at once, but is never an edit — it is a new Consent
record refusing the Purpose. Revoking a constitutive Purpose is not a toggle; it is a request to be
erased, and is treated as one.
_Spanish (UI)_: revocatoria

**Aviso de privacidad** / **Política de tratamiento**:
The two versioned documents a Person must be shown before consenting. Two documents, not two names
for one: the *política* is the full statement of what we do and how rights are exercised, the *aviso*
is the short notice shown at the point of collection. Kept in Spanish as legal terms of art.
