import type { Secret, SecretLimits } from "@/http/endpoints/secrets";

/** Lifetimes offered for a new secret, in hours: 1 hour, 1 day, 7 days, 30 days. */
const EXPIRY_HOURS = [1, 24, 168, 720] as const;
const OPEN_COUNTS = [1, 2, 3, 5, 10] as const;
const PREFERRED_EXPIRY_HOURS = 168;

export const HOURS_PER_DAY = 24;

export interface SecretOptions {
  expiryHours: number[];
  defaultExpiryHours: number;
  openCounts: number[];
}

/** The choices that fit the limits. The limit itself is always offered, so a 3 day limit gives 1 hour, 1 day, 3 days. */
export function secretOptions(limits: SecretLimits): SecretOptions {
  const within = <T extends number>(values: readonly T[], max: number) => {
    const fitting: number[] = values.filter((value) => value < max);
    return [...fitting, max];
  };
  const expiryHours = within(EXPIRY_HOURS, limits.maxHours);
  return {
    expiryHours,
    defaultExpiryHours: expiryHours.includes(PREFERRED_EXPIRY_HOURS) ? PREFERRED_EXPIRY_HOURS : expiryHours.at(-1)!,
    openCounts: within(OPEN_COUNTS, limits.maxOpens),
  };
}

export const SECRET_FILTERS = ["all", "waiting", "done"] as const;
export type SecretFilter = (typeof SECRET_FILTERS)[number];

export function filterSecrets(secrets: Secret[], filter: SecretFilter): Secret[] {
  if (filter === "all") return secrets;
  return secrets.filter((secret) => (secret.status === "waiting") === (filter === "waiting"));
}

/** The address a reader opens. The key sits behind the #, which a browser keeps to itself. */
export function secretLink(origin: string, id: string, linkKey: string): string {
  return `${origin}/x/${id}#${linkKey}`;
}
