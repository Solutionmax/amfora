/** Mirrors apps/server/src/modules/app/public-theme.ts. */
export const PUBLIC_THEMES = ["stage", "workbench", "seal"] as const;
export type PublicTheme = (typeof PUBLIC_THEMES)[number];

export function normalizePublicTheme(value: string | null | undefined): PublicTheme {
  return PUBLIC_THEMES.includes(value as PublicTheme) ? (value as PublicTheme) : "stage";
}
