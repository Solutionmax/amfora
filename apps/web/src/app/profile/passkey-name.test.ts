import assert from "node:assert/strict";
import { test } from "node:test";

import { defaultPasskeyName } from "./passkey-name";

test("names a passkey after the browser and the system", () => {
  assert.equal(
    defaultPasskeyName("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36"),
    "Chrome on Linux"
  );
  assert.equal(defaultPasskeyName("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Firefox/130.0"), "Firefox on macOS");
  assert.equal(defaultPasskeyName("Mozilla/5.0 (Windows NT 10.0) Chrome/126 Edg/126"), "Edge on Windows");
});

test("falls back to Passkey when the browser says nothing useful", () => {
  assert.equal(defaultPasskeyName(""), "Passkey");
  assert.equal(defaultPasskeyName("curl/8"), "Passkey");
});
