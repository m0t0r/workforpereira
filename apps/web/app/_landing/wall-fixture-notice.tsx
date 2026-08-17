import { Container } from "./container";

/**
 * The on-screen half of the fixture marking. Rendered above the header whenever `readWall` is
 * returning `wall-fixtures.ts`, which is every environment except production.
 *
 * **It is English on purpose.** `CLAUDE.md`: a prototype's own controls are chrome, not UI copy, and
 * chrome is English even in a Spanish-only product. Saying this in Spanish would make it look like
 * something a visitor is meant to read, which is the one thing it must not look like.
 *
 * It is not `warning`-coloured. ADR-0029 reserves that triad, and nothing here is a state anyone is
 * waiting on — this is a note to whoever is looking at the page while it is being built.
 */
export function WallFixtureNotice() {
  return (
    <div className="bg-secondary text-secondary-foreground border-border border-b py-2">
      <Container>
        <p className="font-mono text-xs">
          Fixture data — the people and needs below are invented, and are not served in production.
          See <code>app/_landing/wall-fixtures.ts</code>.
        </p>
      </Container>
    </div>
  );
}
