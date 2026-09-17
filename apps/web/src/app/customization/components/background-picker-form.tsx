"use client";

import { useCallback, useEffect, useState } from "react";
import { IconDeviceLaptop } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Label } from "@/components/ui/label";
import { CustomizationCard } from "./customization-card";

const BACKGROUND_OPTIONS = {
  light: [
    { name: "Default", background: "oklch(0.9911 0 0)", description: "Pure white" },
    { name: "Warm", background: "oklch(0.99 0.005 85)", description: "Slightly warm tone" },
    { name: "Cool", background: "oklch(0.99 0.005 230)", description: "Slightly cool tone" },
  ],
  dark: [
    { name: "Default", background: "oklch(0.15 0 0)", description: "Standard dark" },
    { name: "Darker", background: "oklch(0.13 0 0)", description: "Darker gray" },
    { name: "Pure Black", background: "oklch(0 0 0)", description: "True black" },
  ],
};

const STORAGE_KEY = "amfora-custom-background";

export function BackgroundPickerForm() {
  const t = useTranslations();
  const [selectedBackground, setSelectedBackground] = useState({
    light: BACKGROUND_OPTIONS.light[0].background,
    dark: BACKGROUND_OPTIONS.dark[0].background,
  });
  const applyBackground = useCallback((backgroundValues: { light: string; dark: string }) => {
    document.documentElement.style.setProperty("--custom-background-light", backgroundValues.light);
    document.documentElement.style.setProperty("--custom-background-dark", backgroundValues.dark);
  }, []);

  useEffect(() => {
    const savedBackground = localStorage.getItem(STORAGE_KEY);
    if (savedBackground) {
      const parsed = JSON.parse(savedBackground);
      setSelectedBackground(parsed);
      applyBackground(parsed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBackgroundSelect = (mode: "light" | "dark", backgroundValue: string) => {
    const newBackground = {
      ...selectedBackground,
      [mode]: backgroundValue,
    };
    setSelectedBackground(newBackground);
    applyBackground(newBackground);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newBackground));
  };

  const resetToDefault = () => {
    const defaultBackground = {
      light: BACKGROUND_OPTIONS.light[0].background,
      dark: BACKGROUND_OPTIONS.dark[0].background,
    };
    setSelectedBackground(defaultBackground);
    applyBackground(defaultBackground);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <CustomizationCard
      icon={IconDeviceLaptop}
      title={t("customization.background.title")}
      description={t("customization.background.description")}
      resetLabel={t("customization.background.reset")}
      onReset={resetToDefault}
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium">{t("customization.background.lightMode")}</Label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {BACKGROUND_OPTIONS.light.map((bg) => (
              <button
                key={bg.name}
                onClick={() => handleBackgroundSelect("light", bg.background)}
                className={`group relative rounded-xl border-2 p-4 text-center transition-colors ${
                  selectedBackground.light === bg.background
                    ? "border-primary ring-2 ring-primary ring-offset-2 bg-primary/5"
                    : "border-border/70 hover:border-primary/40 hover:bg-secondary/30"
                }`}
                type="button"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="flex flex-col items-center gap-2">
                    <span className="font-medium text-base">{bg.name}</span>
                    <span className="text-xs text-muted-foreground">{bg.description}</span>
                  </div>
                  <div className="h-8 w-12 rounded border border-border" style={{ backgroundColor: bg.background }} />
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Label className="text-sm font-medium">{t("customization.background.darkMode")}</Label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {BACKGROUND_OPTIONS.dark.map((bg) => (
              <button
                key={bg.name}
                onClick={() => handleBackgroundSelect("dark", bg.background)}
                className={`group relative rounded-xl border-2 p-4 text-center transition-colors ${
                  selectedBackground.dark === bg.background
                    ? "border-primary ring-2 ring-primary ring-offset-2 bg-primary/5"
                    : "border-border/70 hover:border-primary/40 hover:bg-secondary/30"
                }`}
                type="button"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="flex flex-col items-center gap-2">
                    <span className="font-medium text-base">{bg.name}</span>
                    <span className="text-xs text-muted-foreground">{bg.description}</span>
                  </div>
                  <div className="h-8 w-12 rounded border border-border" style={{ backgroundColor: bg.background }} />
                </div>
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">{t("customization.background.availableDescription")}</p>
      </div>
    </CustomizationCard>
  );
}
