import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { useAppInfo } from "@/contexts/app-info-context";

export function LoginHeader({ firstAccess }: { firstAccess: boolean }) {
  const t = useTranslations();
  const { refreshAppInfo } = useAppInfo();

  useEffect(() => {
    refreshAppInfo();
  }, [refreshAppInfo]);

  return (
    <h2 className="break-words font-display text-3xl font-extrabold leading-tight tracking-tight">
      {firstAccess ? t("register.buttons.createAdmin") : t("login.signIn")}
    </h2>
  );
}
