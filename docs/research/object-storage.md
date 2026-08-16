# Object storage: Tigris (via Fly.io) vs Cloudflare R2

Research for [#11](https://github.com/m0t0r/workforpereira/issues/11). Part of the
[Encuentra architecture map (#1)](https://github.com/m0t0r/workforpereira/issues/1).
Originally gathered under [#25](https://github.com/m0t0r/workforpereira/issues/25) to test whether
storage should influence the app-host decision — it does not, so it is recorded here instead.

**Status:** research only — facts, not a decision. A human decides in #11.

**All prices and facts observed 2026-08-15 and 2026-08-16**, dated per claim. Re-verify before
committing; both vendors change pricing on a scale of months.

Starting point was Fly.io's own designated page,
<https://fly.io/docs/js/the-basics/object-storage/>, on the question of what "Fly.io object storage"
actually is.

---

## The question

Where do uploaded documents live, what does it cost against the ~$15/month remaining after
[ADR-0004](../adr/0004-planetscale-postgres-as-the-database-host.md), and what does each option do to
the Ley 1581 processor register?

**The host is settled: Fly.io ([ADR-0005](../adr/0005-flyio-remains-the-app-host.md)).** That removes
two of the four combinations originally examined. **The live choice is Fly + R2 vs Fly + Tigris.**

**Scope note:** [#5](https://github.com/m0t0r/workforpereira/issues/5) ruled out profile photos (the
SIC treats face photos as biometric, hence *datos sensibles*), so the realistic need is **documents
only** and small. #11 may yet decide there is no upload in v1 at all, in which case this is moot.

---

## Summary

| | **Cloudflare R2** | **Tigris** (Fly.io's object storage) |
|---|---|---|
| **Operated by** | Cloudflare | **Tigris Data Inc.** — a separate company, not Fly.io |
| **Adds a processor?** | No — Cloudflare is already in the stack | **Yes** — a third contracting entity |
| **Storage** | $0.015/GB-mo | $0.02/GB-mo |
| **Class A ops** | $4.50/M | $5.00/M |
| **Class B ops** | $0.36/M | $0.50/M |
| **Egress (vendor side)** | **Free**, explicitly including the S3 API | **Free** |
| **Free tier** | 10 GB, 1M Class A, 10M Class B — **permanent monthly allowance** | 5 GB, 10k Class A, 100k Class B |
| **Cost at this workload** | **~$0** | **~$0** |
| **Reachable from Fly over S3?** | **Yes** — binding optional | Yes |
| **Presigned URLs** | Yes, all 5 operations | Yes, all 5 operations |
| **Hard region pinning** | **No** — hints only; jurisdictions are `eu`/`fedramp`, **no `us`** | **Yes** — single-region `iad` gives *"full control over data residency"* |
| **Custom domain behind Cloudflare CDN** | Yes — and R2 is explicitly permitted media on the CDN | **No** — must be DNS-only; Tigris forbids Cloudflare proxy mode |
| **Sub-processors pulled into the register** | Google LLC, Oracle America | **Fly.io, Equinix, Oracle Cloud** |

**The two findings that matter are in tension**, and neither is large:

- **R2 adds no new processor; Tigris adds one.** That favours R2.
- **Tigris can document a single region; R2 cannot.** That favours Tigris.

---

## 1. "Fly.io object storage" is Tigris, and Tigris is a different company

This was the surprise, and it is confirmed from primary sources rather than inferred.

Fly's own pricing page, verbatim (observed 2026-08-15): **"When you provision their services, you
become their customer."** Fly bills for it as an extension, but the contracting party is **Tigris Data
Inc.** — Sunnyvale CA, California law, Santa Clara County forum, with its **own** click-through
Service Agreement (updated 2024-12-26), its **own** DPA (updated 2025-11-18, incorporated by
reference) and its **own** sub-processor list.

**Not acquired by Fly.io** — $25M Series A led by Spark Capital, 2025-10-08, and Tigris now runs on
its own infrastructure. Checked specifically, because an acquisition would have collapsed this
finding.

**So "Fly + Tigris" is two *Encargados*, not one.** In the register language of
[`ley-1581-obligations.md`](ley-1581-obligations.md) §6.3, choosing Tigris means a third processor
agreement alongside Fly.io and PlanetScale.

**And the entanglement runs both ways.** Tigris's DPA Appendix C names **Fly.io, Equinix and Oracle
Cloud** as its own hosting sub-processors, while Fly's list names Tigris. Recorded here because it was
decisive during #25: *choosing Tigris would have kept Fly.io in the register even if the project had
left Fly.io as its host.* With Fly.io now confirmed as the host that consequence is moot — but it is
the reason **"Workers + Tigris" was ruled out** as the worst available combination, and it would
return if the host is ever revisited.

---

## 2. Cost — orthogonal, and permanently so

Both are **$0–$0.50/month** at documents-only volume. R2 is nominally cheaper on every line; the delta
is cents against a ~$15/month remainder.

**R2's free tier is a standing monthly allowance, not an introductory credit** — verbatim: *"You can
use the following amount of storage and operations **each month** for free."* No expiry language. The
$0 holds indefinitely. It applies to Standard storage only, not Infrequent Access.

**R2's zero egress is genuinely zero and explicitly covers the S3 API** — verbatim: *"Egressing
directly from R2, including via the Workers API, **S3 API**, and r2.dev domains does not incur data
transfer (egress) charges."* So pulling an object from a Fly Machine over the S3 endpoint is free on
the Cloudflare side.

**⚠️ But Fly charges its own bandwidth for it, whichever store you pick.** Fly's pricing page,
verbatim: *"You **will** be billed separately for data transfer to these external third-party
services, including Tigris Object Storage."* Fly's rate is **$0.02/GB** in North America and Europe.

Re-read on 2026-08-16 to test whether same-region Fly↔Tigris is exempt: the page's two free categories
are *"all inbound data transfer"* and *"data transfer between apps or Machines in the same region"* —
**a bucket is neither an app nor a Machine**, so extension traffic falls outside both. Best reading:
**billed at the public-internet rate with no same-region exemption.** Marked *high confidence, not
explicitly stated*; worth one support question if the number ever grows.

> **Consequence for #11: hosting on Fly.io adds a bandwidth line item to object storage regardless of
> which store is chosen.** It does not discriminate between R2 and Tigris. At a few GB/month it is
> single-digit cents either way.

---

## 3. Data residency — the one axis that favours Tigris

**This came out the opposite of what was expected**, and it is the only genuine argument for Tigris.

**Tigris offers hard single-region pinning.** Four bucket location types are chosen at creation, and
**Single-region** is verbatim: *"Single-region stores your data with redundancy across availability
zones within a single region. **This gives you full control over data residency**."* `iad` is
available. Tigris's own decision guide maps *"Strict data residency in a single geography"* to it.

**⚠️ Tigris's default is the worst option of all.** **Global** — verbatim: *"Data is distributed
globally and automatically stored closest to the request origin. As access patterns change, **data
migrates** to where it's most frequently needed."* Under Global you cannot state which country holds
a candidate's document. **Single-region must be selected at bucket creation; it is not changeable
later.**

**R2 offers no hard US pinning.** Default is **Automatic**. **Location hints** (`wnam`, `enam`,
`weur`, `eeur`, `apac`, `oc`) are hints, and *"location hints are only honored the first time a bucket
with a given name is created"*. **Jurisdictional restrictions exist only for `eu` and `fedramp` —
there is no `us`.**

**Why this matters in this project's vocabulary.** `ley-1581-obligations.md` §6.2 records that *"Estados
Unidos de América"* is on the SIC's Circular Externa 005/2017 numeral 3.2 adequacy list **with no
qualifier**, and §6.1 that a `2.2.2.25.5.2` *contrato de transmisión* removes the need to inform the
Titular. **So neither store creates an unlawfulness.** What differs is the **§6.3 register duty** to
record *what each processor holds, in which country*:

- **Tigris single-region `iad`** → you can write "Ashburn, Virginia, USA" and mean it.
- **R2 with an `enam` hint** → you can write "North America, best effort", and that is all.
- **Tigris Global (default)** → you can write nothing useful.

Neither vendor has a South American region. Tigris lists `gru` (São Paulo) only through the Fly.io
integration, not on its general endpoint; R2 has **no LatAm hint at all**. Nothing in Colombia, which
is consistent with the map's given that infrastructure is not scored on proximity to Colombia.

---

## 4. DPA quality — both defective, in mirror-image ways

Building on [`app-host.md`](app-host.md) §1, which analysed the Cloudflare and Fly.io DPA surface.

| | **Cloudflare** | **Tigris** |
|---|---|---|
| Adoption | Incorporated by reference, **but gated** on European data subjects / CCPA | **Unconditional** — stronger gateway |
| "Privacy Laws" definition | **Open-ended** (*"including"*) — could reach Ley 1581 once in force | **Closed to Europe + U.S.** — on its face does not reach Ley 1581 at all |
| "Colombia" in the text | **0×** | **0×** |
| A `2.2.2.25.5.2` *contrato de transmisión*? | **No** | **No** |

**Neither is a Ley 1581-shaped contract, and no self-serve vendor will negotiate a Colombia addendum
with a solo developer.** The defects are different, not ranked: Tigris has the better trigger and the
worse scope; Cloudflare the reverse. Whether a GDPR DPA plus SCCs discharges the *transmisión* duty is
a question for Colombian counsel and is **not resolved here**.

---

## 5. Mechanics — not a differentiator

**Presigned URLs work on both, all five operations** (`Get`, `Put`, `Head`, `Delete`, `UploadPart`).
**This settles the "how do you serve a CV download link" question for both: presigned GET, no public
bucket.** That is also the right pattern under Ley 1581 — a time-limited URL rather than a permanently
public object.

**S3 compatibility is not a differentiator for this workload.** Both do upload, list, get, delete and
presign. R2's documented gaps (object tagging, ACLs, bucket policies, lifecycle configuration,
notification configuration) are all things this app does not use. Tigris publishes a head-to-head
matrix scoring itself 61/68 against R2's 48/68 — **it is vendor-authored, treat the score as marketing
and the rows as leads.** One row is demonstrably wrong about R2 versioning; **Cloudflare's own
unsupported-operations table is authoritative for R2 facts.**

**Custom domains: one Cloudflare-specific wrinkle.** R2 supports a custom domain or an `r2.dev`
subdomain for non-production. Tigris supports a CNAME to `<bucket>.t3.tigrisbucket.io` — **but
verbatim: *"Your custom domain must point directly to Tigris without any intermediate proxy that
terminates TLS, such as Cloudflare's proxy mode… Make sure the CNAME record is set to DNS-only
mode."*** Since ADR-0005 puts Cloudflare's CDN in front of the app, a Tigris custom domain would have
to be grey-clouded, sitting outside it.

Related: **R2-hosted media is explicitly permitted on the Cloudflare CDN** (the old ToS §2.8
restriction was removed in 2023, and its successor is scoped to content hosted *outside* Cloudflare),
whereas Tigris objects are by definition outside. This is the one place where R2 and the CDN decision
in ADR-0005 are genuinely coupled.

---

## What remains open

| Item | Status |
|---|---|
| Fly↔Tigris same-region bandwidth exemption | **Inferred, not stated.** High confidence there is none. One support question if it ever matters. |
| Tigris SCC signature mechanics | Not verified. |
| Whether a GDPR DPA + SCCs satisfies `2.2.2.25.5.2` | **A question for Colombian counsel**, unchanged from #5. |
| Single-region Tigris behaviour in practice | **Untested** — documented, not exercised. |
| Tigris multi-region pricing ($0.025/GB-mo) | Search-sourced, not verified against the pricing page. Irrelevant if single-region is chosen. |

---

## Where this leaves #11

**Storage is orthogonal to the host** — confirmed, not assumed — so it should be picked on its own
merits. Both cost ~$0. The decision is a small one and turns on a single trade-off:

- **R2 adds no new processor.** Cloudflare is already in the stack (the CDN, and #6 evaluated its
  email), so R2 means no third contracting entity, a larger permanent free tier, cheaper per unit, and
  no custom-domain conflict with the CDN.
- **Tigris can document its region and R2 cannot.** If #11 decides the §6.3 register must state a
  country rather than "North America, best effort", a **single-region `iad`** bucket is the better
  Ley 1581 artefact — at the cost of a third processor whose DPA does not define Colombian law as in
  scope.

**On the facts as gathered, R2 is the stronger default** — fewer processors, larger free tier, no CDN
conflict — **unless the residency-documentation duty is judged to outweigh that.** That judgement is
#11's to make, alongside the prior question of whether v1 accepts uploads at all.

**If Tigris is ever chosen, single-region must be selected at bucket creation.** The default is Global,
which migrates data across countries and is the worst option for this project.
