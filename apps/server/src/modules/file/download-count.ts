/**
 * Decides whether a request for a file's bytes counts as a download.
 *
 * The same route serves real downloads, in-app image previews, and the image that
 * link preview bots fetch for og:image, so a raw request count is not a download
 * count. Only the cases below are excluded; anything else counts, because
 * undercounting a genuine download is worse than the alternatives here.
 */

export interface DownloadCountInput {
  /** Raw `Range` header, if the client sent one. */
  range?: string | null;
  /** Set by our own og:image URL, so an unfurl bot does not inflate the count. */
  isPreview?: boolean;
  /** The file's owner fetching their own file, e.g. checking an upload. */
  isOwner?: boolean;
}

export function shouldCountDownload({ range, isPreview, isOwner }: DownloadCountInput): boolean {
  if (isPreview || isOwner) return false;

  // A player seeking through a video issues one request per seek. Only the request
  // that starts at the first byte represents someone fetching the file.
  if (range && !/^bytes=0-/.test(range.trim())) return false;

  return true;
}
