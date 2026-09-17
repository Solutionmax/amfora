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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEME_OPTIONS.map((themeOption) => {
            const IconComponent = themeOption.icon;
            return (
              <button
                key={themeOption.value}
                onClick={() => handleThemeSelect(themeOption.value)}
                className={`group relative rounded-xl border-2 p-4 text-center transition-colors ${
                  theme === themeOption.value
                    ? "border-primary ring-2 ring-primary ring-offset-2 bg-primary/5"
                    : "border-border/70 hover:border-primary/40 hover:bg-secondary/30"
                }`}
                type="button"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="flex flex-col items-center gap-2">
                    <IconComponent className="w-6 h-6 text-muted-foreground" />
                    <span className="font-medium text-base">{themeOption.name}</span>
                    <span className="text-xs text-muted-foreground">{themeOption.description}</span>
                  </div>
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
