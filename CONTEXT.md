# Encuentra

Encuentra connects people in Pereira and Risaralda who lost their income after the earthquake with
anyone, anywhere, willing to offer them paid work. A person says what they can do; another person
says what they need done; the platform carries a structured offer between them and stops at the
introduction. No money moves through the platform.

**Naming rule.** Code, database, routes and file names are **English**. Spanish is strictly a UI
concern. Each term below carries the Spanish word used in copy, so the UI stays consistent without
the schema inheriting Colombian labour-law vocabulary. A small set of legal terms of art stay
Spanish everywhere, because translating them loses the tie to the statute.

**Address rule.** UI copy addresses the reader as **`tú`**, never `usted` and never `vos` — _"¿Qué
sabes hacer?"_, not _"¿Qué sabe hacer?"_. `usted` reads as respect rather than distance in the Eje
Cafetero and was the first choice for that reason; `tú` won because it is what a Colombian consumer
product is expected to sound like, and it costs nothing in dignity. `vos` is Paisa-marked and would
sound wrong to the "anyone, anywhere" hirer. The verb belongs to the reader — _escoge_, _quita_,
_cuéntanos_ — never the system (_se requiere_). See ADR-0023.

**Gender-agreement rule.** No copy agrees in gender with the reader. **The adjective agrees with the
object, never with the person** — _"tu perfil ya está publicado"_, never _"ya estás publicada"_. Gender
is never collected and the name is authored rather than taken from a provider profile (ADR-0009), so
there is nothing to infer from either. Where a sentence offers no object to agree with, it is rewritten
until it does: _"publicada no es lo mismo que vista"_ becomes _"ya te pueden encontrar, y eso no es lo
mismo que te encuentren"_. Inclusive endings — `@`, `x`, `e` — are refused too: they read as a
political register in a product whose voice problem is sounding like a neighbour rather than an
institution. See ADR-0025.

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
The event, at the acceptance of an Offer, that releases _both_ Persons' Contact Details to each
other. Not one-directional and not a property of the Offer — it is the thing the Offer exists to
cause, and the thing each side separately authorises.
_Spanish (UI)_: intercambio de datos
_Avoid_: Disclosure (reserved for the Ley 1581 sense — see below), Reveal, Match

### Signing in

**Credential**:
How a Person proves they are the same human returning — a Google account, a Facebook account, or a
password. A Person may hold more than one, and is prompted to, because holding only one is how
people get locked out. Distinct from Contact Details: a phone number is a way to _reach_ someone,
never a way to sign in.
_Spanish (UI)_: forma de ingreso
_Avoid_: Login, Identity, Provider (a Provider is the third party behind a Credential, not the
Credential itself)

**Pending Signup**:
The short-lived record holding a would-be Person's Consents, name and date of birth between
submitting `/signup` and returning from Google or Facebook. It exists so that Consent is recorded
_before_ any personal data is stored rather than after, which the law requires and a redirect would
otherwise make impossible. Discarded if the person never comes back; it is not an account.
_Avoid_: Draft account, Partial user, Pending user

### What a person publishes

**Publication**:
Something a Person puts in front of others — either a Capability Profile or a Need. It carries what
both kinds share: the Person who owns it, its municipality, whether it is open to remote work, its
skills, and whether it is a draft, published or unpublished. An Offer is always addressed to a
Publication. A Publication that exists but is not published is **_sin publicar_** to the Person who
owns it, and what that state is told is that nobody can find them — never that they are incomplete
(ADR-0025).
_Spanish (UI)_: publicación · _sin publicar_ for the unpublished state
_Avoid_: Listing, Posting, Borrador (reads as a saved draft of a document, not as invisible)

