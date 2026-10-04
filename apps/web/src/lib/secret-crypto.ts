// The noble packages only export their modules with the .js suffix.
/* eslint-disable import/extensions */
import { gcm } from "@noble/ciphers/aes.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";

/* eslint-enable import/extensions */

/**
 * Sealing and opening of secrets, entirely in the browser.
 *
 * The link key is random and lives only in the link fragment, which a browser never sends to
 * a server. From it come three values. The proof, from the link key alone, tells the server
 * that a caller holds the link and not just the id. The seal key and the verifier also take
 * the passphrase, when there is one: the text is encrypted with the first, and the second
 * lets the server count wrong passphrases. The server stores hashes of proof and verifier,
 * and never sees the link key, the passphrase or the text.
 *
 * Plain JavaScript on purpose: `crypto.subtle` does not exist on a page served over plain
 * HTTP, which is how many people run this on their own network.
 */

const KEY_BYTES = 32;
const NONCE_BYTES = 12;
/** A wrong passphrase costs the server-side tries first; this slows guessing after a database leak. */
const PASSPHRASE_ITERATIONS = 100_000;

const SEAL_INFO = "amfora secret seal v1";
const OPEN_INFO = "amfora secret open v1";
const LINK_INFO = "amfora secret link v1";

const utf8 = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new Error("Not base64url");
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function derive(linkKey: Uint8Array, passphrase: string) {
  const stretched = passphrase
    ? await pbkdf2Async(sha256, utf8.encode(passphrase.normalize("NFKC")), linkKey, {
        c: PASSPHRASE_ITERATIONS,
        dkLen: KEY_BYTES,
      })
    : new Uint8Array(0);
  const master = new Uint8Array([...linkKey, ...stretched]);
  return {
    sealKey: hkdf(sha256, master, undefined, utf8.encode(SEAL_INFO), KEY_BYTES),
    proof: toBase64Url(hkdf(sha256, linkKey, undefined, utf8.encode(LINK_INFO), KEY_BYTES)),
    verifier: toBase64Url(hkdf(sha256, master, undefined, utf8.encode(OPEN_INFO), KEY_BYTES)),
  };
}

export interface SealedSecret {
  /** Goes in the link fragment. Never send it anywhere. */
  linkKey: string;
  /** What the server stores. */
  ciphertext: string;
  /** Shows the server that a caller holds the link. */
  proof: string;
  /** Shows the server that a caller also knows the passphrase. */
  verifier: string;
}

export async function sealSecret(text: string, passphrase = ""): Promise<SealedSecret> {
  const linkKey = crypto.getRandomValues(new Uint8Array(KEY_BYTES));
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
  const { sealKey, proof, verifier } = await derive(linkKey, passphrase);
  const sealed = gcm(sealKey, nonce).encrypt(utf8.encode(text));
  return {
    linkKey: toBase64Url(linkKey),
    ciphertext: toBase64Url(new Uint8Array([...nonce, ...sealed])),
    proof,
    verifier,
  };
}

export interface SecretOpener {
  proof: string;
  verifier: string;
  /** Throws when the ciphertext was not sealed with this link and passphrase. */
  open: (ciphertext: string) => string;
}

/** Throws when the link key is damaged, for example a link that lost its last characters. */
export async function secretOpener(linkKey: string, passphrase = ""): Promise<SecretOpener> {
  const key = fromBase64Url(linkKey);
  if (key.length !== KEY_BYTES) throw new Error("The link is incomplete");
  const { sealKey, proof, verifier } = await derive(key, passphrase);
  return {
    proof,
    verifier,
    open: (ciphertext) => {
      const bytes = fromBase64Url(ciphertext);
      const text = gcm(sealKey, bytes.slice(0, NONCE_BYTES)).decrypt(bytes.slice(NONCE_BYTES));
      return new TextDecoder("utf-8", { fatal: true }).decode(text);
    },
  };
}
