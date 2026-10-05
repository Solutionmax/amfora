"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { PublicCard } from "@/components/auth/public-card";
import { PublicShell, type PublicStory } from "@/components/brand/public-shell";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { ShareSecretLink } from "@/components/secrets/share-secret-link";
import { useAppInfo } from "@/contexts/app-info-context";
import { LoginForm } from "./components/login-form";
import { RegisterForm } from "./components/register-form";
import { TwoFactorVerification } from "./components/two-factor-verification";
import { useLogin } from "./hooks/use-login";
import { LOGIN_TRUST } from "./trust";

export default function LoginPage() {
  const t = useTranslations();
  const login = useLogin();
  const { firstAccess, appDescription, appName, refreshAppInfo } = useAppInfo();

  // The first-user state can change between visits; always ask the server again here.
  useEffect(() => {
    void refreshAppInfo();
  }, [refreshAppInfo]);

  if (login.isAuthenticated === null || login.isAuthenticated === true) {
    return <LoadingScreen />;
  }

  const story: PublicStory = {
    headline: firstAccess
      ? `${t("public.login.firstTitle")} ${t("public.login.firstAccent")}`
      : `${t("public.login.title")} ${t("public.login.accent")}`,
    text: appDescription || undefined,
    trust: LOGIN_TRUST.map(({ key, icon }) => ({
      icon,
      title: t(`public.login.trust.${key}.title`),
      text: t(`public.login.trust.${key}.text`),
    })),
  };

  const card = firstAccess ? (
    <PublicCard title={t("register.buttons.createAdmin")} description={t("public.login.firstSub")}>
      <RegisterForm isVisible={login.isVisible} onToggleVisibility={login.toggleVisibility} />
    </PublicCard>
  ) : login.requiresTwoFactor ? (
    <TwoFactorVerification
      twoFactorCode={login.twoFactorCode}
      setTwoFactorCode={login.setTwoFactorCode}
      onSubmit={login.onTwoFactorSubmit}
      error={login.error}
      isSubmitting={login.isSubmitting}
    />
  ) : (
    <PublicCard title={t("login.signIn")} description={t("public.login.sub", { app: appName })}>
      <LoginForm
        error={login.error}
        isVisible={login.isVisible}
        onSubmit={login.onSubmit}
        onToggleVisibility={login.toggleVisibility}
        passwordAuthEnabled={login.passwordAuthEnabled}
        authConfigLoading={login.authConfigLoading}
      />
      <ShareSecretLink />
    </PublicCard>
  );

  return <PublicShell story={story} card={card} />;
}
