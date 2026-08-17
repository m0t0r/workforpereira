# The lightness ramp is the decision, not the hue

`apps/landing/NEXTJS_HANDOFF.md` and `@repo/design-system` describe two different products. The
handoff specifies a blue `#2457e6`, Manrope, DM Mono and a `5 / 8 / 12px` radius scale; the package
shipped a shadcn `base-vega` preset with a cyan `oklch(0.52 0.105 223.128)`, Inter, Figtree, Geist
Mono and a derived scale off `--radius: 0.625rem`. No ADR reconciled them, and ADR-0026 made it
worse by recording that _"the tokens, primitives, motion rules, content rules and accessibility bar
are untouched"_ — reaffirming a document that half the repo had already stopped following.

This ADR settles which visual identity ships, what else in the handoff survives, and where the
surviving half lives. It also removes dark mode.

## Contrast is a property of the lightness ramp, and that is what decides the method

The obvious way to run this was to score the two palettes against WCAG 2.2 AA and let accessibility
pick. That fails, and the way it fails is the finding.

Four candidate hues were generated over one shared lightness ramp — the shipped cyan, a saturated
cyan, the handoff blue, and a new mid-blue — and gamut-mapped into sRGB. **All four passed every
check, identically**, to the second decimal. In OKLCH the `L` channel is perceptual, so once the
ramp is authored the contrast of every derived pair is already determined; hue and chroma move
freely underneath it.

Two consequences, and both outlive this decision:

- **Accessibility cannot arbitrate a hue**, so the hue is a positioning question and nothing else.
  Arguments of the form _"this palette is more accessible"_ are unavailable here and should be
  treated as a sign the ramp is the thing actually in dispute.
- **The ramp is the reusable artifact.** Swapping the brand hue later is one edit to eleven values
  and needs no contrast re-audit, provided the ramp is untouched. That is why `globals.css` keeps a
  private `--brand-*` ramp rather than inlining shade values into the semantic tokens.

## Civic blue, H 248

**`--primary` is `oklch(0.48 0.122 248)`.**

The register this was optimised against is _civic infrastructure_: the product's promise is _"you
can be found"_, not _"you will be helped"_ and not _"you are safe with us"_. The destination refuses
_"donate to victims"_, the map's Notes refuse charity and disaster framing, ADR-0026 requires safety
notices read calm rather than alarming, and ADR-0025's ending refuses to celebrate. Neither obvious
pole serves that — a bank blue oversells institutional weight, a muted teal reads wellness and NGO.

Against that register, **only one candidate could be moderate by choice.** The maximum chroma
available in sRGB at the lightnesses where a primary button lives:

| Hue                  | max C at L 0.620 | max C at L 0.545 | max C at L 0.480 |
| -------------------- | ---------------- | ---------------- | ---------------- |
| Cyan H 223.1         | 0.114            | **0.100**        | 0.088            |
| Civic blue H 248.0   | 0.166            | 0.146            | 0.128            |
| Handoff blue H 264.5 | 0.204            | 0.250            | 0.294            |

The shipped cyan reads muted because **at that hue it cannot read any other way** — 0.100 is a gamut
ceiling, not a setting. "Saturate the cyan" was tried as a fourth candidate and is not available:
asking for peak chroma 0.150 at H 223 produced a ramp whose shades 600–950 came back identical to
the unsaturated one, because sRGB has no such colour and the mapper clipped it back. The handoff
blue has the opposite problem — at 0.250 it must be deliberately under-driven to look calm, which
means the restraint lives in a rule nobody can see rather than in the value.

H 248 is a 25° shift from the shipped cyan: still the blue family that choice was reaching for,
with room to sit where the register asks.

**`--primary` is shade 700 rather than the conventional 600.** 600 clears white text at 4.93:1 and
700 at 6.51:1; the register is institutional and the headroom is free.

## shadcn's vocabulary is the seam; the handoff's names die

Registry components reference `bg-primary`, `border-input` and `text-muted-foreground` in their own
source, and `CLAUDE.md` mandates adding components **with the CLI** precisely so it owns import
rewriting and CSS diffing. Renaming tokens to the handoff's `--color-brand-500` / `--color-ink` /
`--color-page` would mean hand-patching the output of every `shadcn add` forever, in exchange for
nothing a person sees.

