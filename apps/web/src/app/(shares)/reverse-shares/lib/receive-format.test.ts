import assert from "node:assert/strict";
import { test } from "node:test";

import {
  formatDay,
  matchesFilter,
  matchesSearch,
  parseFileTypes,
  positiveIntOrNull,
  receivedCount,
  toDateTimeLocal,
} from "./receive-format";

const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();
const link = (over: Partial<Parameters<typeof matchesFilter>[0]> = {}) => ({
  name: "Acme Studio",
  isActive: true,
  expiration: null,
  maxFiles: null,
  files: [],
  ...over,
});

test("active filter keeps open links and drops paused or expired ones", () => {
  assert.equal(matchesFilter(link(), "active"), true);
  assert.equal(matchesFilter(link({ expiration: future }), "active"), true);
  assert.equal(matchesFilter(link({ isActive: false }), "active"), false);
  assert.equal(matchesFilter(link({ expiration: past }), "active"), false);
});

test("inactive filter is the opposite of active; all keeps everything", () => {
  assert.equal(matchesFilter(link({ isActive: false }), "inactive"), true);
  assert.equal(matchesFilter(link({ expiration: past }), "inactive"), true);
  assert.equal(matchesFilter(link(), "inactive"), false);
  assert.equal(matchesFilter(link({ isActive: false }), "all"), true);
});

test("search matches the name case-insensitively and tolerates a missing name", () => {
  assert.equal(matchesSearch(link(), "acme"), true);
  assert.equal(matchesSearch(link(), "  "), true);
  assert.equal(matchesSearch(link({ name: null }), "acme"), false);
});

test("received count shows the limit only when there is one", () => {
  assert.equal(receivedCount(link({ files: [1, 2, 3], maxFiles: 20 })), "3/20");
  assert.equal(receivedCount(link({ files: [1] })), "1");
  assert.equal(receivedCount(link({ files: undefined })), "0");
});

test("formatDay uses the given locale and adds the year only for other years", () => {
  const now = new Date("2026-09-30T12:00:00");
  assert.equal(formatDay("2026-10-31T10:00:00", "en-US", now), "Oct 31");
  assert.equal(formatDay("2026-10-31T10:00:00", "nl-NL", now), "31 okt");
  assert.match(formatDay("2027-01-05T10:00:00", "en-US", now), /2027/);
  assert.equal(formatDay("nope", "en-US", now), "");
});

test("toDateTimeLocal keeps local time and handles empty values", () => {
  const value = new Date(2026, 9, 31, 9, 5).toISOString();
  assert.equal(toDateTimeLocal(value), "2026-10-31T09:05");
  assert.equal(toDateTimeLocal(null), "");
});

test("parseFileTypes cleans dots, case, separators and duplicates", () => {
  assert.deepEqual(parseFileTypes(".PDF, jpg|png  jpg"), ["pdf", "jpg", "png"]);
  assert.deepEqual(parseFileTypes(null), []);
});

test("positiveIntOrNull turns empty, zero and junk into no limit", () => {
  assert.equal(positiveIntOrNull("20"), 20);
  assert.equal(positiveIntOrNull("0"), null);
  assert.equal(positiveIntOrNull(""), null);
  assert.equal(positiveIntOrNull("abc"), null);
  assert.equal(positiveIntOrNull(5), 5);
});
