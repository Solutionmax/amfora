"use client";

import React from "react";

import { cn } from "@/lib/utils";

export interface SectionItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

/** Section navigation on the left, one open panel on the right. Used by settings and customization. */
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
    <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label={label} className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {sections.map((section) => {
          const active = section.id === activeId;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelect(section.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
              )}
            >
              {section.icon && React.createElement(section.icon, { className: "size-[18px]" })}
              {section.label}
            </button>
          );
        })}
      </nav>

      <div>{children}</div>
    </div>
  );
}
