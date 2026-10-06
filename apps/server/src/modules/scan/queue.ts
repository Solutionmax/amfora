import { prisma } from "../../shared/prisma";
import { FileService } from "../file/service";
import { canReachClamd, isScannerUnreachable, scanWithClamd, type ScanVerdict } from "./clamd";
import { announceInfected, recordInfectedLine, type InfectedFile } from "./infected";
import { setScannerUp } from "./scanner-state";
import { scanSettings, type ScanSettings } from "./settings";
import { DETAIL_REFUSED, DETAIL_UNAVAILABLE, DETAIL_UNREADABLE, skippedBecauseLarge, type ScanStatus } from "./status";

type Source = AsyncIterable<Buffer | Uint8Array | string>;

export interface ScanQueueDeps {
  openObject: (objectName: string) => Promise<Source>;
  scan: (source: Source, settings: ScanSettings) => Promise<ScanVerdict>;
  /** The mail about everything one run of the queue found, once, when it is done (or at shutdown). */
  announce: (files: InfectedFile[]) => Promise<void>;
  /** The line in the activity log, written right after a file is settled infected. */
  recordLine: (file: InfectedFile) => Promise<void>;
  /** The ETag of an object, kept with a scanned file of the workspace; null when storage gives none. */
  etagOf: (objectName: string) => Promise<string | null>;
  /** Waits before the next tries when the scanner cannot be reached. After the last one the file is error. */
  retryDelaysMs?: number[];
  now?: () => number;
}

export const RETRY_DELAYS_MS = [30_000, 2 * 60_000, 10 * 60_000];
const AFTER_FAILURE_MS = 60_000;
const TIMER_MS = 60_000;
const REQUEUE_LIMIT = 500;

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
  recordLine: recordInfectedLine,
  etagOf: (objectName) => new FileService().getObjectEtag(objectName),
};

type Waiting = Map<string, { tries: number; notBefore: number }>;
const keyOf = (item: Pick<Pending, "table" | "id">) => `${item.table}:${item.id}`;

/** The oldest pending row that is not waiting for its next try. */
async function nextPending(waiting: Waiting, now: number): Promise<Pending | null> {
  const skip = (table: Pending["table"]) =>
    [...waiting]
      .filter(([key, wait]) => key.startsWith(`${table}:`) && wait.notBefore > now)
      .map(([key]) => key.slice(table.length + 1));
  const file = await prisma.file.findFirst({
    where: { scanStatus: "pending", id: { notIn: skip("file") } },
    orderBy: { createdAt: "asc" },
  });
  if (file) return { table: "file", ...file, ownerId: file.userId };
  const received = await prisma.reverseShareFile.findFirst({
    where: { scanStatus: "pending", id: { notIn: skip("received") } },
    orderBy: { createdAt: "asc" },
    include: { reverseShare: { select: { creatorId: true } } },
  });
  return received ? { table: "received", ...received, ownerId: received.reverseShare.creatorId } : null;
}

/** Writes the outcome, but only while the row still waits: a file deleted or changed meanwhile is left alone. */
async function settle(
  item: Pending,
  status: ScanStatus,
  detail: string | null,
  etag: string | null = null
): Promise<boolean> {
  const data = { scanStatus: status, scanDetail: detail, scannedAt: new Date() };
  const where = { id: item.id, scanStatus: "pending" };
  const result =
    item.table === "file"
      ? await prisma.file.updateMany({ where, data: { ...data, scanEtag: etag } })
      : await prisma.reverseShareFile.updateMany({ where, data });
  return result.count === 1;
}

/** What happened with one file: the scanner could not be reached or the file not read (try again later) or anything else. */
async function scanOne(
  item: Pending,
  settings: ScanSettings,
  deps: ScanQueueDeps,
  found: InfectedFile[]
): Promise<"unreachable" | "unreadable" | "done"> {
  if (item.size > settings.maxBytes) {
    await settle(item, "skipped", skippedBecauseLarge(settings.maxMegabytes));
    return "done";
  }
  let source: Source;
  let etag: string | null = null;
  try {
    // Asked before the object is read: an overwrite in between only costs one more scan later.
    if (item.table === "file") etag = await deps.etagOf(item.objectName);
    source = await deps.openObject(item.objectName);
  } catch (error) {
    console.error(`Virus scan of ${item.table} ${item.id}: the file could not be read:`, error);
    return "unreadable";
  }
  let verdict: ScanVerdict;
  try {
    verdict = await deps.scan(source, settings);
  } catch (error) {
    console.error(`Virus scan of ${item.table} ${item.id} failed:`, error);
    setScannerUp(!isScannerUnreachable(error));
    if (isScannerUnreachable(error)) return "unreachable";
    await settle(item, "error", DETAIL_REFUSED);
    return "done";
  }
  setScannerUp(true);
  if (!verdict.infected) {
    await settle(item, "clean", null, etag);
    return "done";
  }
  if (!(await settle(item, "infected", verdict.name)) || !item.ownerId) return "done";
  const infected: InfectedFile = {
    id: item.id,
    name: item.name,
    finding: verdict.name,
    ownerId: item.ownerId,
    where: item.table === "file" ? "your files" : "a receive link",
  };
  // The line is written now, so a restart cannot lose it; only the mail waits for the end of the run.
  await deps
    .recordLine(infected)
    .catch((error) => console.error("Could not write the line for an infected file:", error));
  found.push(infected);
  return "done";
}

