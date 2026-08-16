# Oxfmt replaces Prettier, and formats more than Prettier did

Formatting is **oxfmt 0.63.0**, pinned exact, configured by a root `oxfmt.config.mts`. `prettier` is
out of the lock file. `pnpm format` is `oxfmt` and gains a `pnpm format:check` twin. The formatter is
a **root-only devDependency** and a root script, not a turbo task and not a per-workspace
dependency — unlike oxlint, which every workspace needs.

The scope widens in the same motion. Prettier ran `**/*.{ts,tsx,mts,md}`; oxfmt formats every
language it recognises, minus an explicit ignore list — so JSON, CSS and the `package.json` manifests
are now formatted too. Facts observed 2026-08-16.

This is the second half of ADR-0018 and it supersedes that ADR's bullet reading _"Prettier remains
the formatter and `pnpm format` is unchanged"_. Nothing in ADR-0018 argued for keeping Prettier; the
bullet only recorded that changing the linter had not changed the formatter.

## Why

**The linter had already paid for the runtime.** oxlint installs a platform-native binary and a Rust
engine; oxfmt is the same project shipping the same way, so adopting it costs one package plus one
6.5 MB binary rather than a new toolchain. `prettier` came out and `oxfmt`, `tinypool` and one
`@oxfmt/binding-*` went in — net **+2 packages**. One vendor now owns lint and format, which is worth
something in a repo maintained by one person.

**It is meaningfully faster, and that is what makes `--check` affordable.** A whole-repo check is
**0.85s over 68 files**, against **4.5s** for Prettier over the 51 files its glob matched — both warm,
same machine. That gap is the difference between a formatting gate that runs on every pull request
and one nobody wires up. ADR-0017 names the gate as `turbo run lint check-types test db:check`; when
someone builds it, `format:check` belongs beside those.

**Prettier's scope here was an accident of a glob, and it showed.** `**/*.{ts,tsx,mts,md}` left
`turbo.json`, every `tsconfig.json`, `app/globals.css` and all four `package.json` files unformatted,
which is why `packages/ui/package.json` had `devDependencies` above `dependencies` and
`apps/web/package.json` had `type` in the middle of its metadata. oxfmt's default is the opposite —
format what you recognise, ignore what you are told to — and `sortPackageJson` is on by default, so
manifest key order stops being a matter of who edited last.

**The migration was mechanical and the output was checked, not assumed.** oxfmt's `--migrate prettier`
had nothing to migrate: **Prettier ran here with no config file at all**. Its 80-column default was
therefore never a decision anyone made, so the repo takes oxfmt's default of **100** instead — which
is the width the prose in `docs/` is already hand-wrapped to, and the width `oxlint.config.mts` was
written at. Formatting the repo under both tools and diffing the results is how the divergences in
the next section were found.

**The one-time reformat is separated into its own commit.** It touches 36 files and is almost entirely
Markdown emphasis normalised from `*x*` to `_x_` — which is _Prettier's_ own rule, not a new opinion.
That the docs were full of `*x*` is the real finding: `pnpm format` was hardly ever run, because at
4.5s with no gate behind it there was nothing making anyone run it.

## Accepted risks

- **Prettier is not actually gone — it is vendored inside oxfmt.** Markdown, YAML, HTML, Vue and
  Svelte are delegated to a Prettier bundled in oxfmt's own `dist/`. For this repo that is _every
  Markdown file_, which is most of what gets formatted. So the dependency is not removed, it is
  hidden one level down and pinned by someone else. What was actually bought is the JS/TS/JSON/CSS
  path being native and the whole thing being parallel.
- **Markdown output is not byte-identical to Prettier's**, delegation notwithstanding. Two
  differences were found by formatting the repo both ways: a table column in
  `docs/research/object-storage.md` is padded one space wider by oxfmt, which disagrees with Prettier
  about the display width of `↔`; and in `docs/research/messaging-providers.md` a Prettier quirk that
  de-indents a continuation line inside an inline code span spanning a line break lands on a
  different line. Both render identically. Neither is worth acting on, but a future `--check` failure
  that looks like nothing is probably one of these.
- **oxfmt is pre-1.0**, which is why the version is pinned exact rather than caret-ranged, the same
  way `oxlint` is. A 0.x formatter can change its output in a patch release, and a formatter changing
  its output rewrites every file in the repo. Bumps should be deliberate and land with their reformat.
- **The config imports `oxfmt`, so it only loads where the package is installed.** Run oxfmt from a
  directory that has this config but no `node_modules` and it prints `Cannot find package 'oxfmt'` and
  exits 1 — it does not silently fall back to defaults, which was verified by doing it accidentally.
  Loud, but worth knowing before someone copies the config somewhere.
- **`.oxfmtrc.json` is the conservative fallback** if the TypeScript config proves unstable, exactly
  as ADR-0018 says for oxlint. The content is format-independent, so reverting is mechanical.
- **Nothing enforces formatting.** There is still no CI (ADR-0018), so `format:check` is a command
  someone has to type. Until the gate exists, the repo can drift again — just now in 0.85s increments.
- **Editor integration changes for anyone cloning this.** The Prettier extension has nothing to read.
  oxfmt ships an LSP server (`oxfmt --lsp`) and the oxc extension is the replacement. There is no
  in-repo signal of that beyond this ADR.
- **Going back is one commit, but not one command.** `--migrate` runs Prettier-to-oxfmt only. Reverting
  means reinstalling `prettier`, restoring the glob, and running it once over the repo.

## Consequence

- **`oxfmt.config.mts` carries `ignorePatterns` and nothing else.** Every other option is oxfmt's
  default on purpose. `.gitignore` is read automatically, so the list is only what git still tracks or
  leaves untracked-but-visible: `.agents/**` (vendored skill docs whose hashes `skills-lock.json`
  records — reformatting one reports the skill as tampered with), `.claude/**` and `.research-25/**`
  (agent scratch and working notes), `pnpm-lock.yaml`, `packages/db/migrations/**` (drizzle-kit owns
  those, and CLAUDE.md forbids hand-editing them — a formatter is a hand), and the prototype assets
  under `apps/landing/`.
- **`apps/landing/`'s HTML, CSS and JS are ignored; its `NEXTJS_HANDOFF.md` is not.** The stylesheet is
  authored one rule per line — 22 lines, which oxfmt expands to 2,131 — and it is a frozen reference to
  port from, not source anyone edits. Prettier never touched it either, since its glob had no `.css`.
- **`sortImports` stays off.** It is oxfmt's own extension, not a Prettier behaviour, and turning it on
  in the same change would leave nobody able to say which tool moved a line. Same reasoning ADR-0018
  used for declining oxlint's `correctness` category, and the same follow-up: adopt it on purpose or
  not at all.
- **New workspaces need nothing.** One root config covers the repo, and oxfmt supports nested configs
  if a package ever needs its own — but unlike `oxlint.config.mts`, there is no reason to create one
  pre-emptively, because a formatter resolving to the root config is the correct outcome.
- **`printWidth` is 100 everywhere**, including code fences inside Markdown, which is why ADR-0008's
  schema examples re-wrapped.
