import assert from "node:assert/strict";
import { test } from "node:test";

import { emptyReceiveForm, receiveFormFrom, toCreateBody, toUpdateBody } from "./receive-form";

const link = {
  name: "Acme Studio",
  description: "Upload the final selects here.",
  expiration: "2026-10-31T10:00:00.000Z",
  maxFiles: 20,
  maxFileSize: 2147483648,
  allowedFileTypes: "zip,.PDF",
  nameFieldRequired: "REQUIRED",
  emailFieldRequired: "weird",
  pageLayout: "VESSEL",
  hasPassword: true,
  isActive: false,
};

test("create body leaves out everything that was not filled in", () => {
  const body = toCreateBody({ ...emptyReceiveForm(), name: "  Photos  " });
  assert.deepEqual(body, {
    name: "Photos",
    pageLayout: "DEFAULT",
    nameFieldRequired: "OPTIONAL",
    emailFieldRequired: "OPTIONAL",
  });
});

test("create body carries limits, types, end date and password when set", () => {
  const body = toCreateBody({
    ...emptyReceiveForm(),
    name: "Invoices",
    maxFiles: "5",
    maxFileSize: "1048576",
    allowedFileTypes: "pdf,jpg",
    hasExpiration: true,
    expiration: "2026-10-31T10:00",
    hasPassword: true,
    password: " secret ",
  });
  assert.equal(body.maxFiles, 5);
  assert.equal(body.maxFileSize, 1048576);
  assert.equal(body.allowedFileTypes, "pdf,jpg");
  assert.equal(body.password, " secret ");
  assert.ok(body.expiration?.endsWith("Z"));
});

test("password switched on without a value is not sent on create", () => {
  const body = toCreateBody({ ...emptyReceiveForm(), name: "x", hasPassword: true, password: "" });
  assert.equal("password" in body, false);
  assert.equal(
    "password" in toCreateBody({ ...emptyReceiveForm(), name: "x", hasPassword: true, password: "    " }),
    false
  );
});

test("form values from a link normalise types, field rules and layout", () => {
  const values = receiveFormFrom(link);
  assert.equal(values.allowedFileTypes, "zip,pdf");
  assert.equal(values.nameFieldRequired, "REQUIRED");
  assert.equal(values.emailFieldRequired, "OPTIONAL");
  assert.equal(values.pageLayout, "VESSEL");
  assert.equal(values.maxFiles, "20");
  assert.equal(values.hasExpiration, true);
  assert.equal(values.password, "");
});

test("update body keeps the password unless a new one is typed or protection is removed", () => {
  const values = receiveFormFrom(link);
  assert.equal("password" in toUpdateBody(values, "id1", true), false);
  assert.equal(toUpdateBody({ ...values, password: "newpass" }, "id1", true).password, "newpass");
  assert.equal(toUpdateBody({ ...values, hasPassword: false }, "id1", true).password, null);
  assert.equal("password" in toUpdateBody({ ...values, hasPassword: false }, "id1", false), false);
});

test("update body clears limits with null and never sends an empty end date", () => {
  const values = {
    ...receiveFormFrom(link),
    maxFiles: "",
    maxFileSize: "0",
    allowedFileTypes: "",
    hasExpiration: false,
  };
  const body = toUpdateBody(values, "id1", true);
  assert.equal(body.maxFiles, null);
  assert.equal(body.maxFileSize, null);
  assert.equal(body.allowedFileTypes, null);
  assert.equal("expiration" in body, false);
  assert.equal(body.isActive, false);
  assert.equal(body.id, "id1");
});
