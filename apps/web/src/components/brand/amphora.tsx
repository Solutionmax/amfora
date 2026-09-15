"use client";

import { cn } from "@/lib/utils";

const BODY_PATH = "M43 27 C28 36 22 54 32 70 C37 78 42 83 46 87 H54 C58 83 63 78 68 70 C78 54 72 36 57 27 Z";

/** The Amfora mark. Line art by default; pass `fill` (0-1) to show it as a filled vessel. */
export function Amphora({
  className,
  fill,
  fillClassName,
}: {
  className?: string;
  fill?: number;
  fillClassName?: string;
}) {
  const level = fill === undefined ? undefined : Math.min(Math.max(fill, 0), 1);
  const clipId = fill === undefined ? undefined : `amphora-fill-${Math.round(level! * 1000)}`;

  return (
    <svg viewBox="0 0 100 100" className={cn("shrink-0", className)} aria-hidden="true" focusable="false">
      {level !== undefined && (
        <>
          <defs>
            <clipPath id={clipId}>
              <path d={BODY_PATH} />
            </clipPath>
          </defs>
          <rect
            x="0"
            y={88 - level * 61}
            width="100"
            height={level * 61}
            clipPath={`url(#${clipId})`}
            className={cn("fill-primary/15", fillClassName)}
          />
        </>
      )}
      <g fill="none" stroke="currentColor" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M37 13 H63" />
        <path d="M43 13 V27" />
        <path d="M57 13 V27" />
        <path d="M43 29 C30 29 22 37 26 46" />
        <path d="M57 29 C70 29 78 37 74 46" />
        <path d="M43 27 C28 36 22 54 32 70 C37 78 42 83 46 87" />
        <path d="M57 27 C72 36 78 54 68 70 C63 78 58 83 54 87" />
        <path d="M44 88 H56" />
      </g>
    </svg>
  );
}
