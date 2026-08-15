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
shown on a Publication, and disclosed to another Person only when an Offer is accepted.
_Spanish (UI)_: datos de contacto

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
details; send transactional messages; send suggestions; send news; keep the platform safe.
_Spanish (UI)_: finalidad
_Avoid_: Permission, Scope, Setting, Preference

**Consent**:
A Person's recorded acceptance or refusal of a single Purpose at a moment in time, tied to the
version of the policy and aviso they were shown. Never edited — a change of mind is a new record.
_Spanish (UI)_: autorización
_Avoid_: Agreement, Acceptance, Opt-in

**Aviso de privacidad** / **Política de tratamiento**:
The two versioned documents a Person must be shown before consenting. Kept in Spanish as legal
terms of art.
