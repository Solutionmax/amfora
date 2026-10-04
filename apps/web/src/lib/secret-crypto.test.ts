import assert from "node:assert/strict";
import { test } from "node:test";

import { sealSecret, sealSecretWith, secretOpener } from "./secret-crypto";

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

// The same numbers stand in docs/SECRETS.md, checked against a second implementation
// (Python, cryptography). A change here breaks every other client and every stored secret.
test("fixed vectors: the format other implementations must match", async () => {
  const key = Uint8Array.from({ length: 32 }, (_, i) => i);
  const nonce = Uint8Array.from({ length: 12 }, (_, i) => 0xa0 + i);
  const text = "correct horse battery staple";

  assert.deepEqual(await sealSecretWith(key, nonce, text), {
    linkKey: "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8",
    ciphertext: "oKGio6SlpqeoqaqrrTsMkL0otDO9_ALWzXJqEUf-4FiIWrxOSQj4inqkxK786onBNqeHPggRtT0",
    proof: "85rt_VP8VFLKanVz6SPmQBNSD4RI9MKaQYN6RA2BhXE",
    verifier: "UCKs6tYJgWyoxcqQZV5bwmNX6LaFnehl92JAcoqvs8o",
  });
  assert.deepEqual(await sealSecretWith(key, nonce, text, "tr0ub4dor&3"), {
    linkKey: "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8",
    ciphertext: "oKGio6SlpqeoqaqrgPSx4UlJ-ZW29TL68Tl9ONWXl1cIsL72UY4RHo2wCZhXFjXghagWmw7x-Q8",
    proof: "85rt_VP8VFLKanVz6SPmQBNSD4RI9MKaQYN6RA2BhXE",
    verifier: "DzZtEhjlHA7MBvRBtFSDGeNxMX0SrJCfWRBBulFllRI",
  });
  await assert.rejects(sealSecretWith(key.slice(1), nonce, text), /length/);
});
