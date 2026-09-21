#!/usr/bin/env node
/**
 * Signs a brandpack. Vendor side only: the secret key never ships in the image.
 *
 * Usage: node infra/sign-brandpack.js "<organisation>" [issuedAt YYYY-MM-DD]
 *   AMFORA_BRANDPACK_SECRET_FILE  hex Ed25519 secret, defaults to /root/secrets/amfora-brandpack-secret.hex
 *
 * Prints the pack to stdout: base64url(payload) "." base64url(signature).
 * The customer pastes that string in Customization. It never expires.
 */
const crypto = require("node:crypto");
const fs = require("node:fs");

const [organisation, issuedAt = new Date().toISOString().slice(0, 10)] = process.argv.slice(2);

if (!organisation || !organisation.trim()) {
  console.error('usage: sign-brandpack.js "<organisation>" [YYYY-MM-DD]');
  process.exit(2);
}

if (!/^\d{4}-\d{2}-\d{2}$/.test(issuedAt)) {
  console.error(`not a date: ${issuedAt}`);
  process.exit(2);
}

const keyFile = process.env.AMFORA_BRANDPACK_SECRET_FILE || "/root/secrets/amfora-brandpack-secret.hex";
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
  JSON.stringify({ purpose: "amfora-brandpack", organisation: organisation.trim(), issuedAt })
);

const signature = crypto.sign(null, payload, privateKey);
process.stdout.write(`${payload.toString("base64url")}.${signature.toString("base64url")}\n`);
