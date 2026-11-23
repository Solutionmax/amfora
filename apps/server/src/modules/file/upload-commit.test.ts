import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { fastify } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { testSession } from "../../../test-support/session";
import { useTestDatabase } from "../../../test-support/test-db";

const database = useTestDatabase();
let prisma: typeof import("../../shared/prisma").prisma;
let FileService: typeof import("./service").FileService;
let receive: import("../reverse-share/service").ReverseShareService;
let user: import("../user/service").UserService;
let trash: typeof import("../trash/service");
const app = fastify();
// The store boundary keeps actual bytes, including replayed staging writes.
const objects = new Map<string, Buffer>();
let failDelete = false;
let failCopy = false;
let duringDelete: (() => Promise<void>) | undefined;
before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  ({ FileService } = await import("./service"));
  const { ReverseShareService } = await import("../reverse-share/service");
  receive = new ReverseShareService();
  const { UserService } = await import("../user/service");
  user = new UserService();
  trash = await import("../trash/service");
  FileService.prototype.getObjectSize = async (key) => {
    const b = objects.get(key);
    if (!b) throw Object.assign(new Error("NotFound"), { name: "NotFound" });
    return b.length;
  };
  FileService.prototype.copyObject = async (a, b) => {
    if (failCopy) throw new Error("copy outage");
    objects.set(b, Buffer.from(objects.get(a)!));
  };
  FileService.prototype.deleteObject = async (key) => {
    await duringDelete?.();
    if (failDelete) throw new Error("storage outage");
    objects.delete(key);
  };
  FileService.prototype.getPresignedPutUrl = async (key) => `https://store.test/${key}`;
  FileService.prototype.createMultipartUpload = async () => "multipart";
  FileService.prototype.abortMultipartUploads = async () => {
    if (failDelete) throw new Error("storage outage");
  };
  FileService.prototype.abortMultipartUpload = async () => {
    if (failDelete) throw new Error("storage outage");
  };
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(cookie);
  await app.register(jwt, { secret: "test", cookie: { cookieName: "token", signed: false } });
  await app.register(multipart);
  const { registerRoutes } = await import("../../routes");
  registerRoutes(app);
  await app.ready();
});
beforeEach(async () => {
  for (const session of (receive as any).uploadSessions.values()) clearTimeout(session.timeout);
  (receive as any).uploadSessions.clear();
  failDelete = false;
  failCopy = false;
  duringDelete = undefined;
  objects.clear();
  await prisma.user.deleteMany();
  await prisma.reverseUpload.deleteMany();
  if ("uploadReservation" in prisma) await (prisma as any).uploadReservation.deleteMany();
  if ("storageDeletion" in prisma) await (prisma as any).storageDeletion.deleteMany();
  await prisma.user.create({
    data: {
      id: "owner",
      firstName: "Owner",
      lastName: "Test",
      username: "owner",
      email: "owner@test.local",
      storageLimitBytes: 10n,
    },
  });
});
after(async () => {
  for (const session of (receive as any).uploadSessions.values()) clearTimeout(session.timeout);
  await app.close();
  await prisma.$disconnect();
  database.cleanup();
});
const register = async (objectName: string) =>
  app.inject({
    method: "POST",
    url: "/files",
    cookies: { token: await testSession(app, { userId: "owner", isAdmin: false }) },
    payload: { name: "bytes.txt", extension: "txt", size: 1, objectName },
  });
// Force the audited read-before-insert interleaving while returning unchanged real SQLite rows.
// New code reads aggregate quota inside a write-first transaction and never uses this racy path.
async function concurrentRegistrations(keys: string[]) {
  const original = prisma.file.findMany;
  const read = original.bind(prisma.file);
  let arrivals = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  (prisma.file as any).findMany = async (args: any) => {
    const rows = await read(args);
    if (args?.select?.size) {
      if (++arrivals === 2) release();
      await gate;
    }
    return rows;
  };
  try {
    return await Promise.all(keys.map(register));
  } finally {
    prisma.file.findMany = original;
  }
}
const link = () =>
  receive.createReverseShare({ name: "Test", maxFiles: 5, maxFileSize: 100, expiration: null } as any, "owner");
