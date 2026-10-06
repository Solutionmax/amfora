"use client";

import { IconLoader2, IconShieldX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

export type ScanStatus = "pending" | "clean" | "infected" | "error" | "skipped";

/** What the server says about the virus scan of a file. Absent or null: nothing to show. */
export interface ScanInfo {
  scanStatus?: ScanStatus | null;
  scanDetail?: string | null;
}

/** Being checked or blocked: nobody can open the file, its owner may only delete it. */
export const isScanBlocked = (file: ScanInfo): boolean =>
  file.scanStatus === "pending" || file.scanStatus === "infected";

/** The status under the name of a file, only when there is something to say. Clean says nothing. */
export function ScanLine({ file, className }: { file: ScanInfo; className?: string }) {
  const t = useTranslations("scan");
  const base = cn("flex min-w-0 items-center gap-1.5 text-[12.5px]", className);

  if (file.scanStatus === "pending") {
    return (
      <p className={cn(base, "text-ink-3")} data-testid="scan-line" data-status="pending">
        <IconLoader2 className="size-3.5 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
        <span className="truncate">{t("pending")}</span>
      </p>
    );
  }
  if (file.scanStatus === "infected") {
    const text = file.scanDetail ? t("blockedBy", { name: file.scanDetail }) : t("blocked");
    return (
      <p className={cn(base, "font-medium text-bad")} data-testid="scan-line" data-status="infected">
        <IconShieldX className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate" title={text}>
          {text}
        </span>
      </p>
    );
  }
  if (file.scanStatus === "error" || file.scanStatus === "skipped") {
    return (
      <p className={cn(base, "text-ink-3")} data-testid="scan-line" data-status={file.scanStatus}>
        <span className="truncate" title={file.scanDetail ?? undefined}>
          {t("notChecked")}
        </span>
      </p>
    );
  }
  return null;
}
