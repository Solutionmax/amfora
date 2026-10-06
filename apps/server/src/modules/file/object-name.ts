import { prisma } from "../../shared/prisma";

/**
 * The server hands out every upload name itself as `<userId>/<time>-<random>-<file name>` (simple
 * and multipart uploads, the copy of a received file). So a name is only accepted with the own
 * user id as the first segment and a rest without empty or dot segments.
 */
export function isOwnObjectName(userId: string, objectName: string): boolean {
  if (!userId || !objectName.startsWith(`${userId}/`)) return false;
  const rest = objectName.slice(userId.length + 1).split("/");
  return rest.every((part) => part !== "" && part !== "." && part !== "..");
}

/** Whether any file row, of any user, in the trash or not, already points to the object. */
export async function isObjectRegistered(objectName: string): Promise<boolean> {
  return (await prisma.file.count({ where: { objectName } })) > 0;
}

/** The name for a server made copy of a file: the own user id, a moment, a random part, the base name. */
export function copiedObjectName(userId: string, fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? "";
  const safe = base === "" || base === "." || base === ".." ? "file" : base;
  return `${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${safe}`;
}
