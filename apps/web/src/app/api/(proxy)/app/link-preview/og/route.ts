import { brandingImageProxy } from "@/lib/branding-image-proxy";

export const dynamic = "force-dynamic";

/** The default link preview image as a 1200 px JPEG, for og:image. */
export const { GET } = brandingImageProxy("/app/link-preview/og", "image/jpeg");
