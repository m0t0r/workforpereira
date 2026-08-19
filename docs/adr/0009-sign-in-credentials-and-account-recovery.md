# Sign-in is Google, Facebook or a password, and a verified email is the only way back in

Three credentials, one signup form, and no manual identity recovery. The shape is forced less by
authentication design than by Ley 1581: consent must be _previa_, so nothing about a social login
may happen before our own form has been submitted.

The #3 audit deliberately excluded social and OAuth providers (`better-auth-audit.md` §12.13), so the
provider facts below were established for this decision on 2026-08-16 and are dated accordingly.

## The credential set

**Google, Facebook, and email + password.** Nothing else in v1.

**Google** is near-frictionless on Android and is the dominant credential in the
offering-work-from-abroad cohort. **Facebook** is Colombia's largest social platform — StatCounter
puts it at 43.97% of Colombian social referrals in July 2026, ahead of YouTube (25.56%) and Instagram
(20.36%) — and, unlike WhatsApp, it costs nothing to adopt: `email` and `public_profile` are
**auto-granted standard access with no App Review and no Business Verification**. That matters
because #6 found Meta's WhatsApp verification wall eventually requires a registered entity, and the
business shape is still undecided and out of this map's scope. Facebook Login does not hit that wall.

**Email and password is not a convenience feature.** It is the recovery floor, and it is the only
path for someone who has no Google account or who will not hand Meta a login. It is also the reason
a lost provider is survivable — see _Recovery_.

**Never request any Meta permission beyond `email` and `public_profile`.** That boundary is what
keeps us permanently clear of App Review and Business Verification, and it is a standing constraint,
not a launch shortcut.

**Instagram is excluded.** It is not a Better Auth built-in provider, so it would mean a Generic
OAuth integration — and an Instagram user is a Meta user already reachable through Facebook Login.
Integration work for zero additional reach.

**Microsoft is excluded.** `tenantId: 'common'` does reach personal Hotmail and Outlook.com accounts,
but Better Auth's own documentation warns that Entra _"does not emit the `email` claim for managed
users by default"_. `users.email` is `NOT NULL UNIQUE` — the audit's _"single most consequential fact
for #14"_ — so Microsoft reintroduces the synthetic-email problem that disqualified phone-only
sign-in. The remedy would be `profile.oid` as the identity anchor, which is a second identity model.

**Magic link is excluded**: it adds no reach we do not already have once we are sending mail anyway.

## Telling Meta and Google who our users are

Every Facebook login discloses to Meta that this person uses Encuentra. That is acceptable **because
of a decision this map already made**: earthquake-affected status is never collected, and the
earthquake appears on the landing page only, never as a per-person claim. The inference available to
Meta is therefore _"uses a work platform"_ — what a LinkedIn user signals openly — and not _"is a
disaster victim"_. **If that given ever softens, this decision must be reopened.**

The provider list is named in the _aviso de privacidad_.

## Consent precedes the redirect

ADR-0007 put four unticked consent boxes on `/signup` and wrote the `persons` row **before** the
Better Auth `users` row, in one form with one submit. OAuth inverts that order: Better Auth creates
the user inside `GET /api/auth/callback/:id`, where there is no form payload.

Letting the user row be created first and asking for consent afterwards **is not available**. Art. 9
requires _autorización previa_, and writing that row is already _tratamiento_ — an email, a name and
a provider id, held for a _finalidad_ that does not exist yet. Someone who closes the tab on a
post-hoc consent screen leaves us holding personal data we were never authorised to hold. ADR-0008
sharpens the same point from the other side: with hard deletes, `RESTRICT` by default and no
`deleted_at`, a `users` row with no `persons` row and no `consents` row is **owned by nobody and
covered by no erasure path**.

Carrying the consent through the OAuth `state` parameter is also unavailable. Better Auth's
documentation is explicit that state data _"comes from the client and should not be trusted"_, and
untrusted data is precisely what art. 9 evidence may not be.

So: **`/signup` posts to our own server action first.** That action writes a short-lived
pending-signup record — the consent decisions, the full name, the date of birth — and returns the
provider authorize URL. Only an **opaque id** for that record travels in the OAuth state.
`databaseHooks.user.create.before` resolves the id and **refuses to create the user** if it is
missing or expired.

