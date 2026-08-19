# Fly.io remains the app host

The Next.js app runs as a **long-lived Node server on Fly.io in `iad`**, staging and production, in
front of the PlanetScale Postgres database decided in ADR-0004. Cloudflare Workers via
`@opennextjs/cloudflare` was evaluated in full and **rejected**. The research behind this is in
`docs/research/app-host.md` (issue #25); prices and version facts were observed 2026-08-15/16.

This ADR records a **reopened given**. Fly.io was already the map's assumption; #25 put it under
review because consolidating onto Cloudflare looked attractive on three specific grounds. All three
were tested against primary sources and none survived, so the decision is "no change" — but the
reasons are worth recording, because the same three arguments will resurface.

## Why

**The three arguments that prompted the review all failed.**

_Fewer processors means fewer DPAs_ — oversold. In the configuration we would actually ship,
consolidating removes **exactly one** agreement, Fly.io's, worth one login and one countersignature.
Two facts cut the other way: Cloudflare's self-serve DPA is incorporated by a clause triggered on
**European data subjects / CCPA**, which our Colombian-only users may never trip, where AWS's
triggers unconditionally; and Cloudflare names **Google and Oracle as sub-processors of the Developer
Platform itself**, so moving inherits them rather than shedding them. "Colombia" appears zero times in
either DPA — neither host yields a Ley 1581 `2.2.2.25.5.2` _contrato de transmisión_, so the
compliance gate is the same shape on both sides.

_A Bogotá POP_ — a red herring. Cloudflare's free CDN caches `/_next/static/*` in front of a Fly
origin identically; HTML is not cached by default either way; and Cloudflare's own Smart Placement
documentation says a Worker talking repeatedly to a Virginia database belongs in Virginia. The
argument evaporates once the database is fixed at single-region `us-east-1`.

_Flat, predictable pricing_ — splits, and does not repeat ADR-0004's reasoning. The gap is
**$1.50–$4.50/month**, not a category difference. Fly's bill is `machines × seconds + GB` and a code
bug cannot inflate it; Cloudflare bills seven metered products including CPU-ms, where a slow React
render costs money rather than latency. But Fly ships **no billing alerts at all** and Cloudflare
ships a default $10 alert. In ADR-0004 the flat option was also the predictable one; here it is not,
so this argument decides nothing on its own.

**What decided it was the runtime, the one clearly asymmetric area — and specifically the pace of the
adapter, not any single missing feature.** The latest adapter predates our current `next` minor,
three version-specific bugs were open and under a week old at the time of writing — one an unbounded
RSC prefetch loop that is a billing hazard on a metered platform — and historically a Next **major**
has taken 3–6 months to support, with claimed support once retroactively withdrawn. **For a solo
developer, moving means inheriting a second upgrade gate on top of Next.js's own**, on a stack whose
own maintainers describe parts of it as unsupported.

Alongside it, **Better Auth is community territory on `workerd`**: three lines of documentation on
another framework's integration page, the documented module-scope `auth` singleton in direct conflict
with OpenNext's mandatory per-request database client, the Argon2id escape hatch closed, `scrypt`
running synchronously and billed as CPU on every sign-in including failed ones, and an open,
production-reproduced bug in which a client abort permanently poisons an isolate and takes that user
fully offline until it recycles. None of these has an equivalent on a long-lived Node server.

**A caveat on the middleware finding, recorded deliberately.** Next 16 renamed `middleware` → `proxy`
and made it Node-runtime-only with no edge opt-out; `@opennextjs/cloudflare` supports edge middleware
only; and the fix was closed unmerged with maintainers stating they do not intend to support it. That
much is verified. **But it is weaker than it first appears and should not be quoted as the reason for
this ADR.** Next's own documentation calls Proxy _"a last resort"_, recommends _"users avoid relying
on Middleware unless no other options exist"_, and states _"Always verify authentication and
authorization inside each Server Function rather than relying on Proxy alone."_ Better Auth agrees:
`getSessionCookie()` is optimistic only and never a security boundary. For this app the practical
loss is **an optimistic cookie-check redirect** — worth having, not architectural. i18n routing does
not apply (Spanish-only), and headers and redirects belong in `next.config` or the CDN. It falsifies
`better-auth-audit.md` §8, which assumed Node middleware could do full DB validation, but that was
always a convenience rather than a requirement.

**And the areas expected to justify the move came back neutral.** The database path is a wash once a
placement hint pins the Worker to `aws:us-east-1`. Local development, testing and observability are
host-independent. Object storage and transactional email are reachable over ordinary APIs from any
host and score for neither side.

## Accepted risks

- **One more processor agreement than the alternative.** Fly.io's DPA must be countersigned at
  `fly.io/documents/`, and Fly's **30 sub-processors** stay in the Ley 1581 §6.3 register — including
  five third-party metal providers, two LLM vendors processing support and log content, and two
  signup-risk-scoring data brokers. This is real ongoing register maintenance, and it was the
  strongest argument for moving.
- **$1.50–$4.50/month more**, and staging is a second billed Machine rather than free. Acceptable
  inside the ~$15 remaining after ADR-0004.
- **No billing alerts.** Fly's own documentation says _"We don't support billing alerts (yet), so
  budget accordingly."_ The only tool is checking the month-to-date figure manually, which is a
  standing operational chore for a solo developer.
- **Fly's DPA text was never read** — it is login-gated, and `fly.io/legal/dpa/` 404s. Whether it
  contains SCCs, and its version, remain unverified. Verify on signing.
- **The cost comparison assumes a 1 GB machine, unverified.** At 256 MB Fly is cheaper than
  Cloudflare and at 2 GB clearly worse, so the margin is sensitive to a number we have not measured.
- **No `opennextjs-cloudflare build` of this repo was ever run.** The rejection rests on documentary
  research — issue trackers, vendor docs, maintainer statements — not on a failed build. The evidence
  is strong and consistent, but it is not empirical.
- **Whether the deprecated `middleware.ts` convention still works on Next 16 under the adapter's
  edge-middleware support was never verified.** Next's docs mark it deprecated and ship a codemod but
  do not say it is removed. If it works, even the optimistic redirect survives on Workers and the
  middleware finding weakens further. This was assumed, not tested.

## Consequence

- **#15, #17 and #18 unblock** with the shapes already assumed. Two of them are host-independent
  anyway: `docker compose` stays for local Postgres (nothing simulates Postgres locally on either
  host), and PGlite integration tests run in Node regardless.
- **`drizzle-kit` migrations run on a CI runner** against the direct 5432 connection string. This was
  the same answer on both hosts, so it is settled independently of this ADR.
- **Only one Vitest configuration is needed**, because production is Node. The Cloudflare path would
  have added a second runner project on an alpha Miniflare.
- **Put Cloudflare's free CDN in front of the Fly origin.** This is the one genuinely good idea the
  review surfaced, it is free, and it is available precisely because it does not require moving.
- **Email stays on AWS SES** (#6, unchanged). Cloudflare Email Sending is still public beta with
  disclaimed liability and an unpublished daily quota, and is reachable over REST from Fly anyway.

  > **Superseded by ADR-0035 — email leaves through Resend.** This line is the whole of the trail by
  > which SES became the answer, and it was written while the live question was Cloudflare Workers
  > versus Fly.io: #6 was research that decided nothing, and no session ever argued the provider on
  > its own terms. ADR-0035 is that session. **What this bullet says about Cloudflare Email Sending
  > is untouched** — still public beta, still reachable over REST from Fly, still unchosen — and the
  > host decision this ADR actually made is unaffected either way, because outbound mail is REST
  > from Fly to whoever sends it.

- **Object storage is chosen independently of the host** (#11). Note that Fly's object storage is
  Tigris, operated by a separate company, so using it adds a second processor — and that Tigris names
  Fly.io as its own sub-processor.
- **Revisit only if** `@opennextjs/cloudflare` ships supported Node middleware, or the budget
  tightens enough that $1.50–$4.50/month decides something. Neither is true today.
