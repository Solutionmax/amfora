import type { FastifyReply, FastifyRequest } from "fastify";

import { prisma } from "./prisma";

/**
 * When an unauthenticated request may pass because the installation is not set up yet.
 * - "none": never. For routes that have nothing to do with setup.
 * - "noUsers": only while there is no user at all (creating the very first account).
 * - "setup": no user yet, or exactly one user while the firstUserAccess flag is still on.
 */
export type FirstRunPolicy = "none" | "noUsers" | "setup";

export interface AccountState {
  isAdmin: boolean;
  isActive: boolean;
}

/** The slice of the Prisma client the guard needs, so tests can hand in a fake. */
export interface AdminGuardDb {
  user: {
    count(): Promise<number>;
    findUnique(args: {
      where: { id: string };
      select: { isAdmin: true; isActive: true };
    }): Promise<AccountState | null>;
  };
  appConfig: {
    findUnique(args: { where: { key: string } }): Promise<{ value: string } | null>;
  };
}

const prismaDb = prisma as unknown as AdminGuardDb;

const UNAUTHORIZED = { error: "Unauthorized: a valid token is required to access this resource." };
const FORBIDDEN = { error: "Access restricted to administrators" };

export async function isFirstRun(db: AdminGuardDb, policy: FirstRunPolicy): Promise<boolean> {
  if (policy === "none") return false;
  const usersCount = await db.user.count();
  if (usersCount === 0) return true;
  if (policy !== "setup" || usersCount !== 1) return false;
  const flag = await db.appConfig.findUnique({ where: { key: "firstUserAccess" } });
  return flag?.value === "true";
}

/**
 * The account behind a token, read from the database. The token itself is valid for a day
 * and its isAdmin claim goes stale the moment an admin is demoted or deactivated, so every
 * privilege decision uses this instead of the claim.
 */
export async function loadAccount(userId: unknown, db: AdminGuardDb = prismaDb): Promise<AccountState | null> {
  if (typeof userId !== "string" || !userId) return null;
  return db.user.findUnique({ where: { id: userId }, select: { isAdmin: true, isActive: true } });
}

/**
 * preValidation hook for administrator routes. Verifies the token, then loads the user and
 * requires an active admin. On success request.user.isAdmin reflects the database, so a
 * handler that reads it later sees the current state rather than the claim in the token.
 */
export function createAdminGuard(options: { firstRun?: FirstRunPolicy; db?: AdminGuardDb } = {}) {
  const db = options.db ?? prismaDb;
  const firstRun = options.firstRun ?? "none";

  return async function adminGuard(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (await isFirstRun(db, firstRun)) return;
    } catch (err) {
      console.error("Admin guard: first run check failed:", err);
      return reply.status(500).send({ error: "Unable to validate administrator access" });
    }

    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send(UNAUTHORIZED);
    }

    const tokenUser = request.user as { userId?: unknown } | undefined;
    let account: AccountState | null;
    try {
      account = await loadAccount(tokenUser?.userId, db);
    } catch (err) {
      console.error("Admin guard: user lookup failed:", err);
      return reply.status(500).send({ error: "Unable to validate administrator access" });
    }

    if (!tokenUser?.userId) return reply.status(401).send(UNAUTHORIZED);
    if (!account?.isActive || !account.isAdmin) return reply.status(403).send(FORBIDDEN);

    request.user = { ...(request.user as object), isAdmin: true };
  };
}
