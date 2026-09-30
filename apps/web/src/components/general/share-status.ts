export type LinkStatus = "neverExpires" | "active" | "expired" | "inactive";

/** Same rules as before the redesign: no end date = never expires; past end date = expired. */
export function linkStatus({
  expiration,
  isActive = true,
}: {
  expiration?: string | Date | null;
  isActive?: boolean;
}): LinkStatus {
  if (!isActive) return "inactive";
  if (!expiration) return "neverExpires";
  return new Date(expiration).getTime() < Date.now() ? "expired" : "active";
}
