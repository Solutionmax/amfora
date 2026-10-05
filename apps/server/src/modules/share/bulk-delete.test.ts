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

before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  const { registerRoutes } = await import("../../routes");

  app = fastify({ ignoreTrailingSlash: true });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, { secret: "test-secret", cookie: { cookieName: "token", signed: false } });
  await app.register(fastifyMultipart);
  registerRoutes(app);
  await app.ready();

  await prisma.user.create({
    data: { id: "alice", firstName: "alice", lastName: "Test", username: "alice", email: "alice@example.test" },
  });
});

after(async () => {
  await app?.close();
  await prisma?.$disconnect();
  database.cleanup();
});

// The web app deletes a selection by sending every delete at once. SQLite has one writer,
// so this only works when the server lines the writes up instead of letting them collide.
test("deleting many shares at the same moment removes every one of them", async () => {
  const file = await prisma.file.create({
    data: { name: "offer.pdf", extension: "pdf", size: 10n, objectName: "alice/offer.pdf", userId: "alice" },
  });
  const ids: string[] = [];
  for (let i = 0; i < 40; i++) {
    const security = await prisma.shareSecurity.create({ data: {} });
    const share = await prisma.share.create({
      data: { name: `share ${i}`, creatorId: "alice", securityId: security.id, files: { connect: { id: file.id } } },
    });
    ids.push(share.id);
  }

  const cookies = { token: app.jwt.sign({ userId: "alice", isAdmin: false }) };
  const replies = await Promise.all(ids.map((id) => app.inject({ method: "DELETE", url: `/shares/${id}`, cookies })));

  assert.deepEqual(
    replies.filter((reply) => reply.statusCode !== 200).map((reply) => reply.body),
    []
  );
  assert.equal(await prisma.share.count(), 0);
  assert.equal(await prisma.shareSecurity.count(), 0);
  assert.equal(await prisma.file.count(), 1, "the shared file itself stays");
});
