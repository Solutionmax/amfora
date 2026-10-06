import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import bcrypt from "bcryptjs";
import { fastify, FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { useTestDatabase } from "../../../test-support/test-db";

const database = useTestDatabase();

let app: FastifyInstance;
let prisma: typeof import("../../shared/prisma").prisma;
let notifications: typeof import("./notifications");
let notify: typeof import("./notify");

before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  notifications = await import("./notifications");
  notify = await import("./notify");
  const { registerRoutes } = await import("../../routes");

  app = fastify({ ignoreTrailingSlash: true });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, { secret: "test-secret", cookie: { cookieName: "token", signed: false } });
  registerRoutes(app);
  await app.ready();

  const password = await bcrypt.hash("right-password", 4);
  for (const id of ["alice", "bob", "root"]) {
    await prisma.user.create({
      data: {
        id,
        firstName: id,
        lastName: "Test",
        username: id,
        email: `${id}@example.test`,
        password,
        isAdmin: id === "root",
      },
    });
  }
});

after(async () => {
  await app?.close();
  await prisma?.$disconnect();
  database.cleanup();
});

const session = (userId: string) => ({ token: app.jwt.sign({ userId, isAdmin: userId === "root" }) });
const get = (userId: string, url: string) => app.inject({ method: "GET", url, cookies: session(userId) });
const listOf = async (userId: string) =>
  (await get(userId, "/notifications")).json() as { notifications: Array<Record<string, any>>; unseen: number };
const countOf = async (userId: string) => (await get(userId, "/notifications/count")).json().count as number;
const line = (ownerId: string, action: string, extra: object = {}) =>
  prisma.activityEvent.create({ data: { kind: action.split(".")[0], action, ownerId, subject: "Thing", ...extra } });

test("a user sees only own lines with a notification action, and a count of the new ones", async () => {
  await line("alice", "share.downloaded");
  await line("alice", "receive.files_received", { amount: 2 });
  await line("alice", "secret.opened");
  await line("alice", "share.created", { actorId: "alice" });
  await line("alice", "account.signed_in", { actorId: "alice" });
  await line("bob", "share.downloaded");

  const own = await listOf("alice");
  assert.deepEqual(own.notifications.map((n) => n.action).sort(), [
    "receive.files_received",
    "secret.opened",
    "share.downloaded",
  ]);
  assert.equal(own.unseen, 3);
  assert.equal(await countOf("alice"), 3);
  assert.equal(await countOf("bob"), 1);
});

test("an administrator gets only own lines in the bell, not everybody's", async () => {
  assert.equal(await countOf("root"), 0);
  assert.equal((await listOf("root")).notifications.length, 0);
  await line("root", "secret.opened");
  assert.equal(await countOf("root"), 1);
});

test("what a user did to their own link is not a notification, what somebody else did is", async () => {
  await line("bob", "share.downloaded", { actorId: "bob" });
  assert.equal(await countOf("bob"), 1);
  await line("bob", "share.downloaded", { actorId: "alice", actorName: "Alice Test" });
  assert.equal(await countOf("bob"), 2);
});

test("opening marks everything seen for that user only, and newer lines count again", async () => {
  const first = await listOf("alice");
  assert.ok(first.notifications.every((n) => n.isNew));
  assert.equal(
    (await app.inject({ method: "POST", url: "/notifications/seen", cookies: session("alice") })).statusCode,
    200
  );
  assert.equal(await countOf("alice"), 0);
  assert.equal(await countOf("bob"), 2, "bob has not looked");
  const again = await listOf("alice");
  assert.equal(again.notifications.length, 3, "still listed");
  assert.ok(again.notifications.every((n) => !n.isNew));

  await new Promise((resolve) => setTimeout(resolve, 5));
  await line("alice", "share.downloaded");
  assert.equal(await countOf("alice"), 1);
});

test("the list is the latest twenty, newest first", async () => {
  await prisma.activityEvent.createMany({
    data: Array.from({ length: 25 }, (_, i) => ({
      kind: "share",
      action: "share.downloaded",
      ownerId: "bob",
      subject: `n${i}`,
      createdAt: new Date(Date.now() + 1000 + i),
    })),
  });
  const { notifications } = await listOf("bob");
  assert.equal(notifications.length, 20);
  assert.equal(notifications[0].subject, "n24");
});