The invariant survives intact: **no `users` row ever exists without consent.**

> **Better Auth 1.7 adds a gate built for exactly this, and the rule does not move — only the seam
> might** (2026-08-19, `better-auth-audit.md` §0.1(4)). `user.validateUserInfo` runs **before**
> `databaseHooks.user.create.before` and is called for `create-user`, `link-account` and a returning
> OAuth `sign-in`, across every authentication method. It is worth preferring here for three reasons a
> database hook cannot give: it **fails closed** — a hook that throws, or a missing endpoint context,
> rejects rather than admits, which is the posture art. 9 evidence needs; it names its own
> `source.method` (`"oauth"`, `"email-password"`, `"admin"`, …), so the refusal can be **scoped to the
> OAuth path** instead of inspecting the request to work out which path it is on; and it also covers
> **`link-account`**, which `user.create.before` never sees because linking writes no `users` row.
> Whichever seam holds it, **the rule is the one above** — no user without a pending-signup record —
> and ADR-0017's invariant is written against the rule, not the hook. Two cautions: the option is
> marked in-source for a rename to `validateUser`, and it needs an endpoint context, so it cannot be
> the guard for anything written outside a request.

### The narrow amendment to ADR-0007

On the OAuth path the literal person-before-user ordering is impossible — we do not know the email
until the callback. `persons` is therefore created in `user.create.after`, in the same hook, with
consent already proven by the pending-signup record. ADR-0007's _reason_ is preserved exactly; only
its sequence changes, and only for OAuth. The password path is unchanged.

## One signup form for everyone

> **The box count follows ADR-0016.** This ADR was written when `suggestions` was a Purpose consented
> at signup. ADR-0016 dropped it from the v1 set, so the form carries **four** consent boxes, not
> five. The required three are unchanged and nothing else in this ADR moves — it is the same form,
> one row shorter.

`/signup` asks for full name, date of birth, three required consent boxes and one optional one — and
_then_ offers Google, Facebook or a password. **Social login saves you a password and gives us a
pre-verified email. It does not shorten the form.**

This is forced rather than chosen. Consent must precede the redirect, and `persons.date_of_birth` is
required by ADR-0007 — providers do not reliably supply a birth date, and ADR-0007 wants evidence of
_what we asked_. Rendering the form before the redirect means there is no provider profile to prefill
from, so **the name is always typed by the person**. `mapProfileToUser` writes that authored name into
`users.name`; the provider's version never lands. A Facebook display name is frequently a nickname,
and this is the string a stranger reads on an offer.

What this buys: one form, one code path, one consent record, no interstitials, no half-built accounts.
Sign-_in_ for a returning user remains one tap.

**Google One Tap and auto-select are disabled**; `prompt: "select_account"` forces the chooser. The
decisive argument is consent, not ergonomics — One Tap can sign in whatever account a borrowed phone
already holds, which would record a Ley 1581 authorisation against a person who never saw the form.
Forcing the chooser also makes the shared-device case visible to the person using it.

## A phone number is a contact detail, not a credential

Not collected at signup; optional on the profile, asked for when there is a reason to ask.

The audit found `phoneNumber` forces a synthetic email, stores OTPs in **plaintext** with no
`storeOTP` option, and that `/sign-in/phone-number` is not passwordless despite its name. #6 found
SMS to +57 consumes the entire infrastructure budget at roughly 500 messages/month, and WhatsApp
authentication templates carry fixed English boilerplate on a Spanish-language product and deliver
**only to a primary WhatsApp device**.

Collecting numbers early would also breach data minimisation: every field needs a _finalidad_, and
_"we might build OTP someday"_ is not one of ADR-0007's seven.

**The migration path onto WhatsApp OTP does not disturb the identity model.** `users.email` remains
the identity anchor in every future shape, so WhatsApp arrives as a plugin plus a verified-number
flag on an existing account — never as a new kind of account. It costs nothing to defer, because
OTP requires a _verified_ number and would run its own verification pass regardless; unverified
numbers banked a year early buy no head start.

## Recovery, and the lockout we accept

**Every account carries a real, deliverable, verified email — including OAuth accounts.**

The lever is the audit's §5.4 finding: password reset **creates a `credential` account for a user who
had none**. A verified email is therefore a universal recovery path that still works when the OAuth
provider is lost. The same finding is a threat — anyone with mailbox access can attach a password to
a social-only account — which is why a password may only ever be attached by someone already signed
in or who has proved mailbox control.

