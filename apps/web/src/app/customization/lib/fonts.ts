/** The fonts an installation can pick. Each one ships with the app (see app/fonts.ts). */
export const PREDEFINED_FONTS = [
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
] as const;

/** The app's own font variable a stored value starts with, such as `--font-inter`. */
function variableOf(value: string): string | null {
  return /^\s*var\(\s*(--font-[a-z0-9-]+)\s*\)/i.exec(value)?.[1].toLowerCase() ?? null;
}

/**
 * The stored font as the form works with it. A value that points at one of the fonts above
 * becomes exactly that option. A font variable this version does not have (versions before 2.3
 * stored `var(--font-jakarta)` as their default) becomes the default, because that is what the
 * page already shows. Anything else is somebody's own font family and stays as it is.
 */
export function normalizeFont(stored: string | null | undefined): string {
  const value = (stored ?? "").trim();
  const variable = variableOf(value);
  if (!variable) return value;

  return PREDEFINED_FONTS.find((font) => variableOf(font.value) === variable)?.value ?? "";
}

/** A readable name for a font family that is not in the list: its first family, without quotes. */
export function fontName(value: string): string {
  return value.split(",")[0].replace(/["']/g, "").trim();
}
