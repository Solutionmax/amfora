import { prisma } from "../../shared/prisma";
import { recordActivity } from "../activity/activity";
import { purgeExpiredTrash } from "./service";
import { expiredLinkRetentionDays, MS_PER_DAY } from "./settings";

export { purgeExpiredTrash };

const FIRST_RUN_MS = 2 * 60 * 1000;
const AUTOMATIC = "Cleaned up automatically after the end date";

/**
 * Removes links whose end date passed more than the setting ago (zero: never). It removes the
 * link and what hangs on it (alias, recipients, security row) and nothing else: the files and
 * folders of a share belong to the workspace of its maker. A receive link owns what was received,
 * so one that still holds files stays.
 */
export async function removeExpiredLinks(now: Date): Promise<{ shares: number; receiveLinks: number }> {
  const days = await expiredLinkRetentionDays();
  if (days === 0) return { shares: 0, receiveLinks: 0 };
  const endedBefore = { lt: new Date(now.getTime() - days * MS_PER_DAY) };

  const shares = await prisma.share.findMany({
    where: { expiration: endedBefore },
    select: { id: true, name: true, creatorId: true, securityId: true },
  });
  for (const share of shares) {
    await prisma.$transaction([
      prisma.share.delete({ where: { id: share.id } }),
      prisma.shareSecurity.delete({ where: { id: share.securityId } }),
    ]);
    await recordActivity({
      action: "share.deleted",
      ownerId: share.creatorId,
      subject: share.name,
      subjectId: share.id,
      detail: AUTOMATIC,
    });
  }

  const links = await prisma.reverseShare.findMany({
    where: { expiration: endedBefore, files: { none: {} } },
    select: { id: true, name: true, creatorId: true },
  });
  for (const link of links) {
    await prisma.reverseShare.delete({ where: { id: link.id } });
    await recordActivity({
      action: "receive.deleted",
      ownerId: link.creatorId,
      subject: link.name,
      subjectId: link.id,
      detail: AUTOMATIC,
    });
  }
  return { shares: shares.length, receiveLinks: links.length };
}

async function tick() {
  await purgeExpiredTrash(new Date()).catch((error) => console.error("Trash clean up failed:", error));
  await removeExpiredLinks(new Date()).catch((error) => console.error("Link clean up failed:", error));
}

/** Once a day: the trash past its time goes for good, and ended links go when the setting says so. */
export function startTrashJobs(): void {
  setTimeout(() => void tick(), FIRST_RUN_MS).unref();
  setInterval(() => void tick(), MS_PER_DAY).unref();
}
