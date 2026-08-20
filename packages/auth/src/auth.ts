import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { Db } from "@repo/db";
import { persons } from "@repo/db/schema";
import { betterAuth, type BetterAuthOptions, type BetterAuthPlugin } from "better-auth";
import { eq } from "drizzle-orm";

import { MODEL_NAMES } from "./models";

/**
 * How an authentication email leaves the platform, as a **parameter**.
 *
 * `@repo/auth` is tier 1 and `@repo/notifications` is tier 4 — ADR-0006's DAG forbids the import
 * outright, and pnpm would refuse to resolve it. So the two callbacks Better Auth needs are handed
 * in by `apps/web`, which sits above both and is the only place allowed to know about both.
 *
 * That is ADR-0035's "the dependency is a parameter" one level up from the HTTP transport, and it
 * buys the same thing here: this package can be reasoned about, and eventually tested, without a
 * mail provider existing.
 *
 * **Only the token crosses.** Not a rendered body, not a URL — the outbox row carries a token and
 * the template composes the link, which is what keeps ADR-0015's "a notification has no body" true
 * for authentication mail as well. See `notification_outbox.token`.
 */
export interface AuthMailer {
  /** Better Auth's `sendVerificationEmail`, reduced to the two things the outbox stores. */
  sendVerification(input: { email: string; token: string }): Promise<void>;
  /** Better Auth's `sendResetPassword`, likewise. */
  sendPasswordReset(input: { email: string; token: string }): Promise<void>;
}

export interface CreateAuthOptions {
  /**
   * The pool singleton, handed in rather than reached for.
   *
   * Better Auth is the one component that legitimately holds a handle of its own: the audit
   * establishes there is no documented way to enlist `signUpEmail` in a transaction we opened
   * (`DrizzleAdapterConfig.transaction` governs Better Auth's *own*), which is the fact ADR-0007's
   * person-before-user ordering exists to survive.
   */
  readonly db: Db;
  /**
   * The application's own origin — `https://encuentra.example`, not `…/api/auth`.
   *
   * Set explicitly and never inferred. Better Auth 1.7 resolves the base URL from the `Host` header
   * in dynamic deployments unless one is given, and behind Fly's proxy that is whatever the request
   * claimed.
   */
  readonly baseURL: string;
  /** `BETTER_AUTH_SECRET`. Signs the session cookie and the stateless verification token. */
  readonly secret: string;
  readonly mailer: AuthMailer;
  /**
   * Plugins the *host framework* supplies, appended after ours.
   *
   * This exists for exactly one thing today: `nextCookies()` from `better-auth/next-js`, which
   * **must be the last plugin in the array** or cookies set from a Server Action never persist. It
   * is a parameter because it imports `next/*`, and a tier-1 domain package that imports Next is a
   * package `apps/web` can no longer be the only consumer of.
   */
  readonly plugins?: readonly BetterAuthPlugin[];
}

/** Thirty days (ADR-0009), in seconds. */
const SESSION_EXPIRES_IN = 60 * 60 * 24 * 30;

/**
 * The Better Auth instance, configured to the decisions rather than to the defaults.
 *
 * Nearly every option below is set because the default is wrong for us, and each one names the ADR
 * or the audit finding that makes it wrong. A default that happens to be right is still set
 * explicitly where the audit found the docs and the shipped source disagreeing about what it is.
 */
