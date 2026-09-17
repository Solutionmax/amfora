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
      <aside className="relative hidden overflow-hidden border-r bg-[#0b1a2a] lg:block">
        <img
          src="/art/amfora-glass.webp"
          alt=""
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-[50%_center]"
        />
        <div className="absolute inset-0 bg-[#071321]/65" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071321] via-transparent to-[#071321]/30" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white xl:p-16">
          <div className="flex items-center gap-3">
            {appLogo ? (
              <img alt="" className="h-9 w-9 rounded-lg bg-white/95 p-1 object-contain" src={appLogo} />
            ) : (
              <AmphoraMark className="h-9 w-9 text-white" />
            )}
            <span className="max-w-[18rem] truncate font-display text-2xl font-bold tracking-tight">{appName}</span>
          </div>

          <div className="max-w-xl">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-white/70">{t("home.pageTitle")}</p>
            <p className="mt-5 font-display text-6xl font-extrabold leading-[0.95] tracking-[-0.04em] xl:text-7xl">
              {t("home.header.fileSharing")} <span className="text-[#9ed7f2]">{t("home.header.tagline")}</span>
            </p>
            <p className="mt-7 max-w-md text-base leading-7 text-white/75">{t("home.privacyMessage")}</p>
            <div className="mt-10 flex max-w-sm items-center gap-4 border-t border-white/25 pt-5">
              <span className="flex size-10 items-center justify-center rounded-xl border border-white/30 bg-white/10 text-white">
                <AmphoraMark className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{t("home.points.selfHosted")}</p>
                <p className="mt-1 text-xs text-white/60">{t("share.sealed")}</p>
              </div>
            </div>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">
            {t("home.points.selfHosted")}
          </p>
        </div>
      </aside>

      <div className="relative flex min-h-screen flex-col bg-background">
        <div className="relative h-36 overflow-hidden lg:hidden">
          <img
            src="/art/amfora-glass.webp"
            alt=""
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-[50%_center]"
          />
          <div className="absolute inset-0 bg-[#071321]/60" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#071321]/20 to-[#071321]/80" />
          <div className="relative flex h-full items-end px-6 pb-5 sm:px-12">
            <div className="flex min-w-0 items-center gap-2.5 text-white">
              {appLogo ? (
                <img alt="" className="h-8 w-8 shrink-0 rounded-lg bg-white/95 p-1 object-contain" src={appLogo} />
              ) : (
                <AmphoraMark className="h-8 w-8 shrink-0 text-white" />
              )}
              <span className="truncate font-display text-xl font-bold tracking-tight">{appName}</span>
            </div>
          </div>
        </div>
        <div className="absolute right-6 top-6 z-50 rounded-lg border border-border bg-background/95 p-1 shadow-sm">
          <LanguageSwitcher />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-12 sm:py-20">
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
