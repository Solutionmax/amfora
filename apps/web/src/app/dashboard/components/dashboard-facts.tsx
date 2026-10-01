import { useTranslations } from "next-intl";

import { Fact, Facts } from "@/components/ui/facts";
import type { DiskSpace } from "../types";
import { formatStorageSize } from "../utils/format-storage-size";

/** Storage, files, downloads, received: plain numbers between hairlines. */
export function DashboardFacts({
  diskSpace,
  files,
  folders,
  downloads,
  received,
  receiveLinks,
}: {
  diskSpace: DiskSpace | null;
  files: number;
  folders: number;
  downloads: number;
  /** Null when the receive links could not be loaded. */
  received: number | null;
  receiveLinks: number;
}) {
  const t = useTranslations();
  const usedPercent =
    diskSpace && diskSpace.diskSizeGB > 0 ? Math.min(100, (diskSpace.diskUsedGB / diskSpace.diskSizeGB) * 100) : 0;

  return (
    <Facts>
      <Fact
        label={t("dashboard.stats.storage")}
        value={diskSpace ? formatStorageSize(diskSpace.diskUsedGB) : "—"}
        hint={
          diskSpace ? t("dashboard.stats.storageOf", { total: formatStorageSize(diskSpace.diskSizeGB) }) : undefined
        }
      >
        {diskSpace && (
          <div
            className="mt-2 h-[3px] max-w-[160px] overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-label={t("dashboard.stats.storage")}
            aria-valuenow={Math.round(usedPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${usedPercent}%` }} />
          </div>
        )}
      </Fact>
      <Fact label={t("dashboard.stats.files")} value={files} hint={t("dashboard.calm.inFolders", { count: folders })} />
      <Fact label={t("dashboard.stats.downloads")} value={downloads} hint={t("dashboard.stats.downloadsDetail")} />
      <Fact
        label={t("dashboard.calm.received")}
        value={received ?? "—"}
        hint={received === null ? undefined : t("dashboard.calm.viaLinks", { count: receiveLinks })}
      />
    </Facts>
  );
}
