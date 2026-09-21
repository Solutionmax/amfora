import assert from "node:assert/strict";
import { test } from "node:test";

import { pickCover } from "./cover-pick";
import { kindFromName } from "./file-kind";

test("an image with a preview is its own cover, anything else gets the gradient", () => {
  const image = { name: "a.png", kind: "image" as const, previewUrl: "/api/x" };
  assert.deepEqual(pickCover([image]), { kind: "image", file: image });
  assert.equal(pickCover([{ name: "a.png", kind: "image" }])?.kind, "gradient");
  assert.equal(pickCover([{ name: "v.mp4", kind: "video" }, image])?.kind, "gradient");
  assert.equal(pickCover([]), null);
});

test("kind follows the extension, case-insensitively", () => {
  assert.equal(kindFromName("Launch.MP4"), "video");
  assert.equal(kindFromName("poster.pdf"), "document");
  assert.equal(kindFromName("assets.tar.gz"), "archive");
  assert.equal(kindFromName("photo.jpeg"), "image");
  assert.equal(kindFromName("noext"), "other");
});
