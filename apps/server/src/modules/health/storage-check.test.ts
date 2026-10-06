import assert from "node:assert/strict";
import { test } from "node:test";

import { isStorageUp } from "./storage-check";

test("storage is up when it answers, with or without the probe object", async () => {
  assert.equal(await isStorageUp({ fileExists: async () => false }), true);
  assert.equal(await isStorageUp({ fileExists: async () => true }), true);
});

test("storage is down when the call fails or hangs", async () => {
  assert.equal(
    await isStorageUp({
      fileExists: async () => {
        throw new Error("refused");
      },
    }),
    false
  );
  assert.equal(await isStorageUp({ fileExists: () => new Promise(() => undefined) }, 50), false);
});
