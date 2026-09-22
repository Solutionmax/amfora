import { brandingImageProxy } from "@/lib/branding-image-proxy";

export const dynamic = "force-dynamic";

/** The cover as a 1200 px JPEG, for og:image. */
export const { GET } = brandingImageProxy("/app/share-cover/og", "image/jpeg");
