import assert from "node:assert/strict";
import { test } from "node:test";

import { pickPreviewObjectName } from "./share-preview";

const now = new Date("2026-09-21T12:00:00Z");
const image = { objectName: "user/shot.png", extension: "png", size: 19353 };
const share = {
  expiration: null,
  views: 0,
  security: { password: null, maxViews: null },
  files: [image],
  folders: [],
};

test("a single small image on an open share is previewable", () => {
  assert.equal(pickPreviewObjectName(share, now), "user/shot.png");
  assert.equal(pickPreviewObjectName({ ...share, files: [{ ...image, extension: ".JPG" }] }, now), "user/shot.png");
});

test("nothing that an anonymous bot should not fetch is previewable", () => {
  const cases: Array<[string, Parameters<typeof pickPreviewObjectName>[0]]> = [
    ["password protected", { ...share, security: { password: "$2b$hash", maxViews: null } }],
    ["metered by maxViews", { ...share, security: { password: null, maxViews: 5 } }],
    ["expired", { ...share, expiration: new Date(now.getTime() - 1) }],
    ["contains a folder", { ...share, folders: [{}] }],
    ["more than one file", { ...share, files: [image, image] }],
    ["no files", { ...share, files: [] }],
    ["not an image", { ...share, files: [{ ...image, extension: "mp4" }] }],
    ["oversized", { ...share, files: [{ ...image, size: 6 * 1024 * 1024 }] }],
    ["unknown size", { ...share, files: [{ ...image, size: null }] }],
  ];

  for (const [label, candidate] of cases) {
    assert.equal(pickPreviewObjectName(candidate, now), null, label);
  }
});

test("prisma BigInt sizes are accepted", () => {
  assert.equal(pickPreviewObjectName({ ...share, files: [{ ...image, size: 19353n }] }, now), "user/shot.png");
});
