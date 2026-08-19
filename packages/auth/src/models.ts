import type { BetterAuthOptions } from "better-auth";

/**
 * The **only** thing about Better Auth's own tables that this repository decides: their names.
 *
 * ADR-0008 remaps all four to plural so the database is not half `user` and half `persons`, and it
 * dodges a real annoyance for free — `user` is a reserved word in Postgres and has to be quoted
 * everywhere, where `users` need not be. ADR-0003 refuses to own the columns through Better Auth
 * upgrades, so this is *configuration*, not hand-written DDL: `auth generate` reads it and emits the
 * table under the new name.
 *
 * The **model** names stay singular — `user`, `session`, `account`, `verification` — because that
 * is what Better Auth's own documentation and error messages say. Only the physical table is
 * renamed.
 *
 * This lives in its own file because two configs need it and they may not import each other: the
 * runtime instance in `auth.ts`, which needs a real database handle, and the generator config in
 * `schema-config.ts`, which must load with no database at all (see that file).
 *
 * **There are no `additionalFields`, deliberately.** ADR-0002 puts every domain column on `persons`
 * and lets the domain touch Better Auth in exactly one place — `persons.user_id`. A profile field
 * added here would be a second place, owned by a generator that overwrites its whole output file.
 */
export const MODEL_NAMES = {
  user: { modelName: "users" },
  session: { modelName: "sessions" },
  account: { modelName: "accounts" },
  verification: { modelName: "verifications" },
} as const satisfies Pick<BetterAuthOptions, "user" | "session" | "account" | "verification">;
