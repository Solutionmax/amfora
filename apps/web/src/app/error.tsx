"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { AppState } from "@/components/layout/loading-screen";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations();

  useEffect(() => {
    console.error("Page crashed:", error);
  }, [error]);

  return (
    <AppState
      title={t("common.calm.errorTitle")}
      text={t("common.calm.errorText")}
      actions={
        <>
          <Button onClick={reset}>{t("common.calm.retry")}</Button>
          <Button asChild variant="ghost">
            <Link href="/">{t("public.state.backHome")}</Link>
          </Button>
        </>
      }
    />
  );
}
