export function assertUploadGrant(
  grant: { reverseShareId: string; expiresAt: Date; consumed: boolean; uploadId: string | null } | null,
  reverseShareId: string,
  uploadId?: string
) {
  if (
    !grant ||
    grant.reverseShareId !== reverseShareId ||
    grant.consumed ||
    grant.expiresAt <= new Date() ||
    (uploadId !== undefined && grant.uploadId !== uploadId)
  )
    throw new Error("Invalid or expired upload authorization");
}

export function assertUploadedFile(
  share: {
    maxFileSize: bigint | null;
    allowedFileTypes: string | null;
    nameFieldRequired: string;
    emailFieldRequired: string;
  },
  file: { name: string; extension: string; size: number; uploaderName?: string; uploaderEmail?: string },
  actualSize: number
) {
  if (!Number.isSafeInteger(file.size) || file.size <= 0 || actualSize !== file.size)
    throw new Error("Stored file size does not match upload");
  if (share.maxFileSize && BigInt(actualSize) > share.maxFileSize) throw new Error("File size exceeds limit");
  const extension = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  if (extension !== file.extension.replace(/^\./, "").toLowerCase())
    throw new Error("File extension does not match filename");
  if (
    share.allowedFileTypes &&
    !share.allowedFileTypes
      .split(",")
      .map((x) => x.trim().replace(/^\./, "").toLowerCase())
      .includes(extension)
  )
    throw new Error("File type not allowed");
  if (share.nameFieldRequired === "REQUIRED" && !file.uploaderName?.trim())
    throw new Error("Uploader name is required");
  if (share.emailFieldRequired === "REQUIRED" && !file.uploaderEmail?.trim())
    throw new Error("Uploader email is required");
}
