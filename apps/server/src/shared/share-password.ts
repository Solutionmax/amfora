import { FastifyRequest } from "fastify";

/**
 * Header carrying the password for a protected share or reverse share.
 *
 * Passwords used to travel as a query parameter, which put them in reverse proxy
 * access logs, browser history and Referer headers. A header keeps them out of all
 * three while still working on GET requests, where a body is not an option.
 */
export const SHARE_PASSWORD_HEADER = "x-share-password";

/**
 * Reads the share password from the request header, falling back to the request
 * body so that POST callers may send it there instead.
 */
export function getSharePassword(request: FastifyRequest): string | undefined {
  const header = request.headers[SHARE_PASSWORD_HEADER];
  const raw = Array.isArray(header) ? header[0] : header;

  if (typeof raw === "string" && raw.length > 0) {
    try {
      return decodeURIComponent(raw);
    } catch {
      // A header that is not valid percent-encoding is still a usable password.
      return raw;
    }
  }

  const body = request.body as { password?: unknown } | undefined;
  return typeof body?.password === "string" && body.password.length > 0 ? body.password : undefined;
}
