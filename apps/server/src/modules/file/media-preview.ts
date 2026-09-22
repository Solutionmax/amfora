/**
 * Whether a preview request for a file is refused because it would play video or audio
 * in the browser of someone who is not the owner.
 *
 * A download page offers files; whether it also plays them is the administrator's choice
 * (`appSharePlayback`, off by default). Only preview requests are refused: a download is
 * still a download. The owner previewing their own file in the workspace is never affected.
 */
export interface MediaPreviewInput {
  isPreview: boolean;
  contentType: string;
  isOwner: boolean;
  playbackEnabled: boolean;
}

export function isPlayableMedia(contentType: string): boolean {
  return /^(video|audio)\//i.test(contentType);
}

export function refusesMediaPreview({ isPreview, contentType, isOwner, playbackEnabled }: MediaPreviewInput): boolean {
  return isPreview && !isOwner && !playbackEnabled && isPlayableMedia(contentType);
}

export const MEDIA_PREVIEW_REFUSED = "Playing video and audio on download pages is switched off.";
