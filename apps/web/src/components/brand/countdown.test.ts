import assert from "node:assert/strict";
import { test } from "node:test";

import { timeLeft } from "./countdown";

const now = new Date("2026-09-29T12:00:00Z");

test("splits the remaining time into days and padded units", () => {
  const until = new Date(now.getTime() + ((6 * 24 + 14) * 3600 + 21 * 60 + 7) * 1000);
  assert.deepEqual(timeLeft(until, now), { days: 6, hours: "14", minutes: "21", seconds: "07" });
});

test("returns null once the end date has passed", () => {
  assert.equal(timeLeft(now, now), null);
  assert.equal(timeLeft(new Date(now.getTime() - 1000), now), null);
});

test("returns null for an invalid date", () => {
  assert.equal(timeLeft(new Date("not a date"), now), null);
});
