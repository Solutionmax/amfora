/**
 * Languages shipped with Amfora. Kept to the five most used; the other translations
 * from upstream were dropped in 2.3.0 and can be restored from git history if needed.
 */
export const LANGUAGES = {
  "en-US": "English",
  "nl-NL": "Nederlands",
  "de-DE": "Deutsch",
  "fr-FR": "Français",
  "es-ES": "Español",
} as const;

export type Locale = keyof typeof LANGUAGES;

export const SUPPORTED_LOCALES = Object.keys(LANGUAGES) as Locale[];

export const isSupportedLocale = (value: string | undefined): value is Locale =>
  !!value && (SUPPORTED_LOCALES as string[]).includes(value);
