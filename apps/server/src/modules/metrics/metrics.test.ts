import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import { fastify, FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { useTestDatabase } from "../../../test-support/test-db";

const database = useTestDatabase();

let app: FastifyInstance;
let prisma: typeof import("../../shared/prisma").prisma;
let resetMetricsCache: () => void;
const keys: Record<string, string> = {};

before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  ({ resetMetricsCache } = await import("./collect"));
  const { registerRoutes } = await import("../../routes");
  app = fastify({ ignoreTrailingSlash: true });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, { secret: "test-secret", cookie: { cookieName: "token", signed: false } });
  await app.register(fastifyMultipart);
  registerRoutes(app);
  await app.ready();

  for (const id of ["boss", "member", "sleeper"]) {
    await prisma.user.create({
      data: {
        id,
        firstName: id,
        lastName: "Test",
        username: id,
        email: `${id}@example.test`,
        isAdmin: id !== "member",
        isActive: true,
      },
    });
  }
  for (const [id, scope] of [
    ["boss", "read"],
    ["boss", "full"],
    ["member", "read"],
    ["sleeper", "read"],
  ] as const) {
    const response = await app.inject({
      method: "POST",
      url: "/api-keys",
      cookies: { token: app.jwt.sign({ userId: id, isAdmin: id !== "member" }) },
      payload: { name: `${id} ${scope}`, scope },
    });
    assert.equal(response.statusCode, 201, response.body);
    keys[`${id}-${scope}`] = response.json().token;
  }
});

after(async () => {
  await app?.close();
  await prisma?.$disconnect();
  database.cleanup();
});

beforeEach(() => resetMetricsCache());

const withKey = (key: string) => ({ authorization: `Bearer ${key}` });
const scrape = (headers: Record<string, string> = {}) => app.inject({ method: "GET", url: "/metrics", headers });
const sample = (body: string, line: string) => body.split("\n").includes(line);

test("no key is refused with 401", async () => {
  assert.equal((await scrape()).statusCode, 401);
});

test("a browser session of an administrator is refused", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/metrics",
    cookies: { token: app.jwt.sign({ userId: "boss", isAdmin: true }) },
  });
  assert.equal(response.statusCode, 403);
});

test("the key of a member is refused with 403", async () => {
  assert.equal((await scrape(withKey(keys["member-read"]))).statusCode, 403);
});

test("a key that has lost its administrator rights is refused, the database decides", async () => {
  await prisma.user.update({ where: { id: "sleeper" }, data: { isAdmin: false } });
  assert.equal((await scrape(withKey(keys["sleeper-read"]))).statusCode, 403);
  await prisma.user.update({ where: { id: "sleeper" }, data: { isAdmin: true, isActive: false } });
  assert.equal((await scrape(withKey(keys["sleeper-read"]))).statusCode, 401);
  await prisma.user.update({ where: { id: "sleeper" }, data: { isActive: true } });
});

