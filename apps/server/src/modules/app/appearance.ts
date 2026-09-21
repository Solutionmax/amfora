import { type Brandpack } from "./brandpack";
import { sanitizeCss } from "./custom-css";

export interface StoredAppearance {
  appHideCredit: string;
  appCustomCss: string;
  backgroundExists: boolean;
}

export interface PaidAppearance {
  appHideCredit: boolean;
  appBackground: boolean;
  appCustomCss: string;
  brandpack: Brandpack | null;
}

/**
 * The paid customization only reaches the browser with a valid brandpack. What is stored
 * stays stored, so activating a pack later switches it on without re-entering anything.
 */
export function resolvePaidAppearance(stored: StoredAppearance, brandpack: Brandpack | null): PaidAppearance {
  if (!brandpack) {
    return { appHideCredit: false, appBackground: false, appCustomCss: "", brandpack: null };
  }

  return {
    appHideCredit: stored.appHideCredit === "true",
    appBackground: stored.backgroundExists,
    appCustomCss: sanitizeCss(stored.appCustomCss ?? ""),
    brandpack,
  };
}
