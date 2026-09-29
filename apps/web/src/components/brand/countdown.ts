export interface TimeLeft {
  days: number;
  hours: string;
  minutes: string;
  seconds: string;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** Time between now and an end date, in whole units; null once the date has passed. */
export function timeLeft(until: Date, now: Date = new Date()): TimeLeft | null {
  const total = Math.floor((until.getTime() - now.getTime()) / 1000);
  if (!Number.isFinite(total) || total <= 0) return null;
  return {
    days: Math.floor(total / 86400),
    hours: pad(Math.floor((total % 86400) / 3600)),
    minutes: pad(Math.floor((total % 3600) / 60)),
    seconds: pad(total % 60),
  };
}
