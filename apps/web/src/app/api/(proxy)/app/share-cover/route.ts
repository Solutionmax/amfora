import { brandingImageProxy } from "@/lib/branding-image-proxy";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** The cover at the head of every download page. Free, public to read. */
export const { GET, POST, DELETE } = brandingImageProxy("/app/share-cover");
