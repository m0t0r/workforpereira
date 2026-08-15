# Transactional messaging providers reachable from Colombia, under budget

Research for [#6](https://github.com/m0t0r/workforpereira/issues/6). Feeds the credential-model
decision in [#14](https://github.com/m0t0r/workforpereira/issues/14).

**This is a research note, not a decision.** It records prices, limits and constraints with the
source that owns each claim and the date it was observed.

- **Observation date for every figure below: 2026-08-15.** Prices move; re-check before committing.
- **Budget frame:** under **$25/month total** for the whole stack — Postgres host, Fly.io, error
  tracking *and* messaging. So messaging realistically has **$0–$5/month** to spend at launch.
- **Volume frame:** near zero at launch (tens to low hundreds of messages/month), growing to a few
  thousand/month.
- Where a figure could not be confirmed from a primary source it says **could not verify**. No
  number in this document is estimated from memory.

---

## 0. Answer in one table

| Channel | Cheapest viable option | Cost at ~200/mo | Breaks the $25 budget at |
| --- | --- | --- | --- |
| **Email** | **AWS SES** ($0.16/1,000) — or Brevo/Resend free tiers at $0 | **$0.03** | ~150,000/mo (SES). Resend at 3,000/mo or 100/day → $20. Postmark from day one. |
| **SMS to +57** | **AWS End User Messaging** ($0.05087/msg) | **$10.17** | **~500/mo** — SMS alone eats the entire budget |
| **WhatsApp** | **Meta Cloud API direct** ($0.0008/msg auth) | **$0.16** | Effectively never at this project's scale |

**The one-line answer:** email is free and solved; **SMS is the only channel that threatens the
budget, and it does so at ~500 messages/month**; **WhatsApp is ~60× cheaper than SMS for the same job
in Colombia** and its real cost is approval friction, not money.

---

## 1. Transactional email — what each provider gives you free

| Provider | Free volume | Daily cap | Domains | Log retention | Catch |
| --- | --- | --- | --- | --- | --- |
| **Resend** | 3,000/mo | **100/day** | **1** | 30 days | Inbound counts against quota; every To/CC/BCC recipient counts separately; 10 req/s; sending pauses if bounce >4% or spam >0.08%. Without a verified domain you may only send from `onboarding@resend.dev` **to your own account address**. |
| **Postmark** | **100/mo** (never expires) | none | 10 | 45 days | "No overages allowed in this plan" — you stop dead at 100. A smoke-test tier, not a launch tier. |
| **AWS SES** | Sandbox only until approved | Sandbox 200/24h, 1 msg/s | 10,000 identities/region | n/a | Sandbox can only send to *verified* addresses. Free-tier status is contradictory — see §2.3. |
| **Brevo** | **300/day (~9,000/mo)** forever | 300/day | could not verify | "flexible" (no number published) | The 300/day is **shared between marketing campaigns and transactional**. Free-plan mail carries a "Sent by Brevo" sticker; removing it is a paid add-on. Account needs sending approval first. |
| **Cloudflare Email Service** | **3,000/mo** | conservative, **unpublished** | 30 per zone | 31 days (GraphQL) | Requires the **Workers Paid plan, $5/mo minimum** — there is no free outbound tier to arbitrary recipients. Product is in **public beta**. |

Sources: [resend.com/pricing](https://resend.com/pricing),
[Resend quotas](https://resend.com/docs/knowledge-base/account-quotas-and-limits),
[postmarkapp.com/pricing](https://postmarkapp.com/pricing),
[SES FAQ](https://aws.amazon.com/ses/faqs/), [SES sandbox
docs](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html),
[brevo.com/pricing](https://www.brevo.com/pricing/),
[brevo.com/products/transactional-email](https://www.brevo.com/products/transactional-email/),
[Cloudflare Email Service pricing](https://developers.cloudflare.com/email-service/platform/pricing/),
[Cloudflare Email Service limits](https://developers.cloudflare.com/email-service/platform/limits/).

**Brevo daily-limit change:** no evidence of a recent change. The live pricing page and the
transactional product FAQ both still state 300/day on 2026-08-15. Brevo's help centre sits behind a
Cloudflare interstitial and could not be fetched, so **any historical change record could not be
verified**.

---

## 2. Transactional email — cost past the free tier

### 2.1 Paid tiers

| Provider | Entry paid tier | Included | Per additional 1,000 |
| --- | --- | --- | --- |
| Resend Pro | **$20/mo** | 50,000 | $0.90 |
| Postmark Basic | **$15.00/mo** | 10,000 | $1.80 |
| Postmark Pro | $16.50/mo | 10,000 | $1.30 |
| Postmark Platform | $18.00/mo | 10,000 | $1.20 |
| **SES Essentials** (default for new accounts) | $0 platform fee | pay-per-use | **$0.16** |
| **SES à la carte** | $0 platform fee | pay-per-use | **$0.10** |
| Brevo Starter | **$9/mo** | from 5,000 | could not verify |
| Brevo Standard | $18/mo | from 5,000 | could not verify |
| **Cloudflare Email Service** | **$5/mo** (Workers Paid) | 3,000 | **$0.35** |

Brevo's per-1,000 step pricing is computed by a client-side calculator and is not present in the
page source — **could not verify**.

Verbatim from the [SES pricing page](https://aws.amazon.com/ses/pricing/) on 2026-08-15: *"New SES
accounts and account x region combinations with no metered SES activity since June 1, 2025 will
start on the Essentials plan beginning July 21, 2026."* A brand-new account created today therefore
defaults to **$0.16/1,000**, not $0.10 — switching to à la carte is a deliberate action.

### 2.2 Monthly cost at volume

| Emails/mo | Resend | Postmark | SES Essentials | SES à la carte | Brevo | Cloudflare |
| --- | --- | --- | --- | --- | --- | --- |
| 200 | $0 | **$15** | $0.03 | $0.02 | $0 | $5.00 |
| 2,000 | $0 | $15 | $0.32 | $0.20 | $0 | $5.00 |
| 3,000 (=100/day) | $0 *(at cap)* | $15 | $0.48 | $0.30 | $0 | $5.00 |
| 9,000 (=300/day) | **$20** | $15 | $1.44 | $0.90 | $0 *(at cap)* | $7.10 |
| 30,000 | $20 | $42.50 | $4.80 | $3.00 | ≥$9 | $14.45 |
| 100,000 | $35 | $133.50 | $16.00 | $10.00 | could not verify | $38.95 |

Cloudflare column = $5 Workers Paid + $0.35 per 1,000 above the included 3,000.

### 2.3 Where each one stops being affordable

- **Resend** — $0 → **$20/mo** the instant you exceed 3,000/mo *or* **100/day**. The daily cap is
  the real trap: any batch of status notifications hits 100/day long before the monthly cap. $20 is
  ~80% of the entire stack budget.
- **Postmark** — effectively **$15/mo from day one**. 100 free emails/month is a smoke test. Flat
  and predictable thereafter, but 60% of the budget for volume SES delivers for under a dollar.
- **Brevo** — free to 300/day, then **$9/mo**. Softest cliff of the hosted-UI options, but the
  300/day is shared with marketing sends and the free tier brands your mail.
- **Cloudflare** — **$5/mo floor from day one** (Workers Paid), then extremely cheap. Only breaks
  the budget past ~60,000/mo. But there is no $0 option for sending to real users.
- **SES** — never a cliff at these volumes. ~$24/mo at 150,000 emails on Essentials, ~$15 à la
  carte. The only option that stays under a few dollars through the entire projected growth curve.

### 2.4 AWS SES specifics

**Sandbox** ([docs](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html),
verbatim): *"You can only send mail to verified email addresses and domains, or to the Amazon SES
mailbox simulator"*; *"a maximum of 200 messages per 24-hour period"*; *"a maximum of 1 message per
second."* Sandbox status is **per region**.

**Production access:** Console → Account dashboard → Request production access; pick Transactional;
supply website URL, up to 4 contact emails, language, and acknowledge consent + bounce/complaint
handling. Or `aws sesv2 put-account-details --production-access-enabled --mail-type TRANSACTIONAL`.
AWS: *"The AWS Support team provides an initial response to your request within 24 hours."*
Verifying a domain first speeds approval.

**Attachments:** *"$0.12 per gigabyte (GB) of data in the attachments you send"* — confirmed
verbatim today. Not relevant while v1 has no file uploads.

**The 3,000-message / 12-month free trial — unresolved contradiction between two AWS pages, both
fetched 2026-08-15:**

- [SES FAQ](https://aws.amazon.com/ses/faqs/) still says: *"Receive up to 3,000 message charges for
  free each month for the first 12 months after you start using SES."*
- [SES pricing](https://aws.amazon.com/ses/pricing/) "AWS Free Tier" section makes **no mention of
  3,000 messages** — only the $200 credits, a free plan for 6 months after account creation, and
  credits usable within 12 months.

**Could not verify** that an AWS account created today still receives the 3,000/mo SES free tier.
The FAQ text appears stale relative to the 2025-07-15 Free Tier overhaul. **Plan on paying
$0.16/1,000 and treat any free tier as a bonus** — at launch volume that is cents either way.

**Avoidable SES extras** (all optional): Virtual Deliverability Manager $0.07/1,000; Mail Manager
email processing $0.15/1,000, archiving $2/GB ingested + $0.19/GB/mo, ingress endpoint $50/mo per
endpoint (*"Charges apply even when endpoint status is 'Closed'"*); inbound $0.10/1,000; email
validation $0.01 each. None are needed.

---

## 3. Cloudflare Email Service — costed in detail

The ticket asks for this explicitly, so it gets its own section.

| Fact | Value | Source (fetched 2026-08-15) |
| --- | --- | --- |
| Status | **Public beta** since 2026-04-16 (Email *Routing* is GA) | [changelog](https://developers.cloudflare.com/changelog/product/email-service/), [overview](https://developers.cloudflare.com/email-service/) |
| Plan requirement | Outbound to arbitrary recipients requires **Workers Paid**, **$5/mo minimum** | [pricing](https://developers.cloudflare.com/email-service/platform/pricing/), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) |
| Included | **3,000 emails/account/month**, then **$0.35 per 1,000** | [pricing](https://developers.cloudflare.com/email-service/platform/pricing/) |
| Free sends | Sends to *verified destination addresses in your own account* are free on all plans and do not count toward quota | same |
| Quota accounting | Hard bounces **count**; API-boundary rejections and suppression-list blocks **do not** | same |
| Inbound (Email Routing) | **Unlimited, free** on Workers Free and Paid | same |
| Daily quota | *"New accounts start with a conservative daily quota and scale up over time based on your sending behavior, deliverability rates, and account standing."* **Exact starting number not published — could not verify.** | [limits](https://developers.cloudflare.com/email-service/platform/limits/) |
| Other limits | 50 recipients/email, 998-char subject, 5 MiB message, 16 KB headers, 30 domains/zone | same |

**Access from a Fly.io-hosted Next.js app:** no Worker is required. Three transports exist — the
Workers `send_email` binding, a **REST API** with a Bearer token, and **authenticated SMTP
submission** on `smtp.mx.cloudflare.net:465` (PLAIN/LOGIN), added 2026-06-08 and itself in beta
([changelog](https://developers.cloudflare.com/changelog/post/2026-06-08-smtp-submission/),
[SMTP docs](https://developers.cloudflare.com/email-service/api/send-emails/smtp/)). So the
$5/mo Workers Paid plan is a **billing prerequisite, not an architectural one** — we would pay for
Workers without running one.

**Domain setup — the strongest point.** The domain must be onboarded under Email Service → Email
Sending, and Cloudflare *auto-configures every record* when the zone is on Cloudflare DNS
([domain config](https://developers.cloudflare.com/email-service/configuration/domains/)):

| Record | Name | Purpose |
| --- | --- | --- |
| MX | `cf-bounce.<domain>` | bounce processing |
| TXT | `cf-bounce.<domain>` | SPF — `v=spf1 include:_spf.mx.cloudflare.net ~all` |
| TXT | `cf-bounce._domainkey.<domain>` | DKIM (keys generated and rotated by Cloudflare) |
| TXT | `_dmarc.<domain>` | DMARC — `p=none` / `quarantine` / `reject`, recommended not mandated |

This is the lowest-effort DNS setup of any option here *provided the domain is already a Cloudflare
zone*. If it isn't, moving nameservers to Cloudflare is a prerequisite.

**Constraints to weigh:**

- **Transactional only.** Verbatim: *"Email Service is intended only for transactional emails. We
  plan to support marketing emails and bulk sender tooling in the future."*
  ([FAQ](https://developers.cloudflare.com/email-service/reference/faq/)). Auth mail and
  application-status notifications qualify; a future "jobs matching your profile" digest may not.
- **Beta.** No SLA found — **could not verify** that one exists.
- **Shared vs dedicated IP is not documented anywhere** — **could not verify**; no dedicated-IP
  option was found. Cloudflare manages IP reputation, soft-bounce retry with backoff, automatic
  suppression on hard bounce and spam complaint, and ISP feedback loops.
- **Observability is unusually good for the price:** every send returns
  `{delivered, permanent_bounces, queued}`; GraphQL datasets `emailSendingAdaptive` /
  `emailSendingAdaptiveGroups` with 31-day retention; Queues event subscriptions (2026-07-15);
  activity log with full message preview (2026-07-17).

**Verdict on Cloudflare:** cheapest *per email* of the managed options and by far the least DNS
work, but it has a **$5/mo floor** where Resend, Brevo and SES all have a genuine $0 launch path. At
200 emails/month it costs $5 to send what SES sends for $0.03. It becomes the best value somewhere
around 20,000–50,000 emails/month, which this project will not see for a long time.

---

## 4. Email deliverability to Colombian consumer inboxes

**The "Gmail is dominant in Colombia" premise could not be verified from a primary source.**
StatCounter publishes no Colombia email-client dataset that surfaced in search. The premise is
carried over from the ticket and treated as a given, not established here.

**Google's own bulk-sender requirements** ([Google Workspace Admin
Help](https://support.google.com/a/answer/81126), fetched 2026-08-15):

- *"Starting February 1, 2024, all email senders who send email to Gmail accounts must meet the
  requirements in this section"* — **SPF or DKIM** on sending domains, and spam rates in Postmaster
  Tools **below 0.10%** (guidance).
- **5,000+ messages/day** additionally requires: SPF **and** DKIM; **DMARC** (*"Your DMARC
  enforcement policy can be set to none"*); valid forward and reverse DNS (PTR); TLS; spam rate
  **below 0.30%**; RFC 5322 formatting; no Gmail `From:` impersonation; `From:` domain aligned with
  the SPF or DKIM domain; one-click unsubscribe on marketing and subscribed messages.
- Whether crossing 5,000/day once makes you permanently a bulk sender is **not stated** — could not
  verify.

**Practical read:** at tens-to-thousands per month we are three orders of magnitude below the
5,000/day threshold, so only "SPF or DKIM" is strictly required. Configure **SPF + DKIM + DMARC
`p=none`** anyway — it is free and is the single biggest lever on Gmail placement.

### IP model per provider

| Provider | Default | Dedicated IP | Gate |
| --- | --- | --- | --- |
| Resend | Shared | $30/mo | Scale plan only, *"for customers exceeding 3,000 emails sent per day"* — unavailable to us |
| Postmark | Shared, vetted pools; separate transactional/broadcast pools | from $50/mo per IP | *"available to customers sending 300,000 emails per month or more"*, Pro+ only — unavailable to us |
| AWS SES | Shared | Standard $24.95/mo/IP; Managed $15/mo + $0.08/1,000 | purchasable, but pointless below ~100K/mo |
| Brevo | Shared | could not verify (not in page source) | Enterprise, billed annually |
| Cloudflare | Managed (shared/dedicated **not documented**) | none found | — |

**At our volume a dedicated IP is unavailable where it matters and would actively hurt us** — you
cannot warm an IP on 200 emails/month. Shared-pool reputation is what we want. Postmark's shared
pool is the most aggressively curated; SES shared IPs are the most heterogeneous, which is the main
deliverability cost of its price advantage.

### DNS setup effort

| Provider | Records | DMARC mandated by provider? |
| --- | --- | --- |
| **Postmark** | **2** — DKIM TXT + Return-Path CNAME (`pm-bounces` → `pm.mtasv.net`) | No. DMARC monitoring is a paid add-on from $14/mo per domain. |
| **Cloudflare** | **4, auto-created** if the zone is on Cloudflare DNS | No — recommended only |
| **Resend** | DKIM TXT + SPF TXT + **MX**; exact count not stated in docs — could not verify | No — a post-verification "build trust" step |
| **AWS SES** | **3 CNAMEs** for Easy DKIM, **+ MX and TXT** if using a custom MAIL FROM subdomain (recommended for SPF alignment) → **3–5**, duplicated per region. Up to 72h to propagate. | No |
| **Brevo** | **Could not verify** — help centre unreachable behind Cloudflare; the product page says only *"Brevo helps you set up DMARC, DKIM, and SPF authentication."* | Could not verify |

### Region / data-residency notes

- **AWS SES** — `sa-east-1` (São Paulo) fully supported for sending, SMTP
  (`email-smtp.sa-east-1.amazonaws.com`) and receiving
  ([AWS region table](https://docs.aws.amazon.com/general/latest/gr/ses.html)). Note the map's given
  that **`iad` beats São Paulo for Colombian users** — that given is about *user-facing latency*,
  which does not apply to asynchronous outbound mail. Sandbox status and identity verification are
  per region, so verifying in `us-east-1` and later moving to `sa-east-1` means redoing both.
- **Resend** — multi-region including `sa-east-1`, available to free users since 2025-03-06. Region
  controls sending only; *"All account data, including email metadata, logs, and API records, is
  stored in the United States."*
- **Brevo** — *"Data hosting: France and Germany (EU-based servers)"*. API calls from Fly.io and
  mail egress route through Europe — the worst geography of the set, and a consideration for the
  Ley 1581 work in [#5](https://github.com/m0t0r/workforpereira/issues/5) (international transfer).
- **Postmark** — advertises "Multi-Region Routing (SMTP)" on all plans but publishes no region
  list; **could not verify** any South American presence.
- **Cloudflare** — no sending-region documentation found; **could not verify**.

**No provider's primary sources say anything about Colombia-specific blocklisting, Colombian ISPs,
or LatAm deliverability.** Any claim about Colombian latency or local ISP behaviour would be
guesswork.

## 5. SMS to Colombian mobile numbers (+57)

### 5.1 Per-message cost

| Provider | Price to Colombia | Carrier surcharge included? | Source (fetched 2026-08-15) |
| --- | --- | --- | --- |
| **Twilio SMS** | **$0.0592 / segment** — identical for Claro, movistar, Tigo, Avantel, ETB, "Other" | Footnote says *"additional carrier fees may apply"* but **no Colombia carrier fee is itemised anywhere** in the live pricing CSV. Treat as all-in list, with unverified upside risk. | [twilio.com/en-us/sms/pricing/co](https://www.twilio.com/en-us/sms/pricing/co) + [live CSV](https://assets.cdn.prod.twilio.com/pricing-csv/SMSPricing.csv) |
| **Twilio Verify (SMS)** | **$0.05 per successful verification + $0.0592 channel fee = $0.1092** | **No.** Verbatim: *"$0.05 per successful verification plus standard channel fees."* Only TOTP and Push bundle the channel fee. | [twilio.com/en-us/verify/pricing](https://www.twilio.com/en-us/verify/pricing) |
| **AWS End User Messaging SMS** | **$0.05087 / message part** — CSV row `CO,Colombia,All Networks,All number types,0.05087` | AWS itemises carrier fees only for US/Canada. **No Colombia carrier fee published.** | [aws.amazon.com/end-user-messaging/pricing/](https://aws.amazon.com/end-user-messaging/pricing/) |
| **LabsMobile** (ES/LatAm) | **€0.0019** (200–4,999 credits) / **€0.0017** (5,000–24,999) | Flat per destination; no surcharge published | [labsmobile.com/es/prices/pricelist](https://www.labsmobile.com/es/prices/pricelist) — PDF header `LISTA DE PRECIOS #PL20260815 · Fecha: 2026-08-15` |
| **Vonage / Nexmo** | **could not verify** | — | `vonage.com/communications-apis/sms/pricing/` returns HTTP 403 to all non-browser clients; per-country rates require dashboard login |
| **Bird (ex-MessageBird)** | **could not verify** — US-only ($0.0073) is public; *"Carrier fees apply on top of the rates shown and vary by destination"* | — | [bird.com/pricing/sms](https://bird.com/pricing/sms) |
| **Infobip** | **could not verify** — *"per-network pricing is available in Portal"* | — | [infobip.com/sms/pricing](https://www.infobip.com/sms/pricing) |
| **Sinch** | **could not verify** — US/Canada public only | — | [sinch.com/pricing/sms/](https://sinch.com/pricing/sms/) |
| **Hablame** (Colombian, local) | **no public per-message price list** — advertises "desde $2" with no unit stated; credentials by request form | — | [hablame.co/sms/](https://www.hablame.co/sms/) |

**Two cautions on these numbers.**

1. **The LabsMobile Colombia rate is ~30× below Twilio and AWS.** Twilio ($0.0592) and AWS
   ($0.05087) agree within 14% of each other, which is what a licensed A2P termination route to
   Colombian carriers costs. €0.0019 (~$0.002) is almost certainly a grey/SS7 or MVNO-transit
   route. For OTP that *gates sign-in*, an undelivered code is a conversion-killing failure. Recorded
   as found, flagged as a route-quality question — **not** a verified bargain.
2. **A stale Twilio CSV is in circulation.** The CSV linked from Twilio's *support article* still
   shows $0.0525 for Colombia. The CSV linked from the live pricing page shows **$0.0592**, matching
   the rendered page. Use the `assets.cdn.prod.twilio.com` one.

**Ancillary fees observed:** Twilio charges **$0.001 per message terminating in `Failed`**; optional
SMS Pumping Protection $0.025. AWS SMS Protect: `Filter $0.01`, `Allow`/`Block` no charge. AWS
confirms international sends are billed *"based on the destination country price"*, so a US-origin
identity sending to +57 pays the Colombia rate.

### 5.2 Regulatory and network friction in Colombia

**Sender ID — the sharpest finding, and Twilio and AWS agree independently:**

| Capability | Twilio ([guidelines/co/sms](https://www.twilio.com/en-us/guidelines/co/sms)) | AWS ([country capabilities](https://docs.aws.amazon.com/sms-voice/latest/userguide/phone-numbers-sms-by-country.html)) |
| --- | --- | --- |
| Alphanumeric sender ID (pre-registered or dynamic) | **Not Supported** | **No** |
| Long code, domestic | **Not Supported** | **No** |
| Long code, international | Supported, sender ID **not preserved** | Yes |
| Short code | Supported, **4–10 weeks** provisioning | Yes |
| Two-way SMS | Yes | **No** |

What this means:

- **Alphanumeric sender IDs do not work in Colombia at all.** Not "registration required" — the
  *networks* do not support them. We cannot brand the sender as `ENCUENTRA`. No paperwork fixes it.
- **No pre-registration and no NIT / local-entity requirement is documented by either provider** at
  the telecom layer. Twilio's Colombia page has no registration, tax-ID or local-entity field —
  unlike its India, Brazil or US 10DLC pages. Sending can start on day one with no Colombian
  corporate paperwork. (Data-protection obligations are a separate matter — see below and
  [#5](https://github.com/m0t0r/workforpereira/issues/5).)
- **Short codes are not required for A2P.** Twilio verbatim: *"You may use a global SMS-capable
  number to reach mobile phones in Colombia. However, the number will be overwritten with a short
  code."* Twilio routes over its shared short code. **Do not buy a dedicated short code** — 4–10
  weeks and a monthly fee unjustifiable at tens of messages/month.
- Twilio caveat: *"The network Virgin Mobile doesn't support sender ID preservation, messages via
  dedicated short code will have the sender ID replaced with a shared code."*
- **Throughput:** Twilio publishes no Colombia-specific figure. AWS enforces 1 msg/sec to a single
  recipient (not increasable). Irrelevant at our volume.
- **Segment length trap:** 160 chars GSM-7 per segment. A Spanish OTP containing `código` or `Aquí`
  flips the encoding to UCS-2, halving the limit to 70 chars and **doubling the per-message cost**.
  Write `codigo` unaccented.

**Carrier coverage.** Twilio names **Claro, movistar, Tigo, Avantel SAS, ETB and "Other"**, all at
the same rate. AWS publishes a single `All Networks` row. WOM is not named as a separate Twilio
line; that WOM Colombia is the Avantel rebrand is **recalled, not verified**. Coverage claims from
Vonage / Bird / Infobip / Sinch are not verifiable without login.

### 5.3 Colombian law — what actually binds an OTP

**Ley 2300 de 2023** ("Dejen de Fregar"), promulgated 2023-07-10, in force three months later. Text
extracted verbatim from the Función Pública PDF and cross-checked against the CRC normograma.

- **Art. 1** scopes the law to *"entidades vigiladas por la Superintendencia Financiera y todas las
  personas naturales y jurídicas que adelanten gestiones de cobranzas"* — debt collection.
- **Art. 5** extends it to ordinary businesses **only for** *"el envío de mensajes publicitarios …
  de carácter comercial o publicitario."* An OTP is neither: it is user-initiated, non-promotional
  and functionally necessary.
- **Art. 5, Parágrafo 2** carves out service messages: *"no podrá obligarse al consumidor a aceptar
  recibir mensajes comerciales de ninguna índole, salvo aquellos asuntos estrictamente relacionados
  con el bien o servicio adquirido"* — but requires *"un mecanismo ágil, sencillo y eficiente para
  cancelar en cualquier momento la recepción de mensajes."*
- **Art. 3** (applied to advertising SMS by Art. 5 Par. 3) sets contact hours *"de lunes a viernes y
  de 7:00 am a 7:00 pm, y sábados de 8:00 am a 3:00 pm, excluyendo … los domingos y días festivos"*
  and a frequency cap of no more than once per day / one channel per week. **These bind advertising
  SMS only.**
- **Art. 8** exempts, among others, *"enviar información solicitada por el consumidor"* — precisely
  what an OTP is.
- **Art. 9** puts enforcement with the Superintendencia Financiera **and the SIC**. For a
  non-financial marketplace, **the SIC is our regulator**.

**Registro Nacional de Excluidos (RNE)** — the national do-not-contact registry, implemented by
**Resolución CRC 7356 de 2024**, live since **2024-04-10**. Its definition covers only
*"mensajes publicitarios … de carácter comercial o publicitario"*, and Art. 2.1.18.1 explicitly
still permits *"enviar información solicitada por el consumidor"* to registered users. Blocking must
take effect within **5 días hábiles**, and the obligation lands on *"operadores móviles, proveedores
de contenidos e integradores tecnológicos"* — carriers and aggregators, **upstream of us**.

**Which rules bite what:**

| Rule | Marketing SMS | **OTP** | Application-status notification |
| --- | --- | --- | --- |
| Must check the RNE before sending | Yes | **No** | No, if genuinely service-related |
| Mon–Fri 7–19h / Sat 8–15h, no Sundays | Yes | **No** — send 24/7 | No, but courtesy applies |
| Max once/day, one channel/week | Yes | **No** | No |
| Prior advertising consent | Yes | **No** — user-initiated | No (Art. 5 Par. 2) |
| Easy opt-out mechanism | Yes | Not meaningfully | **Yes** — Art. 5 Par. 2 requires one |
| Alphanumeric sender ID available | No | **No** | No |
| Pre-registration / NIT | No | **No** | No |

**The line to hold:** the moment a message mixes in *any* promotional content ("your application was
viewed — upgrade to Premium!") it becomes a `mensaje publicitario` and the whole Ley 2300 apparatus
attaches — RNE checks, contact hours, frequency caps, SIC exposure. **Keep OTP and status messages
surgically free of marketing.** AWS's own quota-increase form enforces the same distinction, forcing
a choice between *One Time Password* / *Transactional* / *Promotional* and stating *"Transactional
messages must not contain promotional or marketing content."*

**Not verified:** **Ley 1581 de 2012** (habeas data, SIC-enforced) governs storing and processing the
phone number itself, independently of Ley 2300, and above certain thresholds obliges registration of
databases in the RNBD. Primary sources were **not** fetched — that is
[#5](https://github.com/m0t0r/workforpereira/issues/5)'s job, but it is a live obligation if we
collect phone numbers at all.

### 5.4 Free tiers — there is no usable one

- **Twilio trial** ([docs](https://www.twilio.com/docs/usage/trials)): 100 free SMS units, expiring
  **30 days after sign-up**, and *"can send messages and make calls only to verified phone
  numbers"* — max **5 recipients**. Colombia is a trial-eligible country. **Fine for development,
  useless as production infrastructure.**
- **AWS: no SMS free tier.** Sandbox is capped at a **$1.00/month spend limit**, 10 verified
  destination numbers. Worse, the **production** default is *also* `Spending threshold: USD $1.00
  per account`. At 50 messages/month ($2.54) we exceed the default limit **even in production**. Two
  separate Service Quotas cases are needed — production access *and* a `TextMessageMonthlySpend`
  increase — before a single real user can sign in. Budget days of lead time.
- **LabsMobile:** €9/$10 minimum purchase, credits valid 18 months, ≈4,700 SMS to Colombia. The only
  "near-free" option, subject to the route-quality caveat above.
- Vonage / Infobip / Sinch / Bird: no publicly verifiable free tier for Colombia.

### 5.5 Monthly cost at volume

Assumes 1 segment per message (OTP ≤160 GSM-7 chars).

| Msgs/month to +57 | Twilio SMS @ $0.0592 | Twilio Verify @ $0.1092 | AWS EUM @ $0.05087 | LabsMobile @ €0.0019 |
| --- | --- | --- | --- | --- |
| **50** (launch) | **$2.96** | $5.46 | **$2.54** | €0.10 |
| **100** | $5.92 | $10.92 | $5.09 | €0.19 |
| **500** | **$29.60** | $54.60 | **$25.44** | €0.95 |
| **2,000** | $118.40 | $218.40 | $101.74 | €3.80 |

*LabsMobile column is EUR and is theoretical spend against prepaid credit; real outlay is the $10
minimum pack. No FX rate was fetched, so no conversion is offered.*

### 5.6 Where SMS stops being affordable

**At 500 messages/month SMS alone consumes or exceeds the entire $25 infrastructure budget** —
$25.44 on AWS, $29.60 on Twilio — leaving nothing for hosting, database or email.

500 SMS/month is not much traffic for a job marketplace: roughly 150–250 active users signing in a
couple of times a month each. **We cross that line well before the product feels successful.**

Twilio Verify's $0.05 surcharge nearly doubles the per-message cost for rate limiting, retry logic
and code storage — all of which Better Auth's OTP plugin already provides. At +85% it is poor value
for this stack.



## 6. WhatsApp Business Platform (Cloud API)

**Headline: authentication messages to Colombia cost $0.0008 each.** 1,000 OTPs/month is **$0.80**.
Colombia is one of the cheapest markets on Meta's entire rate card. **The cost is approval friction,
not money.**

### 6.1 The pricing model is per-message, not per-conversation — confirmed

The ticket's warning was correct. Verbatim from
[developers.facebook.com/docs/whatsapp/pricing](https://developers.facebook.com/docs/whatsapp/pricing):
*"You are only charged when a template message is delivered."* And Meta's old page now carries a
banner: *"Deprecated — This document describes conversation-based pricing, which was replaced by
per-message pricing on July 1, 2025."*

Rates depend on **template category** and **the recipient's country calling code** — *"Charges for
messages are based on the country calling code of the recipient WhatsApp phone number."*

| Category | Charging rule (Meta's wording) |
| --- | --- |
| **Marketing** | *"All marketing template messages are charged."* Always billed. |
| **Utility** | *"Utility templates delivered within an open customer service window are free."* Charged outside one. |
| **Authentication** | Charged per delivered message. Volume tiers apply. |
| **Authentication-International** | Higher rate, specific country list only. |
| **Service** (non-template) | *"All non-template messages are free"* — sendable only inside an open window. |

**The 1,000 free service conversations/month allowance is gone.** *"As of November 1, 2024, you can
open an unlimited number of service conversations at no charge."* Meta's API confirms numerically:
querying Service for Colombia returns `{"quote":"0"}`.

> **Stale-source trap.** Meta's own marketing FAQ at
> [whatsappbusiness.com/resources/faq/](https://whatsappbusiness.com/resources/faq/) — **fetched
> today, 2026-08-15** — still says *"The first 1,000 conversations each month are free"* and
> describes *"per 24 hour conversation session"* billing. **This page contradicts Meta's own
> developer docs and is out of date.** Many third-party blogs echo it. Do not price off it.

**2026 changes** ([pricing updates](https://developers.facebook.com/docs/whatsapp/pricing/updates-to-pricing/)):
2026-04-01 added 8 billing currencies **including COP**; 2026-07-01 brought the current rate card
into force; 2026-10-01 moves several markets to standalone rates — **Colombia is not on that list**.

### 6.2 Colombia rate card — verified against two independent primary sources

Meta publishes rates only through an interactive tool. The tool's backing JSON endpoint on Meta's own
site (`whatsappbusiness.com/es-la/wp-json/wab/v1/pricing?market=CO&currency=USD&category=...`, behind
[business.whatsapp.com/products/platform-pricing](https://business.whatsapp.com/products/platform-pricing))
was queried directly.

**Colombia (market `CO`, calling code 57), USD, effective 2026-07-01:**

| Category | Per delivered message (USD) |
| --- | --- |
| **Authentication** | **$0.0008** |
| **Utility** | **$0.0008** |
| **Marketing** | $0.0125 |
| **Service** | **$0** (free) |
| **Authentication-International** | **Not applicable** |

**Colombia is its own standalone market**, not part of a regional group — Meta's country table lists
`Colombia | 57 | CO`, and the pricing tool exposes `CO` separately from a `LATAM` ("Resto de
Latinoamérica") group. For contrast, **Rest-of-LatAm authentication is $0.0113 — 14× Colombia's
rate.** That gap looks like a decimal error, which is why it was cross-checked.

**Independent cross-check.** [twilio.com/en-us/whatsapp/pricing](https://www.twilio.com/en-us/whatsapp/pricing)
embeds Meta's live per-country rates:

```
value="CO" data-utility-rates="[0.000800,100000,true]"
           data-authentication-rates="[0.000800,120000,true]"
           data-marketing-rates="[0.012500,100000,true]"
           data-service-rates="[0,100000,true]"
           data-has-auth-international-rates="false"
```

Twilio matches Meta's API exactly, including volume-tier breakpoints. Mexico returns `0.008500` auth
in both sources as a control.

Colombia authentication volume tiers: $0.0008 to 400,000/mo; $0.0007 to 5,000,000; $0.0006 above.
**We sit in the first tier essentially forever.** In COP the rate is **COP 2.9455**, implying a true
USD rate of ≈$0.00073 (the USD card is rounded to 4dp).

**Colombia is explicitly NOT authentication-international** — that list is *"Egypt, India, Indonesia,
Malaysia, Nigeria, Pakistan, Saudi Arabia, South Africa, United Arab Emirates"*
([source](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/authentication-international-rates/)).

Note Colombia received *"Higher utility and authentication rates"* effective **2025-10-01**. The
$0.0008 above is the **post-increase, current** figure, confirmed against the live July-2026 card.

### 6.3 Entry cost

- **Meta platform fee: $0.** Meta's pricing docs were searched for "platform fee", "monthly fee",
  "minimum spend", "subscription" and startup credits — **no mentions found**. The only charging
  statement is *"You are only charged when a template message is delivered."*
- **Cloud API hosting: free** (Meta hosts it). The sentence stating this could not be located on a
  live page today, but the operative fact holds: charges are defined exclusively as delivered
  template messages, with no infrastructure line item.
- **Billing mechanics and IVA treatment for COP-billed accounts: could not verify** — Meta's billing
  help pages are login-gated. At $0.04–$0.80/month we would sit below any normal billing threshold;
  the exact threshold **could not be verified**.

**The phone number** ([docs](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/phone-numbers)):

- A regular Colombian mobile number works; mobile is *"recommended"*. Must have a country and area
  code (*"short codes are not supported"*), be able to receive voice calls or SMS, and be owned by us.
- **It must not already be on WhatsApp:** *"Numbers already in use with WhatsApp cannot be registered
  unless they are deleted first."* Deleting loses the message history.
- After registration: *"Registered numbers can still be used for everyday purposes, such as calling
  and text messages, but cannot be used with WhatsApp Messenger."*
- **Therefore: buy a dedicated prepaid SIM.** Do not burn a personal number — the change is
  effectively one-way while registered. Cost is a few thousand COP, one-off.
- Cloud API provides a free test business number that can message up to 5 recipients, enough to build
  the whole OTP flow before spending anything — **recalled from a search snippet, could not verify on
  a live page**.

### 6.4 Direct vs BSP

**A solo dev can go direct.** Cloud API is self-serve: a Meta account, developer registration, a
Business Portfolio and a phone number. No BSP contract is a prerequisite for any of it.

**Twilio's markup is a flat `data-fixed-twilio-rate="0.005"` per message — identical across all 142
countries on the page**, with Meta's rate passed through at cost. In Colombia that is devastating in
relative terms:

| | Per message | vs Meta direct |
| --- | --- | --- |
| Meta direct | $0.0008 | — |
| Via Twilio | $0.0058 | **7.25×** |

Twilio's flat fee is **6.25× larger than the entire Meta message cost**. In an expensive market a
$0.005 markup is noise; in Colombia it dominates the bill. Twilio's ancillary WhatsApp sender/number
fees **could not be verified**. 360dialog / Gupshup / Wati pricing was **not fetched — could not
verify**; typical BSP models are a flat monthly fee per WABA in the tens of USD, which at our volume
would be worse than Twilio and would consume most of the $25 budget on its own.

### 6.5 Approval — can a solo developer realistically get through it?

**Yes, to launch. Probably not to full verification without a registered entity.**

**Messaging limits before verification**
([docs](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits)):
*"Newly created business portfolios have a messaging limit of 250"* — 250 **unique** WhatsApp users
per rolling 24 hours. Tiers run 250 → 2,000 → 10,000 → 100,000 → Unlimited.

**The key finding: verification is not the only way up.** Moving 250 → 2,000 requires *any one* of:
verify your business; have a partner verify it; or *"send 2,000 delivered messages outside of
customer service windows to unique WhatsApp user phone numbers within a 30-day moving period, using
templates with a high quality rating."* Above 2,000 it scales automatically on quality and usage.

Other unverified caps: **2 registered business phone numbers** per portfolio (20 once verified or at
the 2,000 tier); **250 message templates** per WABA (6,000 once verified with an approved display
name).

> **At 50–1,000 messages/month we never approach the 250/24h cap. We can launch, run and grow for a
> long time without business verification.** This materially de-risks the plan.

Whether authentication templates are exempt from these limits **could not be verified** — Meta's page
does not address category exemptions.

**Business Verification requirements — weakest-sourced section of this document.** Meta's detailed
lists live in the Business Help Center, which is JS-rendered and login-gated; only page titles were
returned. What was verified: Meta's developer doc defines it as *"a process that allows us to gather
information about you and your Business so we can verify your identity as a business entity"*
([source](https://developers.facebook.com/docs/development/release/business-verification/)), and
contains **no requirement to be registered in the recipient's country**. From help-page snippets
only: documents must prove *a legally registered business with official authorities*, and *"Meta
doesn't accept self-filed documents that have been filled in by the business without an accompanying
official signature or seal."*

**Practical read: a registered legal entity is effectively required to verify.** A pure individual
with no registration is unlikely to pass. In Colombia the natural documents are **RUT (DIAN)** and a
**Cámara de Comercio** certificate of existence — that Meta explicitly accepts those Colombian
document types **could not be verified**. Whether a website on our own domain is strictly mandatory
**could not be verified**; that Meta wants one, name-matched, with a business email on that domain,
is **recalled and possibly stale** — treat as strong practice, not a verified requirement.

**Three things often conflated:**

- **Business Verification** — proves the entity to Meta. Unlocks higher tiers and number caps. **Not
  required to send templates.**
- **Display name approval** — customer-facing name must be approved; **required to send**.
- **Official Business Account (green checkmark)** — a notability badge granted at Meta's discretion.
  **Purely cosmetic, not required for anything. Do not chase it.** (This three-way split is assembled
  from the messaging-limits page plus recalled knowledge; the OBA description is **recalled**.)

**Template approval**
([docs](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview)):
automatic review on creation and edit, stated SLA *"Review can take up to 24 hours"*; in practice most
approve in minutes (**recalled**).

**Authentication templates have fixed text — this constrains the UX**
([docs](https://developers.facebook.com/docs/whatsapp/business-management-api/authentication-templates)):

- Body is preset and non-customizable: `"<VERIFICATION_CODE> is your verification code."` **We cannot
  brand or reword it**, and note it is English boilerplate on a Spanish-language product.
- Buttons: one-tap autofill (preferred — opens the app with the code), copy-code, or none (zero-tap).
- Optional security disclaimer and an expiry warning (1–90 minutes).
- **Critical:** *"authentication messages are only delivered to a user's primary WhatsApp device."* A
  candidate on WhatsApp Web on a borrowed laptop with their phone off **will not receive the OTP**.
- No country restrictions mentioned.

**Known solo-dev failure modes could not be verified** — Meta's troubleshooting articles are
login-gated. **Recalled, unverified:** business-name mismatch between documents and the Meta profile;
no verifiable web presence; free email domains; documents lacking an official seal or signature; a
number that cannot receive the verification call. An appeal path exists but iterates slowly.

### 6.6 Colombia specifics for WhatsApp

- **No local entity required by Meta.** Platform prerequisites are a business portfolio, WABA,
  business phone number and user opt-in — **no country-of-incorporation requirement and no country
  restriction** ([source](https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform)).
  COP became a billing *option* on 2026-04-01; mandatory billing localization applies only to Brazil
  (BRL) and India (INR). No Colombian tax ID is implied.
- **Ley 2300 de 2023 does apply to WhatsApp as a channel** — Art. 5 covers *"mensajería por
  aplicaciones o web… de carácter comercial o publicitario"* — **but not to OTPs or genuine status
  notices**, for the same three textual reasons given in §5.3 (Art. 8 *"enviar información solicitada
  por el consumidor"*; Art. 5 Par. 2 service carve-out). Primary text fetched from
  [MinTIC's normograma](https://normograma.mintic.gov.co/mintic/compilacion/docs/ley_2300_2023.htm)
  and [SUIN-Juriscol](https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Leyes/30046853). **Caveat:
  no SIC ruling says "OTPs are exempt" in so many words** — this is well-founded, not judicially
  confirmed. [SIC Circular Externa 001 de 2024](https://normograma.mintic.gov.co/mintic/compilacion/docs/circular_superindustria_0001_2024.htm)
  frames SIC's jurisdiction around *cobranza* and contact *"para efectos publicitarios"*.
  Penalties flow via Ley 1581 Art. 23 — up to **2,000 SMLMV**.
- **Telecom regulation does not reach it.** CRC's jurisdiction covers telecom operators; WhatsApp is
  an OTT outside it, and CRC's June 2026 anti-fraud draft covers **voice and SMS only**. A vendor blog
  citing a "Resolución CRC 8308 de 2026" **could not be verified** on crcom.gov.co — do not rely on it.

### 6.7 Monthly cost

**Meta Cloud API direct, authentication messages to Colombia:**

| Volume/month | Meta cost |
| --- | --- |
| **50** | **$0.04** |
| **200** | **$0.16** |
| **1,000** | **$0.80** |

Application-status notifications are utility category — also $0.0008, and **free inside an open 24h
customer service window**. Even assuming every one is billable at 3 per candidate for 1,000
candidates: **+$2.40/month**.

**Realistic all-in WhatsApp cost: under $0.20/month at launch; ~$3.20/month at meaningful traction.**
Fixed costs from Meta: **$0**. Plus one Colombian prepaid SIM.

**Via Twilio for comparison** (excludes unverified number/sender fees): $0.29 at 50/mo, $1.16 at
200/mo, **$5.80 at 1,000/mo** — still under budget in absolute terms, but ~23% of the stack budget
for messages that cost $0.80 direct.

**WhatsApp never stops being affordable at any volume this project will plausibly reach.** At
1,000,000 authentication messages/month the Meta bill is ~$700 — but that is 4 orders of magnitude
beyond launch.

---

## 7. Which options have a viable path at near-zero volume

| Channel | Option | Cost at ~50–200/mo | Verdict |
| --- | --- | --- | --- |
| Email | **AWS SES** | **$0.02–$0.05** | **Viable.** Cheapest across the whole growth curve. Costs: 3–5 DNS records, a sandbox-exit request (24h), no built-in template/analytics UI, shared IPs with mixed neighbours. |
| Email | **Brevo free** | **$0** | **Viable.** 300/day, real dashboard. But the cap is shared with marketing, mail is branded "Sent by Brevo", data hosted in the EU, overage pricing unverified. |
| Email | **Resend free** | **$0** | **Viable but tight.** Best DX; 3,000/mo covers launch. The **100/day** cap and **1-domain** limit bite early, and the next step is $20/mo — 80% of the budget. |
| Email | **Cloudflare Email Service** | **$5.00** | **Viable but not free.** $5/mo floor (Workers Paid) with no $0 tier. Least DNS work of any option *if the domain is already a Cloudflare zone*. In public beta, no SLA found. Best value only past ~20,000–50,000/mo. |
| Email | **Postmark** | **$15.00** | **Not viable at this budget.** 100 free/mo is a smoke test; $15/mo from day one is 60% of the stack budget. Best deliverability posture and simplest DNS (2 records) — consider only if Gmail placement failures would be existential. |
| SMS | **AWS End User Messaging** | **$2.54–$10.17** | **Viable at launch only.** Cheapest verified real route. But: no free tier, a **$1.00/month default spend threshold even in production**, two Service Quotas cases needed before the first real user, and **no two-way SMS for Colombia** (STOP handling must be in-app). |
| SMS | **Twilio** | **$2.96–$11.84** | **Viable at launch only.** Lower friction — no spend gate, two-way supported, start today from Pereira with no registration and no NIT. 14% dearer than AWS. |
| SMS | Twilio Verify | $5.46–$21.84 | **Poor value.** +85% for rate limiting, retries and code storage that Better Auth's OTP plugin already provides. |
| SMS | LabsMobile | ~$10 one-off for ~4,700 msgs | **Unresolved.** ~30× under both licensed routes — likely a grey/transit route. Route quality unverified; unsuitable for sign-in-gating OTP without testing. |
| SMS | Vonage, Bird, Infobip, Sinch, Hablame | — | **Could not price.** All behind login or sales walls. |
| WhatsApp | **Meta Cloud API direct** | **$0.04–$0.16** | **Viable, and the cheapest phone-based channel by ~60×.** No platform fee, no verification needed to launch (250 unique users/24h unverified). Costs: a dedicated SIM, fixed English template text, primary-device-only delivery, and eventual verification needing a registered entity. |
| WhatsApp | Via Twilio BSP | $0.29–$1.16 | Works, but 7.25× the direct cost for no benefit at this scale. |

### The decisive shape of the answer

1. **Email is solved and free.** Any of SES, Brevo free or Resend free covers launch at $0–$0.05.
2. **SMS is the only channel that threatens the budget.** At **500 messages/month it costs $25–$30 —
   the entire stack budget** — and 500/month is roughly 150–250 users signing in twice a month. We
   cross that line well before the product feels successful.
3. **WhatsApp is ~60× cheaper than SMS for the same job in Colombia** ($0.0008 vs $0.0509) and is
   where a mobile-first Pereira audience already lives. It is the only phone-based channel that stays
   affordable past a few hundred users.
4. **The cost of WhatsApp is friction, not money** — a dedicated SIM, unbrandable English template
   text, primary-device-only delivery, and a verification wall that eventually needs a registered
   Colombian entity. None of those block launch.

**For [#14](https://github.com/m0t0r/workforpereira/issues/14):** the cost figures say phone-based
sign-in is affordable **only** if the phone channel is WhatsApp, or if SMS is reserved for rare
high-value actions rather than routine sign-in. Email-primary with WhatsApp as the phone channel is
the only shape that stays under $25/month past a few hundred active users. That is a decision for
#14, not this ticket.

---

## 8. Out-of-scope finding worth surfacing

While verifying Colombian regulatory friction, the SMS and WhatsApp research independently surfaced a
constraint that has **nothing to do with messaging** and is far more consequential:

**Decreto 2852 de 2013**, compiled into **Decreto 1072 de 2015**, regulates *gestión y colocación de
empleo* — job matching itself
([source](https://cancilleria.gov.co/normograma/compilacion/docs/decreto_2852_2013.htm)):

- Art. 18 defines the basic regulated activity as including *registro de oferentes, demandantes y
  vacantes* — **which is what a job marketplace is**.
- Art. 19: *"Solo las personas jurídicas autorizadas podrán prestar los servicios de gestión y
  colocación."* MinTrabajo authorizes **legal persons only** — a solo developer as a *persona natural*
  cannot obtain it. Electronic-only services receive nationwide authorization.
- Art. 20 requires a **compliance surety bond of 100 SMLMV** from a Colombian insurer.
- Arts. 5, 21(d) and 41: services must be **free to the worker** — candidates may never be charged.

**How MinTrabajo treats a platform that merely lists vacancies without preselección or remisión could
not be verified.** This belongs to [#5](https://github.com/m0t0r/workforpereira/issues/5) or a new
ticket, not here — but it constrains the monetization model (charge employers, never candidates) and
warrants Colombian counsel before scaling.

Also noted and **not verified here**: **Ley 1581 de 2012** requires *"autorización previa e
informada"* for storing a phone number at all (Decreto 1377/2013 Art. 7: *"En ningún caso el silencio
podrá asimilarse a una conducta inequívoca"* — no pre-ticked boxes), and international transfer to
Meta or a US email provider must be disclosed (Art. 26). RNBD database registration appears **not** to
apply — Decreto 090 de 2018 limits it to *sociedades* with assets over 100,000 UVT (≈COP 5.24bn at
UVT 2026 = COP 52,374) and states *"serán excluidas las personas naturales"*. All of that is
[#5](https://github.com/m0t0r/workforpereira/issues/5)'s territory.

---

## 9. Verification ledger — what could NOT be verified

| Claim | Status |
| --- | --- |
| Gmail dominance among Colombian consumers | **Unverified premise.** No primary source found; carried from the ticket. |
| AWS SES 3,000-message/12-month free tier still granted today | **Contradiction between two live AWS pages.** Plan on paying $0.16/1,000. |
| Brevo per-1,000 overage pricing, DNS record list, dedicated-IP price | **Could not verify** — calculator is client-side; help centre behind Cloudflare. |
| Whether Brevo's 300/day changed recently | **Could not verify** — no change record reachable. |
| Cloudflare Email Service starting daily quota | **Not published.** |
| Cloudflare shared vs dedicated IP, sending regions, SLA | **Not documented.** |
| Resend's exact DNS record count | **Not stated in docs.** |
| Postmark South American region presence | **Could not verify.** |
| Whether crossing Gmail's 5,000/day once makes you permanently a bulk sender | **Not stated by Google.** |
| Vonage, Bird, Infobip, Sinch, Hablame Colombia SMS rates | **All behind login or sales walls.** |
| Whether Twilio's $0.0592 hides a Colombia carrier surcharge | **No CO carrier fee itemised anywhere** — unverified upside risk. |
| LabsMobile route quality | **Unverified.** ~30× below licensed routes. |
| WOM Colombia being the Avantel rebrand | **Recalled, not verified.** |
| Meta's exact business-verification document list; Colombian document types | **Login-gated, could not verify.** |
| Whether a website on our own domain is mandatory for Meta verification | **Recalled, possibly stale.** |
| Meta billing thresholds and IVA treatment for COP accounts | **Could not verify.** |
| 360dialog / Gupshup / Wati pricing | **Not fetched.** |
| Whether authentication templates are free inside an open customer service window | **Ambiguous in Meta's own docs.** Economically negligible at $0.0008. |
| Whether WhatsApp authentication templates are exempt from the 250/24h limit | **Could not verify.** |
| Twilio WhatsApp ancillary number/sender fees | **Could not verify.** |
| Cloud API free test number messaging 5 recipients | **Recalled from a snippet, not verified on a live page.** |
| "Resolución CRC 8308 de 2026" cited by a vendor blog | **Does not appear on crcom.gov.co — do not rely on it.** |
| MinTrabajo's treatment of a listings-only job platform | **Could not verify.** |
| Ley 1581 / RNBD obligations | **Not researched here** — see [#5](https://github.com/m0t0r/workforpereira/issues/5). |
