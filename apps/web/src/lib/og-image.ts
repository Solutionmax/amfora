/**
 * Unfurl bots (Slack, WhatsApp, Discord) fetch og:image over HTTP. A `data:` URI,
 * which is how an uploaded app logo is stored, renders as a broken image everywhere,
 * so anything that is not an absolute http(s) URL falls back to the static card.
 */
export interface OgImage {
  url: string;
  width?: number;
  height?: number;
  alt: string;
}

export function buildOgImage(baseUrl: string, previewObjectName?: string | null, appLogo?: string | null): OgImage {
  if (previewObjectName) {
    return {
      url: `${baseUrl}/api/files/download?objectName=${encodeURIComponent(previewObjectName)}`,
      alt: "Shared file",
    };
  }

  if (appLogo && /^https?:\/\//i.test(appLogo)) {
    return { url: appLogo, alt: "Amfora" };
  }

  return { url: `${baseUrl}/og-card.jpg`, width: 1200, height: 630, alt: "Amfora" };
}
