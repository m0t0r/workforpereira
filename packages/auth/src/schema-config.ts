import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";

import { MODEL_NAMES } from "./models";

/**
 * The config `auth generate` reads, and **nothing else ever imports it**.
 *
 * `pnpm --filter @repo/auth generate-schema` runs
 * `auth generate --config ./src/schema-config.ts --output ../db/src/schema/auth.ts --yes`, which
 * writes `users`, `sessions`, `accounts` and `verifications` as a Drizzle schema file. That file is
 * **generator-owned**: `generate` is a whole-file overwrite for Drizzle and never a merge
 * (`docs/research/better-auth-audit.md` §3.2), so nothing hand-written may live in it and our own
 * tables live in their own files beside it.
 *
 * **The adapter is handed no database, and that is the point.** The generator reads
 * `getAuthTables(options)` plus the adapter's own options and opens no connection at all — verified
 * in the audit against `drizzleAdapter({} as any, { provider: "pg" })`. Passing the real handle
 * would make this file import `@repo/db/schema`, which re-exports the very file the generator is
 * about to write: a bootstrap cycle where the schema cannot be generated until it already exists.
 *
 * What the generator actually needs is `provider` and the model names, which is exactly what is
 * here. `auth.ts` holds everything else, because none of it changes a column.
 *
 * `drizzle-kit` still owns every DDL statement (ADR-0004): the loop is `generate-schema` →
 * `pnpm db:generate` → review the SQL → `pnpm db:migrate`. `auth migrate` is Kysely-only and would
 * refuse us anyway.
 */
export const auth = betterAuth({
  // `as never` rather than a real handle: the parameter is unused on this path and there is nothing
  // honest to put here. See above for why passing the singleton is not an option.
  database: drizzleAdapter(undefined as never, { provider: "pg" }),
  ...MODEL_NAMES,
});
