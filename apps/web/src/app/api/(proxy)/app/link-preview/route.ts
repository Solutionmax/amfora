import { brandingImageProxy } from "@/lib/branding-image-proxy";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** The default link preview image, used for og:image when no cover is set. */
export const { GET, POST, DELETE } = brandingImageProxy("/app/link-preview");
