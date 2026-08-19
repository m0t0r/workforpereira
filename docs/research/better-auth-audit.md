# Better Auth capability audit

**Ticket:** [#3](https://github.com/m0t0r/workforpereira/issues/3) (research) · **Map:** [#1](https://github.com/m0t0r/workforpereira/issues/1) · **Blocks:** [#14](https://github.com/m0t0r/workforpereira/issues/14)

**Status: facts only.** This document records what Better Auth does and does not do. It makes no
decisions. Decisions hang off it in #14 (candidate sign-in), #6 (messaging providers), #8
(verification), #13 (safety) and the persistence tickets.

---

## 0. Versions this audit applies to

Everything below was verified on **2026-08-15** against these exact versions. Better Auth ships
weekly patch releases, so re-verify anything load-bearing before implementation.

**Re-verified against 1.7.1 on 2026-08-19 — read §0.1 first.** Sections 1–12 describe 1.6.29 and are
left standing as dated evidence; §0.1 carries the delta and names the two places it retracts.

| Package                        | Version                 | License | Notes                                              |
| ------------------------------ | ----------------------- | ------- | -------------------------------------------------- |
| `better-auth`                  | **1.6.29** (2026-08-14) | MIT     | current `latest`; `1.7.0-rc.6` is the next line    |
| `@better-auth/core`            | 1.6.29                  | MIT     | schema/type definitions live here                  |
| `@better-auth/drizzle-adapter` | 1.6.29                  | MIT     | **separate package** — see §1                      |
| `auth` (the CLI)               | 1.6.29                  | MIT     | **the CLI is the `auth` package now** — see §1.2   |
| `@better-auth/i18n`            | 1.6.29                  | MIT     | separate package                                   |
| `@better-auth/utils`           | 0.4.2                   | MIT     | pinned exactly; supplies the scrypt implementation |

`better-auth@1.6.29` declares optional peer dependencies `next: ^14.0.0 || ^15.0.0 || ^16.0.0`,
`react: ^18 || ^19`, `drizzle-orm: ^0.45.2`, `drizzle-kit: >=0.31.4`
(`npm view better-auth peerDependencies`). Our stack — Next.js 16.3.0, React 19.2, current
`drizzle-orm` 0.45.2 / `drizzle-kit` 0.31.10 — is inside every range with no slack on `drizzle-orm`,
which is pinned to the caret of the current release.

**Two naming traps.** Both the loaded skill docs and most of the internet are behind here:

1. The Drizzle adapter is now published as **`@better-auth/drizzle-adapter`**, and that is what the
   docs tell you to install ([adapters/drizzle](https://www.better-auth.com/docs/adapters/drizzle)).
   The old path still works — `better-auth@1.6.29` depends on the package and
   `dist/adapters/drizzle-adapter/index.mjs` is literally
   `export * from "@better-auth/drizzle-adapter";` — but prefer the documented one.
2. The CLI is **`npx auth@latest`**, not `npx @better-auth/cli@latest`
   ([concepts/cli](https://www.better-auth.com/docs/concepts/cli)). `@better-auth/cli` still exists
   on npm but its `latest` tag is frozen at **1.4.21 (2026-03-01)** and it hard-pins
   `better-auth: 1.4.21` — five minor versions behind. Running the old name would generate a schema
   from a different library version than the one we run at runtime. The `auth` package is versioned in
   lockstep (1.6.29) and depends on `better-auth: 1.6.29`. **Caveat:** the generator behaviour
   recorded in §3.2 was observed by actually running `@better-auth/cli@1.4.21`, because that is what
   was reachable; the _documented_ behaviour is identical, but the exact default output path should be
   re-confirmed with `auth@latest` before we bake it into a script.

Sources are cited inline. Where the docs and the shipped source disagree, the shipped source is
treated as authoritative and the disagreement is called out.

## 0.1 Re-verified against 1.7.1 (2026-08-19)

**Better Auth 1.7 shipped** ([blog](https://better-auth.com/blog/1-7),
[release notes](https://github.com/better-auth/better-auth/releases/tag/v1.7.0)) and `latest` is now
**1.7.1** for `better-auth`, `@better-auth/core`, `@better-auth/drizzle-adapter`, `auth` and
`@better-auth/i18n`. Everything in this section was read out of the published 1.7.1 tarballs unless a
docs page is cited, on 2026-08-19.

**Most of the release does not reach us.** Nearly every breaking change in the release notes lands on
a surface we do not run — SCIM, MCP, the OAuth/OIDC provider, DPoP, the RFC 8628 device grant, SAML,
passkeys, generic OAuth. **One reaches us**: the twoFactor enrolment response shape, which ADR-0031
depends on. Nothing in sections 1–12 below is retracted by 1.7 except where a numbered item here says
so.

**MCP is refused, not merely unbuilt** (decided 2026-08-19). `@better-auth/mcp` is not "MCP support"
— it makes Encuentra an **OAuth 2.1 authorization server and protected resource** so third-party MCP
clients can hold a token and call us as a signed-in Person. Three reasons it does not happen, in the
order that decides it. It is a supported, documented **enumeration interface** over exactly the data
ADR-0011 and ADR-0014 shaped into a sample rather than an index, and that ADR-0032 spends a Managed
Challenge and a daily quota making expensive to sweep. It is a **_transmisión_ to an open set of
_encargados_** — ADR-0028 already refuses to let personal data reach trigger.dev over the
`2.2.2.25.5.2` _contrato_ and its generative-AI subprocessors, and dynamic client registration is
worse in one specific way, because the receiving party is chosen at runtime and the _aviso de
privacidad_ cannot name a set that is not closed. And it is not a plugin line: it requires `jwt()`,
pulls `@better-auth/oauth-provider`, adds five tables tied to a Person (`oauthClient`,
`oauthAccessToken`, `oauthRefreshToken`, `oauthConsent`, `oauthClientAssertion`) each owing an
ADR-0034 lifecycle line and an ADR-0021 erasure path, plus `/oauth2/*`, `/jwks`, a consent page, and a
**second authorisation model** beside the per-Server-Function session checks ADR-0005 requires.

The reopening condition is narrow: **a named partner needing programmatic access**, whose shape is a
contracted _encargado_ with a scoped key that the _aviso_ can enumerate — never an authorization
server open to clients we never approved. Operator tooling is not a reason either; ADR-0031's one
internal surface runs on the operator's session and OAuth adds nothing to it.

Peer ranges still fit with no action: `drizzle-orm: ^0.45.2 || >=1.0.0-rc.1 <2.0.0` and
`drizzle-kit: >=0.31.4 || >=1.0.0-beta.1` against our 0.45.2 / 0.31.10, and `next` still lists
`^16.0.0`.

**What actually changes for us, in order of consequence:**

1. **`@better-auth/i18n` ships locales now, and Spanish is one of them.** **This retracts §10 and the
   §2.1 row.** `dist/locales` exports 22 dictionaries — `ar`, `bn`, `de`, `en`, `es`, `fa`,
   `fr`, `hi`, `id`, `it`, `ja`, `ko`, `nl`, `pl`, `pt`, `ru`, `sv`, `th`, `tr`, `uk`, `vi`, `zh` —
   and `locales.es` is **34 keys covering the core `$ERROR_CODES` only** — no
   plugin codes, so `admin` and `twoFactor` strings are still ours. It still translates **error
   messages only**; every email body remains ours. The register is **`tú`** (_"Usa otro correo
   electrónico"_, _"Vuelve a autenticarte"_), which is PRODUCT.md's rule, so the dictionary is a base
   to review against the voice rather than a translation job to start from zero. Import is
   `import { i18n, locales } from "@better-auth/i18n"`, spreading `locales.es` to override individual
   messages.

2. **`storage: "database"` rate limiting is atomic in 1.7, and it prunes itself.** **This amends §5.6
   and ADR-0032.** The database backend now consumes through the adapter's `incrementOne` with the
   guard in the `where` clause — a compare-and-set on `(key, lastRequest, count)` that retries on
   loss (`dist/api/rate-limiter/index.mjs`), rather than read-then-write. `@better-auth/drizzle-adapter@1.7.1`
   implements `incrementOne`, so this holds on our adapter. The same file adds `deleteExpiredRows`,
   which deletes every row whose `lastRequest` is older than the longest configured window — so
   **Better Auth now cleans the `rateLimit` table**, which it did not at 1.6.29. Two qualifications:
   the sweep runs **inside `consume`**, only on the branch where some key rolls over its window, so a
   table nobody is hitting is a table nobody is pruning; and the bound is a per-process variable
   seeded from `Math.max` of the configured windows. The table's columns are unchanged (`id`, `key`,
   `count`, `lastRequest`).

3. **The rate-limit `window` default is still 10 s in the shipped source, and the docs still say 60.**
   §12 gap 3 is **re-verified, not resolved**: `dist/context/create-context.mjs` reads
   `window: options.rateLimit?.window || 10`, while
   [concepts/rate-limit](https://better-auth.com/docs/concepts/rate-limit) still states 60. Setting it
   explicitly remains the only honest option.

4. **`user.validateUserInfo` is a new admission gate, and it is a better fit than a database hook for
   refusing an identity.** Configured at `user.validateUserInfo`, it is called before `create-user`,
   `link-account` and (for OAuth/SSO) a returning `sign-in`, across **every** method. It receives
   `{ user, source }` — where `source.method` is one of `"oauth" | "sso-oidc" | "sso-saml" |
"email-password" | "magic-link" | "email-otp" | "anonymous" | "siwe" | "phone-number" | "admin"`
   plus the raw unmapped provider profile — and the endpoint context. Return nothing to allow,
   `{ error, errorDescription }` to reject; browser flows redirect to the error URL, programmatic
   flows get a `403`. It **fails closed**: a hook that throws rejects, and a missing endpoint context
   rejects rather than allowing (`dist/utils/validate-user-info.mjs`). It runs **before**
   `databaseHooks.user.create.before` (`dist/db/internal-adapter.mjs`, `createUser`), so the two
   compose. Two things it does **not** do: it does not re-validate a returning non-provider sign-in,
   and the option is marked in-source for a rename to `validateUser` in a later release.

5. **`accountLinking.requireLocalEmailVerified` defaults to `true` and is already deprecated — the
   gate becomes unconditional next minor.** Implicit linking will only use an IdP's `email_verified`
   claim as ownership proof when the **existing local row** is `emailVerified: true`. Consequence for
   us: a person who signs up with a password and never verifies, then signs in with Google on the
   same address, is **not** linked — `users.email` is unique, so they are stuck until they verify.
   `accountLinking.disableImplicitLinking` (default `false`) is the switch that turns implicit linking
   off entirely.

6. **Social providers gained a per-provider `requireEmailVerification`** (default `false`). When the
   provider reports the email unverified the user and account are still created, but **no session is
   issued** — the callback redirects with `?error=email_not_verified`, id-token sign-in returns `403`
   `EMAIL_NOT_VERIFIED` — and a verification mail goes out per `emailVerification.sendOnSignUp` /
   `sendOnSignIn`. It checks the **local** verification state, not the provider's claim on each
   request. Its own docs warn that several providers always report the email unverified, which would
   block every sign-in for that provider.

7. **Account identity is now the `(issuer, accountId)` tuple and `account.issuer` is a required
   column.** Providers without an issuer of their own get a synthetic one. This is a schema fact for
   the generated Better Auth file (§3) and costs us nothing, because we have generated nothing yet.

8. **`advanced.trustedProxyHeaders` is new, and the base URL is resolved from the `Host` header by
   default in dynamic deployments.** `x-forwarded-host` and `x-forwarded-proto` are honoured **only**
   when it is `true`. An explicit `baseURL` still wins, which is what we will set.
   `advanced.ipAddress.ipAddressHeaders` is unchanged and remains what ADR-0032 relies on.

9. **`advanced.database.joins` left experimental** (default `false`). Adapters that support native
   joins use them; others fall back to separate queries. It is the one option that speaks to
   ADR-0032's _"a database read on every authenticated request"_ — it fetches related rows in one
   query rather than several, and does not remove the read.

10. **`hydrateSession`** hands the browser the session the server already loaded, removing a
    client-side round trip on server-rendered pages. It changes no server behaviour.

11. **`npx auth create-admin` exists**, and it is **not** a back door: it calls the admin plugin's
    `auth.api.createUser`, so it runs through `validateUserInfo` (with `source.method: "admin"`) and
    `databaseHooks.user.create.before` like any other creation. Flags: `--email`, `--password`,
    `--name`, `--role` (default `admin`), `--data <json>`, `--no-email-verified`, `--force`, `--yes`.
    It refuses to run without the `admin()` plugin.

12. **`enableTwoFactor` now returns a discriminated `method` field** (`"otp"` or `"totp"`), and the
    response must be narrowed on it before reading `totpURI` and `backupCodes`
    (`dist/plugins/two-factor/index.mjs`). This is the one breaking change in the release that reaches
    a surface we run: ADR-0031 requires TOTP for the `operator` role.

13. **Drizzle: a `relations-v2` entry point** in `@better-auth/drizzle-adapter@1.7.1`, so generated
    Better Auth relations can be combined with our own, and **PostgreSQL schema namespaces** are
    supported by the generator.

---

## 1. Headline findings

1. **Drizzle-kit can stay the sole owner of migrations.** `auth generate` emits a _Drizzle schema
   TypeScript file_ and never touches the database; `auth migrate` — the command that does touch the
   database — **only supports the built-in Kysely adapter** and refuses other adapters with a
   Drizzle-specific error. So the loop is `auth generate` → commit the generated schema file →
   `drizzle-kit generate` → `drizzle-kit migrate`. Better Auth generates _declarations_; drizzle-kit
   owns every DDL statement. There is no fight to have. The one rule: **`generate` overwrites its
   output file wholesale**, so that file stays generator-owned and our domain tables live elsewhere.
   ([cli](https://www.better-auth.com/docs/concepts/cli),
   [adapters/drizzle](https://www.better-auth.com/docs/adapters/drizzle); overwrite behaviour verified
   by running the generator)
2. **`user.email` is `NOT NULL` and `UNIQUE`, and `user.name` is `NOT NULL`. There is no
   phone-only user.** The phoneNumber plugin works around this with a mandatory
   `signUpOnVerification.getTempEmail(phoneNumber)` callback that fabricates a synthetic,
   undeliverable address. This is the single most consequential fact for #14.
3. **The organization plugin fits our shape, but it is not small.** It models exactly
   "user belongs to org with a role" (`member` is a plain join row, roles are free-form strings, a
   user may belong to zero orgs). It costs 3 tables + 1 non-optional session column and **22 HTTP
   routes** minimum. There is no supported way to use a subset.
4. **Platform admin and company role are two independent systems.** The admin plugin's `user.role`
   and the organization plugin's `member.role` share no storage, no access-control instance and no
   namespace. "candidate / company member / admin" maps onto them cleanly, but they must be wired
   together by us.
5. **Better Auth never sends a message.** Every delivery callback (`sendVerificationEmail`,
   `sendResetPassword`, `sendOTP`, `sendInvitationEmail`, `sendMagicLink`) is bring-your-own
   transport. Grepping `better-auth@1.6.29/dist` for `twilio|whatsapp|vonage|messagebird|nexmo`
   returns **zero matches**. A WhatsApp path is therefore a pure integration question, not a Better
   Auth question — which is good news for #6 and #14.
6. **The library is MIT and free with no gated features.** The paid product is "Better Auth
   Infrastructure" (managed dashboard/audit/SMS/SSO), Pro at **$20/month + usage**, which would eat
   80 % of the $25/month ceiling on its own. Nothing in this audit requires it.
7. **There is no account lockout for password sign-in.** The only brute-force defence is the IP-keyed
   rate limiter, which defaults to in-memory storage (per-instance) and is **off in development**.
   Lockout exists only inside the twoFactor plugin, for 2FA codes.
8. **Cookie cache trades revocation latency for DB reads, and the worst case is worse than
   documented.** Default `maxAge` 300 s; with `refreshCache: true` a revoked-but-actively-used
   session can be honoured for up to `session.expiresIn` (7 days) with zero database checks.

---

## 2. Capability matrix

Legend: **Built in** = core, no plugin · **Plugin** = official first-party plugin, same MIT package ·
**We build** = Better Auth gives a callback/hook and nothing else · **Not available** = would have to
be built outside Better Auth entirely.

### 2.1 Identity and credentials

| Capability                                | Verdict             | Detail                                                                                                                   |
| ----------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Email + password sign-up/sign-in          | **Built in**        | `emailAndPassword.enabled` (default `false`). §5                                                                         |
| Password hashing (scrypt)                 | **Built in**        | `N=16384, r=16, p=1, dkLen=64`, per-password 16-byte salt, stored `"<saltHex>:<keyHex>"`. §5.2                           |
| Swap to Argon2id                          | **Built in** (hook) | `emailAndPassword.password.hash` / `.verify`. No migration helper — swapping on a populated DB locks existing users out. |
| Password strength / policy beyond length  | **We build**        | Only `minPasswordLength` (8) and `maxPasswordLength` (128) exist.                                                        |
| Breached-password rejection               | **Plugin**          | `haveIBeenPwned` — k-anonymity call to HIBP on every password set. Free API for range queries.                           |
| Email verification                        | **Built in**        | Stateless HS256 JWT, `expiresIn` 3600 s, **not stored, not single-use**. §5.3                                            |
| Password reset                            | **Built in**        | Stateful token in `verification`, 3600 s, **single-use**. §5.4                                                           |
| Sign-in with username                     | **Plugin**          | `username` — still requires an email at sign-up.                                                                         |
| Magic link                                | **Plugin**          | `magicLink`. Token default `storeToken: "plain"` in source (docs say hashed).                                            |
| Email OTP (passwordless, code by email)   | **Plugin**          | `emailOtp`. Genuinely passwordless — creates user + session in one call. Has `storeOTP` hardening.                       |
| Phone number + SMS OTP                    | **Plugin**          | `phoneNumber`. **Requires a synthetic email.** OTP stored **plaintext**, no `storeOTP` option. §7                        |
| Passkeys / WebAuthn                       | **Plugin**          | `passkey`. Not audited in depth.                                                                                         |
| Social / OAuth providers                  | **Built in**        | `socialProviders`. Not audited — no requirement yet.                                                                     |
| TOTP 2FA + backup codes + trusted devices | **Plugin**          | `twoFactor`. Secrets XChaCha20-Poly1305-encrypted under `BETTER_AUTH_SECRET`. §7.3                                       |
| OTP as a _second_ factor over any channel | **Plugin**          | `twoFactor.otpOptions.sendOTP` — also BYO transport.                                                                     |
| Account lockout after failed passwords    | **We build**        | Does not exist for `/sign-in/email`. §5.6                                                                                |
| Captcha on auth endpoints                 | **Plugin**          | `captcha` — reCAPTCHA, **Cloudflare Turnstile**, hCaptcha, CaptchaFox. Turnstile is free.                                |

### 2.2 Sessions

| Capability                               | Verdict                  | Detail                                                                                        |
| ---------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------- |
| DB-backed sessions                       | **Built in**             | `session` table; token `generateId(32)` ≈190 bits. `expiresIn` 7 d, `updateAge` 1 d.          |
| Cookie cache (skip the DB read)          | **Built in**             | `session.cookieCache`, strategies `compact`/`jwt`/`jwe`. Off by default. §6                   |
| Revoke one / all / other sessions        | **Built in**             | `/revoke-session`, `/revoke-sessions`, `/revoke-other-sessions`, all behind a freshness gate. |
| Immediate revocation across devices      | **Caveat**               | Not guaranteed while cookie cache is on. §6                                                   |
| Session freshness for sensitive ops      | **Built in**             | `session.freshAge`, default 1 d → 403 `SESSION_NOT_FRESH`.                                    |
| Multi-session (several accounts at once) | **Plugin**               | `multiSession`. Not needed.                                                                   |
| Redis / KV session store                 | **Built in** (interface) | `secondaryStorage`. **Costs money we do not have** — see §9.                                  |

### 2.3 Companies, membership and roles

| Capability                                              | Verdict                | Detail                                                                                        |
| ------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------- |
| "User belongs to company with a role"                   | **Plugin**             | `organization` — `member(organizationId, userId, role)`. §3                                   |
| User in zero companies (our candidates)                 | **Built in behaviour** | Fully supported; `session.activeOrganizationId` is nullable and starts `null`.                |
| Multiple roles per member                               | **Plugin**             | Stored comma-separated in one `role` string column.                                           |
| Declarative permissions (RBAC)                          | **Plugin**             | `createAccessControl` + `roles`. Statements are ours to define.                               |
| Runtime-created custom roles                            | **Plugin** (opt-in)    | `dynamicAccessControl.enabled` → `organizationRole` table + 5 more routes.                    |
| Invitations with expiry + email                         | **Plugin**             | Lifecycle built in; **the URL, the email body and the sign-up-then-accept routing are ours.** |
| Platform admin role, ban, impersonate                   | **Plugin**             | `admin` — 5 additive columns, 15 routes. §4                                                   |
| Authorization over _our_ resources (jobs, applications) | **We build**           | The plugins guard their own endpoints only.                                                   |
| Unique `(organizationId, userId)` constraint            | **We build**           | The plugin declares indexes only — no unique constraint. §3.1                                 |

### 2.4 Persistence and operations

| Capability                     | Verdict                    | Detail                                                                                                                                        |
| ------------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Drizzle + PostgreSQL adapter   | **Built in**               | `@better-auth/drizzle-adapter`. §1                                                                                                            |
| Generate a Drizzle schema file | **Built in** (CLI)         | `npx auth@latest generate --output <path>`.                                                                                                   |
| Run migrations                 | **We build** (drizzle-kit) | `auth migrate` refuses non-Kysely adapters. This is the answer we wanted.                                                                     |
| Indexes                        | **Mostly built in**        | The generator emits indexes for fields the schema marks `index`/`unique`. Verify the generated file against the recommended list. §2.5        |
| FK `ON DELETE` behaviour       | **We build**               | Plugins declare `references` with no `onDelete`. §8                                                                                           |
| Custom columns on `user`       | **Built in**               | `user.additionalFields` with `type`/`required`/`defaultValue`/`input`/`returned`.                                                             |
| Rate limiting                  | **Built in**               | 3 storage backends; `"database"` needs a `rateLimit` table migration. §5.6                                                                    |
| Telemetry                      | **Built in, off**          | `telemetry.enabled` defaults **`false`**; `BETTER_AUTH_TELEMETRY=1` opts in. Nothing leaves the box unless we ask. Relevant to #5 (Ley 1581). |
| Spanish error messages         | **Plugin**                 | `@better-auth/i18n`. Translates error messages only, not emails. §10 — **and at 1.7.1 a Spanish dictionary ships, see §0.1(1)**               |
| OpenAPI spec of auth routes    | **Plugin**                 | `openAPI`.                                                                                                                                    |
| Audit log of auth events       | **Not available (free)**   | Only in the paid Infrastructure product, or built by us on `databaseHooks` / endpoint hooks.                                                  |

### 2.5 Recommended indexes

[guides/optimizing-for-performance](https://www.better-auth.com/docs/guides/optimizing-for-performance)
recommends these. In practice the generator already emits most of them, because the schema
definitions carry `index: true` / `unique: true` — `session_userId_idx`, `account_userId_idx`,
`verification_identifier_idx`, `user.email` unique, `organization.slug` unique, and the org plugin's
`member.organizationId` / `member.userId` / `invitation.email` / `invitation.organizationId`. None of
this is on the Core Schema docs page, so the honest instruction is: **diff the generated file against
this list rather than assuming either way.**

| Table              | Columns                    |
| ------------------ | -------------------------- |
| `user`             | `email`                    |
| `account`          | `userId`                   |
| `session`          | `userId`, `token`          |
| `verification`     | `identifier`               |
| `invitation` (org) | `email`, `organizationId`  |
| `member` (org)     | `userId`, `organizationId` |
| `organization`     | `slug`                     |
| `twoFactor`        | `secret`                   |

---

## 3. Drizzle over PostgreSQL — schema ownership

### 3.1 The adapter

```ts
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "./database.ts";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
});
```

`DrizzleAdapterConfig` in 1.6.29 has exactly six fields
(`@better-auth/drizzle-adapter/dist/index.d.mts`):

| Option        | Type                          | Default      | Documented on the Drizzle page? |
| ------------- | ----------------------------- | ------------ | ------------------------------- |
| `provider`    | `"pg" \| "mysql" \| "sqlite"` | **required** | yes                             |
| `schema`      | `Record<string, any>`         | optional     | yes                             |
| `usePlural`   | `boolean`                     | `false`      | yes                             |
| `camelCase`   | `boolean`                     | `false`      | **no**                          |
| `debugLogs`   | `DBAdapterDebugLogOption`     | `false`      | **no**                          |
| `transaction` | `boolean`                     | `false`      | **no**                          |

- **`schema` is optional.** The adapter falls back to Drizzle's internal
  `db._.fullSchema` (`const schema = config.schema || db._.fullSchema`), so building the client as
  `drizzle(client, { schema })` is enough. If a model is missing it throws
  `The model "<model>" was not found in the schema object. Please pass the schema directly to the
adapter options.` The fallback is undocumented and depends on a Drizzle internal.
- Lookup is by the **export key of the schema object**, not the SQL table name; column matching is by
  the **Drizzle property key**, not the SQL column name.
- `camelCase` is **never read at runtime** — it only tells the CLI generator whether to snake_case the
  emitted SQL identifiers.
- `transaction: false` (the default) runs operations sequentially rather than in `db.transaction`.
- `supportsUUIDs`, `supportsJSON` and `supportsArrays` are `true` **only for `provider: "pg"`**.
- `experimental: { joins: true }` (an auth-level, not adapter-level, option) uses Drizzle `relations()`
  instead of separate queries; the relations must be passed through the adapter's `schema` object, and
  multi-FK cases need matching `relationName` on both sides.

Better Auth addresses tables by **adapter model name**, never by the physical table name. Two ways to
reconcile an existing table:

```ts
// map at the adapter
drizzleAdapter(db, { provider: "pg", schema: { ...schema, user: schema.users } });
// or rename the model
betterAuth({ user: { modelName: "users", fields: { email: "email_address" } } });
```

Note the round trip for Drizzle specifically: `user.fields` maps to the Drizzle _property_ key, and
the CLI will then snake_case that again when emitting the column name unless `camelCase: true`.

### 3.2 The migration story (the ticket's critical question)

| Command                    | What it does                                                                                                                                     | Drizzle?                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `npx auth@latest generate` | Writes a schema **file** — `schema.ts` for Drizzle, `schema.prisma` for Prisma, `schema.sql` for Kysely. Flags: `--output`, `--config`, `--yes`. | Yes                                                                                                                              |
| `npx auth@latest migrate`  | Applies schema **directly to the database**.                                                                                                     | **No — built-in Kysely adapter only.** For any other adapter the docs say to "apply the schema using your ORM's migration tool." |
| `npx auth@latest secret`   | Generates `BETTER_AUTH_SECRET`.                                                                                                                  | n/a                                                                                                                              |
| `npx auth@latest init`     | Scaffolds. Next.js + SQLite only today.                                                                                                          | n/a                                                                                                                              |

The Kysely-only restriction is stated in three separate places, and the CLI enforces it with a
Drizzle-specific hard failure:

> _"The migrate command applies the Better Auth schema directly to your database. This is available if
> you're using the built-in Kysely adapter. For other adapters, you'll need to apply the schema using
> your ORM's migration tool."_ — [concepts/cli](https://www.better-auth.com/docs/concepts/cli)

> _"This is only supported for the built-in Kysely adapter. For other adapters, you can use the
> `generate` command to create the schema and handle the migration through your ORM."_ —
> [concepts/database](https://www.better-auth.com/docs/concepts/database)

> _"`getMigrations` only works with the built-in Kysely adapter… It does **not** work with Prisma or
> Drizzle ORM adapters."_ — same page, programmatic migrations

So the working loop is:

```
npx auth@latest generate --output packages/db/src/schema/auth.ts   # declarations only
pnpm drizzle-kit generate                                          # SQL migration, reviewed in PR
pnpm drizzle-kit migrate                                           # applied
```

**Verified by running it.** The generator reads only `getAuthTables(options)` plus the adapter's own
options and **opens no database connection at all** — it generates successfully against
`drizzleAdapter({} as any, { provider: "pg" })`. Better Auth never issues DDL for us. drizzle-kit
remains the single source of migration truth and every schema change lands as a reviewable SQL file.
Nothing here is a workaround; the docs prescribe it. The manual path is blessed too: _"If you prefer
adding tables manually, you can do that as well."_

Three operational facts that only show up when you run it:

- **The default output path is `./auth-schema.ts`**, not `schema.ts`. The CLI page says `schema.ts`
  "in your project root" — that is wrong for 1.4.21. Always pass `--output` explicitly and the point
  is moot.
- **`generate` is a full-file overwrite for Drizzle, never a merge.** The generator returns
  `overwrite: existsSync(filePath)` and does a whole-file `fs.writeFile`; an append branch exists but
  is only reachable for the Prisma and Kysely generators. Interactively it prompts _"The file
  ./auth-schema.ts already exists. Do you want to overwrite the schema to the file?"_; `--yes` accepts
  silently. A second run prints `🚀 Schema was overwritten successfully!`. **Consequence: the
  generated file must stay generator-owned. Our domain tables go in a separate file, and drizzle-kit
  diffs both.**
- The CLI publishes telemetry on `generate`/`migrate` unless disabled (`telemetry` option /
  `BETTER_AUTH_TELEMETRY=0`).

Better Auth will not tell us at build time if a hand-written Drizzle table drifts from what a plugin
declares; the mismatch surfaces at runtime.

### 3.2.1 What the generator actually emits

Real output for `provider: "pg"` with two `user.additionalFields` (`role` as an enum, `lang`):

```ts
import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  role: text("role", { enum: ["user", "admin"] }).default("user"),
  lang: text("lang").default("en"),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);
```

Three things worth pulling out, none of which appear in the docs:

1. **Indexes _are_ generated** — `session_userId_idx`, `account_userId_idx`,
   `verification_identifier_idx` — even though the Core Schema docs page shows no indexes at all.
2. **`session.updated_at` and `account.updated_at` are `NOT NULL` with no database default.** Better
   Auth always supplies `updatedAt` on insert, so this only bites hand-written INSERTs, seeds and test
   fixtures.
3. **Columns are snake_case while the Drizzle keys stay camelCase** (default `camelCase: false`).

Cascade: the only two core FKs are `session.userId` and `account.userId` → `user.id`, both declared
`onDelete: "cascade"`, and both the Kysely migration builder and the Drizzle generator default a
missing `onDelete` to `cascade`.

**Conditional tables.** `session` is omitted from the generated schema when `secondaryStorage` is set
unless `session.storeSessionInDatabase` is true; `verification` likewise unless
`verification.storeInDatabase`; and a `rateLimit` table (`key` unique, `count`, `lastRequest` bigint)
appears only when `rateLimit.storage === "database"`. None of this is on the Core Schema page, and all
of it changes what `generate` emits.

### 3.3 Core schema

[concepts/database](https://www.better-auth.com/docs/concepts/database). Types are Better Auth field
types; the adapter maps them to Postgres columns.

**`user`** — `id` (PK), `name` (string, **required**), `email` (string, **required, unique**),
`emailVerified` (boolean, required, default `false`, `input: false`), `image` (string, optional),
`createdAt`, `updatedAt` (dates, required).

**`session`** — `id` (PK), `userId` (required, FK→`user.id` **`onDelete: cascade`**, **indexed**),
`token` (string, required, unique), `expiresAt` (date, required), `ipAddress`, `userAgent`
(optional), `createdAt` (default now), `updatedAt` (**`onUpdate` only, no default**).

**`account`** — `id` (PK), `userId` (required, FK→`user.id` **`onDelete: cascade`**, **indexed**),
`accountId`, `providerId` (required); `accessToken`, `refreshToken`, `accessTokenExpiresAt`,
`refreshTokenExpiresAt`, `scope`, `idToken`, `password` (all optional, and all but `scope` marked
`returned: false` — `password` holds the scrypt hash for credential accounts); `createdAt` (default
now), `updatedAt` (**`onUpdate` only, no default**).

**`verification`** — `id` (PK), `identifier` (required, **indexed**), `value` (required), `expiresAt`
(required), `createdAt`, `updatedAt`. This is the shared bucket: password-reset tokens, phone OTPs,
email OTPs, magic-link tokens and 2FA challenge state all live here, namespaced by `identifier`.

`user.email` being `NOT NULL UNIQUE` is confirmed in `@better-auth/core@1.6.29`
(`dist/db/get-tables.mjs`, `getAuthTables`): `email: { type: "string", unique: true, required: true }`.
This is load-bearing for #14.

### 3.4 IDs

`advanced.database.generateId` accepts, with the verified Postgres column each produces:

| Value             | Behaviour                                                                                                                 | Generated pg column                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| _unset_ (default) | random 32-char string over `[a-z][A-Z][0-9]`, generated in app code                                                       | `text("id").primaryKey()`                                                                      |
| `"uuid"`          | database generates the UUID on Postgres                                                                                   | ``uuid("id").default(sql`pg_catalog.gen_random_uuid()`).primaryKey()``; FKs become `uuid(...)` |
| `"serial"`        | identity column, not `serial`                                                                                             | `integer("id").generatedByDefaultAsIdentity().primaryKey()`; FKs become `integer(...)`         |
| `false`           | database generates all IDs for all tables                                                                                 | dialect default                                                                                |
| a function        | `(options) => string \| false`; returning `false`/`undefined` for a given `options.model` defers **that model** to the DB | mixed                                                                                          |

With `"serial"` the docs warn that _"Better-Auth will continue to infer the type of the `id` field as
a `string`… all id values passed to Better-Auth (eg via an endpoint body) is expected to be a
string."_ `advanced.database.useNumberId` still exists in code as an equivalent to `"serial"` and the
docs' mixed-ID section says _"Do NOT set `useNumberId` — it's global and affects all tables"_, but it
has no documentation section of its own. `advanced.database.defaultFindManyLimit` defaults to `100`.

Note the interaction flagged in §4.4: with predictable IDs (`"serial"`, `false`, custom generators),
the organization plugin silently starts requiring email verification for invitation actions.

### 3.5 Extending the schema

```ts
user: {
  additionalFields: {
    fieldName: {
      type: "string" | "number" | "boolean" | "date" | string[],
      required: boolean,
      defaultValue: any,
      input: boolean,    // may the client set it on create/update?
      returned: boolean, // does it appear in response bodies?
    },
  },
}
```

- `type` also accepts `"string[]"`, `"number[]"`, `"json"`, and — usefully — **a string-literal array
  as an enum**: `type: ["user", "admin"]` emits `text("role", { enum: ["user","admin"] })`.
- Additional fields **are** included by `auth generate` (verified — see the `role`/`lang` columns in
  §3.2.1).
- **`defaultValue` is a JavaScript-layer default**: _"this only applies in the JavaScript layer; in
  the database, the field will be optional"_. In practice the pg generator does still emit
  `.default(...)` for scalar values; NOT NULL comes from `required`, not from `defaultValue`.
- **`input: false` is hard-enforced**, not advisory: `parseInputData` throws `BAD_REQUEST` /
  `FIELD_NOT_ALLOWED` with `"<key> is not allowed to be set"`. It also filters `mapProfileToUser`
  output, since the mapper's return value is treated as provider input. This is what the admin plugin
  uses for `role`/`banned` and the phoneNumber plugin for `phoneNumberVerified`.
- **Client type inference is not automatic.** Add `inferAdditionalFields<typeof auth>()` from
  `better-auth/client/plugins` (same project), or pass the field map manually across projects.
- **`account.additionalFields` and `verification.additionalFields` also work** (`getAuthTables`
  honours them) even though the docs claim only `user` and `session`.
- **No `references` for `additionalFields`.** The internal field-attribute type has one, but nothing
  documents using it from `additionalFields` — treat FK-bearing custom columns as unsupported and put
  those relations in our own tables.

**Whether an existing hand-written `user` table can be adopted:** yes, with a hard floor. Model and
field names are remappable and extra columns are tolerated (the adapter only builds inserts from
fields it knows about). But the FAQ is explicit: _"At this time, you can't remove the `name`,
`image`, or `email` fields from the user table."_
([reference/faq](https://www.better-auth.com/docs/reference/faq)). `email` cannot be made nullable,
and any pre-existing extra column that is `NOT NULL` without a database default will break Better
Auth's inserts, since Better Auth will not supply it — declare it as an `additionalFields` entry
(likely `input: false`) to make Better Auth aware of it.

Because `generate` overwrites its whole file, in practice **Better Auth owns the generated file, not
the table**. An adopted table lives in our own schema file and is handed to the adapter via `schema`.

**Foreign keys from our domain tables to `user.id`: the docs say nothing at all.** No guidance, no
warning, no recommended pattern. What is verifiable is that `user.id` is a plain `text` (or
`uuid`/`integer`) primary key, so app-table FKs to it are mechanically fine, and that Better Auth's
own core FKs use `onDelete: "cascade"` — so if we mirror that, `deleteUser` cascades into our tables,
and if we do not, a user delete will fail against a RESTRICT/NO ACTION constraint. That is an
inference from the shipped schema, not a documented statement, and it is a real design decision for
#2 and #5.

---

## 4. The organization plugin, audited against our model

Docs: [plugins/organization](https://www.better-auth.com/docs/plugins/organization). Verified against
`better-auth@1.6.29` `dist/plugins/organization/*`.

### 4.1 What it adds

Always:

| Table          | Columns                                                                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `organization` | `id` PK, `name` (req), `slug` (req, **unique**, indexed), `logo`, `createdAt` (req), `metadata` (JSON serialized into a string column)                                                                  |
| `member`       | `id` PK, `organizationId` (req, FK→`organization.id`, indexed), `userId` (req, FK→`user.id`, indexed), `role` (req, default `"member"`), `createdAt` (req)                                              |
| `invitation`   | `id` PK, `organizationId` (req, FK, indexed), `email` (req, indexed), `role` (**optional**), `status` (req, default `"pending"`), `expiresAt` (req), `createdAt` (req), `inviterId` (req, FK→`user.id`) |

Plus one column on the core session table: **`session.activeOrganizationId`** (string, optional,
`input: false`). This column is emitted unconditionally — the docs say you _may_ keep active-org
purely client-side, but they never mention that the column still exists in the schema. drizzle-kit
will want it either way.

Opt-in: `teams.enabled` adds `team` + `teamMember` and `session.activeTeamId`;
`dynamicAccessControl.enabled` adds `organizationRole`.

**No unique constraint on `(organizationId, userId)`** and none on `(email, organizationId)` in
`invitation`. Only indexes are declared. Duplicate-membership prevention is endpoint logic, so
concurrent requests or direct DB writes can create duplicates. If we want the invariant, we add the
constraint in our own migration.

### 4.2 Does it model what we need?

Yes, structurally:

- `member` is a pure join row. **Role lives on the membership, not on the user** — which is exactly
  the map's "single `user` table; role via company membership".
- **Zero organizations is a supported state.** Nothing in the plugin requires membership. Sign-in and
  session creation are untouched. A candidate is a normal user whose
  `session.activeOrganizationId` is `null`; org-scoped endpoints simply throw
  `NO_ACTIVE_ORGANIZATION`.
- Roles are **free-form strings** on `member.role` with no enum and no FK. An unrecognised role
  authorizes nothing (`acRoles[role]?.authorize(...)`), failing closed.
- **Multiple roles per member** are supported, stored comma-separated in the one column.

`activeOrganizationId` is written to the session row _and_ re-issued into the session cookie by
`POST /organization/set-active`, on org creation, and cleared on leave/remove/delete. It is **not**
set at sign-in — the docs point at `databaseHooks.session.create.before` for that, and leave the
"which org" logic to us.

**The mismatch is weight, not shape.** The docs are written for B2B SaaS where everyone is in an org.
Our shape — most users in zero orgs — works and is inert, but is nowhere described.

### 4.3 Roles and permissions: candidate / company member / admin

Built-in statements:

```
organization: ["update", "delete"]
member:       ["create", "update", "delete"]
invitation:   ["create", "cancel"]
team:         ["create", "update", "delete"]
ac:           ["create", "read", "update", "delete"]
```

Built-in roles: `owner` (everything), `admin` (everything except `organization: "delete"`),
`member` (effectively read-only). Custom roles via `createAccessControl` from
`better-auth/plugins/access`, merged with `defaultStatements` / `adminAc` / `ownerAc` / `memberAc`
imported from `better-auth/plugins/organization/access`. **The same `ac` and `roles` must be passed
to the client plugin as well.**

Checks: `POST /organization/has-permission` server-side (falls back to
`session.activeOrganizationId`); `authClient.organization.checkRolePermission()` client-side, which
is synchronous, local, and **does not see dynamic roles** — UI-only.

`creatorRole` defaults to `"owner"`. **There is no `defaultRole` option on the organization plugin
in 1.6.29** — the "default role" is the `member.role` column default `"member"`. `defaultRole` is an
admin-plugin option; do not confuse them.

Mapping our three roles onto this:

- **candidate** — a `user` with no `member` row. Not a role at all in Better Auth's sense.
- **company member** — a `member` row with `role` in whatever statement set we define.
- **admin** — `user.role` from the **admin plugin**, a separate system (§4.5).

### 4.4 Invitations

`POST /organization/invite-member` creates a `pending` row and calls
`sendInvitationEmail({ id, role, email, organization, invitation, inviter }, request?)`.
`invitationExpiresIn` defaults to **48 h**; `invitationLimit` and `membershipLimit` default to 100,
and membership limit is re-checked at accept time.

Two facts that shape the employer-onboarding UX:

- **Better Auth does not generate the invite URL.** Verbatim from the option's JSDoc: _"Note: Better
  Auth doesn't generate invitation URLs. You'll need to construct the URL using the invitation ID and
  pass it to the acceptInvitation endpoint."_ The email body is ours too.
- **The invitee must be signed in to accept.** `acceptInvitation` requires a session and hard-checks
  `invitation.email === session.user.email` → `YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION`. There is
  no "invitation creates the user" path; we route invitee → sign-up → accept ourselves.
- `requireEmailVerificationOnInvitation` (default `undefined`) auto-enables itself when invitation IDs
  are predictable — i.e. if we pick `generateId: "serial"` or `false`, invitations silently start
  requiring a verified email. Worth remembering when #4/#15 pick an ID strategy.

There is also `getInvitationURL` for shareable links, which deliberately does **not** call
`sendInvitationEmail` — delivery is ours. That is the natural hook for a WhatsApp invite.

### 4.5 The admin plugin

[plugins/admin](https://www.better-auth.com/docs/plugins/admin). Adds five columns, all `input: false`:
`user.role` (string, optional, **no DB default**), `user.banned` (boolean, default `false`),
`user.banReason`, `user.banExpires` (date), `session.impersonatedBy` (string, **no FK declared**).
Fifteen routes under `/admin/*` (`set-role`, `ban-user`, `impersonate-user`, `list-users`, …).

Runtime behaviour beyond the endpoints: a `databaseHooks.session.create.before` hook blocks sign-in
for banned users (403 `BANNED_USER`) and auto-unbans when `banExpires` has passed. `/list-sessions`
filters out impersonated sessions.

Options: `defaultRole` (default `"user"`), `adminRoles` (default `["admin"]`, validated at
construction), `adminUserIds` (an unconditional allow — overrides `adminRoles`),
`impersonationSessionDuration` (1 h), `defaultBanExpiresIn`, `bannedUserMessage`.

**The two role systems are fully independent.** Different storage (`user.role` global vs `member.role`
per-org), different access-control instances (`better-auth/plugins/admin/access` vs
`.../organization/access`), disjoint statement namespaces (`user`/`session` vs
`organization`/`member`/`invitation`/`team`/`ac`). The string `"admin"` exists as a default role in
both and means different things. A platform admin gets **no** organization permissions automatically,
and an org owner gets **no** admin permissions. Any "platform admin can see everything" behaviour is
ours to write.

Gotcha: `user.role` has **no database default** — the `"user"` default is applied by a create hook.
Rows inserted by seeds or drizzle scripts will have `role = NULL`. Our seed/test fixtures must set it.

### 4.6 Weight

- **22 routes** minimum under `/organization/*` (including `has-permission`); +9 with teams, +5 with
  dynamic AC — up to 36.
- **3 tables + 1 session column** minimum; up to 6 tables + 2 session columns.
- **No supported way to use a subset.** There is no per-endpoint toggle and no "members without
  invitations" mode. `schema.<model>.modelName` lets us _rename_ tables into our domain
  (`company`, `company_member`) and `additionalFields` lets us add columns — renaming, not subsetting.
  Core does have an undocumented-for-this-purpose `disabledPaths: string[]` option that 404s HTTP
  paths (it does not affect `auth.api.*` server calls), but it is not presented as a subsetting
  mechanism anywhere in the organization docs.

What a hand-rolled `company` + `company_member` would _not_ get: session wiring for the active org
(written to both the session row and the cookie), the permission engine with multi-role support, the
whole invitation lifecycle with guarded status transitions and limits, the endpoint guard rails
("last owner can't leave", slug-uniqueness check, transactional member creation, active-org cleanup),
and the typed client + error codes + OpenAPI metadata. What it would _not_ cost: 22 routes we do not
serve and 3 tables shaped by someone else's B2B assumptions.

---

## 5. Email/password, verification, reset

### 5.1 `emailAndPassword` options and defaults

| Option                              | Default                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `enabled`                           | `false`                                                                 |
| `disableSignUp`                     | `false`                                                                 |
| `requireEmailVerification`          | `false`                                                                 |
| `minPasswordLength`                 | `8`                                                                     |
| `maxPasswordLength`                 | `128`                                                                   |
| `autoSignIn`                        | `true`                                                                  |
| `sendResetPassword`                 | — (absent ⇒ `/request-password-reset` throws `RESET_PASSWORD_DISABLED`) |
| `resetPasswordTokenExpiresIn`       | `3600` s                                                                |
| `onPasswordReset`                   | —                                                                       |
| `password.hash` / `password.verify` | scrypt                                                                  |
| `revokeSessionsOnPasswordReset`     | **`false`**                                                             |
| `onExistingUserSignUp`              | —                                                                       |
| `customSyntheticUser`               | —                                                                       |

Endpoints: `POST /sign-up/email` (`name`, `email`, `password` required), `POST /sign-in/email`,
`POST /request-password-reset`, `GET /reset-password/:token`, `POST /reset-password`,
`POST /change-password`.
([authentication/email-password](https://www.better-auth.com/docs/authentication/email-password))

### 5.2 Hashing

Default **scrypt** with `N=16384, r=16, p=1, dkLen=64`, NFKC-normalized password, 16 random salt
bytes, stored as `"<saltHex>:<keyHex>"` in `account.password`. Node path uses `node:crypto.scrypt`
(libuv threadpool); other runtimes fall back to `@noble/hashes` with identical parameters
(`@better-auth/utils@0.4.2`).

`r=16` is double RFC 7914's suggestion, giving a working set around 32 MB per hash. On a small Fly.io
machine that is a real per-sign-in cost and a real DoS surface — worth remembering in #15 when sizing
the instance.

Argon2id swap is documented and one-line-ish via `password.hash`/`.verify` with `@node-rs/argon2`.
There is no algorithm-prefix or lazy-rehash migration helper: switching on a populated database locks
out every existing user unless we build the migration.

Minor: `verifyPassword` compares hex strings with `===`, not a constant-time comparison. The compared
value is scrypt output, so exploitability is low, but it is not timing-safe.

### 5.3 Email verification

| Option                                                | Default                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| `sendVerificationEmail({user, url, token}, request?)` | — (absent ⇒ `VERIFICATION_EMAIL_NOT_ENABLED`)                                   |
| `sendOnSignUp`                                        | falls back to `requireEmailVerification`                                        |
| `sendOnSignIn`                                        | `false`                                                                         |
| `autoSignInAfterVerification`                         | **`false` in source** — the options reference claims `true`. Set it explicitly. |
| `expiresIn`                                           | `3600` s                                                                        |
| `beforeEmailVerification` / `afterEmailVerification`  | —                                                                               |

**The verification token is a stateless HS256 JWT signed with the app secret**, payload
`{email, updateTo?, requestType?}` + `exp`. It is **not stored in `verification`**, therefore **not
single-use and not revocable** — it is replayable until it expires. In practice replay is inert
because the handler early-returns when `user.emailVerified` is already true, but there is no
server-side way to invalidate an issued link.

Callback URL shape: `${baseURL}/verify-email?token=<jwt>&callbackURL=<encoded>`. `GET /verify-email`
origin-checks `callbackURL` and, on failure, redirects with `?error=TOKEN_EXPIRED` or
`?error=INVALID_TOKEN`.

With `requireEmailVerification: true`, `POST /sign-in/email` returns **HTTP 403** with code
**`EMAIL_NOT_VERIFIED`**. The password is checked _before_ that gate, and with `sendOnSignIn: true` a
fresh verification email goes out in the background first.

`POST /send-verification-email` is enumeration-hardened when unauthenticated (500 ms constant-time
floor, throwaway token for unknown/already-verified users). When a session exists it _does_ leak
`EMAIL_MISMATCH` / `EMAIL_ALREADY_VERIFIED`.

### 5.4 Password reset

Stateful and single-use, unlike verification. `generateId(24)` (≈143 bits) stored in `verification`
as `identifier = "reset-password:<token>"`, `value = user.id`, expiring after
`resetPasswordTokenExpiresIn` (3600 s). `POST /reset-password` consumes the row, so a second use
returns 400 `INVALID_TOKEN`.

**Sessions are NOT revoked on reset by default.** `revokeSessionsOnPasswordReset: true` deletes _all_
sessions including the resetting device.

**Enumeration is not leaked**: unknown emails get HTTP 200 with the identical body
`{status: true, message: "If this email exists in our system, check your email for the reset link"}`,
plus a dummy token generation and a dummy verification lookup to flatten timing.

Note `/reset-password` **creates a `credential` account if the user had none** — a reset email is
enough to attach a password to a social-only account.

### 5.5 The sign-up enumeration default (surprising)

Signing up with an already-registered email returns a **fake success payload with a synthetic user
and `token: null`** — but only when `requireEmailVerification: true` **or** `autoSignIn: false`.
Otherwise it returns 422 `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` and **is enumerable**. Since
`autoSignIn` defaults to `true` and `requireEmailVerification` to `false`, the **default
configuration is enumerable**. `onExistingUserSignUp` and `customSyntheticUser` exist to shape the
hardened path.

### 5.6 Rate limiting and brute force

- `rateLimit.enabled` defaults to `isProduction` — **off in development**.
- Global default in the shipped source: **`window: 10` s, `max: 100`**, keyed by client IP + normalized
  path. ⚠️ [concepts/rate-limit](https://www.better-auth.com/docs/concepts/rate-limit) says 60 s; the
  code and the options reference say 10. Treat that docs page as stale.
- Built-in special rules (broader than the docs describe):
  - **3 per 10 s** for paths starting `/sign-in`, `/sign-up`, `/change-password`, `/change-email`
  - **3 per 60 s** for `/request-password-reset`, `/send-verification-email`, `/forget-password*`,
    `/email-otp/send-verification-otp`, `/email-otp/request-password-reset`
  - plugin rules override built-ins (twoFactor: 3/10 s; phoneNumber: 10/60 s); `customRules` override
    everything.
- Storage: `"memory"` (default), `"database"` (needs a `rateLimit` table: `id`, `key`, `count`,
  `lastRequest`), `"secondary-storage"`, or `customStorage`. Memory is per-instance — N instances give
  an attacker N× the budget. **At 1.7.1 the database backend is atomic and prunes its own expired
  rows — §0.1(2).**
- If no client IP can be resolved, **every request collapses into one shared bucket per path**. Behind
  Fly.io's proxy we must set `advanced.ipAddress.ipAddressHeaders` / `trustedProxies`. IPv6 is
  collapsed to a `/64`.
- Response is HTTP **429** with `X-Retry-After`.

**There is no account lockout for `/sign-in/email` in 1.6.29.** No failed-attempt counter exists on
that path. The only lockout in the codebase belongs to the twoFactor plugin
(`accountLockout: { enabled: true, maxFailedAttempts: 10, durationSeconds: 900 }`) and applies solely
to 2FA code verification. Per-account lockout is ours to build.

Good hygiene that _is_ present: sign-in hashes the submitted password even for unknown users and for
users with no credential account, flattening timing.

### 5.7 CSRF, origins, cookies

`originCheckMiddleware` runs on every non-GET/HEAD/OPTIONS request: validates `Origin` (falling back
to `Referer`) against `trustedOrigins` — missing/`null` ⇒ 403 `MISSING_OR_NULL_ORIGIN`, mismatch ⇒
403 `INVALID_ORIGIN` — and additionally checks Fetch Metadata headers to block cross-site navigation
logins. `callbackURL` / `redirectTo` / `errorCallbackURL` are separately validated against
`trustedOrigins` as open-redirect defence. `trustedOrigins` takes exact origins, `*`/`?` wildcards,
custom schemes, or a `(request) => string[]` function.

All auth cookies are `httpOnly`, `sameSite: "lax"`, `path: "/"`, and `Secure` + `__Secure-`-prefixed
when secure cookies apply. Prefix is `better-auth` by default
(`better-auth.session_token`, `.session_data`, `.dont_remember`). The session token cookie is
HMAC-signed with the app secret. `advanced.useSecureCookies` is inferred from the `baseURL` protocol
when unset. `advanced.disableCSRFCheck` and `advanced.disableOriginCheck` exist and both default to
`false` — neither should ever be true for us.

---

## 6. Sessions

| Option                              | Default                                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| `session.expiresIn`                 | `604800` (7 d)                                                                                |
| `session.updateAge`                 | `86400` (1 d); `0` ⇒ refresh every use                                                        |
| `session.freshAge`                  | `86400` (1 d); gates sensitive endpoints, 403 `SESSION_NOT_FRESH`                             |
| `session.disableSessionRefresh`     | `false`                                                                                       |
| `session.deferSessionRefresh`       | `false`                                                                                       |
| `session.storeSessionInDatabase`    | `false` (only meaningful with `secondaryStorage`)                                             |
| `session.preserveSessionInDatabase` | `false`                                                                                       |
| `session.cookieCache.enabled`       | **`false`**                                                                                   |
| `session.cookieCache.maxAge`        | `300` (5 min)                                                                                 |
| `session.cookieCache.strategy`      | `"compact"` (base64url + HMAC-SHA256); also `"jwt"` (HS256, readable) and `"jwe"` (encrypted) |
| `session.cookieCache.version`       | `"1"`; changing it expires every cache cookie at once                                         |
| `session.cookieCache.refreshCache`  | `false`                                                                                       |

Session token is `generateId(32)` over `a-zA-Z0-9` (≈190 bits). `rememberMe: false` gives a 24 h row
and a browser-session cookie plus a `dont_remember` cookie.

Invalidation: `POST /sign-out`, `/revoke-session` (own sessions only), `/revoke-sessions` (all incl.
current), `/revoke-other-sessions`. The last three sit behind the freshness gate.
`POST /change-password { revokeOtherSessions: true }` deletes all sessions then mints a new one for
the caller.

### The cookie-cache revocation caveat

With `cookieCache.enabled: true`, `GET /get-session` returns the cookie payload and **never queries
the database**. The docs state the consequence plainly: _"When `cookieCache` is enabled, revoked
sessions may remain active on other devices until the cookie cache expires (`maxAge`)"_
([session-management](https://www.better-auth.com/docs/concepts/session-management)). Default
exposure is therefore **5 minutes**.

**Not documented:** with `refreshCache: true` the cache re-issues itself statelessly once 20 % of
`maxAge` remains, gated only by the _cached_ `expiresAt`. An actively-used revoked session can then be
honoured for up to `session.expiresIn` — **7 days by default** — with no DB check at all. This is
derived from reading `dist/api/routes/session.mjs` and was not tested end-to-end. Escapes:
`?disableCookieCache=true`, bumping `cookieCache.version`, a short `maxAge`, or leaving cookie cache
off.

This matters for #13 (safety/moderation): banning a user or revoking a session is not immediate while
cookie cache is on.

---

## 7. Phone, OTP, and a WhatsApp path

### 7.1 The `phoneNumber` plugin

Adds **two columns on `user` and no new table**:
`phoneNumber` (string, optional, **`unique: true`** — the source has it, the docs table does not
mention it) and `phoneNumberVerified` (boolean, optional, `input: false`). OTPs reuse the core
`verification` table, keyed by the raw phone number.

| Option                               | Default                                                     |
| ------------------------------------ | ----------------------------------------------------------- |
| `sendOTP({phoneNumber, code}, ctx?)` | **required**                                                |
| `otpLength`                          | `6`                                                         |
| `expiresIn`                          | `300` s                                                     |
| `allowedAttempts`                    | `3`                                                         |
| `requireVerification`                | `false`                                                     |
| `phoneNumberValidator`               | any string accepted                                         |
| `verifyOTP`                          | — (delegate verification to a provider, e.g. Twilio Verify) |
| `sendPasswordResetOTP`               | —                                                           |
| `callbackOnVerification`             | —                                                           |
| `signUpOnVerification`               | — (`{ getTempEmail, getTempName? }`)                        |

Built-in rate limit for `/phone-number/*`: 10 per 60 s.

Endpoints: `POST /phone-number/send-otp`, `/phone-number/verify`, `/sign-in/phone-number`,
`/phone-number/request-password-reset`, `/phone-number/reset-password`.

### 7.2 The three facts #14 needs

**(a) No phone-only user.** `user.email` is `NOT NULL UNIQUE` and `user.name` is `NOT NULL`, so
`signUpOnVerification.getTempEmail` is a _non-optional_ field of that object. On auto-signup the
plugin does:

```js
user = await ctx.context.internalAdapter.createUser({
  email: opts.signUpOnVerification.getTempEmail(ctx.body.phoneNumber),
  name: opts.signUpOnVerification.getTempName?.(phoneNumber) ?? phoneNumber,
  phoneNumber,
  phoneNumberVerified: true,
});
```

The docs' own example is `` getTempEmail: (n) => `${n}@my-site.com` ``. Because `email` is UNIQUE, the
generator must be deterministic and collision-free, and **every phone-only user carries a synthetic,
undeliverable address**. Anything that later emails users must know to skip them. Without
`signUpOnVerification`, `/phone-number/verify` throws `FAILED_TO_UPDATE_USER` for unknown numbers —
there is no auto-signup.

**(b) `/sign-in/phone-number` is NOT passwordless.** Its body is `{ phoneNumber, password }` and it
looks up a `providerId: "credential"` account. The passwordless phone path is
`POST /phone-number/verify`, which creates the session and sets the cookie. Confusing naming; easy to
get wrong.

**(c) Phone OTPs are stored in plaintext.** `/phone-number/send-otp` writes
`value: "<code>:0"` (code + attempt counter) into `verification.value`, next to the phone number in
plaintext in `verification.identifier`. The plugin has **no `storeOTP` option**, unlike `emailOtp`
and `twoFactor.otpOptions` which both offer `"plain" | "encrypted" | "hashed"`. There is an open
upstream issue about aligning the two APIs (better-auth/better-auth#6943). The only in-library
mitigation today is `verifyOTP` + a provider that owns the code (e.g. Twilio Verify). Verification
itself is atomic — `consumeVerificationValue` deletes the row, first caller wins — and exceeding
`allowedAttempts` deletes the row and throws 403 `TOO_MANY_ATTEMPTS`.

### 7.3 Can WhatsApp be plugged in? Yes, trivially.

`sendOTP` is a plain async callback typed `(data: {phoneNumber, code}, ctx?) => Awaitable<void>`, and
the endpoint refuses to run without it (`NOT_IMPLEMENTED`). Grepping the entire published
`better-auth@1.6.29` `dist/` for `twilio|whatsapp|vonage|messagebird|nexmo` returns **zero matches** —
there is no transport code and no vendor HTTP client anywhere in the library. The only mention of SMS
in the package is a JSDoc comment on `verifyOTP`.

So Twilio SMS, Twilio's WhatsApp Content API, Meta's WhatsApp Cloud API, or a local Colombian
aggregator all plug in identically. **The channel decision in #14/#6 is unconstrained by Better
Auth.** The same is true of `twoFactor.otpOptions.sendOTP` (which receives the full user object),
`emailOtp.sendVerificationOTP`, `magicLink.sendMagicLink` and
`organization.sendInvitationEmail`.

The docs advise **not** awaiting `sendOTP`, to avoid timing leaks; the source honours this via
`advanced.backgroundTasks.handler` when configured and awaits otherwise.

### 7.4 `twoFactor`

Adds `user.twoFactorEnabled` (boolean, default `false`, `input: false`) and a `twoFactor` table:
`secret` (required, `returned: false`, indexed), `backupCodes` (required, `returned: false`), `userId`
(FK, indexed), `verified` (default `true`), `failedVerificationCount` (default `0`), `lockedUntil`.

Encryption at rest is real: `symmetricEncrypt` is **XChaCha20-Poly1305** (`@noble/ciphers`,
managed nonce) with the key derived as `SHA-256(BETTER_AUTH_SECRET)`, and 1.6.x supports versioned
key rotation (`$ba$<version>$<hex>` envelopes with a legacy fallback). Backup codes default to
`"encrypted"` — **encrypted, not hashed**, i.e. reversible with the app secret, because the "view my
backup codes" flow decrypts them. **Losing or rotating `BETTER_AUTH_SECRET` without the legacy
fallback bricks every stored 2FA secret.** None of the key details are on the 2FA docs page; they are
source-derived.

Config: `issuer`, `twoFactorTable` (`"twoFactor"`), `totpOptions` (`digits` 6|8, `period` 30 s),
`otpOptions` (`period` 3 min, `digits` 6, `allowedAttempts` 5, `storeOTP`, `sendOTP`),
`backupCodeOptions` (`amount` 10, `length` 10, `storeBackupCodes` `"encrypted"`),
`skipVerificationOnEnable` (`false`), `allowPasswordless` (`false`), `twoFactorCookieMaxAge` (600 s),
`trustDeviceMaxAge` (30 d), `accountLockout` (`enabled: true`, `maxFailedAttempts: 10`,
`durationSeconds: 900`).

Sign-in: an `after` hook on `/sign-in/email`, `/sign-in/username` **and `/sign-in/phone-number`**
deletes the fresh session, clears the cookie, stores a `2fa-<random>` challenge and returns
`{ twoFactorRedirect: true, twoFactorMethods: [...] }`. `"otp"` appears in that list only if
`otpOptions.sendOTP` is configured. Rate limit 3 per 10 s.

### 7.5 `emailOtp` and `magicLink` for comparison

`emailOtp` adds **no columns and no tables** (namespaced identifiers in `verification`). It is
genuinely passwordless: `/sign-in/email-otp` creates the user (`emailVerified: true`) and the session
in one call, because email _is_ the natural key. It has `storeOTP` (default `"plain"`),
`resendStrategy` (`"rotate"` default), `disableSignUp`, a change-email flow, and its own rate limit
(3 per 60 s).

`magicLink` adds no schema either. `storeToken` default is **`"plain"` in source** while the docs
imply `"hashed"` — source wins. It requires a deliverable inbox and a click round-trip, which is the
worst fit for a mobile-first audience that may not use email.

---

## 8. Next.js 16 App Router integration

[integrations/next](https://www.better-auth.com/docs/integrations/next).

- Route handler: `export const { GET, POST } = toNextJsHandler(auth)` in
  `app/api/auth/[...all]/route.ts`.
- **`nextCookies()` must be the last plugin** in the array. Without it, cookies set from Server
  Actions do not persist, because Server Actions need Next's `cookies()` helper.
- Server-side read: `await auth.api.getSession({ headers: await headers() })`. RSCs do not refresh the
  cookie cache until a Server Action or Route Handler runs.
- **Middleware on Next.js 16 can do full database validation** (Next 15.2+ Node runtime middleware;
  13–15.1 could not, being edge-only). Since we are on 16.3.0 this constraint does not bite us.
- `getSessionCookie(request)` is an _optimistic_ check only. The docs warn: _"`getSessionCookie` only
  checks existence; it does not validate it… anyone can manually create a cookie to bypass it."_ and
  _"You must always validate the session on your server for any protected actions or pages."_
  `getCookieCache(request)` returns the cached session object.
- Bundle: `better-auth/minimal` excludes Kysely when using the Drizzle adapter.

---

## 9. Cost: free vs paid

**The library is free.** `better-auth@1.6.29` is MIT (`"The MIT License (MIT) — Copyright (c) 2024 -
present, Bereket Engida"`). Every plugin in this audit — `organization`, `admin`, `phone-number`,
`two-factor`, `email-otp`, `magic-link`, `username`, `captcha`, `haveIBeenPwned`, `i18n` — ships
inside MIT packages with no license gate, no key check and no unlock-via-telemetry. **Nothing in this
audit is gated behind a paid Better Auth tier.**

**There is a paid product.** "Better Auth Infrastructure" — a managed dashboard, audit logs, abuse
detection, transactional email/SMS and SSO, wired in via a separate `dash()` plugin.
[Pricing](https://www.better-auth.com/pricing) states verbatim: _"The Better Auth framework is free
and open source. Pricing below is for our managed infrastructure."_

| Tier       | Price           | Relevant contents                                                                                                                                                                                                |
| ---------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Starter    | **$0**          | 1 seat, 10 000 audit logs/mo (1-day retention), 1 000 security detections/mo, community support                                                                                                                  |
| Pro        | **$20/mo**      | unlimited seats, 20 000 audit logs/mo (7-day retention, then $0.0001/event), 10 000 detections/mo (then $0.001/event), **email $0.001 each, SMS $0.09 each**, 1 SSO connection (then $50/mo each), email support |
| Enterprise | custom          | custom retention, custom domain, log drain, RBAC, Slack support                                                                                                                                                  |
| Add-ons    | **$25/mo** each | custom dashboard domain; log drain                                                                                                                                                                               |

Against a **$25/month total infrastructure ceiling across staging and production**, Pro at $20/month
consumes 80 % of the budget before any database or hosting, and its SMS at $0.09 is roughly 1.5× the
Twilio Colombia list rate. Flagging it as: available, not affordable at this budget.

**Third-party costs Better Auth itself does not charge, but the features imply:**

1. **SMS gateway** — for `phoneNumber.sendOTP`. **Twilio to Colombia: $0.0592 per outbound message
   segment**, plus **$1.15/month** for an international long-code number
   ([twilio.com/en-us/sms/pricing/co](https://www.twilio.com/en-us/sms/pricing/co), fetched
   2026-08-15; the page carries no publication date and warns prices may change).
2. **WhatsApp Business Platform** — a Meta BSP _plus_ Meta's per-message template fee. Requires a
   verified WABA, a phone number, and **pre-approved `AUTHENTICATION`-category templates**; arbitrary
   OTP text cannot be sent. **Twilio's own WhatsApp fee is $0.005 per message in or out**
   ([twilio.com/en-us/whatsapp/pricing](https://www.twilio.com/en-us/whatsapp/pricing)).
3. **Transactional email** — needed even in a phone-first design, since verification and reset flows
   need a sender (Resend, SES, Postmark). This is #6's territory.
4. **Redis/KV** if we ever want `secondaryStorage` or `"secondary-storage"` rate-limit storage. The
   `"database"` rate-limit backend avoids this at the cost of a table and writes.

---

## 10. Spanish

`@better-auth/i18n@1.6.29` (separate MIT package,
[plugins/i18n](https://better-auth.com/docs/plugins/i18n)) translates **error messages only** — not
emails, not non-error responses. Options: `translations` (required,
`Record<locale, Record<errorCode, string>>`), `defaultLocale` (`"en"`), `detection` (ordered subset of
`"header"` / `"cookie"` / `"session"` / `"callback"`, default `["header"]`), `localeCookie`
(`"locale"`), `userLocaleField` (`"locale"`), `getLocale`.

**No locales ship built in — Spanish included.** We write the dictionary, keyed off the client's
`$ERROR_CODES` object. Missing keys fall back to the English string. All user-facing email and SMS
copy is ours regardless, since every send is our callback.

> **Retracted at 1.7.1 (§0.1(1)).** `@better-auth/i18n@1.7.1` ships 22 dictionaries, `es` among them
> — 34 keys covering the core `$ERROR_CODES` and no plugin codes, in the `tú` register PRODUCT.md
> asks for. The rest of this section stands: still error messages only, still nothing for emails, and
> plugin error strings are still ours.

---

## 11. What we must build ourselves

Consolidated from the above. This is the honest cost of adopting Better Auth:

**Delivery and copy**

- Every email and SMS/WhatsApp body, in Spanish: verification, password reset, OTP, invitations.
- The transport integrations behind each `send*` callback.
- The Spanish `@better-auth/i18n` error dictionary — **at 1.7.1 the core 34 keys ship (§0.1(1))**;
  what remains is reviewing them against the voice rules and writing the plugin codes.
- Invitation **URLs** (Better Auth explicitly does not generate them) and the invitee
  sign-up → accept routing.

**Schema and data**

- Any index the generator does not already emit (§2.5) — confirm by diffing, not by assuming.
- `ON DELETE` behaviour for FKs from our domain tables to `user.id` (undocumented territory, §3.5),
  and a deliberate decision about what "delete a user" means across the domain.
- A unique constraint on `member(organizationId, userId)` if we want that invariant.
- A file layout that keeps the generated `auth-schema.ts` generator-owned and our domain tables
  elsewhere, since `generate` overwrites its whole file.
- A collision-free `getTempEmail` scheme if #14 chooses phone, plus a rule that marks those addresses
  undeliverable everywhere in the product.
- Non-NULL `user.role` in seeds and test fixtures (the admin plugin's default is a hook, not a DB
  default).

**Security**

- Per-account lockout / failed-attempt tracking for password sign-in.
- A durable rate-limit backend (`"database"` or KV) — not the default in-memory one.
- `advanced.ipAddress.ipAddressHeaders` / `trustedProxies` for Fly.io, or rate limiting degenerates
  into one global bucket.
- An explicit decision on `autoSignInAfterVerification` (source and docs disagree).
- An explicit decision on the sign-up enumeration posture (the default is enumerable, §5.5).
- `BETTER_AUTH_SECRET` custody and rotation policy — it is the key for 2FA secrets and backup codes.

**Domain**

- Authorization over jobs, applications and profiles. The plugins guard only their own endpoints.
- Whatever links a platform admin to organization-scoped powers — the two role systems are disjoint.
- Setting `activeOrganizationId` at sign-in (`databaseHooks.session.create.before`), if we want it.
- An audit log, if #5 or #13 needs one.

---

## 12. Gaps: what we could not verify

Stated plainly rather than guessed.

1. **Generator behaviour was observed on `@better-auth/cli@1.4.21`, not `auth@1.6.29`.** The
   overwrite-always behaviour and the `./auth-schema.ts` default path in §3.2 are real, observed
   facts — but from the older CLI package. The documented behaviour is the same and the generator
   reads the same `getAuthTables`, so the risk is low, but re-confirm the default output path with
   `auth@latest` before scripting it. (We should pass `--output` explicitly anyway.)
2. **`emailVerification.autoSignInAfterVerification` default.** The options reference says `true`; the
   type carries no `@default` and the runtime is a bare truthiness check, implying `false`. Set it
   explicitly rather than trusting either.
3. **Rate-limit default window.** `concepts/rate-limit` says 60 s; the shipped source and
   `reference/options` say 10 s. One of the two docs pages is stale; do not rely on either alone.
   **Re-verified at 1.7.1 and still contradictory (§0.1(3))** — set `window` explicitly.
4. **The `refreshCache` 7-day revocation window** (§6) is inferred from reading
   `dist/api/routes/session.mjs`, not tested end-to-end, and is not stated in any doc.
5. **`organizationLimit`'s function form has an inverted-looking contract** — typed
   `(user) => Awaitable<boolean>` with JSDoc "return `true` if the user has reached their limit",
   while the same JSDoc's example returns `plan.name === "pro"`. Verify empirically if we use it.
6. **`@better-auth/organization/addons`** is referenced by the loaded `organization-best-practices`
   skill as the import for `dynamicAccessControl`, but **no such package exists on npm**. In 1.6.29
   `dynamicAccessControl` is an option on the `organization()` plugin itself. Treat the skill doc as
   stale on this point.
7. **Timing side-channel on `/request-password-reset`.** The dummy-lookup mitigation is real but
   weaker than the 500 ms floor used by `/send-verification-email`. Not benchmarked.
8. **Meta's WhatsApp authentication-template rate for Colombia** could not be verified. Meta moved to
   per-message pricing on 2025-07-01 and publishes actual numbers only in downloadable rate cards /
   a client-rendered selector. Two things _are_ confirmed from Meta's docs: Colombia is **not** on the
   authentication-international list (Egypt, India, Indonesia, Malaysia, Nigeria, Pakistan, Saudi
   Arabia, South Africa, UAE), so it bills at the standard authentication rate; and Meta noted higher
   utility/authentication rates for Colombia effective 2025-10-01 with COP added as a billing
   currency from 2026-04-01. **Get the current figure from a BSP rate card before any cost model.**
   The $0.0034 Meta authentication fee shown on Twilio's WhatsApp pricing page is for that page's
   default market and could not be confirmed as the Colombia rate.
9. **Better Auth Infrastructure's managed SMS country coverage and Colombia pricing** — the $0.09/SMS
   appears flat and undifferentiated; no coverage list is published.
10. **Colombian A2P carrier compliance** — whether local carriers require pre-registered alphanumeric
    sender IDs or short codes for OTP traffic. No Better Auth or Twilio doc answers this. It is a real
    question for #14 and belongs with #6.
11. **Foreign keys from application tables to the auth `user` table are completely undocumented** —
    no guidance, no warning, no cascade recommendation. §3.5 records what can be inferred from the
    shipped schema; the design decision is ours and belongs in #2.
12. **`references` on `additionalFields`** exists in the internal field-attribute type with no
    documented public usage. Treated here as unsupported; not tested.
13. **Passkeys, SSO, and the social/OAuth providers** were out of scope and are not audited here.
14. Doc pages were read through a summarizing fetch, so quoted doc prose is close but not guaranteed
    verbatim. Every number in this document was cross-checked against the shipped source of
    `better-auth@1.6.29` unless noted otherwise.

---

## 13. Primary sources

Better Auth documentation (fetched 2026-08-15):

- [concepts/database](https://www.better-auth.com/docs/concepts/database)
- [concepts/cli](https://www.better-auth.com/docs/concepts/cli)
- [concepts/session-management](https://www.better-auth.com/docs/concepts/session-management)
- [concepts/rate-limit](https://www.better-auth.com/docs/concepts/rate-limit)
- [concepts/email](https://www.better-auth.com/docs/concepts/email)
- [concepts/users-accounts](https://www.better-auth.com/docs/concepts/users-accounts)
- [adapters/drizzle](https://www.better-auth.com/docs/adapters/drizzle)
- [authentication/email-password](https://www.better-auth.com/docs/authentication/email-password)
- [integrations/next](https://www.better-auth.com/docs/integrations/next)
- [plugins/organization](https://www.better-auth.com/docs/plugins/organization)
- [plugins/admin](https://www.better-auth.com/docs/plugins/admin)
- [plugins/phone-number](https://www.better-auth.com/docs/plugins/phone-number)
- [plugins/2fa](https://www.better-auth.com/docs/plugins/2fa)
- [plugins/email-otp](https://www.better-auth.com/docs/plugins/email-otp)
- [plugins/magic-link](https://www.better-auth.com/docs/plugins/magic-link)
- [plugins/username](https://www.better-auth.com/docs/plugins/username)
- [plugins/captcha](https://www.better-auth.com/docs/plugins/captcha)
- [plugins/have-i-been-pwned](https://www.better-auth.com/docs/plugins/have-i-been-pwned)
- [plugins/i18n](https://better-auth.com/docs/plugins/i18n)
- [concepts/typescript](https://www.better-auth.com/docs/concepts/typescript) (additional fields, `inferAdditionalFields`)
- [reference/options](https://www.better-auth.com/docs/reference/options)
- [reference/faq](https://www.better-auth.com/docs/reference/faq) (cannot remove `name`/`image`/`email`)
- [reference/telemetry](https://www.better-auth.com/docs/reference/telemetry)
- [guides/optimizing-for-performance](https://www.better-auth.com/docs/guides/optimizing-for-performance)
- [pricing](https://www.better-auth.com/pricing)
- [infrastructure/services/sms](https://better-auth.com/docs/infrastructure/services/sms)

Shipped source, read from the published npm tarballs: `better-auth@1.6.29`,
`@better-auth/core@1.6.29`, `@better-auth/utils@0.4.2` — notably `dist/db/get-tables.mjs`,
`dist/context/create-context.mjs`, `dist/api/routes/{sign-in,sign-up,password,session,email-verification}.mjs`,
`dist/api/rate-limiter/index.mjs`, `dist/crypto/*`, `dist/plugins/{organization,admin,phone-number,two-factor,email-otp,magic-link}/*`.

Also `@better-auth/drizzle-adapter@1.6.29` (`dist/index.mjs`, `dist/index.d.mts`) and
`@better-auth/cli@1.4.21` (`dist/index.mjs`, `dist/generators-*.mjs`), the latter **executed** against
three real configs to capture verbatim generator output for `provider: "pg"` with default / `"uuid"` /
`"serial"` ID strategies.

npm registry metadata: `npm view better-auth@1.6.29`, `@better-auth/drizzle-adapter`,
`@better-auth/cli`, `auth`, `@better-auth/i18n`, `drizzle-orm`, `drizzle-kit`.

Third-party pricing (fetched 2026-08-15):
[Twilio SMS Colombia](https://www.twilio.com/en-us/sms/pricing/co),
[Twilio WhatsApp](https://www.twilio.com/en-us/whatsapp/pricing),
[Meta WhatsApp pricing](https://developers.facebook.com/docs/whatsapp/pricing/),
[Meta authentication-international rates](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/authentication-international-rates/).
</content>
</invoke>
