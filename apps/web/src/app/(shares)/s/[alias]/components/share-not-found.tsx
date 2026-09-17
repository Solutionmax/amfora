import Link from "next/link";
import { IconLock } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function ShareNotFound() {
  const t = useTranslations();

  return (
    <div className="flex w-full items-center justify-center py-6">
      <div className="w-full text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
          <IconLock className="size-7 text-destructive" />
        </div>
        <h2 className="mt-6 font-display text-3xl font-extrabold tracking-tight">{t("share.notFound.title")}</h2>
        <p className="mx-auto mt-3 max-w-sm text-muted-foreground">{t("share.notFound.description")}</p>
        <Button asChild variant="outline" className="mt-7 rounded-lg">
          <Link href="/">{t("home.pageTitle")}</Link>
        </Button>
      </div>
    </div>
  );
}
