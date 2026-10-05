import { getFileType } from "@/utils/file-types";

/** Video and audio: a download page offers them, it does not play them. */
export function isPlayable(fileName: string): boolean {
  const type = getFileType(fileName);
  return type === "video" || type === "audio";
}

/** Whether a download page may open the preview for this file. */
export function canPreviewOnDownloadPage(fileName: string): boolean {
  return !isPlayable(fileName);
}

/** The cover image URL for the page, versioned so a replaced cover is not served from cache. */
export function coverImageSrc(cover: { version: string } | null | undefined): string | null {
  return cover ? `/api/app/share-cover?v=${encodeURIComponent(cover.version)}` : null;
}
