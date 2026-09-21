#!/usr/bin/env node
/**
 * Signs a release manifest. Vendor side only: the secret key never ships in the image.
 *
 * Usage: node infra/sign-release.js <version> <image> <digest> [notes]
 *   AMFORA_RELEASE_SECRET_FILE  hex Ed25519 secret, defaults to /root/secrets/amfora-release-secret.hex
 *
 * Prints the manifest to stdout: base64url(payload) "." base64url(signature)
 */
const crypto = require("node:crypto");
const fs = require("node:fs");

const [version, image, digest, notes = ""] = process.argv.slice(2);

if (!version || !image || !digest) {
  console.error("usage: sign-release.js <version> <image> <digest> [notes]");
  process.exit(2);
}

if (!/^sha256:[a-f0-9]{64}$/.test(digest)) {
  console.error(`not an image digest: ${digest}`);
  process.exit(2);
}

const keyFile = process.env.AMFORA_RELEASE_SECRET_FILE || "/root/secrets/amfora-release-secret.hex";
const secret = Buffer.from(fs.readFileSync(keyFile, "utf8").trim(), "hex");

if (secret.length !== 64) {
  console.error(`${keyFile} should hold a 64 byte (128 hex character) secret key`);
  process.exit(2);
}

// A libsodium secret key is seed || public; Node wants the seed as a PKCS8 private key.
const privateKey = crypto.createPrivateKey({
  key: Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), secret.subarray(0, 32)]),
  format: "der",
  type: "pkcs8",
});

const payload = Buffer.from(
  JSON.stringify({
    purpose: "amfora-release",
    version: version.replace(/^v/, ""),
    image,
    digest,
    notes,
    released_at: new Date().toISOString().slice(0, 10),
  })
);

const signature = crypto.sign(null, payload, privateKey);
process.stdout.write(`${payload.toString("base64url")}.${signature.toString("base64url")}\n`);
