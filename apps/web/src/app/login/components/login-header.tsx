import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { useAppInfo } from "@/contexts/app-info-context";

export function LoginHeader({ firstAccess }: { firstAccess: boolean }) {
  const t = useTranslations();
  const { appName, refreshAppInfo } = useAppInfo();

  useEffect(() => {
    refreshAppInfo();
  }, [refreshAppInfo]);

  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">{t("home.pageTitle")}</p>
      <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
        {t("login.welcome")} {appName}
      </h1>
      {!firstAccess && <p className="text-sm text-muted-foreground">{t("login.signInToContinue")}</p>}
    </div>
  );
}
