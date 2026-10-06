import { FileService } from "./service";

const LOOKS = 3;
const WAIT_MS = 300;

export type StoredSize = { state: "found"; size: bigint } | { state: "missing" } | { state: "unavailable" };

/** Storage said the object is not there (as opposed to: storage did not answer). */
export function isNotFound(error: unknown): boolean {
  const e = error as { name?: string; $metadata?: { httpStatusCode?: number } } | null;
  return e?.name === "NotFound" || e?.name === "NoSuchKey" || e?.$metadata?.httpStatusCode === 404;
}

/**
 * The size of an uploaded object. A missing object is looked for three times, 300 ms apart (storage can
 * be slow to show a new object); any other failure is "unavailable", not "missing".
 */
export async function storedSizeOf(service: FileService, objectName: string): Promise<StoredSize> {
  for (let look = 1; ; look++) {
    try {
      return { state: "found", size: BigInt(await service.getObjectSize(objectName)) };
    } catch (error) {
      if (!isNotFound(error)) {
        console.error(`Could not read the size of ${objectName}:`, error);
        return { state: "unavailable" };
      }
      if (look >= LOOKS) return { state: "missing" };
      await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
    }
  }
}
