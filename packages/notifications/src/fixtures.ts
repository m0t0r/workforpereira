import type { Db, Tx } from "@repo/db";
import { notificationOutbox } from "@repo/db/schema";
import { eq } from "drizzle-orm";

import type { NotificationReporter, PoisonedNotification, SendVolumeWarning } from "./reporting";
import type { EmailMessage, EmailSender, SendOutcome } from "./sending";

/**
 * Fixtures for this package's tests, and **duplicated from every other package's on purpose**
 * (ADR-0017). A shared fixtures package would make `@repo/db/testing` depend on the modules whose
 * tests depend on it, inverting ADR-0006's DAG — `turbo boundaries` rejects the cycle and no amount
 * of tidiness is worth reopening it.
 *
 * Not exported from `index.ts`, so ADR-0006's single-entry `exports` map keeps it unreachable from
 * anywhere but here.
 */

/** A sender that answers the same way every time and remembers what it was asked to send. */
export function scriptedSender(outcome: SendOutcome | SendOutcome[]): EmailSender & {
  readonly sent: EmailMessage[];
} {
  const sent: EmailMessage[] = [];
  const script = Array.isArray(outcome) ? outcome : undefined;
  let call = 0;

  const send = (message: EmailMessage) => {
    sent.push(message);
    const next = script
      ? (script[Math.min(call, script.length - 1)] ?? { status: "sent" })
      : outcome;
    call++;
    return Promise.resolve(next as SendOutcome);
  };

  return Object.assign(send, { sent });
}

/** A reporter that records rather than reports, so a test can count. */
export function recordingReporter(): NotificationReporter & {
  readonly poisonReports: PoisonedNotification[];
  readonly limitWarnings: SendVolumeWarning[];
} {
  const poisonReports: PoisonedNotification[] = [];
  const limitWarnings: SendVolumeWarning[] = [];

  return {
    poisonReports,
    limitWarnings,
    poisoned: (event) => void poisonReports.push(event),
    approachingSendLimit: (event) => void limitWarnings.push(event),
  };
}

/** A clock a test moves by hand, so the backoff can be walked without waiting for it. */
export function fixedClock(start: Date) {
  let at = start;
  return {
    now: () => at,
    advance(ms: number) {
      at = new Date(at.getTime() + ms);
    },
  };
}

/** Reads a row back by the identifier ADR-0003 allows outside the database. */
export async function readOutboxRow(db: Db | Tx, publicId: string) {
  const [row] = await db
    .select()
    .from(notificationOutbox)
    .where(eq(notificationOutbox.publicId, publicId));
  if (!row) throw new Error(`no outbox row with public_id ${publicId}`);
  return row;
}

/**
 * The origin an authentication link points back at, in tests.
 *
 * A parameter rather than an environment read (`DrainOptions.appUrl`), because ADR-0022 leaves the
 * domain unprovisioned and a hardcoded origin would be wrong in staging, in production and here.
 */
export const TEST_APP_URL = "https://encuentra.example";
