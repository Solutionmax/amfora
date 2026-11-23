type Refusal = { status: 400 | 403; body: { error: string; code: string } };

/**
 * Asking for an upload grant can fail for a reason the uploader can act on: the quota is full,
 * the file is too large, the account was switched off. Those are answered with the reason;
 * everything else stays an internal error without detail.
 */
export function uploadRefusal(error: unknown): Refusal | null {
  if (!(error instanceof Error)) return null;
  if (error.message.startsWith("Insufficient storage space"))
    return { status: 400, body: { error: error.message, code: "insufficientStorage" } };
  if (error.message.startsWith("File size exceeds"))
    return { status: 400, body: { error: error.message, code: "fileSizeExceeded" } };
  if (error.message === "Account is inactive")
    return { status: 403, body: { error: error.message, code: "accountInactive" } };
  return null;
}
