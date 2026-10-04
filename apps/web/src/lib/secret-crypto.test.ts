import assert from "node:assert/strict";
import { test } from "node:test";

import { sealSecret, secretOpener } from "./secret-crypto";

test("a sealed text opens with its link key, and only with it", async () => {
  const text = "host: db01\npass: Vq7!mR2x ünïcødé 🔑";
  const sealed = await sealSecret(text);
  assert.equal(sealed.linkKey.length, 43);
  assert.equal(sealed.ciphertext.includes(text), false);

  const opener = await secretOpener(sealed.linkKey);
  assert.equal(opener.verifier, sealed.verifier);
  assert.equal(opener.open(sealed.ciphertext), text);

  const other = await sealSecret(text);
  assert.notEqual(other.linkKey, sealed.linkKey);
  assert.notEqual(other.proof, sealed.proof);
  assert.notEqual(sealed.proof, sealed.verifier);
  assert.notEqual(other.ciphertext, sealed.ciphertext);
  assert.throws(() => opener.open(other.ciphertext));
});

test("a passphrase changes both the verifier and the key", async () => {
  const sealed = await sealSecret("secret", "correct horse");

  const right = await secretOpener(sealed.linkKey, "correct horse");
  assert.equal(right.verifier, sealed.verifier);
  assert.equal(right.open(sealed.ciphertext), "secret");

  for (const guess of ["", "Correct horse"]) {
    const wrong = await secretOpener(sealed.linkKey, guess);
    assert.notEqual(wrong.verifier, sealed.verifier);
    assert.equal(wrong.proof, sealed.proof, "the proof depends on the link alone");
    assert.throws(() => wrong.open(sealed.ciphertext));
  }
});

test("a damaged link or a changed ciphertext is refused", async () => {
  const sealed = await sealSecret("secret");
  await assert.rejects(secretOpener(sealed.linkKey.slice(0, 20)), /incomplete/);
  await assert.rejects(secretOpener("not base64url!"));

  const opener = await secretOpener(sealed.linkKey);
  // The first character: the last one of unpadded base64 carries bits that decode to nothing.
  const flipped = (sealed.ciphertext.startsWith("A") ? "B" : "A") + sealed.ciphertext.slice(1);
  assert.throws(() => opener.open(flipped));
});
