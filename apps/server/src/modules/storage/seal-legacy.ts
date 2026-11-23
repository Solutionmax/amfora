import { randomUUID } from "node:crypto";

import { env } from "../../env";
import { prisma } from "../../shared/prisma";
import { FileService } from "../file/service";
import { initialScanFields } from "../scan/status";
import { abandonCopy, commitCopy, prepareCopy, queueDeletion } from "./cleanup";

// Run before listening. Fail closed on missing bytes/storage outage. Do not delete or collapse
// legacy duplicate metadata: move each group to one private key and retain every file id/share.
export async function sealLegacyWorkspaceObjects() {
  const store = new FileService();
  const rows = await prisma.file.findMany({
    where: { objectName: { not: { startsWith: "committed/" } } },
    orderBy: { id: "asc" },
  });
  const keys = [...new Set(rows.map((f) => f.objectName))];
  for (const source of keys) {
    const group = rows.filter((f) => f.objectName === source);
    const destination = `committed/legacy/${randomUUID()}`;
    await prisma.$transaction((tx) => prepareCopy(tx, destination));
    try {
      await store.copyObject(source, destination);
      const size = BigInt(await store.getObjectSize(destination));
      await prisma.$transaction(
        async (tx) => {
          await commitCopy(tx, destination);
          const current = await tx.file.findMany({
            where: { id: { in: group.map((f) => f.id) }, objectName: source },
            orderBy: { id: "asc" },
          });
          if (current.length !== group.length) throw new Error("Legacy objects changed during sealing; retry startup");
          // Reset old scan attestations, since mutable legacy bytes may already have drifted.
          for (const [index, f] of current.entries())
            await tx.file.update({
              where: { id: f.id },
              data: {
                objectName: destination,
                size,
                sourceObjectName: index === 0 ? source : null,
                scanEtag: null,
                scannedAt: null,
                scanStatus: null,
                scanDetail: null,
                ...initialScanFields(size),
              },
            });
          await queueDeletion(
            tx,
            source,
            null,
            new Date(Date.now() + Math.max(7 * 24 * 3600, Number(env.PRESIGNED_URL_EXPIRATION)) * 1000)
          );
        },
        { timeout: 30000 }
      );
    } catch (error) {
      await abandonCopy(destination);
      throw error;
    }
  }
}
