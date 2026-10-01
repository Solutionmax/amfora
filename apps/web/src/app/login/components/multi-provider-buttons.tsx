"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppInfo } from "@/contexts/app-info-context";
import { getEnabledProviders } from "@/http/endpoints";
import type { EnabledAuthProvider } from "@/http/endpoints/auth/types";

// The icon picker bundles every react-icons pack (~11 MB gz); load it only when a provider button renders.
const ProviderIcon = dynamic(
  () =>
    import("@/components/ui/icon-picker").then(({ renderIconByName }) => ({
      default: ({ name }: { name: string }) => <>{renderIconByName(name)}</>,
    })),
  { ssr: false }
);

interface MultiProviderButtonsProps {
  /** A hairline with "or with email" under the buttons, when a password form follows. */
  showSeparator?: boolean;
}

export function MultiProviderButtons({ showSeparator = true }: MultiProviderButtonsProps) {
  const [providers, setProviders] = useState<EnabledAuthProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const { firstAccess } = useAppInfo();
  const t = useTranslations();

  const loadProviders = async () => {
    try {
      setLoading(true);
      const response = await getEnabledProviders();
      const data = response.data;

      if (data.success) {
        setProviders(data.data || []);
      } else {
        console.error("Failed to load providers");
      }
    } catch (error) {
      console.error("Error loading providers:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (firstAccess) {
      setLoading(false);
      return;
    }

    loadProviders();
  }, [firstAccess]);

  const handleProviderLogin = (provider: EnabledAuthProvider) => {
    if (!provider.authUrl) {
      toast.error(t("auth.calm.providerNotConfigured", { provider: provider.displayName }));
      return;
    }

    window.location.href = provider.authUrl;
  };

  if (firstAccess) {
    return null;
  }

  if (loading) {
    return <Skeleton className="h-10 w-full" aria-hidden="true" />;
  }

  if (providers.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        {providers.map((provider) => (
          <Button
            key={provider.id}
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => handleProviderLogin(provider)}
            type="button"
          >
            {provider.icon && (
              <span className="text-base text-ink-icon" aria-hidden="true">
                <ProviderIcon name={provider.icon} />
              </span>
            )}
            {t("auth.calm.continueWith", { provider: provider.displayName })}
          </Button>
        ))}
      </div>

      {showSeparator && (
        <div className="flex items-center gap-3 text-[12.5px] text-ink-3">
          <span className="h-px flex-1 bg-line" />
          {t("public.login.or")}
          <span className="h-px flex-1 bg-line" />
        </div>
      )}
    </div>
  );
}
