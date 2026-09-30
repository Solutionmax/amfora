"use client";

import { useState } from "react";
import { IconLayoutDashboard } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { PUBLIC_THEMES, type PublicTheme } from "@/components/brand/public-theme";
import { useAppInfo } from "@/contexts/app-info-context";
import { updateConfig } from "@/http/endpoints";
import { cn } from "@/lib/utils";
import { Section } from "./section";

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

/** Free: how the sign-in, download and receive pages look for every visitor. */
export function PublicThemeSection() {
  const t = useTranslations();
  const { appPublicTheme, refreshAppInfo } = useAppInfo();
  const [saving, setSaving] = useState<PublicTheme | null>(null);

  const choose = async (theme: PublicTheme) => {
    if (theme === appPublicTheme || saving) return;
    setSaving(theme);
    try {
      await updateConfig("appPublicTheme", { value: theme });
      await refreshAppInfo();
      toast.success(t("customization.v2.saved"));
    } catch (error: any) {
      toast.error(error?.response?.data?.error || t("customization.v2.saveFailed"));
    } finally {
      setSaving(null);
    }
  };

  return (
    <Section icon={IconLayoutDashboard} title={t("customization.v2.theme.title")}>
      <p className="-mt-2 text-xs text-ink-3">{t("customization.v2.theme.hint")}</p>
      <div role="radiogroup" aria-label={t("customization.v2.theme.title")} className="grid gap-3 sm:grid-cols-3">
        {PUBLIC_THEMES.map((theme) => {
          const active = theme === appPublicTheme;
          return (
            <button
              key={theme}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={saving !== null}
              onClick={() => choose(theme)}
              className={cn(
                "overflow-hidden rounded-[calc(var(--radius)+2px)] border bg-surface text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                active ? "border-primary ring-2 ring-primary/25" : "border-line hover:border-line-2",
                saving === theme && "opacity-60"
              )}
            >
              <div className="h-[74px] overflow-hidden border-b border-line">
                <Thumb theme={theme} />
              </div>
              <div className="px-3 py-2.5">
                <div className="text-sm font-semibold">{t(`customization.v2.theme.${theme}`)}</div>
                <div className="text-xs text-ink-3">{t(`customization.v2.theme.${theme}Hint`)}</div>
              </div>
            </button>
          );
        })}
      </div>
    </Section>
  );
}
