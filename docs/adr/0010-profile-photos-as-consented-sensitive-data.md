# A profile may carry a photograph, and it is treated as sensitive data throughout

The founding proposition is *"this is who I am, this is what I know how to do, hire me"*. A face is
the cheapest trust signal this platform has, and it has no others: no money moves, so there is no
transaction history; reputation is still fog; employer verification left with #8; and #12 has to
delete "Empresas verificadas" because the pivot made it false. In a market where informal work is
actually arranged over WhatsApp and Facebook Marketplace, a faceless directory of names and skills
reads as a scam rather than as restraint.

So **v1 has profile photographs**, and every rule below exists to make that survivable.

## This reverses a research recommendation, not a decision

`docs/research/ley-1581-obligations.md` §8 recommends *"no candidate photos in v1"*, and constraint
38 of its summary table repeats it. That is a **research recommendation**, written under the
vacancy-centric model this map has since abandoned, where a face was an employer's convenience rather
than the product. No ADR ever adopted it. #11 reverses it deliberately and on the record.

The `docs/research/object-storage.md` scope note inherits the same stale premise — it says *"the
realistic need is documents only"* precisely because #5 had ruled photos out. Its facts hold; its
framing does not. See *Where the bytes live*.

## The doctrinal tension, and why we do not have to resolve it

The SIC has two positions on whether a photograph is *biométrico*, and therefore *sensible*:

- **Concepto 18-171259 (2018)** — narrow. An image is biometric only *"cuando el hecho de ser
  tratadas con medios técnicos específicos permita la identificación o la autenticación unívocas"*.
  This is the same test as GDPR art. 4(14): the data becomes biometric through **processing for
  unique identification**, not by existing.
- **The 2020 _Guía sobre el tratamiento de las fotos_ and Resolución 46344 de 2021** — flat, and
  decision-level. *"Estas imágenes se consideran información biométrica. Los Datos Biométricos, a su
  vez, son un ejemplo de Dato Sensible."*

Worth noting the flat position is not quite flat: the *Guía*'s own sentence begins *"**algunas** fotos
captan la imagen de la cara"*.

**We build to the stricter reading and keep the narrower one available.** Every rule here is what the
flat position demands. Nothing here forfeits the 2018 test — because we never process an image
through *medios técnicos específicos* for identification. That is not a hedge we might drop later; it
is the load-bearing constraint below.

**We are not in breach under either reading.** Art. 6(a) expressly permits sensitive data with the
Titular's explicit authorization. This is a *permitted* operation done carefully, not an accepted
risk — which is what distinguishes it from the SPE posture in #23, where the reading we wanted found
no support and we proceeded anyway. What remains is execution risk: that the consent artefact is
inadequate. That is a review, not a blocker, and it goes to counsel on the brief #23 already opened.

## The five rules

Each is stated as a prohibition because each is the thing that, if violated, converts a lawful
operation into an art. 23(d) one.

1. **Optional, always.** A photograph is never required — not to complete a profile, not to publish,
   not to send or receive an Offer, not to reach any completeness score, and not to rank higher in
   #20's suggestions. D.1377 art. 6: *"Ninguna actividad podrá condicionarse a que el Titular
   suministre datos personales sensibles."* There is no "profile strength" meter that a photo fills.
2. **Express consent, in context.** Its own unticked control at the moment of upload, carrying the
   three D.1377 art. 6 duties — that the data is **sensitive**, that the person is **not obliged** to
   provide it, and the purpose. Never bundled into `publish`, never pre-ticked. Per SIC Conceptos
   18-171259 and 17-364624, *conducta inequívoca* is **not sufficient** for sensitive data, so the
   granular-checkbox pattern is the floor here rather than the ceiling. See the ADR-0007 amendment.

   **Amended by ADR-0011 — a Photo has three states, not two.** This ADR wrote a single binary,
   uploaded or not. #22 made profiles public, which splits the axis: **no photo · visible to
   signed-in Persons · public**. The third is its own unticked control with its own art. 6 wording,
   **defaulting to off**, and carrying the sentence *your photo will be visible to anyone on the
   internet, and we cannot know who has seen it.* Someone may be entirely willing to show their face
   to a person considering hiring them and entirely unwilling to have it on the open internet; rule 1
   forbids penalising either answer. A Person who never touches the third control still has a working
   profile with a face inside the platform.
3. **Never a search or filter dimension.** A photograph, and anything derived from one, is invisible
   to #10's search and #20's matching. `ley-1581-obligations.md` constraint 33 is the general rule —
   *a filter is the discrimination mechanism art. 5 exists to prevent* — and appearance is the most
   direct discrimination vector this product could hand anyone.
