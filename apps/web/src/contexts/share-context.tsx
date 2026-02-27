"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { useSecureConfigValue } from "@/hooks/use-secure-configs";

interface ShareContextType {
  smtpEnabled: string;
  refreshShareContext: () => Promise<void>;
}

const ShareContext = createContext<ShareContextType>({
  smtpEnabled: "false",
  refreshShareContext: async () => {},
});

export function ShareProvider({ children }: { children: React.ReactNode }) {
  const [smtpEnabled, setSmtpEnabled] = useState("false");
  const { value: smtpValue, reload: reloadSmtpConfig } = useSecureConfigValue("smtpEnabled");

  useEffect(() => {
    if (smtpValue !== null) {
      setSmtpEnabled(smtpValue);
    }
  }, [smtpValue]);

  const refreshShareContext = async () => {
    await reloadSmtpConfig();
  };

  return <ShareContext.Provider value={{ smtpEnabled, refreshShareContext }}>{children}</ShareContext.Provider>;
}

export const useShareContext = () => useContext(ShareContext);
