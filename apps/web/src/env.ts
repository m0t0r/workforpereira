import { loadWorkspaceEnv } from "@repo/db";

/**
 * The secrets and origins `apps/web` needs, read **once, lazily, and never at module scope**.
 *
 * Lazy for the same reason `getDb()` is: `next build` in CI has no root `.env` and loads every
 * route's module graph to prerender, so a throw at import time would fail the whole build over a
 * route that never signs anybody in. Deferring to first call keeps the failure where it belongs — at
 * the request that actually needed the value.
 *
 * In a deployed environment every one of these comes from Fly secrets (ADR-0005) and the `.env` walk
 * finds nothing.
 */

function required(name: string, help: string): string {
  loadWorkspaceEnv();

  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. ${help}`);
  return value;
}

/**
 * The application's own origin — `https://encuentra.example`, never `…/api/auth`.
 *
 * Set explicitly and never inferred. Better Auth 1.7 resolves its base URL from the `Host` header in
 * dynamic deployments unless one is given, and behind Fly's proxy that is whatever the request
 * claimed it was. It is also what an emailed link points back at, so a wrong value here is a
 * verification mail nobody can use.
 */
export function appUrl(): string {
  return required(
    "APP_URL",
    "It is the origin this application is served from, e.g. http://localhost:3000 in development.",
  );
}

/** Signs the session cookie and the stateless email-verification token. */
export function betterAuthSecret(): string {
  return required(
    "BETTER_AUTH_SECRET",
    "Generate one with `pnpm dlx auth@latest secret`. Rotating it signs every session out.",
  );
}

/**
 * ADR-0021's HMAC key for `consents.subject_key`.
 *
 * **It can never be rotated.** Re-hashing would need plaintext we no longer hold, so losing it makes
 * every surviving consent proof unverifiable — the same class of problem as a backup that restores
 * the database without its extensions. Generate it once, properly, and put it somewhere it will
 * outlive this application.
 */
export function subjectKeySecret(): string {
  return required(
    "CONSENT_SUBJECT_KEY_SECRET",
    "Generate one with `openssl rand -base64 48`. It can never be rotated: losing it makes every " +
      "surviving consent proof unverifiable.",
  );
}
