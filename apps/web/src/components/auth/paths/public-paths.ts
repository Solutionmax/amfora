export const publicPaths = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/auth/oidc/callback",
  "/register-with-invite",
  "/s/",
  "/r/",
  // Reading a secret.
  "/x/",
];

/** Public only as the whole path: "/secret" must not open "/secrets" as well. The page itself checks the setting. */
const publicExactPaths = ["/secret"];

export function isPublicPath(pathname: string): boolean {
  return publicExactPaths.includes(pathname) || publicPaths.some((path) => pathname.startsWith(path));
}
