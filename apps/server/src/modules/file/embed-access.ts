/**
 * Whether a file may be streamed by the public, unauthenticated embed endpoint.
 *
 * Embedding exposes the file to anyone who knows its id, so it may only ever cover files
 * that are already reachable by anyone holding a share link: part of a share with no
 * password, not past its expiry date, and not over its view limit. A file that was never
 * shared, or that sits behind a password, must stay unreachable here.
 */
export interface EmbeddableShare {
  groupId?: string | null;
  expiration: Date | null;
  views: number;
  security: { password: string | null; maxViews: number | null } | null;
}

export function isPubliclyEmbeddable(shares: EmbeddableShare[], now: Date = new Date()): boolean {
  return shares.some((share) => {
    // The embed endpoint knows nobody, so a share limited to a group is never embedded.
    if (share.groupId) return false;
    if (share.security?.password) return false;
    if (share.expiration && share.expiration < now) return false;
    if (share.security?.maxViews != null && share.views >= share.security.maxViews) return false;
    return true;
  });
}
