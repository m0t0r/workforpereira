import type { Metadata } from "next";

import { LegalDocument } from "../../_legal/legal-document";

export const metadata: Metadata = {
  title: "Aviso de privacidad — Encuentra",
  description: "El resumen de qué datos tratamos y para qué.",
};

export default function PrivacyNoticePage() {
  return <LegalDocument slug="privacy-notice" />;
}
