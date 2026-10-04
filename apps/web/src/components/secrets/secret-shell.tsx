"use client";

import type { ReactNode } from "react";
import { IconClock, IconEye, IconLock } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { PublicCard } from "@/components/auth/public-card";
import { PublicShell } from "@/components/brand/public-shell";

const TRUST = [
  { key: "opens", icon: IconEye },
  { key: "sealed", icon: IconLock },
  { key: "expires", icon: IconClock },
] as const;

/** A public secret page in the theme the admin picked: one card, three short promises. */
export function SecretShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  const t = useTranslations("secrets.public");
  return (
    <PublicShell
      story={{
        headline: t("headline"),
        trust: TRUST.map(({ key, icon }) => ({
          icon,
          title: t(`trust.${key}.title`),
          text: t(`trust.${key}.text`),
        })),
      }}
      card={
        <PublicCard title={title} description={description}>
          {children}
        </PublicCard>
      }
    />
  );
}
