import Image from "next/image";
import Link from "next/link";

import { cn } from "@repo/design-system/lib/utils";

import type { WallProfile } from "./wall";

/**
 * A Capability Profile on the public tier.
 *
 * **A Person with no Photo gets no placeholder at all** (ADR-0026, giving ADR-0010's
 * never-second-class rule its expression in layout). No silhouette, no grey disc, no initials, no
 * empty circle: the card re-flows and the name takes the leading position at a larger size. A
 * placeholder is a hole where a face should be, and a hole is a penalty rendered in CSS on behalf of
 * a person the law forbids us to condition anything on. ADR-0026 names an avatar fallback added by a
 * well-meaning refactor as one of two rules here with no automated guard in v1 — this comment is the
 * guard.
 *
 * **No trust text of any kind**, and nothing attached to the Person: no badge, no ledger, no line of
 * text. This is a surface where somebody is being judged, and there is nothing true to say about
 * them.
 *
 * The department is shown and the exact Municipality is not — ADR-0011's public tier, where "face +
 * full name + precise municipality" is the combination that turns a card into an address.
 */
export function ProfileCard({ profile }: { profile: WallProfile }) {
  return (
    <li>
      <Link
        href={`/people/${profile.publicId}`}
        className={cn(
          "bg-card border-border flex h-full flex-col gap-4 rounded-lg border p-5 transition-all duration-150",
          "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
          "[@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-md",
          "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        )}
      >
        <div className="flex items-center gap-4">
          {profile.photoUrl === null ? null : (
            <Image
              // Empty alt on purpose: the name sits beside it, and "Foto de María" read out before
              // "María" is noise. The Photo is never described, classified or processed — under
              // Colombian law a face is sensitive data (ADR-0010).
              alt=""
              src={profile.photoUrl}
              width={72}
              height={72}
              // Photos are served from R2 behind a presigned URL (ADR-0010). `next/image`
              // optimisation and its `remotePatterns` land with that pipeline, not here.
              unoptimized
              className="size-18 shrink-0 rounded-lg object-cover"
            />
          )}
          <div className="min-w-0">
            <h3
              className={cn(
                "font-heading font-semibold tracking-tight",
                profile.photoUrl === null ? "text-2xl" : "text-lg",
              )}
            >
              {profile.fullName}
            </h3>
            <p className="text-muted-foreground text-sm">
              {profile.department}
              {profile.remote ? " · También trabaja a distancia" : ""}
            </p>
          </div>
        </div>
        <ul className="flex flex-wrap gap-1.5">
          {profile.skills.map((skill) => (
            <li
              key={skill}
              className="bg-secondary text-secondary-foreground rounded-md px-2 py-1 text-xs"
            >
              {skill}
            </li>
          ))}
        </ul>
      </Link>
    </li>
  );
}
