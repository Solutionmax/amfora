const MS_PER_DAY = 24 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");

/** Value for an <input type="datetime-local"> in the viewer's own time zone. */
function toInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const aheadBy = (days: number, now: Date) => new Date(now.getTime() + days * MS_PER_DAY);
const wholeDays = (value: string | undefined) => (value && /^\d+$/.test(value) ? Number(value) : 0);

/** The default and maximum lifetime of a link, in days, from the public settings. 0 means none. */
export function lifetimeSettings(configs: Array<{ key: string; value: string }>) {
  const valueOf = (key: string) => configs.find((config) => config.key === key)?.value;
  return {
    defaultDays: wholeDays(valueOf("shareDefaultExpiryDays")),
    maxDays: wholeDays(valueOf("shareMaxExpiryDays")),
  };
}

/** The end date a new link starts with, empty when the administrator set no default. */
export function defaultExpiryValue(defaultDays: number, now: Date): string {
  return defaultDays > 0 ? toInputValue(aheadBy(defaultDays, now)) : "";
}

/** The latest end date the date picker offers, undefined when there is no maximum. */
export function maxExpiryValue(maxDays: number, now: Date): string | undefined {
  return maxDays > 0 ? toInputValue(aheadBy(maxDays, now)) : undefined;
}

/** Why an end date is not accepted, or null. A date the link already has (`unchanged`) always is. */
export function expiryProblem(input: {
  value: string;
  maxDays: number;
  now: Date;
  unchanged?: string;
}): "required" | "tooLong" | null {
  const { value, maxDays, now, unchanged } = input;
  if (maxDays <= 0 || value === unchanged) return null;
  if (!value) return "required";

  const latest = maxExpiryValue(maxDays, now) as string;
  return value > latest ? "tooLong" : null;
}

/** Why the two lifetime settings do not fit together, or null. A default past the maximum can never be used. */
export function lifetimeSettingsProblem(defaultDays: number, maxDays: number): "defaultTooLong" | null {
  return maxDays > 0 && defaultDays > maxDays ? "defaultTooLong" : null;
}