**Capability Profile**:
A kind of Publication: what a Person can do and is willing to do — their skills, experience and
availability. Optional, and at most one per Person. It is not the Person's identity; name and contact
details belong to the `Person`. The **Municipality belongs to the Publication**, and on a Capability
Profile it happens to be where the Person is — which is why the same column means something different
on a Need.
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
guidance shown at a Contact Exchange, raises a Report's place in the queue, and decides whether a
public Need card names its author — on `hirer_home`, the one setting where the Need's Municipality is
also the author's own, it does not. It belongs to the
Offer as well because an Offer addressed to a Capability Profile answers no Need, and the guidance
must still know what it is warning about. It never means the platform has vetted anywhere.
_Spanish (UI)_: lugar de trabajo
_Avoid_: Location (that is the Municipality), Modality, Arrangement

**Skill**:
Something a Person is willing to do, drawn from a controlled vocabulary rather than typed freely.
Named for a **capability** — _atención al cliente_, _conducción de motocicleta_, _cuidado de niños_ —
and never for an occupation, because the founding insight is that a person can do far more than they
were ever employed as, and a vocabulary of occupations records only the job they have lost. Linked to
a Publication, where it means _I can do this_ on a Capability Profile and _this is needed_ on a Need —
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
A heading Skills are browsed under — _Cocina y alimentos_, _Ventas y atención al cliente_. Every Skill
belongs to exactly one. A Group is scaffolding for **finding** a Skill and nothing else: it is never
stored on a Publication, never searched on, and never an input to matching. It is a label on a flat
vocabulary rather than a branch of a tree, and it is not the second level the vocabulary deliberately
lacks.
_Spanish (UI)_: categoría
_Avoid_: Parent skill, Taxonomy node, Sector, Area

**Denomination**:
A job title as Colombians actually say it — _niñera_, _mesero_, _domiciliario_, _empleada doméstica_ —
which someone types when looking for a Skill. It is a way **into** the vocabulary, never part of it: a
Denomination is never stored on a Publication and never matched on. Choosing one offers the Skills that
title usually implies, which the Person then edits. This is the only form in which occupations survive
in the product, and they survive as a search aid rather than as a claim about anybody.

A Denomination is reached **inside search, never as the first question**: typing one returns it
alongside the individual Skills, and choosing it adds its Skills straight to the selection with an
invitation to prune them in place. Leading with it would make _"what were you employed as"_ the first
thing the product asks, which is what the vocabulary exists to escape (ADR-0023).
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
What a Person writes when nothing in the vocabulary fits them. It is a message to the Operator, not a
Skill: it never appears on a Publication and is never matched on. It exists because the vocabulary is
the only route to being found, so a gap in it makes someone invisible — and because a list of what
people could not find is the only honest measure of how good the vocabulary is.

The Operator either sets it aside or agrees it names a real gap, and **agreeing is not adding**: a
Skill is authored as its own deliberate act, one at a time, and only after answering the question
that keeps the vocabulary out of art. 5 territory — could a person _without_ the protected attribute
plausibly hold this? A suggestion that is eventually answered points at the Skill that answered it,
which is how the measure above stops being a list that only grows. The Person who wrote it is never
replied to: the only messages available are a promise we will not make and silence.

It is offered **always, not only when a search fails** — behind a failed search it reads as an error
state, and it would never hear from the person who searched an approximate word and settled. It may
never promise the term will be added, and it may never be the end of the road: writing one and
choosing the nearest existing Skill happen in the same breath, because a Publication with no Skill is
unreachable today whatever gets authored next quarter (ADR-0023).
_Spanish (UI)_: sugerencia
_Avoid_: Custom skill, Free skill, Other, Pending skill

**Photo**:
A photograph of a Person. It belongs to the Person, not to a Publication — like their name, it is who
they are rather than something they published, and it does not change when they publish or unpublish.
(The Municipality is **not** in that set: it is a property of the Publication.) It has three states
rather than two — absent, visible to signed-in Persons, or in the Public View — and the third is
chosen separately and never by default. Always optional and
never required by anything. It is the only kind of file Encuentra accepts — there are no documents and no hojas de
vida — and it is named for what it is rather than as an Attachment, so that admitting a second kind
of file is a decision rather than a migration. Under Colombian law a face is _sensitive_, so it is
never searchable, never filterable, and never processed by anything that could identify a person from
it.
_Spanish (UI)_: foto
_Avoid_: Avatar, Image, Picture, Attachment, Upload, File

