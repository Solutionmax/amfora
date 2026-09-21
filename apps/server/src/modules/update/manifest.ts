import crypto from "node:crypto";

/**
 * Verifies a signed release manifest.
 *
 * The manifest is `base64url(payload) "." base64url(signature)`, the same shape the
 * other SolutionMAX products use, signed with Ed25519. It is fetched over the public
 * internet, so a valid signature is the only reason to believe a word of it: without
 * one, anyone who can answer for the update host could hand an installation a
 * different image to pull.
 */

/** Guards against a manifest from a sibling product being replayed as an Amfora one. */
const PURPOSE = "amfora-release";

/** An unsigned manifest is worthless, so a malformed one is refused before it is parsed. */
const SPKI_ED25519_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export interface ReleaseManifest {
  purpose: string;
  version: string;
  image: string;
  digest: string;
  notes: string;
  released_at: string;
}

function publicKeyFrom(hex: string): crypto.KeyObject {
  const raw = Buffer.from(hex, "hex");

  if (raw.length !== 32) {
    throw new Error("An Ed25519 public key is 32 bytes, so 64 hex characters");
  }

  return crypto.createPublicKey({
    key: Buffer.concat([SPKI_ED25519_PREFIX, raw]),
    format: "der",
    type: "spki",
  });
}

export function verifyManifest(token: string, publicKeyHex: string): ReleaseManifest | null {
  const parts = token.trim().split(".");

  if (parts.length !== 2) return null;

  const [encodedPayload, encodedSignature] = parts;

  let payload: Buffer;
  let signature: Buffer;
  try {
    payload = Buffer.from(encodedPayload, "base64url");
    signature = Buffer.from(encodedSignature, "base64url");
  } catch {
    return null;
  }

  if (signature.length !== 64) return null;

  let key: crypto.KeyObject;
  try {
    key = publicKeyFrom(publicKeyHex);
  } catch {
    return null;
  }

  if (!crypto.verify(null, payload, key, signature)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload.toString("utf8"));
  } catch {
    return null;
  }

  const manifest = parsed as ReleaseManifest;

  if (!manifest || typeof manifest !== "object") return null;
  if (manifest.purpose !== PURPOSE) return null;
  if (typeof manifest.version !== "string" || !/^\d+\.\d+\.\d+/.test(manifest.version)) return null;
  if (typeof manifest.image !== "string" || !/^[a-z0-9.\-_/]+$/.test(manifest.image)) return null;
  // Pinning by digest is what makes the pull reproducible and the signature meaningful.
  if (typeof manifest.digest !== "string" || !/^sha256:[a-f0-9]{64}$/.test(manifest.digest)) return null;

  return {
    purpose: manifest.purpose,
    version: manifest.version,
    image: manifest.image,
    digest: manifest.digest,
    notes: typeof manifest.notes === "string" ? manifest.notes : "",
    released_at: typeof manifest.released_at === "string" ? manifest.released_at : "",
  };
}
