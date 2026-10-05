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