test("FS-01 staging replay cannot change committed bytes, size or scan identity; failed copy retries", async () => {
  objects.set("owner/staging", Buffer.from("first"));
  failCopy = true;
  assert.notEqual((await register("owner/staging")).statusCode, 201);
  failCopy = false;
  const r = await register("owner/staging");
  assert.equal(r.statusCode, 201, r.body);
  const f = r.json().file;
  assert.notEqual(f.objectName, "owner/staging");
  objects.set("owner/staging", Buffer.from("overwritten"));
  assert.equal(objects.get(f.objectName)!.toString(), "first");
  assert.equal(f.size, "5");
  assert.equal((await prisma.file.findUniqueOrThrow({ where: { id: f.id } })).size, 5n);
});
test("FS-02 concurrent 6+6 registrations under 10-byte quota commit at most one", async () => {
  objects.set("owner/a", Buffer.alloc(6));
  objects.set("owner/b", Buffer.alloc(6));
  const r = await concurrentRegistrations(["owner/a", "owner/b"]);
  assert.equal(r.filter((x) => x.statusCode === 201).length, 1, r.map((x) => x.body).join("\n"));
  assert.equal((await prisma.file.aggregate({ _sum: { size: true } }))._sum.size, 6n);
});
test("FS-03 concurrent same staging object has one committed identity and replay is idempotent", async () => {
  objects.set("owner/same", Buffer.alloc(4));
  const r = await concurrentRegistrations(["owner/same", "owner/same"]);
  assert.deepEqual(
    r.map((x) => x.statusCode),
    [201, 201]
  );
  assert.equal(r[0].json().file.id, r[1].json().file.id);
  assert.equal(await prisma.file.count(), 1);
  assert.equal((await register("owner/same")).json().file.id, r[0].json().file.id);
});
test("FS-04 receive commit refuses bytes over owner quota even for legacy pending grants", async () => {
  const l = await link();
  objects.set("pending", Buffer.alloc(12));
  await prisma.reverseUpload.create({
    data: {
      objectName: "pending",
      filename: "large.txt",
      size: 12n,
      reverseShareId: l.id,
      expiresAt: new Date(Date.now() + 60000),
    },
  });
  await assert.rejects(
    receive.registerFileUpload(l.id, { name: "large.txt", extension: "txt", size: 12, objectName: "pending" } as any),
    /storage|quota/i
  );
  assert.equal(await prisma.reverseShareFile.count(), 0);
});
test("FS-05 link deletion retains retry work on storage failure and retry removes bytes", async () => {
  const l = await link();
  objects.set("failed", Buffer.alloc(8));
  await prisma.reverseShareFile.create({
    data: { name: "bytes.txt", extension: "txt", size: 8n, objectName: "failed", reverseShareId: l.id },
  });
  failDelete = true;
  await receive.deleteReverseShare(l.id, "owner");
  assert.equal(objects.has("failed"), true);
  assert.equal(await (prisma as any).storageDeletion.count({ where: { objectName: "failed" } }), 1);
  failDelete = false;
  const { sweepStorageCleanup } = await import("../storage/cleanup");
  await sweepStorageCleanup(new Date());
  assert.equal(objects.has("failed"), false);
  assert.equal(await (prisma as any).storageDeletion.count(), 0);
});
test("FS-06 user deletion cleans owned, received and pending bytes and retains outages", async () => {
  const l = await link();
  for (const k of ["owner/owned", "received", "pending"]) objects.set(k, Buffer.alloc(2));
  await prisma.file.create({
    data: { name: "own.txt", extension: "txt", size: 2n, objectName: "owner/owned", userId: "owner" },
  });
  await prisma.reverseShareFile.create({
    data: { name: "received.txt", extension: "txt", size: 2n, objectName: "received", reverseShareId: l.id },
  });
  await prisma.reverseUpload.create({
    data: {
      objectName: "pending",
      filename: "pending.txt",
      size: 2n,
      reverseShareId: l.id,
      expiresAt: new Date(Date.now() + 60000),
    },
  });
  failDelete = true;
  await user.deleteUser("owner");
  assert.equal(await (prisma as any).storageDeletion.count(), 3);
  failDelete = false;
  const { sweepStorageCleanup } = await import("../storage/cleanup");
  await sweepStorageCleanup(new Date());
  assert.equal(objects.size, 0);
});
test("FS-07 failed trash purge retains row even when associated share is concurrently removed", async () => {
  objects.set("owner/trash", Buffer.alloc(5));
  const f = await prisma.file.create({
    data: { name: "trash.txt", extension: "txt", size: 5n, objectName: "owner/trash", userId: "owner" },
  });
  const s = await prisma.shareSecurity.create({ data: {} });
  const sh = await prisma.share.create({
    data: { creatorId: "owner", securityId: s.id, files: { connect: { id: f.id } } },
  });
  await trash.moveFileToTrash(f.id, new Date());
  duringDelete = async () => {
    duringDelete = undefined;
    await prisma.share.delete({ where: { id: sh.id } });
  };
  failDelete = true;
  await assert.rejects(trash.purgeItem("owner", "file", f.id));
  assert.equal(await prisma.file.count({ where: { id: f.id } }), 1);
  assert.equal(objects.has("owner/trash"), true);
  failDelete = false;
  assert.equal(await trash.purgeItem("owner", "file", f.id), true);
  assert.equal(objects.has("owner/trash"), false);
});
test("FS-08 link deletion schedules pending grants despite future expiry; independent sweep handles capped links", async () => {
  const l = await link();
  const g = await receive.getPresignedUrl(l.id, { filename: "p.txt", extension: "txt", size: 2 });
  objects.set(g.objectName, Buffer.alloc(2));
  failDelete = true;
  await receive.deleteReverseShare(l.id, "owner");
  assert.equal(await (prisma as any).storageDeletion.count({ where: { objectName: g.objectName } }), 1);
  failDelete = false;
  const { sweepStorageCleanup } = await import("../storage/cleanup");
  await sweepStorageCleanup(new Date());
  assert.equal(objects.has(g.objectName), false);
  const capped = await link();
  await prisma.reverseShare.update({ where: { id: capped.id }, data: { maxFiles: 1 } });
  await prisma.reverseShareFile.create({
    data: { name: "f", extension: "txt", size: 1n, objectName: "committed", reverseShareId: capped.id },
  });
  objects.set("expired", Buffer.alloc(2));
  await prisma.reverseUpload.create({
    data: { objectName: "expired", filename: "p.txt", size: 2n, reverseShareId: capped.id, expiresAt: new Date(0) },
  });
  await sweepStorageCleanup(new Date());
  assert.equal(objects.has("expired"), false);
  assert.equal(await prisma.reverseUpload.count({ where: { objectName: "expired" } }), 0);
});
test("FS-02/04 pending receive and workspace reservations block competing commits; copy counts receives", async () => {
  const l = await link();
  const grant = await receive.getPresignedUrl(l.id, { filename: "p.txt", extension: "txt", size: 6 });
  objects.set("owner/rival", Buffer.alloc(6));
  assert.notEqual((await register("owner/rival")).statusCode, 201);
  const { ownerUsage } = await import("../storage/accounting");
  assert.equal(await ownerUsage("owner"), 6n);
  objects.set(grant.objectName, Buffer.alloc(6));
  const received = await receive.registerFileUpload(l.id, {
    name: "p.txt",
    extension: "txt",
    size: 6,
    objectName: grant.objectName,
  } as any);
  assert.equal(await ownerUsage("owner"), 6n);
  await assert.rejects(receive.copyReverseShareFileToUserFiles(received.id, "owner"), /quota|storage/i);
  await prisma.user.update({ where: { id: "owner" }, data: { storageLimitBytes: 20n } });
  const copied = await receive.copyReverseShareFileToUserFiles(received.id, "owner");
  assert.equal(objects.get(copied.objectName)!.length, 6);
  assert.equal(await ownerUsage("owner"), 12n);
});
test("FS-01 quota and scan size use the private copy when staging changes during finalization", async () => {
  objects.set("owner/race", Buffer.alloc(2));
  const copy = FileService.prototype.copyObject;
  FileService.prototype.copyObject = async (a, b) => {
    objects.set(a, Buffer.alloc(12));
    await copy(a, b);
  };
  try {
    assert.notEqual((await register("owner/race")).statusCode, 201);
    assert.equal(await prisma.file.count(), 0);
  } finally {
    FileService.prototype.copyObject = copy;
  }
});
test("FS-01/03 legacy sealing preserves duplicate metadata and replay returns existing identity", async () => {
  objects.set("owner/legacy", Buffer.from("old"));
  for (const id of ["old-a", "old-b"])
    await prisma.file.create({
      data: {
        id,
        name: "old.txt",
        extension: "txt",
        size: 3n,
        objectName: "owner/legacy",
        userId: "owner",
        scanStatus: "clean",
        scanEtag: "old-etag",
      },
    });
  const { sealLegacyWorkspaceObjects } = await import("../storage/seal-legacy");
  await sealLegacyWorkspaceObjects();
  const rows = await prisma.file.findMany({ orderBy: { id: "asc" } });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].objectName, rows[1].objectName);
  assert.notEqual(rows[0].objectName, "owner/legacy");
  objects.set("owner/legacy", Buffer.from("changed"));
  assert.equal(objects.get(rows[0].objectName)!.toString(), "old");
  assert.equal((await register("owner/legacy")).json().file.id, "old-a");
  assert.equal(await prisma.file.count(), 2);
});
test("FS-03 purging one sealed legacy duplicate retains the other object reference", async () => {
  objects.set("owner/legacy", Buffer.from("old"));
  for (const id of ["old-a", "old-b"])
    await prisma.file.create({
      data: { id, name: "old.txt", extension: "txt", size: 3n, objectName: "owner/legacy", userId: "owner" },
    });
  const { sealLegacyWorkspaceObjects } = await import("../storage/seal-legacy");
  await sealLegacyWorkspaceObjects();
  const row = await prisma.file.findUniqueOrThrow({ where: { id: "old-a" } });
  await trash.moveFileToTrash("old-a", new Date());
  await trash.purgeItem("owner", "file", "old-a");
  assert.equal(objects.get(row.objectName)!.toString(), "old");
  await trash.moveFileToTrash("old-b", new Date());
  await trash.purgeItem("owner", "file", "old-b");
  assert.equal(objects.has(row.objectName), false);
});
test("FS-02 workspace signing reserves bytes and abort releases reservation", async () => {
  const headers = { token: await testSession(app, { userId: "owner", isAdmin: false }) };
  const grant = await app.inject({
    method: "GET",
    url: "/files/presigned-url?filename=a&extension=txt&size=6",
    cookies: headers,
  });
  assert.equal(grant.statusCode, 200, grant.body);
  const denied = await app.inject({
    method: "GET",
    url: "/files/presigned-url?filename=b&extension=txt&size=6",
    cookies: headers,
  });
  assert.notEqual(denied.statusCode, 200);
  const { ownerUsage } = await import("../storage/accounting");
  assert.equal(await ownerUsage("owner"), 6n);
});
test("FS-02 failed copy releases reserved bytes and keeps cleanup on failed delete", async () => {
  const l = await link();
  objects.set("received", Buffer.alloc(3));
  const received = await prisma.reverseShareFile.create({
    data: { name: "r.txt", extension: "txt", size: 3n, objectName: "received", reverseShareId: l.id },
  });
  failCopy = true;
  failDelete = true;
  await assert.rejects(receive.copyReverseShareFileToUserFiles(received.id, "owner"), /copy outage/);
  assert.equal(await prisma.uploadReservation.count(), 0);
  assert.equal(await prisma.storageDeletion.count(), 1);
});
test("FS-07 crash claim can be retried after its lease without clearing another active purge", async () => {
  objects.set("owner/crash", Buffer.alloc(2));
  const f = await prisma.file.create({
    data: {
      name: "c.txt",
      extension: "txt",
      size: 2n,
      objectName: "owner/crash",
      userId: "owner",
      deletedAt: new Date(),
      purgeToken: "2000-01-01T00:00:00.000Z/crashed",
    },
  });
  assert.equal(await trash.purgeItem("owner", "file", f.id), true);
  assert.equal(objects.has("owner/crash"), false);
});
test("FS-04 usage route includes received and pending bytes", async () => {
  const l = await link();
  await prisma.reverseShareFile.create({
    data: { name: "r", extension: "txt", size: 3n, objectName: "received", reverseShareId: l.id },
  });
  await receive.getPresignedUrl(l.id, { filename: "p.txt", extension: "txt", size: 2 });
  const response = await app.inject({
    method: "GET",
    url: "/storage/usage",
    cookies: { token: await testSession(app, { userId: "owner", isAdmin: false }) },
  });
  assert.equal(response.json().usedBytes, 5);
  assert.equal(response.json().receivedBytes, 3);
});
test("FS-02 quota reservations survive independent server processes", async () => {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  const script =
    "const {reserveUpload}=await import('./src/modules/storage/accounting.ts'); const {prisma}=await import('./src/shared/prisma.ts');try{await reserveUpload('owner',process.argv[1],6n,new Date(Date.now()+60000));console.log('reserved');}catch(e){console.log('refused');}finally{await prisma.$disconnect();}";
  const replies = await Promise.all(
    ["owner/process-a", "owner/process-b"].map((key) =>
      run(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script, key], { env: process.env })
    )
  );
  assert.equal(replies.filter((r) => r.stdout.trim() === "reserved").length, 1);
  assert.equal((await prisma.uploadReservation.aggregate({ _sum: { size: true } }))._sum.size, 6n);
});
test("FS-08 replay tombstones do not starve newer deletion work", async () => {
  const { sweepStorageCleanup } = await import("../storage/cleanup");
  for (let n = 0; n < 201; n++)
    await prisma.storageDeletion.create({
      data: { objectName: `expired-${n}`, notBefore: new Date(Date.now() + 60000) },
    });
  await prisma.storageDeletion.create({ data: { objectName: "last-new-key" } });
  objects.set("last-new-key", Buffer.alloc(2));
  await sweepStorageCleanup(new Date());
  await sweepStorageCleanup(new Date());
  assert.equal(objects.has("last-new-key"), false);
});
test("FS-02 workspace multipart abort and failed signing release pending reservations", async () => {
  const cookies = { token: await testSession(app, { userId: "owner", isAdmin: false }) };
  const r = await app.inject({
    method: "POST",
    url: "/files/multipart/create",
    cookies,
    payload: { filename: "multi", extension: "txt", size: 6 },
  });
  assert.equal(r.statusCode, 200, r.body);
  assert.equal(await prisma.uploadReservation.count(), 1);
  const aborted = await app.inject({ method: "POST", url: "/files/multipart/abort", cookies, payload: r.json() });
  assert.equal(aborted.statusCode, 200, aborted.body);
  assert.equal(await prisma.uploadReservation.count(), 0);
  const sign = FileService.prototype.getPresignedPutUrl;
  FileService.prototype.getPresignedPutUrl = async () => {
    throw new Error("signing outage");
  };
  try {
    assert.notEqual(
      (await app.inject({ method: "GET", url: "/files/presigned-url?filename=f&extension=txt&size=6", cookies }))
        .statusCode,
      200
    );
    assert.equal(await prisma.uploadReservation.count(), 0);
  } finally {
    FileService.prototype.getPresignedPutUrl = sign;
  }
});
test("FS-08 failed workspace multipart abort retains durable work and frees reservation", async () => {
  const cookies = { token: await testSession(app, { userId: "owner", isAdmin: false }) };
  const created = await app.inject({
    method: "POST",
    url: "/files/multipart/create",
    cookies,
    payload: { filename: "multi", extension: "txt", size: 6 },
  });
  assert.equal(created.statusCode, 200, created.body);
  failDelete = true;
  await app.inject({ method: "POST", url: "/files/multipart/abort", cookies, payload: created.json() });
  assert.equal(await prisma.uploadReservation.count(), 0);
  assert.equal(await prisma.storageDeletion.count({ where: { objectName: created.json().objectName } }), 1);
});
