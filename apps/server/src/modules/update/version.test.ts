import assert from "node:assert/strict";
import { test } from "node:test";

import { isNewer } from "./version";

test("a higher version wins at every position", () => {
  assert.equal(isNewer("1.2.0", "1.1.0"), true);
  assert.equal(isNewer("2.0.0", "1.9.9"), true);
  assert.equal(isNewer("1.1.1", "1.1.0"), true);
  assert.equal(isNewer("v1.2.0", "1.1.0"), true);
});

test("the same or an older version is never an update", () => {
  assert.equal(isNewer("1.1.0", "1.1.0"), false);
  assert.equal(isNewer("1.0.0", "1.1.0"), false);
  assert.equal(isNewer("1.9.0", "1.10.0"), false);
});

test("a prerelease does not replace the release it precedes", () => {
  assert.equal(isNewer("1.2.0-rc1", "1.2.0"), false);
  assert.equal(isNewer("1.2.0", "1.2.0-rc1"), true);
});
