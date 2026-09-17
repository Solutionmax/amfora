import assert from "node:assert/strict";
import { test } from "node:test";

import { canDownloadFromShares } from "./download-access";

const now = new Date("2026-09-17T12:00:00Z");
const share = { id: "share", expiration: null, views: 0, security: { password: null, maxViews: null } };
test("expired and exhausted links cannot authorize direct downloads", async () => {
  assert.equal(
    await canDownloadFromShares([{ ...share, expiration: new Date(now.getTime() - 1) }], undefined, new Set(), now),
    false
  );
  assert.equal(
    await canDownloadFromShares(
      [{ ...share, views: 1, security: { password: null, maxViews: 1 } }],
      undefined,
      new Set(),
      now
    ),
    false
  );
});
test("an admitted view can finish downloading, but never after expiry", async () => {
  const capped = { ...share, views: 1, security: { password: null, maxViews: 1 } };
  assert.equal(await canDownloadFromShares([capped], undefined, new Set(["share"]), now), true);
  assert.equal(
    await canDownloadFromShares(
      [{ ...capped, expiration: new Date(now.getTime() - 1) }],
      undefined,
      new Set(["share"]),
      now
    ),
    false
  );
});
test("unshared and protected files remain private; a valid separate public share authorizes", async () => {
  assert.equal(await canDownloadFromShares([], undefined, new Set(), now), false);
  assert.equal(
    await canDownloadFromShares(
      [{ ...share, security: { password: "hash", maxViews: null } }],
      undefined,
      new Set(),
      now
    ),
    false
  );
  assert.equal(
    await canDownloadFromShares(
      [
        { ...share, expiration: new Date(0) },
        { ...share, id: "public" },
      ],
      undefined,
      new Set(),
      now
    ),
    true
  );
});
