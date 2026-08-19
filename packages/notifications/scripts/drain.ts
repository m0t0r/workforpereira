#!/usr/bin/env tsx
/**
 * `pnpm --filter @repo/notifications drain` — **the development trigger**, and nothing more.
 *
 * ADR-0028 puts the real wake-up path elsewhere: a trigger.dev schedule POSTs `/api/jobs/*` every
 * five minutes, the use case calls `tasks.trigger()` after commit for latency, and every run pings
 * Healthchecks.io. **None of that is in this ticket** — it lands with the scheduler — and this
 * script is not a stand-in for it. It exists so the drain can be run by hand while there is no
 * scheduler and no route.
 *
 * `tsx` rather than `node`, and the reason is structural: ADR-0006 makes every `@repo/*` package
 * JIT with `moduleResolution: Bundler`, so its relative imports carry no extension and Node's ESM
 * resolver cannot follow them. Turbopack and Vite can; outside those two, something has to.
 *
 * English, per ADR-0001 — a developer's own tooling is chrome, not UI copy.
 *
 *     pnpm --filter @repo/notifications drain
 *     pnpm --filter @repo/notifications drain --enqueue offer_received someone@example.test
 *
 * With no `RESEND_API_KEY` it prints what it would have sent and marks the row sent, so the whole
 * path is exercisable with no account, no verified domain and no DNS (ADR-0035). With one, it sends
 * for real — mind that the free tier is 100 a day and that a verified domain is required.
 */

import { getDb } from "@repo/db";
import { NOTIFICATION_TEMPLATES, type NotificationTemplate } from "@repo/db/schema";
import { Resend } from "resend";

import {
  drainOutbox,
  enqueueNotification,
  isTokenBearing,
  resendSender,
  type EmailMessage,
  type EmailSender,
  type NotificationReporter,
} from "../src/index.ts";

const reporter: NotificationReporter = {
  poisoned: (event) =>
    console.error(
      `[poison] ${event.publicId} (${event.template}) after ${event.attempts} attempts: ${event.lastError}`,
    ),
  approachingSendLimit: (event) =>
    console.warn(
      `[warning] ${event.sentInRollingDay} sends in the last 24h, threshold ${event.threshold}, provider cap ${event.providerDailyCap}. ADR-0035: start the move to SES.`,
    ),
};

/**
 * Prints the message instead of sending it. What runs when there is no API key.
 *
 * It answers `sent`, so the row **is** marked sent for a message that never left — that is the
 * point, since otherwise the sent path could not be exercised without an account. It also means
 * this is a development tool and not a dry run: the rows it touches are spent.
 */
const printingSender: EmailSender = (message: EmailMessage) => {
  console.log(
    `\n--- would send to ${message.to} (the row will be marked sent) ---\n` +
      `${message.subject}\n\n${message.text}\n`,
  );
  return Promise.resolve({ status: "sent" });
};

function senderFromEnvironment(): EmailSender {
  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["RESEND_FROM"];

  if (!apiKey || !from) {
    console.log("RESEND_API_KEY or RESEND_FROM unset — printing messages instead of sending.\n");
    return printingSender;
  }

  console.log(`Sending for real, through Resend, as ${from}.\n`);
  // Also the one place a real `Resend` meets `ResendClient`, so an SDK upgrade that changes the
  // shape the adapter depends on fails `check-types` here rather than in production.
  return resendSender(new Resend(apiKey), { from });
}

function isTemplate(value: string): value is NotificationTemplate {
  return (NOTIFICATION_TEMPLATES as readonly string[]).includes(value);
}

/**
 * Where an authentication link points, locally.
 *
 * `APP_URL` when it is set — a deployed environment always sets it (ADR-0022) — and the dev server's
 * own origin otherwise, which is what `pnpm dev` serves and therefore the only origin a link printed
 * by this script could usefully open.
 */
function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

async function main(argv: string[]): Promise<number> {
  const db = getDb();

  if (argv[0] === "--enqueue") {
    const [, template, recipient] = argv;
    if (!template || !isTemplate(template) || !recipient) {
      console.error(`usage: drain --enqueue <${NOTIFICATION_TEMPLATES.join("|")}> <email>`);
      return 1;
    }

    // A token-bearing template needs one; a fake is right here, because this path exists to
    // exercise rendering and delivery, and a real Better Auth token would need a real signup.
    const queued = await enqueueNotification(
      db,
      isTokenBearing(template)
        ? { recipientEmail: recipient, template, token: "development-token-not-a-real-one" }
        : { recipientEmail: recipient, template },
    );
    console.log(`queued ${queued.publicId} (${queued.template}) for ${queued.recipientEmail}`);
    return 0;
  }

  const result = await drainOutbox(db, {
    send: senderFromEnvironment(),
    report: reporter,
    appUrl: appUrl(),
  });

  if (result.deferred) {
    // The one outcome nothing else records — no attempt spent, no Sentry event, no `last_error`.
    // Printing it is the whole reason `deferredReason` crosses the module boundary.
    console.warn(
      `\n[deferred] the provider refused: ${result.deferredReason ?? "no reason given"}`,
    );
    console.warn("The pass ended here rather than trying the next row. The sweep retries.");
  }

  console.log(
    `sent ${result.sent}, failed ${result.failed}, poisoned ${result.poisoned}` +
      `${result.hasMore ? " — more is due now, run again" : ""}`,
  );
  return 0;
}

// The pool is a process-lifetime singleton (ADR-0006) and nothing closes it, so the exit is
// explicit rather than waiting for an idle event loop that never arrives.
main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
