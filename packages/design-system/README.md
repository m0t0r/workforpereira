# `@repo/design-system`

shadcn/ui components as raw TypeScript source, **Base UI underneath rather than Radix** (the preset's
`vega` style), so custom triggers use `render`, never `asChild`. No index barrel, no build step.

Add components with the CLI, scoped to this workspace — it refuses at the monorepo root:

```sh
pnpm dlx shadcn@latest add <name> -c packages/design-system
```

Let the CLI do it rather than hand-copying: it owns the registry, the import rewriting and the CSS
diffing.

**After every `shadcn add`, strip the `dark:` utilities it ships with, then run `pnpm build`.** This
is not cosmetic. ADR-0029 removed `@custom-variant dark`, so Tailwind falls back to its own `dark`
variant — `@media (prefers-color-scheme: dark)` — and a single leftover `dark:` utility fires
automatically on any device set to dark, with no class and nothing to toggle it. It is invisible in
review and invisible in the source; the compiled CSS is where you see it:

```sh
grep -c 'prefers-color-scheme\|\.dark' apps/web/.next/static/chunks/*.css   # must be 0
```

## The token layer

Decided in **ADR-0029**. `src/styles/globals.css` is the whole of it.

- **`--brand-*` is a private ramp; the semantic tokens are the seam.** Only semantic names reach
  Tailwind through `@theme inline`, so no component can address a raw shade. Changing the brand hue
  is one edit to eleven values.
- **Contrast lives in the lightness ramp, not the hue.** Every `L` is fixed and audited; hue and
  chroma move freely underneath. This is why a hue swap needs no contrast re-audit.
- **`--border` and `--input` are different jobs and must never be collapsed.** A divider identifies
  nothing and may be faint; an input's boundary is the only thing identifying the control, so
  WCAG 2.2 SC 1.4.11 requires 3:1. Both shadcn's preset and the usual palette-generator advice
  assign them one value and fail this.
- **Three semantic triads** — `success`, `warning`, `destructive` — each with a foreground, a
  surface and a border. Two rules ship with them: **`destructive` is only ever a limit of the
  platform, never anything a person did**, and **`warning` is never a state the person is merely
  waiting on**.
- **There is no dark mode.** Do not add a `.dark` block; adding the mode is a deliberate act with
  its own ADR.

Run `pnpm --filter @repo/design-system check-contrast` after any change to the file. It parses the
real CSS rather than a copy of the numbers, and it is in the pull-request gate. A token it names but
cannot find is a **failure, not a skip** — that is deliberate, and it is what stops an unused token
being deleted on the way past.

Contrast, OKLab distance and the colour-vision simulations all come from **`culori`**. Don't
hand-roll them back in: transcribed colour matrices produce plausible numbers when they are wrong,
which is how the ΔE figure in ADR-0029 was off by 3 until the library replaced it.

### Chart series

`--chart-1` … `--chart-5` are a **categorical** palette: they encode _which series_, never _how
much_. Three rules, and the first is the one that gets broken:

- **Assign the slots in order, starting at 1, and never cycle them.** The order is what the
  colour-vision separation is measured on, so re-ordering is a change to ADR-0029, not a preference.
  A sixth series is not a sixth colour — fold the tail into "Other", facet, or use small multiples.
- **Never colour a single series by its own value.** One series takes slot 1 and no legend; the
  title names it. Colouring bars by magnitude spends the identity channel re-encoding what the bar
  length already shows — and if you want magnitude, that is a one-hue ramp, which this is not.
- **Two series maximum in scatter, bubble, choropleth and small-multiple forms.** In those any two
  marks can end up side by side, and five slots cannot separate pairwise — no ordering fixes it.
  Bars, lines and stacked segments are unaffected; only neighbours touch there, and every adjacent
  pair is gated.

Every slot clears 3:1 on the page, so a mark is legible on its own. That is not a licence to drop
labels: for two or more series a legend is always present, so identity never rests on colour alone
(WCAG 1.4.1).

**`success`, `warning` and `destructive` are reserved and are never "series 4".** When a series
genuinely _means_ good or bad — an error rate, a pass/fail split — it wears the semantic token and
ships with an icon and a label. When it is just another category, it wears a chart slot. Never both
in one chart.

### Sidebar

`--sidebar-*` carries **real values as of ADR-0031**, which built the operator surface — the first
and, in v1, the only persistent navigation in the product. That was the day this block was parked
against.

The sidebar sits **one step off the page**, never a second palette: same hue, same ink, a deeper
ground. Three tokens left the alias and each for a reason worth keeping:

- `--sidebar` deepened, because a nav that only just leaves the page reads as a rendering artefact
  rather than a region.
- `--sidebar-accent` deepened, because the page value was chosen against white and is nearly
  invisible on the sidebar's own ground — hover and the current item would separate by almost
  nothing.
- `--sidebar-border` deepened for the same reason: it divides the nav from the page, so it is
  measured against the darker of the two.

The ink and the brand stayed aliases deliberately — they do not change because the ground did. And
`--sidebar-primary` marks the **current item**, never a call to action.

## Typography

Inter (body), Figtree (headings), Geist Mono — loaded in `apps/web/app/layout.tsx` via
`next/font/google`, which self-hosts them at build time so nothing is fetched from Google at
runtime. Heading tracking is re-derived against Figtree when a real page needs it; the handoff's
`-0.06em` was tuned for Manrope and does not transfer.

