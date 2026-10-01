import assert from "node:assert/strict";
import { test } from "node:test";

import { addedLabel } from "./added-label";

const now = new Date(2026, 8, 30, 15, 0);

test("today shows the time", () => {
  assert.deepEqual(addedLabel(new Date(2026, 8, 30, 9, 5), now, "en-GB"), { kind: "today", time: "09:05" });
});

test("yesterday is named", () => {
  assert.deepEqual(addedLabel(new Date(2026, 8, 29, 23, 59), now, "en-GB"), { kind: "yesterday" });
});

test("older dates in this year have no year", () => {
  assert.deepEqual(addedLabel(new Date(2026, 8, 21, 12, 0), now, "en-GB"), { kind: "date", text: "21 Sept" });
});

test("dates in another year show the year", () => {
  const label = addedLabel(new Date(2025, 0, 3), now, "en-GB");
  assert.equal(label?.kind, "date");
  assert.match(label?.kind === "date" ? label.text : "", /2025/);
});

test("invalid input gives null", () => {
  assert.equal(addedLabel("nope", now, "en-GB"), null);
});
