import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import { fastify, FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { useTestDatabase } from "../../../test-support/test-db";

const database = useTestDatabase();

let app: FastifyInstance;
let prisma: typeof import("../../shared/prisma").prisma;
let FileService: typeof import("../file/service").FileService;
let service: typeof import("./service");

const removed: string[] = [];
let originalDelete: (typeof FileService.prototype)["deleteObject"];
let onDelete: (objectName: string) => Promise<void> = async () => undefined;

before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  ({ FileService } = await import("../file/service"));
  service = await import("./service");
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
});

beforeEach(() => {
  removed.length = 0;
  onDelete = async () => undefined;
  FileService.prototype.deleteObject = async (objectName: string) => {
    removed.push(objectName);
    await onDelete(objectName);
  };
});

afterEach(async () => {
  FileService.prototype.deleteObject = originalDelete;
  await prisma.file.deleteMany();
  await prisma.folder.deleteMany();
});

after(async () => {
  await app?.close();
  await prisma?.$disconnect();
  database.cleanup();
});

const as = (userId: string, method: "GET" | "POST" | "DELETE" | "PUT", url: string, payload?: object) =>
  app.inject({
    method,
    url,
    cookies: { token: app.jwt.sign({ userId, isAdmin: false }) },
    ...(payload ? { payload } : {}),
  });

let counter = 0;
const addFile = (userId: string, name: string, folderId: string | null = null, objectName?: string) =>
  prisma.file.create({
    data: {
      name,
      extension: "txt",
      size: BigInt(10),
      objectName: objectName ?? `${userId}/${++counter}-${name}`,
      userId,
      folderId,
    },
  });
const addFolder = (userId: string, name: string, parentId: string | null = null) =>
  prisma.folder.create({ data: { name, objectName: `${userId}/folder-${++counter}`, userId, parentId } });
const register = (userId: string, objectName: string, extra: object = {}) =>
  as(userId, "POST", "/files", { name: "x", extension: "txt", size: 5, objectName, ...extra });

// ---- H2 (a): object names

test("registering another user's object name is refused and writes no row", async () => {
  const theirs = await addFile("bob", "secret.pdf");

  const reply = await register("alice", theirs.objectName);

  assert.ok([400, 403].includes(reply.statusCode), String(reply.statusCode));
  assert.equal(await prisma.file.count({ where: { userId: "alice" } }), 0);
});

test("registering a name without an own prefix, or with a path trick, is refused", async () => {
  for (const name of ["plain", "/alice/a", "alice/../bob/a", "alice//a", "alice/", "bobalice/a", "folders/1-x"]) {
    const reply = await register("alice", name);
    assert.equal(reply.statusCode, 400, `${name} answered ${reply.statusCode}`);
  }
  assert.equal(await prisma.file.count(), 0);
});

test("registering the same object name twice is refused, also when the first is in the trash", async () => {
  const first = await register("alice", "alice/123-abc-x.txt");
  assert.equal(first.statusCode, 201, first.body);
  assert.equal((await register("alice", "alice/123-abc-x.txt")).statusCode, 400);

  const row = await prisma.file.findFirstOrThrow({ where: { userId: "alice" } });
  await prisma.file.update({ where: { id: row.id }, data: { deletedAt: new Date() } });
  assert.equal((await register("alice", "alice/123-abc-x.txt")).statusCode, 400);
  assert.equal(await prisma.file.count(), 1);
});

test("the names the server hands out for uploads can be registered", async () => {
  const made = `alice/${Date.now()}-${Math.random().toString(36).substring(7)}-my file.txt`;
  assert.equal((await register("alice", made)).statusCode, 201);
});

test("a folder cannot be registered with the object name of a file", async () => {
  const file = await addFile("bob", "secret.pdf");

  const reply = await as("alice", "POST", "/folders", { name: "Mine", objectName: file.objectName });

  assert.equal(reply.statusCode, 400);
  assert.equal(await prisma.folder.count({ where: { userId: "alice" } }), 0);
});

// ---- H2 (b): purge with a shared object

test("purging one of two legacy rows that share an object keeps the object", async () => {
  const a = await addFile("alice", "a.txt", null, "alice/shared-object");
  await addFile("alice", "b.txt", null, "alice/shared-object");
  await as("alice", "DELETE", `/files/${a.id}`);

  const reply = await as("alice", "DELETE", `/trash/file/${a.id}`);

  assert.equal(reply.statusCode, 200);
  assert.deepEqual(removed, []);
  assert.equal(await prisma.file.count(), 1);
});

test("purging the last row that uses an object removes the object", async () => {
  const a = await addFile("alice", "a.txt", null, "alice/solo");
  await as("alice", "DELETE", `/files/${a.id}`);

  await as("alice", "DELETE", `/trash/file/${a.id}`);

  assert.deepEqual(removed, ["alice/solo"]);
});

