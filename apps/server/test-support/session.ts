import { randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";

/** Explicit database-backed fixture for an already issued browser session, including stale-claim tests. */
export async function testSession(app: FastifyInstance, claims: Record<string, any>): Promise<string> {
  const { prisma } = await import("../src/shared/prisma");
  const user =
    typeof claims.userId === "string" ? await prisma.user.findUnique({ where: { id: claims.userId } }) : null;
  if (!user) return app.jwt.sign(claims);
  const session = await prisma.session.create({
    data: {
      id: randomBytes(32).toString("hex"),
      userId: user.id,
      version: user.sessionVersion,
      viaProvider: claims.viaProvider === true,
      expiresAt: new Date(Date.now() + 86400000),
    },
  });
  return app.jwt.sign({ ...claims, sid: session.id, version: session.version });
}