So the handoff's **values** survive where they are better and its **names** do not. The
`--brand-*` ramp is deliberately **not** exported through `@theme inline`, which makes the seam
enforceable rather than conventional: a component cannot reach past the semantic layer into a raw
shade, because Tailwind has no utility for one.

## The preset's thirteen unused tokens are re-hued, not deleted

Eight `--sidebar-*` and five `--chart-*` arrive with the preset and nothing renders them. The first
draft of this ADR deleted them on the argument that there is no sidebar, no chart and no dashboard —
ADR-0026 refuses the per-object ledger, ADR-0014 declined facet counts, and #18 forbids analytics
touching personal data — and that `shadcn add chart` would re-add them if they were ever wanted.

**That argument is premature and the tokens stay.** No UI has been built and no UX has been designed.
"There is no chart" is a statement about a repo that has no pages either; it is not a decision anyone
has made about the product. Deleting on that basis spends a real cost — the tokens come back
mis-hued, out of a registry that knows nothing about civic blue, at whatever moment someone is busy
building the thing that needed them — to buy the removal of thirteen lines nobody reads. **A token
that costs nothing to keep and is wrong to re-derive under pressure is kept.**

What the deletion was right about is that the preset's values could not stay: they are the shipped
cyan and the zinc neutrals, and after this ADR they would be the only colours in the file that do not
belong to the palette. So the tokens are **re-hued rather than preserved**, and the difference
between the two is the whole point — this is not "leave the preset alone".

**The sidebar tokens become aliases.** `--sidebar-foreground`, `--sidebar-accent`,
`--sidebar-border` and the rest point at the page tokens they would otherwise duplicate; only
`--sidebar` itself takes a value of its own, a barely-tinted `oklch(0.985 0.004 248)`. This is the
honest encoding of the situation: a navigation surface nobody has designed is the page until someone
designs it. It also means the sidebar cannot silently drift from the palette, because there is
nothing there to drift.

**The chart tokens are a real decision and are treated as one**, below.

## The chart palette is categorical, and the order is the accessibility mechanism

The preset ships `--chart-1` through `--chart-5` as **five steps of one cyan ramp** — `--chart-4` is
literally the old `--primary`. That is a sequential ramp wearing categorical names, and it is wrong
for the job whatever the hue: a ramp encodes _magnitude_, so using it for _identity_ tells a reader
that series 5 is more of something than series 1. Re-hueing it to civic blue would have preserved
the defect and made it match.

So the five slots are rebuilt as a categorical palette, on four rules:

- **Slot 1 is `--brand-600` verbatim.** Cohesion with `--primary` is structural rather than
  approximate, and it sits one step off `--primary` (shade 700) so a data mark never reads as a
  button. This is what "cohesive with the brand, not identical to it" means as a value.
- **Hues are at least 45° apart**, from each other and from the brand, so a legend is readable.
- **Hues clear every semantic hue by at least 25°.** Distance alone is not sufficient and this is
  the subtle part: a red at a lighter step clears any ΔE threshold against `--destructive` **on
  lightness alone** while sitting two degrees off its hue, and still reads as the destructive colour.
  Both unconstrained searches run for this ADR landed exactly there — one put a series on H 20 beside
  `--destructive` at H 22, another on H 70 beside `--warning` at H 75. The reserved-status rule has
  to be expressed in hue or it does not bite.
- **The slot order is fixed and assigned in sequence, never cycled.** The order is what the
  colour-vision separation is measured on, so re-ordering the slots is a change to this decision
  rather than a preference.

The result, and the numbers that justify it:

| Slot        | Value                   | On white | Family     |
| ----------- | ----------------------- | -------- | ---------- |
| `--chart-1` | `var(--brand-600)`      | 4.93:1   | civic blue |
| `--chart-2` | `oklch(0.64 0.16 50)`   | 3.56:1   | orange     |
| `--chart-3` | `oklch(0.64 0.103 200)` | 3.22:1   | teal       |
| `--chart-4` | `oklch(0.48 0.16 295)`  | 7.02:1   | violet     |
| `--chart-5` | `oklch(0.68 0.16 355)`  | 3.12:1   | pink       |

On the **adjacent** pairlist — the gate for bars, lines and stacked segments, where slots are
assigned in order and only neighbours touch — the worst pair separates by **ΔE 14.1** under simulated
protanopia and deuteranopia against a target of 8, and **25.4** under normal vision against a floor
of 15. Every slot clears **3:1** on the page, so SC 1.4.11 holds for each mark on its own and a
series stays legible without leaning on its label.

