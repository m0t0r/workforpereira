/**
 * ADR-0029 — proves the shipped token layer meets WCAG 2.2 AA.
 *
 * This reads `src/styles/globals.css` and resolves the real declarations. It is deliberately not
 * a table of numbers copied out of the ADR: a validator that does not read the artifact proves
 * nothing about the artifact.
 *
 * The colour maths is `culori`'s, not ours. An earlier draft hand-rolled OKLCH-to-sRGB, the WCAG
 * luminance formula and the Machado colour-vision matrices; the numbers happened to agree to the
 * decimal, which is exactly the problem — a transcribed 3x3 matrix that is wrong in one digit
 * still produces plausible output, and nothing here would have caught it. The only maths this file
 * still owns is reading a stylesheet.
 *
 * When ADR-0017's testing lane lands, this becomes an Invariant Test. Until then it is a script,
 * and `pnpm --filter @repo/design-system check-contrast` is how it runs.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  differenceEuclidean,
  filterDeficiencyDeuter,
  filterDeficiencyProt,
  parse,
  wcagContrast,
} from "culori";

const CSS = join(dirname(fileURLToPath(import.meta.url)), "../src/styles/globals.css");

/** WCAG 2.2 thresholds. 4.5 for normal text (1.4.3), 3.0 for UI component boundaries (1.4.11). */
const TEXT = 4.5;
const NON_TEXT = 3.0;

/**
 * Every pair that has to hold, with the rule that forces it. A token missing from `globals.css`
 * is a failure, not a skip — that is what catches a deletion.
 */
const PAIRS = [
  ["foreground", "background", TEXT, "body text"],
  ["card-foreground", "card", TEXT, "card text"],
  ["popover-foreground", "popover", TEXT, "popover text"],
  ["primary-foreground", "primary", TEXT, "primary button label"],
  ["secondary-foreground", "secondary", TEXT, "secondary button label"],
  ["accent-foreground", "accent", TEXT, "accent surface text"],
  ["muted-foreground", "background", TEXT, "muted text on the page"],
  ["muted-foreground", "muted", TEXT, "muted text on its own surface"],
  ["primary", "background", TEXT, "primary used as a link"],
  ["destructive-foreground", "destructive", TEXT, "destructive button label"],
  ["success", "success-surface", TEXT, "success notice text"],
  ["success", "background", TEXT, "success text on the page"],
  ["warning", "warning-surface", TEXT, "warning notice text"],
  ["warning", "background", TEXT, "warning text on the page"],
  ["destructive", "destructive-surface", TEXT, "destructive notice text"],
  ["destructive", "background", TEXT, "destructive text on the page"],
  // SC 1.4.11. `--input` is the only thing identifying a text field, and `--ring` the only thing
  // identifying focus, so both are UI components. `--border` is a divider and is exempt.
  ["input", "background", NON_TEXT, "input boundary (SC 1.4.11)"],
  ["ring", "background", NON_TEXT, "focus indicator (SC 1.4.11)"],

  // Chart series are graphical objects conveying information, so SC 1.4.11 applies to each.
  // Holding every slot at 3:1 is what lets a mark be read without leaning on its label.
  ["chart-1", "background", NON_TEXT, "chart series 1 (SC 1.4.11)"],
  ["chart-2", "background", NON_TEXT, "chart series 2 (SC 1.4.11)"],
  ["chart-3", "background", NON_TEXT, "chart series 3 (SC 1.4.11)"],
  ["chart-4", "background", NON_TEXT, "chart series 4 (SC 1.4.11)"],
  ["chart-5", "background", NON_TEXT, "chart series 5 (SC 1.4.11)"],

  // The sidebar tokens alias the page today, but they are separately addressable in Tailwind,
  // so they are audited separately — that is what catches the day someone gives them own values.
  ["sidebar-foreground", "sidebar", TEXT, "sidebar text"],
  ["sidebar-primary-foreground", "sidebar-primary", TEXT, "sidebar primary label"],
  ["sidebar-accent-foreground", "sidebar-accent", TEXT, "sidebar accent text"],
  ["sidebar-ring", "sidebar", NON_TEXT, "sidebar focus indicator (SC 1.4.11)"],
];

/**
 * Colour-vision separation between chart slots. Contrast against the page is not enough for a
 * categorical palette: two series can each clear 3:1 and still be the same colour to a reader
 * with protanopia or deuteranopia.
 *
 * ADJACENT pairs only. That is the gate for bars, lines and stacked segments, where slots are
 * assigned in order and only neighbours touch. Scatter, bubble, map and small-multiple forms
 * need every pair to hold, which five slots cannot do at any ordering — those forms carry two
 * series from this palette and fold the rest into "Other". ADR-0029 records why.
 */
