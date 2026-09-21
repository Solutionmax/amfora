/**
 * The one place the product's own name lives in the web app. Everything an
 * installation can rename reads `appName`/`appLogo` from the API; this is the
 * fallback when that is unavailable, and the credit that stays on free installs.
 */
export const DEFAULT_BRAND = {
  name: "Amfora",
  tagline: "Secure file sharing",
  url: "https://amfora.solutionmax.net/",
} as const;
