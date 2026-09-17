"use client";

import { useCallback, useEffect, useState } from "react";
import { IconBorderRadius } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAppearance } from "@/hooks/use-appearance";

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
    <Card className="gap-0 p-6">
      <CardHeader className="flex flex-row items-center justify-between p-0">
        <div className="flex flex-row items-center gap-8">
          <IconBorderRadius className="text-xl text-muted-foreground" />
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">{t("customization.radius.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("customization.radius.description")}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <Separator className="my-6" />
        <div className="flex flex-col gap-4">
          <div className="space-y-2 mb-3">
            <Label className="text-sm font-medium mb-6">{t("customization.radius.available")}</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PREDEFINED_RADIUS.map((radius) => (
                <button
                  key={radius.name}
                  onClick={() => handleRadiusSelect(radius.value)}
                  className={`group relative rounded-xl border-2 p-4 text-center transition-colors ${
                    selectedRadius === radius.value
                      ? "border-primary ring-2 ring-primary ring-offset-2 bg-primary/5"
                      : "border-border/70 hover:border-primary/40 hover:bg-secondary/30"
                  }`}
                  type="button"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex flex-col items-center gap-2">
                      <span className="font-medium text-base">{radius.name}</span>
                      <span className="text-xs text-muted-foreground">{radius.description}</span>
                    </div>
                    <div
                      className="w-12 h-8 bg-primary/20 border border-primary/30"
                      style={{ borderRadius: radius.value }}
                    />
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground ml-1 mt-6">{t("customization.radius.availableDescription")}</p>
          </div>
        </div>
        <div className="flex justify-between items-center mt-4">
          <div className="flex"></div>
          <div className="flex">
            <Button variant="outline" onClick={resetToDefault} className="text-sm">
              {t("customization.radius.reset")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