test("without a token, or as a deactivated account, there is nothing", async () => {
  assert.equal((await app.inject({ method: "GET", url: "/notifications" })).statusCode, 401);
  assert.equal((await app.inject({ method: "GET", url: "/notifications/count" })).statusCode, 401);
  assert.equal((await app.inject({ method: "POST", url: "/notifications/seen" })).statusCode, 401);
  await prisma.user.create({
    data: { id: "gone", firstName: "g", lastName: "g", username: "gone", email: "g@example.test", isActive: false },
  });
  assert.equal((await get("gone", "/notifications/count")).statusCode, 401);
});

test("a link that ends within three days is one line per link and end date, with mail off", async () => {
  const day = 86_400_000;
  await prisma.appConfig.update({ where: { key: "notifyExpiryEnabled" }, data: { value: "false" } });
  const security = await prisma.shareSecurity.create({ data: {} });
  const share = await prisma.share.create({
    data: {
      name: "Ends soon",
      creatorId: "alice",
      securityId: security.id,
      expiration: new Date(Date.now() + 2 * day),
    },
  });
  const later = await prisma.share.create({
    data: {
      name: "Later",
      creatorId: "alice",
      securityId: (await prisma.shareSecurity.create({ data: {} })).id,
      expiration: new Date(Date.now() + 9 * day),
    },
  });
  const link = await prisma.reverseShare.create({
    data: { name: "Inbox", creatorId: "alice", expiration: new Date(Date.now() + day) },
  });
  const lines = (action: string) => prisma.activityEvent.findMany({ where: { action, ownerId: "alice" } });

  await notify.sendExpiryReminders();
  await notify.sendExpiryReminders();
  assert.equal((await lines("share.expiring")).length, 1);
  assert.equal((await lines("share.expiring"))[0].subjectId, share.id);
  assert.equal((await lines("receive.expiring")).length, 1);
  assert.equal((await lines("receive.expiring"))[0].subjectId, link.id);
  assert.equal(
    (await lines("share.expiring")).some((l) => l.subjectId === later.id),
    false
  );

  await prisma.share.update({ where: { id: share.id }, data: { expiration: new Date(Date.now() + day) } });
  await notify.sendExpiryReminders();
  assert.equal((await lines("share.expiring")).length, 2, "a moved end date is told again");
  await prisma.appConfig.update({ where: { key: "notifyExpiryEnabled" }, data: { value: "true" } });
});

test("storage almost full is told when usage crosses 90 percent, once until it drops below", async () => {
  await prisma.user.update({ where: { id: "bob" }, data: { storageLimitBytes: 1000n } });
  const lines = () => prisma.activityEvent.count({ where: { ownerId: "bob", action: "account.storage_almost_full" } });
  const add = async (size: number) => {
    await prisma.file.create({
      data: {
        name: `f${Math.random()}`,
        extension: "txt",
        size: BigInt(size),
        objectName: `bob/${Math.random()}`,
        userId: "bob",
      },
    });
    await notifications.noteStorageGrowth("bob", size);
  };

  await add(500);
  assert.equal(await lines(), 0);
  await add(399);
  assert.equal(await lines(), 0, "899 of 1000");
  await add(1);
  assert.equal(await lines(), 1, "900 of 1000");
  await add(50);
  assert.equal(await lines(), 1, "still above: not again");

  await prisma.file.deleteMany({ where: { userId: "bob" } });
  await add(100);
  await add(800);
  assert.equal(await lines(), 2, "dropped below, crossed again");
  assert.equal(
    await prisma.activityEvent.count({ where: { ownerId: "alice", action: "account.storage_almost_full" } }),
    0
  );
});

test("a user without a limit never gets the storage line", async () => {
  await prisma.appConfig.update({ where: { key: "maxTotalStoragePerUser" }, data: { value: "0" } });
  await notifications.noteStorageGrowth("alice", 5);
  assert.equal(
    await prisma.activityEvent.count({ where: { action: "account.storage_almost_full", ownerId: "alice" } }),
    0
  );
});
