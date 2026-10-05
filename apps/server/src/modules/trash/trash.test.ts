import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import { fastify, FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { useTestDatabase } from "../../../test-support/test-db";

const database = useTestDatabase();
const DAY = 24 * 60 * 60 * 1000;

let app: FastifyInstance;
let prisma: typeof import("../../shared/prisma").prisma;
let FileService: typeof import("../file/service").FileService;

const removed: string[] = [];
let originalDelete: (typeof FileService.prototype)["deleteObject"];
let originalPresign: (typeof FileService.prototype)["getPresignedGetUrl"];

before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  ({ FileService } = await import("../file/service"));
  const { registerRoutes } = await import("../../routes");

  app = fastify({ ignoreTrailingSlash: true });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, { secret: "test-secret", cookie: { cookieName: "token", signed: false } });
  await app.register(fastifyMultipart);
  registerRoutes(app);
  await app.ready();

  for (const id of ["alice", "bob"]) {
    await prisma.user.create({
      data: { id, firstName: id, lastName: "Test", username: id, email: `${id}@example.test` },
    });
  }
  originalDelete = FileService.prototype.deleteObject;
  originalPresign = FileService.prototype.getPresignedGetUrl;
});

beforeEach(() => {
  removed.length = 0;
  FileService.prototype.deleteObject = async (objectName: string) => {
    removed.push(objectName);
  };
  FileService.prototype.getPresignedGetUrl = async (objectName: string) => `https://storage.test/${objectName}`;
});

afterEach(async () => {
  FileService.prototype.deleteObject = originalDelete;
  FileService.prototype.getPresignedGetUrl = originalPresign;
  await prisma.share.deleteMany();
  await prisma.shareSecurity.deleteMany();
  await prisma.file.deleteMany();
  await prisma.folder.deleteMany();
});

after(async () => {
  await app?.close();
  await prisma?.$disconnect();
  database.cleanup();
});

const session = (userId: string) => ({ token: app.jwt.sign({ userId, isAdmin: false }) });
const as = (userId: string, method: "GET" | "POST" | "DELETE" | "PUT", url: string, payload?: object) =>
  app.inject({ method, url, cookies: session(userId), ...(payload ? { payload } : {}) });

let counter = 0;
const addFile = (userId: string, name: string, size = 100, folderId: string | null = null) =>
  prisma.file.create({
    data: {
      name,
      extension: name.split(".").pop() ?? "",
      size: BigInt(size),
      objectName: `${userId}/${++counter}-${name}`,
      userId,
      folderId,
    },
  });
const addFolder = (userId: string, name: string, parentId: string | null = null) =>
  prisma.folder.create({ data: { name, objectName: `${userId}/folder-${++counter}`, userId, parentId } });

const trashItems = async (userId: string) =>
  (await as(userId, "GET", "/trash")).json().items as Array<{
    kind: string;
    id: string;
    name: string;
    size: number;
    place: string | null;
    daysLeft: number;
    fileCount: number;
  }>;

test("deleting a file moves it to the trash and removes nothing from storage", async () => {
  const file = await addFile("alice", "offer.pdf");

  const reply = await as("alice", "DELETE", `/files/${file.id}`);

  assert.equal(reply.statusCode, 200);
  assert.deepEqual(removed, []);
  const row = await prisma.file.findUniqueOrThrow({ where: { id: file.id } });
  assert.ok(row.deletedAt, "the row stays, marked");
  assert.deepEqual((await as("alice", "GET", "/files")).json().files, []);
  const items = await trashItems("alice");
  assert.deepEqual(
    items.map((item) => [item.kind, item.name, item.size]),
    [["file", "offer.pdf", 100]]
  );
});

test("a file that is already in the trash cannot be deleted or renamed again", async () => {
  const file = await addFile("alice", "a.txt");
  await as("alice", "DELETE", `/files/${file.id}`);

  assert.equal((await as("alice", "DELETE", `/files/${file.id}`)).statusCode, 404);
  assert.equal((await as("alice", "PUT", `/files/${file.id}`, { name: "b.txt" })).statusCode, 404);
});

