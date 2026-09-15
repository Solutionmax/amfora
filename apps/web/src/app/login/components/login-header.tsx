import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { Amphora } from "@/components/brand/amphora";
import { useAppInfo } from "@/contexts/app-info-context";

export function LoginHeader({ firstAccess }: { firstAccess: boolean }) {
  const t = useTranslations();
  const { appName, appLogo, refreshAppInfo } = useAppInfo();

  useEffect(() => {
    refreshAppInfo();
  }, [refreshAppInfo]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5 lg:hidden">
        {appLogo ? (
          <img alt="" className="h-8 w-8 rounded object-contain" src={appLogo} />
        ) : (
          <Amphora className="h-8 w-8 text-primary" />
        )}
        <span className="font-display text-xl font-bold tracking-tight">{appName}</span>
      </div>
      <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight">
        {t("login.welcome")} {appName}
      </h1>
      {!firstAccess && <p className="text-sm text-muted-foreground">{t("login.signInToContinue")}</p>}
    </div>
  );
}
