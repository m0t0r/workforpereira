import { Body, Container, Head, Html, Preview, Section, Text } from "react-email";
import type { ReactElement, ReactNode } from "react";

/**
 * The shell every notification is written into.
 *
 * **No Tailwind, no colours, no logo, and that is a decision rather than a stub.** ADR-0029 owns
 * this product's visual identity and says nothing about email; inventing a palette here would put a
 * second, unreviewed brand in a channel nobody can see in the contrast gate. The structure is
 * correct and the styling is deliberately the plainest thing that renders the same everywhere —
 * which is also what a five-line transactional message needs. Whoever extends ADR-0029 to email
 * takes this file.
 *
 * `lang="es"` because ADR-0001 confines Spanish to what a user reads, and this is all a user reads.
 *
 * The React Email skill's `<Tailwind>`, `<Button>` and `<Img>` guidance is not ignored, it is not
 * yet reachable: there is no link to put in a button (no domain — ADR-0022's launch gate) and no
 * asset host to serve a logo from.
 */
export function NotificationLayout({
  preview,
  children,
}: {
  preview: string;
  children: ReactNode;
}): ReactElement {
  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Body style={{ backgroundColor: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <Preview>{preview}</Preview>
        <Container style={{ padding: "24px 0", maxWidth: "560px" }}>
          <Section>{children}</Section>
          <Text style={{ fontSize: "12px", lineHeight: "20px", color: "#555555" }}>
            Este es un mensaje automático. No respondas a este correo.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

/** One paragraph, at the size the body text is read at. */
export function Paragraph({ children }: { children: ReactNode }): ReactElement {
  return <Text style={{ fontSize: "16px", lineHeight: "26px", color: "#111111" }}>{children}</Text>;
}
