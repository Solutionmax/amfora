import assert from "node:assert/strict";
import { test } from "node:test";

import { isFolderIncludedInShare } from "./share-access";

test("folder share access includes descendants but excludes siblings", () => {
  const parents = new Map<string, string | null>([
    ["root", null],
    ["child", "root"],
    ["grandchild", "child"],
    ["sibling", null],
  ]);

  assert.equal(isFolderIncludedInShare("root", new Set(["root"]), parents), true);
  assert.equal(isFolderIncludedInShare("grandchild", new Set(["root"]), parents), true);
  assert.equal(isFolderIncludedInShare("sibling", new Set(["root"]), parents), false);
  assert.equal(isFolderIncludedInShare("missing", new Set(["root"]), parents), false);
});
