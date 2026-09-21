import { verifySigned } from "../update/manifest";

/** A brandpack signed for another purpose (a release manifest, say) is not a brandpack. */
export const BRANDPACK_PURPOSE = "amfora-brandpack";

export interface Brandpack {
  organisation: string;
  issuedAt: string;
}

/**
 * A brandpack is what a paying customer receives: a signed statement that this
 * organisation may run Amfora without the credit and with the paid customization.
 * It never expires and is not bound to a domain; the signature is the whole check.
 */
export function verifyBrandpack(token: string, publicKeyHex: string): Brandpack | null {
  const payload = verifySigned(token, publicKeyHex, BRANDPACK_PURPOSE);
  if (!payload) return null;

  const { organisation, issuedAt } = payload as Partial<Brandpack>;
  if (typeof organisation !== "string" || !organisation.trim()) return null;
  if (typeof issuedAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(issuedAt)) return null;

  return { organisation: organisation.trim(), issuedAt };
}
