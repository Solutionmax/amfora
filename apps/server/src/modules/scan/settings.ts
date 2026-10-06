import { env } from "../../env";

const DEFAULT_PORT = 3310;
const DEFAULT_MAX_MB = 100;
const BYTES_PER_MB = 1024 * 1024;

export interface ScanSettings {
  host: string;
  port: number;
  /** Files above this many bytes are skipped. */
  maxBytes: bigint;
  maxMegabytes: number;
}

const positiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

/** The scanner to use, or null when CLAMAV_HOST is not set: then nothing about scanning exists. */
export function scanSettings(): ScanSettings | null {
  const host = env.CLAMAV_HOST?.trim();
  if (!host) return null;
  const maxMegabytes = positiveInt(env.CLAMAV_MAX_SIZE_MB, DEFAULT_MAX_MB);
  return {
    host,
    port: positiveInt(env.CLAMAV_PORT, DEFAULT_PORT),
    maxMegabytes,
    maxBytes: BigInt(maxMegabytes) * BigInt(BYTES_PER_MB),
  };
}

export const isScanEnabled = () => scanSettings() !== null;
