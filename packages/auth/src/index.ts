/**
 * `@repo/auth` — tier 1 of ADR-0006's DAG. The Better Auth server instance and its config.
 *
 * **This entry point is the seam.** ADR-0006's `exports` map admits exactly this file, so nothing
 * else in the package is reachable — enforced by Node resolution and TypeScript, with no linter
 * involved.
 *
 * Three things are worth knowing before reading further:
 *
 * - **This package owns configuration, not tables.** `packages/db/src/schema/auth.ts` is written by
 *   `pnpm --filter @repo/auth generate-schema` and is generator-owned; drizzle-kit still owns every
 *   DDL statement (ADR-0004). A hand-edit there is reverted by the next run with no diff anyone
 *   reads.
 * - **It sends nothing.** Tier 1 cannot reach `@repo/notifications` at tier 4, so the two
 *   authentication emails arrive as an injected `AuthMailer` and `apps/web` wires the outbox into
 *   it.
 * - **It does not create a `Person`.** ADR-0002 keeps the domain and Better Auth apart at exactly
 *   one column, and ADR-0007 puts the `persons` row *before* the `users` row. The orchestration is
 *   the `signUp` use case in `apps/web`; what lives here is the hook that refuses a session to a
 *   `users` row the use case never finished linking.
 */

export {
  createAuth,
  type Auth,
  type AuthMailer,
  type CreateAuthOptions,
  type Session,
} from "./auth";
export { MODEL_NAMES } from "./models";
