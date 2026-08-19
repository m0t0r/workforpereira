#!/usr/bin/env tsx
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { getDb } from "@repo/db";

import { readAuthoredDocuments } from "../src/authoring.ts";
import { DocumentHashMismatchError, seedDocumentVersions } from "../src/seed.ts";

/**
 * `pnpm --filter @repo/consent seed-documents` — freeze the authored legal documents into
 * `document_versions`, and **fail loudly if one of them has been edited since it was frozen**.
 *
 * This is the CLI half of ADR-0007's "documents are authored in the repo and frozen in the
 * database". The rules live in `src/seed.ts` where a test can reach them; only the filesystem, the
 * pool singleton and the exit code live here, for the same reason `scripts/db-check.ts` is shaped
 * this way in `@repo/db`.
 *
 * **It belongs in the deploy, immediately after `pnpm db:migrate`** (ADR-0022's
 * `migrate → trigger.dev deploy → flyctl deploy`). It runs on the CI runner, where the repository is
 * checked out and `docs/legal/` exists — the deployed container carries no `docs/` directory, and it
 * has no reason to.
 *
 * `tsx` rather than `node`, for the reason `scripts/drain.ts` gives: ADR-0006 makes every `@repo/*`
 * package JIT with `moduleResolution: Bundler`, so `@repo/db`'s own relative imports carry no
 * extension and Node's ESM resolver cannot follow them. (`scripts/db-check.ts` gets away with plain
 * `node` because it imports one file by its explicit `.ts` path and nothing else.)
 */

/** The repo root, found the way `@repo/db` finds its `.env`: by walking up to the workspace file. */
function workspaceRoot(): string {
  let dir = process.cwd();
  for (;;) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(
        "seed-documents must run inside the workspace: it reads the authored markdown from " +
          "docs/legal/, which only exists in a checkout.",
      );
    }
    dir = parent;
  }
}

const legalDirectory = resolve(workspaceRoot(), "docs/legal");
const documents = readAuthoredDocuments(legalDirectory);

try {
  // One transaction for all of them: a disclosure pinning a _política_ inserted moments earlier has
  // to see it, and a run that fails half way through must not leave a disclosure pinning a version
  // a later failure rolled back.
  const result = await getDb().transaction((tx) => seedDocumentVersions(tx, documents));

  for (const label of result.inserted) process.stdout.write(`frozen   ${label}\n`);
  for (const label of result.unchanged) process.stdout.write(`verified ${label}\n`);

  process.stdout.write(
    `\n${String(result.inserted.length)} frozen, ${String(result.unchanged.length)} verified ` +
      `against docs/legal.\n`,
  );
} catch (error) {
  if (error instanceof DocumentHashMismatchError) {
    // The message already names the file, both hashes and what to do instead. A stack trace here
    // would bury the one thing the reader needs.
    process.stderr.write(`\n${error.message}\n`);
    process.exit(1);
  }
  throw error;
}
