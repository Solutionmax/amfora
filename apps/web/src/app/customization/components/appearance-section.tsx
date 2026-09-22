"use client";

import { useEffect, useState } from "react";
import { IconPalette } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyAppearance, useAppearance } from "@/hooks/use-appearance";
import { Section } from "./section";

const SWATCHES = ["#0079d2", "#e8590c", "#1a7f4b", "#6941c6", "#b42318", "#0c1626"];

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

const RADIUS_MAX_PX = 16;

function remToPx(value: string): number {
  const rem = parseFloat(value);
  return Number.isFinite(rem) ? Math.round(rem * 16) : 8;
}

export function AppearanceSection() {
  const t = useTranslations();
  const appearance = useAppearance();
  const [hex, setHex] = useState(appearance.color || SWATCHES[0]);
  const [radius, setRadius] = useState(remToPx(appearance.radius || "0.5rem"));

  useEffect(() => setHex(appearance.color || SWATCHES[0]), [appearance.color]);
  useEffect(() => setRadius(remToPx(appearance.radius || "0.5rem")), [appearance.radius]);

  // Typing or dragging previews at once; the value is stored when the change is done
  // (swatch click, leaving the field, releasing the slider), not on every keystroke.
  const previewColor = (value: string) => {
    setHex(value);
    if (/^#[0-9a-f]{6}$/i.test(value)) applyAppearance("color", value.toLowerCase());
  };
  const saveColor = (value: string) => {
    previewColor(value);
    if (/^#[0-9a-f]{6}$/i.test(value)) appearance.save("color", value.toLowerCase()).catch(console.error);
  };

  const previewRadius = (px: number) => {
    setRadius(px);
    applyAppearance("radius", `${px / 16}rem`);
  };
  const saveRadius = () => appearance.save("radius", `${radius / 16}rem`).catch(console.error);

  return (
    <Section icon={IconPalette} title={t("customization.v2.appearance.title")}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("customization.v2.appearance.accent")}</Label>
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={swatch}
                aria-pressed={hex.toLowerCase() === swatch}
                onClick={() => saveColor(swatch)}
                className="size-7 rounded-full border-2 border-transparent transition-transform hover:scale-105 aria-pressed:border-ink aria-pressed:shadow-[inset_0_0_0_2px_var(--surface)]"
                style={{ backgroundColor: swatch }}
              />
            ))}
            <Input
              aria-label={t("customization.v2.appearance.accentHex")}
              value={hex}
              onChange={(e) => previewColor(e.target.value)}
              onBlur={(e) => saveColor(e.target.value)}
              className="mono h-7 w-[110px] px-2 text-xs"
              maxLength={7}
            />
          </div>
          <p className="text-xs text-ink-3">{t("customization.v2.appearance.accentHint")}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="radius">{t("customization.v2.appearance.radius")}</Label>
          <input
            id="radius"
            type="range"
            min={0}
            max={RADIUS_MAX_PX}
            step={2}
            value={radius}
            onChange={(e) => previewRadius(Number(e.target.value))}
            onPointerUp={saveRadius}
            onKeyUp={saveRadius}
            onBlur={saveRadius}
            className="w-full accent-primary"
          />
          <p className="text-xs text-ink-3">{t("customization.v2.appearance.radiusHint", { px: radius })}</p>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="font">{t("customization.v2.appearance.font")}</Label>
        <select
          id="font"
          value={appearance.font || ""}
          onChange={(e) => appearance.save("font", e.target.value).catch(console.error)}
          className="h-10 w-full rounded-[var(--radius)] border border-line-2 bg-surface px-3 text-sm sm:max-w-sm"
        >
          <option value="">{t("customization.v2.appearance.fontDefault")}</option>
          {PREDEFINED_FONTS.map((font) => (
            <option key={font.name} value={font.value}>
              {font.name}
            </option>
          ))}
        </select>
      </div>
    </Section>
  );
}
