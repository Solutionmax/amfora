import { downloadReverseShareFile } from "@/http/endpoints/reverse-shares";
import type { ReverseShareFile } from "@/http/endpoints/reverse-shares/types";

type Translate = (key: string, values?: Record<string, string | number>) => string;

/** Ask the server for a download URL and hand it to the browser. */
export async function downloadReceivedFile(file: Pick<ReverseShareFile, "id" | "name">) {
  const response = await downloadReverseShareFile(file.id);
  const link = document.createElement("a");
  link.href = response.data.url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

interface CopyError {
  message?: string;
  code?: string;
  name?: string;
  response?: { data?: { error?: string } };
}

/** Readable message for a failed "copy to My Files"; storage limits come straight from the server. */
export function copyErrorMessage(error: unknown, t: Translate): string {
  const err = (error ?? {}) as CopyError;
  if (err.message?.includes("timeout") || err.code === "UND_ERR_SOCKET") {
    return t("reverseShares.modals.receivedFiles.copyErrors.timeout");
  }
  const serverError = err.response?.data?.error;
  if (serverError) {
    if (serverError.includes("File size exceeds") || serverError.includes("Insufficient storage")) return serverError;
    if (serverError.includes("Copy operation failed")) return t("reverseShares.modals.receivedFiles.copyErrors.failed");
  }
  if (err.name === "AbortError") return t("reverseShares.modals.receivedFiles.copyErrors.aborted");
  return t("reverseShares.modals.receivedFiles.copyError");
}

/** "Lisa de Vries", the email when there is no name, or null for an anonymous sender. */
export function senderName(file: Pick<ReverseShareFile, "uploaderName" | "uploaderEmail">): string | null {
  return file.uploaderName?.trim() || file.uploaderEmail?.trim() || null;
}
