export type AddedLabel = { kind: "today"; time: string } | { kind: "yesterday" } | { kind: "date"; text: string };

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Short "when was this added" label: today with the time, yesterday, or a short date. */
export function addedLabel(value: string | Date, now: Date, locale: string): AddedLabel | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (days === 0) {
    return {
      kind: "today",
      time: new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false }).format(date),
    };
  }
  if (days === 1) return { kind: "yesterday" };

  const sameYear = date.getFullYear() === now.getFullYear();
  const text = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
  return { kind: "date", text };
}
