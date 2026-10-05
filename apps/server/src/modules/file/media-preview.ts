/**
 * Whether a preview request for a file is refused because it would play video or audio
 * in the browser of someone who is not the owner.
 *
 * A download page offers files; it does not stream them. Only preview requests are refused:
 * a download is still a download. The owner previewing their own file in the workspace is
 * never affected.
 */
export interface MediaPreviewInput {
  isPreview: boolean;
  contentType: string;
  isOwner: boolean;
}

export function isPlayableMedia(contentType: string): boolean {
  return /^(video|audio)\//i.test(contentType);
}

export function refusesMediaPreview({ isPreview, contentType, isOwner }: MediaPreviewInput): boolean {
  return isPreview && !isOwner && isPlayableMedia(contentType);
}

export const MEDIA_PREVIEW_REFUSED = "Download pages do not play video or audio.";
