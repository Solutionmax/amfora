import { create } from "zustand";

import { getAppInfo } from "@/http/endpoints";

interface AppInfoStore {
  appName: string;
  appLogo: string;
  appDescription: string;
  appPrimaryColor: string;
  appFontFamily: string;
  appRadius: string;
  firstAccess: boolean | null;
  isLoading: boolean;
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
    firstAccess: null,
    isLoading: true,
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
          firstAccess: response.data.firstUserAccess,
          isLoading: false,
        });
        updateTitle(response.data.appName);
      } catch (error) {
        console.error("Failed to fetch app info:", error);
        set({ isLoading: false });
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
          firstAccess: response.data.firstUserAccess,
          isLoading: false,
        });
        updateTitle(response.data.appName);
      } catch (error) {
        console.error("Failed to fetch app info:", error);
        set({ isLoading: false });
      }
    },
  };
});
