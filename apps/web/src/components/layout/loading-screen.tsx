"use client";

import { useTranslations } from "next-intl";

import { BrandMark } from "@/components/brand/brand-mark";

export function LoadingScreen() {
  const t = useTranslations();
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-background text-foreground"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-card">
          <BrandMark className="size-8 text-primary" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">{t("common.loading")}</span>
      </div>
    </div>
  );
}
