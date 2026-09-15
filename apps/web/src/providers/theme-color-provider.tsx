"use client";

import { useEffect } from "react";

import { useAppInfo } from "@/contexts/app-info-context";
import { applyAppearance } from "@/hooks/use-appearance";

const BACKGROUND_STORAGE_KEY = "palmr-custom-background";

export function ThemeColorProvider({ children }: { children: React.ReactNode }) {
  const { appPrimaryColor, appFontFamily, appRadius } = useAppInfo();

  useEffect(() => {
    applyAppearance("color", appPrimaryColor);
    applyAppearance("font", appFontFamily);
    applyAppearance("radius", appRadius);
  }, [appPrimaryColor, appFontFamily, appRadius]);

  useEffect(() => {
    // Background stays a per-browser preference; it is not part of the installation brand.
    try {
      const savedBackground = localStorage.getItem(BACKGROUND_STORAGE_KEY);
      if (savedBackground) {
        const parsed = JSON.parse(savedBackground);
        document.documentElement.style.setProperty("--custom-background-light", parsed.light);
        document.documentElement.style.setProperty("--custom-background-dark", parsed.dark);
      }
    } catch {
      // corrupt or blocked storage: keep the installation defaults
    }
  }, []);

  return <>{children}</>;
}
