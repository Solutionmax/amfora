import assert from "node:assert/strict";
import { test } from "node:test";

import { buildOgImage } from "./og-image";

const base = "https://share.solutionmax.net";
const cover = { width: 1200, height: 600, version: "abc" };
const linkPreview = { width: 1200, height: 630, version: "d e" };

test("the cover wins over everything, with its size and a versioned absolute URL", () => {
  const image = buildOgImage(base, { cover, linkPreview, appLogo: "https://cdn.example/logo.png", appName: "Acme" });
  assert.deepEqual(image, {
    url: `${base}/api/app/share-cover/og?v=abc`,
    width: 1200,
    height: 600,
    alt: "Acme",
  });
});

test("without a cover the default link preview image is used", () => {
  const image = buildOgImage(base, { linkPreview, appLogo: "https://cdn.example/logo.png" });
  assert.equal(image.url, `${base}/api/app/link-preview/og?v=d%20e`);
  assert.equal(image.width, 1200);
  assert.equal(image.height, 630);
});

test("a data URI logo never reaches og:image; it is served over http instead", () => {
  const image = buildOgImage(base, { appLogo: "data:image/webp;base64,UklGRgIJAABXRUJQ", appName: "Acme Transfer" });
  assert.equal(image.url, `${base}/api/app/logo`);
  assert.equal(image.alt, "Acme Transfer");
});

test("an http logo is used as-is", () => {
  assert.equal(buildOgImage(base, { appLogo: "https://cdn.example/logo.png" }).url, "https://cdn.example/logo.png");
});

test("nothing uploaded falls back to the product card with the default name", () => {
  for (const image of [buildOgImage(base), buildOgImage(base, { cover: null, linkPreview: null, appLogo: "" })]) {
    assert.equal(image.url, `${base}/og-card.jpg`);
    assert.equal(image.width, 1200);
    assert.equal(image.height, 630);
    assert.equal(image.alt, "Amfora");
  }
});
