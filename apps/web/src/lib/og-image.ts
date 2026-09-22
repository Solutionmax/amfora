import type { LinkPreviewInfo } from "@/http/endpoints/app/types";
import { DEFAULT_BRAND } from "./brand";

/**
 * Unfurl bots (Slack, WhatsApp, Discord) fetch og:image over HTTP, so every candidate is
 * an absolute URL on this origin. The order is: the download page cover, the default link
 * preview image, the app logo, the static product card. A file from the share itself is
 * never used: whoever pastes a link must not publish its contents by doing so.
 *
 * An uploaded app logo is stored as a `data:` URI, which renders as a broken image
 * everywhere, so it is served through `/api/app/logo` instead.
 */
export interface OgImage {
  url: string;
  width?: number;
  height?: number;
  alt: string;
}

export interface OgImageSources {
  cover?: LinkPreviewInfo | null;
  linkPreview?: LinkPreviewInfo | null;
  appLogo?: string | null;
  appName?: string | null;
}

function uploaded(baseUrl: string, path: string, info: LinkPreviewInfo, alt: string): OgImage {
  return {
    url: `${baseUrl}${path}?v=${encodeURIComponent(info.version)}`,
    width: info.width,
    height: info.height,
    alt,
  };
}

export function buildOgImage(baseUrl: string, { cover, linkPreview, appLogo, appName }: OgImageSources = {}): OgImage {
  const alt = appName || DEFAULT_BRAND.name;

  if (cover) {
    return uploaded(baseUrl, "/api/app/share-cover/og", cover, alt);
  }

  if (linkPreview) {
    return uploaded(baseUrl, "/api/app/link-preview/og", linkPreview, alt);
  }

  if (appLogo && /^https?:\/\//i.test(appLogo)) {
    return { url: appLogo, alt };
  }

  if (appLogo && /^data:image\//i.test(appLogo)) {
    return { url: `${baseUrl}/api/app/logo`, alt };
  }

  return { url: `${baseUrl}/og-card.jpg`, width: 1200, height: 630, alt };
}
