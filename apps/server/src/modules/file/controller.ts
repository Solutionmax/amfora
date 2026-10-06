import { FastifyReply, FastifyRequest } from "fastify";

import { env } from "../../env";
import { verifyCapability } from "../../shared/capability";
import { prisma } from "../../shared/prisma";
import { liveFolderOf, notDeleted } from "../../shared/trash";
import {
  generateUniqueFileName,
  generateUniqueFileNameForRename,
  parseFileName,
} from "../../utils/file-name-generator";
import { getContentType } from "../../utils/mime-types";
import { actorOf, recordVisitorActivity } from "../activity/activity";
import { noteStorageUsage } from "../activity/notifications";
import { afterShareDownload } from "../activity/notify";
import { ConfigService } from "../config/service";
import { callerOf, GROUP_DOWNLOAD_SECONDS, readableShares, sendGroupRefusal, type Caller } from "../group/access";
import { kickScanQueue } from "../scan/queue";
import { initialScanFields, isBlockedByScan, isBlockedByScanNow, scanFieldsOf, sendFileBlocked } from "../scan/status";
import { storageLimitOf } from "../storage/limit";
import { moveFileToTrash } from "../trash/service";
import { dispositionFor } from "./disposition";
import { canDownloadFromShares } from "./download-access";
import { shouldCountDownload } from "./download-count";
import {
  CheckFileInput,
  CheckFileSchema,
  ListFilesInput,
  ListFilesSchema,
  MoveFileInput,
  MoveFileSchema,
  RegisterFileInput,
  RegisterFileSchema,
  UpdateFileInput,
  UpdateFileSchema,
} from "./dto";
import { isPubliclyEmbeddable } from "./embed-access";
import { MEDIA_PREVIEW_REFUSED, refusesMediaPreview } from "./media-preview";
import { isOwnedMultipartObject } from "./multipart-access";
import { isObjectRegistered, isOwnObjectName } from "./object-name";
import { FileService } from "./service";
import { folderAndAncestorIds } from "./share-access";
import { shareGrantSubject } from "./share-download-grant";
import { storedSizeOf } from "./stored-size";

export class FileController {
  private fileService = new FileService();
  private configService = new ConfigService();

  private refusesPreview(
    fileRecord: { name: string; userId: string },
    preview: string | undefined,
    requesterId: string | null
  ) {
    return refusesMediaPreview({
      isPreview: preview === "1",
      contentType: getContentType(fileRecord.name),
      isOwner: requesterId === fileRecord.userId,
    });
  }

  /** A counted download through a share: a line in the log, and word to the maker if they asked. */
  private async recordShareDownload(
    request: FastifyRequest,
    file: { id: string; name: string; downloads: number },
    shares: Array<{ id: string }>,
    admitted: ReadonlySet<string>,
    caller: Caller | null
  ) {
    try {
      const through = shares.find((share) => admitted.has(share.id)) ?? shares[0];
      if (!through) return;
      const share = await prisma.share.findUnique({
        where: { id: through.id },
        select: { id: true, name: true, creatorId: true, notifyOnDownload: true, groupId: true },
      });
      if (!share) return;
      const place = await recordVisitorActivity(request, {
        action: "share.downloaded",
        ownerId: share.creatorId,
        subject: share.name,
        // The file is part of what makes a download its own line: three files, three lines.
        subjectId: share.id,
        detail: file.name,
        // A member of a group share is known by name; a visitor of an open share stays unnamed.
        ...(caller && share.groupId ? await actorOf(caller.userId) : {}),
      });
      void afterShareDownload({
        share,
        fileName: file.name,
        downloads: file.downloads + 1,
        place,
      });
    } catch (error) {
      console.error("Error recording download:", error);
    }
  }

