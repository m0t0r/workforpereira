import { defineConfig } from "oxlint";

/**
 * The baseline every workspace inherits. Each package has its own `oxlint.config.mts` that
 * imports this object and passes it in `extends`, then adds only what that package needs —
 * `packages/design-system` adds React, `apps/web` adds React and Next.js.
 *
 * Oxlint resolves the *nearest* config to each linted file, so a package config replaces this
 * one rather than layering onto it; `extends` is what puts it back. Composed as objects like
 * this, `extends` carries everything below — `jsPlugins`, `env`, `ignorePatterns` and all — which
 * the string-path form in `.oxlintrc.json` does not: there it merges only rules, plugins and
 * overrides.
 *
 * The rule list is the ESLint set this repo ran before, migrated 1:1 by `@oxlint/migrate`:
 * `js.configs.recommended` + `typescript-eslint.configs.recommended` + `eslint-plugin-turbo`,
 * plus the four type-aware rules noted below. `correctness` stays off for that reason — oxlint's
 * own category is a superset of the old set, and switching it on would fail the build on rules
 * nobody has agreed to yet. Adopting it is a deliberate follow-up, not a side effect of changing
 * linters.
 *
 * The file is `.mts`, not `.ts`, because the root `package.json` has no `"type": "module"`: Node
 * would parse a `.ts` config as CommonJS, notice ESM syntax, and reparse it with a warning on
 * every lint run. `.mts` says ESM outright. It sits outside every `tsconfig.json` `include`, so
 * `check-types` does not cover it — `defineConfig` is what type-checks it, in the editor.
 */
export default defineConfig({
  plugins: ["unicorn", "typescript"],

  // `turbo/no-undeclared-env-vars` has no Rust port, so oxlint runs the real ESLint plugin
  // through its JS plugin bridge. The rule guards turbo.json's `globalEnv`: an env var read in
  // code but undeclared there is invisible to the cache key, and Turbo will happily replay a
  // build produced against a different value. Resolved relative to this file, which is why
  // `eslint-plugin-turbo` is a root dependency.
  jsPlugins: ["eslint-plugin-turbo"],

  categories: { correctness: "off" },
  env: { builtin: true },
  ignorePatterns: ["dist/**"],

  rules: {
    // js.configs.recommended
    "constructor-super": "error",
    "for-direction": "error",
    "getter-return": "error",
    "no-async-promise-executor": "error",
    "no-case-declarations": "error",
    "no-class-assign": "error",
    "no-compare-neg-zero": "error",
    "no-cond-assign": "error",
    "no-const-assign": "error",
    "no-constant-binary-expression": "error",
    "no-constant-condition": "error",
    "no-control-regex": "error",
    "no-debugger": "error",
    "no-delete-var": "error",
    "no-dupe-class-members": "error",
    "no-dupe-else-if": "error",
    "no-dupe-keys": "error",
    "no-duplicate-case": "error",
    "no-empty": "error",
    "no-empty-character-class": "error",
    "no-empty-pattern": "error",
    "no-empty-static-block": "error",
    "no-ex-assign": "error",
    "no-extra-boolean-cast": "error",
    "no-fallthrough": "error",
    "no-func-assign": "error",
    "no-global-assign": "error",
    "no-import-assign": "error",
    "no-invalid-regexp": "error",
    "no-irregular-whitespace": "error",
    "no-loss-of-precision": "error",
    "no-misleading-character-class": "error",
    "no-new-native-nonconstructor": "error",
    "no-nonoctal-decimal-escape": "error",
    "no-obj-calls": "error",
    "no-prototype-builtins": "error",
    "no-redeclare": "error",
    "no-regex-spaces": "error",
    "no-self-assign": "error",
    "no-setter-return": "error",
    "no-shadow-restricted-names": "error",
    "no-sparse-arrays": "error",
    "no-this-before-super": "error",
    "no-unreachable": "error",
    "no-unsafe-finally": "error",
    "no-unsafe-negation": "error",
    "no-unsafe-optional-chaining": "error",
    "no-unused-labels": "error",
    "no-unused-private-class-members": "error",
    "no-unused-vars": "error",
    "no-useless-backreference": "error",
    "no-useless-catch": "error",
    "no-useless-escape": "error",
    "no-with": "error",
    "require-yield": "error",
    "use-isnan": "error",
    "valid-typeof": "error",

    // Core rules typescript-eslint replaces with TypeScript-aware versions
    "no-array-constructor": "error",
    "no-unused-expressions": "error",

    "turbo/no-undeclared-env-vars": "warn",

    // typescript-eslint.configs.recommended
    "typescript/ban-ts-comment": "error",
    "typescript/no-duplicate-enum-values": "error",
    "typescript/no-empty-object-type": "error",
    "typescript/no-explicit-any": "error",
    "typescript/no-extra-non-null-assertion": "error",
    "typescript/no-misused-new": "error",
    "typescript/no-namespace": "error",
    "typescript/no-non-null-asserted-optional-chain": "error",
    "typescript/no-require-imports": "error",
    "typescript/no-this-alias": "error",
    "typescript/no-unnecessary-type-constraint": "error",
    "typescript/no-unsafe-declaration-merging": "error",
    "typescript/no-unsafe-function-type": "error",
    "typescript/no-wrapper-object-types": "error",
    "typescript/prefer-as-const": "error",
    "typescript/prefer-namespace-keyword": "error",
    "typescript/triple-slash-reference": "error",

    // Type-aware rules. These need a type checker, so they run only under `--type-aware`, which
    // hands the files to tsgolint and its TypeScript 7 program — which is why they were
    // unreachable until this repo left typescript-eslint. They are the four that catch what a
    // Postgres/Drizzle data layer actually gets wrong: a query whose promise is never awaited, a
    // promise passed where a boolean is expected, an `await` on a non-promise, and a condition
    // whose answer is already known statically.
    "typescript/await-thenable": "error",
    "typescript/no-floating-promises": "error",
    "typescript/no-misused-promises": "error",
    "typescript/no-unnecessary-condition": "error",
  },

  overrides: [
    {
      // TypeScript already reports these, and reporting them twice is what
      // `typescript-eslint.configs.recommended` turned them off to avoid. The three `prefer-*`
      // rules go the other way: TypeScript's emit makes them safe to require in .ts but not .js.
      files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
      rules: {
        "constructor-super": "off",
        "getter-return": "off",
        "no-class-assign": "off",
        "no-const-assign": "off",
        "no-dupe-class-members": "off",
        "no-dupe-keys": "off",
        "no-func-assign": "off",
        "no-import-assign": "off",
        "no-new-native-nonconstructor": "off",
        "no-obj-calls": "off",
        "no-redeclare": "off",
        "no-setter-return": "off",
        "no-this-before-super": "off",
        "no-unreachable": "off",
        "no-unsafe-negation": "off",
        "no-with": "off",
        "no-var": "error",
        "prefer-const": "error",
        "prefer-rest-params": "error",
        "prefer-spread": "error",
      },
    },
  ],
});
