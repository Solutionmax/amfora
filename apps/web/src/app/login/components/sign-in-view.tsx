import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { PublicCard } from "@/components/auth/public-card";
import type { PublicStory } from "@/components/brand/public-shell";
import { LOGIN_TRUST } from "../trust";

type Translate = ReturnType<typeof useTranslations>;

/** What the sign in page says on its stage; the same for the real page and the preview. */
export function signInStory(t: Translate, { firstAccess, text }: { firstAccess: boolean; text?: string }): PublicStory {
  return {
    headline: firstAccess
      ? `${t("public.login.firstTitle")} ${t("public.login.firstAccent")}`
      : `${t("public.login.title")} ${t("public.login.accent")}`,
    text,
    trust: LOGIN_TRUST.map(({ key, icon }) => ({
      icon,
      title: t(`public.login.trust.${key}.title`),
      text: t(`public.login.trust.${key}.text`),
    })),
  };
}

/** The card of the sign in page: title, one line, then whatever signs you in. */
export function SignInCard({ appName, children }: { appName: string; children: ReactNode }) {
  const t = useTranslations();

  return (
    <PublicCard title={t("login.signIn")} description={t("public.login.sub", { app: appName })}>
      {children}
    </PublicCard>
  );
}
