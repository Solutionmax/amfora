import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { sharePasswordRateLimit } from "../../config/rate-limit.config";
import { createAdminGuard } from "../../shared/admin-guard";
import { prisma } from "../../shared/prisma";
import { actorOf, recordRequestActivity } from "../activity/activity";
import { afterSecretOpened } from "../activity/notify";
import {
  hashVerifier,
  limitError,
  MAX_FAILED_ATTEMPTS,
  newSecretId,
  SECRET_CONFIG_KEYS,
  secretSettings,
  secretStatus,
  verifierMatches,
  type SecretLimits,
} from "./secret";

/** Secrets one user may have waiting. Old ones make room as they are opened or expire. */
const MAX_WAITING_PER_USER = 200;

/** Secrets without an owner that may wait at once, so strangers cannot fill the disk. */
const MAX_WAITING_ANONYMOUS = 5000;

const MS_PER_HOUR = 60 * 60 * 1000;
const MAX_LABEL_LENGTH = 80;
/** Ceiling for any installation; the configured limits are checked on top of it. */
const MAX_CIPHERTEXT_LENGTH = 400_000;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

const CreateSecretSchema = z.object({
  ciphertext: z.string().min(1).max(MAX_CIPHERTEXT_LENGTH).regex(BASE64URL).describe("The text, sealed in the browser"),
  proof: z.string().min(20).max(100).regex(BASE64URL).describe("Proves a reader holds the link"),
  verifier: z.string().min(20).max(100).regex(BASE64URL).describe("Proves a reader also knows the passphrase"),
  hasPassphrase: z.boolean(),
  label: z.string().trim().max(MAX_LABEL_LENGTH).optional().describe("Only the maker sees this"),
  expiresInHours: z.number().int().min(1),
  maxOpens: z.number().int().min(1),
});
type CreateSecretBody = z.infer<typeof CreateSecretSchema>;

const SecretSchema = z.object({
  id: z.string(),
  label: z.string().nullable(),
  status: z.enum(["waiting", "used", "expired", "burned"]),
  hasPassphrase: z.boolean(),
  maxOpens: z.number(),
  opens: z.number(),
  expiresAt: z.date(),
  lastOpenedAt: z.date().nullable(),
  createdAt: z.date(),
});

const CreatedSchema = z.object({ id: z.string(), expiresAt: z.date() });
const ErrorSchema = z.object({ error: z.string() });
const IdParams = z.object({ id: z.string().min(1).max(64) });

const GONE = { error: "This secret is no longer available." };

async function loadSettings() {
  return secretSettings(await prisma.appConfig.findMany({ where: { key: { in: SECRET_CONFIG_KEYS } } }));
}

/**
 * Drops the sealed text of every secret that ran out of time, and forgets spent secrets that
 * nobody owns. Runs on the way in, so no timer is needed and an expired text never lingers
 * past the next request.
 */
async function sweep(now: Date) {
  await prisma.secret.updateMany({
    where: { ciphertext: { not: null }, expiresAt: { lte: now } },
    data: { ciphertext: null },
  });
  await prisma.secret.deleteMany({ where: { creatorId: null, ciphertext: null } });
}

async function store(body: CreateSecretBody, creatorId: string | null) {
  return prisma.secret.create({
    data: {
      id: newSecretId(),
      label: creatorId ? body.label || null : null,
      ciphertext: body.ciphertext,
      proofHash: hashVerifier(body.proof),
      verifierHash: hashVerifier(body.verifier),
      hasPassphrase: body.hasPassphrase,
      maxOpens: body.maxOpens,
      expiresAt: new Date(Date.now() + body.expiresInHours * MS_PER_HOUR),
      creatorId,
    },
    select: { id: true, expiresAt: true },
  });
}

