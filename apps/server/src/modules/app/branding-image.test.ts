import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import sharp from "sharp";

import { directoriesConfig } from "../../config/directories.config";
import { BrandingImage, isRasterImage } from "./branding-image";

const originalBranding = directoriesConfig.branding;
let dir: string;

before(() => {
  dir = mkdtempSync(path.join(tmpdir(), "amfora-branding-"));
  directoriesConfig.branding = dir;
});

after(() => {
  directoriesConfig.branding = originalBranding;
  rmSync(dir, { recursive: true, force: true });
});

const png = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: "#336699" } })
    .png()
    .toBuffer();

test("accepts raster signatures and refuses svg and text", () => {
  assert.ok(isRasterImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])));
  assert.ok(isRasterImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])));
  assert.ok(isRasterImage(Buffer.from("RIFF\0\0\0\0WEBPVP8 ", "latin1")));
  assert.ok(!isRasterImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')));
  assert.ok(!isRasterImage(Buffer.from("hello world, not an image")));
});

test("an image with a link preview is stored as WebP plus a 1200 px JPEG, and removed as a pair", async () => {
  const image = new BrandingImage({ name: "t-cover", label: "Cover image", minWidth: 600, withLinkPreview: true });
  assert.equal(await image.linkPreviewInfo(), null);

  await image.save(await png(1600, 800));

  const webp = await image.read();
  assert.ok(webp);
  assert.equal((await sharp(webp).metadata()).format, "webp");
  const jpeg = await image.readLinkPreview();
  assert.ok(jpeg);
  assert.equal((await sharp(jpeg).metadata()).format, "jpeg");

  const info = await image.linkPreviewInfo();
  assert.equal(info?.width, 1200);
  assert.equal(info?.height, 600);
  assert.match(info?.version ?? "", /^[0-9a-z]+$/);

  await image.remove();
  assert.equal(await image.exists(), false);
  assert.equal(await image.readLinkPreview(), null);
  assert.equal(await image.linkPreviewInfo(), null);
});

test("the same validation for every branding image: too narrow, svg and garbage are refused", async () => {
  const image = new BrandingImage({ name: "t-narrow", label: "Cover image", minWidth: 600, withLinkPreview: true });
  await assert.rejects(image.save(await png(400, 400)), /Cover image too small\. Use at least 600 pixels wide\./);
  await assert.rejects(image.save(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')), /Only PNG, JPEG/);
  assert.equal(await image.exists(), false);
});

test("an image without a link preview keeps no JPEG", async () => {
  const image = new BrandingImage({ name: "t-bg", label: "Background image", minWidth: 1200 });
  await image.save(await png(1300, 700));
  assert.equal(await image.exists(), true);
  assert.equal(await image.readLinkPreview(), null);
  assert.equal(await image.linkPreviewInfo(), null);
  await image.remove();
});
