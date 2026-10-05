"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconChevronRight, IconDownload, IconExternalLink, IconRefresh } from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { LineList, LineRow } from "@/components/ui/line-list";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpdateStatus } from "@/hooks/use-update-status";
import { applyUpdate } from "@/http/endpoints/update";
import { cn } from "@/lib/utils";
import { bundledNotesFor, noteLines, releaseNotesUrl } from "../release-notes";
import { UpdateProgressDialog } from "./update-progress-dialog";

/** What a release changed, one line per change, and the way to the full notes on the website. */
function ReleaseNotes({ lines, version }: { lines: readonly string[]; version: string | null }) {
  const t = useTranslations();

  return (
    <>
      <ul className="grid list-disc gap-1.5 pl-[18px] text-[13px] leading-relaxed text-ink-2 marker:text-ink-icon">
        {lines.map((line, index) => (
          <li key={`${index}:${line}`}>{line}</li>
        ))}
      </ul>
      <a
        href={releaseNotesUrl(version)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline"
      >
        {t("updates.calm.fullNotes")}
        <IconExternalLink className="size-3.5" aria-hidden="true" />
      </a>
    </>
  );
}

/**
 * Above the settings tabs: which version runs, whether a newer one exists, the buttons, and
 * the release notes of both.
 */
export function UpdateCard() {
  const t = useTranslations();
  const format = useFormatter();
  const status = useUpdateStatus((store) => store.status);
  const loadStatus = useUpdateStatus((store) => store.load);
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
        await loadStatus(refresh);
      } catch {
        setError(t("updates.statusFailed"));
      } finally {
        setIsBusy(false);
      }
    },
    [loadStatus, t]
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

  // A waiting update tells what it brings in its signed manifest; the running version in the notes it shipped with.
  const waitingNotes = status?.updateAvailable ? noteLines(status.notes) : [];
  const runningNotes = bundledNotesFor(status?.currentVersion);
  const releasedAt = status?.releasedAt ? new Date(status.releasedAt) : null;
  const released =
    releasedAt && !Number.isNaN(releasedAt.getTime())
      ? t("updates.calm.released", { date: format.dateTime(releasedAt, { dateStyle: "long" }) })
      : null;

  return (
    <LineList top className="mb-7">
      <div>
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
        {waitingNotes.length > 0 && (
          <section
            data-testid="update-waiting-notes"
            aria-label={t("updates.calm.notesWaiting", { version: status?.latestVersion ?? "" })}
            className="mb-4 ml-[31px] rounded-[10px] bg-primary-soft px-4 py-3.5"
          >
            <h3 className="mb-2 flex flex-wrap items-baseline gap-x-2 font-sans text-[13px] font-semibold tracking-normal text-ink">
              {t("updates.calm.notesWaiting", { version: status?.latestVersion ?? "" })}
              {released && <span className="text-[12.5px] font-normal text-ink-3">{released}</span>}
            </h3>
            <ReleaseNotes lines={waitingNotes} version={status?.latestVersion ?? null} />
          </section>
        )}
      </div>

      {runningNotes && (
        <details data-testid="update-running-notes" className="group py-3">
          <summary className="flex cursor-pointer list-none items-center gap-3.5 rounded-[6px] text-[13px] font-medium text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
            <IconChevronRight
              className="size-[17px] shrink-0 text-ink-icon transition-transform duration-150 group-open:rotate-90"
              aria-hidden="true"
            />
            {t("updates.calm.notesRunning", { version: status?.currentVersion ?? "" })}
          </summary>
          <div className="pb-1 pl-[31px] pt-3">
            <ReleaseNotes lines={runningNotes} version={status?.currentVersion ?? null} />
          </div>
        </details>
      )}

      <UpdateProgressDialog open={progressOpen} targetVersion={progressTarget} onClose={onProgressClosed} />
    </LineList>
  );
}
