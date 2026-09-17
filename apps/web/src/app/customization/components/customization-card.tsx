"use client";

import type { ComponentType, ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface CustomizationCardProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  resetLabel: string;
  onReset: () => void;
  children: ReactNode;
}

export function CustomizationCard({
  icon: Icon,
  title,
  description,
  resetLabel,
  onReset,
  children,
}: CustomizationCardProps) {
  return (
    <section className="min-w-0 border-b pb-6">
      <header className="flex items-start gap-3 border-b pb-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 space-y-1">
          <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </header>
      <div className="space-y-6 pt-5">
        {children}
        <div className="flex justify-end border-t pt-4">
          <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={onReset}>
            {resetLabel}
          </Button>
        </div>
      </div>
    </section>
  );
}
