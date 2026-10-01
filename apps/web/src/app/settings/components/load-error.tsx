import { IconAlertCircle, IconRefresh } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

/** One calm line when a fetch failed: what happened, and a way to try again. */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useTranslations();

  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 border-y border-line py-4">
      <IconAlertCircle className="size-[17px] shrink-0 text-bad" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-ink-2">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        <IconRefresh aria-hidden="true" />
        {t("storageUsage.retry")}
      </Button>
    </div>
  );
}
