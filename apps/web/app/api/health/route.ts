/**
 * Readiness probe for Fly's health check (ADR-0022).
 *
 * **It does not touch the database, deliberately.** `docs/research/observability.md` records that
 * Fly health checks gate routing and notify nobody, so a database-dependent probe would turn a
 * transient connection blip into a machine that stops receiving traffic — silently, and under
 * autostop, into a restart loop. UptimeRobot is the monitor; this endpoint answers only "is the
 * process up and serving".
 */
export function GET(): Response {
  return Response.json({ status: "ok" });
}
