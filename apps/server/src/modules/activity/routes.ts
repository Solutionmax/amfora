import type { Prisma } from "@prisma/client";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { createAdminGuard, loadAccount } from "../../shared/admin-guard";
import { prisma } from "../../shared/prisma";
import { notDeleted } from "../../shared/trash";
import { storageLimitOf } from "../storage/limit";
import { activityData, actorOf, placeOfRequest } from "./activity";
import { placeSource } from "./place";

const KINDS = ["share", "receive", "secret", "account"] as const;
const PAGE_SIZE = 100;
const MAX_EXPORT_ROWS = 10_000;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

const EventSchema = z.object({
  id: z.string(),
  kind: z.string(),
  action: z.string(),
  subject: z.string().nullable(),
  subjectId: z.string().nullable(),
  detail: z.string().nullable(),
  amount: z.number().nullable(),
  actorName: z.string().nullable().describe("Null for a visitor"),
  place: z.string().nullable(),
  createdAt: z.date(),
});

const WeekSchema = z.object({ thisWeek: z.number(), lastWeek: z.number() });

const QuerySchema = z.object({
  kind: z.enum(KINDS).optional(),
  q: z.string().trim().max(100).optional(),
  subjectId: z.string().max(64).optional(),
  cursor: z.string().max(64).optional().describe("Id of the last event you have, for the next page"),
});

const ErrorSchema = z.object({ error: z.string() });

const fields = {
  id: true,
  kind: true,
  action: true,
  subject: true,
  subjectId: true,
  detail: true,
  amount: true,
  actorName: true,
  place: true,
  createdAt: true,
} as const;

type Row = Prisma.ActivityEventGetPayload<{ select: typeof fields & { ownerId: true } }>;

/**
 * What a reader may see of a row. The label of a secret is promised to its maker alone, so an
 * administrator reading someone else's activity gets the event without the label.
 */
export function visibleTo(userId: string, { ownerId, ...row }: Row) {
  return row.kind === "secret" && ownerId !== userId ? { ...row, subject: null } : row;
}

