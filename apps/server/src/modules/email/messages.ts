import type { Notice } from "./notice";

/** Names typed by people are cut at this many characters in subjects and texts. */
const MAX_NAME_CHARS = 200;
const clip = (value: string) => (value.length > MAX_NAME_CHARS ? value.slice(0, MAX_NAME_CHARS) : value);

/** The mails that are not about activity on a link, worded like the others: plain sentences, no app name in front. */

export function passwordResetNotice(resetUrl: string): Notice {
  return {
    subject: "Reset your password",
    title: "Reset your password",
    text: "Use the button below to choose a new password. This link will expire in 1 hour.",
    button: { label: "Reset password", url: resetUrl },
    footer: "If you did not ask for this, you can ignore this email. Your password stays as it is.",
  };
}

export function shareReceivedNotice(shareLink: string, rawShareName: string, rawSenderName: string): Notice {
  const shareName = clip(rawShareName);
  const senderName = clip(rawSenderName);
  return {
    subject: `Shared with you: ${shareName}`,
    title: "Files shared with you",
    text: `${senderName} shared "${shareName}" with you.`,
    button: { label: "Open the files", url: shareLink },
    footer:
      "This share may have an end date or a view limit, so open it soon. If you did not expect this, you can ignore this email.",
  };
}

export function filesReceivedNotice(
  rawReverseShareName: string,
  count: number,
  files: readonly string[],
  rawUploaderName: string
): Notice {
  const reverseShareName = clip(rawReverseShareName);
  const uploaderName = clip(rawUploaderName);
  return {
    subject: `New files received: ${reverseShareName}`,
    title: count === 1 ? "A file was uploaded" : `${count} files were uploaded`,
    text: `${uploaderName} uploaded ${count === 1 ? "a file" : `${count} files`} to your receive link "${reverseShareName}".`,
    rows: files.map((file) => ["File", clip(file)] as const),
    footer: "You can open and manage these files in your dashboard.",
  };
}

export function infectedFileNotice(
  rawFileName: string,
  rawFinding: string,
  where: "your files" | "a receive link",
  filesUrl: string
): Notice {
  const fileName = clip(rawFileName);
  const finding = clip(rawFinding);
  return {
    subject: `File blocked: ${fileName}`,
    title: "A file was blocked",
    text: `The virus scan found something in "${fileName}" in ${where}. Nobody can download it. You can delete it.`,
    rows: [
      ["File", fileName],
      ["Found", finding],
    ],
    button: { label: "Open your files", url: filesUrl },
    footer: "Do not open the file on a computer you care about. Delete it from your files.",
  };
}

const NAMES_IN_NOTICE = 5;

/** One notice for what a scan run found: the plain notice for one file, else a count and the first names. */
export function infectedFilesNotice(
  files: ReadonlyArray<{ name: string; finding: string; where: "your files" | "a receive link" }>,
  filesUrl: string
): Notice {
  if (files.length === 1) return infectedFileNotice(files[0].name, files[0].finding, files[0].where, filesUrl);
  const rows: Array<readonly [string, string]> = files
    .slice(0, NAMES_IN_NOTICE)
    .map((file) => ["File", `${clip(file.name)}: ${clip(file.finding)}`] as const);
  const more = files.length - NAMES_IN_NOTICE;
  if (more > 0) rows.push(["More", `and ${more} others`] as const);
  return {
    subject: `${files.length} files blocked`,
    title: "Files were blocked",
    text: `The virus scan found something in ${files.length} files. Nobody can download them. You can delete them.`,
    rows,
    button: { label: "Open your files", url: filesUrl },
    footer: "Do not open these files on a computer you care about. Delete them from your files.",
  };
}
