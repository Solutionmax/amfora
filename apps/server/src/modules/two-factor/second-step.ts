import type { FastifyInstance } from "fastify";

import { env } from "../../env";
import { prisma } from "../../shared/prisma";

export const TWO_FACTOR_REQUIRED_VALUES = ["off", "admins", "all"] as const;
export type TwoFactorRequirement = (typeof TWO_FACTOR_REQUIRED_VALUES)[number];

/** The cookie the session travels in (see the jwt registration in app.ts). */
const SESSION_COOKIE = "token";

export const SETUP_REQUIRED_CODE = "TWO_FACTOR_SETUP_REQUIRED";

export function assertTwoFactorRequired(value: string): void {
  if (!TWO_FACTOR_REQUIRED_VALUES.includes(value as TwoFactorRequirement)) {
    throw new Error(`twoFactorRequired must be one of: ${TWO_FACTOR_REQUIRED_VALUES.join(", ")}`);
  }
}

const warnedValues = new Set<string>();

/**
 * The requirement the server configuration forces, or null: TWO_FACTOR_REQUIRED=off|admins|all.
 * Case, spaces and surrounding quotes (Docker keeps them) do not matter. Anything else is ignored, with one warning per value.
 */
export function requirementFromServer(): TwoFactorRequirement | null {
  const raw = env.TWO_FACTOR_REQUIRED;
  if (raw === undefined || raw.trim() === "") return null;
  const value = raw
    .trim()
    .replace(/^(["'])(.*)\1$/, "$2")
    .trim()
    .toLowerCase();
  if (TWO_FACTOR_REQUIRED_VALUES.includes(value as TwoFactorRequirement)) return value as TwoFactorRequirement;
  if (!warnedValues.has(raw)) {
    warnedValues.add(raw);
    console.warn(
      `TWO_FACTOR_REQUIRED is set to "${raw}" and ignored: use one of ${TWO_FACTOR_REQUIRED_VALUES.join(", ")}.`
    );
  }
  return null;
}

/** For the settings page: the value the server forces, and a mark, so the select can show it is not the administrator's to change. */
export function withServerRequirement<T extends { key: string; value: string }>(
  configs: T[]
): Array<T & { lockedByServer?: boolean }> {
  const forced = requirementFromServer();
  if (!forced) return configs;
  return configs.map((c) => (c.key === "twoFactorRequired" ? { ...c, value: forced, lockedByServer: true } : c));
}

/** The server configuration wins; else the stored value. An unknown or missing value (an install from before the setting existed) means off. */
async function requirement(): Promise<TwoFactorRequirement> {
  const forced = requirementFromServer();
  if (forced) return forced;
  const row = await prisma.appConfig.findUnique({ where: { key: "twoFactorRequired" } });
  return TWO_FACTOR_REQUIRED_VALUES.includes(row?.value as TwoFactorRequirement)
    ? (row?.value as TwoFactorRequirement)
    : "off";
}

/** Must this user set up a second step before doing anything else? Read from the database, never the token. */
export async function mustSetUpSecondStep(userId: string): Promise<boolean> {
  const required = await requirement();
  if (required === "off") return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, isActive: true, twoFactorEnabled: true, _count: { select: { passkeys: true } } },
  });
  if (!user?.isActive) return false;
  if (required === "admins" && !user.isAdmin) return false;
  return !user.twoFactorEnabled && user._count.passkeys === 0;
}

/**
 * Routes a session that still has to set up a second step may call: reading the own profile,
 * the set up itself, signing out, and the public pages (sign in included, so a stale cookie
 * never stops anybody from signing in again). Matched on the route pattern, never the raw URL.
 */
export const SETUP_PATH: ReadonlySet<string> = new Set([
  "GET /auth/me",
  "POST /auth/logout",
  "GET /auth/config",
  "POST /auth/login",
  "POST /auth/2fa/login",
  "POST /auth/forgot-password",
  "POST /auth/reset-password",
  "GET /auth/providers",
  "GET /auth/providers/:provider/authorize",
  "GET /auth/providers/:provider/callback",
  "GET /auth/2fa/status",
  "POST /auth/2fa/setup",
  "POST /auth/2fa/verify-setup",
  "GET /auth/passkeys",
  "POST /auth/passkeys/register/options",
  "POST /auth/passkeys/register/verify",
  "POST /auth/passkeys/login/options",
  "POST /auth/passkeys/login/verify",
  "GET /app/info",
  "GET /app/configs/public",
  "GET /health",
  "GET /invite-tokens/:token",
  "POST /register-with-invite",
]);

