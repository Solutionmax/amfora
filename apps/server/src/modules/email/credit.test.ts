import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";

import { mailShowsCredit } from "./credit";
import { noticeMessage } from "./notice";

const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
const publicKeyHex = publicKey.export({ format: "der", type: "spki" }).subarray(12).toString("hex");

function pack(): string {
  const body = Buffer.from(
    JSON.stringify({ purpose: "amfora-brandpack", organisation: "Acme B.V.", issuedAt: "2026-09-21" })
  );
  return `${body.toString("base64url")}.${crypto.sign(null, body, privateKey).toString("base64url")}`;
}

const notice = { subject: "Hello", title: "Hello", text: "A line.", footer: "A footer." };

test("a mail shows the credit unless a valid brandpack hides it", () => {
  assert.equal(mailShowsCredit("", "", publicKeyHex), true);
  assert.equal(mailShowsCredit("true", "", publicKeyHex), true, "the switch alone is not enough");
  assert.equal(mailShowsCredit("true", "garbage", publicKeyHex), true, "a pack that does not verify is no pack");
  assert.equal(mailShowsCredit("false", pack(), publicKeyHex), true, "a pack without the switch keeps the credit");
  assert.equal(mailShowsCredit("true", pack(), publicKeyHex), false);
});

test("the credit is one quiet line under the card, in the html and in the text", () => {
  const withCredit = noticeMessage(notice, { appName: "Acme", credit: true });
  assert.match(withCredit.html, /Powered by <a href="https:\/\/amfora\.solutionmax\.net\/"[^>]*>Amfora<\/a>/);
  assert.ok(withCredit.text.endsWith("Powered by Amfora: https://amfora.solutionmax.net/"));

  const without = noticeMessage(notice, { appName: "Acme" });
  assert.ok(!without.html.includes("Powered by"));
  assert.ok(!without.text.includes("Powered by"));
});
