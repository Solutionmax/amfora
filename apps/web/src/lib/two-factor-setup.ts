/** The page a user is sent to while the installation asks for a second step and they have none. */
export const SETUP_PAGE = "/two-factor-setup";

/** The code the server answers with (status 403) to everything but the set up path. */
export const SETUP_REQUIRED_CODE = "TWO_FACTOR_SETUP_REQUIRED";

export function isSetupRequiredError(error: unknown): boolean {
  const response = (error as { response?: { status?: number; data?: { code?: unknown } } } | null)?.response;
  return response?.status === 403 && response.data?.code === SETUP_REQUIRED_CODE;
}

function decodeOnce(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isLocalPath(value: string): boolean {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return false;
  // Tab, line feed and carriage return are dropped by URL parsers: "/<TAB>/x" would become "//x".
  if (/[\u0000-\u001f\u007f\s]/.test(value)) return false;
  const origin = "http://amfora.invalid";
  return new URL(value, origin).origin === origin;
}

/** Only a path on this site, never the set up page itself or the sign in page: no open redirect, no loop. */
export function safeNext(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || !isLocalPath(value) || !isLocalPath(decodeOnce(value).replace(/ /g, "+"))) return fallback;
  if (value.startsWith(SETUP_PAGE) || value.startsWith("/login")) return fallback;
  return value;
}

/** The set up page, remembering where the user was going. */
export function setupUrl(next: string): string {
  return `${SETUP_PAGE}?next=${encodeURIComponent(safeNext(next))}`;
}

/** Where a freshly signed in user goes first. */
export function landingFor(user: { twoFactorSetupRequired?: boolean } | null | undefined): string {
  return user?.twoFactorSetupRequired ? setupUrl("/dashboard") : "/dashboard";
}
