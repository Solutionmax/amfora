"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { Amphora } from "@/components/brand/amphora";
import { LanguageSwitcher } from "@/components/general/language-switcher";
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
  const { appName, appDescription, firstAccess } = useAppInfo();

  if (login.isAuthenticated === null || login.isAuthenticated === true) {
    return <LoadingScreen />;
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_min(50%,640px)]">
      <aside className="relative hidden flex-col justify-between bg-secondary p-12 lg:flex">
        <div className="flex items-center gap-3">
          <Amphora className="h-9 w-9 text-primary" fill={0.62} />
          <span className="font-display text-2xl font-bold tracking-tight">{appName}</span>
        </div>
        <p className="max-w-sm font-display text-4xl font-extrabold leading-[1.05] tracking-tight">{appDescription}</p>
        <p className="max-w-sm border-l-2 border-seal/50 pl-4 text-sm leading-relaxed text-muted-foreground">
          {t("home.privacyMessage")}
        </p>
      </aside>

      <div className="relative flex flex-col">
        <div className="absolute right-4 top-4 z-50">
          <LanguageSwitcher />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-16">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full max-w-sm flex-col gap-6"
            initial={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <LoginHeader firstAccess={firstAccess as boolean} />
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
        </div>
      </div>
    </div>
  );
}
