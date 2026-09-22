import assert from "node:assert/strict";
import { test } from "node:test";

import { dispositionFor } from "./disposition";

test("anything a browser could run on this origin is served as an attachment", () => {
  for (const type of [
    "text/html",
    "text/html; charset=utf-8",
    "application/xhtml+xml",
    "image/svg+xml",
    "text/xml",
    "application/xml",
    "application/rss+xml",
    "text/javascript",
    "application/javascript",
    "application/x-javascript",
    "TEXT/HTML",
    "Image/SVG+XML",
  ]) {
    assert.equal(dispositionFor(type), "attachment", type);
  }
});

test("passive content stays inline so previews keep working", () => {
  for (const type of ["image/png", "image/jpeg", "application/pdf", "video/mp4", "audio/mpeg", "text/plain"]) {
    assert.equal(dispositionFor(type), "inline", type);
  }
});
