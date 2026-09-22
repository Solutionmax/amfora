import assert from "node:assert/strict";
import { test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import { fastify } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { useTestDatabase } from "../test-support/test-db";

// Registering the routes reads configuration, so they need a real (throwaway) database.
const database = useTestDatabase();

test("the old unauthenticated /s3 presign and delete routes are gone", async () => {
  const { registerRoutes } = await import("./routes");
  const app = fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.register(fastifyCookie);
  app.register(fastifyJwt, { secret: "test-secret", cookie: { cookieName: "token", signed: false } });
  app.register(fastifyMultipart);
  registerRoutes(app);
  await app.ready();

  try {
    const probes = [
      { method: "POST" as const, url: "/s3/upload-url", payload: { objectName: "x", expires: 60 } },
      { method: "POST" as const, url: "/s3/download-url", payload: { objectName: "x", expires: 60 } },
      { method: "DELETE" as const, url: "/s3/object/anything" },
      { method: "GET" as const, url: "/s3/object/anything" },
      { method: "POST" as const, url: "/s3/exists", payload: { objectName: "x" } },
      { method: "GET" as const, url: "/s3/exists?objectName=x" },
    ];
    for (const probe of probes) {
      const response = await app.inject(probe);
      assert.equal(response.statusCode, 404, `${probe.method} ${probe.url} answered ${response.statusCode}`);
    }
    // Sanity check that the routes are really registered, so the 404s above mean something.
    assert.notEqual((await app.inject({ method: "GET", url: "/health" })).statusCode, 404);
  } finally {
    await app.close();
    const { prisma } = await import("./shared/prisma");
    await prisma.$disconnect();
    database.cleanup();
  }
});
