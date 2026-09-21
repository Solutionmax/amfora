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
      <div className="flex flex-col items-center gap-4">
        <span className="tile size-14 rounded-2xl">
          <BrandMark className="size-7" />
        </span>
        <span className="text-sm font-medium text-ink-3">{t("common.loading")}</span>
      </div>
    </div>
  );
}
