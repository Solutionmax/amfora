"use client";

import { useCallback, useEffect, useState } from "react";
import { IconCircleCheck, IconDownload, IconInfoCircle, IconRefresh } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { applyUpdate, getUpdateStatus, type UpdateStatus } from "@/http/endpoints/update";

export function UpdateCard() {
  const t = useTranslations();
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      setIsBusy(true);
      setError(null);
      try {
        const response = await getUpdateStatus(refresh);
        setStatus(response.data);
      } catch {
        setError(t("updates.statusFailed"));
      } finally {
        setIsBusy(false);
      }
    },
    [t]
  );

  useEffect(() => {
    load();
  }, [load]);

  const onApply = async () => {
    setIsBusy(true);
    setError(null);
    try {
      await applyUpdate();
      await load();
    } catch {
      setError(t("updates.applyFailed"));
    } finally {
      setIsBusy(false);
    }
  };

  if (!status) return null;

  const body = () => {
    if (!status.checkEnabled) return t("updates.checkDisabled");
    if (status.applying) return t("updates.applying");
    if (status.checkError) return status.checkError;
    if (status.updateAvailable) {
      return status.notes
        ? `${t("updates.available", { version: status.latestVersion ?? "" })} ${status.notes}`
        : t("updates.available", { version: status.latestVersion ?? "" });
    }
    return t("updates.upToDate");
  };

  const Icon = status.updateAvailable ? IconDownload : status.checkError ? IconInfoCircle : IconCircleCheck;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Icon className="size-5 text-primary" />
          {t("updates.title")}
        </CardTitle>
        <CardDescription>
          {t("updates.running", { version: status.currentVersion ?? "?" })} · {body()}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        {status.checkEnabled && (
          <Button variant="outline" size="sm" className="cursor-pointer" disabled={isBusy} onClick={() => load(true)}>
            <IconRefresh className="size-4" />
            {t("updates.checkNow")}
          </Button>
        )}

        {status.updateAvailable && status.canApply && !status.applying && (
          <Button size="sm" className="cursor-pointer" disabled={isBusy} onClick={onApply}>
            <IconDownload className="size-4" />
            {t("updates.applyNow")}
          </Button>
        )}

        {/* Without the host side there is nothing to press: the container cannot restart itself. */}
        {status.updateAvailable && !status.canApply && (
          <span className="text-xs text-muted-foreground">{t("updates.hostSideMissing")}</span>
        )}

        {error && <span className="text-xs text-destructive">{error}</span>}
      </CardContent>
    </Card>
  );
}
