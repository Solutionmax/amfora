import type { FastifyInstance } from "fastify";

import { prisma } from "../../shared/prisma";

export const TWO_FACTOR_REQUIRED_VALUES = ["off", "admins", "all"] as const;
export type TwoFactorRequirement = (typeof TWO_FACTOR_REQUIRED_VALUES)[number];

export const SETUP_REQUIRED_CODE = "TWO_FACTOR_SETUP_REQUIRED";

export function assertTwoFactorRequired(value: string): void {
  if (!TWO_FACTOR_REQUIRED_VALUES.includes(value as TwoFactorRequirement)) {
    throw new Error(`twoFactorRequired must be one of: ${TWO_FACTOR_REQUIRED_VALUES.join(", ")}`);
  }
}

/** An unknown or missing value (an install from before the setting existed) means off. */
async function requirement(): Promise<TwoFactorRequirement> {
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

export function isOnSetupPath(method: string, route: string | undefined): boolean {
  return !!route && SETUP_PATH.has(`${method === "HEAD" ? "GET" : method} ${route}`);
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
      // A string, so a route's own 403 response schema cannot strip the code.
      return reply
        .status(403)
        .type("application/json")
        .send(JSON.stringify({ error: "Set up two step sign in before you continue.", code: SETUP_REQUIRED_CODE }));
    }
  });
}
