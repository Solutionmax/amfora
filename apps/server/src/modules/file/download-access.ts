import bcrypt from "bcryptjs";

export interface DownloadShare {
  id: string;
  expiration: Date | null;
  views: number;
  security: { password: string | null; maxViews: number | null } | null;
}

export async function canDownloadFromShares(
  shares: DownloadShare[],
  password?: string,
  admittedViews: Set<string> = new Set(),
  now = new Date()
): Promise<boolean> {
  for (const share of shares) {
    if (share.expiration && share.expiration <= now) continue;
    if (admittedViews.has(share.id)) return true;
    if (share.security?.maxViews != null && share.views >= share.security.maxViews) continue;
    if (!share.security?.password) return true;
    if (password && (await bcrypt.compare(password, share.security.password))) return true;
  }
  return false;
}
