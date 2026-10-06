import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import bcrypt from "bcryptjs";
import { fastify, FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { useTestDatabase } from "../../../test-support/test-db";

const database = useTestDatabase();
const PASSWORD = "correct horse battery";

let app: FastifyInstance;
let prisma: typeof import("../../shared/prisma").prisma;

const disable = (password: string) =>
  app.inject({
    method: "POST",
    url: "/auth/2fa/disable",
    cookies: { token: app.jwt.sign({ userId: "dana", isAdmin: false }) },
    payload: { password },
  });
const attempts = async () => (await prisma.loginAttempt.findUnique({ where: { userId: "dana" } }))?.attempts ?? 0;

before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  const { registerRoutes } = await import("../../routes");
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
    data: {
      id: "dana",
      firstName: "Dana",
      lastName: "Test",
      username: "dana",
      email: "dana@example.test",
      password: await bcrypt.hash(PASSWORD, 4),
      twoFactorEnabled: true,
      twoFactorVerified: true,
      twoFactorSecret: "JBSWY3DPEHPK3PXP",
      twoFactorBackupCodes: "[]",
    },
  });
});

after(async () => {
  await app?.close();
  await prisma?.$disconnect();
  database.cleanup();
});

test("a wrong password when switching two step sign in off counts as a failed sign in", async () => {
  await prisma.loginAttempt.deleteMany({});
  assert.equal((await disable("nope nope nope")).statusCode, 400);
  assert.equal(await attempts(), 1);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: "dana" } })).twoFactorEnabled, true);
});

test("while the account is blocked even the right password is refused, and the block is not renewed", async () => {
  const max = Number((await prisma.appConfig.findUniqueOrThrow({ where: { key: "maxLoginAttempts" } })).value);
  const long = new Date(Date.now() - 60_000);
  await prisma.loginAttempt.deleteMany({});
  await prisma.loginAttempt.create({ data: { userId: "dana", attempts: max, lastAttempt: long } });
  const res = await disable(PASSWORD);
  assert.equal(res.statusCode, 400);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: "dana" } })).twoFactorEnabled, true);
  const row = await prisma.loginAttempt.findUniqueOrThrow({ where: { userId: "dana" } });
  assert.equal(row.attempts, max);
  assert.equal(row.lastAttempt.getTime(), long.getTime());
});

test("the right password switches it off and leaves the failure counter alone", async () => {
  await prisma.loginAttempt.deleteMany({});
  await prisma.loginAttempt.create({ data: { userId: "dana", attempts: 2, lastAttempt: new Date() } });
  assert.equal((await disable(PASSWORD)).statusCode, 200);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: "dana" } })).twoFactorEnabled, false);
  assert.equal(await attempts(), 2);
});
