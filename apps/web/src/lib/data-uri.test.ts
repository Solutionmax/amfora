import assert from "node:assert/strict";
import { test } from "node:test";

import { parseDataUri } from "./data-uri";

test("decodes a base64 image data URI", () => {
  const parsed = parseDataUri("data:image/png;base64,iVBORw0KGgo=");
  assert.equal(parsed?.contentType, "image/png");
  assert.equal(parsed?.bytes.length, 8);
});

test("rejects non-image and malformed values", () => {
  assert.equal(parseDataUri("data:text/html;base64,PHNjcmlwdD4="), null);
  assert.equal(parseDataUri("https://example.com/logo.png"), null);
  assert.equal(parseDataUri("data:image/png;base64,"), null);
});
