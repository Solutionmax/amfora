"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Statement } from "@/components/brand/statement";
import { TransferShell } from "@/components/brand/transfer-shell";
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
    <TransferShell
      statement={
        <Statement
          title={t("public.reset.title")}
          accentLine={t("public.reset.accent")}
          quote={t("public.reset.text")}
        />
      }
    >
      <div className="flex flex-col gap-5 px-6 py-7 md:px-7">
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
      </div>
    </TransferShell>
  );
}
