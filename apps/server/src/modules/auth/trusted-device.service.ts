import crypto from "node:crypto";

import { prisma } from "../../shared/prisma";

export class TrustedDeviceService {
  async isDeviceTrusted(userId: string, token: string): Promise<boolean> {
    if (!/^[a-f0-9]{64}$/.test(token)) return false;
    const deviceHash = crypto.createHash("sha256").update(token).digest("hex");
    const device = await prisma.trustedDevice.findFirst({
      where: { userId, deviceHash, expiresAt: { gt: new Date() } },
    });
    if (!device) return false;
    await prisma.trustedDevice.update({ where: { id: device.id }, data: { lastUsedAt: new Date() } });
    return true;
  }

  async addTrustedDevice(userId: string, userAgent: string, ipAddress: string): Promise<string> {
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.trustedDevice.create({
      data: {
        userId,
        deviceHash: crypto.createHash("sha256").update(token).digest("hex"),
        userAgent,
        ipAddress,
        expiresAt: new Date(Date.now() + 30 * 86400000),
        lastUsedAt: new Date(),
      },
    });
    return token;
  }

  async cleanupExpiredDevices(): Promise<void> {
    await prisma.trustedDevice.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  async getUserTrustedDevices(userId: string) {
    return prisma.trustedDevice.findMany({
      where: {
        userId,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async removeTrustedDevice(userId: string, deviceId: string): Promise<void> {
    await prisma.trustedDevice.deleteMany({
      where: {
        id: deviceId,
        userId,
      },
    });
  }

  async removeAllTrustedDevices(userId: string): Promise<{ count: number }> {
    const result = await prisma.trustedDevice.deleteMany({
      where: {
        userId,
      },
    });
    return { count: result.count };
  }
}
