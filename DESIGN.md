---
name: Encuentra
description: Trabajo entre personas, en Pereira y los demás municipios de Risaralda.
colors:
  primary: "oklch(0.48 0.122 248)"
  primary-foreground: "oklch(1 0 0)"
  page: "oklch(1 0 0)"
  ink: "oklch(0.2 0.012 248)"
  ink-quiet: "oklch(0.54 0.02 248)"
  tint: "oklch(0.97 0.004 248)"
  chip: "oklch(0.955 0.008 248)"
  rule: "oklch(0.915 0.006 248)"
  field-edge: "oklch(0.65 0.02 248)"
  ring: "oklch(0.48 0.122 248)"
  success: "oklch(0.45 0.1 155)"
  success-surface: "oklch(0.965 0.028 155)"
  success-border: "oklch(0.82 0.06 155)"
  warning: "oklch(0.45 0.094 75)"
  warning-surface: "oklch(0.965 0.028 75)"
  warning-border: "oklch(0.82 0.072 75)"
  destructive: "oklch(0.45 0.13 22)"
  destructive-surface: "oklch(0.965 0.016 22)"
  destructive-border: "oklch(0.82 0.078 22)"
typography:
  display:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
  xl: "0.875rem"
  2xl: "1.125rem"
  full: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  2xl: "3rem"
  gutter: "1.5rem"
  measure: "65ch"
  container: "1180px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "0 0.625rem"
    height: "2.5rem"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "oklch(0.48 0.122 248 / 0.8)"
    textColor: "{colors.primary-foreground}"
  button-outline:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "2.5rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "2.5rem"
  card:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "1rem"
  row:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.875rem 1rem"
  skill-chip:
    backgroundColor: "{colors.chip}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.25rem 0.5rem"
    typography: "{typography.mono}"
  badge-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0.125rem 0.5rem"
    height: "1.25rem"
  tab-active:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  tab-rest:
    backgroundColor: "{colors.tint}"
    textColor: "oklch(0.2 0.012 248 / 0.6)"
    rounded: "{rounded.md}"
---

# Design System: Encuentra

## Overview

**Creative North Star: "The Notice Board"**

A board in a plaza. Anyone may pin something up; nothing pinned to it is ranked, endorsed or verified. The board does not vouch for anybody — it only shows what people put there, at the size they put it, in the order the board happens to be holding them. That is not a stylistic conceit. Encuentra carries one structured offer of paid work between two people and stops at the introduction, nothing about a person is scored, and the public surface is a sample rather than a directory. A visual system that implied curation, endorsement or rank would be describing a different product.

So the system is quiet on purpose and the quiet does the work. Surfaces are flat, divisions are hairlines, and hierarchy is carried by type — size, weight and space — rather than by colour, ornament or elevation. There is exactly one accent, a **civic blue** at a deliberately institutional depth, and it appears only where something can be _done_: a button, a link, a focus ring, the numeral on a step. Everything else is ink on paper. Where the interface has something to say it says it in Inter at a readable measure; where a person has something to say, their sentence goes first and the interface gets out of the way.

The register the whole thing is tuned against is **a neighbour, not an institution** — plain, direct, warm, and never selling. The confirmed anti-references are the two the product exists to escape: the job board, with its ranked results, badges, verification ticks and completeness meters; and the charity appeal, with its disaster imagery, its before-and-after framing, and its beneficiary voice. Neither may be reached for, at any scale, for any reason.

**Key Characteristics:**

- Flat at rest; depth is a response to state, never a decoration.
- One accent, reserved for action; ink and hairlines everywhere else.
- Type carries hierarchy — Figtree for headings, Inter for everything read.
- Every card the same weight as its neighbour. Nothing is featured.
- Nothing attached to a person: no badge, no tick, no rating, no meter.
- Light only. There is no dark mode, by decision.

## Colors

A near-neutral page tinted very slightly toward the brand hue, with a single blue accent held at an institutional depth. Every lightness in the ramp is fixed and audited; hue and chroma move freely underneath, which is why changing the brand hue needs no contrast re-audit.

### Primary

- **Civic Blue** (`oklch(0.48 0.122 248)`): the only accent in the system. Buttons that submit or navigate, text links, the focus ring, and the numbered step markers. It is shade 700 of the private ramp rather than 600 — the register is institutional, and 700 carries white at 6.5:1 rather than 4.9:1.

### Neutral

