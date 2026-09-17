"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { AmphoraMark } from "@/components/brand/amphora-mark";
import { LanguageSwitcher } from "@/components/general/language-switcher";
import { DefaultFooter } from "@/components/ui/default-footer";
import { useAppInfo } from "@/contexts/app-info-context";
import { ForgotPasswordForm } from "./components/forgot-password-form";
import { ForgotPasswordHeader } from "./components/forgot-password-header";
import { useForgotPassword } from "./hooks/use-forgot-password";

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const t = useTranslations();
  const { appName, appLogo } = useAppInfo();

  return (
    <div className="grid min-h-screen bg-[#071827] lg:grid-cols-[minmax(0,1fr)_520px]">
      <aside className="relative hidden overflow-hidden lg:block">
        <img
          src="/art/amfora-glass.webp"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          className="absolute inset-0 size-full object-cover object-center opacity-80"
        />
        <div className="absolute inset-0 bg-[#071827]/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071827] via-[#071827]/15 to-[#071827]/45" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white xl:p-16">
          <div className="flex items-center gap-3">
            {appLogo ? (
              <img alt="" className="size-9 rounded bg-white/95 p-1 object-contain" src={appLogo} />
            ) : (
              <AmphoraMark className="size-9 text-sky-300" />
            )}
            <span className="max-w-[18rem] truncate font-display text-2xl font-bold tracking-tight">{appName}</span>
          </div>
          <div className="max-w-md">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-sky-200/80">{t("home.pageTitle")}</p>
            <p className="mt-5 font-display text-6xl font-extrabold leading-[0.95] tracking-[-0.04em] xl:text-7xl">
              {t("home.header.fileSharing")} <span className="text-sky-200">{t("home.header.tagline")}</span>
            </p>
            <p className="mt-7 text-base leading-7 text-white/70">{t("home.privacyMessage")}</p>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
            {t("home.points.selfHosted")}
          </p>
        </div>
      </aside>

      <section className="relative flex min-h-screen flex-col bg-background">
        <div className="relative h-32 overflow-hidden lg:hidden">
          <img
            src="/art/amfora-glass.webp"
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            className="absolute inset-0 size-full object-cover object-[50%_42%]"
          />
          <div className="absolute inset-0 bg-[#071827]/65" />
          <div className="relative flex h-full items-end px-6 pb-4 text-white">
            {appLogo ? (
              <img alt="" className="mr-2.5 size-8 rounded bg-white/95 p-1 object-contain" src={appLogo} />
            ) : (
              <AmphoraMark className="mr-2.5 size-8 text-sky-200" />
            )}
            <span className="truncate font-display text-xl font-bold">{appName}</span>
          </div>
        </div>
        <div className="absolute right-6 top-6 z-20 rounded-lg border border-border bg-background/95 p-1 shadow-sm">
          <LanguageSwitcher />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-12 sm:py-20">
          <div className="relative z-10 w-full max-w-sm">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border/80 bg-card p-6 shadow-[0_24px_80px_-40px_rgba(7,24,39,0.55)] sm:p-8"
              initial={{ opacity: 0, y: 20 }}
            >
              <ForgotPasswordHeader />
              {forgotPassword.authConfigLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : !forgotPassword.passwordAuthEnabled ? (
                <div className="mt-8 space-y-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-muted-foreground">{t("forgotPassword.passwordAuthDisabled")}</p>
                  </div>
                  <div className="text-center">
                    <Link className="text-muted-foreground hover:text-primary text-sm" href="/login">
                      {t("forgotPassword.backToLogin")}
                    </Link>
                  </div>
                </div>
              ) : (
                <ForgotPasswordForm form={forgotPassword.form} onSubmit={forgotPassword.onSubmit} />
              )}
            </motion.div>
          </div>
        </div>
        <DefaultFooter />
      </section>
    </div>
  );
}
