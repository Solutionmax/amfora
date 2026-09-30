import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** A row of plain numbers separated by hairlines. No cards, no icons. */
export function Facts({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 border-y border-line md:auto-cols-fr md:grid-flow-col md:grid-cols-none",
        "[&>div]:py-[18px] [&>div]:pr-5 [&>div:nth-child(n+3)]:border-t [&>div:nth-child(n+3)]:border-line md:[&>div:nth-child(n+3)]:border-t-0",
        "[&>div:nth-child(even)]:border-l [&>div:nth-child(even)]:border-line [&>div:nth-child(even)]:pl-5",
        "md:[&>div+div]:border-l md:[&>div+div]:border-line md:[&>div+div]:pl-5",
        className
      )}
    >
      {children}
    </dl>
  );
}

export function Fact({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[12.5px] text-ink-3">{label}</dt>
      <dd className="mt-1 truncate font-display text-[26px] font-bold leading-tight tracking-[-0.02em] tabular-nums">
        {value}
      </dd>
      {hint && <dd className="text-[12.5px] text-ink-3">{hint}</dd>}
      {children}
    </div>
  );
}
