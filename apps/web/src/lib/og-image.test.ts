import assert from "node:assert/strict";
import { test } from "node:test";

import { buildOgImage } from "./og-image";

const base = "https://share.solutionmax.net";

test("a data URI logo never reaches og:image; it is served over http instead", () => {
  const image = buildOgImage(base, null, "data:image/webp;base64,UklGRgIJAABXRUJQ", "Acme Transfer");
  assert.equal(image.url, `${base}/api/app/logo`);
  assert.equal(image.alt, "Acme Transfer");
});

test("no logo falls back to the product card with the default name", () => {
  const image = buildOgImage(base, null, "");
  assert.equal(image.url, `${base}/og-card.jpg`);
  assert.equal(image.alt, "Amfora");
});

test("an http logo is used as-is, and the preview file wins over both", () => {
  assert.equal(buildOgImage(base, null, "https://cdn.example/logo.png").url, "https://cdn.example/logo.png");
  assert.equal(
    buildOgImage(base, "user id/holiday shot.png", "https://cdn.example/logo.png").url,
    `${base}/api/files/download?objectName=user%20id%2Fholiday%20shot.png&preview=1`
  );
});
