/**
 * Header carrying the password for a protected share or reverse share.
 *
 * Passwords used to travel as a query parameter, which put them in reverse proxy
 * access logs, browser history and Referer headers. A header keeps them out of all three.
 */
export const SHARE_PASSWORD_HEADER = "x-share-password";

/** Only opt in behind a private ingress that replaces incoming forwarding headers. */
export function clientAddressHeaders(headers: Headers): Record<string, string> {
  if (process.env.TRUST_CLIENT_IP_HEADERS !== "true") return {};
  const forwardedFor = headers.get("x-forwarded-for");
  // Cloudflare names the visitor here. The API uses it only to say where an event came from.
  const connecting = headers.get("cf-connecting-ip");
  return {
    ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
    ...(connecting ? { "cf-connecting-ip": connecting } : {}),
  };
}
