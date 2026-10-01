"use client";

import { IconAlertCircle, IconRefresh } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** One quiet line that says what failed, with a Retry button. */
export function InlineError({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  const t = useTranslations();

  return (
    <div role="alert" className={cn("flex flex-wrap items-center gap-3 border-y border-line py-3.5", className)}>
      <IconAlertCircle size={17} stroke={1.8} aria-hidden className="shrink-0 text-bad" />
      <span className="min-w-0 flex-1 text-[13px] text-ink-2">{message}</span>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <IconRefresh />
          {t("files.calm.retry")}
        </Button>
      )}
    </div>
  );
}
