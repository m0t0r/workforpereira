import { defineConfig } from "drizzle-kit";

import { databaseUrl } from "./src/env";

// ADR-0004 and ADR-0006: drizzle-kit is the sole owner of migrations, rooted in `packages/db`.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  // ADR-0008: set once, here. TypeScript reads `personId`, Postgres reads `person_id`, and the
  // name is written exactly once — spelling both at every column is a second place to drift.
  casing: "snake_case",
  dbCredentials: { url: databaseUrl() },
  strict: true,
  verbose: true,
});
