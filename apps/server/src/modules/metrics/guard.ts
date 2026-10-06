import type { FastifyReply, FastifyRequest } from "fastify";

import { loadAccount } from "../../shared/admin-guard";

/**
 * The figures are for machines: only an API key of an active administrator opens them.
 * A browser session of an administrator is not enough, and a key carries no rights of its
 * own, so the owner is read from the database.
 */
export async function adminApiKeyOnly(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: "An API key is required." });
  }
  const claims = request.user as { userId?: unknown; viaApiKey?: boolean };
  if (!claims.viaApiKey) {
    return reply.status(403).send({ error: "Use the API key of an administrator. A browser session is not accepted." });
  }
  const account = await loadAccount(claims.userId);
  if (!account?.isActive || !account.isAdmin) {
    return reply.status(403).send({ error: "Only the API key of an administrator may read the figures." });
  }
}
