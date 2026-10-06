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

const as = (userId: string) => ({ cookies: { token: app.jwt.sign({ userId, isAdmin: userId.startsWith("admin") }) } });
const reset = (actor: string, target: string) =>
  app.inject({ method: "POST", url: `/users/${target}/two-factor/reset`, ...as(actor), payload: {} });

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

  for (const [id, firstName] of [
    ["admin1", "Ada"],
    ["admin2", "Bob"],
    ["member1", "Anita"],
    ["member2", "Carl"],
    ["plain", "Dan"],
  ]) {
    const twoFactor = id !== "plain";
    await prisma.user.create({
      data: {
        id,
        firstName,
        lastName: "Test",
        username: id,
        email: `${id}@example.test`,
        isAdmin: id.startsWith("admin"),
        twoFactorEnabled: twoFactor,
        twoFactorVerified: twoFactor,
        twoFactorSecret: twoFactor ? "JBSWY3DPEHPK3PXP" : null,
        twoFactorBackupCodes: twoFactor ? "[]" : null,
      },
    });
  }
  await prisma.trustedDevice.create({
    data: { userId: "member1", deviceHash: "h1", expiresAt: new Date(Date.now() + 1e9) },
  });
  await prisma.passkey.create({
    data: { userId: "member1", credentialId: "c-m1", publicKey: Buffer.from([1]), name: "Phone" },
  });
});

after(async () => {
  await app?.close();
  await prisma?.$disconnect();
  database.cleanup();
});

test("an administrator resets somebody else: secret, codes and trusted devices go, the passkeys stay", async () => {
  const res = await reset("admin1", "member1");
  assert.equal(res.statusCode, 200, res.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: "member1" } });
  assert.equal(user.twoFactorEnabled, false);
  assert.equal(user.twoFactorVerified, false);
  assert.equal(user.twoFactorSecret, null);
  assert.equal(user.twoFactorBackupCodes, null);
  assert.equal(await prisma.trustedDevice.count({ where: { userId: "member1" } }), 0);
  assert.equal(await prisma.passkey.count({ where: { userId: "member1" } }), 1);
});

test("the reset is in the activity log with both names", async () => {
  const line = await prisma.activityEvent.findFirstOrThrow({ where: { action: "account.two_factor_reset" } });
  assert.equal(line.actorId, "admin1");
  assert.equal(line.actorName, "Ada Test");
  assert.equal(line.ownerId, "member1");
  assert.equal(line.subjectId, "member1");
  assert.equal(line.subject, "Anita Test");
  assert.equal(line.kind, "account");
});

test("an administrator cannot reset the own two step sign in", async () => {
  const res = await reset("admin1", "admin1");
  assert.equal(res.statusCode, 400, res.body);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: "admin1" } })).twoFactorEnabled, true);
});

test("a member cannot call it at all, not for another and not for themselves", async () => {
  assert.equal((await reset("member2", "admin2")).statusCode, 403);
  assert.equal((await reset("member2", "member2")).statusCode, 403);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: "member2" } })).twoFactorEnabled, true);
  assert.equal((await app.inject({ method: "POST", url: "/users/member2/two-factor/reset" })).statusCode, 401);
});

test("an unknown user is a 404, one without two step sign in a 400, and neither writes a line", async () => {
  const before = await prisma.activityEvent.count({ where: { action: "account.two_factor_reset" } });
  assert.equal((await reset("admin1", "nobody")).statusCode, 404);
  assert.equal((await reset("admin1", "plain")).statusCode, 400);
  assert.equal(await prisma.activityEvent.count({ where: { action: "account.two_factor_reset" } }), before);
});

test("the user list says who has two step sign in on", async () => {
  const res = await app.inject({ method: "GET", url: "/users", ...as("admin1") });
  const byId = new Map(res.json().map((u: { id: string; twoFactorEnabled: boolean }) => [u.id, u.twoFactorEnabled]));
  assert.equal(byId.get("member2"), true);
  assert.equal(byId.get("plain"), false);
  assert.equal(byId.get("member1"), false);
});
