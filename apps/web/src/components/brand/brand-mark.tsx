"use client";

import { AmphoraMark } from "@/components/brand/amphora-mark";
import { useAppInfo } from "@/contexts/app-info-context";
import { cn } from "@/lib/utils";

/** The installation's mark: the uploaded logo when there is one, the amphora otherwise. */
export function BrandMark({ className }: { className?: string }) {
  const { appLogo } = useAppInfo();

  if (appLogo) {
    return <img alt="" className={cn("shrink-0 object-contain", className)} src={appLogo} />;
  }

  return <AmphoraMark className={className} />;
}