**Five categorical slots cannot clear the all-pairs list, and no ordering fixes that.** Scatter,
bubble, choropleth and small-multiple forms let any two marks sit side by side, which is a strictly
harder test; the search confirmed no legal 5-set passes it. That is a property of the method, not of
these hues, so it is recorded as a **usage limit rather than hidden**: those forms carry **two**
series from this palette, and anything wider facets or folds its tail into "Other".

Note what this palette is _not_ licence for. ADR-0014 and ADR-0026 still refuse facet counts and
per-person signals, and #18 still forbids analytics over personal data. Having a legal way to draw a
chart does not make any particular chart legal.

## `--border` and `--input` are different jobs

The preset assigns both `oklch(0.92 0.004 286.32)` — **1.27:1** against the page. WCAG 2.2
**SC 1.4.11** requires 3:1 for visual information identifying a control, and a text field's boundary
is exactly that. `--ring` at `oklch(0.705 0.015 286.067)` is **2.63:1** and fails the same clause.

Both are fixed by splitting the token: `--border` stays faint because a divider identifies nothing,
`--input` moves to `oklch(0.65 0.02 248)` at 3.23:1, and `--ring` becomes shade 700 at 6.51:1.

This is worth recording as more than a bug fix, because the trap is well-disguised: the palette
skill consulted for this ticket carries a verification checklist demanding that UI element borders
reach at least 3:1, alongside a mapping table assigning `border` **and** `input` to shade 200, which
cannot satisfy it. Two independent sources made the same collapse. It is the default, and the
default is wrong.

**The handoff's accessibility bar is what caught it** — _"a 2px visible focus ring using
`--color-brand-500`"_ describes a ring at 5.86:1. The document being partly superseded here contains
the rule that repairs its replacement.

## Three semantic triads, and two rules that give them teeth

The preset ships exactly one semantic token, `--destructive`, at chroma **0.245** — a fire-engine
red. Meanwhile all four prototypes (`skill-picker`, `first-run`, `trust-presentation`,
`photo-refusal`) use three semantic pairs from the handoff, and **all four invented a border colour
inline because the handoff supplies none, and disagreed**: warning-border is `#ecd79a` in one and
`#e3c680` in another, success-border `#b9e2cd` and `#a9d4bf`. Four documents drifting on one value
is the argument for a triad rather than a pair.

So `success`, `warning` and `destructive` each carry a **foreground, a surface and a border**.
Names are shadcn's and the web's, not invented ones.

`--destructive` drops from chroma 0.245 to **0.130** — `#902F33`, a brick rather than an alarm.
That is ADR-0026's _calm rather than alarming_ expressed as a number instead of an intention, and it
still clears 4.5:1 on its own surface at 7.16:1.

Two usage rules ship with them, because a palette cannot enforce a register on its own:

- **`destructive` is only ever a limit of the platform, never anything a person did.** This is
  ADR-0026's _state the limit, never the risk_ carried into the token layer.
- **`warning` is never a state the person is merely waiting on.**

The second rule bites immediately and is the reason it is written down. ADR-0027 refuses escalating
copy for the missed-three-days photo message — and the photo-refusal prototype renders that card in
warning yellow, **escalating in colour exactly what the ADR refused to escalate in words**. Under
this rule it is neutral. A prototype can hold a decision and contradict it in CSS, and only a rule
about the token catches that.

Colour never carries meaning alone (WCAG 1.4.1); every state ships with text beside it.

## Inter, Figtree, Geist Mono — recorded as a decision

The pairing stays. It is written down here because until now it was an inheritance nobody had
ratified: `shadcn info` reports the preset as `font: "inter"` with `fontHeading: "inherit"`, so the
preset does not itself specify a heading face, and `CLAUDE.md`'s _"per the preset"_ overstated where
the pairing came from. It is a choice, and this is the record of it.

Manrope and DM Mono go. Nothing depends on them except prototypes already superseded, and the
handoff's `-0.06em` to `-0.075em` heading tracking was tuned for Manrope's shapes and does not
transfer — heading tracking is re-derived against Figtree when a real page exists, not copied.

