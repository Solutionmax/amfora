import Link from "next/link";
import { IconLock } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function ShareNotFound() {
  const t = useTranslations();

  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="tile tile-d">
        <IconLock className="size-5" />
      </span>
      <h2 className="mt-5 font-display text-2xl font-semibold tracking-[-0.02em]">{t("share.notFound.title")}</h2>
      <p className="mt-2 max-w-sm text-sm text-ink-3">{t("share.notFound.description")}</p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/">{t("public.state.backHome")}</Link>
      </Button>
    </div>
  );
}
