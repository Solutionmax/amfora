import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { prisma } from "../../shared/prisma";
import { generateApiKey } from "./key";

/** Keys one user may hold. Enough for every tool they connect, small enough to keep an overview. */
const MAX_KEYS_PER_USER = 20;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const ApiKeySchema = z.object({
  id: z.string(),
  name: z.string(),
  prefix: z.string().describe("First characters of the key"),
  scope: z.string().describe("read or full"),
  lastUsedAt: z.date().nullable(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
});

const CreateApiKeySchema = z.object({
  name: z.string().trim().min(1).max(60).describe("What the key is for"),
  scope: z.enum(["read", "full"]).describe("read: list and download. full: also create, change and delete."),
  expiresInDays: z.number().int().min(1).max(3650).optional().describe("Leave out for a key that never expires"),
});

const ErrorSchema = z.object({ error: z.string() });

const publicFields = {
  id: true,
  name: true,
  prefix: true,
  scope: true,
  lastUsedAt: true,
  expiresAt: true,
  createdAt: true,
} as const;

/**
 * Managing API keys. Only a signed-in session reaches these: the routes are outside every
 * key scope, so a leaked key cannot mint or delete keys.
 */
export async function apiKeyRoutes(app: FastifyInstance) {
  const preValidation = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: "Unauthorized: a valid token is required to access this resource." });
    }
  };

  const userIdOf = (request: FastifyRequest) => (request.user as { userId: string }).userId;

  app.get(
    "/api-keys",
    {
      preValidation,
      schema: {
        tags: ["API Keys"],
        operationId: "listApiKeys",
        summary: "List API Keys",
        description: "The API keys of the signed-in user. The keys themselves are never returned.",
        response: { 200: z.object({ apiKeys: z.array(ApiKeySchema) }), 401: ErrorSchema },
      },
    },
    async (request, reply) => {
      const apiKeys = await prisma.apiKey.findMany({
        where: { userId: userIdOf(request) },
        select: publicFields,
        orderBy: { createdAt: "desc" },
      });
      return reply.send({ apiKeys });
    }
  );

  app.post(
    "/api-keys",
    {
      preValidation,
      schema: {
        tags: ["API Keys"],
        operationId: "createApiKey",
        summary: "Create API Key",
        description: "Creates a key that acts as the signed-in user. The key is returned once, in this response.",
        body: CreateApiKeySchema,
        response: {
          201: z.object({ apiKey: ApiKeySchema, token: z.string().describe("The key. Shown only now.") }),
          400: ErrorSchema,
          401: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = userIdOf(request);
      const { name, scope, expiresInDays } = request.body as z.infer<typeof CreateApiKeySchema>;

      const owner = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } });
      if (!owner?.isActive) return reply.status(401).send({ error: "Unauthorized: this account is not active." });

      if ((await prisma.apiKey.count({ where: { userId } })) >= MAX_KEYS_PER_USER) {
        return reply.status(400).send({ error: `You can have at most ${MAX_KEYS_PER_USER} API keys.` });
      }

      const { token, hash, prefix } = generateApiKey();
      const apiKey = await prisma.apiKey.create({
        data: {
          name,
          scope,
          hash,
          prefix,
          userId,
          expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * MS_PER_DAY) : null,
        },
        select: publicFields,
      });
      return reply.status(201).send({ apiKey, token });
    }
  );

  app.delete(
    "/api-keys/:id",
    {
      preValidation,
      schema: {
        tags: ["API Keys"],
        operationId: "deleteApiKey",
        summary: "Delete API Key",
        description: "Removes one of the signed-in user's keys. It stops working at once.",
        params: z.object({ id: z.string() }),
        response: { 200: z.object({ success: z.boolean() }), 401: ErrorSchema, 404: ErrorSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { count } = await prisma.apiKey.deleteMany({ where: { id, userId: userIdOf(request) } });
      if (count === 0) return reply.status(404).send({ error: "API key not found" });
      return reply.send({ success: true });
    }
  );
}
