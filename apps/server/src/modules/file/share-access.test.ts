import assert from "node:assert/strict";
import test from "node:test";

import { folderAndAncestorIds } from "./share-access";

test("folder share lookup includes the file folder and every owner-scoped ancestor", () => {
  assert.deepEqual(
    folderAndAncestorIds("child", [
      { id: "root", parentId: null },
      { id: "child", parentId: "root" },
      { id: "sibling", parentId: "root" },
    ]),
    ["child", "root"]
  );
});

test("folder share lookup stops on missing and cyclic metadata", () => {
  assert.deepEqual(folderAndAncestorIds("child", [{ id: "child", parentId: "missing" }]), ["child"]);
  assert.deepEqual(
    folderAndAncestorIds("a", [
      { id: "a", parentId: "b" },
      { id: "b", parentId: "a" },
    ]),
    ["a", "b"]
  );
});
