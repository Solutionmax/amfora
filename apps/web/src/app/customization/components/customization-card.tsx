"use client";

import type { ComponentType, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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
    <Card className="gap-0 overflow-hidden p-0">
      <CardHeader className="border-b bg-secondary/30 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 space-y-1">
            <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 px-5 py-6 sm:px-6">
        {children}
        <div className="flex justify-end border-t pt-5">
          <Button type="button" variant="outline" className="rounded-lg" onClick={onReset}>
            {resetLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
