import assert from "node:assert/strict";
import { test } from "node:test";

import { isPubliclyEmbeddable } from "./embed-access";

const now = new Date("2026-09-16T12:00:00Z");
const open = { expiration: null, views: 0, security: { password: null, maxViews: null } };

test("a file that is in no share at all is not embeddable", () => {
  assert.equal(isPubliclyEmbeddable([], now), false);
});

test("a file in an open share is embeddable", () => {
  assert.equal(isPubliclyEmbeddable([open], now), true);
});

test("a password protected share does not make a file embeddable", () => {
  assert.equal(isPubliclyEmbeddable([{ ...open, security: { password: "hash", maxViews: null } }], now), false);
});

test("an expired share does not make a file embeddable", () => {
  const expired = { ...open, expiration: new Date("2026-09-15T12:00:00Z") };
  assert.equal(isPubliclyEmbeddable([expired], now), false);
});

test("a share that has not expired yet still counts", () => {
  const future = { ...open, expiration: new Date("2026-09-17T12:00:00Z") };
  assert.equal(isPubliclyEmbeddable([future], now), true);
});

test("a share at its view limit does not make a file embeddable", () => {
  const spent = { ...open, views: 5, security: { password: null, maxViews: 5 } };
  assert.equal(isPubliclyEmbeddable([spent], now), false);
});

test("a share below its view limit still counts", () => {
  const left = { ...open, views: 4, security: { password: null, maxViews: 5 } };
  assert.equal(isPubliclyEmbeddable([left], now), true);
});

test("one open share is enough even when another is locked", () => {
  const locked = { ...open, security: { password: "hash", maxViews: null } };
  assert.equal(isPubliclyEmbeddable([locked, open], now), true);
});

test("a share with no security row at all counts as open", () => {
  assert.equal(isPubliclyEmbeddable([{ expiration: null, views: 0, security: null }], now), true);
});
