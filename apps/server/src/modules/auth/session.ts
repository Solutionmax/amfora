import { createHash, randomBytes } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";

import { prisma } from "../../shared/prisma";
import { isPublic } from "../two-factor/second-step";

// A bridge token is accepted only on the request on which the API key was checked.
export class SessionError extends Error {}
export function isInvalidSessionError(error: unknown): boolean {
  return (
    error instanceof SessionError ||
    (typeof (error as any)?.code === "string" && (error as any).code.startsWith("FST_JWT_"))
  );
}
export const apiKeyRequests = new WeakSet<FastifyRequest>();
export type SessionClaims = {
  userId: string;
  sid: string;
  version: number;
  isAdmin: boolean;
  viaProvider?: boolean;
  viaApiKey?: boolean;
};
export const secretHash = (value: string) => createHash("sha256").update(value).digest("hex");
export const newSecret = () => randomBytes(32).toString("hex");

export async function sessionClaims(
  userId: string,
  viaProvider = false,
  verifiedVersion?: number
): Promise<SessionClaims> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user?.isActive) throw new SessionError("Account is inactive or missing");
    if (verifiedVersion !== undefined && user.sessionVersion !== verifiedVersion)
      throw new SessionError("Credentials changed. Sign in again.");
    await tx.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    const session = await tx.session.create({
      data: {
        id: newSecret(),
        userId,
        version: user.sessionVersion,
        viaProvider,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    return { userId, sid: session.id, version: user.sessionVersion, isAdmin: user.isAdmin, viaProvider };
  });
}
export async function issueSession(
  request: FastifyRequest,
  userId: string,
  verifiedVersion: number,
  viaProvider = false
) {
  if (!Number.isInteger(verifiedVersion)) throw new SessionError("Verified credential version required");
  return request.jwtSign(await sessionClaims(userId, viaProvider, verifiedVersion));
}
export async function validSession(request: FastifyRequest, claims: any): Promise<SessionClaims | null> {
  if (typeof claims?.userId !== "string") return null;
  const user = await prisma.user.findUnique({ where: { id: claims.userId } });
  if (!user?.isActive) return null;
  if (apiKeyRequests.has(request) && claims.viaApiKey === true) return { ...claims, isAdmin: false };
  if (typeof claims.sid !== "string" || !Number.isInteger(claims.version) || claims.version !== user.sessionVersion)
    return null;
  const session = await prisma.session.findUnique({ where: { id: claims.sid } });
  if (
    !session ||
    session.userId !== user.id ||
    session.version !== user.sessionVersion ||
    session.expiresAt.getTime() <= Date.now()
  )
    return null;
  return { ...claims, isAdmin: user.isAdmin, viaApiKey: false, viaProvider: session.viaProvider };
}
/** Wrapping the existing verifier makes every current/future jwtVerify path enforce DB validity. */
export function registerSessionGuard(app: FastifyInstance) {
  app.addHook("onRequest", async (request) => {
    const verify = request.jwtVerify.bind(request);
    request.jwtVerify = ((options?: any, callback?: any) => {
      if (typeof options === "function") {
        callback = options;
        options = undefined;
      }
      const operation = (async () => {
        // The plugin's promise overload calls this method recursively, so use its callback overload internally.
        const decoded = await new Promise((resolve, reject) => {
          (verify as any)(options, (error: Error | null, value: unknown) => (error ? reject(error) : resolve(value)));
        });
        const claims = await validSession(request, decoded);
        if (!claims) {
          request.user = null as any;
          throw new SessionError("Invalid or revoked session");
        }
        request.user = claims as any;
        return claims;
      })();
      if (callback) {
        operation.then(
          (value) => callback(null, value),
          (error) => callback(error)
        );
        return;
      }
      return operation;
    }) as typeof request.jwtVerify;
  });
  app.addHook("preValidation", async (request, reply) => {
    if (!request.cookies.token && !request.headers.authorization) return;
    try {
      await request.jwtVerify();
    } catch (error) {
      const route = request.routeOptions.url;
      if (route === "/auth/logout" && !isInvalidSessionError(error)) {
        request.log.error({ err: error }, "Session lookup failed during logout");
        return reply
          .status(503)
          .type("application/json")
          .send(JSON.stringify({ error: "Session revocation failed. Try again." }));
      }
      const anonymousAuth = [
        "/auth/me",
        "/auth/logout",
        "/auth/config",
        "/auth/login",
        "/auth/2fa/login",
        "/auth/forgot-password",
        "/auth/reset-password",
        "/auth/providers",
        "/auth/providers/:provider/authorize",
        "/auth/providers/:provider/callback",
        "/auth/passkeys/login/options",
        "/auth/passkeys/login/verify",
      ].includes(route ?? "");
      if (isPublic(request.method, route) || anonymousAuth) {
        delete request.cookies.token;
        delete request.headers.authorization;
        request.user = null as any;
        return;
      }
      return reply
        .status(401)
        .type("application/json")
        .send(JSON.stringify({ error: "Invalid or revoked session" }));
    }
  });
}
export async function createCredentialProof(claims: SessionClaims): Promise<string> {
  const secret = newSecret();
  await prisma.credentialProof.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  await prisma.credentialProof.create({
    data: {
      id: secretHash(secret),
      userId: claims.userId,
      sessionId: claims.sid,
      sessionVersion: claims.version,
      expiresAt: new Date(Date.now() + 300000),
    },
  });
  return secret;
}
