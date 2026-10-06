import type { FastifyInstance } from "fastify";

import { cachedMetrics } from "./collect";
import { adminApiKeyOnly } from "./guard";

export async function metricsRoutes(app: FastifyInstance) {
  app.get(
    "/metrics",
    {
      preValidation: adminApiKeyOnly,
      schema: {
        tags: ["Metrics"],
        operationId: "getMetrics",
        summary: "Figures for monitoring",
        description:
          "Prometheus text format. Only the API key of an administrator is accepted. The answer is cached for 30 seconds.",
      },
    },
    async (_request, reply) => {
      const body = await cachedMetrics();
      return reply.type("text/plain; version=0.0.4; charset=utf-8").header("cache-control", "no-store").send(body);
    }
  );
}