**Photo Review**:
The operator's decision on whether a Photo may appear. Every Photo waits for one, and no one but its
owner sees it until it is approved — but nothing else waits: the Person publishes, is matched, and
sends and receives Offers meanwhile. A refusal has a reason drawn from a fixed vocabulary, and the
image itself is destroyed; the record that it happened is not. It judges the **image and never the
account**: every reason names something about the photograph, and a doubt about the person behind it
is a Report rather than a refusal, so a Review has two exits and only one of them touches the Photo.

Reviews happen **oldest first and one face at a time**. The waiting photographs can be seen together,
but nothing is ever decided from that view — no one's standing here changes without a person having
looked at them properly, one at a time. What the Operator picks is **the sentence the Person will
read**, not a code standing in for it. The Review is a record of its own that outlives the image: a
refused photograph is destroyed, a second attempt is a new Photo with a new Review, and neither the
record nor the note of who looked at it survives the Person it was about — a note that is written
every time a face is shown to the Operator, not only when a decision follows.
_Spanish (UI)_: revisión de la foto
_Avoid_: Approval, Moderation (which is the wider #13 concern, not this one step), Verification

**Municipality**:
A Colombian municipality, identified by its DANE DIVIPOLA code and belonging to a department. Every
Publication has one, and it belongs to the **Publication** rather than to the Person — what it means
is fixed by the kind: for a Capability Profile it is where the Person is, and for a Need it is where
the work is. Remote work is a separate property of the Publication, never a municipality value. A
Public View names only the department, never the municipality — but a **Need** names its exact
municipality publicly, because for four of the five Work Settings the place of the work says nothing
about where its author lives. For `hirer_home` it does, and there it is the author's **name** that
waits for a session instead (ADR-0030).
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
account. Deliberately a _sample_ and never an index: no search, no filter, no pagination, no way to
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
The group a search result is ordered into — its location tier, then its Skill Overlap. Order _within_ a
Band is deliberately shuffled and rotates daily, so that among people who match a Search equally well,
none is permanently first and none is permanently unreachable. The rotation is what makes bounded
results fair rather than a quiet sentence of invisibility on whoever sorts last.
_Avoid_: Bucket, Tier (that is the location tier, which is only one part of a Band), Page

**Suggestion**:
Work the platform puts in front of a Person without their having asked — a Search whose query is one of
their own Publications rather than something they typed. A Capability Profile is suggested Needs; each
Need is suggested Capability Profiles; a Person with no Publication is suggested nothing, because there
is no query to derive. It is the same machinery as a Search and never a second one, so every Suggestion
carries the same one-line explanation of why it is there, shown unprompted. Suggestions are **not
reciprocal**: the two directions run over different corpora, so appearing in someone's Suggestions says
nothing about their appearing in yours.
_Spanish (UI)_: coincidencias
_Avoid_: Match (see Contact Exchange), Recommendation, Feed, Alert, Sugerencia (that is a Skill
Suggestion, which is a suggestion made _to us_)

**Pause**:
A Person stepping out without leaving: every Publication becomes invisible and unaddressable, they
leave matching and suggestions, and Offers already sent to them are frozen rather than declined. It
touches no Consent, so it is never a Revocation and never an **Erasure** — someone who pauses expects
to come back, and a Pause is what they are offered, once and with equal weight, at the moment they
ask to be deleted. Distinct from a **Suspension**, which is what the platform does _to_ a Person for
cause;
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
_Frozen_ is not among them — that is what a pending Offer looks like while the Person it is
addressed to has Paused, not a state of its own. There is no counter-offer: a decline may carry a
reason, and the sender may revise and send again.

Contact Details are exchanged only when an Offer is accepted, and the platform knows nothing of what
happens afterwards.

An Offer outlives either side's **Erasure**: it is both people's record, and one person leaving does
not take the other's copy with them. The side that erased simply stops being anybody — shown as a
deleted account, with the terms left exactly as they were agreed.
_Spanish (UI)_: propuesta
_Avoid_: Application, Postulación, Oferta (means the job posting in Colombian usage), Match,
Placement, Colocación, Remisión

**Offer Send Attempt**:
A record that a Person tried to send an Offer and the platform refused them — refused by a limit of
ours, never by the recipient, who never learns it happened. It is not an Offer and never becomes
one: it holds who tried, whom they tried to reach, when, and why it was stopped, and never the words
they wrote. It exists because the sends that were _stopped_ are the clearest evidence of the
behaviour the limits exist to catch, and that evidence cannot be reconstructed after the fact.
_Avoid_: Failed offer, Rejected offer (a rejection is the recipient's answer, not ours), Blocked
offer (that is a Block, which is another Person's doing)

**Hirer**:
The side of an Offer that would pay for the work. Derived from what the Offer is addressed to, not
from who sent it — someone answering a Need is proposing _themselves_, and so is the worker.
_Spanish (UI)_: quien contrata
_Avoid_: Employer, Empleador (implies an employment relationship the platform never establishes),
Company, Demandante

**Worker**:
The side of an Offer that would do the work and be paid for it.
_Spanish (UI)_: quien trabaja
_Avoid_: Candidate, Applicant, Employee, Oferente

### Safety

**Operator**:
The person who acts for the platform: the one who decides whether a Photo may appear, reads Reports,
reads what people could not find, and answers a Person exercising their rights. In v1 there is
exactly **one**, and every decision the platform makes about a Person passes through them, because
nothing here is automatic — no classifier, no threshold, no state that changes on its own.

They meet all four of those in **one** place rather than four tools, and every time they open
somebody's Photo it is recorded. They are an ordinary Person with an account like anyone else, and
the word is deliberately not _admin_: it names what they do, not what they are allowed to do.
_Spanish (UI)_: no aparece — quien lo usa no necesita que se le nombre
_Avoid_: Admin, Moderator (which is only one of the four things), Staff, Reviewer, Support

**Report**:
One Person telling the platform that another Person is doing something wrong. Always about a
**Person** — never about an object — though it may point at the Publication or Offer that prompted
it, which is what lets an operator act on one Publication instead of a whole account. It carries a
reason drawn from a fixed vocabulary and, optionally, the reporter's own words. The reported Person
is never _told_ one exists — but a Person who asks what we hold about them is shown it, with the
reporter's identity and anything that fingerprints them removed, and may add their own answer beside
it. Accumulation moves a Report up the queue and never acts on its own.

A Report may also have **no reporter at all**, which means the platform raised it: an Operator who
doubts an account rather than an image has no other way to say so, since a Photo Review judges only
the photograph. One raised that way carries a reason code and never any prose — a reporter's words
are the complaint, an Operator's would be a record we invented.
_Spanish (UI)_: reporte
_Avoid_: Flag, Abuse, Ticket, Case. **Complaint** is now a term of its own — see Data rights

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
operator, never timed. The Person and the evidence are retained for as long as the account
exists — but a Suspension **does not survive an Erasure**: someone who asks to be deleted is
deleted, and nothing is kept to recognise them by if they come back. The opposite of a **Pause** in
every respect, including who chose it.
_Spanish (UI)_: suspensión
_Avoid_: Ban, Deactivation, Pause, Delete, Removal

**Safety Incident**:
A breach of the platform's own security — data leaked, scraped or reached by someone who should not
have. Kept deliberately separate from a Report: a person defrauding another on the platform is not
this, and only a Report that turns out to expose data ever becomes one. It is the thing that starts
the 15-día-hábil clock for telling the SIC, counted from the moment it is both detected _and_
escalated — which, with one developer, is a single moment rather than two.
_Spanish (UI)_: incidente de seguridad
_Avoid_: Breach on its own (ambiguous), Report, Violation

### Consent

**Purpose**:
One specific thing Encuentra may do with a Person's data, which that Person accepts or refuses on
its own. Colombian law requires each to be separately selectable, so the set of Purposes is fixed
vocabulary rather than a policy document: hold an account and profile; publish; disclose contact
details; send transactional messages; send news; keep the platform safe; show a Photo.

There is deliberately no Purpose for _sending_ Suggestions, because nothing sends them: Suggestions are
a surface a Person visits, not a message they receive. A Purpose is only ever asked for something the
platform actually does — consenting to a _finalidad_ nobody pursues would make the Disclosure describe
a fiction.

Three of them — hold an account, send transactional messages, keep the platform safe — are
_constitutive_: refusing one means there is no account, because nothing lawful remains to do.
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
collected, and the second thing the law requires us to be able to reproduce: proving _what we said_
is a separate duty from proving _that they agreed_.
_Spanish (UI)_: información al titular
_Avoid_: using this word for a Contact Exchange

**Revocation**:
A Person withdrawing a Consent. Takes effect at once, but is never an edit — it is a new Consent
record refusing the Purpose. Revoking a constitutive Purpose is not a toggle; it is a request to be
erased, and is treated as one.
_Spanish (UI)_: revocatoria

**Aviso de privacidad** / **Política de tratamiento**:
The two versioned documents a Person must be shown before consenting. Two documents, not two names
for one: the _política_ is the full statement of what we do and how rights are exercised, the _aviso_
is the short notice shown at the point of collection. Kept in Spanish as legal terms of art.

### Data rights

**Data Request**:
A Person exercising one of their rights over their own data, tracked as a case with a legal deadline
attached. Two procedures with different clocks, and a separate note of _what_ is being asked, so that
adding a new thing to ask for never disturbs a deadline. Most are answered the instant they are made;
a Data Request exists so that the ones that cannot be have a record proving when they arrived and
when we answered.
_Spanish (UI)_: solicitud
_Avoid_: Ticket, Case, DSAR, Petition

**Inquiry**:
A Person asking what we hold about them, what we have done with it, or for proof that they authorised
it. The shorter of the two clocks. `/my-data` answers it standing, for free and without limit, which
is why an Inquiry is usually a record of an answer already given rather than a queue of work.
_Spanish (UI)_: consulta
_Avoid_: Query, Access request, Lookup

**Complaint**:
A Person asking us to correct, add to, or erase what we hold, or telling us we have broken a duty
under the law. The longer clock, and the one the law wraps in ceremony: a Complaint that arrives
incomplete must be sent back, and one that goes unanswered past its deadline is what earns the Person
the right to take us to the regulator. Withdrawing a Consent and asking to be erased are both kinds
of Complaint rather than things beside it.
_Spanish (UI)_: reclamo
_Avoid_: Report (that is a safety term), Claim, Dispute, Grievance

**Erasure**:
A Person asking to be deleted, and being deleted. Not a hiding and not a marking — the account, the
Publications, the Photo and everything else about them stop existing, and the platform keeps no way
of recognising them if they return, not even after a Suspension. What survives is only the proof that
they once authorised us and that we honoured this request, kept because the law requires the proof
and bounded by the same published schedule as everything else.

It takes effect at once. There is no waiting period to change your mind, because a waiting period
would mean still holding what someone asked us to destroy — so the alternative, a **Pause**, is
offered instead at the moment of the decision, and only then.

Two things it cannot reach: what another Person already wrote down after a Contact Exchange, and the
shared record of an Offer, which is that other Person's too.
_Spanish (UI)_: supresión, eliminar mi cuenta
_Avoid_: Deletion request, Right to be forgotten, Deactivation, Removal, Anonymisation (we delete
rather than blank out), Pause, Suspension

**Complaint Legend**:
A mark saying that a Person's data is the subject of a live Complaint, together with the reason they
gave. Required by law within two business days and kept until the Complaint is decided. It is a
statement, not a restriction: it stops nothing from being published, matched or searched, and it is
never shown to anyone but the Person themselves and an operator.
_Spanish (UI)_: the literal legend text is fixed by statute as _reclamo en trámite_
_Avoid_: Flag, Hold, Freeze, Block, Suppression — it is none of these
