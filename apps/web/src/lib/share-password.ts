/**
 * Header carrying the password for a protected share or reverse share.
 *
 * Passwords used to travel as a query parameter, which put them in reverse proxy
 * access logs, browser history and Referer headers. A header keeps them out of all three.
 */
export const SHARE_PASSWORD_HEADER = "x-share-password";

/**
 * The API is reached server side, so without this every visitor arrives at the API as the
 * Next.js process itself. Rate limits would then be counted against one shared address:
 * useless against an attacker and able to lock out every user at once. Passing the client
 * address on lets the API count per visitor, as `trustProxy` expects.
 */
export function clientAddressHeaders(headers: Headers): Record<string, string> {
  const forwardedFor = headers.get("x-forwarded-for");
  return forwardedFor ? { "x-forwarded-for": forwardedFor } : {};
}
