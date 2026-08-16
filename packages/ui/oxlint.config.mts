import { defineConfig } from "oxlint";

import baseConfig from "../../oxlint.config.mts";

/**
 * The baseline plus React. Everything here is what `@repo/eslint-config/react-internal` added on
 * top of its base config: `eslint-plugin-react`'s recommended set and the two
 * `eslint-plugin-react-hooks` rules, which oxlint ships inside its own `react` plugin rather than
 * as a separate one — hence the `react/` prefix on `rules-of-hooks` and `exhaustive-deps`.
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
