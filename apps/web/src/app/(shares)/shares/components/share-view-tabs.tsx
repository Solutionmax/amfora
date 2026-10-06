"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

export type ShareView = "mine" | "shared";

/** The two lists of the shares page: the shares one made, and the ones shared with one's groups. */
export function ShareViewTabs({ view, onChange }: { view: ShareView; onChange: (view: ShareView) => void }) {
  const t = useTranslations();

  return (
    <div
      role="tablist"
      aria-label={t("groups.sharedWithMe.tabs")}
      className="flex gap-5 border-b border-line px-[22px] text-[13px]"
    >
      {(["mine", "shared"] as const).map((value) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={view === value}
          onClick={() => onChange(value)}
          className={cn(
            "-mb-px border-b-2 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/35",
            view === value
              ? "border-ink font-semibold text-ink"
              : "border-transparent font-medium text-ink-3 hover:text-ink"
          )}
        >
          {t(value === "mine" ? "groups.sharedWithMe.mine" : "groups.sharedWithMe.tab")}
        </button>
      ))}
    </div>
  );
}
