import { FastifyReply, FastifyRequest } from "fastify";

import { readCurrentVersion } from "./current-version";
import { UpdateService } from "./service";

const updateService = new UpdateService(readCurrentVersion());

export class UpdateController {
  async getStatus(request: FastifyRequest, reply: FastifyReply) {
    const { refresh } = request.query as { refresh?: string };

    try {
      return reply.send(await updateService.getStatus({ force: refresh === "true" }));
    } catch (error) {
      console.error("Error reading update status:", error);
      return reply.status(500).send({ error: "Internal server error." });
    }
  }

  async getProgress(_request: FastifyRequest, reply: FastifyReply) {
    try {
      return reply.send(await updateService.getProgress());
    } catch (error) {
      console.error("Error reading update progress:", error);
      return reply.status(500).send({ error: "Internal server error." });
    }
  }

  async apply(request: FastifyRequest, reply: FastifyReply) {
    try {
      const result = await updateService.requestApply();

      if (!result.requested) {
        return reply.status(409).send({ error: result.reason ?? "the update could not be started" });
      }

      return reply.send({ message: "The host has been asked to apply the update." });
    } catch (error) {
      console.error("Error requesting an update:", error);
      return reply.status(500).send({ error: "Internal server error." });
    }
  }
}