- **Page** (`oklch(1 0 0)`): the ground for the page and for every card. Cards do not tint; they separate by rule and radius.
- **Ink** (`oklch(0.2 0.012 248)`): all primary text. Not black — it carries a trace of the brand hue so type and accent belong to the same family.
- **Quiet Ink** (`oklch(0.54 0.02 248)`): secondary prose, metadata lines, label columns. Tinted from the brand hue rather than grey; a true grey reads as a rendering fault beside the tinted ink.
- **Tint** (`oklch(0.97 0.004 248)`): the two-percent step used to band a section off the page — the mechanism strip, the footer, a tab list at rest.
- **Chip** (`oklch(0.955 0.008 248)`): the ground for skill chips and other inert, non-interactive labels.
- **Rule** (`oklch(0.915 0.006 248)`): every divider, card edge and section boundary. Faint on purpose; a divider identifies nothing.
- **Field Edge** (`oklch(0.65 0.02 248)`): the boundary of a form control, and nothing else.

### Named Rules

**The Private Ramp Rule.** The eleven `--brand-*` shades are the source and are never referenced outside `globals.css`. Components address the semantic names only, so swapping the brand hue is one edit to eleven values and no component knows.

**The Two Boundaries Rule.** `--border` and `--input` are different jobs and must never be collapsed into one value. A divider identifies nothing and may be faint; an input's boundary is the only thing identifying the control, so WCAG 2.2 SC 1.4.11 requires 3:1 against the page. Both shadcn's preset and the usual palette-generator advice assign them one value and fail this.

**The Reserved Status Rule.** `success`, `warning` and `destructive` are states, never decoration and never a chart series. Two prohibitions ride with them: **`destructive` is only ever a limit of the platform, never anything a person did**, and **`warning` is never a state a person is merely waiting on**. Colour never carries meaning alone — every state ships with text.

**The One Accent Rule.** If a thing is not actionable, it is not blue. A heading, a metric, a chip, a rule, a decorative flourish: all ink. The accent's usefulness is its rarity.

## Typography

**Display Font:** Figtree (with `ui-sans-serif, system-ui, sans-serif`)
**Body Font:** Inter (with `ui-sans-serif, system-ui, sans-serif`)
**Mono Font:** Geist Mono (with `ui-monospace, monospace`)

All three are self-hosted at build time through `next/font/google`; nothing is fetched from Google at runtime.

**Character:** Figtree is rounder and warmer than Inter at display sizes, which is what keeps a page full of institutional blue from reading as a government form. Inter does the reading. The pairing is a recorded decision, not an inheritance — the shadcn preset specified only `font: "inter"` with `fontHeading: "inherit"`, so the heading face was chosen here.

### Hierarchy

- **Display** (Figtree 700, `clamp(1.75rem, 4vw, 2.25rem)`, line-height 1.12, tracking `-0.025em`): the two Wall questions and the section heading. The largest type on the page, and it is a question addressed to the reader.
- **Headline** (Figtree 700, `1.5rem`, tracking `-0.025em`): the heading inside a switched panel.
- **Title** (Figtree 600, `1.125rem`, tracking `-0.025em`): a step lead, a card row's name when it has no sentence of its own.
- **Body** (Inter 400, `1rem`, line-height 1.5): all prose. Never below 12px anywhere in the product.
- **Label** (Inter 400, `0.875rem`): metadata lines, label/value rows, foot links.
- **Mono** (Geist Mono 400, `0.75rem`): development chrome and machine text only. Never a costume for "technical".

### Named Rules

**The Re-derived Tracking Rule.** Heading tracking is derived against **Figtree**, not inherited. The original handoff's `-0.06em` was tuned for Manrope and does not transfer; Figtree at display sizes sits correctly at `-0.025em`.

**The Measure Rule.** Body prose is bound to 65–75 characters (`max-w-prose`, 65ch). This binds hardest where a card goes full-bleed at a stacked breakpoint — a row that reads at 55ch in two columns runs to 90ch at 768 unless it is capped.

**The Their Words First Rule.** Where a person has written a sentence about themselves, that sentence leads the card in ink at body size, and their name follows it in quiet ink at label size. Name-first is the shape of a directory; sentence-first is the shape of this product.

**The Tabular Money Rule.** Pay figures, counts and dates set `font-variant-numeric: tabular-nums`, so a column of amounts aligns on its digits.

## Layout

A single centred column, **1180px maximum**, with **24px minimum gutters**. One visual focal point per section. Sections separate by a hairline rule and by an alternating tint rhythm — a tinted band, then page ground, then page ground — never by two tinted blocks in contact.

Density is comfortable rather than dense: section padding runs 48px at 390 and 64–80px from `lg`, and content inside a section stacks on a 8/12/20/24px rhythm.

**Responsive behaviour is mobile-first without exception.** The base classes are the phone — the local reader is on one, often on a connection that is not assumed to be good — and breakpoint variants add the wider cases. Two-column structures collapse to one below `lg` (1024px) and their vertical divider becomes a horizontal one. Actions go full width at 390 and auto from `sm` (640px). The four widths that must be checked are **390 / 768 / 1024 / 1440**.

