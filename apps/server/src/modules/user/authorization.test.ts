import { strict as assert } from "node:assert";
import { test } from "node:test";

import { canUpdateUser } from "./authorization";

test("admin can update another user and manage admin status", () => {
  assert.equal(canUpdateUser({ userId: "admin", isAdmin: true }, { id: "member", isAdmin: false }), true);
});

test("member can update their own profile without the privilege field", () => {
  assert.equal(canUpdateUser({ userId: "member", isAdmin: false }, { id: "member", isAdmin: undefined }), true);
});

test("member cannot update another user", () => {
  assert.equal(canUpdateUser({ userId: "member", isAdmin: false }, { id: "other", isAdmin: undefined }), false);
});

test("member cannot submit an admin elevation or privilege change", () => {
  assert.equal(canUpdateUser({ userId: "member", isAdmin: false }, { id: "member", isAdmin: true }), false);
  assert.equal(canUpdateUser({ userId: "member", isAdmin: false }, { id: "member", isAdmin: false }), false);
});

test("missing identity cannot update a profile", () => {
  assert.equal(canUpdateUser({}, { id: "member" }), false);
  assert.equal(canUpdateUser({ userId: "" }, { id: "" }), false);
});
