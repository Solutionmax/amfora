import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { credentialRateLimit } from "../../config/rate-limit.config";
import { env } from "../../env";
import { prisma } from "../../shared/prisma";
import { actorOf, recordRequestActivity, recordVisitorActivity } from "../activity/activity";
import { countFailure } from "../auth/login-attempts";
import { UserResponseSchema } from "../user/dto";
import { LoginVerifySchema, PasswordProofSchema, RegisterVerifySchema } from "./dto";
import * as passkeys from "./service";
import { PasskeyError, SIGN_IN_FAILED } from "./service";

const ErrorSchema = z.object({ error: z.string().describe("Error message") });
const OptionsSchema = z.record(z.string(), z.unknown());
const idParams = z.object({ id: z.string().min(1).max(64) });

async function requireSession(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: "Unauthorized: a valid token is required to access this resource." });
  }
}

const callerId = (request: FastifyRequest) => (request.user as { userId: string }).userId;

/** Turns a PasskeyError into its answer; anything else is a bug and stays a 500. */
async function guarded(reply: FastifyReply, work: () => Promise<unknown>) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof PasskeyError) return reply.status(error.status).send({ error: error.message });
    throw error;
  }
}

/** A failed sign in is counted against the account and written down, like a wrong password. */
async function recordFailure(request: FastifyRequest, error: PasskeyError) {
  const owner = error.userId
    ? await prisma.user.findUnique({ where: { id: error.userId }, select: { firstName: true, lastName: true } })
    : null;
  if (error.userId && error.countsAsFailure) await countFailure(error.userId);
  await recordVisitorActivity(request, {
    action: "account.sign_in_failed",
    ownerId: error.userId,
    actorName: owner ? `${owner.firstName} ${owner.lastName}`.trim() : null,
    detail: "passkey",
  });
}

export async function passkeyRoutes(app: FastifyInstance) {
  const tags = ["Passkeys"];

  app.get(
    "/passkeys",
    {
      preValidation: requireSession,
      schema: {
        tags,
        operationId: "listPasskeys",
        summary: "List the own passkeys",
        response: {
          200: z.object({
            passkeys: z.array(
              z.object({ id: z.string(), name: z.string(), createdAt: z.date(), lastUsedAt: z.date().nullable() })
            ),
          }),
          401: ErrorSchema,
        },
      },
    },
    async (request) => ({ passkeys: await passkeys.listPasskeys(callerId(request)) })
  );

  app.post(
    "/passkeys/register/options",
    {
      config: credentialRateLimit,
      preValidation: requireSession,
      schema: {
        tags,
        operationId: "passkeyRegistrationOptions",
        summary: "Start adding a passkey",
        description: "Needs the password. Returns the options for navigator.credentials.create().",
        body: PasswordProofSchema,
        response: { 200: OptionsSchema, 400: ErrorSchema, 401: ErrorSchema, 404: ErrorSchema },
      },
    },
    (request, reply) =>
      guarded(reply, () =>
        passkeys.registrationOptions(callerId(request), (request.body as { password: string }).password)
      )
  );

  app.post(
    "/passkeys/register/verify",
    {
      config: credentialRateLimit,
      preValidation: requireSession,
      schema: {
        tags,
        operationId: "passkeyRegistrationVerify",
        summary: "Finish adding a passkey",
        body: RegisterVerifySchema,
        response: { 200: z.object({ id: z.string(), name: z.string() }), 400: ErrorSchema, 401: ErrorSchema },
      },
    },
    (request, reply) =>
      guarded(reply, () => {
        const { response, name } = request.body as z.infer<typeof RegisterVerifySchema>;
        return passkeys.verifyRegistration(callerId(request), response, name || undefined);
      })
  );

  app.post(
    "/passkeys/:id/remove",
    {
      config: credentialRateLimit,
      preValidation: requireSession,
      schema: {
        tags,
        operationId: "removePasskey",
        summary: "Remove a passkey",
        description: "Needs the password.",
        params: idParams,
        body: PasswordProofSchema,
        response: { 200: z.object({ success: z.boolean() }), 400: ErrorSchema, 401: ErrorSchema, 404: ErrorSchema },
      },
    },
    (request, reply) =>
      guarded(reply, async () => {
        const { id } = request.params as z.infer<typeof idParams>;
        await passkeys.removePasskey(callerId(request), id, (request.body as { password: string }).password);
        return { success: true };
      })
  );

  app.post(
    "/passkeys/login/options",
    {
      config: credentialRateLimit,
      schema: {
        tags,
        operationId: "passkeyLoginOptions",
        summary: "Start signing in with a passkey",
        response: { 200: OptionsSchema, 400: ErrorSchema },
      },
    },
    (_request, reply) => guarded(reply, () => passkeys.loginOptions())
  );

  app.post(
    "/passkeys/login/verify",
    {
      config: credentialRateLimit,
      schema: {
        tags,
        operationId: "passkeyLoginVerify",
        summary: "Finish signing in with a passkey",
        description: "A complete sign in: no password and no code.",
        body: LoginVerifySchema,
        response: { 200: z.object({ user: UserResponseSchema }), 400: ErrorSchema },
      },
    },
    async (request, reply) => {
      try {
        const user = await passkeys.verifyLogin((request.body as z.infer<typeof LoginVerifySchema>).response);
        const token = await request.jwtSign({ userId: user.id, isAdmin: user.isAdmin });
        reply.setCookie("token", token, {
          httpOnly: true,
          path: "/",
          secure: env.SECURE_SITE === "true",
          sameSite: env.SECURE_SITE === "true" ? "lax" : "strict",
        });
        await recordRequestActivity(request, {
          action: "account.signed_in",
          ownerId: user.id,
          detail: "passkey",
          ...(await actorOf(user.id)),
        });
        return { user };
      } catch (error) {
        if (!(error instanceof PasskeyError)) throw error;
        if (error.message === SIGN_IN_FAILED) await recordFailure(request, error);
        return reply.status(400).send({ error: error.message });
      }
    }
  );
}