test("deleting a folder trashes everything under it, and the trash shows one line", async () => {
  const top = await addFolder("alice", "Projects");
  const inner = await addFolder("alice", "2026", top.id);
  await addFile("alice", "a.txt", 10, top.id);
  await addFile("alice", "b.txt", 20, inner.id);

  const reply = await as("alice", "DELETE", `/folders/${top.id}`);

  assert.equal(reply.statusCode, 200);
  assert.deepEqual(removed, []);
  assert.equal(await prisma.folder.count({ where: { deletedAt: null } }), 0);
  assert.equal(await prisma.file.count({ where: { deletedAt: null } }), 0);
  assert.deepEqual((await as("alice", "GET", "/folders")).json().folders, []);
  assert.deepEqual((await as("alice", "GET", "/files")).json().files, []);
  const items = await trashItems("alice");
  assert.equal(items.length, 1);
  assert.deepEqual([items[0].kind, items[0].name, items[0].size, items[0].fileCount], ["folder", "Projects", 30, 2]);
});

test("restoring a folder brings back everything that went with it", async () => {
  const top = await addFolder("alice", "Projects");
  const inner = await addFolder("alice", "2026", top.id);
  const deep = await addFile("alice", "b.txt", 20, inner.id);
  await as("alice", "DELETE", `/folders/${top.id}`);

  const reply = await as("alice", "POST", `/trash/folder/${top.id}/restore`);

  assert.equal(reply.statusCode, 200);
  assert.equal((await as("alice", "GET", "/trash")).json().items.length, 0);
  const files = (await as("alice", "GET", "/files")).json().files as Array<{ id: string }>;
  assert.deepEqual(
    files.map((file) => file.id),
    [deep.id]
  );
  const folders = (await as("alice", "GET", "/folders")).json().folders as Array<{ id: string }>;
  assert.equal(folders.length, 2);
});

test("an item trashed on its own earlier stays in the trash when its folder is restored", async () => {
  const folder = await addFolder("alice", "Projects");
  const early = await addFile("alice", "early.txt", 5, folder.id);
  await addFile("alice", "late.txt", 7, folder.id);
  await as("alice", "DELETE", `/files/${early.id}`);
  await as("alice", "DELETE", `/folders/${folder.id}`);
  assert.equal((await trashItems("alice")).length, 2, "the folder and the earlier file");

  await as("alice", "POST", `/trash/folder/${folder.id}/restore`);

  const items = await trashItems("alice");
  assert.deepEqual(
    items.map((item) => item.name),
    ["early.txt"]
  );
  const back = (await as("alice", "GET", `/files?folderId=${folder.id}`)).json().files as Array<{ name: string }>;
  assert.deepEqual(
    back.map((file) => file.name),
    ["late.txt"]
  );
  assert.equal(items[0].place, "Projects", "it says where it was");
  await as("alice", "DELETE", `/folders/${folder.id}`);
  const lines = await trashItems("alice");
  const line = lines.find((item) => item.kind === "folder");
  assert.deepEqual([line?.size, line?.fileCount], [7, 1], "a folder line counts only what went with it");
});

test("restoring into a folder that is gone or in the trash puts the item at the top level", async () => {
  const folder = await addFolder("alice", "Projects");
  const file = await addFile("alice", "a.txt", 5, folder.id);
  await as("alice", "DELETE", `/files/${file.id}`);
  await as("alice", "DELETE", `/folders/${folder.id}`);

  assert.equal((await as("alice", "POST", `/trash/file/${file.id}/restore`)).statusCode, 200);

  const row = await prisma.file.findUniqueOrThrow({ where: { id: file.id } });
  assert.equal(row.deletedAt, null);
  assert.equal(row.folderId, null);
});

test("restoring where the name is taken adds a suffix the way uploads do", async () => {
  const old = await addFile("alice", "report.pdf");
  await as("alice", "DELETE", `/files/${old.id}`);
  const fresh = await addFile("alice", "report.pdf");
  const folder = await addFolder("alice", "Docs");
  await as("alice", "DELETE", `/folders/${folder.id}`);
  await addFolder("alice", "Docs");

  await as("alice", "POST", `/trash/file/${old.id}/restore`);
  await as("alice", "POST", `/trash/folder/${folder.id}/restore`);

  assert.equal((await prisma.file.findUniqueOrThrow({ where: { id: old.id } })).name, "report (1).pdf");
  assert.equal((await prisma.folder.findUniqueOrThrow({ where: { id: folder.id } })).name, "Docs (1)");
  assert.equal((await prisma.file.findUniqueOrThrow({ where: { id: fresh.id } })).name, "report.pdf");
});

