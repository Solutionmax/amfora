import { FastifyInstance } from "fastify";
import { z } from "zod";

import { UpdateController } from "./controller";

const UpdateStatusSchema = z.object({
  currentVersion: z.string().nullable().describe("The running version"),
  latestVersion: z.string().nullable().describe("The newest signed release, if the check succeeded"),
  notes: z.string().describe("One line about the newest release"),
  releasedAt: z.string().describe("Release date of the newest release"),
  updateAvailable: z.boolean().describe("Whether the newest release is newer than the running one"),
  checkedAt: z.string().nullable().describe("When the check last ran"),
  checkError: z.string().nullable().describe("Why the last check failed, if it did"),
  canApply: z.boolean().describe("Whether over the air updating is installed on the host"),
  applying: z.boolean().describe("Whether an update is running right now"),
  checkEnabled: z.boolean().describe("Whether this installation checks for updates at all"),
});

export async function updateRoutes(app: FastifyInstance) {
  const updateController = new UpdateController();

  /**
   * Administrators only, with no first run exception: these routes reveal an outbound
   * call and can ask the host to restart the stack, so an installation that has not
   * been set up yet must not expose them either.
   */
  const adminOnly = async (request: any, reply: any) => {
    try {
      await request.jwtVerify();

      if (!request.user?.isAdmin) {
        return reply.status(403).send({ error: "Access restricted to administrators" });
      }
    } catch {
      return reply.status(401).send({ error: "Unauthorized: a valid token is required." });
    }
  };

  app.get(
    "/update/status",
    {
      preValidation: adminOnly,
      schema: {
        tags: ["Update"],
        operationId: "getUpdateStatus",
        summary: "Get update status",
        description: "Reports the running version and the newest signed release, if update checking is enabled",
        querystring: z.object({
          refresh: z
            .string()
            .optional()
            .describe("Set to true to check the update host now instead of using the cache"),
        }),
        response: {
          200: UpdateStatusSchema,
          401: z.object({ error: z.string() }),
          403: z.object({ error: z.string() }),
          500: z.object({ error: z.string() }),
        },
      },
    },
    updateController.getStatus.bind(updateController)
  );

  app.post(
    "/update/apply",
    {
      preValidation: adminOnly,
      schema: {
        tags: ["Update"],
        operationId: "applyUpdate",
        summary: "Apply the available update",
        description:
          "Asks the host to pull the signed release and restart. Requires the host side to be installed; the container never runs Docker itself.",
        response: {
          200: z.object({ message: z.string() }),
          401: z.object({ error: z.string() }),
          403: z.object({ error: z.string() }),
          409: z.object({ error: z.string() }),
          500: z.object({ error: z.string() }),
        },
      },
    },
    updateController.apply.bind(updateController)
  );
}
