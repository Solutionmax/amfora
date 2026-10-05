export type NotifyKey = "notifyDownloadEnabled" | "notifyExpiryEnabled" | "notifySecretOpenedEnabled";

/**
 * True when the administrator has this kind of email off. The server sends it only when the value is
 * exactly "true", so anything else known is off. Unknown (still loading) is not shown as off.
 */
export function adminSwitchedOff(configs: ReadonlyArray<{ key: string; value: string }> | null, key: NotifyKey) {
  const row = configs?.find((config) => config.key === key);
  return !!row && row.value !== "true";
}
