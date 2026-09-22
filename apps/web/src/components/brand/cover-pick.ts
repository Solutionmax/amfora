import { getFileType } from "@/utils/file-types";
import type { FileKind } from "./file-kind";

export interface CoverFile {
  name: string;
  kind: FileKind;
}

export type CoverView = { kind: "image"; src: string; file: CoverFile } | { kind: "gradient"; file: CoverFile };

/**
 * The panel opens with the first file's name over one fixed picture: the cover the admin
 * uploaded, or the accent gradient. A file from the share is never the cover; its bytes
 * stay behind the download button.
 */
export function pickCover(files: CoverFile[], coverSrc?: string | null): CoverView | null {
  const [first] = files;
  if (!first) return null;
  return coverSrc ? { kind: "image", src: coverSrc, file: first } : { kind: "gradient", file: first };
}

/** Video and audio are what the playback switch is about; everything else keeps its preview. */
export function isPlayable(fileName: string): boolean {
  const type = getFileType(fileName);
  return type === "video" || type === "audio";
}

/** Whether a download page may open the preview for this file. */
export function canPreviewOnDownloadPage(fileName: string, playbackEnabled: boolean): boolean {
  return playbackEnabled || !isPlayable(fileName);
}

/** The cover image URL for the page, versioned so a replaced cover is not served from cache. */
export function coverImageSrc(cover: { version: string } | null | undefined): string | null {
  return cover ? `/api/app/share-cover?v=${encodeURIComponent(cover.version)}` : null;
}
