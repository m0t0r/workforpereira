import { defineConfig } from "oxlint";

import baseConfig from "../../oxlint.config.mts";

/**
 * `@repo/notifications` runs the baseline unchanged — no React, no browser globals. The file
 * exists anyway because oxlint resolves the *nearest* config to each file: without it this package
 * would ride silently on the root config, and the day it needs a rule of its own there would be
 * nowhere obvious to put it.
 */
export default defineConfig({ extends: [baseConfig] });
