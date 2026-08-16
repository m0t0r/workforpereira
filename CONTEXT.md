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

**Skill**:
Something a Person can do, drawn from a controlled vocabulary rather than typed freely. Linked to a
Publication, where it means *I can do this* on a Capability Profile and *this is needed* on a Need —
the same link, read according to the kind. Never carries a self-assessed level.
_Spanish (UI)_: habilidad
_Avoid_: Tag, Keyword, Category

**Photo**:
A photograph of a Person. It belongs to the Person, not to a Publication — like their name and
municipality, it is who they are rather than something they published, and it does not change when
they publish or unpublish. Where it is shown is a separate question. Always optional and never
required by anything. It is the only kind of file Encuentra accepts — there are no documents and no hojas de
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
value.
_Spanish (UI)_: municipio
_Avoid_: City, Location, Ciudad

### Connecting

**Offer**:
A proposal of concrete paid work, addressed to a published Capability Profile or a published Need,
carrying its terms and answerable yes or no. It has a status, not a boolean — a pending offer, a
declined offer and a withdrawn offer are different things. Contact details are exchanged only when
an offer is accepted.
_Spanish (UI)_: propuesta
_Avoid_: Application, Postulación, Oferta (means the job posting in Colombian usage), Match,
Placement, Colocación, Remisión

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
