import { DEFAULT_BRAND } from "./brand";

/**
 * Unfurl bots (Slack, WhatsApp, Discord) fetch og:image over HTTP. An uploaded
 * app logo is stored as a `data:` URI, which renders as a broken image everywhere,
 * so it is served through `/api/app/logo` instead. No logo at all falls back to
 * the static product card.
 */
export interface OgImage {
  url: string;
  width?: number;
  height?: number;
  alt: string;
}

export function buildOgImage(
  baseUrl: string,
  previewObjectName?: string | null,
  appLogo?: string | null,
  appName?: string | null
): OgImage {
  const alt = appName || DEFAULT_BRAND.name;

  if (previewObjectName) {
    return {
      url: `${baseUrl}/api/files/download?objectName=${encodeURIComponent(previewObjectName)}&preview=1`,
      alt: "Shared file",
    };
  }

  if (appLogo && /^https?:\/\//i.test(appLogo)) {
    return { url: appLogo, alt };
  }

  if (appLogo && /^data:image\//i.test(appLogo)) {
    return { url: `${baseUrl}/api/app/logo`, alt };
  }

  return { url: `${baseUrl}/og-card.jpg`, width: 1200, height: 630, alt };
}
