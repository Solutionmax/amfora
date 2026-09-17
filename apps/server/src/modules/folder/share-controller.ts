import { FastifyReply, FastifyRequest } from "fastify";

import { env } from "../../env";
import { verifyCapability } from "../../shared/capability";
import { prisma } from "../../shared/prisma";
import { getSharePassword } from "../../shared/share-password";
import { canDownloadFromShares } from "../file/download-access";
import { FileService } from "../file/service";
import { shareGrantSubject } from "../file/share-download-grant";
import { isFolderIncludedInShare } from "./share-access";

type SharedFolder = {
  id: string;
  name: string;
  description: string | null;
  objectName: string;
  parentId: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export class FolderShareController {
  private fileService = new FileService();

  private getPassword(request: FastifyRequest): string | undefined {
    const queryPassword = (request.query as { password?: string } | undefined)?.password;
    return getSharePassword(request) || queryPassword;
  }

  private async authorizeShare(request: FastifyRequest, shareId: string) {
    const share = await prisma.share.findUnique({
      where: { id: shareId },
      include: {
        security: true,
        folders: {
          select: { id: true, parentId: true, userId: true },
        },
      },
    });

    if (!share) throw new Error("Share not found");
    if (share.expiration && share.expiration <= new Date()) throw new Error("Share has expired");

    const admitted = new Set<string>();
    if (
      await verifyCapability(request.cookies[`share-access-${share.id}`], "share-download", shareGrantSubject(share))
    ) {
      admitted.add(share.id);
    }

    const password = this.getPassword(request);
    if (share.security?.maxViews != null && share.views >= share.security.maxViews && !admitted.has(share.id)) {
      throw new Error("Share has reached maximum views");
    }

    if (share.security?.password && !password && !admitted.has(share.id)) {
      throw new Error("Password required");
    }

    if (
      !(await canDownloadFromShares(
        [
          {
            id: share.id,
            expiration: share.expiration,
            views: share.views,
            security: share.security,
          },
        ],
        password,
        admitted
      ))
    ) {
      throw new Error("Invalid password");
    }

    return share;
  }

  private async getSharedFolderGraph(share: {
    creatorId: string | null;
    folders: Array<{ id: string; parentId: string | null; userId: string }>;
  }) {
    if (!share.creatorId) throw new Error("Folder not found");

    const folders = await prisma.folder.findMany({
      where: { userId: share.creatorId },
      orderBy: { name: "asc" },
    });
    const parents = new Map(folders.map((folder) => [folder.id, folder.parentId]));
    const sharedRootIds = new Set(share.folders.map((folder) => folder.id));
    return { folders, parents, sharedRootIds };
  }

  private serializeFolder(folder: SharedFolder) {
    return {
      id: folder.id,
      name: folder.name,
      description: folder.description,
      parentId: folder.parentId,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    };
  }

  private serializeFile(file: any, url?: string) {
    return {
      id: file.id,
      name: file.name,
      description: file.description,
      extension: file.extension,
      size: file.size.toString(),
      objectName: file.objectName,
      folderId: file.folderId,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      ...(url ? { url } : {}),
    };
  }

  async getFolderContents(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { shareId, folderId } = request.params as { shareId: string; folderId: string };
      const share = await this.authorizeShare(request, shareId);
      const graph = await this.getSharedFolderGraph(share);

      if (!isFolderIncludedInShare(folderId, graph.sharedRootIds, graph.parents)) {
        return reply.status(404).send({ error: "Folder not found." });
      }

      const folder = graph.folders.find((candidate) => candidate.id === folderId);
      if (!folder) return reply.status(404).send({ error: "Folder not found." });

      const [folders, files] = await Promise.all([
        prisma.folder.findMany({
          where: { userId: share.creatorId!, parentId: folderId },
          orderBy: { name: "asc" },
        }),
        prisma.file.findMany({
          where: { userId: share.creatorId!, folderId },
          orderBy: { name: "asc" },
        }),
      ]);

      return reply.send({
        folder: this.serializeFolder(folder),
        folders: folders.map((child) => this.serializeFolder(child)),
        files: files.map((file) => this.serializeFile(file)),
      });
    } catch (error: any) {
      return this.sendAccessError(reply, error);
    }
  }

  async downloadFolder(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { shareId, folderId } = request.params as { shareId: string; folderId: string };
      const share = await this.authorizeShare(request, shareId);
      const graph = await this.getSharedFolderGraph(share);

      if (!isFolderIncludedInShare(folderId, graph.sharedRootIds, graph.parents)) {
        return reply.status(404).send({ error: "Folder not found." });
      }

      const descendantIds = graph.folders
        .filter((folder) => isFolderIncludedInShare(folder.id, new Set([folderId]), graph.parents))
        .map((folder) => folder.id);
      const files = await prisma.file.findMany({
        where: { userId: share.creatorId!, folderId: { in: descendantIds } },
        orderBy: { name: "asc" },
      });
      const expires = parseInt(env.PRESIGNED_URL_EXPIRATION);
      const filesWithUrls = await Promise.all(
        files.map(async (file) => ({
          ...this.serializeFile(file),
          url: await this.fileService.getPresignedGetUrl(file.objectName, expires, file.name),
        }))
      );

      return reply.send({ files: filesWithUrls, expiresIn: expires });
    } catch (error: any) {
      return this.sendAccessError(reply, error);
    }
  }

  private sendAccessError(reply: FastifyReply, error: Error) {
    if (error.message === "Share not found" || error.message === "Folder not found") {
      return reply.status(404).send({ error: error.message });
    }
    if (error.message === "Share has expired") return reply.status(410).send({ error: error.message });
    if (error.message === "Share has reached maximum views") return reply.status(403).send({ error: error.message });
    if (error.message === "Password required" || error.message === "Invalid password") {
      return reply.status(401).send({ error: error.message });
    }
    console.error("Folder share access error:", error);
    return reply.status(500).send({ error: "Internal server error." });
  }
}
