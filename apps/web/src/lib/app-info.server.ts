import { DEFAULT_BRAND } from "./brand";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3333";

export interface PublicAppInfo {
  appName: string;
  appDescription: string;
  appLogo: string | null;
}

const FALLBACK: PublicAppInfo = { appName: DEFAULT_BRAND.name, appDescription: DEFAULT_BRAND.tagline, appLogo: null };

/** Server-side app info for metadata. Falls back to the default brand when the API is unreachable. */
export async function fetchAppInfo(): Promise<PublicAppInfo> {
  try {
    const response = await fetch(`${API_BASE_URL}/app/info`, { cache: "no-store" });
    if (!response.ok) {
      return FALLBACK;
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching app info:", error);
    return FALLBACK;
  }
}
