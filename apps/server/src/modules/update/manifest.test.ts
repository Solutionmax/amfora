import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";

import { verifyManifest } from "./manifest";

const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
const publicKeyHex = publicKey.export({ format: "der", type: "spki" }).subarray(12).toString("hex");
const otherKey = crypto.generateKeyPairSync("ed25519").privateKey;

const release = {
  purpose: "amfora-release",
  version: "1.2.0",
  image: "ghcr.io/solutionmax/amfora",
  digest: `sha256:${"a".repeat(64)}`,
  notes: "Download counter",
  released_at: "2026-09-21",
};

function sign(payload: unknown, key = privateKey): string {
  const body = Buffer.from(JSON.stringify(payload));
  return `${body.toString("base64url")}.${crypto.sign(null, body, key).toString("base64url")}`;
}

test("a manifest signed with our key is accepted", () => {
  assert.deepEqual(verifyManifest(sign(release), publicKeyHex), release);
  assert.deepEqual(verifyManifest(` ${sign(release)}\n`, publicKeyHex), release);
});

test("nothing unsigned, wrongly signed or tampered with gets through", () => {
  assert.equal(verifyManifest(sign(release, otherKey), publicKeyHex), null, "signed with another key");

  const [payload, signature] = sign(release).split(".");
  const swapped = Buffer.from(JSON.stringify({ ...release, digest: `sha256:${"b".repeat(64)}` })).toString("base64url");
  assert.equal(verifyManifest(`${swapped}.${signature}`, publicKeyHex), null, "payload swapped");
  assert.equal(verifyManifest(payload, publicKeyHex), null, "signature missing");
  assert.equal(verifyManifest(`${payload}.`, publicKeyHex), null, "signature empty");
  assert.equal(verifyManifest("not a manifest", publicKeyHex), null);
  assert.equal(verifyManifest(sign(release), "deadbeef"), null, "public key the wrong length");
});

test("a manifest for another product cannot be replayed as an Amfora release", () => {
  assert.equal(verifyManifest(sign({ ...release, purpose: "pharos-release" }), publicKeyHex), null);
});

test("a manifest missing a usable version, image or digest is refused", () => {
  assert.equal(verifyManifest(sign({ ...release, version: "latest" }), publicKeyHex), null);
  assert.equal(verifyManifest(sign({ ...release, digest: "sha256:short" }), publicKeyHex), null);
  assert.equal(verifyManifest(sign({ ...release, image: "ghcr.io/x;rm -rf /" }), publicKeyHex), null);
});
