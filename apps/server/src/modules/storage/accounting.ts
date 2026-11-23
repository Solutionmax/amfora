import type { Prisma } from "@prisma/client";

import { prisma } from "../../shared/prisma";

type DB = Prisma.TransactionClient;
export async function ownerUsage(ownerId: string, db: DB = prisma, exceptObject?: string): Promise<bigint> {
  const files = await db.file.aggregate({ where: { userId: ownerId }, _sum: { size: true } });
  const received = await db.reverseShareFile.aggregate({
    where: { reverseShare: { creatorId: ownerId } },
    _sum: { size: true },
  });
  const reserved = await db.uploadReservation.aggregate({
    where: { ownerId, ...(exceptObject ? { objectName: { not: exceptObject } } : {}) },
    _sum: { size: true },
  });
  const grants = await db.reverseUpload.findMany({
    where: {
      consumed: false,
      reverseShareId: {
        in: (await db.reverseShare.findMany({ where: { creatorId: ownerId }, select: { id: true } })).map((s) => s.id),
      },
    },
  });
  let legacy = 0n;
  for (const g of grants)
    if (
      g.objectName !== exceptObject &&
      !(await db.uploadReservation.findUnique({ where: { objectName: g.objectName } }))
    )
      legacy += g.size;
  return (files._sum.size ?? 0n) + (received._sum.size ?? 0n) + (reserved._sum.size ?? 0n) + legacy;
}
// Acquire SQLite's write lock before reading quota, including across server processes.
export async function checkOwnerQuota(tx: DB, ownerId: string, size: bigint, exceptObject?: string) {
  await tx.user.update({ where: { id: ownerId }, data: { id: ownerId } });
  const user = await tx.user.findUniqueOrThrow({ where: { id: ownerId } });
  if (!user.isActive) throw new Error("Account is inactive");
  const limit =
    user.storageLimitBytes ??
    BigInt((await tx.appConfig.findUniqueOrThrow({ where: { key: "maxTotalStoragePerUser" } })).value);
  const used = await ownerUsage(ownerId, tx, exceptObject);
  if (used + size > limit)
    throw new Error(
      `Insufficient storage space (quota). You have ${(Math.max(0, Number(limit - used)) / 1024 ** 2).toFixed(2)}MB available`
    );
}
export async function reserveUpload(
  ownerId: string,
  objectName: string,
  size: bigint,
  expiresAt: Date,
  uploadId?: string
) {
  if (size < 0n) throw new Error("Invalid file size");
  await prisma.$transaction(
    async (tx) => {
      await checkOwnerQuota(tx, ownerId, size);
      await tx.uploadReservation.create({ data: { ownerId, objectName, size, expiresAt, uploadId } });
    },
    { timeout: 30000 }
  );
}
