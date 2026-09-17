import assert from "node:assert/strict";
import test from "node:test";

import { getHomeRedirect } from "./use-home";

test("root waits while authentication is unresolved", () => {
  assert.equal(getHomeRedirect(null), null);
});

test("root sends authenticated users to the dashboard", () => {
  assert.equal(getHomeRedirect(true), "/dashboard");
});

test("root sends anonymous users to login", () => {
  assert.equal(getHomeRedirect(false), "/login");
});
