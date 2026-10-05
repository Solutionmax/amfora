import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";

import { useTestDatabase } from "../../../test-support/test-db";

const database = useTestDatabase();
const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-05T12:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY);

let prisma: typeof import("../../shared/prisma").prisma;
let FileService: typeof import("../file/service").FileService;
let jobs: typeof import("./jobs");
let service: typeof import("./service");
let AppService: typeof import("../app/service").AppService;

async function setting(key: string, value: string) {
  return prisma.appConfig.update({ where: { key }, data: { value } });
}

const removed: string[] = [];
let originalDelete: (typeof FileService.prototype)["deleteObject"];

before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  ({ FileService } = await import("../file/service"));
  jobs = await import("./jobs");
  service = await import("./service");
  ({ AppService } = await import("../app/service"));
  await prisma.user.create({
    data: { id: "alice", firstName: "alice", lastName: "Test", username: "alice", email: "alice@example.test" },
  });
  originalDelete = FileService.prototype.deleteObject;
});

beforeEach(() => {
  removed.length = 0;
  FileService.prototype.deleteObject = async (objectName: string) => {
    removed.push(objectName);
  };
});

afterEach(async () => {
  FileService.prototype.deleteObject = originalDelete;
  await prisma.share.deleteMany();
  await prisma.shareSecurity.deleteMany();
  await prisma.reverseShare.deleteMany();
  await prisma.file.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.activityEvent.deleteMany();
  await setting("trashRetentionDays", "30");
  await setting("expiredLinkRetentionDays", "0");
});

after(async () => {
  await prisma?.$disconnect();
  database.cleanup();
});

let counter = 0;
const addFile = (name: string, deletedAt: Date | null, folderId: string | null = null) =>
  prisma.file.create({
    data: {
      name,
      extension: "txt",
      size: 10n,
      objectName: `alice/${++counter}-${name}`,
      userId: "alice",
      folderId,
      deletedAt,
    },
  });

test("the settings start at thirty days for the trash and never for ended links", async () => {
  assert.equal((await prisma.appConfig.findUniqueOrThrow({ where: { key: "trashRetentionDays" } })).value, "30");
  assert.equal((await prisma.appConfig.findUniqueOrThrow({ where: { key: "expiredLinkRetentionDays" } })).value, "0");
});

test("the settings refuse values outside their range", async () => {
  const app = new AppService();
  await assert.rejects(() => app.updateConfig("trashRetentionDays", "0"), /whole number from 1/);
  await assert.rejects(() => app.updateConfig("trashRetentionDays", "abc"), /whole number/);
  await assert.rejects(() => app.updateConfig("expiredLinkRetentionDays", "-1"), /whole number from 0/);
  await assert.rejects(() => app.bulkUpdateConfigs([{ key: "trashRetentionDays", value: "" }]), /whole number/);
  await app.updateConfig("trashRetentionDays", "1");
  await app.updateConfig("expiredLinkRetentionDays", "0");
  assert.equal((await prisma.appConfig.findUniqueOrThrow({ where: { key: "trashRetentionDays" } })).value, "1");
});

test("the job removes only what has been in the trash longer than the setting", async () => {
  await setting("trashRetentionDays", "7");
  const old = await addFile("old.txt", daysAgo(8));
  const edge = await addFile("recent.txt", daysAgo(6));
  const live = await addFile("live.txt", null);

  const result = await jobs.purgeExpiredTrash(NOW);

  assert.deepEqual(result, { removed: 1, failed: 0 });
  assert.deepEqual(removed, [old.objectName]);
  assert.equal(await prisma.file.count({ where: { id: edge.id } }), 1);
  assert.equal(await prisma.file.count({ where: { id: live.id } }), 1);
});

test("a folder in the trash for too long goes with everything in it, once each", async () => {
  await setting("trashRetentionDays", "7");
  const when = daysAgo(10);
  const folder = await prisma.folder.create({
    data: { name: "Old", objectName: "alice/old", userId: "alice", deletedAt: when },
  });
  const inside = await addFile("inside.txt", when, folder.id);

  await jobs.purgeExpiredTrash(NOW);

  assert.equal(removed.filter((name) => name === inside.objectName).length, 1);
  assert.equal(await prisma.folder.count(), 0);
  assert.equal(await prisma.file.count(), 0);
});

