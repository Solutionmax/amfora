import type { FastifyInstance } from "fastify";

import { prisma } from "../../shared/prisma";
import { extractApiKey, hashApiKey, isRouteAllowed } from "./key";

/** How often the "last used" time of a key is written, at most. */
const LAST_USED_INTERVAL_MS = 60_000;

/**
 * Lets a request authenticate with an API key instead of a session.
 *
 * Every protected route calls request.jwtVerify(). Rather than touching all of them, a valid
 * key is swapped here for a one minute session token of its owner, so the routes work
 * unchanged. The token never leaves the server. It never carries admin rights, and the route
 * is checked against the key's scope first, so a key cannot reach accounts, settings or keys.
 */
export function registerApiKeyAuth(app: FastifyInstance) {
  app.addHook("onRequest", async (request, reply) => {
    const token = extractApiKey(request.headers);
    if (!token) return;

    const key = await prisma.apiKey.findUnique({
      where: { hash: hashApiKey(token) },
      include: { user: { select: { isActive: true } } },
    });

    const now = new Date();
    if (!key || !key.user.isActive || (key.expiresAt && key.expiresAt <= now)) {
      return reply.status(401).send({ error: "Invalid or expired API key." });
    }

    if (!isRouteAllowed(key.scope, request.method, request.routeOptions.url)) {
      return reply.status(403).send({ error: "This API key is not allowed to call this endpoint." });
    }

    if (!key.lastUsedAt || now.getTime() - key.lastUsedAt.getTime() > LAST_USED_INTERVAL_MS) {
      prisma.apiKey
        .update({ where: { id: key.id }, data: { lastUsedAt: now } })
        .catch((err) => console.error("API key: could not record last use:", err));
    }

    // The key decides who the caller is. A session cookie sent along must not.
    delete request.headers.cookie;
    request.cookies = {};
    delete request.headers["x-api-key"];
    request.headers.authorization = `Bearer ${app.jwt.sign({ userId: key.userId, isAdmin: false, viaApiKey: true }, { expiresIn: "1m" })}`;
  });
}
