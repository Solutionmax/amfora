"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconDownload, IconRefresh } from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { LineList, LineRow } from "@/components/ui/line-list";
import { Skeleton } from "@/components/ui/skeleton";
import { applyUpdate, getUpdateStatus, type UpdateStatus } from "@/http/endpoints/update";
import { cn } from "@/lib/utils";
import { UpdateProgressDialog } from "./update-progress-dialog";

/** One line above the settings tabs: which version runs, whether a newer one exists, and the buttons. */
export function UpdateCard() {
  const t = useTranslations();
  const format = useFormatter();
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressTarget, setProgressTarget] = useState<string | null>(null);
  // Opening on its own happens once per page load, not again after the dialog is closed.
  const reopenedRef = useRef(false);

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

  // An update that was already running when the page loaded gets the same dialog.
  useEffect(() => {
    if (!status?.applying || reopenedRef.current) return;
    reopenedRef.current = true;
    setProgressTarget(status.latestVersion);
    setProgressOpen(true);
  }, [status]);

  const onApply = async () => {
    setIsBusy(true);
    setError(null);
    try {
      await applyUpdate();
      reopenedRef.current = true;
      setProgressTarget(status?.latestVersion ?? null);
      setProgressOpen(true);
    } catch {
      setError(t("updates.applyFailed"));
    } finally {
      setIsBusy(false);
    }
  };

  const onProgressClosed = () => {
    setProgressOpen(false);
    load();
  };

  if (!status && !error) {
    return (
      <LineList top className="mb-7">
        <div className="flex min-h-[60px] items-center gap-3.5 py-3">
          <Skeleton className="size-[17px] rounded-full" />
          <div className="grid flex-1 gap-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </LineList>
    );
  }

  const checked = status?.checkedAt
    ? t("updates.calm.checked", { when: format.relativeTime(new Date(status.checkedAt)) })
    : null;

  const statusText = (): string => {
    if (!status) return "";
    if (!status.checkEnabled) return t("updates.checkDisabled");
    if (status.applying) return t("updates.applying");
    if (status.checkError) return status.checkError;
    if (status.updateAvailable) return t("updates.available", { version: status.latestVersion ?? "" });

    return [t("updates.calm.upToDate"), checked].filter(Boolean).join(" · ");
  };

  const canInstall = !!status?.updateAvailable && status.canApply && !status.applying;

  return (
    <LineList top className="mb-7">
      <LineRow
        icon={status?.updateAvailable ? <IconDownload /> : <IconRefresh />}
        title={status ? t("updates.calm.version", { version: status.currentVersion ?? "?" }) : t("updates.title")}
        sub={
          <>
            <span className={cn(error && "text-bad", status?.checkError && !error && "text-warn")}>
              {error ?? statusText()}
            </span>
            {status?.updateAvailable && !status.canApply && (
              <span className="block">{t("updates.hostSideMissing")}</span>
            )}
          </>
        }
      >
        {canInstall && (
          <Button size="sm" disabled={isBusy} onClick={onApply}>
            {t("updates.calm.install")}
          </Button>
        )}
        {(status?.checkEnabled || error) && (
          <Button variant="outline" size="sm" disabled={isBusy} onClick={() => load(!error)}>
            {error ? t("storageUsage.retry") : t("updates.checkNow")}
          </Button>
        )}
      </LineRow>

      <UpdateProgressDialog open={progressOpen} targetVersion={progressTarget} onClose={onProgressClosed} />
    </LineList>
  );
}
