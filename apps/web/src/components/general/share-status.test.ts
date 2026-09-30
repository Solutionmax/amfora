import assert from "node:assert/strict";
import { test } from "node:test";

import { linkStatus } from "./share-status";

test("link status follows the same rules as the old tags", () => {
  assert.equal(linkStatus({ expiration: null }), "neverExpires");
  assert.equal(linkStatus({ expiration: new Date(Date.now() + 86_400_000).toISOString() }), "active");
  assert.equal(linkStatus({ expiration: new Date(Date.now() - 1000).toISOString() }), "expired");
  assert.equal(linkStatus({ expiration: null, isActive: false }), "inactive");
});
