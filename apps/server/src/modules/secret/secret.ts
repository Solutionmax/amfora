import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Wrong passphrases a secret survives. The next one destroys it. */
export const MAX_FAILED_ATTEMPTS = 3;

/** Longest text a signed-in user may seal, in characters. */
export const MAX_LENGTH_SIGNED_IN = 10000;

const HOURS_PER_DAY = 24;
/** A character is at most four bytes in UTF-8. */
const MAX_BYTES_PER_CHARACTER = 4;
/** What AES-GCM adds to the text: a 12 byte nonce and a 16 byte tag. */
const SEAL_OVERHEAD_BYTES = 28;

export type SecretStatus = "waiting" | "used" | "expired" | "burned";

export interface SecretLimits {
  maxHours: number;
  maxOpens: number;
  maxLength: number;
}

export interface SecretSettings {
  anonymousEnabled: boolean;
  anonymousPerHour: number;
  anonymous: SecretLimits;
  signedIn: SecretLimits;
}

const DEFAULTS = {
  secretsAnonymousEnabled: "false",
  secretsAnonymousMaxDays: "7",
  secretsAnonymousMaxOpens: "3",
  secretsAnonymousMaxLength: "5000",
  secretsAnonymousPerHour: "10",
  secretsMaxDays: "30",
  secretsMaxOpens: "10",
} as const;

export const SECRET_CONFIG_KEYS = Object.keys(DEFAULTS);

/** A whole number of at least one; anything else (a missing or mangled setting) gives the default. */
function positive(value: string | undefined, fallback: string): number {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 ? number : Number(fallback);
}

/** Settings from the stored configuration. A missing key (an older installation) means the default. */
export function secretSettings(configs: ReadonlyArray<{ key: string; value: string }>): SecretSettings {
  const stored = new Map(configs.map((config) => [config.key, config.value]));
  const number = (key: keyof typeof DEFAULTS) => positive(stored.get(key), DEFAULTS[key]);
  return {
    anonymousEnabled: stored.get("secretsAnonymousEnabled") === "true",
    anonymousPerHour: number("secretsAnonymousPerHour"),
    anonymous: {
      maxHours: number("secretsAnonymousMaxDays") * HOURS_PER_DAY,
      maxOpens: number("secretsAnonymousMaxOpens"),
      maxLength: number("secretsAnonymousMaxLength"),
    },
    signedIn: {
      maxHours: number("secretsMaxDays") * HOURS_PER_DAY,
      maxOpens: number("secretsMaxOpens"),
      maxLength: MAX_LENGTH_SIGNED_IN,
    },
  };
}

/** Longest sealed text (base64url) that can hold `maxLength` characters. */
export function maxCiphertextLength(maxLength: number): number {
  const bytes = maxLength * MAX_BYTES_PER_CHARACTER + SEAL_OVERHEAD_BYTES;
  return Math.ceil((bytes * 4) / 3);
}

/** Why a new secret is refused, or null when it fits the limits. */
export function limitError(
  input: { ciphertext: string; expiresInHours: number; maxOpens: number },
  limits: SecretLimits
): string | null {
  if (input.expiresInHours > limits.maxHours) {
    return `A secret can live for at most ${limits.maxHours / HOURS_PER_DAY} days.`;
  }
  if (input.maxOpens > limits.maxOpens) return `A secret can be opened at most ${limits.maxOpens} times.`;
  if (input.ciphertext.length > maxCiphertextLength(limits.maxLength)) {
    return `A secret can hold at most ${limits.maxLength} characters.`;
  }
  return null;
}

export function secretStatus(
  secret: { opens: number; maxOpens: number; failedAttempts: number; expiresAt: Date },
  now: Date
): SecretStatus {
  if (secret.failedAttempts >= MAX_FAILED_ATTEMPTS) return "burned";
  if (secret.opens >= secret.maxOpens) return "used";
  if (secret.expiresAt <= now) return "expired";
  return "waiting";
}

/** The part of the link the server knows. 128 random bits, so it cannot be guessed. */
export function newSecretId(): string {
  return randomBytes(16).toString("base64url");
}

export function hashVerifier(verifier: string): string {
  return createHash("sha256").update(verifier).digest("hex");
}

/** Constant time, so the answer does not leak how much of the verifier was right. */
export function verifierMatches(verifier: string, storedHash: string): boolean {
  const given = Buffer.from(hashVerifier(verifier), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return given.length === stored.length && timingSafeEqual(given, stored);
}