test("a name in the trash does not block a new file with that name", async () => {
  const file = await addFile("alice", "a.txt");
  await as("alice", "DELETE", `/files/${file.id}`);

  const check = await as("alice", "POST", "/files/check", {
    name: "a.txt",
    extension: "txt",
    size: 1,
    objectName: "x",
  });

  assert.equal(check.statusCode, 201);
  assert.equal(check.json().suggestedName, undefined);
});

test("somebody else cannot list, restore or purge what is in my trash", async () => {
  const file = await addFile("alice", "secret.txt");
  const folder = await addFolder("alice", "Private");
  await as("alice", "DELETE", `/files/${file.id}`);
  await as("alice", "DELETE", `/folders/${folder.id}`);

  assert.deepEqual(await trashItems("bob"), []);
  assert.equal((await as("bob", "POST", `/trash/file/${file.id}/restore`)).statusCode, 404);
  assert.equal((await as("bob", "POST", `/trash/folder/${folder.id}/restore`)).statusCode, 404);
  assert.equal((await as("bob", "DELETE", `/trash/file/${file.id}`)).statusCode, 404);
  assert.equal((await as("bob", "DELETE", `/trash/folder/${folder.id}`)).statusCode, 404);
  assert.equal((await as("bob", "DELETE", "/trash")).statusCode, 200);

  assert.deepEqual(removed, []);
  assert.equal(await prisma.file.count({ where: { deletedAt: { not: null } } }), 1);
  assert.equal(await prisma.folder.count({ where: { deletedAt: { not: null } } }), 1);
  assert.equal((await trashItems("alice")).length, 2);
});

test("the trash routes need a signed in user", async () => {
  assert.equal((await app.inject({ method: "GET", url: "/trash" })).statusCode, 401);
  assert.equal((await app.inject({ method: "DELETE", url: "/trash" })).statusCode, 401);
  assert.equal((await app.inject({ method: "POST", url: "/trash/file/x/restore" })).statusCode, 401);
});

test("an item that is not in the trash cannot be restored or purged through the trash routes", async () => {
  const file = await addFile("alice", "live.txt");

  assert.equal((await as("alice", "POST", `/trash/file/${file.id}/restore`)).statusCode, 404);
  assert.equal((await as("alice", "DELETE", `/trash/file/${file.id}`)).statusCode, 404);
  assert.deepEqual(removed, []);
  assert.equal(await prisma.file.count(), 1);
});

test("deleting a file for good asks storage once and frees the figure", async () => {
  const keep = await addFile("alice", "keep.bin", 1000);
  const gone = await addFile("alice", "gone.bin", 400);
  await as("alice", "DELETE", `/files/${gone.id}`);
  const before = (await as("alice", "GET", "/storage/usage")).json();
  assert.equal(before.usedBytes, 1400, "the trash counts toward the limit");
  assert.equal((await as("alice", "GET", "/trash")).json().totalBytes, 400);

  const reply = await as("alice", "DELETE", `/trash/file/${gone.id}`);

  assert.equal(reply.statusCode, 200);
  assert.deepEqual(removed, [gone.objectName]);
  assert.equal(await prisma.file.count({ where: { id: gone.id } }), 0);
  const after = (await as("alice", "GET", "/storage/usage")).json();
  assert.equal(after.usedBytes, 1000);
  assert.equal((await as("alice", "GET", "/trash")).json().totalBytes, 0);
  assert.equal(await prisma.file.count({ where: { id: keep.id } }), 1);
});

