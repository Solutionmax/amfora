import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { useTestDatabase } from "../../../test-support/test-db";

const database = useTestDatabase();
const GB = BigInt(1024 * 1024 * 1024);

let prisma: typeof import("../../shared/prisma").prisma;
let StorageService: typeof import("./service").StorageService;

before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  ({ StorageService } = await import("./service"));

  for (const id of ["alice", "bob"]) {
    await prisma.user.create({
      data: { id, firstName: id, lastName: "Test", username: id, email: `${id}@example.test` },
    });
  }
});

after(async () => {
  await prisma?.$disconnect();
  database.cleanup();
});

// The disk is often shared with other things (backups, another app). Those are not Amfora's use,
// so an administrator sees what Amfora holds, and the rest only makes the room smaller.
test("an administrator sees what Amfora holds for every user, not what else is on the disk", async () => {
  const file = { extension: "mp4", objectName: "object" };
  await prisma.file.create({ data: { ...file, name: "a.mp4", size: GB * BigInt(2), userId: "alice" } });
  await prisma.file.create({ data: { ...file, name: "b.mp4", size: GB, userId: "bob" } });
  const link = await prisma.reverseShare.create({ data: { name: "Send us files", creatorId: "alice" } });
  await prisma.reverseShareFile.create({ data: { ...file, name: "c.mp4", size: GB, reverseShareId: link.id } });

  const space = await new StorageService().getDiskSpace(undefined, true);

  assert.equal(space.diskUsedGB, 4);
  assert.ok(space.diskAvailableGB > 0);
  assert.ok(
    Math.abs(space.diskSizeGB - (space.diskUsedGB + space.diskAvailableGB)) < 0.02,
    "the total is what Amfora holds plus the free room on the disk"
  );
});

test("an administrator with an own limit is held to it by own usage, and by the real disk", async () => {
  await prisma.user.create({
    data: { id: "boss", firstName: "b", lastName: "T", username: "boss", email: "boss@example.test", isAdmin: true },
  });
  await prisma.file.create({
    data: { name: "own.mp4", extension: "mp4", objectName: "o", size: GB, userId: "boss" },
  });
  const service = new StorageService();

  await prisma.user.update({ where: { id: "boss" }, data: { storageLimitBytes: GB * BigInt(3) } });
  const limited = await service.getDiskSpace("boss", true);
  assert.equal(limited.diskUsedGB, 1, "own usage, not the whole installation");
  assert.equal(limited.diskAvailableGB, 2);

  await prisma.user.update({ where: { id: "boss" }, data: { storageLimitBytes: GB / BigInt(2) } });
  assert.equal((await service.getDiskSpace("boss", true)).diskAvailableGB, 0, "never below 0");

  await prisma.user.update({ where: { id: "boss" }, data: { storageLimitBytes: GB * BigInt(1_000_000) } });
  const huge = await service.getDiskSpace("boss", true);
  assert.ok(huge.diskAvailableGB < 999_000, "capped by the free disk space");

  await prisma.user.update({ where: { id: "boss" }, data: { storageLimitBytes: null } });
  const unlimited = await service.getDiskSpace("boss", true);
  assert.equal(unlimited.diskUsedGB, 5, "without own limit the whole installation, as before");
});
