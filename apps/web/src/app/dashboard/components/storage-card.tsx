import { useTranslations } from "next-intl";

import type { StorageUsage } from "@/http/endpoints/activity";
import { storageLevel, storageParts, type StorageLevel } from "@/lib/storage-usage";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/utils/format-file-size";

const OWN_COLOR = "bg-primary";
const SHARED_COLOR = "bg-[color-mix(in_oklab,var(--primary)_55%,var(--surface))]";
const RECEIVED_COLOR = "bg-ok";

const LEVEL_TEXT: Record<StorageLevel, string> = { normal: "text-ink-3", almostFull: "text-warn", full: "text-bad" };

function Figure({ color, label, value, note }: { color: string; label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0 pt-3.5 sm:pr-4 sm:[&+div]:border-l sm:[&+div]:border-line sm:[&+div]:pl-4">
      <dt className="flex items-center gap-[7px] text-[12.5px] text-ink-3">
        <i aria-hidden="true" className={cn("size-2 shrink-0 rounded-[3px]", color)} />
        {label}
      </dt>
      <dd className="mt-[3px] font-display text-lg font-bold tabular-nums">{value}</dd>
      {note && <dd className="text-[12.5px] text-ink-3">{note}</dd>}
    </div>
  );
}

/** A user's own storage against their own limit: one number, one bar in two parts, three figures. */
export function StorageCard({ usage }: { usage: StorageUsage }) {
  const t = useTranslations("dashboard.calm.storage");
  const parts = storageParts(usage);
  const hasLimit = usage.limitBytes !== null && parts.usedPercent !== null;
  const percent = Math.round(parts.usedPercent ?? 0);

  return (
    <section
      aria-label={t("title")}
      data-testid="storage-card"
      className="grid gap-[18px] rounded-2xl border border-line p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <p className="font-display text-[34px] font-bold leading-none tracking-[-0.03em] tabular-nums sm:text-[40px]">
          {formatFileSize(usage.usedBytes)}
          <small className="ml-2 font-sans text-[15px] font-medium tracking-normal text-ink-3">
            {hasLimit ? t("ofLimit", { limit: formatFileSize(usage.limitBytes ?? 0) }) : t("noLimit")}
          </small>
        </p>
        {hasLimit && (
          <span className={cn("text-[13px]", LEVEL_TEXT[storageLevel(usage.usedBytes, usage.limitBytes)])}>
            {t("freeAndUsed", { free: formatFileSize(parts.freeBytes ?? 0), percent })}
          </span>
        )}
      </div>

      {hasLimit && (
        <div
          role="img"
          aria-label={t("barLabel", { percent })}
          className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-line"
        >
          <i className={cn("block h-full rounded-[2px]", OWN_COLOR)} style={{ width: `${parts.ownPercent}%` }} />
          <i className={cn("block h-full rounded-[2px]", SHARED_COLOR)} style={{ width: `${parts.sharedPercent}%` }} />
        </div>
      )}

      <dl className="grid border-t border-line sm:grid-cols-3">
        <Figure color={OWN_COLOR} label={t("myFiles")} value={formatFileSize(parts.ownBytes)} />
        <Figure color={SHARED_COLOR} label={t("inShares")} value={formatFileSize(parts.sharedBytes)} />
        <Figure
          color={RECEIVED_COLOR}
          label={t("received")}
          value={formatFileSize(usage.receivedBytes)}
          note={t("receivedNote")}
        />
      </dl>
    </section>
  );
}
