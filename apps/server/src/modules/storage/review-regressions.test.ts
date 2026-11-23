import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { fastify } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { testSession } from "../../../test-support/session";
import { useTestDatabase } from "../../../test-support/test-db";

Object.assign(process.env, {
  ENABLE_S3: "true",
  S3_ENDPOINT: "127.0.0.1",
  S3_PORT: "1",
  S3_USE_SSL: "false",
  S3_REGION: "us-east-1",
  S3_ACCESS_KEY: "test",
  S3_SECRET_KEY: "test",
  S3_BUCKET_NAME: "test",
  S3_FORCE_PATH_STYLE: "true",
});
const database = useTestDatabase();
const app = fastify();
let prisma: typeof import("../../shared/prisma").prisma;
let trash: typeof import("../trash/service");
let receive: import("../reverse-share/service").ReverseShareService;
let sweep: typeof import("./cleanup").sweepStorageCleanup;
let seal: typeof import("./seal-legacy").sealLegacyWorkspaceObjects;
const objects = new Map<string, number>();
const uploads = new Map<string, string>();
let abortFails = false;
let largeCopyFails = false;
let listCalls = 0;
let counter = 0;
let copyHook: ((key: string) => Promise<void>) | undefined;
let deleteHook: ((key: string) => Promise<void>) | undefined;
let partHook: ((key: string) => Promise<void>) | undefined;
function gate() {
  let open!: () => void;
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { promise, open };
}
before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  trash = await import("../trash/service");
  const { ReverseShareService } = await import("../reverse-share/service");
  receive = new ReverseShareService();
  ({ sweepStorageCleanup: sweep } = await import("./cleanup"));
  ({ sealLegacyWorkspaceObjects: seal } = await import("./seal-legacy"));
  const { s3Client } = await import("../../config/storage.config");
  // Only the external S3 boundary is faulted; routes, services, SDK copy algorithm and SQLite are real.
  (s3Client as any).send = async (command: any) => {
    const input = command.input;
    const kind = command.constructor.name;
    if (kind === "HeadObjectCommand") {
      if (!objects.has(input.Key)) throw Object.assign(new Error("NotFound"), { name: "NotFound" });
      return { ContentLength: objects.get(input.Key), ETag: '"etag"' };
    }
    if (kind === "CopyObjectCommand") {
      const source = decodeURIComponent(input.CopySource.slice("test/".length));
      objects.set(input.Key, objects.get(source)!);
      await copyHook?.(input.Key);
      return { CopyObjectResult: { ETag: '"etag"' } };
    }
    if (kind === "CreateMultipartUploadCommand") {
      const id = `part-${++counter}`;
      uploads.set(id, input.Key);
      return { UploadId: id };
    }
    if (kind === "UploadPartCopyCommand") {
      await partHook?.(input.Key);
      if (largeCopyFails) throw new Error("part copy outage");
      return { CopyPartResult: { ETag: '"part"' } };
    }
    if (kind === "CompleteMultipartUploadCommand") {
      uploads.delete(input.UploadId);
      objects.set(input.Key, 6 * 1024 ** 3);
      await copyHook?.(input.Key);
      return {};
    }
    if (kind === "AbortMultipartUploadCommand") {
      if (abortFails) throw new Error("abort outage");
      uploads.delete(input.UploadId);
      return {};
    }
    if (kind === "ListMultipartUploadsCommand") {
      listCalls++;
      return {
        Uploads: [...uploads]
          .filter(([, key]) => key.startsWith(input.Prefix))
          .map(([UploadId, Key]) => ({ UploadId, Key })),
        IsTruncated: false,
      };
    }
    if (kind === "DeleteObjectCommand") {
      await deleteHook?.(input.Key);
      objects.delete(input.Key);
      return {};
    }
    throw new Error(`Unexpected S3 command ${kind}`);
  };
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(cookie);
  await app.register(jwt, { secret: "test", cookie: { cookieName: "token", signed: false } });
  await app.register(multipart);
  const { registerRoutes } = await import("../../routes");
  registerRoutes(app);
  await app.ready();
  await prisma.appConfig.update({ where: { key: "maxFileSize" }, data: { value: String(100 * 1024 ** 3) } });
});
beforeEach(async () => {
  for (const session of (receive as any).uploadSessions.values()) clearTimeout(session.timeout);
  (receive as any).uploadSessions.clear();
  await prisma.user.deleteMany();
  await prisma.uploadReservation.deleteMany();
  await prisma.reverseUpload.deleteMany();
  await prisma.storageDeletion.deleteMany();
  objects.clear();
  uploads.clear();
  abortFails = false;
  largeCopyFails = false;
  listCalls = 0;
  copyHook = undefined;
  deleteHook = undefined;
  partHook = undefined;
  await prisma.user.create({
    data: {
      id: "owner",
      firstName: "O",
      lastName: "T",
      username: "owner",
      email: "owner@test.local",
      storageLimitBytes: 100n * 1024n ** 3n,
    },
  });
});
after(async () => {
  for (const s of (receive as any).uploadSessions.values()) clearTimeout(s.timeout);
  await app.close();
  await prisma.$disconnect();
  database.cleanup();
});
const register = async () =>
  app.inject({
    method: "POST",
    url: "/files",
    cookies: { token: await testSession(app, { userId: "owner", isAdmin: false }) },
    payload: { name: "source.txt", extension: "txt", size: 1, objectName: "owner/source" },
  });
