import { prisma } from "../../shared/prisma";

/** The limit an administrator set for this user alone, or null when the installation default applies. */
export async function ownStorageLimitOf(userId: string): Promise<bigint | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { storageLimitBytes: true } });
  return user?.storageLimitBytes ?? null;
}

/**
 * What one user may store, in bytes: the own limit an administrator set, else the setting
 * maxTotalStoragePerUser of the installation.
 */
export async function storageLimitOf(userId: string): Promise<bigint> {
  const own = await ownStorageLimitOf(userId);
  if (own !== null) return own;

  const setting = await prisma.appConfig.findUnique({ where: { key: "maxTotalStoragePerUser" } });
  if (!setting) throw new Error("Configuration maxTotalStoragePerUser not found");
  return BigInt(setting.value);
}
