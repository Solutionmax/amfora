import type { Prisma } from "@prisma/client";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { loadAccount } from "../../shared/admin-guard";
import { prisma } from "../../shared/prisma";
import { storageLimitOf } from "../storage/limit";
import { NOTIFICATION_ACTIONS, recordActivity } from "./activity";

/**
 * Notifications are lines of the activity log: yours (ownerId), with one of the notification
 * actions, and not done by yourself. "Seen" is one time on the user. There is no second store.
 *
 * ponytail: a notification lives as long as the activity log keeps its line. The retention job
 * and "Clear log" take notifications with them; that is accepted, the bell is not an archive.
 */

const PAGE_SIZE = 20;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** A user who never opened the bell sees the last week as new, not the whole log. */
const FIRST_LOOK_DAYS = 7;
const REMINDER_DAYS = 3;
const FULL_PERCENT = 90n;

const ErrorSchema = z.object({ error: z.string() });

const NotificationSchema = z.object({
  id: z.string(),
  action: z.string(),
  subject: z.string().nullable(),
  subjectId: z.string().nullable(),
  detail: z.string().nullable(),
  amount: z.number().nullable(),
  actorName: z.string().nullable(),
  createdAt: z.date(),
  isNew: z.boolean(),
});

const mine = (userId: string): Prisma.ActivityEventWhereInput => ({
  ownerId: userId,
  action: { in: [...NOTIFICATION_ACTIONS] },
  OR: [{ actorId: null }, { actorId: { not: userId } }],
});

async function seenAtOf(userId: string): Promise<Date> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { notificationsSeenAt: true } });
  return user?.notificationsSeenAt ?? new Date(Date.now() - FIRST_LOOK_DAYS * MS_PER_DAY);
}

/**
 * Writes "ends soon" for every share and receive link that ends within three days, once per link
 * and end date (the end date is the detail). Independent of the mail switches.
 */
export async function noteExpiringLinks(now = new Date()): Promise<void> {
  const where = {
    expiration: { gt: now, lte: new Date(now.getTime() + REMINDER_DAYS * MS_PER_DAY) },
  };
  const note = async (
    action: "share.expiring" | "receive.expiring",
    links: Array<{ id: string; name: string | null; creatorId: string | null; expiration: Date | null }>
  ) => {
    if (links.length === 0) return;
    const told = await prisma.activityEvent.findMany({
      where: { action, subjectId: { in: links.map((link) => link.id) } },
      select: { subjectId: true, detail: true },
    });
    const done = new Set(told.map((line) => `${line.subjectId} ${line.detail}`));
    for (const link of links) {
      const ends = link.expiration?.toISOString();
      if (!ends || !link.creatorId || done.has(`${link.id} ${ends}`)) continue;
      await recordActivity({ action, ownerId: link.creatorId, subject: link.name, subjectId: link.id, detail: ends });
    }
  };
  await note(
    "share.expiring",
    await prisma.share.findMany({ where, select: { id: true, name: true, creatorId: true, expiration: true } })
  );
  await note(
    "receive.expiring",
    await prisma.reverseShare.findMany({ where, select: { id: true, name: true, creatorId: true, expiration: true } })
  );
}

/**
 * Call after `addedBytes` landed in a user's files. Writes "storage almost full" at the moment
 * usage crosses 90 percent of the limit. Nothing is remembered: it is a crossing when the usage
 * before was under and now is not, so it happens once until usage drops below and rises again.
 */
export async function noteStorageGrowth(userId: string, addedBytes: number | bigint): Promise<void> {
  try {
    const limit = await storageLimitOf(userId);
    if (limit <= 0n) return;
    const used = (await prisma.file.aggregate({ where: { userId }, _sum: { size: true } }))._sum.size ?? 0n;
    const threshold = (limit * FULL_PERCENT) / 100n;
    if (used < threshold || used - BigInt(addedBytes) >= threshold) return;
    await recordActivity({
      action: "account.storage_almost_full",
      ownerId: userId,
      detail: `${used}/${limit}`,
      amount: Number((used * 100n) / limit),
    });
  } catch (error) {
    console.error("Could not check storage:", error);
  }
}

export async function notificationRoutes(app: FastifyInstance) {
  const preValidation = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: "Unauthorized: a valid token is required to access this resource." });
    }
    // Read from the database, not the token: a deactivated account sees nothing.
    const userId = (request.user as { userId: string }).userId;
    if (!(await loadAccount(userId))?.isActive) {
      return reply.status(401).send({ error: "Unauthorized: this account is not active." });
    }
  };
  const userIdOf = (request: FastifyRequest) => (request.user as { userId: string }).userId;
  const tags = ["Notifications"];

  app.get(
    "/notifications",
    {
      preValidation,
      schema: {
        tags,
        operationId: "listNotifications",
        summary: "Your notifications",
        description: "The latest twenty things that happened to your links and storage, newest first. Only your own.",
        response: {
          200: z.object({ notifications: z.array(NotificationSchema), unseen: z.number() }),
          401: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = userIdOf(request);
      const seenAt = await seenAtOf(userId);
      const rows = await prisma.activityEvent.findMany({
        where: mine(userId),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: PAGE_SIZE,
        select: {
          id: true,
          action: true,
          subject: true,
          subjectId: true,
          detail: true,
          amount: true,
          actorName: true,
          createdAt: true,
        },
      });
      const notifications = rows.map((row) => ({ ...row, isNew: row.createdAt > seenAt }));
      return reply.send({ notifications, unseen: notifications.filter((row) => row.isNew).length });
    }
  );

  app.get(
    "/notifications/count",
    {
      preValidation,
      schema: {
        tags,
        operationId: "countNotifications",
        summary: "New notifications",
        description: "How many of your notifications are newer than the last time you opened them.",
        response: { 200: z.object({ count: z.number() }), 401: ErrorSchema },
      },
    },
    async (request, reply) => {
      const userId = userIdOf(request);
      const count = await prisma.activityEvent.count({
        where: { AND: [mine(userId), { createdAt: { gt: await seenAtOf(userId) } }] },
      });
      return reply.send({ count });
    }
  );

  app.post(
    "/notifications/seen",
    {
      preValidation,
      schema: {
        tags,
        operationId: "markNotificationsSeen",
        summary: "Mark notifications as seen",
        description: "Everything up to now counts as seen, for you only.",
        response: { 200: z.object({ seenAt: z.date() }), 401: ErrorSchema },
      },
    },
    async (request, reply) => {
      const seenAt = new Date();
      await prisma.user.update({ where: { id: userIdOf(request) }, data: { notificationsSeenAt: seenAt } });
      return reply.send({ seenAt });
    }
  );
}