test("purging a folder keeps an object that a live row of somebody else still uses", async () => {
  const folder = await addFolder("alice", "F");
  await addFile("alice", "a.txt", folder.id, "alice/shared");
  await addFile("bob", "b.txt", null, "alice/shared");
  await as("alice", "DELETE", `/folders/${folder.id}`);

  await as("alice", "DELETE", `/trash/folder/${folder.id}`);

  assert.ok(!removed.includes("alice/shared"));
  assert.equal(await prisma.file.count({ where: { userId: "bob" } }), 1);
});

// ---- H1: purge only what is trashed

test("a live file and a live sub folder inside a trashed folder survive the purge, objects untouched", async () => {
  const top = await addFolder("alice", "Top");
  const dead = await addFile("alice", "dead.txt", top.id);
  await as("alice", "DELETE", `/folders/${top.id}`);
  // they became live under a trashed folder (the situation M3 describes)
  const liveFile = await addFile("alice", "live.txt", top.id);
  const liveFolder = await addFolder("alice", "Live", top.id);
  const deep = await addFile("alice", "deep.txt", liveFolder.id);

  assert.equal((await as("alice", "DELETE", `/trash/folder/${top.id}`)).statusCode, 200);

  assert.deepEqual(removed, [dead.objectName], "file objects only, folders have no object");
  const file = await prisma.file.findUniqueOrThrow({ where: { id: liveFile.id } });
  assert.equal(file.deletedAt, null);
  assert.equal(file.folderId, null, "moved to the top level");
  const folder = await prisma.folder.findUniqueOrThrow({ where: { id: liveFolder.id } });
  assert.equal(folder.deletedAt, null);
  assert.equal(folder.parentId, null);
  assert.equal((await prisma.file.findUniqueOrThrow({ where: { id: deep.id } })).folderId, liveFolder.id);
  assert.equal(await prisma.folder.count({ where: { id: top.id } }), 0);
});

test("a restore between two file deletes of a running purge loses nothing that was restored", async () => {
  const top = await addFolder("alice", "Top");
  const one = await addFile("alice", "one.txt", top.id);
  const two = await addFile("alice", "two.txt", top.id);
  await as("alice", "DELETE", `/folders/${top.id}`);
  void one;
  void two;
  let restored = false;
  onDelete = async () => {
    if (restored) return;
    restored = true;
    assert.equal((await as("alice", "POST", `/trash/folder/${top.id}/restore`)).statusCode, 200);
  };

  const purged = await service.purgeItem("alice", "folder", top.id);
  assert.equal(purged, false, "the folder was restored, so it is not purged");

  // Whatever is still live is complete: row and object both there, never a row without its object.
  const live = await prisma.file.findMany({ where: { userId: "alice" } });
  for (const row of live) {
    assert.equal(row.deletedAt, null, `${row.name} is live again`);
    assert.ok(!removed.includes(row.objectName), `${row.name} kept its object`);
  }
  const folder = await prisma.folder.findUnique({ where: { id: top.id } });
  assert.ok(folder, "the restored folder is still there");
  assert.equal(folder.deletedAt, null);
  assert.equal(live.length + removed.filter((name) => name.includes("txt")).length, 2, "nothing vanished");
});

test("a file restored while its purge runs: the restore is refused, the file stays in the trash and can be restored later", async () => {
  const file = await addFile("alice", "a.txt");
  await as("alice", "DELETE", `/files/${file.id}`);
  let restoreAnswer = 0;
  onDelete = async () => {
    restoreAnswer = (await as("alice", "POST", `/trash/file/${file.id}/restore`)).statusCode;
    throw new Error("storage down");
  };

  await assert.rejects(() => service.purgeItem("alice", "file", file.id));

  assert.equal(restoreAnswer, 404, "the row is claimed, so there is nothing to restore");
  const back = await prisma.file.findUniqueOrThrow({ where: { id: file.id } });
  assert.ok(back.deletedAt, "back in the trash");
  onDelete = async () => undefined;
  assert.equal((await as("alice", "POST", `/trash/file/${file.id}/restore`)).statusCode, 200);
  const live = await prisma.file.findUniqueOrThrow({ where: { id: file.id } });
  assert.equal(live.deletedAt, null);
  assert.equal(live.objectName, file.objectName);
  assert.deepEqual(removed, [file.objectName], "only the one failed attempt reached storage");
});

test("when storage refuses, the row is back in the trash", async () => {
  const file = await addFile("alice", "a.txt");
  await as("alice", "DELETE", `/files/${file.id}`);
  onDelete = async () => {
    throw new Error("storage down");
  };

  await assert.rejects(() => service.purgeItem("alice", "file", file.id));

  const row = await prisma.file.findUniqueOrThrow({ where: { id: file.id } });
  assert.ok(row.deletedAt);
  assert.equal(row.name, "a.txt");
});

