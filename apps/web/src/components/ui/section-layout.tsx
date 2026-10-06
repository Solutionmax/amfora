"use client";

import React from "react";

import { cn } from "@/lib/utils";

export interface SectionItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

/** Text tabs over a hairline; the active one is underlined in ink. */
export function SectionLayout({
  sections,
  activeId,
  onSelect,
  label,
  navClassName = "mb-8",
  children,
}: {
  sections: SectionItem[];
  activeId: string;
  onSelect: (id: string) => void;
  label: string;
  /** Room under the tabs; the default suits a settings page. */
  navClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <nav
        aria-label={label}
        className={cn(
          "flex min-w-0 gap-6 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--color-line)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          navClassName
        )}
      >
        {sections.map((section) => {
          const active = section.id === activeId;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelect(section.id)}
              aria-pressed={active}
              className={cn(
                "shrink-0 whitespace-nowrap border-b-2 py-2.5 text-[13px] transition-colors",
                active
                  ? "border-ink font-semibold text-ink"
                  : "border-transparent font-medium text-ink-3 hover:text-ink"
              )}
            >
              {section.label}
            </button>
          );
        })}
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
