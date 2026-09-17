"use client";

import { useTranslations } from "next-intl";

import { AmphoraMark } from "@/components/brand/amphora-mark";

export function LoadingScreen() {
  const t = useTranslations();
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-[#071827] text-white"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          <AmphoraMark className="size-8 text-sky-400" />
        </div>
        <span className="text-sm font-medium text-slate-300">{t("common.loading")}</span>
      </div>
    </div>
  );
}