test("when storage refuses, a trashed file keeps its place in a share", async () => {
  const file = await addFile("alice", "a.txt");
  const security = await prisma.shareSecurity.create({ data: {} });
  const share = await prisma.share.create({
    data: {
      name: "link",
      creatorId: "alice",
      securityId: security.id,
      files: { connect: [{ id: file.id }] },
      alias: { create: { alias: `alias-${++counter}` } },
    },
  });
  await as("alice", "DELETE", `/files/${file.id}`);
  onDelete = async () => {
    throw new Error("storage down");
  };

  await assert.rejects(() => service.purgeItem("alice", "file", file.id));
  assert.equal((await as("alice", "POST", `/trash/file/${file.id}/restore`)).statusCode, 200);

  const inShare = await prisma.share.findUniqueOrThrow({ where: { id: share.id }, include: { files: true } });
  assert.deepEqual(
    inShare.files.map((row) => row.id),
    [file.id]
  );
});

test("when storage refuses and the folder is gone, the row is re-created at the top level", async () => {
  const folder = await addFolder("alice", "F");
  const file = await addFile("alice", "a.txt", folder.id);
  await as("alice", "DELETE", `/files/${file.id}`);
  onDelete = async () => {
    // another run purged the parent folder meanwhile
    await prisma.folder.delete({ where: { id: folder.id } });
    throw new Error("storage down");
  };

  await assert.rejects(
    () => service.purgeItem("alice", "file", file.id),
    (error: Error) => error.message === "storage down"
  );

  const row = await prisma.file.findUniqueOrThrow({ where: { id: file.id } });
  assert.equal(row.folderId, null);
  assert.ok(row.deletedAt, "still in the trash");
});

test("when even the retry fails, the row is logged and the original storage error is thrown", async () => {
  const file = await addFile("alice", "a.txt");
  await as("alice", "DELETE", `/files/${file.id}`);
  const logged: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => void logged.push(args.map(String).join(" "));
  onDelete = async () => {
    // somebody took the id meanwhile: both creates fail
    await prisma.file.create({
      data: { id: file.id, name: "x", extension: "txt", size: BigInt(1), objectName: "alice/other", userId: "alice" },
    });
    throw new Error("storage down");
  };

  try {
    await assert.rejects(
      () => service.purgeItem("alice", "file", file.id),
      (error: Error) => error.message === "storage down"
    );
  } finally {
    console.error = originalError;
  }

  assert.ok(logged.some((line) => line.includes(file.objectName) && line.includes(file.id)));
});

test("purging a folder never asks storage to delete the folder's own name", async () => {
  const folder = await prisma.folder.create({ data: { name: "F", objectName: "bob/precious.pdf", userId: "alice" } });
  await as("alice", "DELETE", `/folders/${folder.id}`);

  assert.equal((await as("alice", "DELETE", `/trash/folder/${folder.id}`)).statusCode, 200);

  assert.deepEqual(removed, []);
});

test("a folder purge that leaves files behind is a failure: 409 for one, counted failed for Empty trash", async () => {
  const folder = await addFolder("alice", "F");
  await addFile("alice", "a.txt", folder.id);
  await as("alice", "DELETE", `/folders/${folder.id}`);
  // a new trashed file keeps arriving in the folder every time the purge looks
  onDelete = async () => {
    await prisma.file.create({
      data: {
        name: `late${++counter}.txt`,
        extension: "txt",
        size: BigInt(1),
        objectName: `alice/late-${counter}`,
        userId: "alice",
        folderId: folder.id,
        deletedAt: new Date(),
      },
    });
  };

  const single = await as("alice", "DELETE", `/trash/folder/${folder.id}`);
  assert.equal(single.statusCode, 409, single.body);
  assert.ok(single.json().error.length > 10);
  assert.equal(await prisma.folder.count({ where: { id: folder.id } }), 1, "the folder stays in the trash");

  const result = await service.purgeItems("alice", [{ kind: "folder", id: folder.id }]);
  assert.deepEqual(result, { removed: 0, failed: 1 });
});

test("purging a folder that is no longer in the trash is still a plain 404", async () => {
  const folder = await addFolder("alice", "F");
  assert.equal((await as("alice", "DELETE", `/trash/folder/${folder.id}`)).statusCode, 404);
});

// ---- M3: atomic trashing and ancestors

