import assert from "node:assert/strict";
import { test } from "node:test";

import { CUSTOM_CSS_MAX_LENGTH, sanitizeCss } from "./custom-css";

test("strips imports, outside urls and expressions, keeps the rest", () => {
  const input = [
    '@import url("https://evil.test/x.css");',
    ".a{background:url(https://evil.test/p.png)}",
    ".b{width:expression(1)}",
    ".c{color:red;background:url(/api/app/background)}",
    ".d{background:url(//evil.test/p.png)}",
    ".e{behavior:url(x.htc)}",
  ].join("\n");
  const out = sanitizeCss(input);
  assert.ok(!/@import/.test(out));
  assert.ok(!/evil\.test/.test(out));
  assert.ok(!/expression\(/.test(out));
  assert.ok(!/behavior/.test(out));
  assert.ok(out.includes(".c{color:red;background:url(/api/app/background)}"));
});

test("caps the length", () => {
  assert.equal(sanitizeCss("a".repeat(CUSTOM_CSS_MAX_LENGTH + 5000)).length, CUSTOM_CSS_MAX_LENGTH);
});
