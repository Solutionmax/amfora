import assert from "node:assert/strict";
import { test } from "node:test";

import { shouldCountDownload } from "./download-count";

test("a plain request from a recipient counts", () => {
  assert.equal(shouldCountDownload({}), true);
  assert.equal(shouldCountDownload({ range: "bytes=0-1048575" }), true);
});

test("previews, owners and mid-file range requests do not count", () => {
  assert.equal(shouldCountDownload({ isPreview: true }), false);
  assert.equal(shouldCountDownload({ isOwner: true }), false);
  assert.equal(shouldCountDownload({ range: "bytes=2097152-" }), false);
  assert.equal(shouldCountDownload({ range: " bytes=500-999" }), false);
});

test("handing out a presigned URL has no range to judge, so it counts on its own", () => {
  // The bytes come from storage after this point; the application only sees the request
  // for the URL, which is why the presigned path passes no range at all.
  assert.equal(shouldCountDownload({ isPreview: false, isOwner: false }), true);
  assert.equal(shouldCountDownload({ isPreview: true, isOwner: false }), false);
  assert.equal(shouldCountDownload({ isPreview: false, isOwner: true }), false);
});
