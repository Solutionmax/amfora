import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";

import { verifyBrandpack } from "./brandpack";

const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
const publicKeyHex = publicKey.export({ format: "der", type: "spki" }).subarray(12).toString("hex");

function sign(payload: unknown): string {
  const body = Buffer.from(JSON.stringify(payload));
  return `${body.toString("base64url")}.${crypto.sign(null, body, privateKey).toString("base64url")}`;
}

test("a valid pack yields the organisation and the issue date", () => {
  const token = sign({ purpose: "amfora-brandpack", organisation: "Acme B.V.", issuedAt: "2026-09-21" });
  assert.deepEqual(verifyBrandpack(token, publicKeyHex), { organisation: "Acme B.V.", issuedAt: "2026-09-21" });
});

test("a release manifest is not a brandpack, and a tampered or empty pack is nothing", () => {
  assert.equal(
    verifyBrandpack(sign({ purpose: "amfora-release", organisation: "Acme", issuedAt: "2026-09-21" }), publicKeyHex),
    null
  );
  const [, signature] = sign({ purpose: "amfora-brandpack", organisation: "Acme", issuedAt: "2026-09-21" }).split(".");
  const forged = Buffer.from(
    JSON.stringify({ purpose: "amfora-brandpack", organisation: "Evil", issuedAt: "2026-09-21" })
  ).toString("base64url");
  assert.equal(verifyBrandpack(`${forged}.${signature}`, publicKeyHex), null);
  assert.equal(
    verifyBrandpack(sign({ purpose: "amfora-brandpack", organisation: " ", issuedAt: "2026-09-21" }), publicKeyHex),
    null
  );
  assert.equal(verifyBrandpack("garbage", publicKeyHex), null);
  assert.equal(verifyBrandpack("", publicKeyHex), null);
});
