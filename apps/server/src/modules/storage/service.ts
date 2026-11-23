import fs from "node:fs";

import { env } from "../../env";
import { prisma } from "../../shared/prisma";
import { ownerUsage } from "./accounting";
import { ownStorageLimitOf, storageLimitOf } from "./limit";

export class StorageService {
  private _ensureNumber(value: number, fallback: number = 0): number {
    return Number.isNaN(value) || !Number.isFinite(value) || value < 0 ? fallback : value;
  }

  private async _getDiskSpaceMultiplePaths(): Promise<{ total: number; available: number } | null> {
    if (env.ENABLE_S3 === "true") return null;
    // Internal byte storage is the minio-data mount, never the metadata/uploads filesystem.
    const storePath = process.env.MINIO_DATA_DIR || "/app/server/minio-data";
    try {
      const stats = await fs.promises.statfs(storePath);
      return {
        total: Number(stats.blocks) * Number(stats.bsize),
        available: Number(stats.bavail) * Number(stats.bsize),
      };
    } catch {
      return null;
    }
  }

  /** Total and free bytes of the data disk, or null when the host does not tell. */
  async getDiskBytes(): Promise<{ total: number; available: number } | null> {
    try {
      return await this._getDiskSpaceMultiplePaths();
    } catch {
      return null;
    }
  }

  async getDiskSpace(
    userId?: string,
    isAdmin?: boolean
  ): Promise<{
    diskSizeGB: number;
    diskUsedGB: number;
    diskAvailableGB: number;
    uploadAllowed: boolean;
  }> {
    try {
      if (isAdmin) {
        const localDisk = await this._getDiskSpaceMultiplePaths();
        const diskInfo =
          localDisk ??
          (env.ENABLE_S3 === "true" && userId ? { available: Number(await storageLimitOf(userId)), total: 0 } : null);

        if (!diskInfo) {
          throw new Error("Unable to determine actual disk space - system configuration issue");
        }

        // Used is what Amfora itself holds, for every user. The disk may be shared with backups
        // or another program; those only make the room smaller, they are not Amfora's use.
        const [files, received] = await Promise.all([
          prisma.file.aggregate({ _sum: { size: true } }),
          prisma.reverseShareFile.aggregate({ _sum: { size: true } }),
        ]);
        const used = Number((files._sum.size ?? BigInt(0)) + (received._sum.size ?? BigInt(0)));
        // An administrator with an own limit is held to it like a member: own files against the limit,
        // and never more than the disk really has.
        const ownLimit = userId ? await ownStorageLimitOf(userId) : null;
        let shownUsed = used;
        let available = diskInfo.available;
        if (userId && (ownLimit !== null || env.ENABLE_S3 === "true")) {
          shownUsed = Number(await ownerUsage(userId));
          available = Math.max(
            Math.min(Number(ownLimit ?? (await storageLimitOf(userId))) - shownUsed, diskInfo.available),
            0
          );
        }
        const total = shownUsed + available;

        const diskSizeGB = this._ensureNumber(total / (1024 * 1024 * 1024), 0);
        const diskUsedGB = this._ensureNumber(shownUsed / (1024 * 1024 * 1024), 0);
        const diskAvailableGB = this._ensureNumber(available / (1024 * 1024 * 1024), 0);

        return {
          diskSizeGB: Number(diskSizeGB.toFixed(2)),
          diskUsedGB: Number(diskUsedGB.toFixed(2)),
          diskAvailableGB: Number(diskAvailableGB.toFixed(2)),
          uploadAllowed: diskAvailableGB > 0.1,
        };
      } else if (userId) {
        const maxTotalStorage = await storageLimitOf(userId);
        const maxStorageGB = this._ensureNumber(Number(maxTotalStorage) / (1024 * 1024 * 1024), 10);

        const totalUsedStorage = await ownerUsage(userId);
        const usedStorageGB = this._ensureNumber(Number(totalUsedStorage) / (1024 * 1024 * 1024), 0);
        const availableStorageGB = this._ensureNumber(maxStorageGB - usedStorageGB, 0);

        return {
          diskSizeGB: Number(maxStorageGB.toFixed(2)),
          diskUsedGB: Number(usedStorageGB.toFixed(2)),
          diskAvailableGB: Number(availableStorageGB.toFixed(2)),
          uploadAllowed: availableStorageGB > 0,
        };
      }

      throw new Error("User ID is required for non-admin users");
    } catch (error) {
      console.error("Error getting disk space:", error);
      throw new Error(
        `Failed to get disk space information: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async checkUploadAllowed(
    fileSize: number,
    userId?: string
  ): Promise<{
    diskSizeGB: number;
    diskUsedGB: number;
    diskAvailableGB: number;
    uploadAllowed: boolean;
    fileSizeInfo: {
      bytes: number;
      kb: number;
      mb: number;
      gb: number;
    };
  }> {
    const diskSpace = await this.getDiskSpace(userId);
    const fileSizeGB = fileSize / (1024 * 1024 * 1024);

    return {
      ...diskSpace,
      uploadAllowed: diskSpace.diskAvailableGB > fileSizeGB,
      fileSizeInfo: {
        bytes: fileSize,
        kb: Number((fileSize / 1024).toFixed(2)),
        mb: Number((fileSize / (1024 * 1024)).toFixed(2)),
        gb: Number((fileSize / (1024 * 1024 * 1024)).toFixed(2)),
      },
    };
  }
}
