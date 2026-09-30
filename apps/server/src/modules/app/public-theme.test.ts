import assert from "node:assert/strict";
import { test } from "node:test";

import { assertPublicTheme, normalizePublicTheme } from "./public-theme";

test("known themes pass through", () => {
  assert.equal(normalizePublicTheme("workbench"), "workbench");
  assert.equal(normalizePublicTheme("seal"), "seal");
});

test("missing or unknown values fall back to stage", () => {
  assert.equal(normalizePublicTheme(""), "stage");
  assert.equal(normalizePublicTheme(undefined), "stage");
  assert.equal(normalizePublicTheme("<script>"), "stage");
});

test("saving refuses anything outside the list", () => {
  assert.doesNotThrow(() => assertPublicTheme("seal"));
  assert.throws(() => assertPublicTheme("dark"), /appPublicTheme must be one of/);
});
