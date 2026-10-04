import assert from "node:assert/strict";
import { test } from "node:test";

import type { Secret } from "@/http/endpoints/secrets";
import { filterSecrets, secretLink, secretOptions } from "./secret-options";

test("choices stay inside the limits and always include the limit", () => {
  assert.deepEqual(secretOptions({ maxHours: 720, maxOpens: 10, maxLength: 1 }), {
    expiryHours: [1, 24, 168, 720],
    defaultExpiryHours: 168,
    openCounts: [1, 2, 3, 5, 10],
  });
  assert.deepEqual(secretOptions({ maxHours: 72, maxOpens: 3, maxLength: 1 }), {
    expiryHours: [1, 24, 72],
    defaultExpiryHours: 72,
    openCounts: [1, 2, 3],
  });
  assert.deepEqual(secretOptions({ maxHours: 1, maxOpens: 1, maxLength: 1 }).openCounts, [1]);
});

test("filter splits waiting from everything that is over", () => {
  const secrets = (["waiting", "used", "expired", "burned"] as const).map((status) => ({ status }) as Secret);
  assert.equal(filterSecrets(secrets, "all").length, 4);
  assert.deepEqual(
    filterSecrets(secrets, "waiting").map((s) => s.status),
    ["waiting"]
  );
  assert.equal(filterSecrets(secrets, "done").length, 3);
});

test("the key is in the fragment of the link", () => {
  assert.equal(secretLink("https://a.test", "id1", "key1"), "https://a.test/x/id1#key1");
});