const makeLink = () =>
  prisma.reverseShare.create({ data: { creatorId: "owner", name: "Review", maxFileSize: 100n * 1024n ** 3n } });
test("review-1 restore read before purge claim cannot report success and lose bytes", async () => {
  objects.set("owner/source", 3);
  const f = await prisma.file.create({
    data: {
      name: "f.txt",
      extension: "txt",
      size: 3n,
      objectName: "owner/source",
      userId: "owner",
      deletedAt: new Date(),
    },
  });
  const readDone = gate(),
    readRelease = gate(),
    deleteEntered = gate(),
    deleteRelease = gate();
  const original = prisma.file.findFirst;
  const actual = original.bind(prisma.file);
  (prisma.file as any).findFirst = async (args: any) => {
    const row = await actual(args);
    if (args.where.id === f.id && args.where.purgeToken === null) {
      readDone.open();
      await readRelease.promise;
    }
    return row;
  };
  deleteHook = async () => {
    deleteEntered.open();
    await deleteRelease.promise;
  };
  const restoring = trash.restoreItem("owner", "file", f.id);
  await readDone.promise;
  const purging = trash.purgeItem("owner", "file", f.id);
  await deleteEntered.promise;
  readRelease.open();
  try {
    assert.equal(await restoring, false);
  } finally {
    deleteRelease.open();
    await purging;
    prisma.file.findFirst = original;
  }
  assert.equal(await prisma.file.count({ where: { id: f.id } }), 0);
  assert.equal(objects.has("owner/source"), false);
});
test("review-1 restore that wins its conditional mutation prevents purge", async () => {
  objects.set("owner/source", 3);
  const f = await prisma.file.create({
    data: {
      name: "f.txt",
      extension: "txt",
      size: 3n,
      objectName: "owner/source",
      userId: "owner",
      deletedAt: new Date(),
    },
  });
  assert.equal(await trash.restoreItem("owner", "file", f.id), true);
  assert.equal(await trash.purgeItem("owner", "file", f.id), false);
  assert.equal(objects.has("owner/source"), true);
});
for (const entry of ["workspace", "receive", "received-copy"] as const)
  test(`review-2 cleanup claim defeats late ${entry} finalization without committed missing bytes`, async () => {
    const deleting = gate(),
      releaseDelete = gate();
    let cleanup: Promise<void> | undefined;
    let destination = "";
    let held = false;
    deleteHook = async (key) => {
      if (key === destination && !held) {
        held = true;
        deleting.open();
        await releaseDelete.promise;
      }
    };
    copyHook = async (key) => {
      destination = key;
      await prisma.storageDeletion.updateMany({ where: { objectName: key }, data: { readyAt: new Date(0) } });
      await prisma.uploadReservation.updateMany({ where: { objectName: key }, data: { expiresAt: new Date(0) } });
      cleanup = sweep(new Date());
      await deleting.promise;
    };
    let finish: Promise<unknown>;
    if (entry === "workspace") {
      objects.set("owner/source", 3);
      finish = register().then((r) => {
        assert.notEqual(r.statusCode, 201, r.body);
      });
    } else if (entry === "receive") {
      const link = await makeLink();
      objects.set("pending", 3);
      await prisma.reverseUpload.create({
        data: {
          objectName: "pending",
          filename: "f.txt",
          size: 3n,
          reverseShareId: link.id,
          expiresAt: new Date(Date.now() + 60000),
        },
      });
      finish = assert.rejects(
        receive.registerFileUpload(link.id, { name: "f.txt", extension: "txt", size: 3, objectName: "pending" } as any),
        /cleanup|finaliz/i
      );
    } else {
      const link = await makeLink();
      objects.set("received", 3);
      const f = await prisma.reverseShareFile.create({
        data: { name: "f.txt", extension: "txt", size: 3n, objectName: "received", reverseShareId: link.id },
      });
      finish = assert.rejects(receive.copyReverseShareFileToUserFiles(f.id, "owner"), /cleanup|finaliz/i);
    }
    try {
      await finish;
    } finally {
      releaseDelete.open();
      await cleanup;
    }
    assert.equal(await prisma.file.count({ where: { objectName: destination } }), 0);
    assert.equal(await prisma.reverseShareFile.count({ where: { objectName: destination } }), 0);
  });
