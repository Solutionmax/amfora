import assert from "node:assert/strict";
import test from "node:test";

import { digitsOnly, groupKey, isMobileAgent, nameInitials } from "./utils";

test("groupKey splits the manual key in groups of four", () => {
  assert.equal(groupKey("JBSWY3DPEHPK3PXP"), "JBSW Y3DP EHPK 3PXP");
  assert.equal(groupKey("JBSW Y3DP EH"), "JBSW Y3DP EH");
});

test("digitsOnly drops everything but digits and caps the length", () => {
  assert.equal(digitsOnly("12a 34-567"), "123456");
  assert.equal(digitsOnly("abc"), "");
});

test("isMobileAgent recognises phones and falls back to desktop", () => {
  assert.equal(isMobileAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"), true);
  assert.equal(isMobileAgent("Mozilla/5.0 (Linux; Android 14) Mobile"), true);
  assert.equal(isMobileAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Chrome/120"), false);
  assert.equal(isMobileAgent(null), false);
});

test("nameInitials uses first and last name, with a fallback", () => {
  assert.equal(nameInitials("raymon", "admin"), "RA");
  assert.equal(nameInitials("Anita", ""), "A");
  assert.equal(nameInitials(" ", undefined), "?");
});
