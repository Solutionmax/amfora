import Link from "next/link";
import { IconArrowLeft, IconLock } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

export function ResetPasswordHeader() {
  const t = useTranslations();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="tile">
          <IconLock className="size-5" />
        </span>
        <div>
          <h1 className="font-display text-xl font-semibold tracking-[-0.02em]">{t("resetPassword.header.title")}</h1>
        </div>
      </div>
      <p className="text-[13px] leading-6 text-ink-3">{t("resetPassword.header.description")}</p>
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
