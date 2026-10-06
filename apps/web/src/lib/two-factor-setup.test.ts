import assert from "node:assert/strict";
import { test } from "node:test";

import { isSetupRequiredError, landingFor, safeNext, setupUrl } from "./two-factor-setup";

test("only a 403 with the set up code counts", () => {
  assert.equal(isSetupRequiredError({ response: { status: 403, data: { code: "TWO_FACTOR_SETUP_REQUIRED" } } }), true);
  assert.equal(isSetupRequiredError({ response: { status: 403, data: { error: "Forbidden" } } }), false);
  assert.equal(isSetupRequiredError({ response: { status: 401, data: { code: "TWO_FACTOR_SETUP_REQUIRED" } } }), false);
  assert.equal(isSetupRequiredError(new Error("network")), false);
  assert.equal(isSetupRequiredError(null), false);
});

test("the way back is a path on this site and nothing else", () => {
  assert.equal(safeNext("/files?folder=a"), "/files?folder=a");
  for (const bad of ["https://evil.example", "//evil.example", "/\\evil", "javascript:alert(1)", "", null, undefined]) {
    assert.equal(safeNext(bad), "/dashboard", String(bad));
  }
  for (const bad of [
    "/\t/evil.example",
    "/\n/evil.example",
    "/\r/evil.example",
    "/ /evil.example",
    "/%09/evil.example",
  ]) {
    assert.equal(safeNext(bad), "/dashboard", JSON.stringify(bad));
  }
  assert.equal(safeNext("/two-factor-setup?next=/files"), "/dashboard");
  assert.equal(safeNext("/login"), "/dashboard");
});

test("the set up address carries the way back", () => {
  assert.equal(setupUrl("/files?x=1"), "/two-factor-setup?next=%2Ffiles%3Fx%3D1");
  assert.equal(setupUrl("https://evil.example"), "/two-factor-setup?next=%2Fdashboard");
});

test("a user who must set up lands on the set up page first", () => {
  assert.equal(landingFor({ twoFactorSetupRequired: true }), "/two-factor-setup?next=%2Fdashboard");
  assert.equal(landingFor({ twoFactorSetupRequired: false }), "/dashboard");
  assert.equal(landingFor(null), "/dashboard");
});

test("a user who signed in from a share lands back on it, and only ever on a path of this site", () => {
  assert.equal(landingFor({ twoFactorSetupRequired: false }, "/s/finance-plan"), "/s/finance-plan");
  assert.equal(landingFor(null, "https://evil.example/s/x"), "/dashboard");
  assert.equal(landingFor(null, "//evil.example"), "/dashboard");
  assert.equal(
    landingFor({ twoFactorSetupRequired: true }, "/s/finance-plan"),
    "/two-factor-setup?next=%2Fs%2Ffinance-plan"
  );
});
