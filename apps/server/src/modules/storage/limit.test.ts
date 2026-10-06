import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import fastifyRateLimit from "@fastify/rate-limit";
import { fastify, FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { useTestDatabase } from "../../../test-support/test-db";

const database = useTestDatabase();
const MB = 1024 * 1024;

let app: FastifyInstance;
let prisma: typeof import("../../shared/prisma").prisma;
let storageLimitOf: typeof import("./limit").storageLimitOf;

before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  ({ storageLimitOf } = await import("./limit"));
  const { registerRoutes } = await import("../../routes");

  app = fastify({ ignoreTrailingSlash: true });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(fastifyRateLimit, { global: true, max: 10_000, timeWindow: "1 minute" });
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, { secret: "test-secret", cookie: { cookieName: "token", signed: false } });
  await app.register(fastifyMultipart);
  registerRoutes(app);
  await app.ready();

  for (const id of ["alice", "bob", "root"]) {
    await prisma.user.create({
      data: { id, firstName: id, lastName: "Test", username: id, email: `${id}@example.test`, isAdmin: id === "root" },
    });
  }
  await prisma.appConfig.update({ where: { key: "maxTotalStoragePerUser" }, data: { value: String(100 * MB) } });
});

after(async () => {
  await app?.close();
  await prisma?.$disconnect();
  database.cleanup();
});

const session = (userId: string) => ({ token: app.jwt.sign({ userId, isAdmin: userId === "root" }) });
const setDefault = (bytes: number) =>
  prisma.appConfig.update({ where: { key: "maxTotalStoragePerUser" }, data: { value: String(bytes) } });
const setLimit = (id: string, bytes: number | null) =>
  prisma.user.update({ where: { id }, data: { storageLimitBytes: bytes === null ? null : BigInt(bytes) } });
const check = (userId: string, size: number) =>
  app.inject({
    method: "POST",
    url: "/files/check",
    cookies: session(userId),
    payload: { name: "big", extension: "bin", size, objectName: "o" },
  });

test("the limit is the installation default until an own limit is set", async () => {
  assert.equal(await storageLimitOf("alice"), BigInt(100 * MB));
  await setLimit("alice", 5 * MB);
  assert.equal(await storageLimitOf("alice"), BigInt(5 * MB));
  await setLimit("alice", null);
  assert.equal(await storageLimitOf("alice"), BigInt(100 * MB));
});

test("an upload over the own limit is refused although the default would allow it", async () => {
  await setLimit("alice", 5 * MB);
  assert.equal((await check("alice", 10 * MB)).statusCode, 400);
  assert.equal((await check("bob", 10 * MB)).statusCode, 201);
  await setLimit("alice", null);
});

test("an upload over the default is allowed when the own limit is larger", async () => {
  await setLimit("bob", 500 * MB);
  assert.equal((await check("bob", 200 * MB)).statusCode, 201);
  assert.equal((await check("alice", 200 * MB)).statusCode, 400);
  await setLimit("bob", null);
});

test("a file taken from a receive link counts against the owner's own limit", async () => {
  const { ReverseShareService } = await import("../reverse-share/service");
  const link = await prisma.reverseShare.create({ data: { name: "In", creatorId: "alice" } });
  const file = await prisma.reverseShareFile.create({
    data: { name: "f", extension: "bin", objectName: "x", size: BigInt(10 * MB), reverseShareId: link.id },
  });
  await setLimit("alice", 5 * MB);
  await assert.rejects(
    () => new ReverseShareService().copyReverseShareFileToUserFiles(file.id, "alice"),
    /Insufficient storage/
  );
  await setLimit("alice", null);
});

test("the storage figures of a member use the own limit", async () => {
  await setLimit("alice", 5 * MB);
  const usage = await app.inject({ method: "GET", url: "/storage/usage", cookies: session("alice") });
  assert.equal(usage.json().limitBytes, 5 * MB);
  const { StorageService } = await import("./service");
  const space = await new StorageService().getDiskSpace("alice", false);
  assert.equal(space.diskSizeGB, 0);
  assert.equal(space.uploadAllowed, true);
  const bob = await app.inject({ method: "GET", url: "/storage/usage", cookies: session("bob") });
  assert.equal(bob.json().limitBytes, 100 * MB);
  await setLimit("alice", null);
});

test("an administrator sets the limit of a user, a member cannot, not even the own", async () => {
  const set = (userId: string, id: string, storageLimitBytes: number | null) =>
    app.inject({ method: "PUT", url: "/users", cookies: session(userId), payload: { id, storageLimitBytes } });

  const own = await set("alice", "alice", 999 * MB);
  assert.equal(own.statusCode, 403);
  const other = await set("alice", "bob", 999 * MB);
  assert.equal(other.statusCode, 403);

  const done = await set("root", "alice", 7 * MB);
  assert.equal(done.statusCode, 200, done.body);
  assert.equal(done.json().storageLimitBytes, 7 * MB);
  assert.equal((await prisma.user.findUnique({ where: { id: "alice" } }))?.storageLimitBytes, BigInt(7 * MB));

  const cleared = await set("root", "alice", null);
  assert.equal(cleared.json().storageLimitBytes, null);

  const invalid = await set("root", "alice", -5);
  assert.equal(invalid.statusCode >= 400, true);

  const profile = await app.inject({
    method: "PUT",
    url: "/users",
    cookies: session("alice"),
    payload: { id: "alice", firstName: "Alice" },
  });
  assert.equal(profile.statusCode, 200, "a member can still change the own profile");
});

test("the message never shows a negative amount when the limit is below the usage", async () => {
  const { ReverseShareService } = await import("../reverse-share/service");
  const used = await prisma.file.create({
    data: { name: "big", extension: "bin", objectName: "big", size: BigInt(8 * MB), userId: "alice" },
  });
  await setLimit("alice", 5 * MB);
  const payload = { name: "more", extension: "bin", size: MB, objectName: "alice/o2" };
  const { FileService } = await import("../file/service");
  const sizeOf = FileService.prototype.getObjectSize;
  FileService.prototype.getObjectSize = async () => MB;

  const checked = await app.inject({ method: "POST", url: "/files/check", cookies: session("alice"), payload });
  assert.equal(checked.statusCode, 400);
  assert.match(checked.json().error, /You have 0\.00MB available/);

  const registered = await app.inject({ method: "POST", url: "/files", cookies: session("alice"), payload });
  FileService.prototype.getObjectSize = sizeOf;
  assert.equal(registered.statusCode, 400);
  assert.match(registered.json().error, /You have 0\.00MB available/);

  const link = await prisma.reverseShare.create({ data: { name: "In2", creatorId: "alice" } });
  const received = await prisma.reverseShareFile.create({
    data: { name: "g", extension: "bin", objectName: "y", size: BigInt(MB), reverseShareId: link.id },
  });
  await assert.rejects(
    () => new ReverseShareService().copyReverseShareFileToUserFiles(received.id, "alice"),
    /You have 0\.00MB available/
  );

  await prisma.file.delete({ where: { id: used.id } });
  await setLimit("alice", null);
});
