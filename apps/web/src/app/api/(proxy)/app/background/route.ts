import { brandingImageProxy } from "@/lib/branding-image-proxy";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** The background is public: every visitor of a public page loads it. */
export const { GET, POST, DELETE } = brandingImageProxy("/app/background");
