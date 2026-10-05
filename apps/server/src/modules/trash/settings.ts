import { prisma } from "../../shared/prisma";

export const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_TRASH_DAYS = 30;
const MAX_SETTING_DAYS = 3650;

/** Whole days a deleted item stays in the trash. Never below one: a broken value falls back to the default. */
export async function trashRetentionDays(): Promise<number> {
  const setting = await prisma.appConfig.findUnique({ where: { key: "trashRetentionDays" } });
  const days = Number(setting?.value);
  return Number.isInteger(days) && days >= 1 ? days : DEFAULT_TRASH_DAYS;
}

/** Whole days an ended link stays before it is cleaned up. Zero means never. */
export async function expiredLinkRetentionDays(): Promise<number> {
  const setting = await prisma.appConfig.findUnique({ where: { key: "expiredLinkRetentionDays" } });
  const days = Number(setting?.value);
  return Number.isInteger(days) && days >= 1 ? days : 0;
}

/** Checks changes to the two clean up settings; throws the reason when a value is not allowed. */
export function assertCleanUpSettings(updates: Array<{ key: string; value: string }>): void {
  for (const { key, value } of updates) {
    const minimum = key === "trashRetentionDays" ? 1 : key === "expiredLinkRetentionDays" ? 0 : null;
    if (minimum === null) continue;
    const days = Number(value);
    if (value.trim() === "" || !Number.isInteger(days) || days < minimum || days > MAX_SETTING_DAYS) {
      throw new Error(`Days must be a whole number from ${minimum} to ${MAX_SETTING_DAYS}`);
    }
  }
}
