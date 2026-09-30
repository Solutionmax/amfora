"use client";

import { IconInbox, IconLock, IconShare } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { PublicShell, type PublicStory } from "@/components/brand/public-shell";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { useAppInfo } from "@/contexts/app-info-context";
import { LoginForm } from "./components/login-form";
import { LoginHeader } from "./components/login-header";
import { RegisterForm } from "./components/register-form";
import { TwoFactorVerification } from "./components/two-factor-verification";
import { useLogin } from "./hooks/use-login";

const TRUST = [
  { key: "server", icon: IconLock },
  { key: "expire", icon: IconShare },
  { key: "receive", icon: IconInbox },
] as const;

export default function LoginPage() {
  const t = useTranslations();
  const login = useLogin();
  const { firstAccess, appDescription } = useAppInfo();

  if (login.isAuthenticated === null || login.isAuthenticated === true) {
    return <LoadingScreen />;
  }

  const story: PublicStory = {
    headline: firstAccess
      ? `${t("public.login.firstTitle")} ${t("public.login.firstAccent")}`
      : `${t("public.login.title")} ${t("public.login.accent")}`,
    text: appDescription || undefined,
    trust: TRUST.map(({ key, icon }) => ({
      icon,
      title: t(`public.login.trust.${key}.title`),
      text: t(`public.login.trust.${key}.text`),
    })),
  };

  return (
    <PublicShell
      story={story}
      card={
        <div className="flex flex-col gap-5 px-6 py-7 md:px-7">
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
        </div>
      }
    />
  );
}
