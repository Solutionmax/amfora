import { IconLock } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

export function ForgotPasswordHeader() {
  const t = useTranslations();

  return (
    <div className="space-y-2 text-center">
      <div className="flex items-center justify-center gap-2">
        <IconLock className="h-6 w-6" />
        <h1 className="text-2xl font-bold tracking-tight">{t("forgotPassword.title")}</h1>
      </div>
      <p className="text-muted-foreground">{t("forgotPassword.description")}</p>
    </div>
  );
}