### Named Rules

**The Equal Columns Rule.** Where the interface addresses its two readers side by side, the two columns are the same object at the same size: same type scale, same action weight, same row shape. No prop, class or copy choice may make one louder than the other.

**The Shared Bands Rule.** Two columns that must line up use `grid-template-rows: subgrid` so their rows are shared bands sized by the taller cell. Never a fixed height, a `min-h`, or a matched `line-clamp` on the headings — those fake alignment and break silently on longer copy, a translation, or a larger user font size.

**The No Sideways Scroll Rule.** `document.documentElement.scrollWidth` equals the viewport at all four test widths. This is measured, not eyeballed; a headless screenshot that does not honour the layout viewport will report a false overflow.

## Elevation & Depth

**The system is flat.** Depth is conveyed by hairline rules, radius and the two-percent tint step, not by shadow. A card carries `shadow-xs` and a `1px` ring at 10% ink — just enough to lift it off the page at a glance — and nothing else in the system carries a shadow at rest.

Shadow exists only as a **response to state**: an interactive row lifts 2px and takes `shadow-md` on hover, under a real pointer, inside 150ms. That is the whole shadow vocabulary.

### Shadow Vocabulary

- **Resting card** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): the only shadow present without interaction, and paired with `ring-1 ring-foreground/10` rather than doing the work alone.
- **Pointer hover** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): an interactive card or row under `@media (hover: hover) and (pointer: fine)`.

### Named Rules

**The Flat-At-Rest Rule.** Surfaces are flat until something happens to them. A shadow that is not answering a hover, a focus or an overlay is decoration, and there is no decoration in this system.

**The Real Pointer Rule.** Hover motion is gated behind `@media (hover: hover) and (pointer: fine)` **and** `motion-safe`, transform and shadow only, 180ms ceiling. Gate it behind `motion-safe` rather than undoing it with a `motion-reduce` override afterwards: a later override of equal specificity wins only by variant sort order, and honouring `prefers-reduced-motion` must not depend on that. An ungated background-colour hover is specifically wrong — on a touch device it sticks after the tap.

## Shapes

Gently rounded, on one scale derived from a single `0.625rem` root: **6px** for small inert marks, **8px** for buttons, rows and chips, **10px** for the default surface, **14px** for a card, and **full** for a badge or a step numeral. Nothing in the system is square-cornered and nothing is a circle except a numeral marker and a badge.

Borders are **1px**, always, in the rule colour — except one: a section head closes with a **2px rule in full ink**, which is the only heavy line in the system and the thing that says _below this point are other people's words_.

Form language is rectangular and calm. No angled cuts, no clipped corners, no blobs, no gradient fills, no glass. A photograph is a rounded square, never a circle — a circular crop reads as an avatar, and an avatar implies an account rather than a person.

### Named Rules

**The One Heavy Line Rule.** The 2px ink rule appears once per column, under a section's action, and nowhere else. A second heavy line anywhere on the page spends it.

## Components

### Buttons

- **Shape:** 8px radius (`--radius-md`), 40px minimum height for every size that appears in the product.
- **Primary:** civic blue ground, white label, `hover` to 80% opacity. The only filled control in the system.
- **Outline:** page ground, `--border` edge, `shadow-xs`, tints to `--muted` on hover.
- **Ghost:** no ground until hover, then `--muted`. Used for the secondary header action.
- **Link:** accent text, underline on hover, `underline-offset-4`. Used for a foot link, with a drawn arrow icon at `inline-end`.
- **Focus:** shadcn's `ring-3` at `--ring/50` for `Button` specifically — the one documented exemption from the outline ring below.
- **Press:** scale to `.97` over 120–160ms.

### Rows (the Wall entry)

- **Shape:** 8px radius, 1px rule edge, page ground, `0.875rem 1rem` padding.
- **Media:** a 56px rounded square at 390, 64px from `sm`. **Absent entirely when there is no photograph** — see the No Placeholder Rule.
- **Content:** the person's own sentence in ink at body size, clamped to 3 lines and bound to 65ch; then their name and place in quiet ink at label size; then skill chips.
- **Interactive rows** take the pointer-hover lift; non-interactive rows take nothing.
- **Focus:** the 2px outline ring at full `--ring`, `outline-offset-2`.

### Cards (the drawn object)

- **Shape:** 14px radius, page ground, `shadow-xs` plus `ring-1` at 10% ink, 24px internal padding (16px at the `sm` size).
- **Header:** a title in Figtree at body size, with a badge in the action slot.
- **Body:** label/value rows divided by hairlines, label in quiet ink, value in ink and medium weight, right-aligned.
- **Width:** capped at **26rem** wherever the column would otherwise stretch it. A label/value list at 700px parks its two halves at opposite ends of the screen.

