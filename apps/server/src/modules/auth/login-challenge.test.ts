import assert from "node:assert/strict";
import { test } from "node:test";

import { validLoginChallenge } from "./login-challenge";

const challenge = { userId: "alice", fingerprint: "current", expiresAt: new Date(Date.now() + 60000), attempts: 0 };
test("2FA requires a live password-stage challenge bound to this user and credentials", () => {
  assert.equal(validLoginChallenge(null, "alice", "current"), false);
  assert.equal(validLoginChallenge(challenge, "bob", "current"), false);
  assert.equal(validLoginChallenge(challenge, "alice", "changed"), false);
  assert.equal(validLoginChallenge({ ...challenge, expiresAt: new Date(0) }, "alice", "current"), false);
  assert.equal(validLoginChallenge({ ...challenge, attempts: 5 }, "alice", "current"), false);
  assert.equal(validLoginChallenge(challenge, "alice", "current"), true);
});
