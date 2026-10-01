"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { BackToSignIn } from "@/components/auth/back-to-sign-in";
import { PublicCard, PublicCardFoot } from "@/components/auth/public-card";
import { PublicShell } from "@/components/brand/public-shell";
import { ResetPasswordForm } from "./components/reset-password-form";
import { useResetPassword } from "./hooks/use-reset-password";

export default function ResetPasswordPage() {
  const t = useTranslations();
  const router = useRouter();
  const resetPassword = useResetPassword();

  useEffect(() => {
    if (!resetPassword.token) {
      toast.error(t("resetPassword.errors.invalidToken"));
      router.push("/login");
    }
  }, [resetPassword.token, router, t]);

  return (
    <PublicShell
      story={{ headline: `${t("public.reset.title")} ${t("public.reset.accent")}` }}
      card={
        <PublicCard title={t("resetPassword.header.title")} description={t("public.reset.text")}>
          <ResetPasswordForm
            form={resetPassword.form}
            isConfirmPasswordVisible={resetPassword.isConfirmPasswordVisible}
            isPasswordVisible={resetPassword.isPasswordVisible}
            onSubmit={resetPassword.onSubmit}
            onToggleConfirmPassword={() =>
              resetPassword.setIsConfirmPasswordVisible(!resetPassword.isConfirmPasswordVisible)
            }
            onTogglePassword={() => resetPassword.setIsPasswordVisible(!resetPassword.isPasswordVisible)}
          />
          <PublicCardFoot>
            <BackToSignIn />
          </PublicCardFoot>
        </PublicCard>
      }
    />
  );
}
