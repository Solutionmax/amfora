import { createHash, randomBytes } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";

export const API_KEY_PREFIX = "amf_";

/** Longest value we bother hashing. A real key is 47 characters. */
const MAX_KEY_LENGTH = 200;

/** Characters of the key kept in clear so the owner can tell keys apart. */
const VISIBLE_PREFIX_LENGTH = 12;

export type ApiKeyScope = "read" | "full";

export function hashApiKey(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** A new key. The token is shown to the owner once; only hash and prefix are stored. */
export function generateApiKey(): { token: string; hash: string; prefix: string } {
  const token = API_KEY_PREFIX + randomBytes(32).toString("base64url");
  return { token, hash: hashApiKey(token), prefix: token.slice(0, VISIBLE_PREFIX_LENGTH) };
}

/**
 * The API key a request presents, from `Authorization: Bearer amf_...` or `X-API-Key`.
 * Null when the request carries no API key, so a session token in the same header is left alone.
 */
export function extractApiKey(headers: IncomingHttpHeaders): string | null {
  const candidates = [headers.authorization?.replace(/^Bearer\s+/i, ""), headers["x-api-key"]];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const value = candidate.trim();
    if (value.startsWith(API_KEY_PREFIX) && value.length <= MAX_KEY_LENGTH) return value;
  }
  return null;
}

/** What a read key may call. Listed one by one: some GET routes hand out upload URLs. */
export const READ_ROUTES: ReadonlySet<string> = new Set([
  "GET /auth/me",
  "GET /files",
  "GET /files/download-url",
  "GET /files/download",
  "GET /folders",
  "GET /shares/me",
  "GET /shares/:shareId",
  "GET /reverse-shares",
  "GET /reverse-shares/:id",
  "GET /reverse-shares/files/:fileId/download",
  "GET /secrets",
  "GET /secrets/limits",
]);

/**
 * A full key may also call everything under these. Accounts, settings and keys stay out of
 * reach, and so does /storage: it answers an administrator with figures about the whole host.
 */
const FULL_PREFIXES = ["/files", "/folders", "/shares", "/reverse-shares", "/secrets"];

/** Under a prefix above, yet for administrators in a browser only. */
const NEVER_ROUTES: ReadonlySet<string> = new Set(["GET /secrets/stats"]);

/**
 * Whether a key with this scope may call the matched route. `route` is the route pattern
 * Fastify matched (for example "/shares/:shareId"), never the raw URL, so path tricks cannot
 * widen the answer. An unknown scope counts as read.
 */
export function isRouteAllowed(scope: string, method: string, route: string | undefined): boolean {
  if (!route) return false;
  const verb = method === "HEAD" ? "GET" : method;
  if (NEVER_ROUTES.has(`${verb} ${route}`)) return false;
  if (READ_ROUTES.has(`${verb} ${route}`)) return true;
  if (scope !== "full") return false;
  return FULL_PREFIXES.some((prefix) => route === prefix || route.startsWith(`${prefix}/`));
}
