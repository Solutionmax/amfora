import { verifyBrandpack } from "../app/brandpack";
import { BRANDPACK_PUBLIC_KEY } from "../app/brandpack-key";

export const CREDIT = { name: "Amfora", url: "https://amfora.solutionmax.net/" };

/** Mails show "Powered by Amfora" unless a valid brandpack hides the credit: the rule of the public pages. */
export function mailShowsCredit(
  hideCredit: string,
  brandpack: string,
  publicKey: string = BRANDPACK_PUBLIC_KEY
): boolean {
  return !(hideCredit === "true" && !!brandpack && !!verifyBrandpack(brandpack, publicKey));
}
