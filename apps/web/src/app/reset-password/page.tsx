"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { PublicAuthShell } from "@/components/brand/public-auth-shell";
import { ResetPasswordForm } from "./components/reset-password-form";
import { ResetPasswordHeader } from "./components/reset-password-header";
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
    <PublicAuthShell eyebrow={t("resetPassword.pageTitle")}>
      <ResetPasswordHeader />
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
    </PublicAuthShell>
  );
}
