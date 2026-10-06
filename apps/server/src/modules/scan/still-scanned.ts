import { prisma } from "../../shared/prisma";
import { FileService } from "../file/service";
import { kickScanQueue } from "./queue";
import { isScanEnabled } from "./settings";

export interface ScannedObject {
  id: string;
  objectName: string;
  scanStatus?: string | null;
  scanEtag?: string | null;
}

/**
 * Whether a clean file is still the object that was scanned. A presigned upload address can be used
 * again, so the object may have been overwritten since. Asks storage for the ETag (one HEAD) only
 * when scanning is on and the file is clean with a remembered ETag; when it differs the file goes
 * back to pending and the queue is started. A storage that does not answer is not a reason to block:
 * the download fails on its own then.
 */
export async function isStillScannedObject(file: ScannedObject): Promise<boolean> {
  if (!isScanEnabled() || file.scanStatus !== "clean" || !file.scanEtag) return true;
  let current: string;
  try {
    current = await new FileService().getObjectEtag(file.objectName);
  } catch (error) {
    console.error(`Virus scan: could not check the object of file ${file.id}:`, error);
    return true;
  }
  if (current === file.scanEtag) return true;
  await prisma.file.updateMany({
    where: { id: file.id, scanStatus: "clean" },
    data: { scanStatus: "pending", scanEtag: null, scanDetail: null },
  });
  kickScanQueue();
  return false;
}
