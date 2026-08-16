import { defineConfig } from "oxlint";

import baseConfig from "../../oxlint.config.mts";

/**
 * The baseline plus React plus Next.js — what `@repo/eslint-config/next-js` used to assemble from
 * `eslint-plugin-react`, `eslint-plugin-react-hooks` and `@next/eslint-plugin-next` (both its
 * `recommended` and `core-web-vitals` sets).
 *
 * One rule does not survive the move: `@next/next/no-location-assign-relative-destination` has no
 * oxlint equivalent yet. It fires on `location.assign` with a relative destination, which this
 * app does not do; ADR-0017 records it as the single accepted gap.
 */
export default defineConfig({
  extends: [baseConfig],

  plugins: ["react", "nextjs"],

  env: { builtin: true, serviceworker: true },

  // The last four were eslint-config-next's own defaults. `.next` holds the build output and the
  // types `next typegen` writes; `next-env.d.ts` is Next's file, rewritten on every build.
  ignorePatterns: [
    "dist/**",
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ],

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

    // @next/eslint-plugin-next, recommended
    "nextjs/google-font-display": "warn",
    "nextjs/google-font-preconnect": "warn",
    "nextjs/next-script-for-ga": "warn",
    "nextjs/no-async-client-component": "warn",
    "nextjs/no-before-interactive-script-outside-document": "warn",
    "nextjs/no-css-tags": "warn",
    "nextjs/no-head-element": "warn",
    "nextjs/no-html-link-for-pages": "error",
    "nextjs/no-img-element": "warn",
    "nextjs/no-page-custom-font": "warn",
    "nextjs/no-styled-jsx-in-document": "warn",
    "nextjs/no-sync-scripts": "error",
    "nextjs/no-title-in-document-head": "warn",
    "nextjs/no-typos": "warn",
    "nextjs/no-unwanted-polyfillio": "warn",

    // @next/eslint-plugin-next, core-web-vitals
    "nextjs/inline-script-id": "error",
    "nextjs/no-assign-module-variable": "error",
    "nextjs/no-document-import-in-page": "error",
    "nextjs/no-duplicate-head": "error",
    "nextjs/no-head-import-in-document": "error",
    "nextjs/no-script-component-in-head": "error",
  },
});
