import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { useAppInfo } from "@/contexts/app-info-context";

export function LoginHeader({ firstAccess }: { firstAccess: boolean }) {
  const t = useTranslations();
  const { refreshAppInfo, appName } = useAppInfo();

  useEffect(() => {
    refreshAppInfo();
  }, [refreshAppInfo]);

  return (
    <div>
      <h2 className="break-words font-display text-xl font-semibold tracking-[-0.02em]">
        {firstAccess ? t("register.buttons.createAdmin") : t("login.signIn")}
      </h2>
      <p className="mt-1 text-[13px] text-ink-3">
        {firstAccess ? t("public.login.firstSub") : t("public.login.sub", { app: appName })}
      </p>
    </div>
  );
}
