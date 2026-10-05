import assert from "node:assert/strict";
import { test } from "node:test";

import { canPreviewOnDownloadPage, coverImageSrc, isPlayable } from "./cover-pick";
import { kindFromName } from "./file-kind";

test("a download page never previews video or audio; images, PDFs and text always", () => {
  for (const name of ["clip.mp4", "Clip.MOV", "song.mp3", "voice.m4a"]) {
    assert.equal(isPlayable(name), true, name);
    assert.equal(canPreviewOnDownloadPage(name), false, name);
  }
  for (const name of ["photo.jpg", "poster.pdf", "notes.txt", "archive.zip"]) {
    assert.equal(isPlayable(name), false, name);
    assert.equal(canPreviewOnDownloadPage(name), true, name);
  }
});

test("the cover URL carries the version", () => {
  assert.equal(coverImageSrc({ version: "k1" }), "/api/app/share-cover?v=k1");
  assert.equal(coverImageSrc(null), null);
});

test("kind follows the extension, case-insensitively", () => {
  assert.equal(kindFromName("Launch.MP4"), "video");
  assert.equal(kindFromName("poster.pdf"), "document");
  assert.equal(kindFromName("assets.tar.gz"), "archive");
  assert.equal(kindFromName("photo.jpeg"), "image");
  assert.equal(kindFromName("noext"), "other");
});
