import { cn } from "@repo/design-system/lib/utils";

/**
 * Content max width 1180px, desktop gutters 24px minimum —
 * `packages/design-system/README.md`, Layout.
 */
export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("mx-auto w-full max-w-[1180px] px-6", className)}>{children}</div>;
}
