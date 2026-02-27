import { IconLock } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

export function ResetPasswordHeader() {
  const t = useTranslations();

  return (
    <div className="space-y-2 text-center">
      <div className="flex items-center justify-center gap-2">
        <IconLock className="text-2xl" />
        <h1 className="text-2xl font-bold tracking-tight">{t("resetPassword.header.title")}</h1>
      </div>
      <p className="text-default-500">{t("resetPassword.header.description")}</p>
    </div>
  );
}
