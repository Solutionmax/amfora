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
  const root = document.documentElement;

  if (!value) return;

  if (key === "color") {
    root.style.setProperty("--primary", value);
    root.style.setProperty("--sidebar-primary", value);
    root.style.setProperty("--ring", value);
    root.style.setProperty("--sidebar-ring", value);
    return;
  }

  if (key === "font") {
    root.style.setProperty("--custom-font-family", value);
    root.style.setProperty("--font-sans", value);
    root.style.setProperty("--font-serif", value);
    return;
  }

  root.style.setProperty("--radius", value);
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
