"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { TransferShell } from "@/components/brand/transfer-shell";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { useAppInfo } from "@/contexts/app-info-context";
import { LoginForm } from "./components/login-form";
import { LoginHeader } from "./components/login-header";
import { RegisterForm } from "./components/register-form";
import { TwoFactorVerification } from "./components/two-factor-verification";
import { useLogin } from "./hooks/use-login";

export default function LoginPage() {
  const t = useTranslations();
  const login = useLogin();
  const { firstAccess, appName } = useAppInfo();

  if (login.isAuthenticated === null || login.isAuthenticated === true) {
    return <LoadingScreen />;
  }

  return (
    <TransferShell direction="login" title={`${t("login.welcome")}\n${appName}`} label={t("login.pageTitle")}>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-6"
        initial={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <LoginHeader firstAccess={firstAccess === true} />
        {firstAccess ? (
          <RegisterForm isVisible={login.isVisible} onToggleVisibility={login.toggleVisibility} />
        ) : login.requiresTwoFactor ? (
          <TwoFactorVerification
            twoFactorCode={login.twoFactorCode}
            setTwoFactorCode={login.setTwoFactorCode}
            onSubmit={login.onTwoFactorSubmit}
            error={login.error}
            isSubmitting={login.isSubmitting}
          />
        ) : (
          <LoginForm
            error={login.error}
            isVisible={login.isVisible}
            onSubmit={login.onSubmit}
            onToggleVisibility={login.toggleVisibility}
            passwordAuthEnabled={login.passwordAuthEnabled}
            authConfigLoading={login.authConfigLoading}
          />
        )}
      </motion.div>
    </TransferShell>
  );
}
