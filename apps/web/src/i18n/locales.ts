/**
 * Languages shipped with Amfora. Eight languages; the other translations
 * from upstream were dropped in 2.3.0 and can be restored from git history if needed.
 */
export const LANGUAGES = {
  "en-US": "English",
  "nl-NL": "Nederlands",
  "de-DE": "Deutsch",
  "fr-FR": "Français",
  "es-ES": "Español",
  "it-IT": "Italiano",
  "pt-BR": "Português (Brasil)",
  "pl-PL": "Polski",
} as const;

export type Locale = keyof typeof LANGUAGES;

export const SUPPORTED_LOCALES = Object.keys(LANGUAGES) as Locale[];

export const isSupportedLocale = (value: string | undefined): value is Locale =>
  !!value && (SUPPORTED_LOCALES as string[]).includes(value);
