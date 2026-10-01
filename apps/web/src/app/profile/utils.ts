/** Groups a manual 2FA key in fours so it can be typed over from the screen. */
export function groupKey(key: string): string {
  return key
    .replace(/\s+/g, "")
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

/** Keeps only digits, up to the length of an authenticator code. */
export function digitsOnly(value: string, max = 6): string {
  return value.replace(/\D/g, "").slice(0, max);
}

/** Phones and tablets get the phone icon; everything else the laptop. */
export function isMobileAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return /iPhone|iPad|Android|Mobile/.test(userAgent);
}

/** Initials for the avatar: first letters of first and last name, or "?" when both are empty. */
export function nameInitials(firstName?: string, lastName?: string): string {
  const first = (firstName ?? "").trim();
  const last = (lastName ?? "").trim();
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase() || "?";
}
