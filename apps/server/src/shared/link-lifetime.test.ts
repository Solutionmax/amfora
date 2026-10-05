import assert from "node:assert/strict";
import { test } from "node:test";

import { checkLinkLifetime, lifetimeSettingsError } from "./link-lifetime";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-05T10:00:00Z");
const inDays = (days: number) => new Date(now.getTime() + days * DAY);
const check = (requested: Date | null, maxDays: number, current?: Date | null) =>
  checkLinkLifetime({ requested, now, maxDays, current });

test("without a maximum everything is allowed", () => {
  assert.deepEqual(check(null, 0), { ok: true });
  assert.deepEqual(check(inDays(900), 0), { ok: true });
});

test("a date inside the maximum is allowed, also exactly at the maximum", () => {
  assert.deepEqual(check(inDays(10), 30), { ok: true });
  assert.deepEqual(check(inDays(30), 30), { ok: true });
});

test("a date past the maximum is refused with the number of days", () => {
  const result = check(new Date(inDays(30).getTime() + 1), 30);
  assert.equal(result.ok, false);
  assert.match(result.ok ? "" : result.reason, /30 days/);
});

test("no end date is refused while a maximum is set", () => {
  const result = check(null, 30);
  assert.equal(result.ok, false);
  assert.match(result.ok ? "" : result.reason, /30 days/);
});

test("an end date that did not change is allowed, however long the link runs", () => {
  assert.deepEqual(check(inDays(90), 30, inDays(90)), { ok: true });
  assert.deepEqual(check(null, 30, null), { ok: true });
});

test("an end date the form sent back at minute precision counts as unchanged", () => {
  const current = new Date(inDays(90).getTime() + 37_000);
  const sentBack = new Date(Math.floor(current.getTime() / 60_000) * 60_000);
  assert.deepEqual(check(sentBack, 30, current), { ok: true });
});

test("a changed end date is checked, also on a link that runs longer already", () => {
  assert.equal(check(inDays(120), 30, inDays(90)).ok, false);
  assert.equal(check(null, 30, inDays(90)).ok, false);
  assert.deepEqual(check(inDays(20), 30, inDays(90)), { ok: true });
});

test("a default longer than the maximum is refused in the settings, other values are fine", () => {
  assert.match(lifetimeSettingsError({ defaultDays: 31, maxDays: 30 }) ?? "", /30/);
  assert.equal(lifetimeSettingsError({ defaultDays: 30, maxDays: 30 }), null);
  assert.equal(lifetimeSettingsError({ defaultDays: 90, maxDays: 0 }), null);
  assert.equal(lifetimeSettingsError({ defaultDays: 0, maxDays: 30 }), null);
});

test("days must be whole numbers from 0 to 3650", () => {
  for (const bad of [-1, 1.5, 4000, Number.NaN]) {
    assert.notEqual(lifetimeSettingsError({ defaultDays: bad, maxDays: 0 }), null, String(bad));
    assert.notEqual(lifetimeSettingsError({ defaultDays: 0, maxDays: bad }), null, String(bad));
  }
});

test("an end date earlier than the one the link has is allowed, even past the maximum", () => {
  assert.deepEqual(check(inDays(80), 30, inDays(90)), { ok: true });
  assert.equal(check(inDays(91), 30, inDays(90)).ok, false);
});