/**
 * Routes that need no session at all, or treat a missing one as a normal visitor (a download page,
 * a receive link, a secret, the branding images). A session that still has to set up a second step
 * is NOT refused here, and is not seen as signed in either: see registerSecondStepGate. A route
 * that is not on this list or on SETUP_PATH is refused for such a session, so a new route is safe
 * by default. Matched on the route pattern, like SETUP_PATH.
 */
export const PUBLIC_PATH: ReadonlySet<string> = new Set([
  "GET /app/system-info",
  "GET /app/background",
  "GET /app/share-cover",
  "GET /app/share-cover/og",
  "GET /app/link-preview",
  "GET /app/link-preview/og",
  "GET /embed/:id",
  "GET /files/download-url", // optional sign in: the owner may fetch their own file
  "GET /files/download", // optional sign in: the owner may fetch their own file
  "GET /shares/:shareId", // optional sign in: the owner is let in without the password
  "GET /shares/alias/:alias",
  "GET /shares/alias/:alias/metadata",
  "GET /shares/:shareId/folders/:folderId/contents",
  "GET /shares/:shareId/folders/:folderId/download",
  "GET /reverse-shares/:id/upload",
  "GET /reverse-shares/alias/:alias/upload",
  "GET /reverse-shares/alias/:alias/metadata",
  "GET /reverse-shares/alias/:alias/multipart/part-url",
  "POST /reverse-shares/:id/presigned-url",
  "POST /reverse-shares/:id/register-file",
  "POST /reverse-shares/:id/check-password",
  "POST /reverse-shares/alias/:alias/presigned-url",
  "POST /reverse-shares/alias/:alias/register-file",
  "POST /reverse-shares/alias/:alias/multipart/create",
  "POST /reverse-shares/alias/:alias/multipart/complete",
  "POST /reverse-shares/alias/:alias/multipart/abort",
  "GET /secrets/limits",
  "GET /secrets/:id/status",
  "POST /secrets/anonymous",
  "POST /secrets/:id/open",
]);

const key = (method: string, route: string) => `${method === "HEAD" ? "GET" : method} ${route}`;

export function isOnSetupPath(method: string, route: string | undefined): boolean {
  return !!route && SETUP_PATH.has(key(method, route));
}

export function isPublic(method: string, route: string | undefined): boolean {
  return !!route && PUBLIC_PATH.has(key(method, route));
}

interface SessionClaims {
  userId?: unknown;
  viaProvider?: boolean;
  viaApiKey?: boolean;
}

/**
 * The one place the requirement is enforced. Every signed in request passes here, so no route
 * has to remember it. A session that must set up gets 403 with a code the web app acts on.
 * Sessions are not touched when the setting changes: it only bites on the next request.
 */
export function registerSecondStepGate(app: FastifyInstance) {
  app.addHook("preValidation", async (request, reply) => {
    const route = request.routeOptions?.url;
    if (!route || isOnSetupPath(request.method, route)) return;
    try {
      await request.jwtVerify();
    } catch {
      return; // no valid session: the route answers 401 itself
    }
    const claims = request.user as SessionClaims;
    // A key is its own secret; an external provider is responsible for its own second step.
    if (claims.viaApiKey || claims.viaProvider || typeof claims.userId !== "string") return;
    if (await mustSetUpSecondStep(claims.userId)) {
      if (isPublic(request.method, route)) {
        // A visitor like any other: the route must not see this session, now or through its own jwtVerify.
        delete request.cookies[SESSION_COOKIE];
        delete request.headers.authorization;
        request.user = null as unknown as typeof request.user;
        return;
      }
      // A string, so a route's own 403 response schema cannot strip the code.
      return reply
        .status(403)
        .type("application/json")
        .send(JSON.stringify({ error: "Set up two step sign in before you continue.", code: SETUP_REQUIRED_CODE }));
    }
  });
}