/** After a restart: files that were given up on for lack of a scanner, or because storage could not be read, get another go. Returns how many. */
export async function requeueUnavailable(limit = REQUEUE_LIMIT): Promise<number> {
  const where = { scanStatus: "error", scanDetail: { in: [DETAIL_UNAVAILABLE, DETAIL_UNREADABLE] } };
  const files = await prisma.file.findMany({ where, select: { id: true }, take: limit });
  const received = await prisma.reverseShareFile.findMany({
    where,
    select: { id: true },
    take: Math.max(limit - files.length, 0),
  });
  const data = { scanStatus: "pending", scanDetail: null };
  await prisma.file.updateMany({ where: { id: { in: files.map((file) => file.id) }, ...where }, data });
  await prisma.reverseShareFile.updateMany({ where: { id: { in: received.map((file) => file.id) }, ...where }, data });
  return files.length + received.length;
}

/**
 * One scan at a time, in this process. kick() starts the loop when it is not running and says when
 * the queue is empty. It does nothing at all while CLAMAV_HOST is not set, and it never throws.
 */
export function createScanQueue(deps: ScanQueueDeps = defaultDeps) {
  const delays = deps.retryDelaysMs ?? RETRY_DELAYS_MS;
  const now = deps.now ?? Date.now;
  const waiting: Waiting = new Map();
  let running: Promise<void> | null = null;
  let again = false;
  const collected: InfectedFile[] = [];

  /** Sends the mail about what was found so far, once; without waiting for the mail server. */
  function flush(): Promise<void> {
    const batch = collected.splice(0);
    if (batch.length === 0) return Promise.resolve();
    return deps.announce(batch).catch((error) => console.error("Could not announce infected files:", error));
  }

  /** Handles one file and never throws: a failure is logged and the file is looked at again later. */
  async function handle(item: Pending, settings: ScanSettings, found: InfectedFile[]) {
    const key = keyOf(item);
    const tries = waiting.get(key)?.tries ?? 0;
    try {
      const outcome = await scanOne(item, settings, deps, found);
      if (outcome === "done") waiting.delete(key);
      else if (tries < delays.length) waiting.set(key, { tries: tries + 1, notBefore: now() + delays[tries] });
      else {
        waiting.delete(key);
        await settle(item, "error", outcome === "unreadable" ? DETAIL_UNREADABLE : DETAIL_UNAVAILABLE);
      }
      return outcome;
    } catch (error) {
      console.error(`Virus scan of ${item.table} ${item.id}: could not record the outcome:`, error);
      waiting.set(key, { tries, notBefore: now() + AFTER_FAILURE_MS });
      return "done";
    }
  }

  async function drain() {
    try {
      do {
        again = false;
        for (let settings = scanSettings(); settings; settings = scanSettings()) {
          const item = await nextPending(waiting, now());
          if (!item) break;
          // A scanner that cannot be reached will not take the next file either: stop and come back later.
          if ((await handle(item, settings, collected)) === "unreachable") return;
        }
      } while (again);
    } finally {
      // Nothing is left to do: tell once about everything found, without holding up the next run.
      void flush();
    }
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

  /** Looks again every so often while scanning is on: files that wait for a retry, or whose write failed. */
  function startTimer(ms = TIMER_MS): () => void {
    const timer = setInterval(() => void kick(), ms);
    timer.unref();
    return () => clearInterval(timer);
  }

  return { kick, startTimer, flush };
}

const queue = createScanQueue();

/** Call after a file is registered with status pending, and once at server start. */
export function kickScanQueue(): void {
  void queue.kick();
}

/** At shutdown: sends the mail about what was found, but never waits longer than a few seconds for it. */
export async function flushScanAnnouncements(maxWaitMs = 3000): Promise<void> {
  await Promise.race([queue.flush(), new Promise((resolve) => setTimeout(resolve, maxWaitMs).unref())]);
}

/** Once at server start: gives failed files another go, says plainly when the scanner is out of reach, starts the timer. */
export async function startScanning(): Promise<void> {
  const settings = scanSettings();
  if (!settings) return;
  try {
    const requeued = await requeueUnavailable();
    if (requeued > 0)
      console.log(`Virus scan: ${requeued} files that could not be scanned earlier will be tried again.`);
    const isUp = await canReachClamd(settings);
    setScannerUp(isUp);
    if (!isUp) {
      console.error(
        `Virus scan is on, but the scanner at ${settings.host}:${settings.port} cannot be reached. Files stay pending and are tried again.`
      );
    }
  } catch (error) {
    console.error("Virus scan: start up check failed:", error);
  }
  queue.startTimer();
  kickScanQueue();
}