test("deleting a folder for good removes every object under it once", async () => {
  const top = await addFolder("alice", "Projects");
  const inner = await addFolder("alice", "2026", top.id);
  const a = await addFile("alice", "a.txt", 10, top.id);
  const b = await addFile("alice", "b.txt", 20, inner.id);
  const early = await addFile("alice", "early.txt", 5, inner.id);
  await as("alice", "DELETE", `/files/${early.id}`);
  await as("alice", "DELETE", `/folders/${top.id}`);

  const reply = await as("alice", "DELETE", `/trash/folder/${top.id}`);

  assert.equal(reply.statusCode, 200);
  const files = [a, b, early].map((file) => file.objectName);
  for (const objectName of files) assert.equal(removed.filter((name) => name === objectName).length, 1, objectName);
  assert.equal(await prisma.file.count(), 0);
  assert.equal(await prisma.folder.count(), 0);
});

test("when storage refuses, the file stays in the trash to try again", async () => {
  const file = await addFile("alice", "a.txt");
  await as("alice", "DELETE", `/files/${file.id}`);
  FileService.prototype.deleteObject = async () => {
    throw new Error("storage is down");
  };

  const reply = await as("alice", "DELETE", `/trash/file/${file.id}`);

  assert.equal(reply.statusCode, 500);
  assert.equal(await prisma.file.count({ where: { id: file.id } }), 1);
  assert.equal((await trashItems("alice")).length, 1);
});

test("emptying the trash removes all of mine and none of anybody else's", async () => {
  const mine = await addFile("alice", "a.txt");
  const folder = await addFolder("alice", "F");
  const inFolder = await addFile("alice", "b.txt", 1, folder.id);
  const live = await addFile("alice", "live.txt");
  const theirs = await addFile("bob", "theirs.txt");
  await as("alice", "DELETE", `/files/${mine.id}`);
  await as("alice", "DELETE", `/folders/${folder.id}`);
  await as("bob", "DELETE", `/files/${theirs.id}`);

  const reply = await as("alice", "DELETE", "/trash");

  assert.equal(reply.statusCode, 200);
  for (const file of [mine, inFolder]) assert.equal(removed.filter((name) => name === file.objectName).length, 1);
  assert.ok(!removed.some((name) => name.startsWith("bob/")), "nothing of somebody else's");
  assert.deepEqual(await trashItems("alice"), []);
  assert.equal(await prisma.file.count({ where: { id: live.id } }), 1);
  assert.equal((await trashItems("bob")).length, 1);
});

test("the trash says how much it holds and how many days are left", async () => {
  const file = await addFile("alice", "a.txt", 300);
  await addFile("alice", "b.txt", 200).then((other) => as("alice", "DELETE", `/files/${other.id}`));
  await as("alice", "DELETE", `/files/${file.id}`);
  await prisma.file.update({ where: { id: file.id }, data: { deletedAt: new Date(Date.now() - 10 * DAY) } });

  const body = (await as("alice", "GET", "/trash")).json();

  assert.equal(body.totalBytes, 500);
  assert.equal(body.retentionDays, 30);
  const byName = new Map(body.items.map((item: { name: string; daysLeft: number }) => [item.name, item.daysLeft]));
  assert.equal(byName.get("a.txt"), 20);
  assert.equal(byName.get("b.txt"), 30);
});

test("a file in the trash is not offered or served through a share, the share itself stays", async () => {
  const keep = await addFile("alice", "keep.txt");
  const gone = await addFile("alice", "gone.txt");
  const security = await prisma.shareSecurity.create({ data: {} });
  const share = await prisma.share.create({
    data: {
      name: "pack",
      creatorId: "alice",
      securityId: security.id,
      files: { connect: [{ id: keep.id }, { id: gone.id }] },
    },
  });
  await as("alice", "DELETE", `/files/${gone.id}`);

  const view = await app.inject({ method: "GET", url: `/shares/${share.id}` });
  const mine = (await as("alice", "GET", "/shares/me")).json().shares;
  const download = await app.inject({ method: "GET", url: `/files/download-url?objectName=${gone.objectName}` });
  const stream = await app.inject({ method: "GET", url: `/files/download?objectName=${gone.objectName}` });
  const embed = await app.inject({ method: "GET", url: `/embed/${gone.id}` });

  assert.equal(view.statusCode, 200);
  assert.deepEqual(
    view.json().share.files.map((file: { name: string }) => file.name),
    ["keep.txt"]
  );
  assert.deepEqual(
    mine[0].files.map((file: { name: string }) => file.name),
    ["keep.txt"]
  );
  assert.equal(download.statusCode, 404);
  assert.equal(stream.statusCode, 404);
  assert.equal(embed.statusCode, 404);

  await as("alice", "POST", `/trash/file/${gone.id}/restore`);
  const again = await app.inject({ method: "GET", url: `/shares/${share.id}` });
  assert.equal(again.json().share.files.length, 2, "restored, it is in the share again");
});

