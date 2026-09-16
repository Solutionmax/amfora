"use client";

import { cn } from "@/lib/utils";

const BODY = "M52 34 C38 42 31 58 34 74 C37 92 46 108 56 118 H64 C74 108 83 92 86 74 C89 58 82 42 68 34 Z";
const TOP = 36;
const BOTTOM = 119;

/**
 * The product as an object on a shelf: contents as liquid, one stratum per item,
 * and a wax seal that lifts when the share is opened. Drawn for a dark stage.
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
  const divisions = Math.max(Math.min(strata, 6) - 1, 0);
  const lines = Array.from({ length: divisions }, (_, index) => surface + (height / (divisions + 1)) * (index + 1));

  return (
    <svg viewBox="0 0 120 130" className={cn("shrink-0", className)} role="presentation">
      <defs>
        <clipPath id="vessel-body">
          <path d={BODY} />
        </clipPath>
        <linearGradient id="vessel-liquid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4aa8ee" />
          <stop offset="100%" stopColor="#0079d2" />
        </linearGradient>
      </defs>

      <ellipse cx="60" cy="124" rx="26" ry="4" fill="#000" opacity="0.35" />

      <g clipPath="url(#vessel-body)">
        <rect
          x="0"
          y={surface}
          width="120"
          height={height}
          fill="url(#vessel-liquid)"
          opacity="0.92"
          className="transition-all duration-700 ease-out"
        />
        {clamped > 0.01 && (
          <ellipse
            cx="60"
            cy={surface}
            rx="60"
            ry="4"
            fill="#8ccdf7"
            opacity="0.95"
            className="transition-all duration-700 ease-out"
          />
        )}
        {lines.map((y) => (
          <line key={y} x1="0" x2="120" y1={y} y2={y} stroke="#0b3d63" strokeWidth="0.8" opacity="0.5" />
        ))}
      </g>

      <g fill="none" stroke="#e8eef6" strokeWidth="2.4" strokeLinecap="round" opacity="0.75">
        <path d="M52 26 C36 30 27 44 34 62" />
        <path d="M68 26 C84 30 93 44 86 62" />
      </g>

      <g fill="none" stroke="#e8eef6" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M52 34 C38 42 31 58 34 74 C37 92 46 108 56 118" />
        <path d="M68 34 C82 42 89 58 86 74 C83 92 74 108 64 118" />
        <path d="M52 22 V34" />
        <path d="M68 22 V34" />
        <path d="M55 121 H65" />
      </g>
      <ellipse cx="60" cy="21" rx="12" ry="3.6" fill="none" stroke="#e8eef6" strokeWidth="2.8" />

      <path
        d="M44 52 C38 64 39 84 46 100"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        opacity="0.28"
        strokeLinecap="round"
      />

      <g
        className={cn(
          "origin-[60px_18px] transition-all duration-700 ease-out",
          sealed ? "opacity-100" : "-translate-y-4 rotate-[16deg] opacity-0"
        )}
      >
        <ellipse cx="60" cy="19" rx="13.5" ry="4.4" fill="#16263c" />
        <ellipse cx="60" cy="17.6" rx="13.5" ry="4.4" fill="#e8eef6" opacity="0.92" />
        <circle cx="60" cy="17.6" r="2.4" fill="#16263c" />
      </g>
    </svg>
  );
}
