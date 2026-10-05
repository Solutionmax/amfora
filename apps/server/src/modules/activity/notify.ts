import { getCanonicalOrigin } from "../../shared/canonical-origin";
import { prisma } from "../../shared/prisma";
import { notDeleted } from "../../shared/trash";
import type { Notice } from "../email/notice";
import { EmailService } from "../email/service";
import { QuietPeriod } from "./quiet";
import { sendWebhook } from "./webhook";

/**
 * What follows from an event besides the line in the log: an email to the maker and a call to
 * the webhook. Nothing here throws; the visitor's request is already answered or about to be.
 */

const emailService = new EmailService();

/** One download email per share in this time, however many visitors and files. */
const downloadEmails = new QuietPeriod(60 * 60 * 1000);

/** Names come from users and go into subject lines; keep them a sane length. */
const MAX_NAME = 200;
const named = (name: string | null, fallback: string) => (name || fallback).slice(0, MAX_NAME);

export const REMINDER_DAYS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

async function switchedOn(key: string): Promise<boolean> {
  const row = await prisma.appConfig.findUnique({ where: { key } });
  return row?.value === "true";
}

async function ownerEmail(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, isActive: true } });
  return user?.isActive ? user.email : null;
}

const when = (date: Date) =>
  date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }) + " UTC";

async function mail(userId: string | null | undefined, notice: Notice): Promise<void> {
  try {
    const to = await ownerEmail(userId);
    if (to) await emailService.sendNotice(to, notice);
  } catch (error) {
    console.error("Could not send notice:", error instanceof Error ? error.message : error);
  }
}

export async function afterShareDownload(input: {
  share: { id: string; name: string | null; creatorId: string | null; notifyOnDownload: boolean };
  fileName: string;
  downloads: number;
  place: string | null;
}): Promise<void> {
  try {
    const { share, fileName, place } = input;
    const name = named(share.name, "Untitled share");
    void sendWebhook("share.downloaded", { shareId: share.id, share: name, file: fileName, place });

    if (!share.notifyOnDownload || !(await switchedOn("notifyDownloadEnabled"))) return;
    if (downloadEmails.isRepeat(share.id)) return;
    await mail(share.creatorId, {
      subject: `Your share was downloaded: ${name}`,
      title: "Your share was downloaded",
      text: `Someone downloaded a file from ${name}.`,
      rows: [
        ["File", fileName.slice(0, MAX_NAME)],
        ["When", when(new Date())],
        ...(place ? ([["Where", place]] as const) : []),
        ["Downloads of this file", String(input.downloads)],
      ],
      button: { label: "Open the share", url: `${getCanonicalOrigin()}/shares?id=${encodeURIComponent(share.id)}` },
      footer: "You get at most one of these an hour per share. Switch it off on the share itself.",
    });
  } catch (error) {
    console.error("After a download:", error);
  }
}

export async function afterFilesReceived(input: {
  reverseShare: { id: string; name: string | null };
  uploaderName: string;
  files: string[];
  bytes: number;
  place: string | null;
}): Promise<void> {
  void sendWebhook("receive.files_received", {
    receiveLinkId: input.reverseShare.id,
    receiveLink: named(input.reverseShare.name, "Untitled receive link"),
    from: input.uploaderName,
    files: input.files,
    bytes: input.bytes,
    place: input.place,
  });
}

export async function afterSecretOpened(input: {
  secret: { id: string; label: string | null; creatorId: string | null; opens: number; maxOpens: number };
  place: string | null;
}): Promise<void> {
  try {
    const { secret, place } = input;
    const name = named(secret.label, "Untitled secret");
    void sendWebhook("secret.opened", {
      secretId: secret.id,
      secret: name,
      opens: secret.opens,
      maxOpens: secret.maxOpens,
      place,
    });

    if (!secret.creatorId || !(await switchedOn("notifySecretOpenedEnabled"))) return;
    await mail(secret.creatorId, {
      subject: `Your secret was opened: ${name}`,
      title: "Your secret was opened",
      text: `${name} was opened. The text itself is never in an email.`,
      rows: [
        ["Opened", `${secret.opens} of ${secret.maxOpens} times`],
        ["When", when(new Date())],
        ...(place ? ([["Where", place]] as const) : []),
      ],
      button: { label: "Open Secrets", url: `${getCanonicalOrigin()}/secrets?id=${encodeURIComponent(secret.id)}` },
      footer: "Not who you expected? Delete the secret, its link stops working at once.",
    });
  } catch (error) {
    console.error("After a secret was opened:", error);
  }
}

/**
 * Emails the maker of every share and receive link that ends within three days and asked for a
 * reminder. Remembers the end date it reminded for, so a moved end date is reminded again.
 */
export async function sendExpiryReminders(now = new Date()): Promise<number> {
  if (!(await switchedOn("notifyExpiryEnabled"))) return 0;
  const soon = new Date(now.getTime() + REMINDER_DAYS * MS_PER_DAY);
  const due = { remindBeforeExpiry: true, expiration: { gt: now, lte: soon } } as const;
  let sent = 0;

  const remind = async (
    kind: "share" | "receive link",
    item: {
      id: string;
      name: string | null;
      creatorId: string | null;
      expiration: Date | null;
      expiryReminderFor: Date | null;
    },
    facts: ReadonlyArray<readonly [string, string]>,
    url: string,
    mark: () => Promise<unknown>
  ) => {
    if (!item.expiration || item.expiryReminderFor?.getTime() === item.expiration.getTime()) return;
    const days = Math.max(1, Math.ceil((item.expiration.getTime() - now.getTime()) / MS_PER_DAY));
    const name = named(item.name, `Untitled ${kind}`);
    // Marked first: a mail server that is down must not cause the same reminder every hour.
    await mark();
    await mail(item.creatorId, {
      subject: `Expires in ${days} ${days === 1 ? "day" : "days"}: ${name}`,
      title: `This link expires in ${days} ${days === 1 ? "day" : "days"}`,
      text: `The ${kind} ${name} stops working on ${when(item.expiration)}.`,
      rows: [...facts, ["Expires", when(item.expiration)]],
      button: { label: "Change the end date", url },
      footer: "Nothing to do if that is what you want.",
    });
    sent += 1;
  };

  const origin = getCanonicalOrigin();
  const shares = await prisma.share.findMany({
    where: due,
    include: { _count: { select: { files: { where: notDeleted } } } },
  });
  for (const share of shares) {
    await remind(
      "share",
      share,
      [
        ["Files", String(share._count.files)],
        ["Views so far", String(share.views)],
      ],
      `${origin}/shares?id=${encodeURIComponent(share.id)}`,
      () => prisma.share.update({ where: { id: share.id }, data: { expiryReminderFor: share.expiration } })
    ).catch((error) => console.error("Reminder failed:", error));
  }

  const links = await prisma.reverseShare.findMany({ where: due, include: { _count: { select: { files: true } } } });
  for (const link of links) {
    await remind(
      "receive link",
      link,
      [["Received so far", `${link._count.files} ${link._count.files === 1 ? "file" : "files"}`]],
      `${origin}/reverse-shares?id=${encodeURIComponent(link.id)}`,
      () => prisma.reverseShare.update({ where: { id: link.id }, data: { expiryReminderFor: link.expiration } })
    ).catch((error) => console.error("Reminder failed:", error));
  }
  return sent;
}