const CHART_SLOTS = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];
const CVD_MIN = 8.0; // OKLab deltaE x100, worst of protan/deutan
const NORMAL_MIN = 15.0; // OKLab deltaE x100, unsimulated vision

/** culori's simulations are Machado-Oliveira-Fernandes (2009); severity 1.0 is full dichromacy. */
const SIMULATE = { protanopia: filterDeficiencyProt(1), deuteranopia: filterDeficiencyDeuter(1) };
const oklabDistance = differenceEuclidean("oklab");
const deltaE = (a, b) => 100 * oklabDistance(a, b);

function parseTokens(css) {
  const root = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  if (!root) throw new Error("no :root block found in globals.css");
  const tokens = new Map();
  for (const line of root[1].split("\n")) {
    const m = line.match(/^\s*--([\w-]+):\s*([^;]+);/);
    if (m) tokens.set(m[1], m[2].trim());
  }
  return tokens;
}

/**
 * Follows `var(--x)` indirection to a literal colour, then hands the string to culori.
 * The indirection is the only part culori cannot do — it parses colours, not stylesheets.
 */
function resolve(tokens, name, seen = new Set()) {
  const raw = tokens.get(name);
  if (raw === undefined) throw new Error(`token --${name} is not defined`);
  const ref = raw.match(/^var\(--([\w-]+)\)$/);
  if (ref) {
    if (seen.has(name)) throw new Error(`token --${name} is a circular reference`);
    seen.add(name);
    return resolve(tokens, ref[1], seen);
  }
  const colour = parse(raw);
  if (!colour) throw new Error(`token --${name} is not a colour culori can parse: ${raw}`);
  return colour;
}

const css = readFileSync(CSS, "utf8");
const failures = [];

// ADR-0029 removed dark mode. A reintroduced `.dark` block would double every token above
// without any of them being audited, so it fails here rather than in a browser.
if (/^\s*\.dark\s*\{/m.test(css) || /@custom-variant\s+dark/.test(css)) {
  failures.push("a dark-mode block is present — ADR-0029 removed it; re-adding it needs an ADR");
}

const tokens = parseTokens(css);

for (const [fg, bg, min, why] of PAIRS) {
  let ratio;
  try {
    ratio = wcagContrast(resolve(tokens, fg), resolve(tokens, bg));
  } catch (error) {
    failures.push(`${fg} on ${bg} — ${error.message}`);
    continue;
  }
  const pass = ratio >= min;
  if (!pass) failures.push(`${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs ${min}:1 — ${why}`);
  console.log(
    `${pass ? "pass" : "FAIL"}  ${ratio.toFixed(2).padStart(5)}:1  (min ${min})  ${fg} on ${bg} — ${why}`,
  );
}

console.log("");
for (let i = 0; i < CHART_SLOTS.length - 1; i++) {
  const [a, b] = [CHART_SLOTS[i], CHART_SLOTS[i + 1]];
  let cvd;
  let normal;
  try {
    const [x, y] = [resolve(tokens, a), resolve(tokens, b)];
    cvd = Math.min(...Object.values(SIMULATE).map((simulate) => deltaE(simulate(x), simulate(y))));
    normal = deltaE(x, y);
  } catch (error) {
    failures.push(`${a} vs ${b} — ${error.message}`);
    continue;
  }
  const pass = cvd >= CVD_MIN && normal >= NORMAL_MIN;
  if (!pass) {
    failures.push(
      `${a} vs ${b} separate by ΔE ${cvd.toFixed(1)} under colour-vision deficiency ` +
        `(needs ${CVD_MIN}) and ${normal.toFixed(1)} under normal vision (needs ${NORMAL_MIN})`,
    );
  }
  console.log(
    `${pass ? "pass" : "FAIL"}  ΔE ${cvd.toFixed(1).padStart(5)} cvd / ${normal.toFixed(1).padStart(5)} normal  ` +
      `(min ${CVD_MIN} / ${NORMAL_MIN})  ${a} vs ${b} — adjacent chart slots`,
  );
}

if (failures.length > 0) {
  console.error(`\n${failures.length} contrast failure(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `\nAll ${PAIRS.length} pairs meet WCAG 2.2 AA, and all ${CHART_SLOTS.length - 1} adjacent ` +
    `chart slots separate under simulated colour-vision deficiency.`,
);
