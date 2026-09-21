import { useTranslations } from "next-intl";

import { formatStorageSize } from "../utils/format-storage-size";

interface Stat {
  label: string;
  value: string;
  detail?: string;
  tone?: "up";
}

/** Four figures in one ruled strip. No cards, no charts. */
export function StatsStrip({
  diskSpace,
  shares,
  downloads,
  files,
}: {
  diskSpace: { diskSizeGB: number; diskUsedGB: number } | null;
  shares: number;
  downloads: number;
  files: number;
}) {
  const t = useTranslations();

  const stats: Stat[] = [
    {
      label: t("dashboard.stats.storage"),
      value: diskSpace ? formatStorageSize(diskSpace.diskUsedGB) : "—",
      detail: diskSpace
        ? t("dashboard.stats.storageOf", { total: formatStorageSize(diskSpace.diskSizeGB) })
        : undefined,
    },
    { label: t("dashboard.stats.shares"), value: String(shares) },
    { label: t("dashboard.stats.downloads"), value: String(downloads), detail: t("dashboard.stats.downloadsDetail") },
    { label: t("dashboard.stats.files"), value: String(files) },
  ];

  return (
    <div className="card-soft grid grid-cols-2 overflow-hidden rounded-[calc(var(--radius)+4px)] border border-line bg-surface md:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="border-b border-r border-line p-5 last:border-r-0 md:border-b-0 [&:nth-child(2)]:border-r-0 md:[&:nth-child(2)]:border-r"
        >
          <div className="text-xs font-medium text-ink-3">{stat.label}</div>
          <div className="mt-1.5 font-display text-[26px] font-semibold leading-tight tracking-[-0.02em]">
            {stat.value}
          </div>
          {stat.detail && <div className="mt-1 text-xs text-ink-3">{stat.detail}</div>}
        </div>
      ))}
    </div>
  );
}