### Chips

- **Skill chip:** `--secondary` ground, ink text, 8px radius, `0.25rem 0.5rem` padding, extra-small. Inert — never a control, never a filter, never a link.
- **Badge:** transparent with a `--border` edge, full radius, extra-small. Used to mark an illustration as an example, and for nothing attached to a person.

### Tabs

- **List:** `--muted` ground, 10px radius, 3px inset. Full width and stacked below `sm`; `w-fit` and two columns above.
- **Active trigger:** page ground, ink text, 8px radius.
- **Rest trigger:** transparent, ink at 60%.
- Labels are whole clauses in this product, so `whitespace-normal` and an auto height are required overrides.

### Empty states

- Dashed 1px rule, 10px radius, centred title and description. States the fact and stops: it never counts what is missing, never scores completeness, and never tells anyone to complete anything.

### Named Rules

**The No Signal On A Person Rule.** Nothing is verified about anybody, so no badge, tick, rating, meter, score, level, activity indicator or trust line may ever be attached to a Person — on a card, a profile, a search result or a suggestion. This is the single hardest prohibition in the system and it has no automated guard.

**The No Placeholder Rule.** A Person with no photograph gets **no placeholder at all** — no silhouette, no grey disc, no initials, no empty ring, and in particular no `Avatar`, whose contract requires a fallback. The row simply re-flows and the name takes the leading position. A placeholder is a hole where a face should be, and a hole is a penalty rendered in CSS against somebody for exercising a consent the law requires be free.

**The Outline Ring Rule.** Every keyboard-reachable control shows a **2px visible ring at full `--ring`** with `outline-offset-2`, which is the value the contrast gate proves clears 3:1. `Button` carries its own ring and is the only exemption. A shadcn primitive's default `ring-[3px] ring-ring/50` is **not** that value — half opacity is not the audited colour — so an imported primitive gets the project ring, not its own.

**The Equal Answer Rule.** Where a control accepts and a control refuses, the two are the same size and the same shape and the refusal is never a ghost. This holds in drawn illustrations as strictly as in real controls: a diagram that draws _no_ as the quieter option is where the asymmetry gets into the real thing.

## Do's and Don'ts

### Do:

- **Do** carry hierarchy with type — size, weight and space. Figtree 700 at `clamp(1.75rem, 4vw, 2.25rem)` for a section's question, Inter at 1rem for what is read.
- **Do** reserve civic blue (`oklch(0.48 0.122 248)`) for things that can be acted on, and use ink and hairlines for everything else.
- **Do** write the phone layout first and add `lg:` for the split. Check 390 / 768 / 1024 / 1440 and measure `scrollWidth` rather than trusting a screenshot.
- **Do** bind prose to 65ch, especially where a card goes full-bleed at a stacked breakpoint.
- **Do** use `grid-template-rows: subgrid` when two columns must line up.
- **Do** give a person's own sentence the leading position on any card that has one.
- **Do** draw icons from Lucide at a consistent stroke, and mark them `aria-hidden` when the adjacent text already says it.
- **Do** run `pnpm --filter @repo/design-system check-contrast` after any edit to `globals.css`. It parses the real file and is in the pull-request gate.
- **Do** strip every `dark:` utility from a component the shadcn CLI adds, then confirm with `grep -c 'prefers-color-scheme\|\.dark'` on the compiled CSS.

### Don't:

- **Don't** attach any badge, tick, rating, meter or trust line to a Person, anywhere, at any size.
- **Don't** render a placeholder for a missing photograph, and don't crop a photograph to a circle.
- **Don't** collapse `--border` and `--input` into one value.
- **Don't** reference a `--brand-*` shade outside `globals.css`.
- **Don't** add a `.dark` block or a dark variant. There is no dark mode; adding the mode is a deliberate act with its own decision record.
- **Don't** put a shadow on anything at rest beyond the resting card, and don't hover-tint a background without gating it behind a real pointer.
- **Don't** place a `--muted` block immediately against another `--muted` block; the tint rhythm is what separates sections.
- **Don't** use a second heavy rule on a page — the 2px ink line is spent once per column.
- **Don't** use a Unicode glyph (`→`, `✓`, `★`) where an icon belongs, and don't use Geist Mono as a costume for "technical".
- **Don't** reach for disaster imagery, before-and-after framing, or any charity register — and don't reach for job-board furniture: ranked results, verification ticks, completeness meters, saved-candidate lists or facet counts.
- **Don't** fake column alignment with a fixed height, a `min-h`, or a matched `line-clamp`.
