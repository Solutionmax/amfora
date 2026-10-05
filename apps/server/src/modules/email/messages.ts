import type { Notice } from "./notice";

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

export function shareReceivedNotice(shareLink: string, shareName: string, senderName: string): Notice {
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
  reverseShareName: string,
  count: number,
  fileList: string,
  uploaderName: string
): Notice {
  const files = fileList.split(", ");
  return {
    subject: `New files received: ${reverseShareName}`,
    title: count === 1 ? "A file was uploaded" : `${count} files were uploaded`,
    text: `${uploaderName} uploaded ${count === 1 ? "a file" : `${count} files`} to your receive link "${reverseShareName}".`,
    rows: files.map((file) => ["File", file] as const),
    footer: "You can open and manage these files in your dashboard.",
  };
}
