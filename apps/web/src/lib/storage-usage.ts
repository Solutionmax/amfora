/** From this share of the limit the sidebar says "Almost full". */
export const ALMOST_FULL_RATIO = 0.9;

export type StorageLevel = "normal" | "almostFull" | "full";

/** How close a user is to their limit. Without a limit there is nothing to warn about. */
export function storageLevel(used: number, limit: number | null): StorageLevel {
  if (!limit || limit <= 0) return "normal";
  const ratio = used / limit;
  if (ratio >= 1) return "full";
  return ratio >= ALMOST_FULL_RATIO ? "almostFull" : "normal";
}

/** The smallest arc that still reads as "something is in use". */
const RING_MIN_PERCENT = 2;

/** How much of the storage ring is drawn, 0 to 100. Any use shows at least a dot; no limit draws nothing. */
export function ringPercent(used: number, limit: number | null): number {
  if (!limit || limit <= 0 || used <= 0) return 0;

  return Math.min(100, Math.max(RING_MIN_PERCENT, (used / limit) * 100));
}

export interface StorageParts {
  /** Files of the user that sit in no share. */
  ownBytes: number;
  sharedBytes: number;
  /** Null when there is no limit. */
  freeBytes: number | null;
  /** Widths of the bar segments and the figure next to it, 0 to 100. Null when there is no limit. */
  ownPercent: number | null;
  sharedPercent: number | null;
  usedPercent: number | null;
}

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

/** Splits what counts towards the limit into own files and files in shares. */
export function storageParts(usage: {
  limitBytes: number | null;
  usedBytes: number;
  sharedBytes: number;
}): StorageParts {
  const sharedBytes = Math.min(Math.max(usage.sharedBytes, 0), usage.usedBytes);
  const ownBytes = Math.max(usage.usedBytes - sharedBytes, 0);
  const limit = usage.limitBytes && usage.limitBytes > 0 ? usage.limitBytes : null;

  if (limit === null) {
    return { ownBytes, sharedBytes, freeBytes: null, ownPercent: null, sharedPercent: null, usedPercent: null };
  }

  const usedPercent = clampPercent((usage.usedBytes / limit) * 100);
  // Over the limit the bar is simply full; the two parts keep their proportion.
  const scale = usage.usedBytes > limit ? limit / usage.usedBytes : 1;

  return {
    ownBytes,
    sharedBytes,
    freeBytes: Math.max(limit - usage.usedBytes, 0),
    ownPercent: clampPercent((ownBytes / limit) * 100 * scale),
    sharedPercent: clampPercent((sharedBytes / limit) * 100 * scale),
    usedPercent,
  };
}
