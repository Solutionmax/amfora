"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { DefaultFooter } from "@/components/ui/default-footer";
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
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="relative z-10 w-full max-w-md">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[1.75rem] border bg-card p-8 shadow-sm sm:p-10"
            initial={{ opacity: 0, y: 20 }}
          >
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
          </motion.div>
        </div>
      </div>
      <DefaultFooter />
    </div>
  );
}
