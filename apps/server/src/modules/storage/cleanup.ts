import type { Prisma } from "@prisma/client";

import { prisma } from "../../shared/prisma";
import { FileService } from "../file/service";

export async function queueDeletion(
  tx: Prisma.TransactionClient,
  objectName: string,
  uploadId?: string | null,
  notBefore?: Date,
  readyAt?: Date
) {
  await tx.storageDeletion.upsert({
    where: { objectName },
    create: { objectName, uploadId, notBefore: notBefore ?? new Date(), readyAt: readyAt ?? new Date() },
    update: { ...(uploadId ? { uploadId } : {}), ...(notBefore ? { notBefore } : {}) },
  });
}
// Every copy destination is recorded before the SDK can create bytes or multipart parts.
// Cleanup can claim it after the grace period; only an unclaimed destination may commit.
export async function prepareCopy(tx: Prisma.TransactionClient, objectName: string) {
  await tx.storageDeletion.create({
    data: { objectName, uploadId: "pending", finalizing: true, readyAt: new Date(Date.now() + 3600000) },
  });
}
export async function commitCopy(tx: Prisma.TransactionClient, objectName: string) {
  const released = await tx.storageDeletion.deleteMany({ where: { objectName, claimed: false, finalizing: true } });
  if (released.count !== 1) throw new Error("Cleanup owns finalization destination. Retry upload.");
}
// Called only after the copy attempt has settled. Crashed/unsettled writers keep their
// finalizing tombstone, so cleanup never forgets a key a late writer could recreate.
export async function abandonCopy(objectName: string) {
  await prisma.storageDeletion.updateMany({ where: { objectName }, data: { finalizing: false, readyAt: new Date() } });
}
// Replayable PUT keys retain tombstones until grant expiry, even after deletion succeeds.
export async function sweepStorageCleanup(now: Date) {
  await prisma.$transaction(async (tx) => {
    const shares = await tx.reverseShare.findMany({ select: { id: true, isActive: true, expiration: true } });
    const live = new Set(shares.filter((s) => s.isActive && (!s.expiration || s.expiration > now)).map((s) => s.id));
    for (const g of await tx.reverseUpload.findMany())
      if (g.consumed || g.expiresAt <= now || !live.has(g.reverseShareId)) {
        await queueDeletion(tx, g.objectName, g.uploadId, g.expiresAt, now);
        await tx.reverseUpload.delete({ where: { objectName: g.objectName } });
        await tx.uploadReservation.deleteMany({ where: { objectName: g.objectName } });
      }
    for (const r of await tx.uploadReservation.findMany({ where: { expiresAt: { lte: now } } })) {
      await queueDeletion(tx, r.objectName, r.uploadId, r.expiresAt, now);
      await tx.uploadReservation.delete({ where: { objectName: r.objectName } });
    }
  });
  const store = new FileService();
  for (const d of await prisma.storageDeletion.findMany({
    where: { readyAt: { lte: now } },
    take: 200,
    orderBy: [{ lastAttemptAt: "asc" }, { createdAt: "asc" }],
  })) {
    const work = await prisma.$transaction(async (tx) => {
      // SQLite write lock precedes both reference reads and the persistent claim.
      const locked = await tx.storageDeletion.updateMany({
        where: { objectName: d.objectName },
        data: { lastAttemptAt: now },
      });
      if (!locked.count) return null;
      const current = await tx.storageDeletion.findUniqueOrThrow({ where: { objectName: d.objectName } });
      if (current.readyAt > now) return null;
      if (
        (await tx.file.count({ where: { objectName: d.objectName } })) ||
        (await tx.reverseShareFile.count({ where: { objectName: d.objectName } })) ||
        (await tx.folder.count({ where: { objectName: d.objectName } }))
      )
        return null;
      await tx.storageDeletion.update({ where: { objectName: d.objectName }, data: { claimed: true } });
      return current;
    });
    if (!work) continue;
    try {
      if (work.uploadId === "pending") await store.abortMultipartUploads(d.objectName);
      else if (work.uploadId)
        await store.abortMultipartUpload(d.objectName, work.uploadId!).catch((error) => {
          if (error?.name !== "NoSuchUpload") throw error;
        });
      await store.deleteObject(d.objectName);
      if (work.notBefore <= now && !work.finalizing)
        await prisma.storageDeletion.deleteMany({
          where: { objectName: d.objectName, claimed: true, finalizing: false, notBefore: { lte: now } },
        });
    } catch (error) {
      console.error("Storage cleanup retained:", d.objectName, error);
    }
    await prisma.storageDeletion.updateMany({ where: { objectName: d.objectName }, data: { lastAttemptAt: now } });
  }
}
export async function queueReceiveDeletion(tx: Prisma.TransactionClient, id: string) {
  for (const f of await tx.reverseShareFile.findMany({ where: { reverseShareId: id } }))
    await queueDeletion(tx, f.objectName);
  for (const g of await tx.reverseUpload.findMany({ where: { reverseShareId: id } })) {
    await queueDeletion(tx, g.objectName, g.uploadId, g.expiresAt);
    await tx.uploadReservation.deleteMany({ where: { objectName: g.objectName } });
  }
  await tx.reverseUpload.deleteMany({ where: { reverseShareId: id } });
}
export function startStorageCleanupJobs() {
  setTimeout(() => void sweepStorageCleanup(new Date()).catch(console.error), 1000).unref();
  setInterval(() => void sweepStorageCleanup(new Date()).catch(console.error), 60000).unref();
}