export function createAuth(options: CreateAuthOptions) {
  const config = {
    appName: "Encuentra",
    baseURL: options.baseURL,
    secret: options.secret,

    database: drizzleAdapter(options.db, { provider: "pg" }),

    // ADR-0008's plural rename, and the only thing we decide about these four tables.
    ...MODEL_NAMES,

    session: {
      ...MODEL_NAMES.session,

      // ADR-0009: thirty days, because short sessions for everyone would punish the majority on
      // their own phone to protect a minority, and frequent re-authentication is worse for low
      // digital literacy rather than better. The default is seven.
      expiresIn: SESSION_EXPIRES_IN,

      /**
       * **Off, and `refreshCache` is the reason** (ADR-0009).
       *
       * The audit found that with the cache on *and* `refreshCache: true` it re-issues itself
       * statelessly, so a revoked-but-actively-used session can be honoured for up to the full
       * `expiresIn` — thirty days, here — with no database check at all. A session we cannot revoke
       * is not one `/my-data` can honestly promise to revoke.
       *
       * Leaving the whole cache off rather than enabling it with `refreshCache: false` is the
       * stronger form of the same decision: it costs a session read per authenticated request, and
       * ADR-0032 already names that read as the price of being able to revoke.
       */
      cookieCache: { enabled: false },
    },

    emailAndPassword: {
      enabled: true,

      /**
       * **False, deliberately** (ADR-0009): *verification gates publishing, not sign-in.*
       *
       * Blocking sign-in strands someone whose verification mail landed in spam with nothing to
       * look at. A `Publication` may not go live and an `Offer` may not be sent from an unverified
       * address — those gates belong to the tickets that build them, and this is the switch that
       * would take the decision away from them.
       */
      requireEmailVerification: false,

      /**
       * **False, and this is the enumeration posture, not an ergonomic choice** (ADR-0009).
       *
       * The audit found the default configuration *enumerable*: Better Auth returns the hardened
       * fake-success payload for an already-registered address only when `requireEmailVerification`
       * is true **or** `autoSignIn` is false. The line above rules the first out, so this one has to
       * carry it. *"Does this person have an Encuentra account"* is itself a signal about someone's
       * employment situation, which is why this matters more here than on an ordinary product.
       *
       * The cost is one extra step: after signing up, a person signs in with the password they just
       * chose.
       */
      autoSignIn: false,

      minPasswordLength: 8,

      /**
       * **True, against the default.** Password reset is ADR-0009's recovery floor and the thing an
       * account takeover would go through; leaving other sessions alive after one would mean the
       * person who just proved mailbox control still shares the account with whoever prompted the
       * reset.
       */
      revokeSessionsOnPasswordReset: true,

      /**
       * One hour, which is Better Auth's default, set explicitly because the reasoning is ours.
       *
       * Shorter than the verification window below and deliberately so: this token *changes a
       * credential*, where that one only marks an address verified. A person who misses the hour
       * asks for another link, and `/request-password-reset` never refuses them — ADR-0032's
       * failed-sign-in counter is explicitly barred from reaching password reset.
       */
      resetPasswordTokenExpiresIn: 60 * 60,

      sendResetPassword: async ({ user, token }) => {
        await options.mailer.sendPasswordReset({ email: user.email, token });
      },
    },

    emailVerification: {
      /**
       * Set explicitly because it does not mean what it looks like: `sendOnSignUp` *falls back to*
       * `requireEmailVerification`, which is false above — so without this line, verification mail
       * would silently never be sent and the recovery floor ADR-0009 rests on would not exist.
       */
      sendOnSignUp: true,

      /**
       * **The audit's gap 2, decided rather than inherited.** Better Auth's options reference says
       * this defaults to `true` and its shipped source implies `false`. Either way it is `false`
       * here, for the same reason `autoSignIn` is: a link arriving from a mailbox is not a sign-in
       * gesture, and the person may be reading it on a different device from the one they signed up
       * on.
       */
      autoSignInAfterVerification: false,

      /**
       * Twenty-four hours, against a default of one.
       *
       * The token is a **stateless HS256 JWT** (audit §5.3) — not stored, not single-use and not
       * revocable — so a longer window is a genuinely longer replay window, and it is accepted
       * because of what the replay buys: the handler early-returns once the address is already
       * verified, so the whole of the exposure is *marking an address verified a second time*. Set
       * against that, an hour is a real barrier for an audience reading mail on a shared phone,
       * possibly out of a spam folder, and being locked out is the failure ADR-0009 spends the most
       * to avoid.
       */
      expiresIn: 60 * 60 * 24,

      sendVerificationEmail: async ({ user, token }) => {
        await options.mailer.sendVerification({ email: user.email, token });
      },
    },

    databaseHooks: {
      session: {
        create: {
          /**
           * **No session for a `users` row with no `persons` row** — ADR-0007 names this hook by
           * name, and the audit confirms it can block sign-in.
           *
           * It guards the window the person-before-user ordering opens. Our transaction writes
           * `persons` and its `consents` rows, then calls `signUpEmail`, then links the two; a crash
           * in the middle leaves a `users` row that is owned by nobody, covered by no erasure path
           * and, without this, able to sign in. ADR-0008 is blunt about what that row is: *"owned by
           * nobody and covered by no erasure path"*.
           *
           * It is a **read of another module's table from tier 1**, which ADR-0006 allows — the DAG
           * constrains logic, not SQL, and cross-module reads are expected. The alternative was
           * putting the guard in `apps/web`, where every future sign-in path would have to remember
           * it.
           *
           * The refusal is not permanent for the honest case: ADR-0007's sweep deletes unlinked
           * `persons` rows after an hour, and a retry re-links by email.
           */
          before: async (session) => {
            const [person] = await options.db
              .select({ id: persons.id })
              .from(persons)
              .where(eq(persons.userId, session.userId))
              .limit(1);

            if (!person) {
              // Returning `false` refuses the session. Throwing would surface as a 500 and tell the
              // person nothing; this is the documented refusal.
              return false;
            }
            return;
          },
        },
      },
    },

    /**
     * **No `@better-auth/i18n`, and its removal is the decision.**
     *
     * This package used to install it with `locales.es`, so Better Auth's `$ERROR_CODES` came back
     * from the API already translated. The argument was that ADR-0001 confines Spanish to what a
     * user reads and an auth error *is* read by a user. That argument is wrong, and ADR-0001 as
     * amended says so: **an API error is not UI copy.** It is read by a log line, an alert, a Sentry
     * issue and an operator long before any of it reaches a person, and translating it at the
     * boundary makes every one of those Spanish too — a stack of observability nobody can grep in the
     * language the code is written in.
     *
     * So the API speaks English and **the UI owns the translation**. Better Auth returns a stable
     * `code` on every error — `INVALID_EMAIL_OR_PASSWORD`, `TOKEN_EXPIRED`, `USER_ALREADY_EXISTS` —
     * and `apps/web` maps those codes to Spanish at the point of rendering. That is strictly better
     * than a translated message even ignoring the logs: a code is matchable, a sentence is not, and
     * the UI can say something different from the provider's wording where the product needs it to.
     *
     * It also removes the `BetterAuthPlugin[]` cast this array used to need. `i18n()`'s return type
     * referenced a hashed internal module of `@better-auth/i18n`, and because every domain package
     * here is JIT (ADR-0006) that surfaced as `TS4058` in `apps/web` rather than here.
     */
    plugins: [
      // Framework plugins last — `nextCookies()` in particular is documented as having to be, and
      // silently breaks Server Action cookies when it is not.
      ...(options.plugins ?? []),
    ],

    /**
     * **`advanced.ipAddress.ipAddressHeaders` is deliberately not set here**, and its absence is a
     * decision rather than an omission.
     *
     * ADR-0032 specifies `["cf-connecting-ip", "fly-client-ip"]` — but it specifies them *together
     * with* the origin gate that makes them safe: a transform rule at Cloudflare sets a shared
     * secret header, and `proxy.ts` 404s anything arriving without it. Neither exists yet, and no
     * zone is provisioned. Trusting `cf-connecting-ip` before the gate exists means a direct request
     * to the `.fly.dev` host can name its own client address, which is the precise hazard that ADR
     * describes. Nothing reads the value today anyway: the rate limiter it exists for is that ADR's
     * ticket, not this one.
     */
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];
