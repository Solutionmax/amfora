"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { PublicAuthShell } from "@/components/brand/public-auth-shell";
import { ForgotPasswordForm } from "./components/forgot-password-form";
import { ForgotPasswordHeader } from "./components/forgot-password-header";
import { useForgotPassword } from "./hooks/use-forgot-password";

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const t = useTranslations();

  return (
    <PublicAuthShell eyebrow={t("forgotPassword.pageTitle")}>
      <ForgotPasswordHeader />
      {forgotPassword.authConfigLoading ? (
        <div className="flex items-center justify-center py-10" role="status" aria-live="polite">
          <div className="size-8 animate-spin rounded-full border-2 border-primary/20 border-b-primary" />
        </div>
      ) : !forgotPassword.passwordAuthEnabled ? (
        <div className="mt-8 space-y-4">
          <div className="rounded-2xl border border-border bg-muted/50 p-4 text-center">
            <p className="text-sm leading-6 text-muted-foreground">{t("forgotPassword.passwordAuthDisabled")}</p>
          </div>
          <div className="text-center">
            <Link className="text-sm font-medium text-muted-foreground hover:text-primary" href="/login">
              {t("forgotPassword.backToLogin")}
            </Link>
          </div>
        </div>
      ) : (
        <ForgotPasswordForm form={forgotPassword.form} onSubmit={forgotPassword.onSubmit} />
      )}
    </PublicAuthShell>
  );
}
