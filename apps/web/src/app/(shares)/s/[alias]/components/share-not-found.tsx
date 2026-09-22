import Link from "next/link";
import { IconClockOff, IconEyeOff, IconLock } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function ShareNotFound({ reason = "missing" }: { reason?: "missing" | "expired" | "maxViews" }) {
  const t = useTranslations();
  const Icon = reason === "expired" ? IconClockOff : reason === "maxViews" ? IconEyeOff : IconLock;

  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="tile tile-d">
        <Icon className="size-5" />
      </span>
      <h2 className="mt-5 font-display text-2xl font-semibold tracking-[-0.02em]">
        {t(`public.state.${reason}.title`)}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-ink-3">{t(`public.state.${reason}.text`)}</p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/">{t("public.state.backHome")}</Link>
      </Button>
    </div>
  );
}
