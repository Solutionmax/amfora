import assert from "node:assert/strict";
import { test } from "node:test";

import { escapeHtml } from "./escape-html";

test("untrusted email content cannot inject HTML or attributes", () => {
  assert.equal(
    escapeHtml("<img src=\"x\" onerror='alert(1)'> &"),
    "&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt; &amp;"
  );
});
