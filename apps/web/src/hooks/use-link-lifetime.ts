"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useSecureConfigs } from "@/hooks/use-secure-configs";
import { defaultExpiryValue, expiryProblem, lifetimeSettings } from "@/lib/link-lifetime";

/** The default and maximum lifetime of a share or receive link, as the administrator set them. */
export function useLinkLifetime() {
  const t = useTranslations();
  const { configs, isLoading } = useSecureConfigs();
  const { defaultDays, maxDays } = useMemo(() => lifetimeSettings(configs), [configs]);

  /** True when the end date may be saved; otherwise says why not. `unchanged` is the date the link has now. */
  const acceptsExpiry = useCallback(
    (value: string, unchanged?: string) => {
      const problem = expiryProblem({ value, maxDays, now: new Date(), unchanged });
      if (problem) toast.error(t(`shares.lifetime.${problem}`, { days: maxDays }));

      return !problem;
    },
    [maxDays, t]
  );

  return { defaultDays, maxDays, isReady: !isLoading, acceptsExpiry };
}

/** Fills in the default end date once each time a dialog for a new link opens. */
export function useStartingExpiry(isOpen: boolean, apply: (value: string) => void) {
  const lifetime = useLinkLifetime();
  const { defaultDays, isReady } = lifetime;
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const done = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      done.current = false;
      return;
    }
    if (!isReady || done.current) return;

    done.current = true;
    applyRef.current(defaultExpiryValue(defaultDays, new Date()));
  }, [isOpen, isReady, defaultDays]);

  return lifetime;
}
