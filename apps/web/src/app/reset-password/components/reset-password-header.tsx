import Link from "next/link";
import { IconArrowLeft, IconLock } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

export function ResetPasswordHeader() {
  const t = useTranslations();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <IconLock className="size-5" />
        </span>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            {t("resetPassword.pageTitle")}
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">
            {t("resetPassword.header.title")}
          </h1>
        </div>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{t("resetPassword.header.description")}</p>
      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <IconArrowLeft className="size-4" />
        {t("resetPassword.form.backToLogin")}
      </Link>
    </div>
  );
}
