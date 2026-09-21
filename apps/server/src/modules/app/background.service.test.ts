import assert from "node:assert/strict";
import { test } from "node:test";

import { isRasterImage } from "./background.service";

test("accepts raster signatures and refuses svg and text", () => {
  assert.ok(isRasterImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])));
  assert.ok(isRasterImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])));
  assert.ok(isRasterImage(Buffer.from("RIFF\0\0\0\0WEBPVP8 ", "latin1")));
  assert.ok(!isRasterImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')));
  assert.ok(!isRasterImage(Buffer.from("hello world, not an image")));
});
