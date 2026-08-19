import { createAuth, type Auth } from "@repo/auth";
import { getDb } from "@repo/db";
import { enqueueNotification } from "@repo/notifications";
import { nextCookies } from "better-auth/next-js";

import { appUrl, betterAuthSecret } from "./env";

/**
 * The one configured Better Auth instance, and **the only place in the repository where tier 1 and
 * tier 4 meet**.
 *
 * `@repo/auth` cannot import `@repo/notifications` — ADR-0006's DAG forbids it and pnpm would refuse
 * to resolve it — so the two authentication emails arrive there as an injected `AuthMailer`. This
 * file is what supplies it, because `apps/web` sits above both and is the only thing allowed to know
 * about both.
 *
 * Built lazily and cached on `globalThis`, for the same two reasons `getDb()` is: Next builds a
 * fresh module graph on every HMR reload, so a module-scope instance leaks one per edit; and
 * `betterAuthSecret()` throws when the secret is unset, which would make merely importing this file
 * fail `next build` in CI for routes that never authenticate anybody.
 */
const globalForAuth = globalThis as typeof globalThis & { authInstance?: Auth };

export function getAuth(): Auth {
  globalForAuth.authInstance ??= createAuth({
    db: getDb(),
    baseURL: appUrl(),
    secret: betterAuthSecret(),

    /**
     * **Both callbacks queue a row; neither sends.** ADR-0015's outbox is the whole point: the email
     * leaves because a row exists, so a provider outage becomes a retry rather than a person who
     * can never verify their address. Better Auth calls these outside any transaction of ours, which
     * is fine — there is nothing here to roll back with.
     *
     * Only the token crosses. The template composes the link (see `notification_outbox.token`), so
     * nothing in this file knows the shape of a URL.
     */
    mailer: {
      sendVerification: async ({ email, token }) => {
        await enqueueNotification(getDb(), {
          recipientEmail: email,
          template: "email_verification",
          token,
        });
      },
      sendPasswordReset: async ({ email, token }) => {
        await enqueueNotification(getDb(), {
          recipientEmail: email,
          template: "password_reset",
          token,
        });
      },
    },

    // **Last, and it has to be.** Without `nextCookies()` at the end of the plugin array, cookies
    // set from a Server Action never persist — Server Actions need Next's own `cookies()` helper,
    // and this is the plugin that reaches for it.
    plugins: [nextCookies()],
  });

  return globalForAuth.authInstance;
}
