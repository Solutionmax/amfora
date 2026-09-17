import { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A compact identity strip above the transfer details. The file action stays
 * the visual focus; the amphora is supporting context.
 */
export function Stage({
  object,
  caption,
  children,
  className,
}: {
  object: ReactNode;
  caption?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-4xl overflow-hidden rounded-[1.75rem] border bg-card", className)}>
      <div className="relative flex items-center gap-4 border-b bg-secondary/35 px-5 py-3.5 text-foreground sm:px-6">
        <div
          className="pointer-events-none absolute -right-12 -top-16 size-40 rounded-full bg-primary/[0.08] blur-2xl"
          aria-hidden="true"
        />
        <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-background">
          {object}
        </div>

        {caption && (
          <p className="relative font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{caption}</p>
        )}
      </div>

      <div className="px-6 py-6 sm:px-10 sm:py-10">
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