test("a trashed folder is not served through a share", async () => {
  const folder = await addFolder("alice", "Shared");
  await addFile("alice", "inside.txt", 1, folder.id);
  const security = await prisma.shareSecurity.create({ data: {} });
  const share = await prisma.share.create({
    data: { creatorId: "alice", securityId: security.id, folders: { connect: { id: folder.id } } },
  });
  const url = `/shares/${share.id}/folders/${folder.id}/contents`;
  assert.equal((await app.inject({ method: "GET", url })).statusCode, 200);

  await as("alice", "DELETE", `/folders/${folder.id}`);

  assert.equal((await app.inject({ method: "GET", url })).statusCode, 404);
  const view = await app.inject({ method: "GET", url: `/shares/${share.id}` });
  assert.deepEqual(view.json().share.folders, []);
});

test("a nested trashed file is left out of the folder served through a share", async () => {
  const folder = await addFolder("alice", "Shared");
  await addFile("alice", "inside.txt", 1, folder.id);
  const hidden = await addFile("alice", "hidden.txt", 1, folder.id);
  const security = await prisma.shareSecurity.create({ data: {} });
  const share = await prisma.share.create({
    data: { creatorId: "alice", securityId: security.id, folders: { connect: { id: folder.id } } },
  });
  await as("alice", "DELETE", `/files/${hidden.id}`);

  const reply = await app.inject({ method: "GET", url: `/shares/${share.id}/folders/${folder.id}/contents` });
  const zip = await app.inject({ method: "GET", url: `/shares/${share.id}/folders/${folder.id}/download` });

  assert.deepEqual(
    reply.json().files.map((file: { name: string }) => file.name),
    ["inside.txt"]
  );
  assert.equal(zip.statusCode, 200);
  assert.deepEqual(
    zip.json().files.map((file: { name: string }) => file.name),
    ["inside.txt"]
  );
});

test("the trash counts toward the storage limit", async () => {
  await prisma.appConfig.update({ where: { key: "maxTotalStoragePerUser" }, data: { value: "1000" } });
  const big = await addFile("alice", "big.bin", 900);
  await as("alice", "DELETE", `/files/${big.id}`);

  const check = await as("alice", "POST", "/files/check", {
    name: "x.bin",
    extension: "bin",
    size: 200,
    objectName: "x",
  });

  assert.equal(check.statusCode, 400);
  assert.equal(check.json().code, "insufficientStorage");
});

test("a file moved into a folder in the trash is refused", async () => {
  const folder = await addFolder("alice", "Gone");
  const file = await addFile("alice", "a.txt");
  await as("alice", "DELETE", `/folders/${folder.id}`);

  const reply = await as("alice", "PUT", `/files/${file.id}/move`, { folderId: folder.id });

  assert.equal(reply.statusCode, 400);
});

test("an API key cannot reach the trash routes, a full key can still delete a file into the trash", async () => {
  const { isRouteAllowed } = await import("../api-key/key");

  for (const [method, route] of [
    ["GET", "/trash"],
    ["DELETE", "/trash"],
    ["POST", "/trash/:kind/:id/restore"],
    ["DELETE", "/trash/:kind/:id"],
  ]) {
    assert.equal(isRouteAllowed("full", method, route), false, `${method} ${route}`);
  }
  assert.equal(isRouteAllowed("full", "DELETE", "/files/:id"), true);
});

test("a file without an extension keeps a clean name when it is restored next to a file of the same name", async () => {
  const old = await addFile("alice", "README");
  await prisma.file.update({ where: { id: old.id }, data: { extension: "" } });
  await as("alice", "DELETE", `/files/${old.id}`);
  await addFile("alice", "README");

  await as("alice", "POST", `/trash/file/${old.id}/restore`);

  assert.equal((await prisma.file.findUniqueOrThrow({ where: { id: old.id } })).name, "README (1)");
});
