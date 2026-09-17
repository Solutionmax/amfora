import { createHash } from "node:crypto";
import type { FastifyReply } from "fastify";

import { env } from "../../env";
import { signCapability } from "../../shared/capability";
import { prisma } from "../../shared/prisma";
import type { DownloadShare } from "./download-access";

export function shareGrantSubject(share: DownloadShare): string {
  return createHash("sha256")
    .update(
      JSON.stringify([share.id, share.expiration?.toISOString(), share.security?.password, share.security?.maxViews])
    )
    .digest("hex");
}

export async function grantShareDownload(reply: FastifyReply, shareId: string) {
  const share = await prisma.share.findUnique({ where: { id: shareId }, include: { security: true } });
  if (!share) return;
  const seconds = Math.min(900, share.expiration ? Math.floor((share.expiration.getTime() - Date.now()) / 1000) : 900);
  if (seconds <= 0) return;
  reply.setCookie(
    `share-access-${share.id}`,
    await signCapability("share-download", shareGrantSubject(share), seconds),
    {
      httpOnly: true,
      secure: env.SECURE_SITE === "true",
      sameSite: "strict",
      path: "/",
      maxAge: seconds,
    }
  );
}
