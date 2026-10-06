import { prisma } from "../../shared/prisma";
import { FileService } from "../file/service";
import { scanWithClamd, type ScanVerdict } from "./clamd";
import { announceInfected, type InfectedFile } from "./infected";
import { scanSettings, type ScanSettings } from "./settings";
import { scanDetailOf, skippedBecauseLarge, type ScanStatus } from "./status";

type Source = AsyncIterable<Buffer | Uint8Array | string>;

export interface ScanQueueDeps {
  openObject: (objectName: string) => Promise<Source>;
  scan: (source: Source, settings: ScanSettings) => Promise<ScanVerdict>;
  announce: (file: InfectedFile) => Promise<void>;
}

interface Pending {
  table: "file" | "received";
  id: string;
  name: string;
  size: bigint;
  objectName: string;
  ownerId: string | null;
}

const defaultDeps: ScanQueueDeps = {
  openObject: (objectName) => new FileService().getObjectStream(objectName) as Promise<Source>,
  scan: (source, settings) => scanWithClamd(source, { host: settings.host, port: settings.port }),
  announce: announceInfected,
};

async function nextPending(): Promise<Pending | null> {
  const file = await prisma.file.findFirst({ where: { scanStatus: "pending" }, orderBy: { createdAt: "asc" } });
  if (file) return { table: "file", ...file, ownerId: file.userId };
  const received = await prisma.reverseShareFile.findFirst({
    where: { scanStatus: "pending" },
    orderBy: { createdAt: "asc" },
    include: { reverseShare: { select: { creatorId: true } } },
  });
  return received ? { table: "received", ...received, ownerId: received.reverseShare.creatorId } : null;
}

/** Writes the outcome, but only while the row still waits: a file deleted or changed meanwhile is left alone. */
async function settle(item: Pending, status: ScanStatus, detail: string | null): Promise<boolean> {
  const data = { scanStatus: status, scanDetail: detail, scannedAt: new Date() };
  const where = { id: item.id, scanStatus: "pending" };
  const result =
    item.table === "file"
      ? await prisma.file.updateMany({ where, data })
      : await prisma.reverseShareFile.updateMany({ where, data });
  return result.count === 1;
}

async function scanOne(item: Pending, settings: ScanSettings, deps: ScanQueueDeps) {
  if (item.size > settings.maxBytes) {
    await settle(item, "skipped", skippedBecauseLarge(settings.maxMegabytes));
    return;
  }
  let verdict: ScanVerdict;
  try {
    verdict = await deps.scan(await deps.openObject(item.objectName), settings);
  } catch (error) {
    console.error(`Virus scan of ${item.table} ${item.id} failed:`, error);
    await settle(item, "error", scanDetailOf(error));
    return;
  }
  if (!verdict.infected) {
    await settle(item, "clean", null);
    return;
  }
  if (!(await settle(item, "infected", verdict.name)) || !item.ownerId) return;
  await deps.announce({
    id: item.id,
    name: item.name,
    finding: verdict.name,
    ownerId: item.ownerId,
    where: item.table === "file" ? "your files" : "a receive link",
  });
}

/**
 * One scan at a time, in this process. kick() starts the loop when it is not running and says when
 * the queue is empty. It does nothing at all while CLAMAV_HOST is not set, and it never throws.
 */
export function createScanQueue(deps: ScanQueueDeps = defaultDeps) {
  let running: Promise<void> | null = null;
  let again = false;

  async function drain() {
    do {
      again = false;
      for (let settings = scanSettings(); settings; settings = scanSettings()) {
        const item = await nextPending();
        if (!item) break;
        await scanOne(item, settings, deps);
      }
    } while (again);
  }

  function kick(): Promise<void> {
    if (!scanSettings()) return Promise.resolve();
    if (running) {
      again = true;
      return running;
    }
    running = drain()
      .catch((error) => console.error("Virus scan queue stopped:", error))
      .finally(() => {
        running = null;
      });
    return running;
  }

  return { kick };
}

const queue = createScanQueue();

/** Call after a file is registered with status pending, and once at server start. */
export function kickScanQueue(): void {
  void queue.kick();
}
