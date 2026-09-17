"use client";

import { useCallback, useEffect, useState } from "react";
import { IconTypography } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Label } from "@/components/ui/label";
import { useAppearance } from "@/hooks/use-appearance";
import { CustomizationCard } from "./customization-card";

const PREDEFINED_FONTS = [
  { name: "Outfit", value: "var(--font-outfit), Outfit, sans-serif" },
  { name: "Inter", value: "var(--font-inter), Inter, sans-serif" },
  { name: "Roboto", value: "var(--font-roboto), Roboto, sans-serif" },
  { name: "Open Sans", value: "var(--font-open-sans), 'Open Sans', sans-serif" },
  { name: "Poppins", value: "var(--font-poppins), Poppins, sans-serif" },
  { name: "Nunito", value: "var(--font-nunito), Nunito, sans-serif" },
  { name: "Lato", value: "var(--font-lato), Lato, sans-serif" },
  { name: "Montserrat", value: "var(--font-montserrat), Montserrat, sans-serif" },
  { name: "Source Sans 3", value: "var(--font-source-sans), 'Source Sans 3', sans-serif" },
  { name: "Raleway", value: "var(--font-raleway), Raleway, sans-serif" },
  { name: "Work Sans", value: "var(--font-work-sans), 'Work Sans', sans-serif" },
];

export function FontPickerForm() {
  const t = useTranslations();
  const [selectedFont, setSelectedFont] = useState(PREDEFINED_FONTS[0].value);
  const appearance = useAppearance();

  const applyFont = useCallback((fontValue: string) => {
    document.documentElement.style.setProperty("--custom-font-family", fontValue);
    document.documentElement.style.setProperty("--font-sans", fontValue);
    document.documentElement.style.setProperty("--font-serif", fontValue);

    document.body.style.fontFamily = fontValue;
  }, []);

  useEffect(() => {
    if (appearance.font) {
      setSelectedFont(appearance.font);
    }
  }, [appearance.font]);

  const handleFontSelect = async (fontValue: string) => {
    setSelectedFont(fontValue);
    applyFont(fontValue);
    try {
      await appearance.save("font", fontValue);
    } catch (error) {
      console.error("Failed to save appearance:", error);
    }
  };

  const resetToDefault = () => {
    const defaultFont = PREDEFINED_FONTS[0].value;
    handleFontSelect(defaultFont);
  };

  return (
    <CustomizationCard
      icon={IconTypography}
      title={t("customization.fonts.title")}
      description={t("customization.fonts.description")}
      resetLabel={t("customization.fonts.reset")}
      onReset={resetToDefault}
    >
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t("customization.fonts.available")}</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PREDEFINED_FONTS.map((font) => (
            <button
              key={font.name}
              onClick={() => handleFontSelect(font.value)}
              className={`group relative rounded-xl border-2 p-4 text-center transition-colors ${
                selectedFont === font.value
                  ? "border-primary ring-2 ring-primary ring-offset-2 bg-primary/5"
                  : "border-border/70 hover:border-primary/40 hover:bg-secondary/30"
              }`}
              type="button"
            >
              <span
                className="font-medium text-lg group-hover:text-primary transition-colors"
                style={{ fontFamily: font.value }}
              >
                {font.name}
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">{t("customization.fonts.availableDescription")}</p>
      </div>
    </CustomizationCard>
  );
}
