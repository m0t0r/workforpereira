import { defineConfig } from "oxlint";

import baseConfig from "../../oxlint.config.mts";

/**
 * The baseline plus React, which ADR-0018 says is added **only for a package that renders** — and
 * this one does: the notification bodies are React Email components in `src/emails/`.
 *
 * No Next.js plugin and no browser globals. Nothing here runs in a browser; `render()` turns these
 * components into an HTML string on the server and the string is what leaves.
 *
 * The file would exist even if it added nothing, because oxlint resolves the *nearest* config to
 * each file: without it this package would ride silently on the root config.
 */
export default defineConfig({
  extends: [baseConfig],
  plugins: ["react"],
});
