import { getCanonicalOrigin } from "../../shared/canonical-origin";

export interface RelyingParty {
  /** The origin a ceremony must have happened on: the canonical origin, never a request header. */
  origin: string;
  /** The host name of that origin. */
  rpID: string;
}

export const PASSKEYS_UNAVAILABLE = "Passkeys need an https address or localhost. Set APP_URL accordingly.";

/** Null when browsers would refuse passkeys on this installation (no https and not localhost). */
export function relyingParty(): RelyingParty | null {
  try {
    const url = new URL(getCanonicalOrigin());
    if (url.protocol !== "https:" && url.hostname !== "localhost") return null;
    return { origin: url.origin, rpID: url.hostname };
  } catch {
    return null;
  }
}
