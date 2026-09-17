import { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Shared illustrated frame for public transfers, with a compact mobile cover. */
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
    <div
      className={cn(
        "mx-auto w-full max-w-4xl overflow-hidden rounded-[1.75rem] border bg-card shadow-[0_24px_80px_-36px_rgba(15,35,60,0.25)]",
        className
      )}
    >
      <div className="relative flex h-36 items-end overflow-hidden p-5 sm:h-48 sm:p-8">
        <img
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 size-full object-cover object-[center_65%]"
          fetchPriority="high"
          src="/art/terrace.jpg"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
        <div className="relative flex items-center gap-3 rounded-2xl border border-white/25 bg-background/95 py-2 pl-2 pr-4 shadow-lg backdrop-blur-sm">
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#12334d] text-white">
            {object}
          </div>
          {caption && (
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-foreground">{caption}</p>
          )}
        </div>
      </div>
      <div className="px-5 py-6 sm:px-10 sm:py-8">{children}</div>
    </div>
  );
}
