import assert from "node:assert/strict";
import { test } from "node:test";

import { canPreviewOnDownloadPage, coverImageSrc, isPlayable, pickCover } from "./cover-pick";
import { kindFromName } from "./file-kind";

test("the uploaded cover is the picture for every file, otherwise the gradient", () => {
  const video = { name: "v.mp4", kind: "video" as const };
  const image = { name: "a.png", kind: "image" as const };
  assert.deepEqual(pickCover([video, image], "/api/app/share-cover?v=1"), {
    kind: "image",
    src: "/api/app/share-cover?v=1",
    file: video,
  });
  assert.deepEqual(pickCover([image]), { kind: "gradient", file: image }, "an image file is not its own cover");
  assert.equal(pickCover([image], null)?.kind, "gradient");
  assert.equal(pickCover([], "/x"), null);
});

test("video and audio preview only with playback on; images, PDFs and text always", () => {
  for (const name of ["clip.mp4", "Clip.MOV", "song.mp3", "voice.m4a"]) {
    assert.equal(isPlayable(name), true, name);
    assert.equal(canPreviewOnDownloadPage(name, false), false, name);
    assert.equal(canPreviewOnDownloadPage(name, true), true, name);
  }
  for (const name of ["photo.jpg", "poster.pdf", "notes.txt", "archive.zip"]) {
    assert.equal(isPlayable(name), false, name);
    assert.equal(canPreviewOnDownloadPage(name, false), true, name);
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
