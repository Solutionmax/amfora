import { prisma } from "../../shared/prisma";
import { noteStorageUsage } from "../activity/notifications";
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
 * back to pending, takes the size of the new object into the row (it may be bigger) and the queue is started. A storage that does not answer is not a reason to block:
 * the download fails on its own then.
 */
export async function isStillScannedObject(file: ScannedObject): Promise<boolean> {
  if (!isScanEnabled() || file.scanStatus !== "clean" || !file.scanEtag) return true;
  let current: string | null;
  try {
    current = await new FileService().getObjectEtag(file.objectName);
  } catch (error) {
    console.error(`Virus scan: could not check the object of file ${file.id}:`, error);
    return true;
  }
  if (current === null || current === file.scanEtag) return true;
  const size = await new FileService().getObjectSize(file.objectName).catch(() => null);
  const reset = await prisma.file.updateMany({
    where: { id: file.id, scanStatus: "clean", scanEtag: file.scanEtag },
    data: { scanStatus: "pending", scanEtag: null, scanDetail: null, ...(size === null ? {} : { size: BigInt(size) }) },
  });
  if (reset.count === 0) return true; // a scan finished meanwhile: that verdict stands
  kickScanQueue();
  const owner = await prisma.file.findUnique({ where: { id: file.id }, select: { userId: true } });
  if (owner) await noteStorageUsage(owner.userId);
  return false;
}
