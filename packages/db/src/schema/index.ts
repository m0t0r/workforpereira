/**
 * Every table in the system, grouped by owning module (ADR-0006).
 *
 * The schema is *central* rather than per-module because Drizzle's relations API defeats the
 * split in both generations — see ADR-0006, "Why the schema is central". Ownership stays legible
 * through one file per owner (`./auth.ts`, `./catalog.ts`, `./people.ts`, …), re-exported here.
 *
 * The tables land with the implementation tickets that follow the map, under the conventions
 * ADR-0008 fixes (plural tables, singular columns, `timestamptz` everywhere, hard deletes,
 * `RESTRICT` by default). Each one owes a line in `../lifecycle.ts` (ADR-0034), and the build is
 * red until it has one.
 */

// `@repo/auth`, tier 1. **Generated** — `pnpm --filter @repo/auth generate-schema` writes that file
// whole, so nothing is hand-edited there and our own tables live in their own files beside it.
//
// The generator also emits `usersRelations`, `sessionsRelations` and `accountsRelations`, which are
// deliberately **not** re-exported: nothing uses them, Better Auth's `experimental.joins` is off,
// and the generator names their fields `sessionss`/`accountss`. Re-exporting them would put those
// names into the drizzle client's schema object for no gain.
export { accounts, sessions, users, verifications } from "./auth";

// `@repo/consent`, tier 3.
export {
  consents,
  DOCUMENT_KINDS,
  documentVersions,
  PURPOSES,
  type DocumentKind,
  type Purpose,
} from "./consent";

export {
  NOTIFICATION_TEMPLATES,
  notificationOutbox,
  TOKEN_BEARING_TEMPLATES,
  type NotificationTemplate,
  type TokenBearingTemplate,
} from "./notifications";

// `@repo/people`, tier 2 — ADR-0002's seam.
export { persons } from "./people";
