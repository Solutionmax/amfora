"use client";

import { IconInbox, IconLock, IconShare } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Statement } from "@/components/brand/statement";
import { TransferShell } from "@/components/brand/transfer-shell";
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

  const statement = (
    <Statement
      title={firstAccess ? t("public.login.firstTitle") : t("public.login.title")}
      accentLine={firstAccess ? t("public.login.firstAccent") : t("public.login.accent")}
      quote={appDescription || undefined}
    >
      <div className="grid gap-3">
        {TRUST.map(({ key, icon: Icon }) => (
          <div key={key} className="flex items-start gap-3">
            <span className="tile tile-sm border border-[color-mix(in_oklab,var(--line)_70%,transparent)] bg-[color-mix(in_oklab,var(--surface)_75%,transparent)] backdrop-blur-sm">
              <Icon className="size-4" strokeWidth={1.75} />
            </span>
            <span>
              <b className="block text-sm font-semibold">{t(`public.login.trust.${key}.title`)}</b>
              <span className="block text-[13px] text-ink-3">{t(`public.login.trust.${key}.text`)}</span>
            </span>
          </div>
        ))}
      </div>
    </Statement>
  );

  return (
    <TransferShell statement={statement}>
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
    </TransferShell>
  );
}