test("when storage refuses, the job leaves the item in the trash and goes on", async () => {
  await setting("trashRetentionDays", "7");
  const stuck = await addFile("stuck.txt", daysAgo(9));
  const fine = await addFile("fine.txt", daysAgo(9));
  FileService.prototype.deleteObject = async (objectName: string) => {
    if (objectName === stuck.objectName) throw new Error("storage is down");
    removed.push(objectName);
  };

  const result = await jobs.purgeExpiredTrash(NOW);

  assert.deepEqual(result, { removed: 1, failed: 1 });
  assert.equal(await prisma.file.count({ where: { id: stuck.id } }), 1);
  assert.equal(await prisma.file.count({ where: { id: fine.id } }), 0);
  assert.ok(service);
});

const addShare = async (expiration: Date | null, fileIds: string[] = []) => {
  const security = await prisma.shareSecurity.create({ data: {} });
  return prisma.share.create({
    data: {
      name: "link",
      creatorId: "alice",
      securityId: security.id,
      expiration,
      files: { connect: fileIds.map((id) => ({ id })) },
      alias: { create: { alias: `alias-${++counter}` } },
      recipients: { create: { email: "x@example.test" } },
    },
  });
};

test("with the setting at zero no ended link is touched", async () => {
  await addShare(daysAgo(400));

  const result = await jobs.removeExpiredLinks(NOW);

  assert.equal(result.shares, 0);
  assert.equal(await prisma.share.count(), 1);
});

test("an ended share goes after the setting, with its alias, recipients and security row, but never its files", async () => {
  await setting("expiredLinkRetentionDays", "10");
  const file = await addFile("mine.txt", null);
  const folder = await prisma.folder.create({ data: { name: "Mine", objectName: "alice/mine", userId: "alice" } });
  const gone = await addShare(daysAgo(11), [file.id]);
  await prisma.share.update({ where: { id: gone.id }, data: { folders: { connect: { id: folder.id } } } });
  const recent = await addShare(daysAgo(9));
  const open = await addShare(new Date(NOW.getTime() + DAY));
  const never = await addShare(null);

  const result = await jobs.removeExpiredLinks(NOW);

  assert.equal(result.shares, 1);
  assert.equal(await prisma.share.count({ where: { id: gone.id } }), 0);
  for (const kept of [recent, open, never]) assert.equal(await prisma.share.count({ where: { id: kept.id } }), 1);
  assert.equal(await prisma.shareAlias.count({ where: { shareId: gone.id } }), 0);
  assert.equal(await prisma.shareRecipient.count({ where: { shareId: gone.id } }), 0);
  assert.equal(await prisma.shareSecurity.count({ where: { id: gone.securityId } }), 0);
  assert.equal(await prisma.file.count({ where: { id: file.id } }), 1, "the workspace file survives its share");
  assert.equal(await prisma.folder.count({ where: { id: folder.id } }), 1, "and so does the folder");
  assert.deepEqual(removed, [], "storage is never asked");
});

test("a removed share leaves the share.deleted line, saying it was automatic", async () => {
  await setting("expiredLinkRetentionDays", "1");
  const gone = await addShare(daysAgo(5));

  await jobs.removeExpiredLinks(NOW);

  const line = await prisma.activityEvent.findFirstOrThrow({ where: { action: "share.deleted" } });
  assert.equal(line.ownerId, "alice");
  assert.equal(line.subjectId, gone.id);
  assert.equal(line.actorId, null);
  assert.match(line.detail ?? "", /automatic/i);
});

test("an ended receive link without files goes, one that still holds files stays", async () => {
  await setting("expiredLinkRetentionDays", "1");
  const empty = await prisma.reverseShare.create({
    data: { name: "empty", creatorId: "alice", expiration: daysAgo(5), alias: { create: { alias: "empty-link" } } },
  });
  const full = await prisma.reverseShare.create({
    data: {
      name: "full",
      creatorId: "alice",
      expiration: daysAgo(5),
      files: { create: { name: "got.pdf", extension: "pdf", size: 5n, objectName: "reverse-shares/got.pdf" } },
    },
  });

  const result = await jobs.removeExpiredLinks(NOW);

  assert.equal(result.receiveLinks, 1);
  assert.equal(await prisma.reverseShare.count({ where: { id: empty.id } }), 0);
  assert.equal(await prisma.reverseShare.count({ where: { id: full.id } }), 1);
  assert.equal(await prisma.reverseShareFile.count({ where: { reverseShareId: full.id } }), 1);
  assert.deepEqual(removed, []);
  const line = await prisma.activityEvent.findFirstOrThrow({ where: { action: "receive.deleted" } });
  assert.equal(line.subjectId, empty.id);
  assert.match(line.detail ?? "", /automatic/i);
});
