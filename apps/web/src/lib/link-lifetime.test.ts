import assert from "node:assert/strict";
import { test } from "node:test";

import {
  defaultExpiryValue,
  expiryProblem,
  lifetimeSettings,
  lifetimeSettingsProblem,
  maxExpiryValue,
} from "./link-lifetime";

const now = new Date(2026, 9, 5, 10, 0, 0);

test("the settings are read as whole days, missing or odd values mean none", () => {
  const configs = [
    { key: "shareDefaultExpiryDays", value: "7" },
    { key: "shareMaxExpiryDays", value: "30" },
  ];
  assert.deepEqual(lifetimeSettings(configs), { defaultDays: 7, maxDays: 30 });
  assert.deepEqual(lifetimeSettings([]), { defaultDays: 0, maxDays: 0 });
  assert.deepEqual(lifetimeSettings([{ key: "shareMaxExpiryDays", value: "abc" }]), { defaultDays: 0, maxDays: 0 });
});

test("the default end date is the given days ahead, empty when there is no default", () => {
  assert.equal(defaultExpiryValue(7, now), "2026-10-12T10:00");
  assert.equal(defaultExpiryValue(0, now), "");
});

test("the latest allowed end date is the maximum ahead, undefined when there is no maximum", () => {
  assert.equal(maxExpiryValue(30, now), "2026-11-04T10:00");
  assert.equal(maxExpiryValue(0, now), undefined);
});

test("a date past the maximum, or none while a maximum is set, is a problem", () => {
  assert.equal(expiryProblem({ value: "2026-11-04T10:00", maxDays: 30, now }), null);
  assert.equal(expiryProblem({ value: "2026-11-04T10:01", maxDays: 30, now }), "tooLong");
  assert.equal(expiryProblem({ value: "", maxDays: 30, now }), "required");
  assert.equal(expiryProblem({ value: "", maxDays: 0, now }), null);
  assert.equal(expiryProblem({ value: "2030-01-01T10:00", maxDays: 0, now }), null);
});

test("a date that did not change is no problem, also on a link that runs longer already", () => {
  assert.equal(expiryProblem({ value: "2027-01-01T10:00", maxDays: 30, now, unchanged: "2027-01-01T10:00" }), null);
  assert.equal(expiryProblem({ value: "", maxDays: 30, now, unchanged: "" }), null);
});

test("a default longer than the maximum is a problem in the settings", () => {
  assert.equal(lifetimeSettingsProblem(31, 30), "defaultTooLong");
  assert.equal(lifetimeSettingsProblem(30, 30), null);
  assert.equal(lifetimeSettingsProblem(90, 0), null);
});
