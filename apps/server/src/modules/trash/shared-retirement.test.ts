import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";

import { useTestDatabase } from "../../../test-support/test-db";

const database = useTestDatabase();
let prisma: typeof import("../../shared/prisma").prisma;
let FileService: typeof import("../file/service").FileService;
let trash: typeof import("./service");
let sweep: typeof import("../storage/cleanup").sweepStorageCleanup;
const objectName = "committed/legacy/shared-retirement";
const objects = new Map<string, Buffer>();
const deleteCalls: string[] = [];
let failing = false;
let duringDelete: (() => Promise<void>) | undefined;

before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  ({ FileService } = await import("../file/service"));
  trash = await import("./service");
  ({ sweepStorageCleanup: sweep } = await import("../storage/cleanup"));
  FileService.prototype.deleteObject = async (key) => {
    deleteCalls.push(key);
    await duringDelete?.();
    if (failing) throw new Error("S3 deletion outage");
    objects.delete(key);
  };
});
beforeEach(async () => {
  await prisma.user.deleteMany();
  await prisma.storageDeletion.deleteMany();
  objects.clear();
  objects.set(objectName, Buffer.from("bytes"));
  deleteCalls.length = 0;
  failing = false;
  duringDelete = undefined;
  for (const id of ["owner", "survivor-owner"])
    await prisma.user.create({
      data: { id, firstName: id, lastName: "Test", username: id, email: `${id}@test.local` },
    });
});
after(async () => {
  await prisma.$disconnect();
  database.cleanup();
});
const addFile = (id: string, userId = "owner", deletedAt: Date | null = new Date()) =>
  prisma.file.create({ data: { id, userId, name: `${id}.txt`, extension: "txt", size: 5n, objectName, deletedAt } });

async function purgePair() {
  await addFile("purge-a");
  await addFile("purge-b");
  const original = prisma.file.count;
  const actual = original.bind(prisma.file);
  let arrivals = 0;
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  // Preserve both real SQLite results and force exactly the review's count-before-retire order.
  (prisma.file as any).count = async (args: any) => {
    const result = await actual(args);
    if (args?.where?.objectName === objectName && args.where.id?.not) {
      assert.equal(result, 1);
      if (++arrivals === 2) release();
      await barrier;
    }
    return result;
  };
  try {
    return await Promise.all([
      trash.purgeItem("owner", "file", "purge-a"),
      trash.purgeItem("owner", "file", "purge-b"),
    ]);
  } finally {
    prisma.file.count = original;
  }
}

test("concurrent duplicate purges atomically retain one cleanup identity until object deletion", async () => {
  assert.deepEqual(await purgePair(), [true, true]);
  assert.equal(await prisma.file.count(), 0);
  assert.equal(await prisma.storageDeletion.count({ where: { objectName } }), 1);
  assert.equal(objects.get(objectName)!.toString(), "bytes");
  await sweep(new Date());
  assert.equal(objects.has(objectName), false);
  assert.equal(await prisma.storageDeletion.count({ where: { objectName } }), 0);
  assert.deepEqual(deleteCalls, [objectName]);
});

test("concurrent duplicate retirement keeps retry identity when S3 cleanup fails", async () => {
  failing = true;
  assert.deepEqual(await purgePair(), [true, true]);
  assert.equal(await prisma.storageDeletion.count({ where: { objectName } }), 1);
  await sweep(new Date());
  assert.equal(objects.has(objectName), true);
  assert.equal(await prisma.storageDeletion.count({ where: { objectName } }), 1);
  failing = false;
  await sweep(new Date());
  assert.equal(objects.has(objectName), false);
  assert.equal(await prisma.storageDeletion.count({ where: { objectName } }), 0);
});

for (const survivor of ["file", "folder", "received"] as const)
  test(`shared retirement and sweep preserve bytes referenced by a surviving ${survivor}`, async () => {
    await addFile("purge-a");
    if (survivor === "file") await addFile("survivor", "survivor-owner", null);
    else if (survivor === "folder")
      await prisma.folder.create({ data: { name: "Survivor", userId: "survivor-owner", objectName } });
    else {
      const link = await prisma.reverseShare.create({ data: { creatorId: "survivor-owner" } });
      await prisma.reverseShareFile.create({
        data: { name: "survivor.txt", extension: "txt", size: 5n, objectName, reverseShareId: link.id },
      });
    }
    assert.equal(await trash.purgeItem("owner", "file", "purge-a"), true);
    await sweep(new Date());
    assert.equal(objects.get(objectName)!.toString(), "bytes");
    assert.deepEqual(deleteCalls, []);
    assert.equal(await prisma.storageDeletion.count({ where: { objectName } }), 1);
  });

test("ordinary purge outage retains recoverable row after concurrent share and folder removal", async () => {
  const folder = await prisma.folder.create({
    data: { name: "Original", userId: "owner", objectName: "folder-marker" },
  });
  const file = await addFile("purge-a");
  await prisma.file.update({ where: { id: file.id }, data: { folderId: folder.id } });
  const share = await prisma.share.create({
    data: { creator: { connect: { id: "owner" } }, security: { create: {} }, files: { connect: { id: file.id } } },
  });
  failing = true;
  duringDelete = async () => {
    duringDelete = undefined;
    await prisma.share.delete({ where: { id: share.id } });
    await prisma.folder.delete({ where: { id: folder.id } });
  };
  await assert.rejects(trash.purgeItem("owner", "file", file.id), /S3 deletion outage/);
  const recovered = await prisma.file.findUniqueOrThrow({ where: { id: file.id } });
  assert.equal(recovered.objectName, objectName);
  assert.equal(recovered.folderId, null);
  assert.equal(recovered.purgeToken, null);
  assert.ok(recovered.deletedAt);
  assert.equal(objects.get(objectName)!.toString(), "bytes");
  failing = false;
  assert.equal(await trash.purgeItem("owner", "file", file.id), true);
  assert.equal(objects.has(objectName), false);
  assert.equal(await prisma.file.count(), 0);
});
