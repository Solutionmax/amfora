"use client";

import { useTranslations } from "next-intl";

import { BackToSignIn } from "@/components/auth/back-to-sign-in";
import { PublicCard, PublicCardFoot, PublicFormSkeleton } from "@/components/auth/public-card";
import { PublicShell } from "@/components/brand/public-shell";
import { ForgotPasswordForm } from "./components/forgot-password-form";
import { useForgotPassword } from "./hooks/use-forgot-password";

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const t = useTranslations();

  const body = forgotPassword.authConfigLoading ? (
    <PublicFormSkeleton fields={1} />
  ) : !forgotPassword.passwordAuthEnabled ? (
    <p className="text-[13px] leading-5 text-ink-3">{t("forgotPassword.passwordAuthDisabled")}</p>
  ) : (
    <ForgotPasswordForm form={forgotPassword.form} onSubmit={forgotPassword.onSubmit} />
  );

  return (
    <PublicShell
      story={{ headline: `${t("public.recover.title")} ${t("public.recover.accent")}` }}
      card={
        <PublicCard title={t("forgotPassword.title")} description={t("public.recover.text")}>
          {body}
          <PublicCardFoot>
            <BackToSignIn />
          </PublicCardFoot>
        </PublicCard>
      }
    />
  );
}
