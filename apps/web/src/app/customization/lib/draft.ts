/** Everything on the customization page that waits for the SaveBar. Images and the brand pack save at once. */
export interface BrandDraft {
  name: string;
  description: string;
  color: string;
  radiusPx: number;
  font: string;
  theme: string;
  showCredit: boolean;
  css: string;
}

export const DEFAULT_RADIUS_PX = 8;
export const RADIUS_MAX_PX = 16;
const PX_PER_REM = 16;
const HEX = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: string): boolean {
  return HEX.test(value);
}

export function remToPx(value: string): number {
  const rem = parseFloat(value);

  return Number.isFinite(rem) ? Math.round(rem * PX_PER_REM) : DEFAULT_RADIUS_PX;
}

export function pxToRem(px: number): string {
  return `${px / PX_PER_REM}rem`;
}

/** The server config key for each draft field, and how its value is written. */
const CONFIG: { [K in keyof BrandDraft]: { key: string; write: (value: BrandDraft[K]) => string } } = {
  name: { key: "appName", write: (value) => value.trim() },
  description: { key: "appDescription", write: (value) => value.trim() },
  color: { key: "appPrimaryColor", write: (value) => value.toLowerCase() },
  radiusPx: { key: "appRadius", write: (value) => pxToRem(value) },
  font: { key: "appFontFamily", write: (value) => value },
  theme: { key: "appPublicTheme", write: (value) => value },
  showCredit: { key: "appHideCredit", write: (value) => String(!value) },
  css: { key: "appCustomCss", write: (value) => value },
};

export type RadiusFeel = "sharp" | "soft" | "round";

/** A word for the corner radius slider label. */
export function radiusFeel(px: number): RadiusFeel {
  if (px <= 4) return "sharp";
  if (px <= 10) return "soft";

  return "round";
}

/** Fields that differ, as config writes. Fields in `skip` (not editable right now) are left out. */
export function changedConfigs(
  stored: BrandDraft,
  draft: BrandDraft,
  skip: readonly (keyof BrandDraft)[] = []
): { key: string; value: string }[] {
  return (Object.keys(CONFIG) as (keyof BrandDraft)[])
    .filter((field) => !skip.includes(field) && stored[field] !== draft[field])
    .map((field) => {
      const config = CONFIG[field] as { key: string; write: (value: BrandDraft[typeof field]) => string };

      return { key: config.key, value: config.write(draft[field]) };
    });
}

export function isDraftDirty(stored: BrandDraft, draft: BrandDraft): boolean {
  return (Object.keys(CONFIG) as (keyof BrandDraft)[]).some((field) => stored[field] !== draft[field]);
}

/**
 * After the stored values change (a refresh), keep what the user is editing and take the
 * new stored value for every field they have not touched.
 */
export function rebaseDraft(previous: BrandDraft, next: BrandDraft, draft: BrandDraft): BrandDraft {
  const result = { ...draft };
  (Object.keys(CONFIG) as (keyof BrandDraft)[]).forEach((field) => {
    if (draft[field] === previous[field]) {
      (result as Record<string, unknown>)[field] = next[field];
    }
  });

  return result;
}