test("a key of an administrator, read or full, gets the figures in the Prometheus text format", async () => {
  for (const name of ["boss-read", "boss-full"]) {
    const response = await scrape(withKey(keys[name]));
    assert.equal(response.statusCode, 200, response.body);
    assert.match(String(response.headers["content-type"]), /^text\/plain; version=0\.0\.4/);
    assert.match(response.body, /^# HELP amfora_info /m);
    assert.match(response.body, /^# TYPE amfora_info gauge$/m);
    assert.match(response.body, /^amfora_info\{version="\d+\.\d+\.\d+[^"]*"\} 1$/m);
    assert.ok(sample(response.body, "amfora_database_up 1"));
    assert.match(response.body, /^amfora_storage_up [01]$/m);
    resetMetricsCache();
  }
});

test("the figures match the database", async () => {
  const owner = "boss";
  await prisma.file.createMany({
    data: [
      { id: "m1", name: "a", extension: "txt", size: BigInt(100), objectName: "m1", userId: owner },
      { id: "m2", name: "b", extension: "txt", size: BigInt(250), objectName: "m2", userId: owner },
      {
        id: "m3",
        name: "c",
        extension: "txt",
        size: BigInt(7),
        objectName: "m3",
        userId: owner,
        deletedAt: new Date(),
      },
    ],
  });
  const body = (await scrape(withKey(keys["boss-read"]))).body;
  assert.ok(sample(body, 'amfora_users{kind="total"} 3'));
  assert.ok(sample(body, 'amfora_users{kind="active"} 3'));
  assert.ok(sample(body, 'amfora_users{kind="admin"} 2'));
  assert.ok(sample(body, "amfora_files 2"));
  assert.ok(sample(body, "amfora_files_bytes 350"));
  assert.ok(sample(body, "amfora_trash_files 1"));
  assert.ok(sample(body, "amfora_trash_files_bytes 7"));
  assert.ok(sample(body, "amfora_receive_files 0"));
  assert.ok(sample(body, 'amfora_shares{state="total"} 0'));
  assert.ok(sample(body, 'amfora_receive_links{state="active"} 0'));
  assert.ok(sample(body, 'amfora_secrets{state="total"} 0'));
});

test("the answer is cached for 30 seconds", async () => {
  const first = (await scrape(withKey(keys["boss-read"]))).body;
  await prisma.file.create({
    data: { id: "m4", name: "d", extension: "txt", size: BigInt(1), objectName: "m4", userId: "boss" },
  });
  const second = (await scrape(withKey(keys["boss-read"]))).body;
  assert.equal(second, first);
  resetMetricsCache();
  assert.notEqual((await scrape(withKey(keys["boss-read"]))).body, first);
});

test("the route stays reachable with a key while two step sign in is required", async () => {
  await prisma.appConfig.update({ where: { key: "twoFactorRequired" }, data: { value: "all" } });
  try {
    assert.equal((await scrape(withKey(keys["boss-read"]))).statusCode, 200);
    assert.equal((await scrape()).statusCode, 401);
  } finally {
    await prisma.appConfig.update({ where: { key: "twoFactorRequired" }, data: { value: "off" } });
  }
});

test("scan figures: off says 0 and shows no counts, on says 1 and counts per status", async () => {
  const { env } = await import("../../env");
  const { setScannerUp } = await import("../scan/scanner-state");
  await prisma.file.create({
    data: {
      id: "s1",
      name: "s1",
      extension: "t",
      size: BigInt(1),
      objectName: "s1",
      userId: "boss",
      scanStatus: "clean",
    },
  });
  await prisma.file.create({
    data: {
      id: "s2",
      name: "s2",
      extension: "t",
      size: BigInt(1),
      objectName: "s2",
      userId: "boss",
      scanStatus: "infected",
    },
  });
  await prisma.reverseShare.create({ data: { id: "rl", creatorId: "boss" } });
  await prisma.reverseShareFile.create({
    data: {
      id: "sr1",
      name: "sr1",
      extension: "t",
      size: BigInt(1),
      objectName: "sr1",
      reverseShareId: "rl",
      scanStatus: "infected",
    },
  });
  const off = (await scrape(withKey(keys["boss-read"]))).body;
  assert.ok(sample(off, "amfora_scan_enabled 0"));
  assert.ok(sample(off, 'amfora_scan_files{status="infected"} 2'), "infected files stay blocked, so they are counted");
  assert.ok(!off.includes('amfora_scan_files{status="clean"}'));
  assert.ok(!off.includes("amfora_scan_oldest_pending_seconds"));
  assert.ok(!off.includes("amfora_scan_scanner_up"));
  env.CLAMAV_HOST = "clamav";
  try {
    resetMetricsCache();
    const on = (await scrape(withKey(keys["boss-read"]))).body;
    assert.ok(sample(on, "amfora_scan_enabled 1"));
    assert.ok(sample(on, "amfora_scan_oldest_pending_seconds 0"), "nothing pending");
    assert.ok(sample(on, "amfora_scan_scanner_up 1"));
    assert.ok(sample(on, 'amfora_scan_files{status="clean"} 1'));
    assert.ok(sample(on, 'amfora_scan_files{status="infected"} 2'));
    assert.ok(sample(on, 'amfora_scan_files{status="pending"} 0'));

    await prisma.file.create({
      data: {
        id: "s3",
        name: "s3",
        extension: "t",
        size: BigInt(1),
        objectName: "s3",
        userId: "boss",
        scanStatus: "pending",
        createdAt: new Date(Date.now() - 120_000),
      },
    });
    setScannerUp(false);
    resetMetricsCache();
    const waiting = (await scrape(withKey(keys["boss-read"]))).body;
    const oldest = /^amfora_scan_oldest_pending_seconds (\d+)$/m.exec(waiting);
    assert.ok(oldest && Number(oldest[1]) >= 119 && Number(oldest[1]) < 200, String(oldest?.[0]));
    assert.ok(sample(waiting, "amfora_scan_scanner_up 0"));
  } finally {
    setScannerUp(true);
    delete env.CLAMAV_HOST;
  }
});
