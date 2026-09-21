"use client";

import { IconArrowUpRight } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { AmphoraMark } from "@/components/brand/amphora-mark";
import { useAppInfo } from "@/contexts/app-info-context";
import { DEFAULT_BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * "Powered by Amfora". The only place the product brand stays visible on a
 * customised installation. Removing it is what a brandpack unlocks (phase 2).
 */
export function BrandCredit({ className, withMark = false }: { className?: string; withMark?: boolean }) {
  const t = useTranslations();
  const { appHideCredit } = useAppInfo();

  // Only a verified brandpack lets the server say true here.
  if (appHideCredit) return null;

  return (
    <a
      className={cn("inline-flex items-center gap-2", className)}
      href={DEFAULT_BRAND.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {withMark && <AmphoraMark className="h-7 w-6 text-primary" />}
      <span>
        {t("footer.poweredBy")} <strong>{DEFAULT_BRAND.name}</strong>
      </span>
      {withMark && <IconArrowUpRight className="size-4" aria-hidden="true" />}
    </a>
  );
}