4. **Never a technical means of identification.** No facial recognition, no face embeddings, no
   duplicate-account detection by face, no similarity search, no clustering, no third-party service
   that performs any of these, and no retention of any vector derived from a face. **This is the
   clause that keeps the 2018 reading available**, and it must be quoted in any future ticket that
   proposes an image pipeline.

   Safety classification is **not** excluded by this rule. A nudity or abuse classifier does not
   identify or authenticate anyone uniquely, so it falls outside the *medios técnicos específicos*
   test. It may pre-filter the review queue; it may never be the sole approver.
5. **Publication by the Titular is not a licence.** C-748 de 2011, RESUELVE Tercero, struck the words
   *"el Titular haya hecho manifiestamente públicos o"* from art. 6. That a person uploaded their own
   face never becomes our lawful basis. The consent record is the basis, and only for as long as it
   stands.

Under C-748's *responsabilidad reforzada*, treating sensitive data at all raises the compliance bar
for **everything** — so the art. 4 principles and the Título VI duties are held to a higher standard
across the product from the moment the first photo is stored, not only on the photo path.

## No document uploads

**A photograph is the only object v1 accepts.** No hojas de vida, no CVs, no certificates.

A Colombian hoja de vida is the worst container this product could hold. It routinely carries the
cédula, home address, EPS, marital status, a photograph and family details — every field §8 spent a
section ruling out, arriving in one blob no schema can govern. It is also **unsearchable**, which
defeats #10's design outright, since search here is by skill. And it is the one genuine malware
vector.

It is also a barrier. Many people who lost informal income have no CV, and asking for one tells them
they are not ready. The Capability Profile exists precisely because what a person can do exceeds
whatever job title they held; a CV drags the model back toward titles. #19's skill taxonomy plus
structured experience replaces it.

This is a decision, not a deferral: adding a second object kind reopens this ADR.

## Every photo is reviewed before anyone sees it

**Pre-moderation.** A photograph is not visible to anyone but its owner until it is approved.

The alternative — live at upload, with report-and-takedown — is faster and does not put a solo
developer in the critical path. It was rejected because the failure it permits is not recoverable:
the harm from a photographed cédula, someone else's face, or an abusive image is done at the moment
it is visible, and a takedown afterwards does not undo it. For a sensitive object under
*responsabilidad reforzada*, the queue is the safer trade.

**The queue blocks nothing else.** The person publishes, is matched, and sends and receives Offers
while their photograph is pending. This is both the product answer to pre-moderation's latency and
what rule 1 requires anyway — the law and the design agree here.

**Three days, escalated rather than enforced.** The commitment shown to the person is *menos de 3
días*. It is a displayed expectation backed by an alert to the operator, **not** an automatic state
transition. Neither automatic outcome is acceptable: auto-approval destroys the control in exactly
the backlog case it exists for, and auto-rejection punishes a person for our queue. A photograph
therefore never changes state on its own.

If three days is routinely missed, that is the signal to revisit pre-moderation — not to weaken the
escalation.

**Rejection.** The reason comes from a fixed vocabulary, never free text: an operator typing prose
about a person's face is its own risk, and a code is all #13 needs. **Re-upload is the appeal**; there
is no separate appeals process in v1. **The rejected bytes are deleted immediately** — the consent
authorised display, we refused it, and no purpose survives that authorises holding it.

What survives is an evidentiary row without the image — person, reason code, timestamp — so #13 can
see repeat patterns. ADR-0008's language governs: an evidentiary table, never a tombstone.

**Operator access is logged.** Every operator view of a pending photograph is recorded. Art. 8(c)
gives the Titular the right to know who has accessed their data, and *responsabilidad reforzada* is
the difference between claiming diligence and showing it. ~~This feeds #22's art. 8(c) log rather than
building a second one.~~ **Amended by ADR-0011**: #22 built no profile-view log, so this one owns
itself and its implementation moves to **#28**. It survives the deletion of the general log because it
is a different act — an operator opening an *unpublished* sensitive image is precisely the *consulta no
autorizada* that arts. 4(g)/17(d) target, and it is one row per review rather than one per page view.

**Consequence for the disclosure**: because a human reviews every photograph, the art. 12 disclosure
must say so plainly. The person is consenting to operator review, not only to display.

## Where the bytes live

**Cloudflare R2**, with the `enam` location hint.

