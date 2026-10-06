import assert from "node:assert/strict";
import { test } from "node:test";

import { copiedObjectName, isOwnObjectName } from "./object-name";

test("a copied name is reduced to the base name and passes the own object name rule", () => {
  for (const name of ["../../x", "a/b.txt", "a\\b.txt", "..", ".", "", "/", "x/..", "plain.txt"]) {
    const objectName = copiedObjectName("alice", name);
    assert.ok(objectName.startsWith("alice/"), objectName);
    assert.ok(isOwnObjectName("alice", objectName), `${name} gave ${objectName}`);
    assert.equal(objectName.split("/").length, 2, `${name} gave ${objectName}`);
  }
  assert.ok(copiedObjectName("alice", "../../x").endsWith("-x"));
  assert.ok(copiedObjectName("alice", "a/b.txt").endsWith("-b.txt"));
  assert.ok(copiedObjectName("alice", "a\\b.txt").endsWith("-b.txt"));
});

test("two copies in the same millisecond get different names", () => {
  assert.notEqual(copiedObjectName("alice", "x.txt"), copiedObjectName("alice", "x.txt"));
});
