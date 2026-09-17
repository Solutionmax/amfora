"use client";

import React from "react";

import { cn } from "@/lib/utils";

export interface SectionItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

/** Compact section tabs using the same page surface as the file workspace. */
export function SectionLayout({
  sections,
  activeId,
  onSelect,
  label,
  children,
}: {
  sections: SectionItem[];
  activeId: string;
  onSelect: (id: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-8">
      <nav
        aria-label={label}
        className="flex min-w-0 flex-wrap gap-1 rounded-2xl border border-border/70 bg-card p-1.5"
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
                "flex items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {section.icon && React.createElement(section.icon, { className: "size-[18px]" })}
              {section.label}
            </button>
          );
        })}
      </nav>

      <div className="min-w-0 rounded-2xl border border-border/70 bg-card p-5 sm:p-8">{children}</div>
    </div>
  );
}