Both candidates cost ~$0 at this volume, so cost decides nothing. R2 wins on the register:
**Cloudflare is already an Encargado** in this stack — the CDN from ADR-0005, Web Analytics from #18 —
so R2 adds **no new contracting entity**. Tigris would add a third *Encargado* with its own DPA and
its own sub-processor tree (Fly.io, Equinix, Oracle Cloud) for one solo developer to maintain. R2 also
sits behind the CDN we already run, whereas Tigris forbids Cloudflare proxy mode and would have to be
grey-clouded outside it.

**What R2 costs us, recorded honestly.** R2 has no hard US pinning — jurisdictional restrictions
exist only for `eu` and `fedramp`, and location hints are hints, *honoured only at first bucket
creation*. So the §6.3 processor register will read **"North America, best effort"** where Tigris
single-region `iad` could have read "Ashburn, Virginia, USA" and meant it.

This is a **register-quality** cost, not a lawfulness one. `ley-1581-obligations.md` §6.1 is explicit
that hosting abroad is lawful as a *transmisión* under a `2.2.2.25.5.2` contract, which turns on the
**contract**, not on adequacy or on residency proof.

**Known and accepted**: `object-storage.md` weighed residency for *documents*. The object is now
sensitive, and *responsabilidad reforzada* strengthens the residency argument beyond what that
research assessed. The processor-count argument still outweighs it for a solo developer, but this is
the part of the decision most worth reopening if the register duty is ever challenged.

**Access is by presigned URL, never a public bucket** — a time-limited GET, which is the right pattern
under Ley 1581 regardless of vendor.

**Fly bills its own egress either way**, at $0.02/GB: a bucket is neither an app nor a Machine, so
neither of Fly's free-transfer categories applies. Single-digit cents at this volume, and it does not
discriminate between the two stores.

**Neither vendor's DPA is a Ley 1581-shaped contract**, and Cloudflare's does not name Colombia.
That defect is not specific to this decision — it applies to every processor in the stack and is
already the map's out-of-scope DPA gate.

## Erasure crosses a boundary the database cannot

ADR-0008 chose hard delete, no `deleted_at`, `RESTRICT` by default. **A `DELETE FROM persons` cannot
cascade into an object store.** #24 handed erasure forward as *"one implementation with N adapters
and no constraint bypass"*; this is the first adapter that is not SQL. Deletion on a *reclamo* is a
statutory deadline, not best-effort cleanup.

**The database commits first, the object is deleted after commit, and a reconciliation sweep is the
net.**

Ordering is the whole decision, and both failure modes were weighed:

- **Object first** — a failed commit destroys a live person's photograph. Annoying, and recoverable:
  they upload again.
- **Row first** — a failed object delete leaves an orphaned face with no owner, no consent record and
  no erasure trail, **undiscoverable from every product surface**. Strictly worse, and it is the one
  that breaches.

We take the recoverable failure, and then remove it: the **sweep** lists the bucket and drops every
key with no surviving Person. Keys are derived from the person identifier so that orphans are
detectable without a database row to join against. The sweep is what makes the guarantee real rather
than hopeful — without it, erasure depends on a network call that can fail.

This resembles the map's *"side effects that must not roll back"* fog, but it is the **mirror image**:
there the side effect escapes a rollback, here it must survive a commit. It does not resolve that
patch.

**The same path deletes a rejected photograph**, which has no erasure request behind it at all — the
authorisation simply ended.

## Consequences

- **ADR-0007 is amended** — an eighth `Purpose`, and its sensitive-data premise corrected.
- **`CONTEXT.md`** gains **Photo**; **Purpose** updates.
- **#22 gets harder.** A public, indexable gallery of faces of people in economic distress is a
  materially different object from a text directory. #22 owns the answer; this ADR only makes the
  question sharper. **Answered in ADR-0011**: faces are public, but the gallery is a *sample* rather
  than an index — no public enumeration, unguessable and rotatable URLs, `noindex` — and public
  display is its own consent, per the rule 2 amendment above.
- **#12 inherits a rule**: a profile without a photograph must never render as second-class. Rule 1 is
  worthless if the UI makes the absence a visible penalty.
- **#13 inherits** the reason-code vocabulary, the evidentiary rejection row, and the optional
  classifier as a queue pre-filter.
- **#10 and #20 inherit** rules 3 and 4 as hard constraints.
- **Admin tooling is now a launch requirement**, not a #13 dependency — pre-moderation does not
  function without a review surface.
- **A residual, accepted**: pre-moderation means the operator views every face on the platform. That
  is a real privacy cost, mitigated by the access log and justified by the harm the queue prevents.
