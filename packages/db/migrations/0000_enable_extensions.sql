-- Extensions are created by a migration rather than by a container init script, so that local
-- Docker, staging and production get them through the one mechanism drizzle-kit already owns
-- (ADR-0004). An init script under /docker-entrypoint-initdb.d would run only on a brand-new
-- volume, leaving every existing developer database behind the moment this list changes, and it
-- would have no counterpart on PlanetScale at all.
--
-- A PlanetScale-specific hazard from docs/research/postgres-host.md sits nearby but is NOT solved
-- here: **extensions are not restored from a backup** and must be reinstalled. Re-running
-- migrations does *not* do it — a restore brings back drizzle.__drizzle_migrations too, which
-- already records this file as applied, so `drizzle-kit migrate` reports nothing to do and every
-- query needing pg_trgm or unaccent then fails at runtime. Post-restore recovery has to run these
-- statements explicitly. #15 owns writing that into a runbook.
--
-- Both are native extensions on PlanetScale Postgres — plain CREATE EXTENSION, no dashboard step.

-- Trigram matching. ADR-0014 puts none of trigram, full-text or external search in the *search*
-- path — search is a btree on publication_skills — but the typeahead over the seeded skill,
-- denomination and municipality lists still wants it.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Diacritic stripping, for the precomputed `search_text` ADR-0014 writes at seed time so that
-- `atencion` matches `atención`. Never called in a query.
CREATE EXTENSION IF NOT EXISTS unaccent;
