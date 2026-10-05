import { prisma } from "./prisma";

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

/** The forms send an end date at minute precision; the same minute counts as the same end date. */
const minuteOf = (date: Date | null | undefined) => (date ? Math.floor(date.getTime() / MS_PER_MINUTE) : null);

type Verdict = { ok: true } | { ok: false; reason: string };

/**
 * Whether a share or a receive link may get this end date under the maximum lifetime
 * (whole days, 0 means no maximum). An end date the link already has stays allowed.
 */
export function checkLinkLifetime(input: {
  requested: Date | null;
  now: Date;
  maxDays: number;
  current?: Date | null;
}): Verdict {
  const { requested, now, maxDays, current } = input;
  if (maxDays <= 0) return { ok: true };
  if (current !== undefined && minuteOf(requested) === minuteOf(current)) return { ok: true };
  // Shortening a link that runs longer than the maximum is always fine.
  if (requested && current && requested.getTime() <= current.getTime()) return { ok: true };

  const reason = `A link can stay open for at most ${maxDays} days. Choose an end date within ${maxDays} days.`;
  if (!requested) return { ok: false, reason };
  return requested.getTime() > now.getTime() + maxDays * MS_PER_DAY ? { ok: false, reason } : { ok: true };
}

const MAX_SETTING_DAYS = 3650;

/** A days setting is plain digits; anything else counts as 0 (no maximum), so a broken value never refuses links. */
const storedDays = (raw: string | null | undefined) =>
  raw !== null && raw !== undefined && /^\d+$/.test(raw) ? Number(raw) : 0;

/** What is wrong with a pair of lifetime settings, or null when they are fine. */
export function lifetimeSettingsError(input: { defaultDays: number; maxDays: number }): string | null {
  const { defaultDays, maxDays } = input;
  for (const days of [defaultDays, maxDays]) {
    if (!Number.isInteger(days) || days < 0 || days > MAX_SETTING_DAYS) {
      return `Days must be a whole number from 0 to ${MAX_SETTING_DAYS}`;
    }
  }
  if (maxDays > 0 && defaultDays > maxDays) {
    return `The default lifetime cannot be longer than the maximum of ${maxDays} days`;
  }
  return null;
}

/** The same check against the maximum set in Settings; throws the reason when the date is refused. */
export async function assertLinkLifetime(requested: Date | null, current?: Date | null): Promise<void> {
  const setting = await prisma.appConfig.findUnique({ where: { key: "shareMaxExpiryDays" } });
  const verdict = checkLinkLifetime({ requested, now: new Date(), maxDays: storedDays(setting?.value), current });
  if (!verdict.ok) throw new Error(verdict.reason);
}

const LIFETIME_KEYS = ["shareDefaultExpiryDays", "shareMaxExpiryDays"];

/** Checks changes to the lifetime settings against the stored ones; throws the reason when they do not fit. */
export async function assertLifetimeSettings(updates: Array<{ key: string; value: string }>): Promise<void> {
  if (!updates.some((update) => LIFETIME_KEYS.includes(update.key))) return;

  const stored = await prisma.appConfig.findMany({ where: { key: { in: LIFETIME_KEYS } } });
  const days = (key: string) => {
    const changed = updates.find((update) => update.key === key);
    // A value being saved that is not plain digits is refused (NaN); a broken stored one counts as 0.
    if (changed) return /^\d+$/.test(changed.value) ? Number(changed.value) : Number.NaN;
    return storedDays(stored.find((row) => row.key === key)?.value);
  };
  const error = lifetimeSettingsError({
    defaultDays: days("shareDefaultExpiryDays"),
    maxDays: days("shareMaxExpiryDays"),
  });
  if (error) throw new Error(error);
}