for (const entry of ["workspace", "receive", "received-copy", "legacy"] as const)
  test(`review-3 failed >5GiB multipart ${entry} copy retains discoverable cleanup after abort failure`, async () => {
    objects.set("owner/source", 6 * 1024 ** 3);
    largeCopyFails = true;
    abortFails = true;
    if (entry === "workspace") assert.equal((await register()).statusCode, 400);
    else if (entry === "legacy") {
      await prisma.file.create({
        data: { name: "f.txt", extension: "txt", size: 6n * 1024n ** 3n, objectName: "owner/source", userId: "owner" },
      });
      await assert.rejects(seal(), /part copy outage/);
      await prisma.storageDeletion.updateMany({ data: { readyAt: new Date(0) } });
      await sweep(new Date());
    } else {
      const link = await makeLink();
      if (entry === "receive") {
        await prisma.reverseUpload.create({
          data: {
            objectName: "owner/source",
            filename: "f.txt",
            size: 6n * 1024n ** 3n,
            reverseShareId: link.id,
            expiresAt: new Date(Date.now() + 60000),
          },
        });
        await assert.rejects(
          receive.registerFileUpload(link.id, {
            name: "f.txt",
            extension: "txt",
            size: 6 * 1024 ** 3,
            objectName: "owner/source",
          } as any),
          /part copy outage/
        );
        await prisma.storageDeletion.updateMany({ data: { readyAt: new Date(0) } });
        await sweep(new Date());
      } else {
        const f = await prisma.reverseShareFile.create({
          data: {
            name: "f.txt",
            extension: "txt",
            size: 6n * 1024n ** 3n,
            objectName: "owner/source",
            reverseShareId: link.id,
          },
        });
        await assert.rejects(receive.copyReverseShareFileToUserFiles(f.id, "owner"), /part copy outage/);
      }
    }
    assert.equal(uploads.size, 1);
    assert.ok((await prisma.storageDeletion.count()) > 0, "multipart identity must remain durable");
    abortFails = false;
    await sweep(new Date());
    assert.equal(uploads.size, 0);
    assert.ok(listCalls > 0, "missing copy upload ID must be discovered by exact key");
  });
