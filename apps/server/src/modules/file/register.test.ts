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
const originalDelete = FileService.prototype.deleteObject;
const deleted: string[] = [];
let failure: Error | null = null;
let lateFor = 0;

before(async () => {
  FileService.prototype.deleteObject = async (objectName: string) => {
    deleted.push(objectName);
  };
  FileService.prototype.getObjectSize = async (objectName: string) => {
    const size = stored.get(objectName);
    if (failure) throw failure;
    if (size === undefined || lateFor-- > 0) throw Object.assign(new Error("NotFound"), { name: "NotFound" });
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
  FileService.prototype.deleteObject = originalDelete;
  await app?.close();
  await prisma?.$disconnect();
  database.cleanup();
});

beforeEach(async () => {
  stored.clear();
  deleted.length = 0;
  failure = null;
  lateFor = 0;
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

test("storage that does not answer is a 503 to try again, not a missing file", async () => {
  stored.set("alice/slow", 5);
  failure = Object.assign(new Error("timed out"), { name: "TimeoutError" });
  const res = await register("alice/slow", 5);
  assert.equal(res.statusCode, 503);
  assert.match(res.json().error, /try again/i);
  assert.equal(await prisma.file.count(), 0);
});

test("an object that shows up late in storage is found by looking again", async () => {
  stored.set("alice/late", 7);
  lateFor = 2;
  const res = await register("alice/late", 7);
  assert.equal(res.statusCode, 201, res.body);
});

test("an object over the file size limit or the storage limit is deleted from storage", async () => {
  const row = await prisma.appConfig.findUniqueOrThrow({ where: { key: "maxFileSize" } });
  await prisma.appConfig.update({ where: { key: "maxFileSize" }, data: { value: String(MB) } });
  stored.set("alice/too-big", 2 * MB);
  try {
    assert.equal((await register("alice/too-big", 1)).statusCode, 400);
  } finally {
    await prisma.appConfig.update({ where: { key: "maxFileSize" }, data: { value: row.value } });
  }
  assert.deepEqual(deleted, ["alice/too-big"]);

  const limit = await prisma.appConfig.findUniqueOrThrow({ where: { key: "maxTotalStoragePerUser" } });
  await prisma.appConfig.update({ where: { key: "maxTotalStoragePerUser" }, data: { value: String(MB) } });
  stored.set("alice/no-room", 2 * MB);
  try {
    assert.equal((await register("alice/no-room", 1)).statusCode, 400);
  } finally {
    await prisma.appConfig.update({ where: { key: "maxTotalStoragePerUser" }, data: { value: limit.value } });
  }
  assert.deepEqual(deleted, ["alice/too-big", "alice/no-room"]);
});

test("a refusal keeps the object when another registration took the name meanwhile", async () => {
  const limit = await prisma.appConfig.findUniqueOrThrow({ where: { key: "maxTotalStoragePerUser" } });
  await prisma.appConfig.update({ where: { key: "maxTotalStoragePerUser" }, data: { value: String(MB) } });
  stored.set("alice/raced", 2 * MB);
  const size = FileService.prototype.getObjectSize;
  // The request that wins the race writes its row while this one is still asking storage.
  FileService.prototype.getObjectSize = async function (this: FileService, objectName: string) {
    await prisma.file.create({
      data: { name: "won.bin", extension: "bin", size: BigInt(1), objectName, userId: "alice" },
    });
    return size.call(this, objectName);
  };
  try {
    assert.equal((await register("alice/raced", 1)).statusCode, 400);
    await new Promise((resolve) => setTimeout(resolve, 100));
  } finally {
    FileService.prototype.getObjectSize = size;
    await prisma.appConfig.update({ where: { key: "maxTotalStoragePerUser" }, data: { value: limit.value } });
  }
  assert.deepEqual(deleted, [], "the object of the row that was written is not removed");
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