  private async getSharesForFile(fileRecord: { id: string; folderId: string | null; userId: string }) {
    const ownerFolders = fileRecord.folderId
      ? await prisma.folder.findMany({
          where: { userId: fileRecord.userId },
          select: { id: true, parentId: true },
        })
      : [];
    const folderIds = folderAndAncestorIds(fileRecord.folderId, ownerFolders);

    return prisma.share.findMany({
      where: {
        OR: [
          { files: { some: { id: fileRecord.id } } },
          ...(folderIds.length > 0
            ? [{ folders: { some: { id: { in: folderIds }, userId: fileRecord.userId } } }]
            : []),
        ],
      },
      include: { security: true, group: { select: { id: true, name: true } } },
    });
  }

  async getPresignedUrl(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { filename, extension } = request.query as { filename: string; extension: string };

    if (!filename || !extension) {
      return reply.status(400).send({ error: "filename and extension are required" });
    }

    try {
      // JWT already verified by preValidation in routes.ts
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      // Generate unique object name
      const objectName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}-${filename}.${extension}`;
      const expires = parseInt(env.PRESIGNED_URL_EXPIRATION);

      const url = await this.fileService.getPresignedPutUrl(objectName, expires);

      return reply.status(200).send({ url, objectName });
    } catch (error) {
      console.error("Error in getPresignedUrl:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  /**
   * A refused registration leaves an object with no row behind: remove it, unless a row took the
   * name meanwhile. Not awaited: a storage that hangs must not hold the refusal back.
   */
  private dropRefusedObject(objectName: string) {
    void isObjectRegistered(objectName)
      .then((taken) => (taken ? undefined : this.fileService.deleteObject(objectName)))
      .catch(() => undefined);
  }

  async registerFile(request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized: a valid token is required to access this resource." });
      }

      const input: RegisterFileInput = RegisterFileSchema.parse(request.body);

      if (!isOwnObjectName(userId, input.objectName) || (await isObjectRegistered(input.objectName))) {
        return reply.status(400).send({ error: "That object name cannot be used." });
      }

      // Storage knows the size, the client only says. A missing object is not a file.
      const stored = await storedSizeOf(this.fileService, input.objectName);
      if (stored.state === "unavailable") {
        return reply.status(503).send({ error: "Storage did not answer. Please try again in a moment." });
      }
      if (stored.state === "missing") {
        return reply.status(400).send({ error: "The file was not found in storage. Upload it first." });
      }
      const size = stored.size;

      const maxFileSize = BigInt(await this.configService.getValue("maxFileSize"));
      if (size > maxFileSize) {
        const maxSizeMB = Number(maxFileSize) / (1024 * 1024);
        this.dropRefusedObject(input.objectName);
        return reply.status(400).send({
          error: `File size exceeds the maximum allowed size of ${maxSizeMB}MB`,
        });
      }

      const maxTotalStorage = await storageLimitOf(userId);

      const userFiles = await prisma.file.findMany({
        where: { userId },
        select: { size: true },
      });

      const currentStorage = userFiles.reduce((acc, file) => acc + file.size, BigInt(0));

      if (currentStorage + size > maxTotalStorage) {
        const availableSpace = Math.max(0, Number(maxTotalStorage - currentStorage)) / (1024 * 1024);
        this.dropRefusedObject(input.objectName);
        return reply.status(400).send({
          error: `Insufficient storage space. You have ${availableSpace.toFixed(2)}MB available`,
        });
      }

      if (input.folderId && !(await liveFolderOf(userId, input.folderId))) {
        return reply.status(400).send({ error: "Folder not found or access denied." });
      }

      // Parse the filename and generate a unique name if there's a duplicate
      const { baseName, extension } = parseFileName(input.name);
      const uniqueName = await generateUniqueFileName(baseName, extension, userId, input.folderId);

      const fileRecord = await prisma.file.create({
        data: {
          name: uniqueName,
          description: input.description,
          extension: input.extension,
          size,
          objectName: input.objectName,
          userId,
          folderId: input.folderId,
          ...initialScanFields(size),
        },
      });
      if (fileRecord.scanStatus === "pending") kickScanQueue();

      await noteStorageUsage(userId);

      const fileResponse = {
        id: fileRecord.id,
        name: fileRecord.name,
        description: fileRecord.description,
        extension: fileRecord.extension,
        size: fileRecord.size.toString(),
        objectName: fileRecord.objectName,
        userId: fileRecord.userId,
        folderId: fileRecord.folderId,
        ...scanFieldsOf(fileRecord),
        createdAt: fileRecord.createdAt,
        updatedAt: fileRecord.updatedAt,
      };

      return reply.status(201).send({
        file: fileResponse,
        message: "File registered successfully.",
      });
    } catch (error: any) {
      console.error("Error in registerFile:", error);
      return reply.status(400).send({ error: error.message });
    }
  }

  async checkFile(request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          error: "Unauthorized: a valid token is required to access this resource.",
          code: "unauthorized",
        });
      }

      const input: CheckFileInput = CheckFileSchema.parse(request.body);

      const maxFileSize = BigInt(await this.configService.getValue("maxFileSize"));
      if (BigInt(input.size) > maxFileSize) {
        const maxSizeMB = Number(maxFileSize) / (1024 * 1024);
        return reply.status(400).send({
          code: "fileSizeExceeded",
          error: `File size exceeds the maximum allowed size of ${maxSizeMB}MB`,
          details: maxSizeMB.toString(),
        });
      }

      const maxTotalStorage = await storageLimitOf(userId);

      const userFiles = await prisma.file.findMany({
        where: { userId },
        select: { size: true },
      });

      const currentStorage = userFiles.reduce((acc, file) => acc + file.size, BigInt(0));

      if (currentStorage + BigInt(input.size) > maxTotalStorage) {
        const availableSpace = Math.max(0, Number(maxTotalStorage - currentStorage)) / (1024 * 1024);
        return reply.status(400).send({
          error: `Insufficient storage space. You have ${availableSpace.toFixed(2)}MB available`,
          code: "insufficientStorage",
          details: availableSpace.toFixed(2),
        });
      }

      // Check for duplicate filename and provide the suggested unique name
      const { baseName, extension } = parseFileName(input.name);
      const uniqueName = await generateUniqueFileName(baseName, extension, userId, input.folderId);

      // Include suggestedName in response if the name was changed
      const response: any = {
        message: "File checks succeeded.",
      };

      if (uniqueName !== input.name) {
        response.suggestedName = uniqueName;
      }

      return reply.status(201).send(response);
    } catch (error: any) {
      console.error("Error in checkFile:", error);
      return reply.status(400).send({ error: error.message });
    }
  }

  async getDownloadUrl(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { objectName, password, preview } = request.query as {
        objectName: string;
        password?: string;
        preview?: string;
      };

      if (!objectName) {
        return reply.status(400).send({ error: "The 'objectName' parameter is required." });
      }

      const fileRecord = await prisma.file.findFirst({ where: { objectName, ...notDeleted } });

      if (!fileRecord) {
        return reply.status(404).send({ error: "File not found." });
      }

      let hasAccess = false;

      const caller = await callerOf(request);
      const { readable: shares, refusal } = readableShares(await this.getSharesForFile(fileRecord), caller);
      if (refusal) return sendGroupRefusal(reply, refusal);

      const admittedViews = new Set<string>();
      for (const share of shares) {
        if (
          await verifyCapability(
            request.cookies[`share-access-${share.id}`],
            "share-download",
            shareGrantSubject(share)
          )
        ) {
          admittedViews.add(share.id);
        }
      }
      hasAccess = await canDownloadFromShares(shares, password, admittedViews);

      const requesterId = caller?.userId ?? null;

      if (!hasAccess && requesterId && fileRecord.userId === requesterId) {
        hasAccess = true;
      }

      if (!hasAccess) {
        return reply.status(401).send({ error: "Unauthorized access to file." });
      }

      if (await isBlockedByScanNow(fileRecord)) return sendFileBlocked(reply, fileRecord);

      if (this.refusesPreview(fileRecord, preview, requesterId)) {
        return reply.status(403).send({ error: MEDIA_PREVIEW_REFUSED });
      }

      const fileName = fileRecord.name;
      const full = parseInt(env.PRESIGNED_URL_EXPIRATION);
      const expires =
        shares.length > 0 && shares.every((share) => share.groupId) ? Math.min(full, GROUP_DOWNLOAD_SECONDS) : full;

      // Always use presigned URLs (works for both internal and external storage)
      const url = await this.fileService.getPresignedGetUrl(objectName, expires, fileName);

      // Handing out a presigned URL is where a download is counted: the bytes come straight
      // from storage after this, so this is the last point the application sees. A preview
      // asks for the same URL and says so, which is the only way to tell the two apart.
      if (
        shouldCountDownload({
          isPreview: preview === "1",
          isOwner: requesterId === fileRecord.userId,
        })
      ) {
        await prisma.file
          .update({ where: { id: fileRecord.id }, data: { downloads: { increment: 1 } } })
          .catch((error) => console.error("Error counting download:", error));
        await this.recordShareDownload(request, fileRecord, shares, admittedViews, caller);
      }

      return reply.send({ url, expiresIn: expires });
    } catch (error) {
      console.error("Error in getDownloadUrl:", error);
      return reply.status(500).send({ error: "Internal server error." });
    }
  }

  async downloadFile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { objectName, password, preview } = request.query as {
        objectName: string;
        password?: string;
        preview?: string;
      };

      if (!objectName) {
        return reply.status(400).send({ error: "The 'objectName' parameter is required." });
      }

      const fileRecord = await prisma.file.findFirst({ where: { objectName, ...notDeleted } });

      if (!fileRecord) {
        if (objectName.startsWith("reverse-shares/")) {
          const reverseShareFile = await prisma.reverseShareFile.findFirst({
            where: { objectName },
            include: {
              reverseShare: true,
            },
          });

          if (!reverseShareFile) {
            return reply.status(404).send({ error: "File not found." });
          }

          try {
            await request.jwtVerify();
            const userId = (request as any).user?.userId;

            if (!userId || reverseShareFile.reverseShare.creatorId !== userId) {
              return reply.status(401).send({ error: "Unauthorized access to file." });
            }
          } catch (err) {
            return reply.status(401).send({ error: "Unauthorized access to file." });
          }

          if (isBlockedByScan(reverseShareFile)) return sendFileBlocked(reply, reverseShareFile);

          // Stream from S3/storage system
          const stream = await this.fileService.getObjectStream(objectName);
          const contentType = getContentType(reverseShareFile.name);
          const fileName = reverseShareFile.name;

          reply.header("Content-Type", contentType);
          reply.header(
            "Content-Disposition",
            `${dispositionFor(contentType)}; filename="${encodeURIComponent(fileName)}"`
          );
          if (dispositionFor(contentType) === "attachment") reply.header("Content-Security-Policy", "sandbox");
          reply.header("Content-Length", reverseShareFile.size.toString());

          return reply.send(stream);
        }

        return reply.status(404).send({ error: "File not found." });
      }

      let hasAccess = false;

      const caller = await callerOf(request);
      const { readable: shares, refusal } = readableShares(await this.getSharesForFile(fileRecord), caller);
      if (refusal) return sendGroupRefusal(reply, refusal);

      const admittedViews = new Set<string>();
      for (const share of shares) {
        if (
          await verifyCapability(
            request.cookies[`share-access-${share.id}`],
            "share-download",
            shareGrantSubject(share)
          )
        ) {
          admittedViews.add(share.id);
        }
      }
      hasAccess = await canDownloadFromShares(shares, password, admittedViews);

      const requesterId = caller?.userId ?? null;

      if (!hasAccess && requesterId && fileRecord.userId === requesterId) {
        hasAccess = true;
      }

      if (!hasAccess) {
        return reply.status(401).send({ error: "Unauthorized access to file." });
      }

      if (await isBlockedByScanNow(fileRecord)) return sendFileBlocked(reply, fileRecord);

      if (this.refusesPreview(fileRecord, preview, requesterId)) {
        return reply.status(403).send({ error: MEDIA_PREVIEW_REFUSED });
      }

      if (
        shouldCountDownload({
          range: request.headers.range,
          isPreview: preview === "1",
          isOwner: requesterId === fileRecord.userId,
        })
      ) {
        // A failed count must never cost the visitor their download.
        await prisma.file
          .update({ where: { id: fileRecord.id }, data: { downloads: { increment: 1 } } })
          .catch((error) => console.error("Error counting download:", error));
        await this.recordShareDownload(request, fileRecord, shares, admittedViews, caller);
      }

      // Stream from S3/MinIO
      const stream = await this.fileService.getObjectStream(objectName);
      const contentType = getContentType(fileRecord.name);
      const fileName = fileRecord.name;

      reply.header("Content-Type", contentType);
      reply.header("Content-Disposition", `${dispositionFor(contentType)}; filename="${encodeURIComponent(fileName)}"`);
      if (dispositionFor(contentType) === "attachment") reply.header("Content-Security-Policy", "sandbox");
      reply.header("Content-Length", fileRecord.size.toString());

      return reply.send(stream);
    } catch (error) {
      console.error("Error in downloadFile:", error);
      return reply.status(500).send({ error: "Internal server error." });
    }
  }

  async listFiles(request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized: a valid token is required to access this resource." });
      }

      const input: ListFilesInput = ListFilesSchema.parse(request.query);
      const { folderId, recursive: recursiveStr } = input;
      const recursive = recursiveStr === "false" ? false : true;

      let files: any[];

      let targetFolderId: string | null;
      if (folderId === "null" || folderId === "" || !folderId) {
        targetFolderId = null; // Root folder
      } else {
        targetFolderId = folderId;
      }

      if (recursive) {
        if (targetFolderId === null) {
          files = await this.getAllUserFilesRecursively(userId);
        } else {
          const { FolderService } = await import("../folder/service.js");
          const folderService = new FolderService();
          files = await folderService.getAllFilesInFolder(targetFolderId, userId);
        }
      } else {
        files = await prisma.file.findMany({
          where: { userId, folderId: targetFolderId, ...notDeleted },
        });
      }

      const filesResponse = files.map((file: any) => ({
        id: file.id,
        name: file.name,
        description: file.description,
        extension: file.extension,
        size: typeof file.size === "bigint" ? file.size.toString() : file.size,
        objectName: file.objectName,
        userId: file.userId,
        folderId: file.folderId,
        relativePath: file.relativePath || null,
        downloads: file.downloads ?? 0,
        ...scanFieldsOf(file),
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      }));

      return reply.send({ files: filesResponse });
    } catch (error) {
      console.error("Error in listFiles:", error);
      return reply.status(500).send({ error: "Internal server error." });
    }
  }

  async deleteFile(request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
      const { id } = request.params as { id: string };
      if (!id) {
        return reply.status(400).send({ error: "The 'id' parameter is required." });
      }

      const fileRecord = await prisma.file.findFirst({ where: { id, ...notDeleted } });
      if (!fileRecord) {
        return reply.status(404).send({ error: "File not found." });
      }

      const userId = (request as any).user?.userId;
      if (fileRecord.userId !== userId) {
        return reply.status(403).send({ error: "Access denied." });
      }

      // To the trash; the object leaves storage when it is deleted for good from there.
      await moveFileToTrash(id, new Date());

      return reply.send({ message: "File deleted successfully." });
    } catch (error) {
      console.error("Error in deleteFile:", error);
      return reply.status(500).send({ error: "Internal server error." });
    }
  }

  async updateFile(request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
      const { id } = request.params as { id: string };
      const userId = (request as any).user?.userId;

      if (!userId) {
        return reply.status(401).send({
          error: "Unauthorized: a valid token is required to access this resource.",
        });
      }

      const updateData = UpdateFileSchema.parse(request.body);

      const fileRecord = await prisma.file.findFirst({ where: { id, ...notDeleted } });

      if (!fileRecord) {
        return reply.status(404).send({ error: "File not found." });
      }

      if (fileRecord.userId !== userId) {
        return reply.status(403).send({ error: "Access denied." });
      }

      // If renaming the file, check for duplicates and auto-rename if necessary
      if (updateData.name && updateData.name !== fileRecord.name) {
        const { baseName, extension } = parseFileName(updateData.name);
        const uniqueName = await generateUniqueFileNameForRename(baseName, extension, userId, fileRecord.folderId, id);
        updateData.name = uniqueName;
      }

      const updatedFile = await prisma.file.update({
        where: { id },
        data: updateData,
      });

      const fileResponse = {
        id: updatedFile.id,
        name: updatedFile.name,
        description: updatedFile.description,
        extension: updatedFile.extension,
        size: updatedFile.size.toString(),
        objectName: updatedFile.objectName,
        userId: updatedFile.userId,
        folderId: updatedFile.folderId,
        createdAt: updatedFile.createdAt,
        updatedAt: updatedFile.updatedAt,
      };

      return reply.send({
        file: fileResponse,
        message: "File updated successfully.",
      });
    } catch (error: any) {
      console.error("Error in updateFile:", error);
      return reply.status(400).send({ error: error.message });
    }
  }

  async moveFile(request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
      const userId = (request as any).user?.userId;

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized: a valid token is required to access this resource." });
      }

      const { id } = request.params as { id: string };
      const input: MoveFileInput = MoveFileSchema.parse(request.body);

      const existingFile = await prisma.file.findFirst({
        where: { id, userId, ...notDeleted },
      });

      if (!existingFile) {
        return reply.status(404).send({ error: "File not found." });
      }

      if (input.folderId && !(await liveFolderOf(userId, input.folderId))) {
        return reply.status(400).send({ error: "Target folder not found." });
      }

      const updatedFile = await prisma.file.update({
        where: { id },
        data: { folderId: input.folderId },
      });

      const fileResponse = {
        id: updatedFile.id,
        name: updatedFile.name,
        description: updatedFile.description,
        extension: updatedFile.extension,
        size: updatedFile.size.toString(),
        objectName: updatedFile.objectName,
        userId: updatedFile.userId,
        folderId: updatedFile.folderId,
        createdAt: updatedFile.createdAt,
        updatedAt: updatedFile.updatedAt,
      };

      return reply.send({
        file: fileResponse,
        message: "File moved successfully.",
      });
    } catch (error: any) {
      console.error("Error moving file:", error);
      return reply.status(400).send({ error: error.message });
    }
  }

  async embedFile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      if (!id) {
        return reply.status(400).send({ error: "File ID is required." });
      }

      const fileRecord = await prisma.file.findFirst({
        where: { id, ...notDeleted },
        include: {
          shares: {
            select: {
              groupId: true,
              expiration: true,
              views: true,
              security: { select: { password: true, maxViews: true } },
            },
          },
        },
      });

      if (!fileRecord) {
        return reply.status(404).send({ error: "File not found." });
      }

      if (!isPubliclyEmbeddable(fileRecord.shares)) {
        return reply.status(404).send({ error: "File not found." });
      }

      if (await isBlockedByScanNow(fileRecord)) return sendFileBlocked(reply, fileRecord);

      const extension = fileRecord.extension.toLowerCase();
      const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "avif"];
      const videoExts = ["mp4", "webm", "ogg", "mov", "avi", "mkv", "flv", "wmv"];
      const audioExts = ["mp3", "wav", "ogg", "m4a", "flac", "aac", "wma"];

      const isMedia = imageExts.includes(extension) || videoExts.includes(extension) || audioExts.includes(extension);

      if (!isMedia) {
        return reply.status(403).send({
          error: "Embed is only allowed for images, videos, and audio files.",
        });
      }

      // Stream from S3/MinIO
      const stream = await this.fileService.getObjectStream(fileRecord.objectName);
      const contentType = getContentType(fileRecord.name);
      const fileName = fileRecord.name;

      reply.header("Content-Type", contentType);
      reply.header("Content-Disposition", `${dispositionFor(contentType)}; filename="${encodeURIComponent(fileName)}"`);
      if (dispositionFor(contentType) === "attachment") reply.header("Content-Security-Policy", "sandbox");
      reply.header("Content-Length", fileRecord.size.toString());
      reply.header("Cache-Control", "public, max-age=31536000"); // One year

      return reply.send(stream);
    } catch (error) {
      console.error("Error in embedFile:", error);
      return reply.status(500).send({ error: "Internal server error." });
    }
  }

  private async getAllUserFilesRecursively(userId: string): Promise<any[]> {
    const rootFiles = await prisma.file.findMany({
      where: { userId, folderId: null, ...notDeleted },
    });

    const rootFolders = await prisma.folder.findMany({
      where: { userId, parentId: null, ...notDeleted },
      select: { id: true },
    });

    let allFiles = [...rootFiles];

    if (rootFolders.length > 0) {
      const { FolderService } = await import("../folder/service.js");
      const folderService = new FolderService();

      for (const folder of rootFolders) {
        const folderFiles = await folderService.getAllFilesInFolder(folder.id, userId);
        allFiles = [...allFiles, ...folderFiles];
      }
    }

    return allFiles;
  }

  // Multipart upload endpoints
  async createMultipartUpload(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const { filename, extension } = request.body as { filename: string; extension: string };

      if (!filename || !extension) {
        return reply.status(400).send({ error: "filename and extension are required" });
      }

      // Generate unique object name (same pattern as simple upload)
      const objectName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}-${filename}.${extension}`;

      const uploadId = await this.fileService.createMultipartUpload(objectName);

      return reply.status(200).send({
        uploadId,
        objectName,
        message: "Multipart upload initialized",
      });
    } catch (error) {
      console.error("[Multipart] Error creating multipart upload:", error);
      return reply.status(500).send({ error: "Failed to create multipart upload" });
    }
  }

  async getMultipartPartUrl(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const { uploadId, objectName, partNumber } = request.query as {
        uploadId: string;
        objectName: string;
        partNumber: string;
      };

      if (!uploadId || !objectName || !partNumber) {
        return reply.status(400).send({ error: "uploadId, objectName, and partNumber are required" });
      }

      if (!isOwnedMultipartObject(userId, objectName)) {
        return reply.status(403).send({ error: "Upload does not belong to this user" });
      }

      const partNum = parseInt(partNumber);
      if (isNaN(partNum) || partNum < 1 || partNum > 10000) {
        return reply.status(400).send({ error: "partNumber must be between 1 and 10000" });
      }

      const expires = parseInt(env.PRESIGNED_URL_EXPIRATION);

      const url = await this.fileService.getPresignedPartUrl(objectName, uploadId, partNum, expires);

      return reply.status(200).send({ url });
    } catch (error) {
      console.error("[Multipart] Error getting part URL:", error);
      return reply.status(500).send({ error: "Failed to get presigned URL for part" });
    }
  }

  async completeMultipartUpload(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const { uploadId, objectName, parts } = request.body as {
        uploadId: string;
        objectName: string;
        parts: Array<{ PartNumber: number; ETag: string }>;
      };

      if (!uploadId || !objectName || !parts || !Array.isArray(parts)) {
        return reply.status(400).send({ error: "uploadId, objectName, and parts are required" });
      }

      if (!isOwnedMultipartObject(userId, objectName)) {
        return reply.status(403).send({ error: "Upload does not belong to this user" });
      }

      await this.fileService.completeMultipartUpload(objectName, uploadId, parts);

      return reply.status(200).send({
        message: "Multipart upload completed successfully",
        objectName,
      });
    } catch (error) {
      console.error("[Multipart] Error completing multipart upload:", error);
      return reply.status(500).send({ error: "Failed to complete multipart upload" });
    }
  }

  async abortMultipartUpload(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const { uploadId, objectName } = request.body as {
        uploadId: string;
        objectName: string;
      };

      if (!uploadId || !objectName) {
        return reply.status(400).send({ error: "uploadId and objectName are required" });
      }

      if (!isOwnedMultipartObject(userId, objectName)) {
        return reply.status(403).send({ error: "Upload does not belong to this user" });
      }

      await this.fileService.abortMultipartUpload(objectName, uploadId);

      return reply.status(200).send({
        message: "Multipart upload aborted successfully",
      });
    } catch (error) {
      console.error("[Multipart] Error aborting multipart upload:", error);
      return reply.status(500).send({ error: "Failed to abort multipart upload" });
    }
  }
}
