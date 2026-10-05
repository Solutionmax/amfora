/**
 * Header carrying the password for a protected share or reverse share.
 *
 * Passwords used to travel as a query parameter, which put them in reverse proxy
 * access logs, browser history and Referer headers. A header keeps them out of all three.
 */
export const SHARE_PASSWORD_HEADER = "x-share-password";

/**
 * The visitor's address for the API. Only opt in behind a private ingress that replaces incoming
 * forwarding headers and blocks direct access: without that a caller could name any address.
 *
 * Behind Cloudflare the visitor is in `CF-Connecting-IP`, and the proxies in between each add
 * their own hop to `X-Forwarded-For`. The API counts requests per address from that last header,
 * so the visitor Cloudflare names goes first in both.
 */
export function clientAddressHeaders(headers: Headers): Record<string, string> {
  if (process.env.TRUST_CLIENT_IP_HEADERS !== "true") return {};
  const connecting = headers.get("cf-connecting-ip")?.trim();
  const forwardedFor = connecting || headers.get("x-forwarded-for");
  return {
    ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
    ...(connecting ? { "cf-connecting-ip": connecting } : {}),
  };
}
