import assert from "node:assert/strict";
import { test } from "node:test";

import { readCurrentVersion } from "./current-version";

test("the running version is read from the app's own package.json", () => {
  const version = readCurrentVersion();
  assert.match(String(version), /^\d+\.\d+\.\d+/);
});
