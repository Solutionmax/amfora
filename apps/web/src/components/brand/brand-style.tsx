"use client";

import { useEffect } from "react";

import { useAppInfo } from "@/contexts/app-info-context";
import { applyAppearance } from "@/hooks/use-appearance";

/**
 * Writes the installation's appearance onto <html>: accent, radius, font, and the
 * public-page background. Everything comes from /app/info, so a visitor who never
 * signs in sees the same brand as the operator.
 */
export function BrandStyle() {
  const { appPrimaryColor, appFontFamily, appRadius, appBackground, appCustomCss } = useAppInfo();

  useEffect(() => {
    applyAppearance("color", appPrimaryColor);
    applyAppearance("font", appFontFamily);
    applyAppearance("radius", appRadius);
    document.documentElement.style.setProperty(
      "--public-bg-image",
      appBackground ? "url(/api/app/background)" : "none"
    );
  }, [appPrimaryColor, appFontFamily, appRadius, appBackground]);

  if (!appCustomCss) return null;

  // The server only returns custom CSS with a valid brandpack, and it has already
  // stripped imports, outside urls and expressions. This is the one place the app
  // injects markup it did not write, and it is admin-authored by design.
  return <style id="amfora-custom-css" dangerouslySetInnerHTML={{ __html: appCustomCss }} />;
}
