import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";

const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
const ownKeyHex = publicKey.export({ format: "der", type: "spki" }).subarray(12).toString("hex");

function sign(payload: unknown): string {
  const body = Buffer.from(JSON.stringify(payload));
  return `${body.toString("base64url")}.${crypto.sign(null, body, privateKey).toString("base64url")}`;
}

const selfSigned = sign({ purpose: "amfora-brandpack", organisation: "Not a customer", issuedAt: "2026-09-22" });

// Set before anything is imported, the way an operator would set it in the container.
process.env.AMFORA_BRANDPACK_PUBLIC_KEY = ownKeyHex;

test("the brandpack key is built in and an env variable of the old name has no effect", async () => {
  const { BRANDPACK_PUBLIC_KEY } = await import("./brandpack-key");
  const { verifyBrandpack } = await import("./brandpack");
  const { env } = await import("../../env");

  assert.equal(BRANDPACK_PUBLIC_KEY, "a329bd6b2d08bb001a5f5cd9f1aa7559efe82ae594416a4cfc16a69f501ca756");
  assert.equal((env as Record<string, unknown>).AMFORA_BRANDPACK_PUBLIC_KEY, undefined);
  assert.equal(verifyBrandpack(selfSigned), null);
});

test("the app service refuses a pack signed with a key from the environment", async () => {
  const { AppService } = await import("./service");
  await assert.rejects(new AppService().activateBrandpack(selfSigned), /does not verify/);
});

test("tests can still inject their own key through the parameter", async () => {
  const { verifyBrandpack } = await import("./brandpack");
  assert.deepEqual(verifyBrandpack(selfSigned, ownKeyHex), { organisation: "Not a customer", issuedAt: "2026-09-22" });
});
