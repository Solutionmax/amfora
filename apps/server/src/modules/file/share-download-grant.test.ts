import assert from "node:assert/strict";
import { test } from "node:test";

import { shareGrantSubject } from "./share-download-grant";

test("download cookie subject hides password hashes and changes with security settings", () => {
  const share = {
    id: "fixture",
    views: 0,
    expiration: null,
    security: { password: "$2a$synthetic-private-hash", maxViews: 1 },
  };
  const subject = shareGrantSubject(share);
  assert.match(subject, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(subject, /synthetic-private-hash/);
  assert.notEqual(shareGrantSubject({ ...share, security: { ...share.security, maxViews: 2 } }), subject);
});
