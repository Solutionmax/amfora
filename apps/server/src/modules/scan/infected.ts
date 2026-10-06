import { getCanonicalOrigin } from "../../shared/canonical-origin";
import { prisma } from "../../shared/prisma";
import { recordActivity } from "../activity/activity";
import { infectedFileNotice } from "../email/messages";
import { EmailService } from "../email/service";

const emailService = new EmailService();

export interface InfectedFile {
  id: string;
  name: string;
  finding: string;
  /** The owner: the maker of the file, or of the receive link it came in on. */
  ownerId: string;
  where: "your files" | "a receive link";
}

/** Addresses of the owner and of every active administrator, each once. */
async function recipients(ownerId: string): Promise<string[]> {
  const people = await prisma.user.findMany({
    where: { isActive: true, OR: [{ id: ownerId }, { isAdmin: true }] },
    select: { email: true },
  });
  return [...new Set(people.map((person) => person.email))];
}

/**
 * A file was found to be harmful: a line in the owner's log (which also puts it in the bell) and a
 * mail to the owner and the administrators when sending mail is on. Never throws.
 */
export async function announceInfected(file: InfectedFile): Promise<void> {
  await recordActivity({
    action: "file.infected",
    kind: "account",
    ownerId: file.ownerId,
    subject: file.name,
    subjectId: file.id,
    detail: file.finding,
  });
  try {
    const notice = infectedFileNotice(file.name, file.finding, file.where, `${getCanonicalOrigin()}/files`);
    for (const to of await recipients(file.ownerId)) {
      await emailService.sendNotice(to, notice).catch((error) => console.error("Could not send notice:", error));
    }
  } catch (error) {
    console.error("Could not tell about an infected file:", error);
  }
}
