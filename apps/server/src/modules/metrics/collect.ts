import { prisma } from "../../shared/prisma";
import { isStorageUp } from "../health/storage-check";
import { isScanEnabled } from "../scan/settings";
import { SCAN_STATUSES } from "../scan/status";
import { StorageService } from "../storage/service";
import { readCurrentVersion } from "../update/current-version";
import { formatMetrics, type Metric } from "./format";

/** A scraper may ask every few seconds; the database is asked at most this often. */
const CACHE_MS = 30_000;

const gauge = (name: string, help: string, value: number | bigint): Metric => ({ name, help, samples: [{ value }] });
const byState = (name: string, help: string, label: string, values: Record<string, number>): Metric => ({
  name,
  help,
  samples: Object.entries(values).map(([state, value]) => ({ labels: { [label]: state }, value })),
});

const totals = (result: { _count: number; _sum: { size: bigint | null } }) => ({
  count: result._count,
  bytes: result._sum.size ?? BigInt(0),
});

/** Counts and sums only. Throws when the database does not answer. */
async function databaseFigures(now: Date): Promise<Metric[]> {
  const [users, active, admins, files, trash, received] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isAdmin: true, isActive: true } }),
    prisma.file.aggregate({ where: { deletedAt: null }, _count: true, _sum: { size: true } }).then(totals),
    prisma.file.aggregate({ where: { deletedAt: { not: null } }, _count: true, _sum: { size: true } }).then(totals),
    prisma.reverseShareFile.aggregate({ _count: true, _sum: { size: true } }).then(totals),
  ]);
  const [shares, expired, links, activeLinks, secrets, activeSecrets] = await Promise.all([
    prisma.share.count(),
    prisma.share.count({ where: { expiration: { lte: now } } }),
    prisma.reverseShare.count(),
    prisma.reverseShare.count({
      where: { isActive: true, OR: [{ expiration: null }, { expiration: { gt: now } }] },
    }),
    prisma.secret.count(),
    prisma.secret.count({ where: { ciphertext: { not: null }, expiresAt: { gt: now } } }),
  ]);
  return [
    byState("amfora_users", "Accounts by kind.", "kind", { total: users, active, admin: admins }),
    gauge("amfora_files", "Files in the workspace, trash excluded.", files.count),
    gauge("amfora_files_bytes", "Bytes of the files in the workspace.", files.bytes),
    gauge("amfora_receive_files", "Files received through receive links.", received.count),
    gauge("amfora_receive_files_bytes", "Bytes of the received files.", received.bytes),
    gauge("amfora_trash_files", "Files in the trash.", trash.count),
    gauge("amfora_trash_files_bytes", "Bytes of the files in the trash.", trash.bytes),
    byState("amfora_shares", "Shares by state.", "state", { total: shares, active: shares - expired, expired }),
    byState("amfora_receive_links", "Receive links by state.", "state", { total: links, active: activeLinks }),
    byState("amfora_secrets", "Secrets by state.", "state", { total: secrets, active: activeSecrets }),
  ];
}

/** Files per scan status, workspace and received together. Only asked for when the scan is on. */
async function scanFigures(): Promise<Metric[]> {
  const [files, received] = await Promise.all([
    prisma.file.groupBy({ by: ["scanStatus"], _count: true, where: { scanStatus: { not: null } } }),
    prisma.reverseShareFile.groupBy({ by: ["scanStatus"], _count: true, where: { scanStatus: { not: null } } }),
  ]);
  const counts = Object.fromEntries(SCAN_STATUSES.map((status) => [status, 0]));
  for (const row of [...files, ...received]) counts[row.scanStatus as string] += row._count;
  return [byState("amfora_scan_files", "Files per virus scan status.", "status", counts)];
}

async function diskFigures(): Promise<Metric[]> {
  const disk = await new StorageService().getDiskBytes();
  if (!disk) return [];
  return [
    gauge("amfora_disk_total_bytes", "Size of the data disk.", disk.total),
    gauge("amfora_disk_used_bytes", "Used bytes on the data disk.", Math.max(disk.total - disk.available, 0)),
    gauge("amfora_disk_free_bytes", "Free bytes on the data disk.", disk.available),
  ];
}

export async function collectMetrics(now = new Date()): Promise<string> {
  const metrics: Metric[] = [
    {
      name: "amfora_info",
      help: "The running version.",
      samples: [{ labels: { version: readCurrentVersion() ?? "unknown" }, value: 1 }],
    },
  ];
  try {
    metrics.push(gauge("amfora_database_up", "1 when the database answers.", 1), ...(await databaseFigures(now)));
  } catch (error) {
    console.error("Metrics: the database did not answer:", error);
    metrics.push(gauge("amfora_database_up", "1 when the database answers.", 0));
  }
  metrics.push(gauge("amfora_storage_up", "1 when the object storage answers.", (await isStorageUp()) ? 1 : 0));
  metrics.push(...(await diskFigures()));
  const scanOn = isScanEnabled();
  metrics.push(gauge("amfora_scan_enabled", "1 when the virus scan is on.", scanOn ? 1 : 0));
  if (scanOn) metrics.push(...(await scanFigures().catch(() => [])));
  return formatMetrics(metrics);
}

let cached: { at: number; body: Promise<string> } | null = null;

/** The answer, at most CACHE_MS old. Concurrent callers share one run. */
export function cachedMetrics(nowMs = Date.now()): Promise<string> {
  if (cached && nowMs - cached.at < CACHE_MS) return cached.body;
  const body = collectMetrics(new Date(nowMs));
  cached = { at: nowMs, body };
  body.catch(() => {
    if (cached?.body === body) cached = null;
  });
  return body;
}

export function resetMetricsCache() {
  cached = null;
}
