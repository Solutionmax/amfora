import assert from "node:assert/strict";
import { test } from "node:test";

import { buildOgImage } from "./og-image";

const base = "https://share.solutionmax.net";

test("a data URI logo never reaches og:image", () => {
  const image = buildOgImage(base, null, "data:image/webp;base64,UklGRgIJAABXRUJQ");
  assert.equal(image.url, `${base}/og-card.jpg`);
});

test("an http logo is used as-is, and the preview file wins over both", () => {
  assert.equal(buildOgImage(base, null, "https://cdn.example/logo.png").url, "https://cdn.example/logo.png");
  assert.equal(
    buildOgImage(base, "user id/holiday shot.png", "https://cdn.example/logo.png").url,
    `${base}/api/files/download?objectName=user%20id%2Fholiday%20shot.png`
  );
});
