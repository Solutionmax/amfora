import type { FastifyReply } from "fastify";

import { isScanEnabled, scanSettings } from "./settings";
import { isStillScannedObject, type ScannedObject } from "./still-scanned";

export const SCAN_STATUSES = ["pending", "clean", "infected", "error", "skipped"] as const;
export type ScanStatus = (typeof SCAN_STATUSES)[number];

/** Sent with a refusal so a client can tell this from any other 423. */
export const FILE_BLOCKED_CODE = "FILE_BLOCKED_BY_SCAN";

export interface ScanFields {
  scanStatus?: string | null;
  scanDetail?: string | null;
  scannedAt?: Date | null;
}

/** What an error row says. The real cause goes to the log, never to a client. */
export const DETAIL_UNAVAILABLE = "Scanner unavailable";
export const DETAIL_REFUSED = "Scanner could not check the file";
export const DETAIL_UNREADABLE = "Could not be read";

export const skippedBecauseLarge = (megabytes: number) => `Larger than ${megabytes} MB`;

/** What a file registered now starts with: nothing when scanning is off, else pending, or skipped when it is too large. */
export function initialScanFields(size: bigint): {
  scanStatus?: ScanStatus;
  scanDetail?: string;
  scannedAt?: Date;
} {
  const settings = scanSettings();
  if (!settings) return {};
  if (size > settings.maxBytes) {
    return { scanStatus: "skipped", scanDetail: skippedBecauseLarge(settings.maxMegabytes), scannedAt: new Date() };
  }
  return { scanStatus: "pending" };
}

/**
 * The part of a file the API shows: the status, or null for both when there is nothing to tell. With
 * scanning off only an infected file keeps its status, so people can see why it is blocked; everything
 * else shows nothing and an installation without scanning looks exactly as it did before. The detail
 * is only for infected (what was found) and skipped (why): anything else is for the log.
 */
export function scanFieldsOf(file: ScanFields): { scanStatus: ScanStatus | null; scanDetail: string | null } {
  const status = SCAN_STATUSES.find((known) => known === file.scanStatus) ?? null;
  if (!status || (status !== "infected" && !isScanEnabled())) return { scanStatus: null, scanDetail: null };
  const shows = status === "infected" || status === "skipped";
  return { scanStatus: status, scanDetail: shows ? (file.scanDetail ?? null) : null };
}

/**
 * The one rule: a file that is being checked or is infected is handed out to nobody, its owner
 * included. The owner may only delete it. Pending only counts while scanning is on, so a file
 * left pending when scanning was switched off is not stuck for good.
 */
export function isBlockedByScan(file: ScanFields): boolean {
  return file.scanStatus === "infected" || (file.scanStatus === "pending" && isScanEnabled());
}

const HEAD_GROUP = 20;

/**
 * isBlockedByScan for a file row of the workspace, for the routes that hand out its content: a clean
 * file must also still be the object that was scanned.
 */
export async function isBlockedByScanNow(file: ScanFields & ScannedObject): Promise<boolean> {
  return isBlockedByScan(file) || !(await isStillScannedObject(file));
}

/** Those of the files that may not be handed out now, asked in small groups so storage is not flooded. */
export async function blockedByScanNow<T extends ScanFields & ScannedObject>(files: T[]): Promise<T[]> {
  const blocked: T[] = [];
  for (let start = 0; start < files.length; start += HEAD_GROUP) {
    const group = files.slice(start, start + HEAD_GROUP);
    const verdicts = await Promise.all(group.map(isBlockedByScanNow));
    group.forEach((file, index) => verdicts[index] && blocked.push(file));
  }
  return blocked;
}

/** The same answer on every route that refuses a blocked file. */
export function sendFileBlocked(reply: FastifyReply, file: ScanFields) {
  const infected = file.scanStatus === "infected";
  return reply.status(423).send({
    error: infected
      ? "This file was found to be harmful and is blocked."
      : "This file is still being checked and cannot be opened yet.",
    code: FILE_BLOCKED_CODE,
    scanStatus: infected ? "infected" : "pending",
  });
}

/** For the places that throw instead of replying (services). The controller turns it into the same 423. */
export class FileBlockedError extends Error {
  constructor(readonly file: ScanFields) {
    super("File blocked by the virus scan");
  }
}
