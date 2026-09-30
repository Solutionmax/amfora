import { create } from "zustand";

import { normalizePublicTheme, type PublicTheme } from "@/components/brand/public-theme";
import { getAppInfo } from "@/http/endpoints";
import type { LinkPreviewInfo } from "@/http/endpoints/app/types";

interface AppInfoStore {
  appName: string;
  appLogo: string;
  appDescription: string;
  appPrimaryColor: string;
  appFontFamily: string;
  appRadius: string;
  appHideCredit: boolean;
  appBackground: boolean;
  appCustomCss: string;
  appShareCover: LinkPreviewInfo | null;
  appLinkPreview: LinkPreviewInfo | null;
  appSharePlayback: boolean;
  appPublicTheme: PublicTheme;
  brandpack: { organisation: string; issuedAt: string } | null;
  firstAccess: boolean | null;
  isLoading: boolean;
  /** True once the first load finished, so public pages never flash the wrong theme. */
  infoLoaded: boolean;
  setAppName: (name: string) => void;
  setAppLogo: (logo: string) => void;
  refreshAppInfo: () => Promise<void>;
}

const updateTitle = (name: string) => {
  document.title = name;
};

export const useAppInfo = create<AppInfoStore>((set) => {
  const initialState = {
    appName: "",
    appLogo: "",
    appDescription: "",
    appPrimaryColor: "",
    appFontFamily: "",
    appRadius: "",
    appHideCredit: false,
    appBackground: false,
    appCustomCss: "",
    appShareCover: null,
    appLinkPreview: null,
    appSharePlayback: false,
    appPublicTheme: "stage" as PublicTheme,
    brandpack: null,
    firstAccess: null,
    isLoading: true,
    infoLoaded: false,
  };

  const loadAppInfo = async () => {
    if (typeof window !== "undefined") {
      try {
        const response = await getAppInfo();
        set({
          appName: response.data.appName,
          appLogo: response.data.appLogo,
          appDescription: response.data.appDescription,
          appPrimaryColor: response.data.appPrimaryColor ?? "",
          appFontFamily: response.data.appFontFamily ?? "",
          appRadius: response.data.appRadius ?? "",
          appHideCredit: response.data.appHideCredit ?? false,
          appBackground: response.data.appBackground ?? false,
          appCustomCss: response.data.appCustomCss ?? "",
          appShareCover: response.data.appShareCover ?? null,
          appLinkPreview: response.data.appLinkPreview ?? null,
          appSharePlayback: response.data.appSharePlayback ?? false,
          appPublicTheme: normalizePublicTheme(response.data.appPublicTheme),
          brandpack: response.data.brandpack ?? null,
          firstAccess: response.data.firstUserAccess,
          isLoading: false,
          infoLoaded: true,
        });
        updateTitle(response.data.appName);
      } catch (error) {
        console.error("Failed to fetch app info:", error);
        set({ isLoading: false, infoLoaded: true });
      }
    }
  };

  loadAppInfo();

  return {
    ...initialState,
    setAppName: (name: string) => {
      set({ appName: name });
      updateTitle(name);
    },
    setAppLogo: (logo: string) => {
      set({ appLogo: logo });
    },
    refreshAppInfo: async () => {
      set({ isLoading: true });
      try {
        const response = await getAppInfo();
        set({
          appName: response.data.appName,
          appLogo: response.data.appLogo,
          appDescription: response.data.appDescription,
          appPrimaryColor: response.data.appPrimaryColor ?? "",
          appFontFamily: response.data.appFontFamily ?? "",
          appRadius: response.data.appRadius ?? "",
          appHideCredit: response.data.appHideCredit ?? false,
          appBackground: response.data.appBackground ?? false,
          appCustomCss: response.data.appCustomCss ?? "",
          appShareCover: response.data.appShareCover ?? null,
          appLinkPreview: response.data.appLinkPreview ?? null,
          appSharePlayback: response.data.appSharePlayback ?? false,
          appPublicTheme: normalizePublicTheme(response.data.appPublicTheme),
          brandpack: response.data.brandpack ?? null,
          firstAccess: response.data.firstUserAccess,
          isLoading: false,
          infoLoaded: true,
        });
        updateTitle(response.data.appName);
      } catch (error) {
        console.error("Failed to fetch app info:", error);
        set({ isLoading: false, infoLoaded: true });
      }
    },
  };
});