test("a file, folder or move into a folder whose ANY ancestor is trashed is refused", async () => {
  const top = await addFolder("alice", "Top");
  const mid = await addFolder("alice", "Mid", top.id);
  const leaf = await addFolder("alice", "Leaf", mid.id);
  await prisma.folder.update({ where: { id: top.id }, data: { deletedAt: new Date() } }); // only the top
  const file = await addFile("alice", "a.txt");
  const other = await addFolder("alice", "Other");

  assert.equal((await register("alice", "alice/new-1", { folderId: leaf.id })).statusCode, 400);
  const sub = await as("alice", "POST", "/folders", { name: "S", objectName: "folders/s", parentId: leaf.id });
  assert.equal(sub.statusCode, 400);
  assert.equal((await as("alice", "PUT", `/files/${file.id}/move`, { folderId: leaf.id })).statusCode, 400);
  assert.equal((await as("alice", "PUT", `/folders/${other.id}/move`, { parentId: leaf.id })).statusCode, 400);
  assert.equal(await prisma.file.count({ where: { folderId: leaf.id } }), 0);
  assert.equal(await prisma.folder.count({ where: { parentId: leaf.id } }), 0);
});

test("trashing a folder takes everything that is under it at that moment, in one transaction", async () => {
  const top = await addFolder("alice", "Top");
  const mid = await addFolder("alice", "Mid", top.id);
  const a = await addFile("alice", "a.txt", mid.id);
  const now = new Date();

  await service.moveFolderToTrash(top.id, "alice", now);

  assert.equal((await prisma.file.findUniqueOrThrow({ where: { id: a.id } })).deletedAt?.getTime(), now.getTime());
  assert.equal((await prisma.folder.findUniqueOrThrow({ where: { id: mid.id } })).deletedAt?.getTime(), now.getTime());
});

// ---- L5: big trees

test("a tree with thousands of folders and files can be trashed, restored and purged", async () => {
  const top = await addFolder("alice", "Big");
  const folders = Array.from({ length: 1200 }, (_, index) => ({
    name: `f${index}`,
    objectName: `alice/bigfolder-${index}`,
    userId: "alice",
    parentId: top.id,
  }));
  await prisma.folder.createMany({ data: folders });
  const children = await prisma.folder.findMany({ where: { parentId: top.id }, select: { id: true } });
  await prisma.file.createMany({
    data: children.map((child, index) => ({
      name: `n${index}.txt`,
      extension: "txt",
      size: BigInt(1),
      objectName: `alice/bigfile-${index}`,
      userId: "alice",
      folderId: child.id,
    })),
  });

  await service.moveFolderToTrash(top.id, "alice", new Date());
  assert.equal(await prisma.file.count({ where: { deletedAt: null } }), 0);
  assert.equal(await prisma.folder.count({ where: { deletedAt: null } }), 0);
  assert.equal((await as("alice", "POST", `/trash/folder/${top.id}/restore`)).statusCode, 200);
  assert.equal(await prisma.file.count({ where: { deletedAt: null } }), 1200);

  await service.moveFolderToTrash(top.id, "alice", new Date());
  assert.equal(await service.purgeItem("alice", "folder", top.id), true);
  assert.equal(await prisma.file.count(), 0);
  assert.equal(await prisma.folder.count(), 0);
});

// ---- M4: Empty trash answers at once

const untilIdle = async (userId: string) => {
  for (let tries = 0; tries < 200; tries++) {
    const body = (await as(userId, "GET", "/trash")).json();
    if (!body.emptying.running) return body;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("still emptying");
};

test("emptying the trash answers at once, runs on, and a second call says it is running", async () => {
  const one = await addFile("alice", "a.txt");
  const two = await addFile("alice", "b.txt");
  for (const file of [one, two]) await as("alice", "DELETE", `/files/${file.id}`);
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => (release = resolve));
  onDelete = () => held;

  const first = await as("alice", "DELETE", "/trash");
  const second = await as("alice", "DELETE", "/trash");
  const status = (await as("alice", "GET", "/trash")).json();

  assert.equal(first.statusCode, 202);
  assert.equal(first.json().status, "started");
  assert.equal(second.statusCode, 202);
  assert.equal(second.json().status, "running");
  assert.equal(status.emptying.running, true);
  release();
  const done = await untilIdle("alice");
  assert.deepEqual(done.items, []);
  assert.deepEqual([done.emptying.removed, done.emptying.failed], [2, 0]);
  assert.equal(removed.length, 2, "every object once");
});

test("emptying reports the items storage refused, and nobody sees the run of somebody else", async () => {
  const bad = await addFile("alice", "bad.txt");
  await as("alice", "DELETE", `/files/${bad.id}`);
  onDelete = async () => {
    throw new Error("storage down");
  };

  await as("alice", "DELETE", "/trash");
  const done = await untilIdle("alice");

  assert.deepEqual([done.emptying.removed, done.emptying.failed], [0, 1]);
  assert.equal(done.items.length, 1, "it stays in the trash");
  assert.equal((await as("bob", "GET", "/trash")).json().emptying.failed, 0);
});
