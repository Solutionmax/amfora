import { S3StorageProvider } from "../../providers/s3-storage.provider";
import type { StorageProvider } from "../../types/storage";

const PROBE_KEY = ".amfora-health-probe";
const PROBE_TIMEOUT_MS = 5000;

/** Whether the object storage answers. Looking for an object that is not there counts as an answer. */
export async function isStorageUp(
  provider: Pick<StorageProvider, "fileExists"> = new S3StorageProvider(),
  timeoutMs = PROBE_TIMEOUT_MS
): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Storage did not answer in time")), timeoutMs);
  });
  try {
    await Promise.race([provider.fileExists(PROBE_KEY), timedOut]);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
