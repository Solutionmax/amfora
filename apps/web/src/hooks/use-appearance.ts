"use client";

import { useAppInfo } from "@/contexts/app-info-context";
import { updateConfig } from "@/http/endpoints";

export const APPEARANCE_KEYS = {
  color: "appPrimaryColor",
  font: "appFontFamily",
  radius: "appRadius",
} as const;

/** Applies an appearance value to the document. Same code path for preview and for load. */
export function applyAppearance(key: keyof typeof APPEARANCE_KEYS, value: string) {
  const root = document.documentElement.style;
  const vars: Record<keyof typeof APPEARANCE_KEYS, string[]> = {
    color: ["--primary"],
    font: ["--font-body", "--font-display-family"],
    radius: ["--radius"],
  };

  // An empty value means "the default": the stylesheet's own value must win again.
  for (const name of vars[key]) {
    if (value) root.setProperty(name, value);
    else root.removeProperty(name);
  }
}

/**
 * Appearance is stored per installation, not per browser, so a visitor who never logs in
 * still sees the operator's branding. Saving requires admin rights (enforced server side).
 */
export function useAppearance() {
  const { appPrimaryColor, appFontFamily, appRadius, refreshAppInfo } = useAppInfo();

  const save = async (key: keyof typeof APPEARANCE_KEYS, value: string) => {
    applyAppearance(key, value);
    await updateConfig(APPEARANCE_KEYS[key], { value });
    await refreshAppInfo();
  };

  return { color: appPrimaryColor, font: appFontFamily, radius: appRadius, save };
}
