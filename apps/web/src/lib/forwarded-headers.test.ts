import assert from "node:assert/strict";
import { test } from "node:test";

import { firstForwardedValue, forwardedProtocol } from "./forwarded-headers";

test("takes the first value out of a proxy chain", () => {
  assert.equal(firstForwardedValue("https,http"), "https");
  assert.equal(firstForwardedValue("example.com, inner.local"), "example.com");
});

test("passes a single value through unchanged", () => {
  assert.equal(firstForwardedValue("example.com"), "example.com");
});

test("treats a missing or empty header as absent", () => {
  assert.equal(firstForwardedValue(null), undefined);
  assert.equal(firstForwardedValue(undefined), undefined);
  assert.equal(firstForwardedValue(""), undefined);
  assert.equal(firstForwardedValue(" , "), undefined);
});

test("accepts only a real protocol, otherwise falls back", () => {
  assert.equal(forwardedProtocol("https,http", "http"), "https");
  assert.equal(forwardedProtocol("http", "https"), "http");
  assert.equal(forwardedProtocol("ftp", "https"), "https");
  assert.equal(forwardedProtocol("javascript:", "https"), "https");
  assert.equal(forwardedProtocol(null, "http"), "http");
});
