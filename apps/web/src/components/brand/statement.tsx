import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Left column of a public page: who, what, and the facts that matter, in large type. */
export function Statement({
  eyebrow,
  title,
  accentLine,
  quote,
  chips,
  children,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  accentLine?: ReactNode;
  quote?: ReactNode;
  chips?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex max-w-[480px] flex-col gap-5 md:gap-6", className)}>
      {eyebrow && <span className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-3">{eyebrow}</span>}
      <h1 className="font-display text-[32px] font-semibold leading-[1.05] tracking-[-0.025em] md:text-[44px]">
        {title}
        {accentLine && (
          <>
            <br />
            <span className="text-primary">{accentLine}</span>
          </>
        )}
      </h1>
      {quote && (
        <p className="border-l-2 border-primary pl-[18px] font-display text-[17px] font-medium leading-[1.45] text-ink-2 md:text-[19px]">
          {quote}
        </p>
      )}
      {chips && <div className="flex flex-wrap gap-2">{chips}</div>}
      {children}
    </section>
  );
}

export function Chip({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="chip">
      {icon}
      {children}
    </span>
  );
}
