/**
 * The integration-test harness (ADR-0017), reached as `@repo/db/testing`.
 *
 * It is **data-agnostic**: it hands out a migrated, isolated handle and knows nothing about domain
 * rows. That is not an oversight. A shared package holding the harness *and* fixture builders was
 * considered and is impossible — a builder for an Offer row would make the harness depend on
 * `@repo/offers` at tier 5 while `@repo/offers`'s own tests depend on the harness, a cycle that
 * inverts ADR-0006's DAG and that `turbo boundaries` rejects. **Fixtures live per package and are
 * duplicated, deliberately, forever.**
 *
 * A consuming package's `vitest.config.ts` is three lines:
 *
 * ```ts
 * import { globalSetupPath } from "@repo/db/testing";
 * export default defineConfig({
 *   test: { globals: true, environment: "node", globalSetup: [globalSetupPath] },
 * });
 * ```
 */

export { globalSetupPath } from "./paths";
export { withRollback } from "./rollback";
