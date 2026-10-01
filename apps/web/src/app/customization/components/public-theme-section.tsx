"use client";

import { useTranslations } from "next-intl";

import { PUBLIC_THEMES, type PublicTheme } from "@/components/brand/public-theme";
import { cn } from "@/lib/utils";
import type { CustomizationDraft } from "../hooks/use-customization-draft";
import { FormBlock } from "./form-block";

/** A tiny drawing of each theme, so the choice reads without words. */
function Thumb({ theme }: { theme: PublicTheme }) {
  if (theme === "stage") {
    return (
      <div className="grid h-full grid-cols-[1.1fr_1fr] items-center gap-2 bg-[linear-gradient(135deg,var(--primary),color-mix(in_oklab,var(--primary)_45%,#0c1626))] p-2.5">
        <div className="grid gap-1">
          <i className="h-2 w-4/5 rounded-sm bg-white/90" />
          <i className="h-2 w-3/5 rounded-sm bg-white/60" />
        </div>
        <i className="h-10 rounded-md bg-white" />
      </div>
    );
  }
  if (theme === "workbench") {
    return (
      <div className="grid h-full grid-cols-[1.2fr_1fr]">
        <div className="relative bg-[color-mix(in_oklab,var(--primary)_8%,#faf7f2)] p-2.5">
          <i className="absolute left-2 top-3 h-4 w-12 -rotate-3 rounded bg-white shadow-sm" />
          <i className="absolute left-7 top-9 h-4 w-10 rotate-2 rounded bg-white shadow-sm" />
          <i className="absolute bottom-2 left-2 h-2 w-10 rounded-sm bg-ink/70" />
        </div>
        <div className="grid content-center gap-1 border-l border-line bg-surface p-2">
          <i className="h-1.5 rounded-sm bg-line-2" />
          <i className="h-1.5 rounded-sm bg-line-2" />
          <i className="h-2.5 rounded-sm bg-primary" />
        </div>
      </div>
    );
  }
  return (
    <div className="grid h-full place-items-center bg-[#faf7f2] dark:bg-background">
      <div className="relative w-16 rounded-md border border-line bg-surface px-2 pb-2 pt-3">
        <i className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rounded-full bg-ink" />
        <i className="mb-1 block h-1.5 rounded-sm bg-line-2" />
        <i className="block h-2.5 rounded-sm bg-primary" />
      </div>
    </div>
  );
}

/** How the sign-in, download and receive pages look for every visitor. Saved with the SaveBar. */
export function PublicThemeSection({ draft, update }: Pick<CustomizationDraft, "draft" | "update">) {
  const t = useTranslations();

  return (
    <FormBlock title={t("customization.v2.theme.title")} description={t("customization.calm.themeDescription")}>
      <div role="radiogroup" aria-label={t("customization.v2.theme.title")} className="grid gap-3 sm:grid-cols-3">
        {PUBLIC_THEMES.map((theme) => {
          const active = theme === draft.theme;
          return (
            <button
              key={theme}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => update("theme", theme)}
              className={cn(
                "overflow-hidden rounded-xl border bg-surface text-left outline-none transition-[border-color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-primary/35",
                active
                  ? "border-primary shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_16%,transparent)]"
                  : "border-line-2 hover:border-[color-mix(in_oklab,var(--line-2)_50%,var(--ink-3))]"
              )}
            >
              <div className="h-[70px] overflow-hidden">
                <Thumb theme={theme} />
              </div>
              <div className="px-3 pb-3 pt-2.5 text-[12.5px] leading-snug text-ink-3">
                <div className="text-[13px] font-semibold text-ink">{t(`customization.v2.theme.${theme}`)}</div>
                {t(`customization.v2.theme.${theme}Hint`)}
              </div>
            </button>
          );
        })}
      </div>
    </FormBlock>
  );
}
