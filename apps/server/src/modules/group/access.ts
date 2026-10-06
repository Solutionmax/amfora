import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { prisma } from "../../shared/prisma";

/** The part of a share that decides who may open it. */
export interface GatedShare {
  creatorId: string | null;
  groupId: string | null;
  group: { id: string; name: string } | null;
}

export interface Caller {
  userId: string;
  isAdmin: boolean;
  groupIds: ReadonlySet<string>;
}

export type ShareReadVerdict =
  | { allowed: true }
  | { allowed: false; reason: "sign-in" }
  | { allowed: false; reason: "not-member"; groupName: string };

export const GROUP_SIGN_IN_CODE = "GROUP_SIGN_IN_REQUIRED";
export const GROUP_NOT_MEMBER_CODE = "GROUP_NOT_MEMBER";

/** The 403 body of a refused reader, for the response schema of every route that can send it. */
export const GroupRefusalBodySchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  group: z.object({ name: z.string() }).optional(),
});

/** What a select must ask for so a share can be judged. */
export const GATE_SELECT = {
  creatorId: true,
  groupId: true,
  group: { select: { id: true, name: true } },
} as const;

/**
 * THE rule for who may read a share, by any route: through its link, its files, its folders.
 * A share with no group is open (its password and dates are judged elsewhere). A share with a
 * group is open to the signed in members of that group, its maker and administrators.
 * Everything that serves a share to a visitor must ask this first.
 */
export function mayReadShare(share: GatedShare, caller: Caller | null): ShareReadVerdict {
  if (!share.groupId) return { allowed: true };
  if (!caller) return { allowed: false, reason: "sign-in" };
  if (caller.isAdmin) return { allowed: true };
  if (share.creatorId && share.creatorId === caller.userId) return { allowed: true };
  if (caller.groupIds.has(share.groupId)) return { allowed: true };
  return { allowed: false, reason: "not-member", groupName: share.group?.name ?? "" };
}

/**
 * Who is calling, read from the database so a removed member or a demoted administrator is
 * judged at once. Null for a visitor, a deactivated account, or a session held back by the
 * second step gate (which has already taken the session away on public routes).
 */
export async function callerOf(request: FastifyRequest): Promise<Caller | null> {
  try {
    await request.jwtVerify();
  } catch {
    return null;
  }
  const userId = (request.user as { userId?: unknown } | null)?.userId;
  if (typeof userId !== "string" || !userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true, isAdmin: true, groups: { select: { groupId: true } } },
  });
  if (!user?.isActive) return null;
  return { userId, isAdmin: user.isAdmin, groupIds: new Set(user.groups.map((m) => m.groupId)) };
}

/** Same as callerOf, for a caller that is already known by id (an API key's user). */
export async function callerById(userId: string): Promise<Caller | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true, isAdmin: true, groups: { select: { groupId: true } } },
  });
  if (!user?.isActive) return null;
  return { userId, isAdmin: user.isAdmin, groupIds: new Set(user.groups.map((m) => m.groupId)) };
}

/** The 403 a refused reader gets. A visitor learns only that signing in is needed; a non member only the group's name. */
export function sendGroupRefusal(reply: FastifyReply, verdict: Exclude<ShareReadVerdict, { allowed: true }>) {
  if (verdict.reason === "sign-in") {
    return reply.status(403).send({ error: "Sign in to open this.", code: GROUP_SIGN_IN_CODE });
  }
  return reply.status(403).send({
    error: "This is shared with a group you are not a member of.",
    code: GROUP_NOT_MEMBER_CODE,
    group: { name: verdict.groupName },
  });
}

/** Thrown from places that have no reply at hand; the controller turns it into the same 403. */
export class GroupRefusal extends Error {
  constructor(readonly verdict: Exclude<ShareReadVerdict, { allowed: true }>) {
    super("Group share refused");
  }
}

/** Judges one share by id for the caller of this request. Throws GroupRefusal. A missing share passes: the caller reports it. */
export async function assertMayReadShareById(request: FastifyRequest, shareId: string): Promise<Caller | null> {
  const caller = await callerOf(request);
  const share = await prisma.share.findUnique({ where: { id: shareId }, select: GATE_SELECT });
  if (share) {
    const verdict = mayReadShare(share, caller);
    if (!verdict.allowed) throw new GroupRefusal(verdict);
  }
  return caller;
}

/**
 * From the shares a file sits in, the ones this caller may read. When there are shares but none
 * is readable, `refusal` says why (the first group share that turned the caller away).
 */
export function readableShares<T extends GatedShare>(
  shares: T[],
  caller: Caller | null
): { readable: T[]; refusal: Exclude<ShareReadVerdict, { allowed: true }> | null } {
  const readable: T[] = [];
  let refusal: Exclude<ShareReadVerdict, { allowed: true }> | null = null;
  for (const share of shares) {
    const verdict = mayReadShare(share, caller);
    if (verdict.allowed) readable.push(share);
    else refusal ??= verdict;
  }
  return { readable, refusal: readable.length === 0 ? refusal : null };
}
