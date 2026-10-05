import assert from "node:assert/strict";
import { test } from "node:test";

import { adminSwitchedOff } from "./admin-notifications";

const configs = [
  { key: "notifyDownloadEnabled", value: "false" },
  { key: "notifyExpiryEnabled", value: "true" },
];

test("a notification the administrator turned off is off for everyone", () => {
  assert.equal(adminSwitchedOff(configs, "notifyDownloadEnabled"), true);
});

test("a notification the administrator left on is not off", () => {
  assert.equal(adminSwitchedOff(configs, "notifyExpiryEnabled"), false);
});

test("while the settings are not known yet nothing is shown as off", () => {
  assert.equal(adminSwitchedOff([], "notifyDownloadEnabled"), false);
  assert.equal(adminSwitchedOff(null, "notifyDownloadEnabled"), false);
});