export async function secretRoutes(app: FastifyInstance) {
  const preValidation = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: "Unauthorized: a valid token is required to access this resource." });
    }
  };

  const userIdOf = (request: FastifyRequest) => (request.user as { userId: string }).userId;

  const publicLimits = (limits: SecretLimits) => ({
    maxHours: limits.maxHours,
    maxOpens: limits.maxOpens,
    maxLength: limits.maxLength,
  });

  app.get(
    "/secrets/limits",
    {
      schema: {
        tags: ["Secrets"],
        operationId: "getSecretLimits",
        summary: "Limits for new secrets",
        description: "What a new secret may ask for, with and without an account.",
        response: {
          200: z.object({
            anonymousEnabled: z.boolean(),
            anonymous: z.object({ maxHours: z.number(), maxOpens: z.number(), maxLength: z.number() }),
            signedIn: z.object({ maxHours: z.number(), maxOpens: z.number(), maxLength: z.number() }),
          }),
        },
      },
    },
    async (_request, reply) => {
      const settings = await loadSettings();
      return reply.send({
        anonymousEnabled: settings.anonymousEnabled,
        anonymous: publicLimits(settings.anonymous),
        signedIn: publicLimits(settings.signedIn),
      });
    }
  );

  app.get(
    "/secrets/stats",
    {
      preValidation: createAdminGuard(),
      schema: {
        tags: ["Secrets"],
        operationId: "getSecretStats",
        summary: "How many secrets without an owner are waiting",
        description: "For administrators. A number only: these secrets cannot be read or listed by anyone.",
        response: { 200: z.object({ anonymousWaiting: z.number() }), 401: ErrorSchema, 403: ErrorSchema },
      },
    },
    async (_request, reply) => {
      await sweep(new Date());
      const anonymousWaiting = await prisma.secret.count({ where: { creatorId: null, ciphertext: { not: null } } });
      return reply.send({ anonymousWaiting });
    }
  );

  app.get(
    "/secrets",
    {
      preValidation,
      schema: {
        tags: ["Secrets"],
        operationId: "listSecrets",
        summary: "List secrets",
        description: "The secrets the signed-in user made. The text itself is never returned here.",
        response: { 200: z.object({ secrets: z.array(SecretSchema) }), 401: ErrorSchema },
      },
    },
    async (request, reply) => {
      const now = new Date();
      await sweep(now);
      const rows = await prisma.secret.findMany({
        where: { creatorId: userIdOf(request) },
        orderBy: { createdAt: "desc" },
      });
      const secrets = rows.map((row) => ({
        id: row.id,
        label: row.label,
        status: secretStatus(row, now),
        hasPassphrase: row.hasPassphrase,
        maxOpens: row.maxOpens,
        opens: row.opens,
        expiresAt: row.expiresAt,
        lastOpenedAt: row.lastOpenedAt,
        createdAt: row.createdAt,
      }));
      return reply.send({ secrets });
    }
  );

  app.post(
    "/secrets",
    {
      preValidation,
      schema: {
        tags: ["Secrets"],
        operationId: "createSecret",
        summary: "Create a secret",
        description: "Stores a text that was sealed in the browser. The server cannot read it.",
        body: CreateSecretSchema,
        response: { 201: CreatedSchema, 400: ErrorSchema, 401: ErrorSchema },
      },
    },
    async (request, reply) => {
      const userId = userIdOf(request);
      const body = request.body as CreateSecretBody;

      const owner = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } });
      if (!owner?.isActive) return reply.status(401).send({ error: "Unauthorized: this account is not active." });

      const refusal = limitError(body, (await loadSettings()).signedIn);
      if (refusal) return reply.status(400).send({ error: refusal });

      await sweep(new Date());
      const waiting = await prisma.secret.count({ where: { creatorId: userId, ciphertext: { not: null } } });
      if (waiting >= MAX_WAITING_PER_USER) {
        return reply.status(400).send({ error: `You can have at most ${MAX_WAITING_PER_USER} secrets waiting.` });
      }

      const created = await store(body, userId);
      await recordRequestActivity(request, {
        action: "secret.created",
        ownerId: userId,
        subject: body.label || null,
        subjectId: created.id,
        ...(await actorOf(userId)),
      });
      return reply.status(201).send(created);
    }
  );

  app.post(
    "/secrets/anonymous",
    {
      config: {
        rateLimit: {
          // Read per request, so a change in Settings counts at once.
          max: async () => (await loadSettings()).anonymousPerHour,
          timeWindow: "1 hour",
        },
      },
      schema: {
        tags: ["Secrets"],
        operationId: "createAnonymousSecret",
        summary: "Create a secret without an account",
        description: "Only when an administrator switched this on. Tighter limits apply.",
        body: CreateSecretSchema,
        response: { 201: CreatedSchema, 400: ErrorSchema, 403: ErrorSchema },
      },
    },
    async (request, reply) => {
      const body = request.body as CreateSecretBody;
      const settings = await loadSettings();
      if (!settings.anonymousEnabled) {
        return reply.status(403).send({ error: "Secrets without an account are switched off." });
      }

      const refusal = limitError(body, settings.anonymous);
      if (refusal) return reply.status(400).send({ error: refusal });

      await sweep(new Date());
      const waiting = await prisma.secret.count({ where: { creatorId: null, ciphertext: { not: null } } });
      if (waiting >= MAX_WAITING_ANONYMOUS) {
        return reply.status(400).send({ error: "Too many secrets are waiting. Try again later." });
      }

      return reply.status(201).send(await store(body, null));
    }
  );

  app.get(
    "/secrets/:id/status",
    {
      schema: {
        tags: ["Secrets"],
        operationId: "getSecretStatus",
        summary: "Whether a secret can still be opened",
        description: "Does not count as opening it, so a link preview cannot use the secret up.",
        params: IdParams,
        response: {
          200: z.object({ hasPassphrase: z.boolean(), opensLeft: z.number() }),
          404: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as z.infer<typeof IdParams>;
      const now = new Date();
      await sweep(now);
      const secret = await prisma.secret.findUnique({ where: { id } });
      if (!secret?.ciphertext || secretStatus(secret, now) !== "waiting") return reply.status(404).send(GONE);
      return reply.send({ hasPassphrase: secret.hasPassphrase, opensLeft: secret.maxOpens - secret.opens });
    }
  );

  app.post(
    "/secrets/:id/open",
    {
      config: sharePasswordRateLimit,
      schema: {
        tags: ["Secrets"],
        operationId: "openSecret",
        summary: "Open a secret",
        description: "Hands out the sealed text once per allowed opening, then destroys it.",
        params: IdParams,
        body: z.object({ proof: z.string().min(1).max(100), verifier: z.string().min(1).max(100) }),
        response: {
          200: z.object({ ciphertext: z.string(), opensLeft: z.number() }),
          403: z.object({ error: z.string(), attemptsLeft: z.number() }),
          404: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as z.infer<typeof IdParams>;
      const { proof, verifier } = request.body as { proof: string; verifier: string };
      const now = new Date();
      await sweep(now);

      const secret = await prisma.secret.findUnique({ where: { id } });
      if (!secret?.ciphertext || secretStatus(secret, now) !== "waiting") return reply.status(404).send(GONE);

      // The id alone shows up in logs and link previews. Without the link itself a caller
      // learns nothing and costs the secret nothing.
      if (!verifierMatches(proof, secret.proofHash)) return reply.status(404).send(GONE);

      if (secret.hasPassphrase) {
        // A try is taken before the passphrase is judged, so guesses sent at the same moment
        // cannot be weighed against more tries than are left.
        const taken = await prisma.secret.updateMany({
          where: { id, ciphertext: { not: null }, failedAttempts: { lt: MAX_FAILED_ATTEMPTS } },
          data: { failedAttempts: { increment: 1 } },
        });
        if (taken.count === 0) return reply.status(404).send(GONE);

        if (!verifierMatches(verifier, secret.verifierHash)) {
          const failed = await prisma.secret.findUnique({ where: { id }, select: { failedAttempts: true } });
          const attemptsLeft = Math.max(MAX_FAILED_ATTEMPTS - (failed?.failedAttempts ?? MAX_FAILED_ATTEMPTS), 0);
          if (attemptsLeft === 0) {
            await prisma.secret.updateMany({ where: { id }, data: { ciphertext: null } });
            await recordRequestActivity(request, {
              action: "secret.destroyed",
              ownerId: secret.creatorId,
              subject: secret.label,
              subjectId: id,
            });
            return reply.status(404).send(GONE);
          }
          return reply.status(403).send({ error: "Wrong passphrase.", attemptsLeft });
        }

        // The right passphrase gives its try back.
        await prisma.secret.updateMany({ where: { id }, data: { failedAttempts: { decrement: 1 } } });
      } else if (!verifierMatches(verifier, secret.verifierHash)) {
        return reply.status(404).send(GONE);
      }

      // The count goes up only while openings are left, so two readers at once cannot both
      // take the last one.
      const { count } = await prisma.secret.updateMany({
        where: { id, ciphertext: { not: null }, opens: { lt: secret.maxOpens } },
        data: { opens: { increment: 1 }, lastOpenedAt: now },
      });
      if (count === 0) return reply.status(404).send(GONE);

      await prisma.secret.updateMany({
        where: { id, opens: { gte: secret.maxOpens } },
        data: { ciphertext: null },
      });
      const after = await prisma.secret.findUnique({ where: { id }, select: { opens: true } });
      const opens = after?.opens ?? secret.maxOpens;
      const opensLeft = Math.max(secret.maxOpens - opens, 0);

      const place = await recordRequestActivity(request, {
        action: "secret.opened",
        ownerId: secret.creatorId,
        subject: secret.label,
        subjectId: id,
        detail: `${opens}/${secret.maxOpens}`,
      });
      void afterSecretOpened({
        secret: { id, label: secret.label, creatorId: secret.creatorId, opens, maxOpens: secret.maxOpens },
        place,
      });

      return reply.header("Cache-Control", "no-store").send({ ciphertext: secret.ciphertext, opensLeft });
    }
  );

  app.delete(
    "/secrets/:id",
    {
      preValidation,
      schema: {
        tags: ["Secrets"],
        operationId: "deleteSecret",
        summary: "Delete a secret",
        description: "Removes one of the signed-in user's secrets. Its link stops working at once.",
        params: IdParams,
        response: { 200: z.object({ success: z.boolean() }), 401: ErrorSchema, 404: ErrorSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as z.infer<typeof IdParams>;
      const userId = userIdOf(request);
      const secret = await prisma.secret.findFirst({ where: { id, creatorId: userId }, select: { label: true } });
      const { count } = await prisma.secret.deleteMany({ where: { id, creatorId: userId } });
      if (count === 0) return reply.status(404).send({ error: "Secret not found" });
      await recordRequestActivity(request, {
        action: "secret.deleted",
        ownerId: userId,
        subject: secret?.label ?? null,
        subjectId: id,
        ...(await actorOf(userId)),
      });
      return reply.send({ success: true });
    }
  );
}
