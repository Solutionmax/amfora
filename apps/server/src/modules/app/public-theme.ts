/** How the public pages (sign in, download, receive) look. One choice per installation. */
export const PUBLIC_THEMES = ["stage", "workbench", "seal"] as const;
export type PublicTheme = (typeof PUBLIC_THEMES)[number];

/** Unknown or missing values (an install from before the setting existed) mean the original stage. */
export function normalizePublicTheme(value: string | null | undefined): PublicTheme {
  return PUBLIC_THEMES.includes(value as PublicTheme) ? (value as PublicTheme) : "stage";
}

export function assertPublicTheme(value: string): void {
  if (!PUBLIC_THEMES.includes(value as PublicTheme)) {
    throw new Error(`appPublicTheme must be one of: ${PUBLIC_THEMES.join(", ")}`);
  }
}
