import { getCanonicalOrigin } from "../../shared/canonical-origin";
import { prisma } from "../../shared/prisma";
import { recordActivity } from "../activity/activity";
import { infectedFilesNotice } from "../email/messages";
import { EmailService } from "../email/service";

const emailService = new EmailService();

/** More lines than this per owner per hour are only counted in the mail. */
const LINES_PER_OWNER_PER_HOUR = 20;
const HOUR_MS = 60 * 60_000;

export interface InfectedFile {
  id: string;
  name: string;
  finding: string;
  /** The owner: the maker of the file, or of the receive link it came in on. */
  ownerId: string;
  where: "your files" | "a receive link";
}

const byOwner = (files: InfectedFile[]) => {
  const groups = new Map<string, InfectedFile[]>();
  for (const file of files) groups.set(file.ownerId, [...(groups.get(file.ownerId) ?? []), file]);
  return groups;
};

/** One line in the log of the owner (which also puts it in the bell), as long as the hour has room for it. */
export async function recordInfectedLine(file: InfectedFile): Promise<void> {
  const recent = await prisma.activityEvent.count({
    where: { action: "file.infected", ownerId: file.ownerId, createdAt: { gt: new Date(Date.now() - HOUR_MS) } },
  });
  if (recent >= LINES_PER_OWNER_PER_HOUR) return;
  await recordActivity({
    action: "file.infected",
    kind: "account",
    ownerId: file.ownerId,
    subject: file.name,
    subjectId: file.id,
    detail: file.finding,
  });
}

async function send(to: string, files: InfectedFile[]) {
  const notice = infectedFilesNotice(files, `${getCanonicalOrigin()}/files`);
  await emailService.sendNotice(to, notice).catch((error) => console.error("Could not send notice:", error));
}

/**
 * The mail about what one run of the scan found, when sending mail is on: one mail per owner and one
 * mail for every active administrator, each with a count and the first names. An owner who is an
 * administrator gets only the administrator mail. The lines in the log are written by
 * recordInfectedLine, right when a file is settled. Never throws.
 */
export async function announceInfected(files: InfectedFile[]): Promise<void> {
  if (files.length === 0) return;
  try {
    const groups = byOwner(files);
    const people = await prisma.user.findMany({
      where: { isActive: true, OR: [{ id: { in: [...groups.keys()] } }, { isAdmin: true }] },
      select: { id: true, email: true, isAdmin: true },
    });
    for (const person of people) {
      const own = groups.get(person.id) ?? [];
      if (person.isAdmin) await send(person.email, files);
      else if (own.length > 0) await send(person.email, own);
    }
  } catch (error) {
    console.error("Could not tell about infected files:", error);
  }
}
