import type { Metadata } from "next";

import { LegalDocument } from "../../_legal/legal-document";

export const metadata: Metadata = {
  title: "Política de tratamiento de datos — Encuentra",
  description: "Qué datos tratamos, para qué, cuánto tiempo, y cuáles son tus derechos.",
};

/** The route is English (ADR-0001); everything the page renders is Spanish. */
export default function ProcessingPolicyPage() {
  return <LegalDocument slug="processing-policy" />;
}
