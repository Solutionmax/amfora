import assert from "node:assert/strict";
import { test } from "node:test";

import { uploadRefusal } from "./upload-refusal";

test("a full quota is a 400 with its reason, not a server error", () => {
  const refusal = uploadRefusal(new Error("Insufficient storage space (quota). You have 0.00MB available"));
  assert.deepEqual(refusal, {
    status: 400,
    body: { error: "Insufficient storage space (quota). You have 0.00MB available", code: "insufficientStorage" },
  });
});

test("a file over the size limit and an inactive account are refusals too", () => {
  assert.equal(uploadRefusal(new Error("File size exceeds the maximum allowed size"))?.body.code, "fileSizeExceeded");
  assert.equal(uploadRefusal(new Error("Account is inactive"))?.body.code, "accountInactive");
  assert.equal(uploadRefusal(new Error("Account is inactive"))?.status, 403);
});

test("anything else stays a server error and keeps its detail out of the answer", () => {
  assert.equal(uploadRefusal(new Error("connect ECONNREFUSED 10.0.0.5:9000")), null);
  assert.equal(uploadRefusal("Insufficient storage space"), null);
  assert.equal(uploadRefusal(undefined), null);
});
