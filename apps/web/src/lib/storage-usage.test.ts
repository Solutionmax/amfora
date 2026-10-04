import assert from "node:assert/strict";
import { test } from "node:test";

import { storageLevel, storageParts } from "./storage-usage";

const GB = 1024 ** 3;

test("level turns amber from 90 percent and red at the limit", () => {
  assert.equal(storageLevel(3.2, 10), "normal");
  assert.equal(storageLevel(8.99, 10), "normal");
  assert.equal(storageLevel(9, 10), "almostFull");
  assert.equal(storageLevel(9.99, 10), "almostFull");
  assert.equal(storageLevel(10, 10), "full");
  assert.equal(storageLevel(12, 10), "full");
});

test("no limit never warns", () => {
  assert.equal(storageLevel(500, null), "normal");
  assert.equal(storageLevel(500, 0), "normal");
});

test("splits use into own files and files in shares", () => {
  const parts = storageParts({ limitBytes: 10 * GB, usedBytes: 3 * GB, sharedBytes: 1 * GB });

  assert.equal(parts.ownBytes, 2 * GB);
  assert.equal(parts.sharedBytes, 1 * GB);
  assert.equal(parts.freeBytes, 7 * GB);
  assert.equal(parts.ownPercent, 20);
  assert.equal(parts.sharedPercent, 10);
  assert.equal(parts.usedPercent, 30);
});

test("without a limit there are amounts but no percentages", () => {
  const parts = storageParts({ limitBytes: null, usedBytes: 3 * GB, sharedBytes: 1 * GB });

  assert.equal(parts.ownBytes, 2 * GB);
  assert.equal(parts.freeBytes, null);
  assert.equal(parts.usedPercent, null);
  assert.equal(parts.ownPercent, null);
});

test("over the limit the bar is full and nothing is free", () => {
  const parts = storageParts({ limitBytes: 10 * GB, usedBytes: 20 * GB, sharedBytes: 5 * GB });

  assert.equal(parts.usedPercent, 100);
  assert.equal(parts.freeBytes, 0);
  assert.equal(parts.ownPercent, 75);
  assert.equal(parts.sharedPercent, 25);
});

test("shared can never be more than what is used", () => {
  const parts = storageParts({ limitBytes: 10 * GB, usedBytes: 1 * GB, sharedBytes: 4 * GB });

  assert.equal(parts.sharedBytes, 1 * GB);
  assert.equal(parts.ownBytes, 0);
});
