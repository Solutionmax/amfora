/**
 * Runs a write for each item one after the other. The server keeps one SQLite connection, so
 * writes sent all at once only wait in line there until requests give up. One failing item does
 * not stop the rest; the caller gets the counts and tells the user.
 */
/** A delete that finds the item gone (a folder took it along) is done, not failed. */
export function ignoreNotFound(error: unknown): void {
  if ((error as { response?: { status?: number } })?.response?.status !== 404) throw error;
}

export async function runInTurn<T>(items: readonly T[], action: (item: T) => Promise<unknown>) {
  let failed = 0;
  for (const item of items) {
    try {
      await action(item);
    } catch (error) {
      failed++;
      console.error("Failed to process an item:", error);
    }
  }
  return { done: items.length - failed, failed };
}
