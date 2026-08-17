/**
 * Adds ADR-0024's migration timeouts to a Postgres URL, and prints the result.
 *
 * `drizzle-kit migrate` builds its pool from `connectionString` alone — `packages/db/
 * drizzle.config.ts` passes `dbCredentials: { url }`, and drizzle-kit's `pg` path ignores every
 * other field on that object — so there is no configuration file these can live in. They ride on
 * the URL, where `pg-connection-string` turns `?options=` into the `options` startup parameter.
 *
 * `lock_timeout` is the one that matters. Without it a migration that queues behind a long-running
 * query does not merely wait: every query arriving afterwards queues *behind the migration*,
 * because Postgres orders lock requests. That is how a routine index build becomes a full stall.
 * With it, the migration fails instead — and a failed migration applies nothing at all, because
 * drizzle-kit wraps the whole batch in one transaction.
 *
 * Both numbers are deliberate guesses against an application with no traffic, recorded as such in
 * ADR-0024's accepted risks. Anything that legitimately needs longer is an out-of-band operation
 * under that ADR, never a migration.
 *
 * Writes only to stdout, so the caller captures it into an environment variable rather than a log.
 */
const LOCK_TIMEOUT = "5s";
const STATEMENT_TIMEOUT = "120s";

const input = process.argv[2];

if (!input) {
  console.error("usage: with-migration-timeouts.mjs <postgres-url>");
  process.exit(1);
}

const url = new URL(input);

// Appended to whatever the connection string already carries, rather than assigned: a URL that
// already sets `options` is a deliberate act by whoever wrote the secret, and silently discarding
// it would be worse than the timeouts being absent.
const existing = url.searchParams.get("options");
const timeouts = `-c lock_timeout=${LOCK_TIMEOUT} -c statement_timeout=${STATEMENT_TIMEOUT}`;

url.searchParams.set("options", existing ? `${existing} ${timeouts}` : timeouts);

process.stdout.write(url.toString());