**Accounts auto-link across Google and Facebook when both sides are provider-verified.** Both assert
a verified email, so linking is safe and yields two doors instead of one. **Email and password is
never auto-linked.** After first sign-in the person is prompted to add a second way in — that prompt,
not any recovery desk, is the real defence against lockout.

> **Better Auth 1.7 hardens the ownership proof behind implicit linking, and it lands on the honest
> case as well as the attacker** (2026-08-19, `better-auth-audit.md` §0.1(5)).
> `accountLinking.requireLocalEmailVerified` defaults to `true` and is **already deprecated because
> the gate becomes unconditional next minor**: an IdP's `email_verified` claim counts as proof of
> ownership only when the **existing local row** is itself `emailVerified: true`. Against an attacker
> that is exactly right, and it closes a hole this ADR did not name — someone who pre-registers an
> unverified password account at a victim's address cannot have the victim's Google identity linked
> into it on first sign-in.
>
> But _verification gates publishing, not sign-in_, so an **unverified password account is a state we
> deliberately allow**, and a person in it who later signs in with Google is **refused rather than
> linked** — and `users.email` is unique, so no second account can be created either. They are stuck
> until they open the verification mail. That is defensible; what is not defensible is a screen that
> does not say so. **#70 and #71 inherit the copy**, and this ADR's second-method prompt is the thing
> that makes the state rare rather than the thing that resolves it.
>
> Two related switches: `accountLinking.disableImplicitLinking` (default `false`) turns implicit
> linking off entirely, which is **not** what this ADR wants; and social providers gained a
> per-provider `requireEmailVerification` (default `false`), which withholds the **session** when the
> provider reports the email unverified. Enabling it for Facebook is the tempting move and the
> dangerous one — Better Auth's own note is that several providers always report unverified, which
> would block every sign-in through that provider.

