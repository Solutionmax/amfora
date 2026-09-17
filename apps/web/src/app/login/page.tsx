"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { AmphoraMark } from "@/components/brand/amphora-mark";
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
  const { appName, appLogo, firstAccess } = useAppInfo();

  if (login.isAuthenticated === null || login.isAuthenticated === true) {
    return <LoadingScreen />;
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
      <aside className="relative hidden overflow-hidden border-r bg-secondary/45 lg:block">
        <div className="pointer-events-none absolute -right-40 -top-40 size-[34rem] rounded-full bg-primary/[0.08] blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            {appLogo ? (
              <img alt="" className="h-9 w-9 rounded object-contain" src={appLogo} />
            ) : (
              <AmphoraMark className="h-9 w-9 text-primary" />
            )}
            <span className="font-display text-2xl font-bold tracking-tight">{appName}</span>
          </div>

          <div className="max-w-xl">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">{t("home.pageTitle")}</p>
            <p className="mt-5 font-display text-6xl font-extrabold leading-[0.95] tracking-[-0.04em]">
              {t("home.header.fileSharing")} <span className="text-primary">{t("home.header.tagline")}</span>
            </p>
            <p className="mt-7 max-w-md text-base leading-7 text-muted-foreground">{t("home.privacyMessage")}</p>
            <div className="mt-10 flex max-w-sm items-center gap-4 rounded-2xl border bg-background/75 p-4 shadow-sm">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <AmphoraMark className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{t("home.points.selfHosted")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("share.sealed")}</p>
              </div>
            </div>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {t("home.points.selfHosted")}
          </p>
        </div>
      </aside>

      <div className="relative flex flex-col bg-card/35">
        <div className="absolute right-6 top-6 z-50">
          <LanguageSwitcher />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-20 sm:px-12">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full max-w-sm flex-col gap-8"
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
