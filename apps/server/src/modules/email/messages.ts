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
