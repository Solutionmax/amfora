import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizePublicTheme } from "./public-theme";

test("the web app falls back to stage like the server does", () => {
  assert.equal(normalizePublicTheme("seal"), "seal");
  assert.equal(normalizePublicTheme(undefined), "stage");
  assert.equal(normalizePublicTheme("nope"), "stage");
});
