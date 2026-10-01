import assert from "node:assert/strict";
import { test } from "node:test";

import { flattenFolders } from "./move-folders";

const folders = [
  { id: "b", name: "Brand", parentId: null },
  { id: "c", name: "Clients", parentId: null },
  { id: "a", name: "Acme", parentId: "c" },
  { id: "x", name: "Archive", parentId: "a" },
];

test("folders come in tree order with depth and path", () => {
  const flat = flattenFolders(folders, new Set());
  assert.deepEqual(
    flat.map((f) => [f.name, f.depth, f.path]),
    [
      ["Brand", 0, "Brand"],
      ["Clients", 0, "Clients"],
      ["Acme", 1, "Clients / Acme"],
      ["Archive", 2, "Clients / Acme / Archive"],
    ]
  );
});

test("a moved folder and everything below it cannot be the target", () => {
  const flat = flattenFolders(folders, new Set(["a"]));
  assert.deepEqual(
    flat.map((f) => f.id),
    ["b", "c"]
  );
});
