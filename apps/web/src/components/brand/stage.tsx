import { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A dark vitrine on the left, the information on the light side. The contrast is
 * what makes the object read as an object instead of a drawing on a page.
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
    <div className={cn("grid min-h-[520px] lg:min-h-[640px] lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]", className)}>
      <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-[2rem] bg-[#0E1A2B] px-10 py-14 text-background">
        {/* Grain keeps the dark panel from reading as flat CSS. */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-2/3 bg-[radial-gradient(60%_50%_at_50%_10%,rgba(122,190,240,0.22),transparent_70%)]"
          aria-hidden="true"
        />

        <div className="relative w-full max-w-[360px]">{object}</div>

        {caption && (
          <p className="relative mt-8 border-t border-background/20 pt-4 text-center font-mono text-[11px] uppercase tracking-[0.24em] text-background/60">
            {caption}
          </p>
        )}
      </div>

      <div className="flex items-center px-6 py-14 lg:px-16">
        <div className="w-full max-w-xl">{children}</div>
      </div>
    </div>
  );
}
