import assert from "node:assert/strict";
import { test } from "node:test";

import { resolvePaidAppearance } from "./appearance";

const stored = { appHideCredit: "true", appCustomCss: ".a{color:red}", backgroundExists: true };

test("without a pack every paid setting is off, whatever is stored", () => {
  assert.deepEqual(resolvePaidAppearance(stored, null), {
    appHideCredit: false,
    appBackground: false,
    appCustomCss: "",
    brandpack: null,
  });
});

test("with a pack the stored settings come through, sanitised", () => {
  const pack = { organisation: "Acme", issuedAt: "2026-09-21" };
  assert.deepEqual(resolvePaidAppearance({ ...stored, appCustomCss: '@import "x";.a{color:red}' }, pack), {
    appHideCredit: true,
    appBackground: true,
    appCustomCss: ".a{color:red}",
    brandpack: pack,
  });
});