/** Quotes a value for CSV, and defuses a cell a spreadsheet would run as a formula. */
export function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function activityRoutes(app: FastifyInstance) {
  const preValidation = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: "Unauthorized: a valid token is required to access this resource." });
    }
  };

  /** An administrator sees everything, anyone else only what happened to their own links and account. */
  const scopeOf = async (request: FastifyRequest): Promise<Prisma.ActivityEventWhereInput | null> => {
    const userId = (request.user as { userId: string }).userId;
    // Read from the database, not the token: rights taken away must end at once.
    const account = await loadAccount(userId);
    if (!account?.isActive) return null;
    return account.isAdmin ? {} : { ownerId: userId };
  };

  /** The search term and the subject, without the kind: what the counts per kind are taken over. */
  const searchOf = (query: z.infer<typeof QuerySchema>): Prisma.ActivityEventWhereInput => ({
    ...(query.subjectId ? { subjectId: query.subjectId } : {}),
    ...(query.q
      ? {
          OR: [
            { subject: { contains: query.q } },
            { detail: { contains: query.q } },
            { actorName: { contains: query.q } },
            { place: { contains: query.q } },
          ],
        }
      : {}),
  });

  const filterOf = (query: z.infer<typeof QuerySchema>): Prisma.ActivityEventWhereInput => ({
    ...searchOf(query),
    ...(query.kind ? { kind: query.kind } : {}),
  });

  app.get(
    "/activity",
    {
      preValidation,
      schema: {
        tags: ["Activity"],
        operationId: "listActivity",
        summary: "List activity",
        description: "What happened to links and accounts, newest first. Administrators see everyone.",
        querystring: QuerySchema,
        response: {
          200: z.object({
            events: z.array(EventSchema),
            hasMore: z.boolean(),
            counts: z.record(z.number()).describe("Events per kind, and under `all`"),
            summary: z.object({
              downloads: WeekSchema,
              opened: WeekSchema,
              filesReceived: WeekSchema,
              failedSignIns: WeekSchema,
            }),
            placeSource: z.string().nullable().describe("The place database in use, for credit"),
          }),
          401: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const scope = await scopeOf(request);
      if (!scope) return reply.status(401).send({ error: "Unauthorized: this account is not active." });
      const query = request.query as z.infer<typeof QuerySchema>;
      const reader = (request.user as { userId: string }).userId;

      const rows = await prisma.activityEvent.findMany({
        where: { AND: [scope, filterOf(query)] },
        // Time, then id: events in the same millisecond keep one order, so no page skips any.
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        take: PAGE_SIZE + 1,
        select: { ...fields, ownerId: true },
      });

      const grouped = await prisma.activityEvent.groupBy({
        by: ["kind"],
        where: { AND: [scope, searchOf(query)] },
        _count: { _all: true },
      });
      const counts: Record<string, number> = { all: 0 };
      for (const kind of KINDS) counts[kind] = 0;
      for (const group of grouped) {
        counts[group.kind] = group._count._all;
        counts.all += group._count._all;
      }

      const now = Date.now();
      const week = async (actions: string[], sum = false) => {
        const count = async (from: number, to: number) => {
          const where = {
            AND: [scope, { action: { in: actions }, createdAt: { gte: new Date(from), lt: new Date(to) } }],
          };
          if (!sum) return prisma.activityEvent.count({ where });
          return (await prisma.activityEvent.aggregate({ where, _sum: { amount: true } }))._sum.amount ?? 0;
        };
        return {
          thisWeek: await count(now - MS_PER_WEEK, now),
          lastWeek: await count(now - 2 * MS_PER_WEEK, now - MS_PER_WEEK),
        };
      };

      return reply.send({
        events: rows.slice(0, PAGE_SIZE).map((row) => visibleTo(reader, row)),
        hasMore: rows.length > PAGE_SIZE,
        counts,
        summary: {
          downloads: await week(["share.downloaded"]),
          opened: await week(["share.opened", "secret.opened"]),
          filesReceived: await week(["receive.files_received"], true),
          failedSignIns: await week(["account.sign_in_failed"]),
        },
        placeSource: await placeSource(),
      });
    }
  );

  const userIdOf = (request: FastifyRequest) => (request.user as { userId: string }).userId;
  const IdParams = z.object({ id: z.string().max(64) });

  app.patch(
    "/shares/:id/notifications",
    {
      preValidation,
      schema: {
        tags: ["Share"],
        operationId: "updateShareNotifications",
        summary: "Emails about one share",
        description: "Whether the maker gets an email on a download, and a reminder before the end date.",
        params: IdParams,
        body: z.object({ notifyOnDownload: z.boolean().optional(), remindBeforeExpiry: z.boolean().optional() }),
        response: {
          200: z.object({ notifyOnDownload: z.boolean(), remindBeforeExpiry: z.boolean() }),
          401: ErrorSchema,
          404: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as z.infer<typeof IdParams>;
      const data = request.body as { notifyOnDownload?: boolean; remindBeforeExpiry?: boolean };
      const { count } = await prisma.share.updateMany({ where: { id, creatorId: userIdOf(request) }, data });
      if (count === 0) return reply.status(404).send({ error: "Share not found" });
      const share = await prisma.share.findUniqueOrThrow({
        where: { id },
        select: { notifyOnDownload: true, remindBeforeExpiry: true },
      });
      return reply.send(share);
    }
  );

  app.patch(
    "/reverse-shares/:id/notifications",
    {
      preValidation,
      schema: {
        tags: ["Reverse Share"],
        operationId: "updateReverseShareNotifications",
        summary: "Emails about one receive link",
        description: "Whether the maker gets a reminder before the end date.",
        params: IdParams,
        body: z.object({ remindBeforeExpiry: z.boolean() }),
        response: { 200: z.object({ remindBeforeExpiry: z.boolean() }), 401: ErrorSchema, 404: ErrorSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as z.infer<typeof IdParams>;
      const { remindBeforeExpiry } = request.body as { remindBeforeExpiry: boolean };
      const { count } = await prisma.reverseShare.updateMany({
        where: { id, creatorId: userIdOf(request) },
        data: { remindBeforeExpiry },
      });
      if (count === 0) return reply.status(404).send({ error: "Receive link not found" });
      return reply.send({ remindBeforeExpiry });
    }
  );

  app.get(
    "/storage/usage",
    {
      preValidation,
      schema: {
        tags: ["Storage"],
        operationId: "getStorageUsage",
        summary: "Your own storage",
        description: "What the signed-in user stores, against their own limit. Bytes as numbers.",
        response: {
          200: z.object({
            limitBytes: z.number().nullable().describe("Null: no limit"),
            usedBytes: z.number().describe("Your files, the trash included. This is what counts towards the limit."),
            sharedBytes: z.number().describe("The part of your files that sits in at least one share"),
            receivedBytes: z.number().describe("Files others sent you. They do not count towards the limit."),
          }),
          401: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = userIdOf(request);
      const sum = async (where: Prisma.FileWhereInput) =>
        Number((await prisma.file.aggregate({ where, _sum: { size: true } }))._sum.size ?? 0);
      const received = await prisma.reverseShareFile.aggregate({
        where: { reverseShare: { creatorId: userId } },
        _sum: { size: true },
      });
      const limit = Number(await storageLimitOf(userId));
      return reply.send({
        limitBytes: Number.isFinite(limit) && limit > 0 ? limit : null,
        usedBytes: await sum({ userId }),
        sharedBytes: await sum({ userId, shares: { some: {} }, ...notDeleted }),
        receivedBytes: Number(received._sum.size ?? 0),
      });
    }
  );

  app.get(
    "/activity/export",
    {
      preValidation,
      schema: {
        tags: ["Activity"],
        operationId: "exportActivity",
        summary: "Activity as CSV",
        description: "The same list as a file, newest first, at most ten thousand lines.",
        querystring: QuerySchema.omit({ cursor: true }),
      },
    },
    async (request, reply) => {
      const scope = await scopeOf(request);
      if (!scope) return reply.status(401).send({ error: "Unauthorized: this account is not active." });
      const query = request.query as z.infer<typeof QuerySchema>;
      const reader = (request.user as { userId: string }).userId;

      const rows = await prisma.activityEvent.findMany({
        where: { AND: [scope, filterOf(query)] },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: MAX_EXPORT_ROWS,
        select: { ...fields, ownerId: true },
      });
      const lines = [
        ["when", "action", "subject", "detail", "amount", "who", "where"].map(csvCell).join(","),
        ...rows
          .map((row) => visibleTo(reader, row))
          .map((row) =>
            [
              row.createdAt.toISOString(),
              row.action,
              row.subject,
              row.detail,
              row.amount,
              row.actorName ?? "Visitor",
              row.place,
            ]
              .map(csvCell)
              .join(",")
          ),
      ];
      return reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", 'attachment; filename="activity.csv"')
        .header("Cache-Control", "no-store")
        .send(lines.join("\r\n"));
    }
  );

  app.delete(
    "/activity",
    {
      preValidation: createAdminGuard(),
      schema: {
        tags: ["Activity"],
        operationId: "clearActivity",
        summary: "Clear the activity log",
        description: "Administrators only. Removes every line; one line about the clearing itself remains.",
        response: { 200: z.object({ removed: z.number() }), 401: ErrorSchema, 403: ErrorSchema },
      },
    },
    async (request, reply) => {
      const userId = (request.user as { userId: string }).userId;
      const actor = await actorOf(userId);
      const place = await placeOfRequest(request).catch(() => null);
      // One step: if the remaining line cannot be written, nothing is deleted. The array form keeps
      // to the single database connection. Visible to administrators only: no owner.
      const [{ count }] = await prisma.$transaction([
        prisma.activityEvent.deleteMany({}),
        prisma.activityEvent.create({
          data: activityData({ action: "activity.cleared", kind: "account", ...actor }, place),
        }),
      ]);
      return reply.send({ removed: count });
    }
  );
}
