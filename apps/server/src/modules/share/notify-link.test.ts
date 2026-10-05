import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import { fastify, FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { useTestDatabase } from "../../../test-support/test-db";

const database = useTestDatabase();

let app: FastifyInstance;
let prisma: typeof import("../../shared/prisma").prisma;
let EmailService: typeof import("../email/service").EmailService;
const sentTo: Array<{ to: string; link: string }> = [];
const original: { send?: unknown } = {};

before(async () => {
  process.env.APP_URL = "https://files.example.test";
  ({ prisma } = await import("../../shared/prisma"));
  ({ EmailService } = await import("../email/service"));
  const { registerRoutes } = await import("../../routes");

  original.send = EmailService.prototype.sendShareNotification;
  EmailService.prototype.sendShareNotification = async function (to: string, link: string) {
    sentTo.push({ to, link });
  };

  app = fastify({ ignoreTrailingSlash: true });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, { secret: "test-secret", cookie: { cookieName: "token", signed: false } });
  app.decorateRequest("jwtSign", function (this: any, payload: object) {
    return this.server.jwt.sign(payload);
  });
  await app.register(fastifyMultipart);
  registerRoutes(app);
  await app.ready();

  await prisma.user.create({
    data: { id: "alice", firstName: "Alice", lastName: "T", username: "alice", email: "alice@example.test" },
  });
  const security = await prisma.shareSecurity.create({ data: {} });
  await prisma.share.create({
    data: {
      id: "s1",
      name: "Photos",
      creatorId: "alice",
      securityId: security.id,
      recipients: { create: [{ email: "bob@example.test" }] },
      alias: { create: { alias: "holiday" } },
    },
  });
});

after(async () => {
  EmailService.prototype.sendShareNotification = original.send as never;
  await app?.close();
  await prisma?.$disconnect();
  database.cleanup();
});

const notify = (shareLink: string) =>
  app.inject({
    method: "POST",
    url: "/shares/s1/notify",
    cookies: { token: app.jwt.sign({ userId: "alice", isAdmin: false }) },
    payload: { shareLink },
  });

test("the link in the mail is built from the share, whatever the request body says", async () => {
  for (const shareLink of [
    "javascript:alert(1)",
    "https://evil.example/phish",
    "https://files.example.test/s/holiday",
  ]) {
    sentTo.length = 0;
    const res = await notify(shareLink);
    assert.equal(res.statusCode, 200, res.body);
    assert.deepEqual(sentTo, [{ to: "bob@example.test", link: "https://files.example.test/s/holiday" }]);
  }
});