Body copy is never below 12px. Use `font-variant-numeric: tabular-nums` for pay figures, counts and
dates. Sentence case; no all-caps outside small eyebrow labels.

---

# Design rules that outlived `NEXTJS_HANDOFF.md`

`apps/landing/NEXTJS_HANDOFF.md` was written for a vacancy-centric job board. The pivot to a
profile-first platform superseded most of it, and ADR-0026 and ADR-0029 killed the rest of the
trust surface. **This section is the surviving half**, and it is the version to read —
`NEXTJS_HANDOFF.md` is reference only until `apps/landing/` is deleted.

## Accessibility bar

Non-negotiable, and the most load-bearing thing the handoff got right.

- **WCAG 2.2 AA.** Meaning never depends on colour alone.
- All controls reachable by keyboard, with a **2px visible focus ring** — `--ring`, which clears 3:1.
- Inputs need real labels; visually-hidden labels are acceptable. Decorative icons are
  `aria-hidden`.
- Toggle controls use `aria-pressed`; selected states carry a text label, not just a colour.
- Announce dynamic changes through live regions — one polite region per surface, not one per
  control (ADR-0023 specifies this for the skill picker).
- Test at **390 / 768 / 1024 / 1440**. At 390 the header keeps the wordmark and the primary action
  and moves navigation into a menu.
- **Never bind a bare unmodified letter key** as a global shortcut. It collides with type-ahead in
  any listbox not built from a real `<input>`, and ADR-0023 puts a ~300-option combobox at the front
  door.

Known gaps, named rather than left silent: no browser end-to-end tests exist (ADR-0017), so the
consent path, the skill picker's ARIA contract and the first run's control weighting are guarded by
prose. No screen-reader pass has been run on any prototype.

## Interaction and motion

- Button press: scale to `.97` over 120–160ms.
- Card hover only under `@media (hover: hover) and (pointer: fine)`; transform and shadow only,
  max 180ms.
- Toasts: 180–220ms opacity/translate, never blocking input, announced with `role="status"`.
- Search and filter controls react instantly. Never animate a keyboard-triggered state change.
- Honour `prefers-reduced-motion` by removing transform-based motion.

`tw-animate-css` is available for shadcn's own component animations; its utilities are not exempt
from the reduced-motion rule.

## Layout

- Content max width 1180px; desktop gutters 24px minimum.
- One visual focal point per section.
- Local imagery is a full-width band, never a decorative background behind text.
- **No earthquake damage imagery anywhere**, and no disaster framing. The product's proposition is
  income and agency, never charity.

## Content rules

Surviving from the handoff:

- **Never imply a guarantee of employment.**
- Avoid fictional person or pay data outside a prototype clearly marked as one.

Dead, and why — do not reintroduce them:

- _"Empresas verificadas"_ — there are no companies, and nothing is verified (ADR-0026).
- _"State «verificada» only after a real company-verification process exists"_ — retired with the
  badge rather than kept as an escape hatch (ADR-0026).
- _"Postularte es gratis"_ — there is no _postulación_; `CONTEXT.md` bans the word (ADR-0026).
- _"Respuestas en un solo lugar"_ — it promises a reply, and nothing promises a reply (ADR-0026).
- _"Empty states should … complete the profile"_ — completeness is never scored (ADR-0023), and the
  suggestion engine never pads an empty surface (ADR-0016).

Voice fragments live in `CONTEXT.md` and ADR-0023 for now: the product addresses people as **tú**,
and adjectives agree with the object, never with the reader. A real voice guide is past the current
map's destination.

## Component inventory, audited

Primitives worth building, with the rules the ADRs attach to them:

| Primitive                                                | Rule                                                                                                                                                                                                              |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                                                 | Minimum 40px height. **A filled `primary` beside a ghosted escape is forbidden on any consent surface** — ADR-0025 requires two controls of equal weight, because D.1377 art. 6 conditioning arrives through CSS. |
| `IconButton`                                             | 40×40 interactive area, visible focus ring, screen-reader label required.                                                                                                                                         |
| `Badge`                                                  | `job-tag` is dead with jobs. **Never attach one to a Person** — ADR-0026 forbids per-person signals of any kind.                                                                                                  |
| `Card`                                                   | Base, interactive and elevated. Only interactive cards get hover motion.                                                                                                                                          |
| `Checkbox` `Input` `Select` `Dialog` `Toast` `Accordion` | Standard, from the CLI.                                                                                                                                                                                           |
| `Logo`                                                   | Text wordmark and a simple mark. **No brand mark exists**; commissioning one is out of scope until brand work happens.                                                                                            |

Gone with the vacancy model: `JobSearch`, `TrustProof`, `JobCard`, `SaveJobButton`, `FilterSidebar`,
`ApplicationTimeline`, `NextStepCard`, `CompanyBadge`, `CompletionMeter`, `ApplyPanel`.

Two of those deserve their epitaphs, because the shape is tempting again:

- **`SaveJobButton` has no successor.** A stored list of people someone is interested in is personal
  data with no _finalidad_, and ADR-0011 refused the profile-view log on narrower grounds. No save,
  no bookmark, no shortlist in v1.
- **`FilterSidebar` is doubly dead** — ADR-0014 declined facet counts on privacy grounds
  (_"cuidado de niños · Pereira (47)"_ is a census of vulnerable people) and bands location rather
  than filtering it.
- **`CompletionMeter` is superseded rather than deleted.** ADR-0023 replaces it with a bar marking
  the _floor_: progress may be shown, completeness may not be scored.