The handoff's type scale is **not** adopted. It contradicts itself: `--text-2xs: 0.5rem` (8px) and
`--text-xs: 0.625rem` (10px) sit beside its own rule that body copy is _"never below 12px in the
production app"_. Tailwind's default scale stands until a page needs otherwise.

Radius keeps the preset's derived scale off `--radius: 0.625rem`. The handoff's authored
`5 / 8 / 12px` is not better, and derived is cheaper to keep coherent.

## There is no dark mode

`next-themes` was wired with `defaultTheme="system"` and `enableSystem`, so **a phone set to dark
was already being served the dark palette** — where `--primary` is **2.74:1** against the dark
background. This was not a half-shipped mode waiting to be finished; it was a live WCAG failure
reachable by an OS setting, guarded by nothing.

Dark mode is removed rather than repaired: every token in this ADR would double, none of the
doubles were ever audited, and ADR-0017 tests neither CSS nor components, so the second set would be
guarded by prose alone. The repo's habit is to prefer absent to half-present — ADR-0011 404s rather
than 403s for the same reason.

Removed: the `.dark` block, `@custom-variant dark`, the `next-themes` dependency from both
`apps/web` and `@repo/design-system`, `apps/web/components/theme-provider.tsx`, and
`suppressHydrationWarning` on `<html>` — which existed only for next-themes and would otherwise
silence real hydration mismatches for free. A **bare unmodified `d` keypress** was bound as a global
theme toggle; it goes with the rest, and it is worth noting that it would have collided with
type-ahead on any listbox not built from a real `<input>` — including ADR-0023's ~300-option
combobox, which is the front door of the product.

Adding dark mode later is a deliberate act with its own ADR, not a `shadcn add` side effect.

**Removing the tokens is not enough, and the build is what proved it.** Registry components ship
`dark:` utilities in their own class strings — `button.tsx` carried nine. With
`@custom-variant dark` deleted, Tailwind falls back to its **own** `dark` variant, which is
`@media (prefers-color-scheme: dark)`. So stripping the theme provider without stripping those
utilities makes dark styling fire _more_ readily than before: it no longer needs the `.dark` class
next-themes used to set, and there is nothing left to toggle it off. This was caught by grepping the
compiled CSS, not by review, lint or type-check — none of which can see it. Hence the standing rule
in `packages/design-system/README.md`: **strip `dark:` utilities from every component the CLI adds,
and confirm against the built stylesheet.**

## The decision is validated against the artifact, not against this document

`packages/design-system/scripts/check-contrast.mjs` **parses `globals.css`**, resolves `var()`
indirection, and asserts 27 pairs against 4.5:1 and 3:1. It also fails if a `.dark` block or
`@custom-variant dark` reappears. A validator holding a table of numbers copied out of an ADR would
prove nothing about the file that ships.

It carries one check that is not about contrast: the **four adjacent chart pairs** are measured for
colour-vision separation, simulating protanopia and deuteranopia with Machado–Oliveira–Fernandes
(2009) at severity 1.0 and asserting OKLab ΔE ≥ 8, plus ≥ 15 under normal vision. Contrast against
the page cannot catch this — two series can each clear 3:1 and still be the same colour to a reader
with deuteranopia, which is precisely the failure a palette derived by eye ships with.

**The colour maths is `culori`'s, and that is the second thing this file got wrong before it got it
right.** The first draft hand-rolled OKLCH-to-sRGB, the WCAG luminance formula and the Machado
matrices — about 130 lines, transcribed. Every contrast figure it produced was correct to the
decimal, which is the trap rather than the reassurance: a 3×3 matrix wrong in one digit still yields
plausible numbers, and nothing in this repo would have noticed. Swapping in the library moved one
real number — the worst adjacent chart pair went from a hand-computed 17.4 to **14.1**, because the
two implementations clamp the simulated signal differently. Both clear the target of 8, so the
palette does not change; but the figure in this ADR was wrong before the library was there to
correct it. `culori` is a devDependency of `@repo/design-system` and the only maths the script still
owns is reading a stylesheet.

**This is also what makes the decision above enforceable.** A token missing from `globals.css` is a
failure rather than a skip, so the thirteen restored tokens cannot be quietly deleted again, and the
chart slots cannot be re-ordered or re-hued into a collapse without the gate saying so. Both
behaviours were negative-tested: collapsing `--chart-3` onto `--chart-2` reports ΔE 0.5 and exits 1,
and removing `--sidebar-ring` reports the missing token and exits 1.

