import { IconLock } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

export function ResetPasswordHeader() {
  const t = useTranslations();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <IconLock className="size-5" />
        </span>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{t("resetPassword.header.title")}</h1>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{t("resetPassword.header.description")}</p>
    </div>
  );
}
