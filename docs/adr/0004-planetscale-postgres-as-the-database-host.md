# PlanetScale Postgres as the database host

Staging and production each run a **PS-5 single-node PlanetScale Postgres database in AWS
us-east-1, $10.00/month total**. The research behind this is in `docs/research/postgres-host.md`
(issue #4); prices were observed 2026-08-15.

## Why

The whole stack has a hard **$25/month** ceiling, so the deciding property was budget *certainty*
rather than the lowest expected bill. Neon Launch can come in cheaper, but it is usage-based with no
natural ceiling — one runaway crawler or cron turns a $9 month into a $25 month and the rest of the
stack has nowhere to go. $5 + $5, invariant, is worth more here than a number that is sometimes
lower.

Two secondary factors mattered enough to record. **PITR is included** rather than a ~$100/month
add-on as on Supabase, and a database holding real personal data under Ley 1581 (issue #5) should
not have point-in-time recovery be the thing that gets cut for budget. And there is **no
scale-to-zero**, so no cold starts — Neon only fits the budget _with_ scale-to-zero enabled, which
makes a ~350 ms cold start a permanent feature of the affordable configuration.

## Accepted risks

- **No high availability.** Single node, no replica, no automatic failover; node loss means downtime
  until PlanetScale recovers it. HA is $15/month per environment, which does not fit today. Revisit
  when there are users who would notice.
- **2-day backup retention**, the shortest of the viable options. The real RPO is issue #15's to set.
- **Branching is $5/month per branch**, where Neon gives 10 copy-on-write branches free. If the
  workflow turns out to want a database per pull request, that alone justifies reopening this.
- **512 MB RAM and 1/16 vCPU.** PS-10 single-node at $10/month is the next step up.

## Consequence

$10 of the $25 budget is committed, leaving roughly $15 for application hosting, transactional email
(issue #6 found SMS to +57 is the expensive channel, not email) and error tracking.