**We accept that some people will be locked out, and we build no manual identity-recovery process.**
Someone who loses both their email and their password cannot be readmitted, because we cannot tell
them from an attacker: we hold no identity document by design (#5 — no sensitive fields), no money
ever moved so there is no payment record, and the honest person's story is word-for-word the
attacker's. Adjudicating it by hand is an unstaffable fraud surface for a solo developer, and what a
successful attacker wins is someone else's work history, their contact details, and the power to
accept offers as them.

Three things make this survivable: a verified email on every account with plain Spanish at signup
saying _this is how you get back in_; the second-method prompt above; and the fact that a capability
profile is **knowledge, not accumulated capital** — with no money and no transaction history,
re-registering costs an afternoon of retyping, not years of standing.

**This decision has an expiry date.** The moment reputation accrues over time — in the map's fog
today — re-registration stops being cheap and this must be revisited. #24 already found the mirror
image: hard-delete a fraudster and they re-register tomorrow. Weak identity is one property with two
symptoms, and it makes lockout and banning unfixable together.

## Verification gates publishing, not sign-in

`requireEmailVerification` defaults to `false`. We leave sign-in open and gate the acts that reach
other people: **a `Publication` may not go live and an `Offer` may not be sent from an unverified
address.**

Blocking sign-in strands someone whose verification mail landed in spam with nothing to look at.
Blocking nothing lets a person build a profile behind a typo and then lose it with no recourse —
which would hollow out the recovery floor this ADR rests on. Gating publication also raises the cost
of throwaway accounts at exactly the surface #13 cares about. OAuth arrivals are verified on entry,
so this only ever bites the password path.

## Sessions

**30 days by default.** An explicit **unticked** _"Este no es mi dispositivo"_ at sign-in drops the
session to a few hours and skips the persistent cookie. Sign-out-everywhere lives in `/my-data`.

Short sessions for everyone would punish the majority on their own phone to protect a minority, and
frequent re-authentication is worse for low digital literacy, not better.

**`session.cookieCache.refreshCache` stays off.** The audit found that with it enabled a
_revoked_ session can be honoured for up to the full `expiresIn` — seven days — with zero database
checks. A session we cannot revoke within the 5-minute cache window is not one we can honestly
promise to revoke, and revocation is a promise `/my-data` makes.

## What we do not build in v1

**No 2FA.** It adds a second thing to lose to an audience already at risk of lockout, and it needs a
delivery channel this ADR has just declined to pay for.

**Signup enumeration is hardened explicitly.** The audit found the default configuration
_enumerable_: with `autoSignIn: true` and `requireEmailVerification: false`, signing up with a
registered address returns `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`. This matters more here than on an
ordinary product — _"does this person have an Encuentra account"_ is itself a signal about someone's
employment situation. The hardened path is set deliberately rather than inherited.

**Rate limiting is deferred to #15, with a flag.** Better Auth's limiter is IP-keyed, **in-memory
per-instance**, and **off in development**; there is no account lockout for password sign-in at all.
In-memory means it silently stops working the moment a second Fly machine exists.

> **Discharged by ADR-0032, and the accepted risk narrowed rather than inherited.** Storage becomes
> `"database"` — one table, $0, and no longer a no-op under ADR-0022's blue-green deploy. More
> importantly, ADR-0032 records that **IP-keyed limiting is not a defence against credential stuffing
> at all**, because rotating addresses is the attack, so this ADR's "no lockout" left one account
> guessable without bound. It adds a **per-address failed-sign-in counter**: ten failures in an hour
> open a **fifteen-minute refusal window** that any successful sign-in clears and that expires on its
> own. That is not the lockout refused below — **nobody has to be recovered**, which was this ADR's
> actual objection, and it **never refuses password reset**, only sign-in. It is keyed on an HMAC of
> the _submitted_ address (ADR-0021's `subject_key` derivation) so that it behaves identically whether
> or not an account exists, rather than becoming the enumeration signal this ADR hardened signup
> against.

## Cost

Social login is **$0 per signup**. The password path is one verification email plus occasional
resets — on SES Essentials at $0.16/1,000 (#6), about **$0.16 per 1,000 signups**. Against the
$4.46–$7.46 that #18 found actually remains of the $25 ceiling, auth messaging is a rounding error.

> **Amended by ADR-0035 — the figure is now $0.00, and the conclusion is unchanged.** Email sends
> through Resend's free tier, so the password path costs nothing rather than $0.16/1,000. This ADR's
> actual claim survives untouched and is only reinforced: auth messaging is a rounding error against
> the remaining budget. What ADR-0035 adds is a **ceiling** where SES had none — 100 sends per day,
> monitored at 80 — which this ADR's own traffic does not approach alone but shares with every other
> email in the product.

This holds _only_ because phone OTP was declined. At #6's verified SMS rate to +57, the same 1,000
signups cost **$50.87** — eight times the entire remaining budget.

## What this binds

- **ADR-0007 is amended**: `persons` is created in `user.create.after` on the OAuth path, consent
  proven by the pending-signup record. Its four checkboxes are joined on `/signup` by full name and
  date of birth, all carried server-side across the redirect.
- **#15** inherits the persisted-rate-limiter flag, and owns the fact that the in-memory default is a
  no-op behind more than one machine.
- **#22** owns whether the authored name is shown publicly, partially, or only after an offer is
  accepted. This ADR settles only that a person authors it and may edit it.
- **#13** inherits verification-gated publishing as an anti-throwaway lever, and #24's
  erasure-versus-ban question unchanged.
- **#9** inherits that an `Offer` may not be sent from an unverified address.

## Rejected

**A recovery desk, or any manual identity-verification path.** Covered above: unstaffable, and the
attacker's story is identical to the honest person's.

**Recovery codes shown at signup.** Correct in theory and near-zero uptake in practice with this
audience — it hands someone a fourth thing to lose. The second sign-in method does the same job in a
place people will actually act on.

**A trusted contact or second email at signup.** Same uptake problem, and it lengthens the one form
this ADR fought to keep short.

**An 18+ attestation checkbox instead of a date of birth.** Reconsidered here and rejected again on
ADR-0007's own reasoning: it is worth nothing the day a 16-year-old signs up and we must show what we
asked, and it is the _conducta inequívoca_ the SIC rejects for anything load-bearing.

**Redirecting first and prefilling our form from the provider profile.** Better UX, but holding that
profile server-side pending consent is itself _tratamiento_ — the thing this ADR just ruled out.

**Instagram, Microsoft, magic link, phone OTP, 2FA.** Each argued above.
