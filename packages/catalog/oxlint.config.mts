import { defineConfig } from "oxlint";

import baseConfig from "../../oxlint.config.mts";

// Nothing of its own yet, and the file exists anyway: oxlint resolves the *nearest* config to each
// file, so without it this package rides silently on the root one (ADR-0018).
export default defineConfig({ extends: [baseConfig] });
