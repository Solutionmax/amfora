import { nanoid } from "nanoid";

export function generateSafeFileName(originalName: string): string {
  const extension = originalName.split(".").pop() || "";
  const safeId = nanoid().replace(/[-_]/g, "").slice(0, 12);

  return `${safeId}.${extension}`;
}

/**
 * Intelligently truncates a filename while preserving the extension when possible
 * @param fileName - Filename to truncate
 * @param maxLength - Maximum length of the name (default: 40)
 * @returns Truncated filename
 */
export function truncateFileName(fileName: string, maxLength: number = 40): string {
  if (fileName.length <= maxLength) return fileName;

  const lastDotIndex = fileName.lastIndexOf(".");

  if (lastDotIndex > 0 && lastDotIndex > fileName.length - 10) {
    const name = fileName.substring(0, lastDotIndex);
    const extension = fileName.substring(lastDotIndex);
    const availableLength = maxLength - extension.length - 3;

    if (availableLength > 0) {
      return `${name.substring(0, availableLength)}...${extension}`;
    }
  }

  const halfLength = Math.floor((maxLength - 3) / 2);
  return `${fileName.substring(0, halfLength)}...${fileName.substring(fileName.length - halfLength)}`;
}
