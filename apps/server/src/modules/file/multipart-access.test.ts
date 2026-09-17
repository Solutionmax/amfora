import assert from "node:assert/strict";
import { test } from "node:test";

import { isOwnedMultipartObject } from "./multipart-access";

test("multipart object ownership is bound to the authenticated user's prefix", () => {
  assert.equal(isOwnedMultipartObject("user-a", "user-a/123-file.bin"), true);
  assert.equal(isOwnedMultipartObject("user-a", "user-b/123-file.bin"), false);
  assert.equal(isOwnedMultipartObject("user-a", "user-a2/123-file.bin"), false);
  assert.equal(isOwnedMultipartObject("user-a", "user-a/../user-b/file.bin"), false);
  assert.equal(isOwnedMultipartObject("", "user-a/123-file.bin"), false);
});
