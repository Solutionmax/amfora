"use client";

import { useCallback, useEffect, useState } from "react";
import { IconBorderRadius } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Label } from "@/components/ui/label";
import { useAppearance } from "@/hooks/use-appearance";
import { CustomizationCard } from "./customization-card";

const PREDEFINED_RADIUS = [
  { name: "None", value: "0rem", description: "Sharp corners" },
  { name: "Small", value: "0.25rem", description: "Slightly rounded" },
  { name: "Medium", value: "0.5rem", description: "Balanced rounding" },
  { name: "Large", value: "0.75rem", description: "More rounded" },
  { name: "Extra Large", value: "1rem", description: "Very rounded" },
  { name: "Maximum", value: "1.5rem", description: "Fully rounded" },
];

export function RadiusPickerForm() {
  const t = useTranslations();
  const [selectedRadius, setSelectedRadius] = useState(PREDEFINED_RADIUS[2].value);
  const appearance = useAppearance();
  const applyRadius = useCallback((radiusValue: string) => {
    document.documentElement.style.setProperty("--radius", radiusValue);
  }, []);

  useEffect(() => {
    if (appearance.radius) {
      setSelectedRadius(appearance.radius);
    }
  }, [appearance.radius]);

  const handleRadiusSelect = async (radiusValue: string) => {
    setSelectedRadius(radiusValue);
    applyRadius(radiusValue);
    try {
      await appearance.save("radius", radiusValue);
    } catch (error) {
      console.error("Failed to save appearance:", error);
    }
  };

  const resetToDefault = () => {
    const defaultRadius = PREDEFINED_RADIUS[2].value;
    handleRadiusSelect(defaultRadius);
  };

  return (
    <CustomizationCard
      icon={IconBorderRadius}
      title={t("customization.radius.title")}
      description={t("customization.radius.description")}
      resetLabel={t("customization.radius.reset")}
      onReset={resetToDefault}
    >
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t("customization.radius.available")}</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PREDEFINED_RADIUS.map((radius) => (
            <button
              key={radius.name}
              onClick={() => handleRadiusSelect(radius.value)}
              className={`group relative rounded-lg border p-3 text-left transition-colors ${
                selectedRadius === radius.value
                  ? "border-primary ring-2 ring-primary ring-offset-2 bg-primary/5"
                  : "border-border/70 hover:border-primary/40 hover:bg-secondary/30"
              }`}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="block text-sm font-medium">{radius.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{radius.description}</span>
                </div>
                <div
                  className="h-7 w-10 shrink-0 border border-primary/30 bg-primary/20"
                  style={{ borderRadius: radius.value }}
                />
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">{t("customization.radius.availableDescription")}</p>
      </div>
    </CustomizationCard>
  );
}
