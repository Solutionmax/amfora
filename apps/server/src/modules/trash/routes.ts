import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { listTrash, PurgeIncompleteError, purgeItem, restoreItem, startEmptyTrash } from "./service";

const ErrorSchema = z.object({ error: z.string() });
const ItemParams = z.object({ kind: z.enum(["file", "folder"]), id: z.string().min(1).max(64) });
const NOT_FOUND = "Nothing with that id is in your trash.";

export async function trashRoutes(app: FastifyInstance) {
  // Always the caller's own trash: every query below starts from the id in the session.
  const preValidation = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: "Unauthorized: a valid token is required to access this resource." });
    }
  };
  const userIdOf = (request: FastifyRequest) => (request.user as { userId: string }).userId;

  app.get(
    "/trash",
    {
      preValidation,
      schema: {
        tags: ["Trash"],
        operationId: "listTrash",
        summary: "Your trash",
        description: "What you deleted, newest first. A folder is one line. Sizes in bytes.",
        response: {
          200: z.object({
            items: z.array(
              z.object({
                kind: z.enum(["file", "folder"]),
                id: z.string(),
                name: z.string(),
                size: z.number(),
                fileCount: z.number(),
                place: z.string().nullable().describe("The folder it was in, as a path"),
                deletedAt: z.date(),
                daysLeft: z.number().describe("Days until it is removed for good"),
              })
            ),
            totalBytes: z.number().describe("Everything in the trash. It counts toward your storage limit."),
            retentionDays: z.number(),
            emptying: z
              .object({ running: z.boolean(), removed: z.number(), failed: z.number() })
              .describe("Emptying the trash: running now, and what the last run did. `failed` stays in the trash."),
          }),
          401: ErrorSchema,
        },
      },
    },
    async (request, reply) => reply.send(await listTrash(userIdOf(request), new Date()))
  );

  app.post(
    "/trash/:kind/:id/restore",
    {
      preValidation,
      schema: {
        tags: ["Trash"],
        operationId: "restoreFromTrash",
        summary: "Restore",
        description: "Puts a file, or a folder with what went with it, back where it was.",
        params: ItemParams,
        response: { 200: z.object({ message: z.string() }), 401: ErrorSchema, 404: ErrorSchema },
      },
    },
    async (request, reply) => {
      const { kind, id } = request.params as z.infer<typeof ItemParams>;
      if (!(await restoreItem(userIdOf(request), kind, id))) return reply.status(404).send({ error: NOT_FOUND });
      return reply.send({ message: "Restored." });
    }
  );

  app.delete(
    "/trash/:kind/:id",
    {
      preValidation,
      schema: {
        tags: ["Trash"],
        operationId: "deleteFromTrashForGood",
        summary: "Delete for good",
        description: "Removes a file, or a folder with everything in it, from storage. This cannot be undone.",
        params: ItemParams,
        response: {
          200: z.object({ message: z.string() }),
          401: ErrorSchema,
          404: ErrorSchema,
          409: ErrorSchema,
          500: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const { kind, id } = request.params as z.infer<typeof ItemParams>;
      try {
        if (!(await purgeItem(userIdOf(request), kind, id))) return reply.status(404).send({ error: NOT_FOUND });
        return reply.send({ message: "Deleted for good." });
      } catch (error) {
        if (error instanceof PurgeIncompleteError) return reply.status(409).send({ error: error.message });
        console.error("Error deleting from the trash:", error);
        return reply.status(500).send({ error: "Internal server error." });
      }
    }
  );

  app.delete(
    "/trash",
    {
      preValidation,
      schema: {
        tags: ["Trash"],
        operationId: "emptyTrash",
        summary: "Empty the trash",
        description:
          "Starts deleting everything in your trash for good and answers at once. Follow it in `emptying` of the list. A second call while it runs answers `running`.",
        response: { 202: z.object({ status: z.enum(["started", "running"]) }), 401: ErrorSchema },
      },
    },
    async (request, reply) => reply.status(202).send({ status: startEmptyTrash(userIdOf(request), new Date()) })
  );
}
