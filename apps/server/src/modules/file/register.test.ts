import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import { fastify, FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { useTestDatabase } from "../../../test-support/test-db";
import { FileService } from "./service";

// POST /files believes storage, not the client: the real size of the object counts.
const database = useTestDatabase();
const MB = 1024 * 1024;

let app: FastifyInstance;
let prisma: typeof import("../../shared/prisma").prisma;
let env: typeof import("../../env").env;
const stored = new Map<string, number>();
const originalSize = FileService.prototype.getObjectSize;

before(async () => {
  FileService.prototype.getObjectSize = async (objectName: string) => {
    const size = stored.get(objectName);
    if (size === undefined) throw new Error("NotFound");
    return size;
  };
  ({ prisma } = await import("../../shared/prisma"));
  ({ env } = await import("../../env"));
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
    data: { id: "alice", firstName: "a", lastName: "T", username: "alice", email: "alice@example.test" },
  });
});

after(async () => {
  FileService.prototype.getObjectSize = originalSize;
  await app?.close();
  await prisma?.$disconnect();
  database.cleanup();
});

beforeEach(async () => {
  stored.clear();
  await prisma.file.deleteMany();
});

afterEach(() => {
  delete env.CLAMAV_HOST;
  env.CLAMAV_MAX_SIZE_MB = "100";
});

const register = (objectName: string, size: number) =>
  app.inject({
    method: "POST",
    url: "/files",
    cookies: { token: app.jwt.sign({ userId: "alice", isAdmin: false }) },
    payload: { name: "x.bin", extension: "bin", size, objectName },
  });

test("the size the client declares is ignored: the size of the object counts", async () => {
  stored.set("alice/a", 3 * MB);
  const res = await register("alice/a", 1);
  assert.equal(res.statusCode, 201, res.body);
  assert.equal(res.json().file.size, String(3 * MB));
  assert.equal((await prisma.file.findFirstOrThrow({ where: { objectName: "alice/a" } })).size, BigInt(3 * MB));
});

test("an object that is not in storage is refused and writes no row", async () => {
  const res = await register("alice/missing", 5);
  assert.equal(res.statusCode, 400);
  assert.equal(await prisma.file.count(), 0);
});

test("an object over the storage limit is refused even when the client declares a small size", async () => {
  const limit = BigInt((await prisma.appConfig.findUniqueOrThrow({ where: { key: "maxTotalStoragePerUser" } })).value);
  await prisma.appConfig.update({ where: { key: "maxTotalStoragePerUser" }, data: { value: String(2 * MB) } });
  stored.set("alice/big", 3 * MB);
  try {
    const res = await register("alice/big", 1);
    assert.equal(res.statusCode, 400);
    assert.match(res.json().error, /Insufficient storage space/);
    assert.equal(await prisma.file.count(), 0);
  } finally {
    await prisma.appConfig.update({ where: { key: "maxTotalStoragePerUser" }, data: { value: String(limit) } });
  }
});

test("an object over the file size limit is refused whatever the client declares", async () => {
  const row = await prisma.appConfig.findUniqueOrThrow({ where: { key: "maxFileSize" } });
  await prisma.appConfig.update({ where: { key: "maxFileSize" }, data: { value: String(MB) } });
  stored.set("alice/huge", 2 * MB);
  try {
    assert.equal((await register("alice/huge", 1)).statusCode, 400);
  } finally {
    await prisma.appConfig.update({ where: { key: "maxFileSize" }, data: { value: row.value } });
  }
});

test("the scan decision uses the real size: a small object declared large is still scanned", async () => {
  env.CLAMAV_HOST = "127.0.0.1";
  env.CLAMAV_PORT = "1";
  env.CLAMAV_MAX_SIZE_MB = "1";
  stored.set("alice/small", 5);
  const res = await register("alice/small", 2 * MB);
  assert.equal(res.statusCode, 201, res.body);
  assert.equal(res.json().file.scanStatus, "pending");
});
