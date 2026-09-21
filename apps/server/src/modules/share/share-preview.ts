/**
 * Picks the file a link preview (Open Graph) may show for a public share.
 *
 * Unfurl bots are anonymous: whatever this returns is fetched by Slack, WhatsApp
 * and friends without a password prompt, and rendered in whatever channel the link
 * was pasted into. So this only ever returns a file that anonymous visitors could
 * already download from the share page itself.
 */

const PREVIEWABLE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp"]);

/** Above this, platforms drop the preview anyway, and we would be streaming it for nothing. */
const MAX_PREVIEW_BYTES = 5 * 1024 * 1024;

export interface PreviewCandidateFile {
  objectName: string;
  extension?: string | null;
  size?: bigint | number | string | null;
}

export interface PreviewCandidateShare {
  expiration?: Date | string | null;
  views?: number | null;
  security?: { password?: string | null; maxViews?: number | null } | null;
  files?: PreviewCandidateFile[] | null;
  folders?: unknown[] | null;
}

function toBytes(size: PreviewCandidateFile["size"]): number | null {
  if (size === null || size === undefined) return null;
  const n = typeof size === "bigint" ? Number(size) : Number(size);
  return Number.isFinite(n) ? n : null;
}

export function pickPreviewObjectName(share: PreviewCandidateShare, now = new Date()): string | null {
  // A password means the content is not meant for whoever merely holds the link.
  if (share.security?.password) return null;

  // maxViews shares are metered; an unfurl bot must not spend one of the owner's views.
  if (share.security?.maxViews !== null && share.security?.maxViews !== undefined) return null;

  if (share.expiration && new Date(share.expiration) <= now) return null;

  if (share.folders?.length) return null;

  const files = share.files ?? [];
  if (files.length !== 1) return null;

  const [file] = files;
  if (!file?.objectName) return null;

  const extension = (file.extension ?? "").replace(/^\./, "").toLowerCase();
  if (!PREVIEWABLE_EXTENSIONS.has(extension)) return null;

  const bytes = toBytes(file.size);
  if (bytes === null || bytes > MAX_PREVIEW_BYTES) return null;

  return file.objectName;
}