test("review-2/3 cleanup crash claim survives while interrupted multipart writer remains unsettled", async () => {
  objects.set("owner/source", 6 * 1024 ** 3);
  const partEntered = gate(),
    partRelease = gate();
  let destination = "";
  partHook = async (key) => {
    destination = key;
    partEntered.open();
    await partRelease.promise;
    throw new Error("interrupted copy");
  };
  const request = register();
  await partEntered.promise;
  await prisma.storageDeletion.updateMany({ where: { objectName: destination }, data: { readyAt: new Date(0) } });
  try {
    abortFails = true;
    await sweep(new Date());
    assert.ok((await prisma.storageDeletion.count({ where: { objectName: destination } })) > 0);
    abortFails = false;
    await sweep(new Date());
    assert.equal(uploads.size, 0);
    assert.equal(
      await prisma.storageDeletion.count({ where: { objectName: destination } }),
      1,
      "unsettled writer must retain cleanup tombstone"
    );
    const { PrismaClient } = await import("@prisma/client");
    const restarted = new PrismaClient();
    try {
      const work = await restarted.storageDeletion.findUniqueOrThrow({ where: { objectName: destination } });
      assert.equal(work.claimed, true);
      assert.equal(work.finalizing, true);
    } finally {
      await restarted.$disconnect();
    }
  } finally {
    partRelease.open();
    await request;
  }
});
for (const entry of ["workspace", "receive", "received-copy"] as const)
  test(`review-2 ${entry} finalization that wins makes a stale cleanup snapshot harmless`, async () => {
    const listed = gate(),
      releaseList = gate();
    const original = prisma.storageDeletion.findMany;
    const actual = original.bind(prisma.storageDeletion);
    let destination = "";
    let held = false;
    let cleanup: Promise<void> | undefined;
    (prisma.storageDeletion as any).findMany = async (args: any) => {
      const rows = await actual(args);
      if (!held && destination && rows.some((r) => r.objectName === destination)) {
        held = true;
        listed.open();
        await releaseList.promise;
      }
      return rows;
    };
    copyHook = async (key) => {
      destination = key;
      await prisma.storageDeletion.updateMany({ where: { objectName: key }, data: { readyAt: new Date(0) } });
      cleanup = sweep(new Date());
      await listed.promise;
    };
    try {
      if (entry === "workspace") {
        objects.set("owner/source", 3);
        const r = await register();
        assert.equal(r.statusCode, 201, r.body);
      } else if (entry === "receive") {
        const l = await makeLink();
        objects.set("pending", 3);
        await prisma.reverseUpload.create({
          data: {
            objectName: "pending",
            filename: "f.txt",
            size: 3n,
            reverseShareId: l.id,
            expiresAt: new Date(Date.now() + 60000),
          },
        });
        await receive.registerFileUpload(l.id, {
          name: "f.txt",
          extension: "txt",
          size: 3,
          objectName: "pending",
        } as any);
      } else {
        const l = await makeLink();
        objects.set("received", 3);
        const f = await prisma.reverseShareFile.create({
          data: { name: "f.txt", extension: "txt", size: 3n, objectName: "received", reverseShareId: l.id },
        });
        await receive.copyReverseShareFileToUserFiles(f.id, "owner");
      }
    } finally {
      releaseList.open();
      await cleanup;
      prisma.storageDeletion.findMany = original;
    }
    assert.equal(objects.get(destination), 3);
    assert.equal(
      (await prisma.file.count({ where: { objectName: destination } })) +
        (await prisma.reverseShareFile.count({ where: { objectName: destination } })),
      1
    );
  });
