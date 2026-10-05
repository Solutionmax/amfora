import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fastify, FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { useTestDatabase } from "../../../test-support/test-db";

const database = useTestDatabase();

let app: FastifyInstance;
let prisma: typeof import("../../shared/prisma").prisma;

before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  const { appRoutes } = await import("./routes");
  app = fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(appRoutes);
  await app.ready();
});

after(async () => {
  await app?.close();
  await prisma?.$disconnect();
  database.cleanup();
});

const publicConfigs = async () => {
  const response = await app.inject({ method: "GET", url: "/app/configs/public" });
  assert.equal(response.statusCode, 200);
  return new Map((response.json().configs as Array<{ key: string; value: string }>).map((c) => [c.key, c.value]));
};

test("anyone can read whether the administrator has the notification mails on", async () => {
  await prisma.appConfig.update({ where: { key: "notifyDownloadEnabled" }, data: { value: "false" } });
  const configs = await publicConfigs();
  assert.equal(configs.get("notifyDownloadEnabled"), "false");
  assert.equal(configs.has("notifyExpiryEnabled"), true);
  assert.equal(configs.has("notifySecretOpenedEnabled"), true);
});

test("the mail server and webhook settings stay out of the public list", async () => {
  const configs = await publicConfigs();
  for (const key of ["smtpHost", "smtpPass", "webhookUrl", "webhookSecret", "jwtSecret"]) {
    assert.equal(configs.has(key), false, key);
  }
});
