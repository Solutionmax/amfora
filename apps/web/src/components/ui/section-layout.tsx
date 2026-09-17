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
      <nav aria-label={label} className="flex min-w-0 flex-wrap gap-x-6 gap-y-1 border-b">
        {sections.map((section) => {
          const active = section.id === activeId;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelect(section.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "-mb-px flex items-center gap-2 border-b-2 px-0.5 py-3 text-left text-sm font-medium transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              {section.icon && React.createElement(section.icon, { className: "size-[18px]" })}
              {section.label}
            </button>
          );
        })}
      </nav>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
