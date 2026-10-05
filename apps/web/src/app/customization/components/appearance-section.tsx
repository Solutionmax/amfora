"use client";

import { useTranslations } from "next-intl";

import { Field } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CustomizationDraft } from "../hooks/use-customization-draft";
import { RADIUS_MAX_PX, radiusFeel } from "../lib/draft";
import { fontName, PREDEFINED_FONTS } from "../lib/fonts";
import { FormBlock } from "./form-block";

const SWATCHES = ["#0079d2", "#e8590c", "#1a7f4b", "#6941c6", "#b42318", "#0c1626"];
const DEFAULT_FONT = "default";
const RADIUS_STEP_PX = 2;

/** Accent swatches with a hex field, the corner radius slider and the font. Previews at once. */
export function AppearanceSection({ draft, update }: Pick<CustomizationDraft, "draft" | "update">) {
  const t = useTranslations();
  const hex = draft.color || SWATCHES[0];
  // A font family of somebody's own (set through the API) still shows up as its own option.
  const fonts =
    draft.font && !PREDEFINED_FONTS.some((font) => font.value === draft.font)
      ? [...PREDEFINED_FONTS, { name: fontName(draft.font), value: draft.font }]
      : PREDEFINED_FONTS;

  return (
    <FormBlock title={t("customization.v2.appearance.title")} description={t("customization.calm.colorDescription")}>
      <div className="grid gap-2">
        <span id="accent-label" className="text-[13px] font-medium text-ink-2">
          {t("customization.calm.accent")}
        </span>
        <div role="group" aria-labelledby="accent-label" className="flex flex-wrap items-center gap-2">
          {SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type="button"
              aria-label={t("customization.calm.accentSwatch", { color: swatch })}
              aria-pressed={hex.toLowerCase() === swatch}
              onClick={() => update("color", swatch)}
              className="size-7 rounded-full outline-none ring-1 ring-inset ring-black/10 dark:ring-white/20 transition-shadow focus-visible:ring-[3px] focus-visible:ring-primary/35 aria-pressed:shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--swatch)]"
              style={{ backgroundColor: swatch, ["--swatch" as string]: swatch }}
            />
          ))}
          <Input
            aria-label={t("customization.v2.appearance.accentHex")}
            value={hex}
            onChange={(e) => update("color", e.target.value.trim())}
            className="mono ml-1 h-8 w-[110px] px-2.5 text-[12.5px]"
            maxLength={7}
            spellCheck={false}
            aria-invalid={!/^#[0-9a-f]{6}$/i.test(hex)}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="radius" className="text-[13px] font-medium text-ink-2">
            {t("customization.v2.appearance.radius")}
          </label>
          <span className="text-[12.5px] text-ink-3">
            {t("customization.calm.radiusLabel", { px: draft.radiusPx, feel: radiusFeel(draft.radiusPx) })}
          </span>
        </div>
        <input
          id="radius"
          type="range"
          min={0}
          max={RADIUS_MAX_PX}
          step={RADIUS_STEP_PX}
          value={draft.radiusPx}
          onChange={(e) => update("radiusPx", Number(e.target.value))}
          className="w-full accent-[var(--primary)]"
        />
      </div>

      <Field label={t("customization.v2.appearance.font")} htmlFor="font">
        <Select
          value={draft.font || DEFAULT_FONT}
          onValueChange={(value) => update("font", value === DEFAULT_FONT ? "" : value)}
        >
          <SelectTrigger id="font" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_FONT}>{t("customization.v2.appearance.fontDefault")}</SelectItem>
            {fonts.map((font) => (
              <SelectItem key={font.name} value={font.value}>
                {font.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </FormBlock>
  );
}
