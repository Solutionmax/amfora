import type { FastifyRequest } from "fastify";

import { prisma } from "../../shared/prisma";
import { clientAddress, placeOf, type PlaceMode } from "./place";
import { QuietPeriod } from "./quiet";

export type ActivityKind = "share" | "receive" | "secret" | "account";

/** Every action the log knows. The interface has words for each of them. */
export const ACTIVITY_ACTIONS = [
  "share.created",
  "share.deleted",
  "share.opened",
  "share.downloaded",
  "share.password_failed",
  "receive.files_received",
  "secret.created",
  "secret.deleted",
  "secret.opened",
  "secret.destroyed",
  "account.signed_in",
  "account.sign_in_failed",
] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export interface ActivityInput {
  action: ActivityAction;
  /** Whose activity this is: the maker of the link, or the account. */
  ownerId?: string | null;
  subject?: string | null;
  subjectId?: string | null;
  detail?: string | null;
  amount?: number | null;
  /** Leave both out for a visitor. */
  actorId?: string | null;
  actorName?: string | null;
}

const MAX_TEXT = 200;
const clip = (text: string | null | undefined) => (text ? text.slice(0, MAX_TEXT) : null);

/** The same visitor doing the same thing to the same link is one line an hour, not one per request. */
const visitorRepeats = new QuietPeriod(60 * 60 * 1000);

/** Lines visitors may add to one maker's log in an hour. Past it, a flood no longer buries the rest. */
const MAX_VISITOR_LINES_PER_HOUR = 300;
const HOUR_MS = 60 * 60 * 1000;

const DEFAULT_RETENTION_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function activitySettings(): Promise<{ placeMode: PlaceMode; retentionDays: number }> {
  const rows = await prisma.appConfig.findMany({ where: { key: { in: ["activityPlace", "activityRetentionDays"] } } });
  const stored = new Map(rows.map((row) => [row.key, row.value]));
  const mode = stored.get("activityPlace");
  const days = Number(stored.get("activityRetentionDays"));
  return {
    placeMode: mode === "country" || mode === "off" ? mode : "city",
    retentionDays: Number.isInteger(days) && days >= 1 ? days : DEFAULT_RETENTION_DAYS,
  };
}

/** The place a request came from, under the current setting. */
export async function placeOfRequest(request: Pick<FastifyRequest, "headers" | "ip">): Promise<string | null> {
  return placeOf(clientAddress(request), (await activitySettings()).placeMode);
}

/**
 * Writes one line in the activity log. Never throws: a log that cannot be written must not
 * cost a visitor their download or a user their sign in.
 */
export async function recordActivity(input: ActivityInput, where?: { place: string | null }): Promise<void> {
  try {
    await prisma.activityEvent.create({
      data: {
        kind: input.action.split(".")[0],
        action: input.action,
        ownerId: input.ownerId ?? null,
        subject: clip(input.subject),
        subjectId: input.subjectId ?? null,
        detail: clip(input.detail),
        amount: input.amount ?? null,
        actorId: input.actorId ?? null,
        actorName: clip(input.actorName),
        place: where?.place ?? null,
      },
    });
  } catch (error) {
    console.error("Could not write activity:", error);
  }
}

/** Records with the place of the request. */
export async function recordRequestActivity(
  request: Pick<FastifyRequest, "headers" | "ip">,
  input: ActivityInput
): Promise<string | null> {
  const place = await placeOfRequest(request).catch(() => null);
  await recordActivity(input, { place });
  return place;
}

/**
 * For things anyone on the internet can cause: opening a public link, a wrong password, a failed
 * sign in. Repeats by the same visitor within the hour are left out, and so is everything past a
 * ceiling per maker, so a stranger cannot fill someone's log or the database.
 */
export async function recordVisitorActivity(
  request: Pick<FastifyRequest, "headers" | "ip">,
  input: ActivityInput
): Promise<string | null> {
  const place = await placeOfRequest(request).catch(() => null);
  try {
    const key = `${input.action} ${input.subjectId ?? input.ownerId ?? ""} ${clientAddress(request)}`;
    if (visitorRepeats.isRepeat(key)) return place;
    const recent = await prisma.activityEvent.count({
      where: { ownerId: input.ownerId ?? null, actorId: null, createdAt: { gt: new Date(Date.now() - HOUR_MS) } },
    });
    if (recent >= MAX_VISITOR_LINES_PER_HOUR) return place;
  } catch (error) {
    console.error("Could not check activity limits:", error);
    return place;
  }
  await recordActivity(input, { place });
  return place;
}

/** The display name of a signed-in user, for the "who" of an event. */
export async function actorOf(userId: string): Promise<{ actorId: string; actorName: string | null }> {
  // The action this names already happened; a failed lookup must not turn it into an error.
  const user = await prisma.user
    .findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } })
    .catch(() => null);
  return { actorId: userId, actorName: user ? `${user.firstName} ${user.lastName}`.trim() : null };
}

export async function purgeOldActivity(now = new Date()): Promise<number> {
  const { retentionDays } = await activitySettings();
  const { count } = await prisma.activityEvent.deleteMany({
    where: { createdAt: { lt: new Date(now.getTime() - retentionDays * MS_PER_DAY) } },
  });
  return count;
}
