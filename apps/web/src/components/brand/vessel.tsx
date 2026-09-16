"use client";

import { cn } from "@/lib/utils";

const BODY = "M46 28 C34 35 28 50 34 64 C37 72 41 79 44 84 H56 C59 79 63 72 66 64 C72 50 66 35 54 28 Z";

const TOP = 28;
const BOTTOM = 84;

/**
 * The product, drawn. Contents show as a fill level, each item as a stratum,
 * and the wax seal lifts off when the share is opened.
 */
export function Vessel({
  level = 0,
  strata = 0,
  sealed = true,
  className,
}: {
  level?: number;
  strata?: number;
  sealed?: boolean;
  className?: string;
}) {
  const clamped = Math.min(Math.max(level, 0), 1);
  const height = (BOTTOM - TOP) * clamped;
  const surface = BOTTOM - height;
  const lines = Array.from({ length: Math.max(Math.min(strata, 6) - 1, 0) }, (_, index) => {
    return surface + (height / Math.min(strata, 6)) * (index + 1);
  });

  return (
    <svg viewBox="0 0 100 100" className={cn("shrink-0", className)} role="presentation">
      <defs>
        <clipPath id="vessel-body">
          <path d={BODY} />
        </clipPath>
      </defs>

      <g clipPath="url(#vessel-body)">
        <rect
          x="0"
          y={surface}
          width="100"
          height={height}
          className="fill-primary/20 transition-all duration-700 ease-out"
        />
        {lines.map((y) => (
          <line key={y} x1="0" x2="100" y1={y} y2={y} className="stroke-primary/50" strokeWidth="0.7" />
        ))}
      </g>

      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity="0.7">
        <path d="M45 24 C33 27 27 38 34 50" />
        <path d="M55 24 C67 27 73 38 66 50" />
      </g>

      <g fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M35 14 H65" />
        <path d="M44 14 V28" />
        <path d="M56 14 V28" />
        <path d="M46 28 C34 35 28 50 34 64 C37 72 41 79 44 84" />
        <path d="M54 28 C66 35 72 50 66 64 C63 72 59 79 56 84" />
        <path d="M44 86 H56" />
      </g>

      <g
        className={cn(
          "origin-[50px_12px] transition-all duration-700 ease-out",
          sealed ? "opacity-100" : "-translate-y-3 rotate-[14deg] opacity-0"
        )}
      >
        <ellipse cx="50" cy="12" rx="13" ry="4.5" className="fill-seal" />
        <circle cx="50" cy="12" r="2.2" className="fill-seal-foreground" />
      </g>
    </svg>
  );
}
