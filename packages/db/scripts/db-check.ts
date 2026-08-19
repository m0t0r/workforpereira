#!/usr/bin/env node
/**
 * `pnpm db:check` — the migration gate (ADR-0017, ADR-0024).
 *
 * Not Vitest, because these checks shell out to drizzle-kit and to git. Everything that decides
 * *whether something is a violation* lives in `../src/migration-gate.ts` and is unit tested there;
 * this file gathers the inputs and prints the result.
 *
 * Four checks:
 *
 * 1. **Drift** — generating on a clean tree emits nothing. A schema edit whose migration was never
 *    generated is caught at the pull request rather than at deploy.
 * 2. **Integrity** — `drizzle-kit check`, for collisions between snapshots.
 * 3. **Append-only** — no migration or snapshot already on the base branch is modified, deleted or
 *    renamed, and the journal only grows.
 * 4. **Destructive statements** — every new migration is scanned, and a match hard-fails unless it
 *    carries a marker naming a migration *already on the base branch*. `CREATE INDEX CONCURRENTLY`
 *    fails unconditionally.
 */

import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import {
  concurrentIndexViolations,
  destructiveViolations,
  editedMigrationViolations,
  journalViolations,
  type JournalEntry,
  type Violation,
} from "../src/migration-gate.ts";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const migrationsDir = join(packageRoot, "migrations");

/**
 * The drift check's scratch space, and the config that points drizzle-kit at it. Both are inside
 * the package and both are deleted afterwards.
 *
 * They are *relative* paths on purpose: drizzle-kit resolves `out` by prefixing `./`, so an
 * absolute temporary directory becomes `.//var/folders/…` and the run dies looking for a snapshot
 * that was never there.
 */
const SCRATCH = "node_modules/.cache/db-check";
const DRIFT_CONFIG = ".db-check.config.ts";

/**
 * `generate` and `check` never open a connection, but `drizzle.config.ts` reads `DATABASE_URL`
 * eagerly and throws when it is unset — and CI has no root `.env`, by design (ADR-0017: the test
 * lane needs no database service container). A placeholder that cannot resolve is safe here for
 * exactly that reason, and is deliberately not pushed into `drizzle.config.ts`, where `migrate`
 * and `studio` must go on failing loudly.
 */
const drizzleEnv = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? "postgres://db-check@127.0.0.1:1/db-check",
};

/**
 * Runs drizzle-kit and returns everything it said.
 *
 * The output is returned rather than discarded because **drizzle-kit exits 0 on some failures** —
 * a bad `out` path prints a stack trace and reports success. A drift check that reads "nothing was
 * emitted" off a crashed run is a gate that passes because it did not run, which is worse than no
 * gate at all.
 */
function drizzleKit(args: string[]): string {
  return execFileSync("pnpm", ["exec", "drizzle-kit", ...args], {
    cwd: packageRoot,
    env: drizzleEnv,
    encoding: "utf8",
    // stdin is closed rather than inherited: drizzle-kit prompts when it cannot tell a rename from
    // a create, and an unattended prompt is a hung CI job instead of a failed one.
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: packageRoot, encoding: "utf8" }).trim();
}

function tryGit(args: string[]): string | undefined {
  try {
    return git(args);
  } catch {
    return undefined;
  }
}

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true })
    .map(String)
    .filter((entry) => statSync(join(dir, entry)).isFile())
    .sort();
}

/**
 * Drift: `drizzle-kit generate` against a throwaway copy of `migrations/`, which must stay
 * empty-handed.
 *
 * The redirect goes through a generated config rather than `--out`, because drizzle-kit refuses
 * `--config` alongside any other flag for `generate` — and spelling `--dialect --schema --casing`
 * out here would put a second copy of `drizzle.config.ts` in this file, free to drift from the
 * first exactly as silently as the drift this check exists to catch.
 */
function driftViolations(): Violation[] {
  const out = join(SCRATCH, "migrations");
  const outAbsolute = join(packageRoot, out);
  const configPath = join(packageRoot, DRIFT_CONFIG);
  try {
    rmSync(join(packageRoot, SCRATCH), { recursive: true, force: true });
    mkdirSync(join(packageRoot, SCRATCH), { recursive: true });
    cpSync(migrationsDir, outAbsolute, { recursive: true });
    const before = filesUnder(outAbsolute);

    writeFileSync(
      configPath,
      `import config from "./drizzle.config";\n\n` +
        `export default { ...config, out: ${JSON.stringify(out)} };\n`,
    );
    const output = drizzleKit(["generate", "--config", DRIFT_CONFIG]);
    if (/^\s*Error:/m.test(output)) {
      return [{ subject: "drizzle-kit generate", message: `did not complete:\n${output}` }];
    }

    const emitted = filesUnder(outAbsolute).filter((file) => !before.includes(file));
    if (emitted.length === 0) return [];
    return [
      {
        subject: "src/schema",
        message:
          `has changes with no migration — \`drizzle-kit generate\` emitted ${emitted.join(", ")}. ` +
          "Run `pnpm db:generate` and commit the result. The schema source and `migrations/` must " +
          "agree, or a database rebuilt from zero and production diverge (ADR-0017).",
      },
    ];
  } finally {
    rmSync(configPath, { force: true });
    rmSync(join(packageRoot, SCRATCH), { recursive: true, force: true });
  }
}

