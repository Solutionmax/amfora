import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { env } from "../../env";
import { initialScanFields, isBlockedByScan, scanFieldsOf } from "./status";

afterEach(() => {
  delete env.CLAMAV_HOST;
  env.CLAMAV_MAX_SIZE_MB = "100";
});

test("with scanning off a new file has no status and nothing is blocked or shown", () => {
  assert.deepEqual(initialScanFields(BigInt(10)), {});
  assert.equal(isBlockedByScan({ scanStatus: null }), false);
  assert.equal(isBlockedByScan({ scanStatus: "pending" }), false);
  assert.deepEqual(scanFieldsOf({ scanStatus: "pending" }), { scanStatus: null, scanDetail: null });
  assert.deepEqual(scanFieldsOf({}), { scanStatus: null, scanDetail: null });
});

test("with scanning on a new file is pending, or skipped when it is too large", () => {
  env.CLAMAV_HOST = "clamav";
  env.CLAMAV_MAX_SIZE_MB = "2";
  assert.deepEqual(initialScanFields(BigInt(2 * 1024 * 1024)), { scanStatus: "pending" });
  const large = initialScanFields(BigInt(2 * 1024 * 1024 + 1));
  assert.equal(large.scanStatus, "skipped");
  assert.equal(large.scanDetail, "Larger than 2 MB");
});

test("pending and infected are blocked, everything else is not", () => {
  env.CLAMAV_HOST = "clamav";
  for (const status of ["pending", "infected"]) assert.equal(isBlockedByScan({ scanStatus: status }), true, status);
  for (const status of [null, undefined, "clean", "error", "skipped"]) {
    assert.equal(isBlockedByScan({ scanStatus: status }), false, String(status));
  }
});

test("with scanning off a skipped, failed or clean status shows nothing either", () => {
  for (const scanStatus of ["clean", "skipped", "error"]) {
    assert.deepEqual(scanFieldsOf({ scanStatus, scanDetail: "x" }), { scanStatus: null, scanDetail: null });
  }
});

test("an infected file stays blocked and visible when scanning is switched off, a pending one does not", () => {
  assert.equal(isBlockedByScan({ scanStatus: "infected" }), true);
  assert.deepEqual(scanFieldsOf({ scanStatus: "infected", scanDetail: "Eicar" }), {
    scanStatus: "infected",
    scanDetail: "Eicar",
  });
});

test("an unknown status is not shown", () => {
  env.CLAMAV_HOST = "clamav";
  assert.deepEqual(scanFieldsOf({ scanStatus: "weird" }), { scanStatus: null, scanDetail: null });
});

test("the detail of an error or a clean file is never sent, that of infected and skipped is", () => {
  env.CLAMAV_HOST = "clamav";
  const raw = "connect ECONNREFUSED 172.18.0.5:3310";
  assert.equal(scanFieldsOf({ scanStatus: "error", scanDetail: raw }).scanDetail, null);
  assert.equal(scanFieldsOf({ scanStatus: "error", scanDetail: raw }).scanStatus, "error");
  assert.equal(scanFieldsOf({ scanStatus: "clean", scanDetail: raw }).scanDetail, null);
  assert.equal(scanFieldsOf({ scanStatus: "skipped", scanDetail: "Larger than 1 MB" }).scanDetail, "Larger than 1 MB");
  assert.equal(scanFieldsOf({ scanStatus: "infected", scanDetail: "Eicar" }).scanDetail, "Eicar");
});
