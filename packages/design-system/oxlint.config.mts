import { defineConfig } from "oxlint";

import baseConfig from "../../oxlint.config.mts";

/**
 * The baseline plus React — the same set `packages/ui` carried, since this package replaces it as
 * the only place React components live outside `apps/web` (ADR-0018 keeps the config per-workspace
 * rather than in a shared package).
 */
export default defineConfig({
  extends: [baseConfig],

  plugins: ["react"],

  // Components here render in the browser and, as the old config had it, in a service worker.
  env: { builtin: true, browser: true, serviceworker: true },

  rules: {
    // eslint-plugin-react, recommended
    "react/display-name": "error",
    "react/jsx-key": "error",
    "react/jsx-no-comment-textnodes": "error",
    "react/jsx-no-duplicate-props": "error",
    "react/jsx-no-target-blank": "error",
    "react/jsx-no-undef": "error",
    "react/no-children-prop": "error",
    "react/no-danger-with-children": "error",
    "react/no-direct-mutation-state": "error",
    "react/no-find-dom-node": "error",
    "react/no-is-mounted": "error",
    "react/no-render-return-value": "error",
    "react/no-string-refs": "error",
    "react/no-unescaped-entities": "error",
    "react/no-unknown-property": "error",

    // eslint-plugin-react-hooks, recommended
    "react/rules-of-hooks": "error",
    "react/exhaustive-deps": "warn",
  },
});