function integrityViolations(): Violation[] {
  try {
    const output = drizzleKit(["check", "--config", "drizzle.config.ts"]);
    if (!/^\s*Error:/m.test(output)) return [];
    return [{ subject: "migrations", message: `failed \`drizzle-kit check\`:\n${output}` }];
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return [{ subject: "migrations", message: `failed \`drizzle-kit check\`:\n${detail}` }];
  }
}

function readJournal(text: string): JournalEntry[] {
  const parsed: unknown = JSON.parse(text);
  return (parsed as { entries?: JournalEntry[] }).entries ?? [];
}

/**
 * The base branch — what "already shipped" means for the destructive marker and for append-only.
 *
 * `DB_CHECK_BASE` first, so CI can pass the pull request's real base: on the `dev` → `main`
 * promotion the base is `main`, and a hardcoded `origin/dev` would diff `dev` against itself.
 */
function resolveBase(): string | undefined {
  const candidates = [process.env.DB_CHECK_BASE, "origin/dev", "dev"].filter(
    (candidate): candidate is string => candidate !== undefined && candidate.length > 0,
  );
  for (const candidate of candidates) {
    const mergeBase = tryGit(["merge-base", candidate, "HEAD"]);
    if (mergeBase !== undefined && mergeBase.length > 0) return mergeBase;
  }
  return undefined;
}

function historyViolations(base: string): Violation[] {
  // Repo-relative, because that is what `git diff --name-status` prints. The *pathspec* is
  // absolute: a relative one is read against the cwd, so `packages/db/migrations` from inside
  // `packages/db` matches nothing and every check below silently passes.
  const prefix = git(["rev-parse", "--show-prefix"]);
  const changes = git(["diff", "--name-status", base, "--", migrationsDir])
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => {
      const parts = line.split("\t");
      return { status: parts[0] ?? "", path: relative(prefix, parts.at(-1) ?? "") };
    });

  const violations = editedMigrationViolations(changes);

  const journalPath = `${prefix}migrations/meta/_journal.json`;
  const baseJournalText = tryGit(["show", `${base}:${journalPath}`]);
  const baseJournal = baseJournalText === undefined ? [] : readJournal(baseJournalText);
  const headJournal = readJournal(readFileSync(join(migrationsDir, "meta/_journal.json"), "utf8"));
  violations.push(...journalViolations(baseJournal, headJournal));

  const applied = baseJournal.map((entry) => entry.tag);
  for (const entry of headJournal) {
    if (applied.includes(entry.tag)) continue;
    const path = join(migrationsDir, `${entry.tag}.sql`);
    // Reported rather than thrown. A hand-retagged journal entry names a migration that was never
    // written, and reading it would die with an uncaught ENOENT — losing every violation collected
    // above, including the journal edit that caused it.
    if (!existsSync(path)) {
      violations.push({
        subject: `meta/_journal.json`,
        message:
          `names \`${entry.tag}\`, but \`migrations/${entry.tag}.sql\` does not exist. The journal ` +
          "is written by `drizzle-kit generate` and never by hand.",
      });
      continue;
    }
    const sql = readFileSync(path, "utf8");
    violations.push(...concurrentIndexViolations(entry.tag, sql));
    violations.push(...destructiveViolations(entry.tag, sql, applied));
  }

  return violations;
}

const violations = [...driftViolations(), ...integrityViolations()];

const base = resolveBase();
if (base === undefined) {
  console.warn(
    "db:check: no base branch to compare against (tried $DB_CHECK_BASE, origin/dev, dev).\n" +
      "  Append-only and destructive-statement checks were skipped. `git fetch origin dev` and " +
      "run again to get them.",
  );
} else {
  violations.push(...historyViolations(base));
}

if (violations.length > 0) {
  console.error(`db:check failed — ${violations.length} violation(s):\n`);
  for (const violation of violations) {
    console.error(`  ✗ ${violation.subject} ${violation.message}\n`);
  }
  process.exit(1);
}

console.log("db:check passed — no drift, no edited migration, no unmarked destructive statement.");
