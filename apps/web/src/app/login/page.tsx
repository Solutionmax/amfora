"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { AmphoraMark } from "@/components/brand/amphora-mark";
import { Maxim } from "@/components/brand/maxim";
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
  const { appName, firstAccess } = useAppInfo();

  if (login.isAuthenticated === null || login.isAuthenticated === true) {
    return <LoadingScreen />;
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_minmax(0,520px)]">
      {/* The artwork carries the left half; the form keeps the right half quiet. */}
      <aside className="relative hidden overflow-hidden lg:block">
        <img src="/art/terrace.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/55 to-foreground/30" />

        <div className="relative flex h-full flex-col justify-between p-12 text-background">
          <div className="flex items-center gap-3">
            <AmphoraMark className="h-9 w-9" />
            <span className="font-display text-2xl font-bold tracking-tight">{appName}</span>
          </div>

          <div className="flex flex-col gap-6">
            <p className="max-w-md font-display text-5xl font-extrabold leading-[1.02] tracking-tight">
              {t("home.header.fileSharing")}
              <span className="block text-background/75">{t("home.header.tagline")}</span>
            </p>
            <p className="max-w-sm text-sm leading-relaxed opacity-80">{t("home.privacyMessage")}</p>
          </div>

          <div className="opacity-90">
            <Maxim seed="amfora-login" tone="light" />
          </div>
        </div>
      </aside>

      <div className="relative flex flex-col">
        <div className="absolute right-4 top-4 z-50">
          <LanguageSwitcher />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-16">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full max-w-sm flex-col gap-7"
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
