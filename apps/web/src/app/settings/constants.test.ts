import assert from "node:assert/strict";
import { test } from "node:test";

import { blocksFor } from "./constants";

test("places known keys in their blocks and pairs", () => {
  const blocks = blocksFor("security", [
    "maxLoginAttempts",
    "loginBlockDuration",
    "passwordMinLength",
    "passwordResetTokenExpiration",
    "passwordAuthEnabled",
  ]);

  assert.deepEqual(
    blocks.map((block) => block.id),
    ["signingIn", "bruteForce"]
  );
  assert.deepEqual(blocks[0].rows, ["passwordAuthEnabled", ["passwordMinLength", "passwordResetTokenExpiration"]]);
});

test("a pair with one missing key becomes a single row", () => {
  const blocks = blocksFor("email", ["smtpEnabled", "smtpHost"]);

  assert.deepEqual(blocks[0].rows, ["smtpEnabled", "smtpHost"]);
});

test("unknown keys land in a closing more block, empty blocks disappear", () => {
  const blocks = blocksFor("general", ["hideVersion", "somethingNew"]);

  assert.deepEqual(
    blocks.map((block) => block.id),
    ["behaviour", "more"]
  );
  assert.deepEqual(blocks[1].rows, ["somethingNew"]);
});

test("unknown group puts everything in more", () => {
  assert.deepEqual(blocksFor("other", ["a", "b"]), [{ id: "more", rows: ["a", "b"] }]);
});
