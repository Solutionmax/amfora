import assert from "node:assert/strict";
import { test } from "node:test";

import { assertUploadedFile, assertUploadGrant } from "./upload-policy";

const grant = { reverseShareId: "a", expiresAt: new Date(Date.now() + 60000), consumed: false, uploadId: "part-id" };
test("upload operations reject foreign, expired, consumed and mismatched multipart grants", () => {
  assert.throws(() => assertUploadGrant(null, "a"));
  assert.throws(() => assertUploadGrant(grant, "b"));
  assert.throws(() => assertUploadGrant({ ...grant, expiresAt: new Date(0) }, "a"));
  assert.throws(() => assertUploadGrant({ ...grant, consumed: true }, "a"));
  assert.throws(() => assertUploadGrant(grant, "a", "other-part"));
  assert.doesNotThrow(() => assertUploadGrant(grant, "a", "part-id"));
});
test("registration validates real stored bytes and filename extension", () => {
  const share = {
    maxFileSize: 100n,
    allowedFileTypes: ".txt",
    nameFieldRequired: "OPTIONAL",
    emailFieldRequired: "OPTIONAL",
  };
  const file = { name: "notes.txt", extension: "txt", size: 10 };
  assert.doesNotThrow(() => assertUploadedFile(share, file, 10));
  assert.throws(() => assertUploadedFile(share, file, 11));
  assert.throws(() => assertUploadedFile(share, { ...file, size: 101 }, 101));
  assert.throws(() => assertUploadedFile(share, { ...file, name: "script.exe" }, 10));
  assert.throws(() => assertUploadedFile({ ...share, nameFieldRequired: "REQUIRED" }, file, 10));
});