It runs as `pnpm --filter @repo/design-system check-contrast`, is registered as a turbo task, and
joins the pull-request gate in `.github/workflows/ci.yml`. When ADR-0017's testing lane lands it
becomes an **Invariant Test** — it already has the shape, and ADR-0017's two seams do not reach CSS.

## Consequences

- **ADR-0026 is amended.** Its _"the tokens, primitives, motion rules, content rules and
  accessibility bar are untouched"_ is now false for tokens and for parts of the primitives and
  content rules. Every decision in ADR-0026 is copy, placement or layout, so **none of them moves**.
- **`CLAUDE.md` is corrected** on two points: fonts are a decision recorded here rather than
  something inherited "per the preset", and the design system now has a documented token layer.
- **`packages/design-system/README.md` is created** and is where the surviving half of
  `NEXTJS_HANDOFF.md` lives — motion rules, layout rules, the WCAG 2.2 AA bar and its viewport list,
  the surviving content rules, and the component inventory audited against the ADRs that killed most
  of it. This **clears the "Where the binding half of `NEXTJS_HANDOFF.md` lives" fog entry**, which
  #12 was expected to graduate and did not.
- **Two `Foundations` primitives gain rules they did not have.** `Button`'s `primary` + `ghost`
  pairing is a hazard on any consent surface — ADR-0025 requires two controls of _equal weight_
  because a filled primary beside a ghosted escape is D.1377 art. 6 conditioning arriving through
  CSS. And `Badge`'s `job-tag` variant dies with jobs, while the component itself must never be
  attached to a Person (ADR-0026).
- **`SaveJobButton` has no successor, and that is a decision.** A stored list of people someone is
  interested in is personal data with no _finalidad_ behind it, and ADR-0011 refused the
  profile-view log on narrower grounds than that. No save, no bookmark, no shortlist in v1.
- **The landing page is rebuilt in `apps/web` against these tokens, and `apps/landing/` is deleted
  at that point.** The rebuild is execution and sits past this map's destination, so it is filed as
  an implementation ticket rather than done here. Until it happens `apps/landing/` stays as
  reference and `NEXTJS_HANDOFF.md` is superseded by the README above.
- **The four prototypes are not redrawn.** They are dated artifacts of the decisions they
  illustrate, and re-rendering them in new tokens would imply they were reviewed again.

## Rejected

**The shipped cyan, kept as-is.** Fully legal — with the ramp authored it passes every check — and
free of churn on the primary. Rejected on the register: its restraint is imposed by the sRGB gamut
rather than chosen, so the product could never make its own brand colour more emphatic without
changing hue anyway. Choosing the constraint deliberately is worth the token edit.

**The handoff blue `#2457e6`.** It has the strongest claim on the record — four prototypes and the
reasoning in ADR-0023, ADR-0025, ADR-0026 and ADR-0027 are drawn in it. Rejected because at chroma
0.223 it reads bank, telco and tech startup, and because a hue that must be held back to look calm
puts the restraint somewhere unenforceable.

**Renaming the token layer to the handoff's vocabulary.** Costs a permanent hand-patch on every
`shadcn add` and buys nothing a user perceives.

**Deleting the thirteen unused `--sidebar-*` and `--chart-*` tokens.** This ADR's own first draft,
and rejected on review. The argument was that nothing renders them and `shadcn add chart` would
restore them on demand. But nothing renders anything yet — no UI is built and no UX is designed — so
the premise proves too much, and what comes back from the registry is the preset's cyan, re-derived
by whoever is mid-task when the need appears. Re-hueing them costs thirteen lines and closes the
question now, while there is attention on it.

**Re-hueing the chart ramp to civic blue and keeping its shape.** The cheapest possible change, and
wrong: five steps of one hue is a _sequential_ ramp, so using it for series identity tells the reader
series 5 is more of something than series 1. Matching it to the brand would have made a real defect
harder to see.

**Keeping dark mode and fixing its contrast.** Doubles every token here, and ADR-0017 can test
neither half. Deferred to its own ADR with the audit that implies.

**A `--muted` derived from the brand ramp**, as the palette skill's mapping suggests. It tints every
disabled surface and caption blue; a near-neutral with a slight hue bias toward the accent reads
chosen without colouring the page.
