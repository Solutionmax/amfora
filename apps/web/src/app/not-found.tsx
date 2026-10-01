"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { AppState } from "@/components/layout/loading-screen";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations();

  return (
    <AppState
      code="404"
      title={t("common.calm.notFoundTitle")}
      text={t("common.calm.notFoundText")}
      actions={
        <Button asChild>
          <Link href="/">{t("public.state.backHome")}</Link>
        </Button>
      }
    />
  );
}
