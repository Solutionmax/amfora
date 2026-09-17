"use client";

import { IconDeviceLaptop, IconMoon, IconSun, IconSunMoon } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { Label } from "@/components/ui/label";
import { CustomizationCard } from "./customization-card";

const THEME_OPTIONS = [
  { name: "System", value: "system", icon: IconDeviceLaptop, description: "Follow system preference" },
  { name: "Light", value: "light", icon: IconSun, description: "Always light mode" },
  { name: "Dark", value: "dark", icon: IconMoon, description: "Always dark mode" },
];

export function ThemePickerForm() {
  const t = useTranslations();
  const { theme, setTheme } = useTheme();

  const handleThemeSelect = (themeValue: string) => {
    setTheme(themeValue);
  };

  const resetToDefault = () => {
    setTheme("system");
  };

  return (
    <CustomizationCard
      icon={IconSunMoon}
      title={t("customization.theme.title")}
      description={t("customization.theme.description")}
      resetLabel={t("customization.theme.reset")}
      onReset={resetToDefault}
    >
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t("customization.theme.selectTheme")}</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {THEME_OPTIONS.map((themeOption) => {
            const IconComponent = themeOption.icon;
            return (
              <button
                key={themeOption.value}
                onClick={() => handleThemeSelect(themeOption.value)}
                aria-pressed={theme === themeOption.value}
                className={`group relative rounded-2xl border p-4 text-left transition-colors ${
                  theme === themeOption.value
                    ? "border-primary ring-2 ring-primary ring-offset-2 bg-primary/5"
                    : "border-border/70 hover:border-primary/40 hover:bg-secondary/30"
                }`}
                type="button"
              >
                <div
                  className={`mb-4 flex h-20 gap-2 overflow-hidden rounded-lg border p-2 ${themeOption.value === "dark" ? "border-slate-600 bg-slate-900" : "border-slate-200 bg-slate-50"}`}
                  aria-hidden="true"
                >
                  <div className="w-1/4 rounded bg-[#071827]" />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="h-2 w-2/3 rounded bg-sky-500" />
                    <div
                      className={`flex-1 rounded ${themeOption.value === "dark" ? "bg-slate-700" : "bg-white shadow-sm"}`}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <IconComponent className="size-5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{t(`theme.${themeOption.value}`)}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">{t("customization.theme.availableDescription")}</p>
      </div>
    </CustomizationCard>
  );
}
