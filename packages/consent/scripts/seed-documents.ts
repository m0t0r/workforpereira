#!/usr/bin/env tsx
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { getDb } from "@repo/db";

import {
  InvalidFrontMatterError,
  MisplacedDocumentError,
  readAuthoredDocuments,
} from "../src/authoring.ts";
import {
  DocumentHashMismatchError,
  DocumentMetadataMismatchError,
  MissingPinnedDocumentError,
  seedDocumentVersions,
} from "../src/seed.ts";

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
      // It reads the authored markdown from `docs/legal/`, which only exists in a checkout — the
      // deployed container carries no `docs/` directory.
      throw new Error(
        "seed-documents must run inside the workspace: no pnpm-workspace.yaml above cwd",
      );
    }
    dir = parent;
  }
}

const legalDirectory = resolve(workspaceRoot(), "docs/legal");

try {
  // **Inside the `try`.** Discovery throws too — `InvalidFrontMatterError` and
  // `MisplacedDocumentError` both carry a message naming the file and the fix, and reading the
  // directory outside this block sent them to the deploy log as raw stack traces instead.
  const documents = readAuthoredDocuments(legalDirectory);

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
  /**
   * **Every error this script can produce on a bad document is reported as its message.**
   *
   * Each of these is written to tell an operator what to do, and each arrives mid-deploy, on a CI
   * runner, **after `pnpm db:migrate` has already applied**. A stack trace at that moment buries the
   * one sentence that matters. Anything not in this list is genuinely unexpected and keeps its trace.
   */
  const expected =
    error instanceof DocumentHashMismatchError ||
    error instanceof DocumentMetadataMismatchError ||
    error instanceof MissingPinnedDocumentError ||
    error instanceof InvalidFrontMatterError ||
    error instanceof MisplacedDocumentError;

  if (expected && error instanceof Error) {
    process.stderr.write(`\n${error.message}\n`);
    process.exit(1);
  }
  throw error;
}
